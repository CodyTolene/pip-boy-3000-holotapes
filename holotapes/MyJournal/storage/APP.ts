(function (): HolotapeApp {
  // Full hand-off to another holotape: it is started from the top level
  // once this one has returned, so nothing of this one is still held in
  // memory while the next one loads.
  function handOff(path: string): void {
    setTimeout(
      new Function(
        'Pip.loadHolotape(' + JSON.stringify(path) + ')',
      ) as () => void,
      20,
    );
  }

  const W = h.getWidth();
  const QUEST_FILE = 'USER/MYQUESTS.JSON';
  const DRAFT_FILE = 'USER/QUEST_DRAFT.JSON';
  const KEYBOARD = '/HOLO/MY_JOURNAL/T9.JS';
  const DATA_HOOK = 'HOLO/MY_JOURNAL/DATA_HOOK.JS';
  // The open-entry screens, loaded only while an entry is open.
  const ENTRY = 'HOLO/MY_JOURNAL/ENTRY.JS';
  // Hooks the shared startup slot runs (see DATA_HOOK.ts).
  const BOOT_LIST = 'USER/RADIOMARU_BOOT.JSON';
  // The Pip-Boy's own list: rows from y 50, 24 high, like DATA > QUESTS.
  const ROW_H = 24,
    VISIBLE_ROWS = 9,
    LIST_Y = 50,
    LIST_W = 200,
    PANEL_X = 240;
  const LONG_PRESS_MS = 450;
  const TABS = ['QUESTS', 'NOTES'];
  // Quests and notes together. Kept small enough to load on the Pip-Boy and
  // for the DATA patch (DATA_HOOK.ts uses the same number).
  const MAX_ENTRIES = 99;
  // Objectives per quest; a quest record in DATA has room for about this many.
  const MAX_OBJ = 10;

  function loadQuests(): JournalEntry[] {
    try {
      const parsed = JSON.parse(fs.readFileSync(QUEST_FILE)) as JournalEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  function saveQuests(list: JournalEntry[]): boolean {
    try {
      fs.writeFileSync(QUEST_FILE, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }
  function nextId(list: JournalEntry[]): number {
    let max = 0;
    for (let i = 0; i < list.length; i++)
      if (list[i].id > max) max = list[i].id;
    return max + 1;
  }
  function addEntry(
    list: JournalEntry[],
    cat: number,
    title: string,
    body: string,
  ): JournalEntry[] {
    if (list.length >= MAX_ENTRIES) return list;
    list.push({
      id: nextId(list),
      cat: cat,
      title: title,
      body: body,
      status: 0,
      created: Math.floor(Date.now() / 1000),
    });
    saveQuests(list);
    return list;
  }
  function loadDraft(): JournalDraft | null {
    try {
      return JSON.parse(fs.readFileSync(DRAFT_FILE)) as JournalDraft;
    } catch (e) {
      return null;
    }
  }
  function saveDraft(d: JournalDraft): void {
    fs.writeFileSync(DRAFT_FILE, JSON.stringify(d));
  }
  function clearDraft(): void {
    try {
      fs.unlink(DRAFT_FILE);
    } catch (e) {
      // No draft to remove.
    }
  }

  // Reads one picture from the Pip-Boy's own game data (DATA/F3 or DATA/NV),
  // by the record id used in both games. Undefined if it is not there.
  function art(cat: string, id: number): string | undefined {
    const dir = 'DATA/' + (NV ? 'NV' : 'F3') + '/' + cat;
    let f: EspruinoFile | undefined;
    let r!: ArtRecord;
    let img: string | Uint8Array | undefined;
    try {
      f = E.openFile(dir + '.DAT', 'r');
      const head = new Uint32Array(E.toArrayBuffer(f.read(8) || ''));
      const ids = new Uint32Array(E.toArrayBuffer(f.read(4 * head[0]) || ''));
      const k = ids.indexOf(id);
      if (k >= 0) {
        f.seek(8 + 4 * head[0] + k * head[1]);
        const t = String(f.read(head[1]));
        r = JSON.parse(t.indexOf('\0') >= 0 ? t.slice(0, t.indexOf('\0')) : t);
      }
      f.close();
      f = undefined;
      if (!r || !r.il) return undefined;
      f = E.openFile(dir + '.IMG', 'r');
      f.seek(r.io || 0);
      img = f.read(r.il);
      f.close();
    } catch (e) {
      if (f) f.close();
      return undefined;
    }
    return typeof img === 'string' ? img : undefined;
  }

  // Vault Boy reading (Intelligence), from the Pip-Boy's own data. Loaded
  // just after startup (see bootTimer below).
  let boyArt: string | undefined;
  let bootTimer: number | undefined;

  let quests = loadQuests();
  // 'list', or 'entry' while an entry is open in ENTRY.JS.
  let mode = 'list';
  let activeTab = 0;
  let listIdx = 0,
    scrollOff = 0,
    moving = false;
  let cleanedUp = false;
  let pressTimer: number | null = null,
    longFired = false;
  let screen: JournalScreen | null = null;

  function catLabel(c: number): string {
    return c === 1 ? 'NOTE' : 'QUEST';
  }
  function statusLabel(q: JournalEntry): string {
    return q.cat === 0 ? (q.status ? ' [DONE]' : ' [ACTIVE]') : '';
  }

  // Indices into `quests` belonging to the active tab, in display order.
  function visibleIndices(): number[] {
    const arr: number[] = [];
    for (let i = 0; i < quests.length; i++)
      if (quests[i].cat === activeTab) arr.push(i);
    return arr;
  }
  // Row 0 is + NEW, row 1 is CONTROLS, the entries follow.
  function listItemCount(): number {
    return visibleIndices().length + 2;
  }
  function listItemLabel(idx: number): JournalListLabel {
    if (idx === 0)
      return {
        text:
          quests.length >= MAX_ENTRIES
            ? 'JOURNAL FULL (' + MAX_ENTRIES + ')'
            : '+ NEW ' + (activeTab === 1 ? 'NOTE' : 'QUEST'),
        special: true,
      };
    if (idx === 1) return { text: 'CONTROLS', special: true };
    const q = quests[visibleIndices()[idx - 2]];
    // The panel beside the list shows the status; finished quests are dimmer.
    return { text: q.title, special: q.cat === 0 && !!q.status };
  }
  function moveList(dir: number): void {
    const count = listItemCount();
    listIdx = E.clip(listIdx + dir, 0, count - 1);
    if (listIdx < scrollOff) scrollOff = listIdx;
    if (listIdx >= scrollOff + VISIBLE_ROWS)
      scrollOff = listIdx - VISIBLE_ROWS + 1;
    Pip.playSound('SCROLL');
    draw();
  }
  function swapAdjacent(dir: number): void {
    const vis = visibleIndices();
    const curPos = listIdx - 2,
      newPos = curPos + dir;
    if (newPos < 0 || newPos >= vis.length) return;
    const a = vis[curPos],
      b = vis[newPos];
    const tmp = quests[a];
    quests[a] = quests[b];
    quests[b] = tmp;
    saveQuests(quests);
    listIdx += dir;
    if (listIdx < scrollOff) scrollOff = listIdx;
    if (listIdx >= scrollOff + VISIBLE_ROWS)
      scrollOff = listIdx - VISIBLE_ROWS + 1;
    Pip.playSound('SCROLL');
    draw();
  }
  function launchEntry(cat: number): void {
    toKeyboard({ cat: cat, title: '', body: '', bodyDone: false });
  }
  function toKeyboard(d: JournalDraft): void {
    try {
      saveDraft(d);
    } catch (e) {
      // The card would not take the draft (full or locked): stay in the
      // journal rather than opening the keyboard on a stale draft.
      Pip.playSound('TAB');
      h.setColor(2)
        .setFontMonofonto14()
        .setFontAlign(0, 0)
        .drawString('COULD NOT WRITE TO THE SD CARD', 240, 262);
      return;
    }
    cleanup();
    handOff(KEYBOARD);
  }

  // Opens an entry (or, with -1, the draft back from the keyboard) from
  // ENTRY.JS. It is only in memory while the entry is open.
  function openEntry(start: number): boolean {
    let make: JournalScreenFactory | undefined;
    try {
      make = eval(String(fs.readFileSync(ENTRY))) as JournalScreenFactory;
    } catch (e) {
      make = undefined;
    }
    // ENTRY.JS could not load: the draft is kept for the next try.
    if (!make) return true;
    screen = make(api, start);
    if (!screen) return false;
    mode = 'entry';
    return true;
  }
  // Puts the list's cursor on row idx, scrolled into view.
  function showRow(idx: number): void {
    listIdx = E.clip(idx, 0, listItemCount() - 1);
    scrollOff = Math.max(0, listIdx - VISIBLE_ROWS + 1);
  }
  // Back from an entry to the list; tab is the tab to show (on the entry
  // just saved, the last one), or -1 to stay.
  function closeEntry(tab: number): void {
    if (screen) screen.remove();
    screen = null;
    mode = 'list';
    if (tab >= 0) {
      activeTab = tab;
      showRow(listItemCount() - 1);
    }
    listIdx = E.clip(listIdx, 0, listItemCount() - 1);
    Pip.playSound('SCROLL');
    draw();
  }
  function selectListItem(): void {
    if (listIdx === 0) {
      if (quests.length < MAX_ENTRIES) launchEntry(activeTab);
      return;
    }
    // CONTROLS: ENTRY.JS draws the controls page too (start -2), so its text
    // is only in memory while it shows.
    if (!openEntry(listIdx === 1 ? -2 : visibleIndices()[listIdx - 2])) return;
    if (!screen) return;
    Pip.playSound('SELECT');
    draw();
  }

  function onShortClick(): void {
    if (screen) return screen.click();
    if (moving) {
      moving = false;
      Pip.playSound('SELECT');
      draw();
      return;
    }
    selectListItem();
  }
  function onLongPress(): void {
    // The controls page goes back on a hold too.
    if (screen && screen.help) return screen.click();
    if (mode === 'list' && listIdx > 1) {
      moving = !moving;
      Pip.playSound('SELECT');
      draw();
    }
  }
  function onKnob1(dir: KnobDirection): void {
    if (!dir) return;
    if (screen) return screen.knob(dir, false);
    if (moving) swapAdjacent(dir);
    else moveList(dir);
  }
  function onKnob2(dir: KnobDirection): void {
    if (!dir) return;
    if (screen) return screen.knob(dir, true);
    if (moving) return;
    activeTab = (activeTab + dir + TABS.length) % TABS.length;
    listIdx = 0;
    scrollOff = 0;
    Pip.playSound('SCROLL');
    draw();
  }

  // The left wheel press is watched directly so a hold can be timed.
  function onWatch(e: WatchEvent): void {
    if (e.state) {
      if (!pressTimer) {
        longFired = false;
        pressTimer = setTimeout(function (): void {
          longFired = true;
          pressTimer = null;
          onLongPress();
        }, LONG_PRESS_MS);
      }
    } else {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      if (!longFired) onShortClick();
    }
  }

  // The Pip-Boy's own header layout: title on the line, info underneath,
  // inside the rounded corners of the screen.
  function header(title: string, info: string): void {
    h.clearRect(0, 0, 479, 39)
      .setColor(3)
      .setFontMonofonto18()
      .setFontAlign(-1, 0)
      .drawString(title, 57, 18);
    h.drawLine(15, 18, 47, 18).drawLine(67 + h.stringWidth(title), 18, 465, 18);
    if (info) {
      h.setFontMonofonto14().setFontAlign(1, 0).drawString(info, 461, 32);
    }
  }

  // QUESTS and NOTES on the right of the header, where the Pip-Boy puts its
  // own header items; nothing goes under the title, which sits low on the
  // real screen.
  function drawTabs(): void {
    let x = 461;
    h.setFontMonofonto14().setFontAlign(1, 0);
    for (let i = TABS.length - 1; i >= 0; i--) {
      h.setColor(i === activeTab ? 3 : 1).drawString(TABS[i], x, 32);
      x -= h.stringWidth(TABS[i]) + 18;
    }
  }

  // Shortens text to fit a width, with dots when it is cut.
  function fit(t: string, w: number): string {
    if (h.stringWidth(t) <= w) return t;
    while (t.length > 1 && h.stringWidth(t + '...') > w) t = t.slice(0, -1);
    return t + '...';
  }

  // Wrapped text in the right-hand panel, down to the bottom of the list.
  function panelText(text: string, y: number, color: number): number {
    const lines = h.setFontMonofonto14().wrapString(text, 465 - PANEL_X);
    h.setColor(color).setFontAlign(-1, -1);
    for (let i = 0; i < lines.length && y <= 252; i++) {
      h.drawString(lines[i], PANEL_X, y);
      y += 16;
    }
    return y;
  }

  function drawList(): void {
    h.reset().clear(0);
    // While an entry is being moved the tabs can't change: the header says
    // MOVING instead.
    header('MY JOURNAL', moving ? 'MOVING' : '');
    if (!moving) drawTabs();
    const count = listItemCount();
    const visible = Math.min(VISIBLE_ROWS, count - scrollOff);
    h.setFontMonofonto14();
    for (let row = 0; row < visible; row++) {
      const idx = scrollOff + row,
        item = listItemLabel(idx),
        y = LIST_Y + row * ROW_H;
      if (idx === listIdx) Pip.shadeBox(24, y, 24 + LIST_W, y + ROW_H);
      h.setColor(item.special && idx !== listIdx ? 2 : 3)
        .setFontAlign(-1, 0)
        .drawString(
          fit((idx === listIdx && moving ? '> ' : '') + item.text, LIST_W - 30),
          46,
          y + 14,
        );
    }
    // Right-hand panel: the highlighted entry, like a quest's objectives in
    // DATA > QUESTS; Vault Boy beside + NEW and CONTROLS.
    if (listIdx < 2) {
      if (boyArt) h.drawImage(boyArt, PANEL_X + 40, 50, { scale: 0.8 });
      panelText(
        listIdx
          ? 'THE WHEELS AND PRESSES FOR THE JOURNAL AND THE KEYBOARD.'
          : quests.length >= MAX_ENTRIES
            ? 'YOUR JOURNAL IS FULL. DELETE AN ENTRY TO ADD ANOTHER.'
            : 'PRESS TO WRITE A NEW ' + (activeTab === 1 ? 'NOTE.' : 'QUEST.'),
        176,
        2,
      );
      h.setColor(3);
      Pip.renderBlock(
        PANEL_X,
        230,
        465 - PANEL_X,
        'ENTRIES',
        quests.length + ' OF ' + MAX_ENTRIES,
      );
    } else {
      const q = quests[visibleIndices()[listIdx - 2]];
      let y = panelText(q.title, 52, 3);
      if (q.cat === 0) {
        h.setColor(2).drawString(q.status ? 'DONE' : 'ACTIVE', PANEL_X, y + 2);
        y += 20;
      }
      h.setColor(1).drawLine(PANEL_X, y + 2, 465, y + 2);
      panelText(q.body || '(NO DETAILS)', y + 8, 3);
    }
    h.flip();
    Pip.lastFlip = getTime();
  }

  function draw(): void {
    if (screen) screen.draw();
    else drawList();
  }

  // What an open entry gets from the journal.
  const api: JournalApi = {
    rowH: ROW_H,
    maxObj: MAX_OBJ,
    draft: null,
    quests: function (): JournalEntry[] {
      return quests;
    },
    save: function (): void {
      saveQuests(quests);
    },
    add: function (cat: number, title: string, body: string): void {
      quests = addEntry(quests, cat, title, body);
    },
    clearDraft: clearDraft,
    toKeyboard: toKeyboard,
    done: closeEntry,
    header: header,
    fit: fit,
    catLabel: catLabel,
    statusLabel: statusLabel,
  };

  // Back from the keyboard with a finished draft: open it straight away.
  const existingDraft = loadDraft();
  if (existingDraft && existingDraft.bodyDone) {
    activeTab = existingDraft.cat;
    // Back from changing an entry: the list cursor waits on that entry.
    const was = existingDraft.addTo || existingDraft.editId;
    const vis = visibleIndices();
    for (let i = 0; i < vis.length; i++)
      if (quests[vis[i]].id === was) showRow(i + 2);
    api.draft = existingDraft;
    if (!openEntry(-1)) clearDraft();
    api.draft = null;
  }

  // Show the journal in DATA > QUESTS and NOTES, now and after a full
  // restart. Nothing to do when the hook is already running and listed for
  // startup (the usual case). Otherwise it runs through new Function, at the
  // top level, so it holds nothing of this app once the app is closed; the
  // hook then registers itself for startup.
  function hookOn(): void {
    const st = global.RM_PATCH as Record<string, string> | undefined;
    let listed = false;
    try {
      listed = String(fs.readFileSync(BOOT_LIST)).indexOf(DATA_HOOK) >= 0;
    } catch (e) {
      listed = false;
    }
    if (st && st.journal === 'ok' && listed) return;
    try {
      new Function(String(fs.readFileSync(DATA_HOOK)))();
    } catch (e) {
      // DATA just won't show the journal; the app itself still works.
    }
  }

  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  const pressWatch = setWatch(onWatch, ENC1_PRESS, {
    repeat: true,
    edge: 'both',
    debounce: 60,
  });
  draw();

  // The art and the DATA hook load just after this function returns, once
  // the Pip-Boy has freed the ITEMS > MISC list: loading them during startup
  // can run it out of memory.
  bootTimer = setTimeout(function (): void {
    bootTimer = undefined;
    // Same record id in Fallout 3 and New Vegas.
    boyArt = art('SPECIAL', 0x3ec);
    if (mode === 'list' && !cleanedUp) draw();
    hookOn();
  }, 0);

  // Guarded so it is safe to run both before a hand-off to the keyboard
  // and again when the OS calls remove().
  function cleanup(): void {
    if (cleanedUp) return;
    cleanedUp = true;
    if (bootTimer) clearTimeout(bootTimer);
    if (pressWatch) clearWatch(pressWatch);
    if (pressTimer) clearTimeout(pressTimer);
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
    h.clear();
  }

  return {
    id: 'MYJOURNAL',
    notDefault: true,
    fullscreen: true,
    remove: cleanup,
  };
});
