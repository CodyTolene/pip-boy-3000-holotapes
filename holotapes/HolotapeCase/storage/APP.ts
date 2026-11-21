(function (): HolotapeApp {
  const C = {
    LIVE: 'APPINFO',
    FAVS: 'HOLO/HOLOTAPE_CASE/FAVS.JSON',
    HOLSTART: 'SOUND/FX/HOLSTART.WAV',
    HIDDEN: 'HOLO/HOLOTAPE_CASE/HIDDEN.JSON',
    // The case's order; the MISC patch lists APPINFO in the same order.
    ORDER: 'HOLO/HOLOTAPE_CASE/ORDER.JSON',
    // The options menus, loaded only while they are open (see OPTIONS.ts).
    OPTIONS: 'HOLO/HOLOTAPE_CASE/OPTIONS.JS',
    // Hides and orders tapes in ITEMS > MISC (see MISC_HOOK.ts).
    HOOK: 'HOLO/HOLOTAPE_CASE/MISC_HOOK.JS',
    // Hooks the shared startup slot runs (see MISC_HOOK.ts).
    BOOT_LIST: 'USER/RADIOMARU_BOOT.JSON',
    SELF: 'HOLOTAPE-CASE.INFO',
    // The Pip-Boy's own holotape picture, as Grelok and Atomic Command use.
    HOLO_IMG: 'APPINFO/HOLO.IMG',
    // Holotapes treated like the Pip-Boy's own: left out of the case, never
    // hidden. Keep in step with STOCK in MISC_HOOK.ts. Zeta Invaders (an
    // official app since firmware 1.2.0) is matched by the start of its
    // file name.
    STOCK: ['ATOMIC.INFO', 'GRELOK.INFO'],
    STOCK_START: 'ZETA',
    // The Pip-Boy's own list: same width as ITEMS > MISC.
    LIST_W: 185,
    // Right-hand panel, beside the list.
    PX: 214,
  };
  const HIDE = 1;
  const FAV = 2;

  // Built like a submenu of ITEMS > MISC, on the firmware's own scrolling
  // list. Only the .info file names and one byte of flags per tape are kept;
  // names and icons are read from each .info as its row comes on screen.
  const s: CaseState = { files: [], flags: new Uint8Array(0), changed: false };
  let list: PipScroller | undefined;
  let opts: CaseOptions | undefined;
  let patched = false;
  let optsTimer: number | undefined;
  // The list's first row on screen when the options opened.
  let lastTop = 0;
  // Starting the MISC hook, just after the case opens (see Init).
  let bootTimer: number | undefined;
  let cleanedUp = false;
  // Whether MISC_HOOK.JS is on the card, to tell a missing file from a
  // hook that could not start.
  let hookFile = false;

  function isInfo(f: string): boolean {
    return f.toUpperCase().slice(-5) === '.INFO';
  }

  function readList(path: string): string[] {
    if (!fs.statSync(path)) return [];
    try {
      const l = JSON.parse(fs.readFileSync(path)) as string[];
      return Array.isArray(l) ? l : [];
    } catch (e) {
      return [];
    }
  }

  // Favourites keep the file name as listed; hidden names are upper case.
  function saveLists(): void {
    let i = 0;
    const favs: string[] = [];
    const hidden: string[] = [];
    for (i = 0; i < s.files.length; i++) {
      if (s.flags[i] & FAV) favs.push(s.files[i]);
      if (s.flags[i] & HIDE) hidden.push(s.files[i].toUpperCase());
    }
    try {
      fs.writeFileSync(C.FAVS, JSON.stringify(favs));
      fs.writeFileSync(C.HIDDEN, JSON.stringify(hidden));
    } catch (e) {
      // A full or locked card only loses the change; the case stays usable.
    }
  }

  function saveOrder(): void {
    let i = 0;
    const order: string[] = [];
    for (i = 0; i < s.files.length; i++) order.push(s.files[i].toUpperCase());
    try {
      fs.writeFileSync(C.ORDER, JSON.stringify(order));
      s.changed = true;
    } catch (e) {
      // Not written, so MISC will not pick the order up: say nothing changed.
    }
  }

  function info(k: number): CaseInfo | undefined {
    try {
      return JSON.parse(fs.readFileSync(C.LIVE + '/' + s.files[k])) as CaseInfo;
    } catch (e) {
      return undefined;
    }
  }

  function nameOf(k: number): string {
    const t = info(k);
    return String((t && (t.name || t.id)) || s.files[k].slice(0, -5));
  }

  // Puts the tapes in order of rank, keeping the current order for equal
  // ranks.
  function reorder(rank: (k: number) => number | string): void {
    let i = 0;
    const idx: number[] = [];
    const r: Array<number | string> = [];
    for (i = 0; i < s.files.length; i++) {
      idx.push(i);
      r.push(rank(i));
    }
    idx.sort(function (a: number, b: number): number {
      return r[a] < r[b] ? -1 : r[a] > r[b] ? 1 : a - b;
    });
    const f2: string[] = [];
    const g2 = new Uint8Array(s.files.length);
    for (i = 0; i < idx.length; i++) {
      f2.push(s.files[idx[i]]);
      g2[i] = s.flags[idx[i]];
    }
    s.files = f2;
    s.flags = g2;
  }

  function scan(): void {
    let i = 0;
    let all: string[] = [];
    try {
      all = fs.readdirSync(C.LIVE);
    } catch (e) {
      all = [];
    }
    s.files = [];
    for (i = 0; i < all.length; i++) {
      if (
        isInfo(all[i]) &&
        all[i].toUpperCase() !== C.SELF &&
        C.STOCK.indexOf(all[i].toUpperCase()) < 0 &&
        all[i].toUpperCase().indexOf(C.STOCK_START) !== 0
      ) {
        s.files.push(all[i]);
      }
    }
    all = [];
    s.flags = new Uint8Array(s.files.length);
    const favs = readList(C.FAVS);
    const hidden = readList(C.HIDDEN);
    for (i = 0; i < s.files.length; i++) {
      if (favs.indexOf(s.files[i]) >= 0) s.flags[i] |= FAV;
      if (hidden.indexOf(s.files[i].toUpperCase()) >= 0) s.flags[i] |= HIDE;
    }
    const order = readList(C.ORDER);
    if (order.length) {
      // The saved order; tapes installed since go at the end.
      reorder(function (k: number): number {
        const p = order.indexOf(s.files[k].toUpperCase());
        return p < 0 ? 100000 + k : p;
      });
    } else {
      // Never sorted yet: favourites first, then by file name.
      reorder(function (k: number): string {
        return (s.flags[k] & FAV ? '0' : '1') + s.files[k].toUpperCase();
      });
    }
  }

  // Hides a tape from ITEMS > MISC, or shows it again. Only the hidden list
  // changes; the .info file stays in APPINFO.
  function setHidden(k: number, hide: boolean): void {
    if (!!(s.flags[k] & HIDE) === hide) return;
    s.flags[k] = hide ? s.flags[k] | HIDE : s.flags[k] & ~HIDE;
    s.changed = true;
  }

  function clearPanel(): void {
    h.setBgColor(0).clearRect(C.PX, 40, 479, 280);
  }

  // Draws an .IMG icon beside the list; false when it can't be read.
  function drawIcon(path: string): boolean {
    if (!path || path.toUpperCase().slice(-4) !== '.IMG') return false;
    try {
      const d = fs.readFileSync(path.charAt(0) === '/' ? path.slice(1) : path);
      if (!d) return false;
      h.drawImage(d, 290, 52);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Right-hand panel for the highlighted tape, like an item's details.
  function drawPanel(k: number): void {
    const t = info(k);
    clearPanel();
    // The tape's own icon, else the Pip-Boy's holotape picture (pip-boy.com
    // doesn't always copy a tape's icon onto the card).
    const ok = drawIcon(t && t.icon ? t.icon : '') || drawIcon(C.HOLO_IMG);
    if (!ok) {
      // A plain holotape cassette when neither picture can be read.
      h.setColor(2)
        .drawRect(294, 72, 404, 132)
        .drawRect(296, 74, 402, 130)
        .fillCircle(326, 102, 9)
        .fillCircle(372, 102, 9)
        .setColor(0)
        .fillCircle(326, 102, 3)
        .fillCircle(372, 102, 3);
    }
    h.setColor(3)
      .setFontMonofonto14()
      .setFontAlign(-1, -1)
      .drawString(
        s.flags[k] & HIDE
          ? patched || bootTimer
            ? 'HIDDEN FROM MISC'
            : hookFile
              ? 'HIDDEN (HOOK NOT RUNNING)'
              : 'HIDDEN (HOOK FILE MISSING)'
          : 'IN ITEMS > MISC',
        C.PX + 10,
        190,
      )
      .setColor(2)
      .drawString(s.flags[k] & FAV ? 'FAVOURITE' : '', C.PX + 10, 208)
      .drawString(
        s.changed ? 'MISC UPDATES NEXT TIME' : 'PRESS FOR OPTIONS',
        C.PX + 10,
        238,
      )
      .drawString(
        s.changed ? 'YOU OPEN IT' : s.files.length + ' HOLOTAPES',
        C.PX + 10,
        254,
      );
  }

  function launch(k: number): void {
    const t = info(k);
    if (!t || !t.src) return;
    const src = t.src.charAt(0) === '/' ? t.src : '/' + t.src;
    // The Pip-Boy's own holotape-in sound, if this card has it.
    let snd = false;
    try {
      snd = !!fs.statSync(C.HOLSTART);
      if (snd) Pip.audioStart(C.HOLSTART);
    } catch (e) {
      snd = false;
    }
    if (!snd) Pip.playSound('SELECT');
    cleanup();
    // Full hand-off: the tape is started from the top level once the case
    // has returned, so nothing of the case (or its options) is still held in
    // memory while the tape loads.
    setTimeout(
      new Function(
        'Pip.loadHolotape(' + JSON.stringify(src) + ')',
      ) as () => void,
      // Long enough for the holotape sound to play before the tape loads.
      snd ? 150 : 20,
    );
  }

  function openList(start: number): PipScroller {
    const l = Pip.createScroller({
      itemCount: s.files.length,
      width: C.LIST_W,
      hasEquipStates: true,
      scrollStart: start,
      // Favourites get the filled box the Pip-Boy uses for equipped items.
      getItem: function (i: number): PipScrollerItem {
        return { txt: nameOf(i), activ: !!(s.flags[i] & FAV), k: i };
      },
      render: function (item: PipScrollerItem): void {
        if (item && item.k !== undefined) drawPanel(item.k);
      },
      // Press or hold opens the options; a tape only plays when PLAY
      // HOLOTAPE is picked there, so a stray press never starts a game.
      onClick: function (i: number): void {
        // The list redraws itself right after onClick, so open the options
        // once it has finished.
        optsTimer = setTimeout(function (): void {
          optsTimer = undefined;
          openOptions(i);
        }, 0);
      },
      onLongClick: function (i: number): void {
        openOptions(i);
      },
    });
    list = l;
    return l;
  }

  // Back from the options to the list, on the same tape wherever it has
  // moved to. The options file is dropped so its memory is freed.
  function closeOptions(name: string, top: number): void {
    if (opts) opts.remove();
    opts = undefined;
    Pip.playSound('TAB');
    const k = Math.max(0, s.files.indexOf(name));
    // After an option that leaves the tape on screen (FAVOURITE, HIDE, a
    // sort that keeps it in view), the list stays where it was instead of
    // jumping that tape to the top: rows from the old first row down to the
    // tape must fit in the list's 216 px, as the firmware measures rows.
    if (top < 0 && k >= lastTop) {
      let sum = 0;
      for (let j = lastTop; j <= k && sum <= 216; j++) {
        sum +=
          10 +
          14 *
            h.setFontMonofonto14().wrapString(nameOf(j), C.LIST_W - 40).length;
      }
      if (sum <= 216) top = lastTop;
    }
    const l = openList(k);
    // Keep the view where it was rather than jumping the tape to the top.
    if (top >= 0 && top !== k) {
      l.scrollIndex = top;
      l.render({ listOnly: true });
    }
  }

  const api: CaseApi = {
    s: s,
    tape: 0,
    px: C.PX,
    listW: C.LIST_W,
    nameOf: nameOf,
    reorder: reorder,
    setHidden: setHidden,
    saveLists: saveLists,
    saveOrder: saveOrder,
    launch: launch,
    clearPanel: clearPanel,
    openList: openList,
    close: closeOptions,
  };

  function openOptions(i: number): void {
    if (cleanedUp || opts) return;
    if (list) {
      lastTop = list.scrollIndex;
      list.remove();
    }
    list = undefined;
    api.tape = i;
    Pip.playSound('TAB');
    try {
      opts = (eval(fs.readFileSync(C.OPTIONS)) as CaseOptionsFactory)(api);
    } catch (e) {
      opts = undefined;
    }
    if (!opts) {
      // OPTIONS.JS would not load (missing, or too little memory): back to
      // the list instead of a blank screen with nothing listening.
      openList(i);
      h.setColor(2)
        .setFontMonofonto14()
        .setFontAlign(-1, -1)
        .drawString('COULD NOT LOAD OPTIONS.JS', C.PX + 10, 256);
    }
  }

  function cleanup(): void {
    if (cleanedUp) return;
    cleanedUp = true;
    if (optsTimer) clearTimeout(optsTimer);
    if (bootTimer) clearTimeout(bootTimer);
    if (opts) opts.remove();
    opts = undefined;
    if (list) list.remove();
    list = undefined;
  }

  function hookOk(): boolean {
    const st = global.RM_PATCH as Record<string, string> | undefined;
    return !!st && st.misc === 'ok';
  }

  // Init: draw the ITEMS header and tabs, then the list beneath them.
  // Hiding and ordering in ITEMS > MISC need the MISC hook, now and after a
  // full restart. Nothing to do when it is already running and listed for
  // startup (the usual case).
  let listed = false;
  try {
    listed = String(fs.readFileSync(C.BOOT_LIST)).indexOf(C.HOOK) >= 0;
  } catch (e) {
    listed = false;
  }
  patched = hookOk();
  hookFile = !!fs.statSync(C.HOOK);
  if (hookFile && !(patched && listed)) {
    // The hook runs just after the case opens, once the Pip-Boy has freed
    // the ITEMS > MISC list (running it during startup can run out of
    // memory). It runs through new Function, at the top level, so it holds
    // nothing of the case once it is closed; it then registers itself for
    // startup.
    bootTimer = setTimeout(function (): void {
      bootTimer = undefined;
      E.defrag();
      try {
        new Function(String(fs.readFileSync(C.HOOK)))();
      } catch (e) {
        // MISC just stays unchanged; the case itself still works.
      }
      patched = hookOk();
      // The list showed the hook as starting; say so if it could not.
      if (list && !patched) list.render();
    }, 0);
  }
  scan();
  h.setBgColor(0).clear();
  Pip.renderHeader();
  Pip.renderFooter();
  if (s.files.length) {
    openList(0);
  } else {
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, 0)
      .drawString('NO HOLOTAPES FOUND IN APPINFO', 240, 160);
  }

  return {
    id: 'HOLOTAPECASE',
    notDefault: true,
    remove: cleanup,
  };
});
