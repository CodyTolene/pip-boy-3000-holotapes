(function (params?: BrickBounceParams | 0): HolotapeApp {
  const SF = 'SETTINGS/BRKBNCE.DAT',
    RF = 'SETTINGS/BBRUN',
    DB = 'HOLO/BRKBNCE/SAVE.JS',
    OM = 'HOLO/BRKBNCE/OVER.WAV',
    CH = ' .!?#-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    OCH = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.',
    NX = 'HOLO/BRKBNCE/APP.JS',
    UP = 'HOLO/BRKBNCE/UPLOAD.JS';
  let scores: BrickBounceScoreRow[] = [],
    sc = (params && params.score) || 0,
    so = !params || params.sound !== 0 ? 1 : 0,
    mo = params && params.music !== 0 ? 1 : 0,
    vol = params && params.vol !== void 0 ? params.vol : 70,
    dp = params && params.disp !== void 0 ? (params.disp !== 0 ? 1 : 0) : 0,
    ini = 'AAA',
    on = '      ',
    ni = 0,
    en = 0,
    to = 0,
    done = 0,
    lv = (params && params.level) || 1,
    gm = params && params.mode ? 1 : 0,
    df = params && params.diff !== void 0 ? params.diff : 1,
    wn = params && params.win ? 1 : 0,
    un = 0,
    sl = (params && params.slot) || 0,
    xu = params && params.x ? 1 : 0,
    db: BrickBounceSaveDb | 0 = 0,
    view = 0,
    sel = 0,
    err = 0;
  function tx(n: number): string {
    return Math.min(n, 999999).toString().padStart(6, '0');
  }
  function sx(x: number, y: number): void {
    y -= 4;
    h.fillPoly([
      x,
      y - 7,
      x + 2,
      y - 2,
      x + 7,
      y - 2,
      x + 3,
      y + 1,
      x + 5,
      y + 7,
      x,
      y + 4,
      x - 5,
      y + 7,
      x - 3,
      y + 1,
      x - 7,
      y - 2,
      x - 2,
      y - 2,
    ]);
  }
  function di(d: number): 'EASY' | 'NORMAL' | 'HARD' | 'INSANE' {
    return d === 0 ? 'EASY' : d === 2 ? 'HARD' : d === 3 ? 'INSANE' : 'NORMAL';
  }
  function rn(): string {
    return RF + (sl + 1) + '.DAT';
  }
  function cl(v?: string): string {
    let r = '',
      c = '',
      n = 0;
    v = v || '';
    for (let i = 0; i < v.length && r.length < 6; i++) {
      c = v[i];
      n = c.charCodeAt(0);
      if (n >= 97 && n <= 122) c = String.fromCharCode(n - 32);
      if (OCH.indexOf(c) >= 0) r += c;
    }
    while (r.length < 6) r += ' ';
    return r;
  }
  function ns(): void {
    scores = (scores || []).filter(function (e: BrickBounceScoreRow) {
      return e && (e.s || 0) > 0;
    });
    scores.sort(function (a: BrickBounceScoreRow, b: BrickBounceScoreRow) {
      return (b.s || 0) - (a.s || 0);
    });
    scores = scores.slice(0, 10);
  }
  function av(): void {
    try {
      let b = Math.round((vol * 27) / 100);
      if (global.__bbVol !== b) {
        Pip.setVol(b);
        global.__bbVol = b;
      }
    } catch (e) {}
  }
  function bf(): void {
    try {
      let b = global.__bbBo;
      if (!b)
        b = global.__bbBo = {
          v: Pip.blitOptions.vsync,
          i: Pip.blitOptions.idleFilter,
          n: Pip.blitOptions.noScanEffect,
        };
      Pip.blitOptions.vsync = 1;
      if (dp)
        ((Pip.blitOptions.idleFilter = [0]),
          (Pip.blitOptions.noScanEffect = 1));
      else
        (b.i === void 0
          ? delete Pip.blitOptions.idleFilter
          : (Pip.blitOptions.idleFilter = b.i),
          b.n === void 0
            ? delete Pip.blitOptions.noScanEffect
            : (Pip.blitOptions.noScanEffect = b.n));
    } catch (e) {}
  }
  function ds(): BrickBounceSaveDb {
    if (!db) db = (eval(fs.readFileSync(DB)) as () => BrickBounceSaveDb)();
    return db;
  }
  function ld(): void {
    let s = ds()(SF);
    scores =
      s && s.scores
        ? s.scores
        : s && s.high
          ? [
              {
                n: '---',
                s: s.high,
              },
            ]
          : [];
    if (s) {
      so = s.sound !== 0 ? 1 : 0;
      mo = s.music !== 0 ? 1 : 0;
      if (s.vol !== void 0) vol = s.vol;
      dp = s.disp !== void 0 ? (s.disp !== 0 ? 1 : 0) : 0;
      un = s.u || 0;
      on = cl(s.on);
    }
    av();
    ns();
  }
  function sv(): void {
    ns();
    let s: BrickBounceSettings = (ds()(SF) as BrickBounceSettings) || {};
    s.sound = so ? 1 : 0;
    s.music = mo ? 1 : 0;
    s.vol = vol;
    s.disp = dp ? 1 : 0;
    s.scores = scores;
    s.u = un;
    s.on = on;
    ds()(SF, s);
  }
  function cr(): void {
    ds()(rn(), 0);
  }
  function sq(): boolean {
    return (
      sc > 0 &&
      (scores.length < 10 ||
        sc > ((scores[scores.length - 1] as BrickBounceScoreRow).s || 0))
    );
  }
  function snd(k: string): void {
    if (so)
      try {
        Pip.playSound(k);
      } catch (e) {}
  }
  function dn(): void {
    h.clear(1)
      .setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, 0)
      .drawString(wn ? 'GAME CLEAR' : 'GAME OVER', 240, 48);
    let l = (gm ? 'ARCADE ' : 'CLASSIC ') + di(df) + ' LVL ' + lv;
    h.setFontMonofonto18()
      .drawString('SCORE ' + tx(sc), 240, 88)
      .setFontMonofonto14()
      .drawString(l, 240, 112);
    if (wn) sx(240 + h.stringWidth(l) / 2 + 10, 112);
    h.setFontMonofonto18().drawString('ENTER INITIALS', 240, 140);
    h.setFontMonofonto36();
    for (let i = 0; i < 3; i++) {
      let x = 240 + 42 * (i - 1);
      if (i === ni) h.drawRect(x - 19, 160, x + 19, 214);
      h.drawString(ini[i], x, 188);
    }
    if (en) {
      let x = 324;
      if (ni === 3) h.drawRect(x - 19, 160, x + 19, 214);
      h.setFontMonofonto14()
        .drawString('E', x - 7, 170)
        .drawString('N', x, 187)
        .drawString('D', x + 7, 204);
    }
    h.setFontMonofonto14()
      .setFontAlign(-1, 0)
      .drawString('SCROLL: CHANGE LETTER', 28, 260);
    h.setFontAlign(1, 0).drawString('PRESS KNOB: ACCEPT', 452, 260);
    h.flip();
    Pip.lastFlip = getTime();
  }
  function bx(s: string, y: number, a: boolean | number): void {
    h.setColor(a ? 1 : 0)
      .fillRect(112, y - 10, 368, y + 10)
      .setColor(3)
      .drawRect(112, y - 10, 368, y + 10)
      .setFontMonofonto16()
      .setFontAlign(0, 0)
      .drawString(s, 240, y + 1);
  }
  function du(): void {
    h.clear(1)
      .setColor(3)
      .setFontMonofonto18()
      .setFontAlign(0, 0)
      .drawString('UPLOAD SCORE ONLINE?', 240, 88)
      .setFontMonofonto14()
      .drawString('YOUR LOCAL SCORE IS SAVED', 240, 122);
    bx('YES', 164, sel === 0);
    bx('NO', 190, sel === 1);
    h.setFontMonofonto14().drawString('PRESS KNOB: SELECT', 240, 286);
    h.flip();
    Pip.lastFlip = getTime();
  }
  function don(): void {
    h.clear(1)
      .setColor(3)
      .setFontMonofonto18()
      .setFontAlign(0, 0)
      .drawString('ONLINE HIGH SCORE', 240, 44)
      .setFontMonofonto14()
      .drawString('ENTER NAME', 240, 74)
      .setFontMonofonto36();
    for (let i = 0; i < 6; i++) {
      let x = 135 + i * 42;
      if (ni === i) h.drawRect(x - 19, 96, x + 19, 150);
      h.drawString(on[i], x, 124);
    }
    if (ni === 6) bx('SUBMIT', 178, 1);
    if (err) h.setFontMonofonto14().drawString('ENTER A NAME', 240, 224);
    h.setFontMonofonto14()
      .setFontAlign(-1, 0)
      .drawString('SCROLL: CHANGE LETTER', 28, 260);
    h.setFontAlign(1, 0).drawString(
      ni === 6 ? 'PRESS KNOB: SUBMIT' : 'PRESS KNOB: NEXT',
      452,
      260,
    );
    h.flip();
    Pip.lastFlip = getTime();
  }
  function rm(): void {
    if (to) clearTimeout(to);
    to = 0;
    Pip.removeListener('knob1', k1);
    Pip.removeListener('knob2', k2);
    Pip.audioStop();
    db = 0;
  }
  function go(n: number | string): void {
    if (done) return;
    done = 1;
    rm();
    h.clear(1)
      .setColor(3)
      .setFontMonofonto18()
      .setFontAlign(0, 0)
      .drawString('LOADING...', 240, 160)
      .flip();
    Pip.lastFlip = getTime();
    E.defrag();
    to = setTimeout(function () {
      let up =
        n && !xu
          ? {
              n: n,
              s: sc,
              l: lv,
              m: gm ? 1 : 0,
              d: df,
              w: wn ? 1 : 0,
              sound: so ? 1 : 0,
            }
          : 0;
      scores = [];
      ini = on = '';
      E.defrag();
      to = setTimeout(function () {
        to = 0;
        Pip.audioStop();
        Pip.remove();
        E.defrag();
        if (up) {
          global.__bbUpload = up;
          Pip.CURRENT = eval(fs.readFileSync(UP))(up);
        } else Pip.CURRENT = eval(fs.readFileSync(NX))({ view: 'scores' });
      }, 180);
    }, 120);
  }
  function add(): void {
    cr();
    scores.push({
      n: ini,
      s: sc,
      l: lv,
      m: gm ? 1 : 0,
      d: df,
      w: wn ? 1 : 0,
      x: xu ? 1 : 0,
    });
    sv();
  }
  function fl(): void {
    add();
    if (xu) {
      go(0);
      return;
    }
    Pip.audioStop();
    view = 1;
    sel = 0;
    du();
  }
  function fo(): void {
    if (on.replace(/ /g, '') === '') {
      err = 1;
      don();
      return;
    }
    sv();
    go(on);
  }
  function kl(d: number): void {
    if (d) {
      if (ni === 3) return;
      let a = ini.split(''),
        p = CH.indexOf(a[ni]);
      if (p < 0) p = 0;
      p = (p + CH.length + d) % CH.length;
      a[ni] = CH[p];
      ini = a.join('');
      snd('SCROLL');
      dn();
      return;
    }
    snd('TAB');
    if (ni === 3) {
      fl();
      return;
    }
    if (ni < 2) ni++;
    else {
      en = 1;
      ni = 3;
    }
    dn();
  }
  function ku(d: number): void {
    if (d) {
      sel = sel ? 0 : 1;
      snd('SCROLL');
      du();
      return;
    }
    snd('TAB');
    if (sel) go(0);
    else {
      view = 2;
      ni = 0;
      err = 0;
      don();
    }
  }
  function ko(d: number): void {
    if (d) {
      if (ni < 6) {
        let p = OCH.indexOf(on[ni]);
        if (p < 0) p = 0;
        p = (p + OCH.length + d) % OCH.length;
        on = on.substr(0, ni) + OCH[p] + on.substr(ni + 1);
        err = 0;
        snd('SCROLL');
        don();
      }
      return;
    }
    snd('TAB');
    if (ni < 5) ni++;
    else if (ni === 5) ni = 6;
    else {
      fo();
      return;
    }
    don();
  }
  function k1(d: KnobDirection): void {
    if (view === 0) kl(d);
    else if (view === 1) ku(d);
    else ko(d);
  }
  function k2(d: KnobDirection): void {
    if (!d) return;
    if (view === 0) {
      let n = en ? 4 : 3;
      ni = (ni + d + n) % n;
      snd('TAB');
      dn();
    } else if (view === 1) {
      sel = sel ? 0 : 1;
      snd('SCROLL');
      du();
    } else {
      ni = Math.max(0, Math.min(6, ni + d));
      snd('TAB');
      don();
    }
  }
  ld();
  bf();
  if (mo)
    try {
      Pip.audioStart(OM);
    } catch (e) {}
  if (!sq()) {
    cr();
    go(0);
    return {
      id: 'BRKBNCE',
      notDefault: !0,
      fullscreen: !0,
      remove: rm,
    };
  }
  dn();
  Pip.onExclusive('knob1', k1);
  Pip.onExclusive('knob2', k2);
  return {
    id: 'BRKBNCE',
    notDefault: !0,
    fullscreen: !0,
    remove: rm,
  };
});
