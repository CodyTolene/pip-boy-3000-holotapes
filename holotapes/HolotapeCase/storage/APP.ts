(function (): HolotapeApp {
  const C = {
    LIVE: 'APPINFO',
    STORE: 'HOLO/HOLOTAPE_CASE/STORED',
    FAVS: 'HOLO/HOLOTAPE_CASE/FAVS.JSON',
    SELF: 'HOLOTAPE-CASE.INFO',
    ROWS: 9,
    ROW_H: 24,
    TOP: 44,
    ACTIONS: [
      'FAVOURITE',
      'MISC',
      'STORE ALL OTHERS',
      'SHOW ALL IN MISC',
      'BACK',
    ],
  };

  let tapes: CaseTape[] = [];
  let favs: string[] = [];
  let sel = 0;
  let top = 0;
  // Action menu over the list: -1 closed, else the highlighted action.
  let act = -1;
  let changed = false;
  let cleanedUp = false;

  function isInfo(f: string): boolean {
    return f.toUpperCase().slice(-5) === '.INFO';
  }

  function loadFavs(): void {
    if (!fs.statSync(C.FAVS)) return;
    try {
      favs = JSON.parse(fs.readFileSync(C.FAVS)) as string[];
    } catch (e) {
      favs = [];
    }
  }

  function saveFavs(): void {
    fs.writeFileSync(C.FAVS, JSON.stringify(favs));
  }

  function list(dir: string, hidden: number): void {
    let i = 0;
    let names: string[] = [];
    let info!: CaseInfo;
    try {
      names = fs.readdirSync(dir);
    } catch (e) {
      return;
    }
    for (i = 0; i < names.length; i++) {
      if (!isInfo(names[i]) || names[i].toUpperCase() === C.SELF) continue;
      try {
        info = JSON.parse(fs.readFileSync(dir + '/' + names[i])) as CaseInfo;
      } catch (e) {
        continue;
      }
      if (!info || !info.src) continue;
      tapes.push({
        n: String(info.name || info.id || names[i]).toUpperCase(),
        s: info.src,
        i: info.icon || '',
        f: names[i],
        h: hidden,
        v: favs.indexOf(names[i]) >= 0 ? 1 : 0,
      });
    }
  }

  // Favourites first, then alphabetical.
  function scan(): void {
    tapes = [];
    if (!fs.statSync(C.STORE)) fs.mkdir(C.STORE);
    list(C.LIVE, 0);
    list(C.STORE, 1);
    tapes.sort(function (a: CaseTape, b: CaseTape): number {
      if (a.v !== b.v) return b.v - a.v;
      return a.n < b.n ? -1 : a.n > b.n ? 1 : 0;
    });
    sel = E.clip(sel, 0, Math.max(0, tapes.length - 1));
  }

  // Moves a tape's .info between APPINFO (shown in ITEMS > MISC) and the
  // case's store (hidden). The firmware only reads APPINFO at boot.
  function move(t: CaseTape, hide: number): void {
    const from = (t.h ? C.STORE : C.LIVE) + '/' + t.f;
    const to = (hide ? C.STORE : C.LIVE) + '/' + t.f;
    if (t.h === hide) return;
    let ok = false;
    try {
      ok = fs.rename(from, to);
    } catch (e) {
      ok = false;
    }
    if (!ok) {
      // No rename on this firmware: copy, then remove the original.
      fs.writeFileSync(to, fs.readFileSync(from));
      fs.unlink(from);
    }
    t.h = hide;
    changed = true;
  }

  function drawIcon(t: CaseTape): void {
    let ok = false;
    if (t.i && t.i.toUpperCase().slice(-4) === '.IMG') {
      try {
        h.drawImage(
          fs.readFileSync(t.i.charAt(0) === '/' ? t.i.slice(1) : t.i),
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
    const t = tapes[sel];
    h.clearRect(312, 40, 479, 262);
    if (!t) return;
    drawIcon(t);
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(-1, -1)
      .drawString(h.wrapString(t.n, 160).slice(0, 3).join('\n'), 322, 178)
      .setColor(2)
      .setFontMonofonto14()
      .drawString(t.h ? 'STORED IN CASE' : 'IN ITEMS > MISC', 322, 230)
      .drawString(t.v ? 'FAVOURITE' : '', 322, 246);
  }

  function drawList(): void {
    let i = 0;
    let t!: CaseTape;
    let y = 0;
    h.clearRect(0, 40, 310, 262);
    if (sel < top) top = sel;
    if (sel >= top + C.ROWS) top = sel - C.ROWS + 1;
    h.setFontMonofonto16().setFontAlign(-1, -1);
    for (i = top; i < tapes.length && i < top + C.ROWS; i++) {
      t = tapes[i];
      y = C.TOP + (i - top) * C.ROW_H;
      if (i === sel) {
        h.setColor(3).fillRect(8, y - 2, 304, y + C.ROW_H - 6);
        h.setColor(0);
      } else h.setColor(t.h ? 2 : 3);
      h.drawString((t.v ? '* ' : '  ') + t.n.substr(0, 26), 12, y);
    }
    if (!tapes.length) {
      h.setColor(2).drawString('NO HOLOTAPES FOUND IN APPINFO', 12, C.TOP);
    }
  }

  function drawFooter(): void {
    h.clearRect(0, 264, 479, 319)
      .setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, -1)
      .drawString(
        changed
          ? 'REBOOT THE PIP-BOY TO UPDATE ITEMS > MISC'
          : 'L TURN: SCROLL   R TURN: NEXT LETTER   L PRESS: PLAY',
        240,
        272,
      )
      .drawString('L HOLD: FAVOURITE / STORE / SHOW', 240, 292);
  }

  function drawActions(): void {
    let i = 0;
    let label = '';
    const t = tapes[sel];
    h.setColor(0)
      .fillRect(60, 70, 420, 250)
      .setColor(3)
      .drawRect(60, 70, 420, 250)
      .drawRect(62, 72, 418, 248)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString(t ? t.n.substr(0, 30) : '', 240, 80);
    for (i = 0; i < C.ACTIONS.length; i++) {
      label = C.ACTIONS[i];
      if (i === 0) label = t && t.v ? 'REMOVE FAVOURITE' : 'MAKE FAVOURITE';
      if (i === 1) label = t && t.h ? 'SHOW IN ITEMS > MISC' : 'STORE IN CASE';
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
      .drawString(tapes.length + ' TAPES', 468, 8)
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
    const t = tapes[sel];
    const name = t ? t.f : '';
    if (act === 0 && t) {
      if (t.v) favs.splice(favs.indexOf(t.f), 1);
      else favs.push(t.f);
      saveFavs();
    } else if (act === 1 && t) {
      move(t, t.h ? 0 : 1);
    } else if (act === 2) {
      for (i = 0; i < tapes.length; i++) if (i !== sel) move(tapes[i], 1);
    } else if (act === 3) {
      for (i = 0; i < tapes.length; i++) move(tapes[i], 0);
    }
    act = -1;
    scan();
    // Keep the same tape selected after the list re-sorts.
    for (i = 0; i < tapes.length; i++) if (tapes[i].f === name) sel = i;
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
      sel = E.clip(sel + dir, 0, Math.max(0, tapes.length - 1));
      Pip.playSound('SCROLL');
      drawList();
      drawDetail();
      return;
    }
    if (!tapes.length) return;
    if (long) {
      act = 0;
      Pip.playSound('TAB');
      drawActions();
      return;
    }
    const src = tapes[sel].s;
    Pip.playSound('SELECT');
    cleanup();
    Pip.loadHolotape(src.charAt(0) === '/' ? src : '/' + src);
  }

  // Jumps to the next (or previous) tape that starts with a new letter.
  function onKnob2(dir: KnobDirection): void {
    let i = sel;
    if (!dir || act >= 0 || !tapes.length) return;
    const c = tapes[sel].n.charAt(0);
    while (i + dir >= 0 && i + dir < tapes.length) {
      i += dir;
      if (tapes[i].n.charAt(0) !== c && !tapes[i].v) break;
    }
    sel = i;
    Pip.playSound('SCROLL');
    drawList();
    drawDetail();
  }

  // Init.
  loadFavs();
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
