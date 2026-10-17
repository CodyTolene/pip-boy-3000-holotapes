(function (): HolotapeApp {
  const C = {
    LIVE: 'APPINFO',
    // Where 1.0 moved stored tapes; 1.1 moves any found there back.
    STORE: 'HOLO/HOLOTAPE_CASE/STORED',
    FAVS: 'HOLO/HOLOTAPE_CASE/FAVS.JSON',
    HIDDEN: 'HOLO/HOLOTAPE_CASE/HIDDEN.JSON',
    // The case's order; the MISC patch lists APPINFO in the same order.
    ORDER: 'HOLO/HOLOTAPE_CASE/ORDER.JSON',
    PATCH: 'CFW/52_RADIOMARU_MISC.JS',
    SELF: 'HOLOTAPE-CASE.INFO',
    // The Pip-Boy's own list: same width as ITEMS > MISC.
    LIST_W: 185,
    // Right-hand panel, beside the list.
    PX: 214,
    // The options box: the main menu and its two sub-menus.
    MENUS: [
      [
        'PLAY HOLOTAPE',
        'MOVE IN LIST',
        'FAVOURITE',
        'MISC',
        'SORT THE CASE >',
        'HIDE OR SHOW ALL >',
        'BACK',
      ],
      ['A TO Z', 'FAVOURITES TO THE TOP', 'HIDDEN TO THE BOTTOM', 'BACK'],
      [
        'HIDE ALL BUT FAVOURITES',
        'HIDE ALL CUSTOM HOLOTAPES',
        'SHOW ALL IN MISC',
        'BACK',
      ],
    ],
    TITLES: ['', 'SORT THE CASE', 'HIDE OR SHOW ALL'],
    // Height of the list area the firmware scrolls through.
    LIST_H: 216,
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
  let menu = 0;
  let actTape = -1;
  // Tape being carried up or down the list, or -1.
  let moving = -1;
  let launchTimer: number | undefined;
  let actTimer: number | undefined;
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

  function saveOrder(): void {
    let i = 0;
    const order: string[] = [];
    for (i = 0; i < files.length; i++) order.push(files[i].toUpperCase());
    fs.writeFileSync(C.ORDER, JSON.stringify(order));
    changed = true;
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

  // Puts the tapes in order of rank, keeping the current order for equal
  // ranks.
  function reorder(rank: (k: number) => number | string): void {
    let i = 0;
    const idx: number[] = [];
    const r: (number | string)[] = [];
    for (i = 0; i < files.length; i++) {
      idx.push(i);
      r.push(rank(i));
    }
    idx.sort(function (a: number, b: number): number {
      return r[a] < r[b] ? -1 : r[a] > r[b] ? 1 : a - b;
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
    const order = readList(C.ORDER);
    if (order.length) {
      // The saved order; tapes installed since go at the end.
      reorder(function (k: number): number {
        const p = order.indexOf(files[k].toUpperCase());
        return p < 0 ? 100000 + k : p;
      });
    } else {
      // Never sorted yet: favourites first, then by file name.
      reorder(function (k: number): string {
        return (flags[k] & FAV ? '0' : '1') + files[k].toUpperCase();
      });
    }
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
        changed ? 'MISC UPDATES NEXT TIME' : 'PRESS FOR OPTIONS',
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
    const items = C.MENUS[menu];
    clearPanel();
    h.setColor(3)
      .drawRect(C.PX + 4, 52, 470, 270)
      .setFontMonofonto14()
      .setFontAlign(-1, -1)
      .drawString(
        menu ? C.TITLES[menu] : nameOf(k).substr(0, 28),
        C.PX + 12,
        60,
      );
    for (i = 0; i < items.length; i++) {
      label = items[i];
      if (menu === 0 && i === 2)
        label = flags[k] & FAV ? 'REMOVE FAVOURITE' : 'MAKE FAVOURITE';
      if (menu === 0 && i === 3) {
        label = flags[k] & HIDE ? 'SHOW IN ITEMS > MISC' : 'HIDE FROM MISC';
      }
      if (i === act) Pip.shadeBox(C.PX + 10, 80 + i * 27, 464, 102 + i * 27);
      h.setColor(3).drawString(label, C.PX + 18, 85 + i * 27);
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
      // Press or hold opens the options; a tape only plays when PLAY
      // HOLOTAPE is picked there, so a stray press never starts a game.
      onClick: function (i: number): void {
        // The list redraws itself right after onClick, so open the options
        // once it has finished.
        actTimer = setTimeout(function (): void {
          actTimer = undefined;
          openActions(i);
        }, 0);
      },
      onLongClick: function (i: number): void {
        openActions(i);
      },
    });
  }

  function openActions(i: number): void {
    if (cleanedUp) return;
    if (list) list.remove();
    list = undefined;
    actTape = i;
    act = 0;
    menu = 0;
    Pip.playSound('TAB');
    Pip.onExclusive('knob1', onAction);
    drawActions();
  }

  // Leaves the options and reopens the list on the same tape, wherever it
  // has moved to.
  function closeActions(name: string): void {
    act = -1;
    menu = 0;
    Pip.removeListener('knob1', onAction);
    Pip.playSound('TAB');
    openList(Math.max(0, files.indexOf(name)));
  }

  function openMenu(m: number, at: number): void {
    menu = m;
    act = at;
    Pip.playSound('TAB');
    drawActions();
  }

  function doAction(): void {
    let i = 0;
    const name = files[actTape];
    let saved = false;
    let sorted = false;
    if (menu === 0) {
      if (act === 0) {
        // Stays on the options if the tape has nowhere to load from.
        launch(actTape);
        return;
      }
      if (act === 1) {
        act = -1;
        Pip.removeListener('knob1', onAction);
        startMove(actTape);
        return;
      }
      if (act === 4) return openMenu(1, 0);
      if (act === 5) return openMenu(2, 0);
      if (act === 2) {
        flags[actTape] ^= FAV;
        saved = true;
      } else if (act === 3) {
        setHidden(actTape, !(flags[actTape] & HIDE));
      }
    } else if (menu === 1) {
      if (act === 3) return openMenu(0, 4);
      if (act === 0) {
        // By the name shown in the list.
        const names: string[] = [];
        for (i = 0; i < files.length; i++) names.push(nameOf(i).toUpperCase());
        reorder(function (k: number): string {
          return names[k];
        });
      } else if (act === 1) {
        reorder(function (k: number): number {
          return flags[k] & FAV ? 0 : 1;
        });
      } else if (act === 2) {
        reorder(function (k: number): number {
          return flags[k] & HIDE ? 1 : 0;
        });
      }
      sorted = true;
    } else {
      if (act === 3) return openMenu(0, 5);
      if (act === 0) {
        for (i = 0; i < files.length; i++) setHidden(i, !(flags[i] & FAV));
      } else if (act === 1) {
        // Everything in APPINFO was installed from pip-boy.com; the Pip-Boy's
        // own MISC items come from its data files and stay. The case is not
        // in the list, so it always stays too.
        for (i = 0; i < files.length; i++) setHidden(i, true);
      } else {
        for (i = 0; i < files.length; i++) setHidden(i, false);
      }
    }
    if (changed || saved) saveLists();
    if (sorted) saveOrder();
    closeActions(name);
  }

  // Height of a list row, the way the firmware's list measures it.
  function rowH(k: number): number {
    return 10 + 14 * h.setFontMonofonto14().wrapString(nameOf(k), C.LIST_W - 40).length;
  }

  function drawMovePanel(): void {
    clearPanel();
    h.setColor(3)
      .setFontMonofonto14()
      .setFontAlign(-1, -1)
      .drawString('MOVING', C.PX + 10, 120)
      .drawString(nameOf(moving).substr(0, 28), C.PX + 10, 140)
      .setColor(2)
      .drawString('TURN TO MOVE IT', C.PX + 10, 190)
      .drawString('PRESS TO PUT IT HERE', C.PX + 10, 208);
    h.flip();
  }

  // Carries a tape up or down the list. The firmware's list draws the rows;
  // this takes the left wheel from it while the tape is moving.
  function startMove(k: number): void {
    moving = k;
    Pip.playSound('TAB');
    openList(k);
    if (list) list.remove();
    Pip.onExclusive('knob1', onMove);
    drawMovePanel();
  }

  function onMove(dir: KnobDirection): void {
    const l = list;
    if (!l) return;
    if (!dir) {
      const k = moving;
      moving = -1;
      Pip.removeListener('knob1', onMove);
      saveOrder();
      Pip.playSound('TAB');
      const top = l.scrollIndex;
      openList(k);
      // Keep the view where it was rather than jumping the tape to the top.
      if (list && top !== k) {
        list.scrollIndex = top;
        list.render({ listOnly: true });
      }
      return;
    }
    const j = moving + dir;
    if (j < 0 || j >= files.length) return;
    const f = files[j];
    const g = flags[j];
    files[j] = files[moving];
    flags[j] = flags[moving];
    files[moving] = f;
    flags[moving] = g;
    moving = j;
    Pip.playSound('SCROLL');
    // Forget the drawn rows, then keep the moving tape on screen.
    l.updateItemCount(files.length);
    l.selectedIndex = j;
    l.scrollY = 0;
    if (j < l.scrollIndex) {
      l.scrollIndex = j;
    } else {
      let i = 0;
      let sum = 0;
      for (i = l.scrollIndex; i <= j; i++) sum += rowH(i);
      while (sum > C.LIST_H && l.scrollIndex < j) {
        sum -= rowH(l.scrollIndex);
        l.scrollIndex++;
      }
    }
    l.render({ listOnly: true });
  }

  function onAction(dir: KnobDirection): void {
    if (dir) {
      act = E.clip(act + dir, 0, C.MENUS[menu].length - 1);
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
    if (actTimer) clearTimeout(actTimer);
    if (list) list.remove();
    list = undefined;
    Pip.removeListener('knob1', onAction);
    Pip.removeListener('knob1', onMove);
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
