(function (): HolotapeApp {
  const C = {
    LIVE: 'APPINFO',
    // Where 1.0 moved stored tapes; 1.1 moves any found there back.
    STORE: 'HOLO/HOLOTAPE_CASE/STORED',
    FAVS: 'HOLO/HOLOTAPE_CASE/FAVS.JSON',
    HIDDEN: 'HOLO/HOLOTAPE_CASE/HIDDEN.JSON',
    PATCH: 'CFW/52_RADIOMARU_MISC.JS',
    SELF: 'HOLOTAPE-CASE.INFO',
    ROWS: 9,
    ROW_H: 24,
    TOP: 44,
    // Longest name kept in memory; enough for the list and the menu title.
    NAME_LEN: 30,
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

  // Only a short name and the .info file name are kept per tape, plus one
  // byte of flags. Everything else is read from the .info when it is needed,
  // so a card full of holotapes still fits in memory.
  let names: string[] = [];
  let files: string[] = [];
  let flags = new Uint8Array(0);
  // Display order: favourites first, then alphabetical.
  let order = new Uint16Array(0);
  let patched = false;
  let sel = 0;
  let top = 0;
  // Action menu over the list: -1 closed, else the highlighted action.
  let act = -1;
  let changed = false;
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

  function sortOrder(): void {
    let i = 0;
    const idx: number[] = [];
    for (i = 0; i < names.length; i++) idx.push(i);
    idx.sort(function (a: number, b: number): number {
      const fa = flags[a] & FAV;
      const fb = flags[b] & FAV;
      if (fa !== fb) return fb - fa;
      return names[a] < names[b] ? -1 : names[a] > names[b] ? 1 : 0;
    });
    order = new Uint16Array(idx);
  }

  function scan(): void {
    let i = 0;
    let all: string[] = [];
    let t: CaseInfo | undefined;
    try {
      all = fs.readdirSync(C.LIVE);
    } catch (e) {
      all = [];
    }
    names = [];
    files = [];
    for (i = 0; i < all.length; i++) {
      if (!isInfo(all[i]) || all[i].toUpperCase() === C.SELF) continue;
      files.push(all[i]);
      t = info(files.length - 1);
      if (!t || !t.src) {
        files.pop();
        continue;
      }
      names.push(
        String(t.name || t.id || all[i])
          .toUpperCase()
          .substr(0, C.NAME_LEN),
      );
    }
    all = [];
    flags = new Uint8Array(files.length);
    const favs = readList(C.FAVS);
    const hidden = readList(C.HIDDEN);
    for (i = 0; i < files.length; i++) {
      if (favs.indexOf(files[i]) >= 0) flags[i] |= FAV;
      if (hidden.indexOf(files[i].toUpperCase()) >= 0) flags[i] |= HIDE;
    }
    sortOrder();
    sel = E.clip(sel, 0, Math.max(0, files.length - 1));
  }

  // Hides a tape from ITEMS > MISC, or shows it again. Only the hidden list
  // changes; the .info file stays in APPINFO.
  function setHidden(k: number, hide: boolean): void {
    if (!!(flags[k] & HIDE) === hide) return;
    flags[k] = hide ? flags[k] | HIDE : flags[k] & ~HIDE;
    changed = true;
  }

  function drawIcon(icon: string): void {
    let ok = false;
    if (icon && icon.toUpperCase().slice(-4) === '.IMG') {
      try {
        h.drawImage(
          fs.readFileSync(icon.charAt(0) === '/' ? icon.slice(1) : icon),
          330,
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
        .drawRect(334, 62, 444, 122)
        .drawRect(336, 64, 442, 120)
        .fillCircle(366, 92, 9)
        .fillCircle(412, 92, 9)
        .setColor(0)
        .fillCircle(366, 92, 3)
        .fillCircle(412, 92, 3);
    }
  }

  function drawDetail(): void {
    h.clearRect(312, 40, 479, 262);
    if (!files.length) return;
    const k = order[sel];
    const t = info(k);
    drawIcon(t && t.icon ? t.icon : '');
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(-1, -1)
      .drawString(h.wrapString(names[k], 160).slice(0, 3).join('\n'), 322, 178)
      .setColor(2)
      .setFontMonofonto14()
      .drawString(
        flags[k] & HIDE
          ? patched
            ? 'HIDDEN FROM MISC'
            : 'HIDDEN (NEEDS PATCH)'
          : 'IN ITEMS > MISC',
        322,
        230,
      )
      .drawString(flags[k] & FAV ? 'FAVOURITE' : '', 322, 246);
  }

  function drawList(): void {
    let i = 0;
    let k = 0;
    let y = 0;
    h.clearRect(0, 40, 310, 262);
    if (sel < top) top = sel;
    if (sel >= top + C.ROWS) top = sel - C.ROWS + 1;
    h.setFontMonofonto16().setFontAlign(-1, -1);
    for (i = top; i < files.length && i < top + C.ROWS; i++) {
      k = order[i];
      y = C.TOP + (i - top) * C.ROW_H;
      if (i === sel) {
        h.setColor(3).fillRect(8, y - 2, 304, y + C.ROW_H - 6);
        h.setColor(0);
      } else h.setColor(flags[k] & HIDE ? 2 : 3);
      h.drawString(
        (flags[k] & FAV ? '* ' : '  ') + names[k].substr(0, 26),
        12,
        y,
      );
    }
    if (!files.length) {
      h.setColor(2).drawString('NO HOLOTAPES FOUND IN APPINFO', 12, C.TOP);
    }
  }

  function drawFooter(): void {
    h.clearRect(0, 264, 479, 319)
      .setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, -1)
      .drawString(
        !patched
          ? 'COPY CFW/52_RADIOMARU_MISC.JS AND REBOOT TO HIDE TAPES'
          : changed
            ? 'ITEMS > MISC IS UPDATED NEXT TIME YOU OPEN IT'
            : 'L TURN: SCROLL   R TURN: NEXT LETTER   L PRESS: PLAY',
        240,
        272,
      )
      .drawString('L HOLD: FAVOURITE / HIDE / SHOW', 240, 292);
  }

  function drawActions(): void {
    let i = 0;
    let label = '';
    const k = files.length ? order[sel] : -1;
    h.setColor(0)
      .fillRect(60, 70, 420, 250)
      .setColor(3)
      .drawRect(60, 70, 420, 250)
      .drawRect(62, 72, 418, 248)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString(k >= 0 ? names[k] : '', 240, 80);
    for (i = 0; i < C.ACTIONS.length; i++) {
      label = C.ACTIONS[i];
      if (i === 0) {
        label =
          k >= 0 && flags[k] & FAV ? 'REMOVE FAVOURITE' : 'MAKE FAVOURITE';
      }
      if (i === 1) {
        label =
          k >= 0 && flags[k] & HIDE ? 'SHOW IN ITEMS > MISC' : 'HIDE FROM MISC';
      }
      if (i === act) {
        h.setColor(3).fillRect(80, 108 + i * 26, 400, 130 + i * 26);
        h.setColor(0);
      } else h.setColor(3);
      h.drawString(label, 240, 110 + i * 26);
    }
  }

  function draw(): void {
    h.setBgColor(0)
      .clear()
      .setColor(3)
      .setFontMonofonto18()
      .setFontAlign(-1, -1)
      .drawString('HOLOTAPE CASE', 12, 8)
      .setFontAlign(1, -1)
      .drawString(files.length + ' TAPES', 468, 8)
      .setColor(2)
      .drawLine(0, 33, 479, 33)
      .drawLine(312, 40, 312, 256);
    drawList();
    drawDetail();
    drawFooter();
    if (act >= 0) drawActions();
  }

  function cleanup(): void {
    if (cleanedUp) return;
    cleanedUp = true;
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
    h.clear();
  }

  function doAction(): void {
    let i = 0;
    const k = files.length ? order[sel] : -1;
    let saved = false;
    if (act === 0 && k >= 0) {
      flags[k] ^= FAV;
      saved = true;
    } else if (act === 1 && k >= 0) {
      setHidden(k, !(flags[k] & HIDE));
    } else if (act === 2) {
      for (i = 0; i < files.length; i++) setHidden(i, !(flags[i] & FAV));
    } else if (act === 3) {
      for (i = 0; i < files.length; i++) setHidden(i, false);
    }
    if (changed || saved) saveLists();
    act = -1;
    sortOrder();
    // Keep the same tape selected after the list re-sorts.
    for (i = 0; i < order.length; i++) if (order[i] === k) sel = i;
    Pip.playSound('TAB');
    draw();
  }

  function onKnob1(dir: KnobDirection, long?: boolean): void {
    if (act >= 0) {
      if (dir) {
        act = E.clip(act + dir, 0, C.ACTIONS.length - 1);
        Pip.playSound('SCROLL');
        drawActions();
      } else doAction();
      return;
    }
    if (dir) {
      sel = E.clip(sel + dir, 0, Math.max(0, files.length - 1));
      Pip.playSound('SCROLL');
      drawList();
      drawDetail();
      return;
    }
    if (!files.length) return;
    if (long) {
      act = 0;
      Pip.playSound('TAB');
      drawActions();
      return;
    }
    const t = info(order[sel]);
    if (!t || !t.src) return;
    const src = t.src;
    Pip.playSound('SELECT');
    cleanup();
    Pip.loadHolotape(src.charAt(0) === '/' ? src : '/' + src);
  }

  // Jumps to the next (or previous) tape that starts with a new letter.
  function onKnob2(dir: KnobDirection): void {
    let i = sel;
    if (!dir || act >= 0 || !files.length) return;
    const c = names[order[sel]].charAt(0);
    while (i + dir >= 0 && i + dir < files.length) {
      i += dir;
      if (names[order[i]].charAt(0) !== c && !(flags[order[i]] & FAV)) {
        break;
      }
    }
    sel = i;
    Pip.playSound('SCROLL');
    drawList();
    drawDetail();
  }

  // Init.
  migrate();
  patched = !!fs.statSync(C.PATCH);
  scan();
  draw();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);

  return {
    id: 'HOLOTAPECASE',
    notDefault: true,
    fullscreen: true,
    remove: cleanup,
  };
});
