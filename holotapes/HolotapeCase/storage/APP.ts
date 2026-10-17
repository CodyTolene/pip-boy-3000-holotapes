(function (): HolotapeApp {
  const C = {
    LIVE: 'APPINFO',
    // Where 1.0 moved stored tapes; 1.1 moves any found there back.
    STORE: 'HOLO/HOLOTAPE_CASE/STORED',
    FAVS: 'HOLO/HOLOTAPE_CASE/FAVS.JSON',
    HIDDEN: 'HOLO/HOLOTAPE_CASE/HIDDEN.JSON',
    PATCH: 'CFW/52_RADIOMARU_MISC.JS',
    SELF: 'HOLOTAPE-CASE.INFO',
    // The Pip-Boy's own list: same width as ITEMS > MISC.
    LIST_W: 185,
    // Right-hand panel, beside the list.
    PX: 214,
    ACTIONS: [
      'FAVOURITE',
      'MISC',
      'HIDE ALL BUT FAVOURITES',
      'SHOW ALL IN MISC',
      'BACK',
    ],
  };
  const HIDE = 1;
  const FAV = 2;

  // Built like a submenu of ITEMS > MISC, on the firmware's own scrolling
  // list. Only the .info file names and one byte of flags per tape are kept;
  // names and icons are read from each .info as its row comes on screen.
  let files: string[] = [];
  let flags = new Uint8Array(0);
  let list: PipScroller | undefined;
  let patched = false;
  let changed = false;
  // Options box over the right panel: -1 closed, else the highlighted action.
  let act = -1;
  let actTape = -1;
  let launchTimer: number | undefined;
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
    for (i = 0; i < files.length; i++) {
      if (flags[i] & FAV) favs.push(files[i]);
      if (flags[i] & HIDE) hidden.push(files[i].toUpperCase());
    }
    fs.writeFileSync(C.FAVS, JSON.stringify(favs));
    fs.writeFileSync(C.HIDDEN, JSON.stringify(hidden));
  }

  // Version 1.0 hid tapes by moving their .info files into the case. Put any
  // still there back in APPINFO, marked hidden, so nothing is out of place.
  function migrate(): void {
    let i = 0;
    let moved: string[] = [];
    let ok = false;
    if (!fs.statSync(C.STORE)) return;
    try {
      moved = fs.readdirSync(C.STORE);
    } catch (e) {
      return;
    }
    const hidden = readList(C.HIDDEN);
    for (i = 0; i < moved.length; i++) {
      if (!isInfo(moved[i])) continue;
      try {
        ok = fs.rename(C.STORE + '/' + moved[i], C.LIVE + '/' + moved[i]);
      } catch (e) {
        ok = false;
      }
      if (!ok) {
        fs.writeFileSync(
          C.LIVE + '/' + moved[i],
          fs.readFileSync(C.STORE + '/' + moved[i]),
        );
        fs.unlink(C.STORE + '/' + moved[i]);
      }
      if (hidden.indexOf(moved[i].toUpperCase()) < 0) {
        hidden.push(moved[i].toUpperCase());
      }
    }
    fs.writeFileSync(C.HIDDEN, JSON.stringify(hidden));
  }

  function info(k: number): CaseInfo | undefined {
    try {
      return JSON.parse(fs.readFileSync(C.LIVE + '/' + files[k])) as CaseInfo;
    } catch (e) {
      return undefined;
    }
  }

  function nameOf(k: number): string {
    const t = info(k);
    return String((t && (t.name || t.id)) || files[k].slice(0, -5));
  }

  // Favourites first, then by file name (which nearly always follows the
  // tape's name), so nothing has to be read from the .info files to sort.
  function sortFiles(): void {
    let i = 0;
    const idx: number[] = [];
    for (i = 0; i < files.length; i++) idx.push(i);
    idx.sort(function (a: number, b: number): number {
      const fa = flags[a] & FAV;
      const fb = flags[b] & FAV;
      const na = files[a].toUpperCase();
      const nb = files[b].toUpperCase();
      if (fa !== fb) return fb - fa;
      return na < nb ? -1 : na > nb ? 1 : 0;
    });
    const f2: string[] = [];
    const g2 = new Uint8Array(files.length);
    for (i = 0; i < idx.length; i++) {
      f2.push(files[idx[i]]);
      g2[i] = flags[idx[i]];
    }
    files = f2;
    flags = g2;
  }

  function scan(): void {
    let i = 0;
    let all: string[] = [];
    try {
      all = fs.readdirSync(C.LIVE);
    } catch (e) {
      all = [];
    }
    files = [];
    for (i = 0; i < all.length; i++) {
      if (isInfo(all[i]) && all[i].toUpperCase() !== C.SELF) files.push(all[i]);
    }
    all = [];
    flags = new Uint8Array(files.length);
    const favs = readList(C.FAVS);
    const hidden = readList(C.HIDDEN);
    for (i = 0; i < files.length; i++) {
      if (favs.indexOf(files[i]) >= 0) flags[i] |= FAV;
      if (hidden.indexOf(files[i].toUpperCase()) >= 0) flags[i] |= HIDE;
    }
    sortFiles();
  }

  // Hides a tape from ITEMS > MISC, or shows it again. Only the hidden list
  // changes; the .info file stays in APPINFO.
  function setHidden(k: number, hide: boolean): void {
    if (!!(flags[k] & HIDE) === hide) return;
    flags[k] = hide ? flags[k] | HIDE : flags[k] & ~HIDE;
    changed = true;
  }

  function clearPanel(): void {
    h.setBgColor(0).clearRect(C.PX, 40, 479, 280);
  }

  // Right-hand panel for the highlighted tape, like an item's details.
  function drawPanel(k: number): void {
    let ok = false;
    const t = info(k);
    const icon = t && t.icon ? t.icon : '';
    clearPanel();
    if (icon && icon.toUpperCase().slice(-4) === '.IMG') {
      try {
        h.drawImage(
          fs.readFileSync(icon.charAt(0) === '/' ? icon.slice(1) : icon),
          290,
          52,
        );
        ok = true;
      } catch (e) {
        ok = false;
      }
    }
    if (!ok) {
      // A plain holotape cassette when the tape has no usable icon.
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
        flags[k] & HIDE
          ? patched
            ? 'HIDDEN FROM MISC'
            : 'HIDDEN (NEEDS PATCH)'
          : 'IN ITEMS > MISC',
        C.PX + 10,
        190,
      )
      .setColor(2)
      .drawString(flags[k] & FAV ? 'FAVOURITE' : '', C.PX + 10, 208)
      .drawString(
        changed ? 'MISC UPDATES NEXT TIME' : 'HOLD: FAVOURITE / HIDE',
        C.PX + 10,
        238,
      )
      .drawString(
        changed ? 'YOU OPEN IT' : files.length + ' HOLOTAPES',
        C.PX + 10,
        254,
      );
  }

  function drawActions(): void {
    let i = 0;
    let label = '';
    const k = actTape;
    clearPanel();
    h.setColor(3)
      .drawRect(C.PX + 4, 52, 470, 270)
      .setFontMonofonto14()
      .setFontAlign(-1, -1)
      .drawString(nameOf(k).substr(0, 28), C.PX + 12, 60);
    for (i = 0; i < C.ACTIONS.length; i++) {
      label = C.ACTIONS[i];
      if (i === 0)
        label = flags[k] & FAV ? 'REMOVE FAVOURITE' : 'MAKE FAVOURITE';
      if (i === 1) {
        label = flags[k] & HIDE ? 'SHOW IN ITEMS > MISC' : 'HIDE FROM MISC';
      }
      if (i === act) Pip.shadeBox(C.PX + 10, 88 + i * 34, 464, 112 + i * 34);
      h.setColor(3).drawString(label, C.PX + 18, 94 + i * 34);
    }
    h.flip();
  }

  function launch(k: number): void {
    const t = info(k);
    if (!t || !t.src) return;
    const src = t.src.charAt(0) === '/' ? t.src : '/' + t.src;
    Pip.playSound('SELECT');
    // Let the list finish drawing before the new holotape takes the screen.
    launchTimer = setTimeout(function (): void {
      launchTimer = undefined;
      cleanup();
      Pip.loadHolotape(src);
    }, 10);
  }

  function openList(start: number): void {
    list = Pip.createScroller({
      itemCount: files.length,
      width: C.LIST_W,
      hasEquipStates: true,
      scrollStart: start,
      // Favourites get the filled box the Pip-Boy uses for equipped items.
      getItem: function (i: number): PipScrollerItem {
        return { txt: nameOf(i), activ: !!(flags[i] & FAV), k: i };
      },
      render: function (item: PipScrollerItem): void {
        if (item && item.k !== undefined) drawPanel(item.k);
      },
      onClick: function (i: number): void {
        launch(i);
      },
      onLongClick: function (i: number): void {
        if (list) list.remove();
        list = undefined;
        actTape = i;
        act = 0;
        Pip.playSound('TAB');
        Pip.onExclusive('knob1', onAction);
        drawActions();
      },
    });
  }

  function doAction(): void {
    let i = 0;
    const name = files[actTape];
    let saved = false;
    if (act === 0) {
      flags[actTape] ^= FAV;
      saved = true;
    } else if (act === 1) {
      setHidden(actTape, !(flags[actTape] & HIDE));
    } else if (act === 2) {
      for (i = 0; i < files.length; i++) setHidden(i, !(flags[i] & FAV));
    } else if (act === 3) {
      for (i = 0; i < files.length; i++) setHidden(i, false);
    }
    if (changed || saved) saveLists();
    sortFiles();
    act = -1;
    Pip.removeListener('knob1', onAction);
    Pip.playSound('TAB');
    // Reopen the list on the same tape, wherever it sorted to.
    openList(Math.max(0, files.indexOf(name)));
  }

  function onAction(dir: KnobDirection): void {
    if (dir) {
      act = E.clip(act + dir, 0, C.ACTIONS.length - 1);
      Pip.playSound('SCROLL');
      drawActions();
      return;
    }
    doAction();
  }

  function cleanup(): void {
    if (cleanedUp) return;
    cleanedUp = true;
    if (launchTimer) clearTimeout(launchTimer);
    if (list) list.remove();
    list = undefined;
    Pip.removeListener('knob1', onAction);
  }

  // Init: draw the ITEMS header and tabs, then the list beneath them.
  migrate();
  patched = !!fs.statSync(C.PATCH);
  scan();
  h.setBgColor(0).clear();
  Pip.renderHeader();
  Pip.renderFooter();
  if (files.length) {
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
