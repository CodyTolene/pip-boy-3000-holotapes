(function (): HolotapeApp {
  const C = {
    LIVE: 'APPINFO',
    FAVS: 'HOLO/HOLOTAPE_CASE/FAVS.JSON',
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
    // hidden. Keep in step with STOCK in 52_RADIOMARU_MISC.ts.
    STOCK: ['ATOMIC.INFO', 'GRELOK.INFO'],
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
  let cleanedUp = false;

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
    fs.writeFileSync(C.FAVS, JSON.stringify(favs));
    fs.writeFileSync(C.HIDDEN, JSON.stringify(hidden));
  }

  function saveOrder(): void {
    let i = 0;
    const order: string[] = [];
    for (i = 0; i < s.files.length; i++) order.push(s.files[i].toUpperCase());
    fs.writeFileSync(C.ORDER, JSON.stringify(order));
    s.changed = true;
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
        C.STOCK.indexOf(all[i].toUpperCase()) < 0
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
          ? patched
            ? 'HIDDEN FROM MISC'
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
    Pip.playSound('SELECT');
    cleanup();
    // Full hand-off: the tape is started from the top level once the case
    // has returned, so nothing of the case (or its options) is still held in
    // memory while the tape loads.
    setTimeout(
      new Function(
        'Pip.loadHolotape(' + JSON.stringify(src) + ')',
      ) as () => void,
      20,
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
    if (list) list.remove();
    list = undefined;
    api.tape = i;
    Pip.playSound('TAB');
    opts = (eval(fs.readFileSync(C.OPTIONS)) as CaseOptionsFactory)(api);
  }

  function cleanup(): void {
    if (cleanedUp) return;
    cleanedUp = true;
    if (optsTimer) clearTimeout(optsTimer);
    if (opts) opts.remove();
    opts = undefined;
    if (list) list.remove();
    list = undefined;
  }

  // Init: draw the ITEMS header and tabs, then the list beneath them.
  // Switch on hiding and ordering in ITEMS > MISC, now and after a full
  // restart. Nothing to do when the hook is already running and listed for
  // startup (the usual case). Otherwise it runs through new Function, at the
  // top level, so it holds nothing of the case once it is closed; the hook
  // then registers itself for startup.
  let st = global.RM_PATCH as Record<string, string> | undefined;
  let listed = false;
  try {
    listed = String(fs.readFileSync(C.BOOT_LIST)).indexOf(C.HOOK) >= 0;
  } catch (e) {
    listed = false;
  }
  if (!(st && st.misc === 'ok' && listed)) {
    try {
      new Function(String(fs.readFileSync(C.HOOK)))();
    } catch (e) {
      // MISC just stays unchanged; the case itself still works.
    }
    st = global.RM_PATCH as Record<string, string> | undefined;
  }
  patched = !!st && st.misc === 'ok';
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
