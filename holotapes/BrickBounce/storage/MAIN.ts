(function (params?: BrickBounceParams | 0): HolotapeApp {
  h.clear(1);
  const SF = 'SETTINGS/BRKBNCE.DAT',
    PF = 'SETTINGS/BRKPATCH.DAT',
    RF = 'SETTINGS/BBRUN',
    DB = 'HOLO/BRKBNCE/SAVE.JS',
    DW = 'HOLO/BRKBNCE/SAVEW.JS',
    TI = 'HOLO/BRKBNCE/UI1.BIN',
    TB = 'HOLO/BRKBNCE/UI3.BIN',
    KI = 'HOLO/BRKBNCE/UI2.BIN',
    ON = 'HOLO/BRKBNCE/ONLINE.IMG',
    VA = 'HOLO/BRKBNCE/ABOUT.AVI',
    VC = 'HOLO/BRKBNCE/ABOUTC.AVI',
    MU = 'HOLO/BRKBNCE/INTRO.WAV',
    OM = 'HOLO/BRKBNCE/OVER.WAV',
    CH = '-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    IB = 120,
    IY = 286,
    IH = 33;
  let so = 1,
    mo = 1,
    vo = 70,
    dp = 0,
    bt = 1,
    psp = 0,
    bcl = 0,
    va =
      params && params.keepMusic && global.__bbVol !== void 0
        ? global.__bbVol
        : -1,
    scores: BrickBounceScoreRow[] = [],
    sr: BrickBounceSlotSave | 0 = 0,
    pe = 0,
    high = 0,
    un = 0,
    ib = 0,
    ce = 0,
    ul = 0,
    csp = 0,
    cpa = 0,
    cpb = 0,
    csn = 0,
    wm = 0,
    slots: Array<BrickBounceSlotSave | 0> = [0, 0, 0],
    sl = 0,
    st = 'title',
    ms = 0,
    mt: number | undefined,
    lt: number | undefined,
    tt: number | undefined,
    dtm: number | undefined,
    ft: number | undefined,
    cm = '',
    sc = 0,
    tp = 1,
    gm = 1,
    df = 1,
    ax = 42,
    ay = 236,
    au = 29,
    av = -19,
    ks = 0,
    kc = 0,
    kr = 0,
    ko = 0,
    kx = 0,
    t: BrickBounceSlotSave | number | Uint8Array | 0 = 0,
    db: BrickBounceSaveDb | 0 = 0,
    ua = 0;
  function tx(e: number): string {
    return Math.min(e, 999999).toString().padStart(6, '0');
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
  function md(
    r: BrickBounceScoreRow | BrickBounceSlotSave | 0,
  ): 'ARCADE' | 'CLASSIC' {
    return r && r.m ? 'ARCADE' : 'CLASSIC';
  }
  function di(
    r: BrickBounceScoreRow | BrickBounceSlotSave | 0,
  ): 'EASY' | 'NORMAL' | 'HARD' | 'INSANE' {
    return r && 0 === r.d
      ? 'EASY'
      : r && 2 === r.d
        ? 'HARD'
        : r && 3 === r.d
          ? 'INSANE'
          : 'NORMAL';
  }
  function rn(i: number): string {
    return RF + (i + 1) + '.DAT';
  }
  function cf(): object {
    return {
      ce: ce ? 1 : 0,
      ul: ul ? 1 : 0,
      csp: csp,
      cpa: cpa,
      cpb: cpb ? 1 : 0,
      csn: csn ? 1 : 0,
      bt: bt,
      ps: psp,
      u: un,
      ib: ib,
      bcl: bcl,
    };
  }
  function ns(): void {
    ((scores = (scores || []).filter(function (e: BrickBounceScoreRow) {
      return e && (e.s || 0) > 0;
    })),
      scores.sort(function (e: BrickBounceScoreRow, n: BrickBounceScoreRow) {
        return (n.s || 0) - (e.s || 0);
      }),
      (scores = scores.slice(0, 10)),
      (high = scores.length ? scores[0].s || 0 : 0));
  }
  function rv(): number {
    let v = 20;
    if (Pip.settings && typeof Pip.settings.volume === 'number')
      v = Pip.settings.volume;
    v = Math.round((v * 10) / 27) * 10;
    return v < 0 ? 0 : v > 100 ? 100 : v;
  }
  function ds(): BrickBounceSaveDb {
    if (!db) db = (eval(fs.readFileSync(DB)) as () => BrickBounceSaveDb)();
    return db;
  }
  function jw(f: string, s: PipValue): object {
    global.__bbSaveFile = f;
    global.__bbSaveData = s;
    eval(fs.readFileSync(DW));
    let ok = global.__bbSaveResult;
    delete global.__bbSaveFile;
    delete global.__bbSaveData;
    delete global.__bbSaveResult;
    return ok;
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
  function br(): void {
    try {
      let b = global.__bbBo;
      if (b) {
        b.v === void 0
          ? delete Pip.blitOptions.vsync
          : (Pip.blitOptions.vsync = b.v);
        b.i === void 0
          ? delete Pip.blitOptions.idleFilter
          : (Pip.blitOptions.idleFilter = b.i);
        b.n === void 0
          ? delete Pip.blitOptions.noScanEffect
          : (Pip.blitOptions.noScanEffect = b.n);
        global.__bbBo = 0;
      }
    } catch (e) {}
  }
  function ap(): void {
    try {
      let v = Math.round((vo * 27) / 100);
      if (v !== va) {
        Pip.setVol(v);
        va = v;
        global.__bbVol = v;
      }
    } catch (e) {}
  }
  function vv(p: number): void {
    try {
      va = Math.round((vo * p * 27) / 100);
      Pip.setVol(va);
      global.__bbVol = va;
    } catch (e) {}
  }
  function fv(to: number, cb: () => void): void {
    if (ft) clearInterval(ft);
    let n = 0,
      fr = to ? 0 : 1;
    ft = setInterval(function () {
      n++;
      vv(fr + ((to - fr) * n) / 10);
      if (n >= 10) {
        clearInterval(ft);
        ft = 0;
        if (cb) cb();
      }
    }, 80);
  }
  function ls(): void {
    let e = ds()(SF) || {},
      p = ds()(PF),
      t = 0;
    if (p) {
      for (let k in p) e[k] = p[k];
      if (jw(SF, e)) {
        if (fs.statSync(PF)) fs.unlink(PF);
        if (fs.statSync(PF + '.tmp')) fs.unlink(PF + '.tmp');
        if (fs.statSync(PF + '.bak')) fs.unlink(PF + '.bak');
      }
    }
    ((scores =
      e && e.scores
        ? e.scores
        : e && e.high
          ? [
              {
                n: '---',
                s: e.high,
              },
            ]
          : []),
      (so = !e || 0 !== e.sound ? 1 : 0),
      (mo = !e || 0 !== e.music ? 1 : 0),
      (vo = e && e.vol !== void 0 ? e.vol : 70),
      (dp = e && e.disp !== void 0 ? (e.disp !== 0 ? 1 : 0) : 0),
      (bt = e && e.bt !== void 0 ? e.bt : 1),
      (psp = (e && e.ps) || 0),
      (bcl =
        e && e.bcl !== void 0
          ? e.bcl
          : e && e.ce
            ? 6
            : e && e.bcu
              ? 1
              : e && e.u > 0
                ? 1
                : 0),
      (bcl = Math.max(0, Math.min(6, bcl))),
      (un = (e && e.u) || 0),
      (ib = (e && e.ib) || 0),
      (ce = (e && e.ce) || 0),
      (ul = (e && e.ul) || 0),
      (csp = (e && e.csp) || 0),
      (cpa = (e && e.cpa) || 0),
      (cpb = (e && e.cpb) || 0),
      (csn = (e && e.csn) || 0),
      ap(),
      (slots = [0, 0, 0]),
      (pe = 0),
      (sr = 0));
    for (let i = 0; i < 3; i++) {
      let slot = ds()(rn(i)) as BrickBounceSlotSave | 0;
      if (slot && slot.p && !pe) {
        pe = slot.p;
        sl = i;
      }
      if (slot && slot.s !== void 0) slots[i] = slot;
    }
    ((sr = slots[sl]), ns(), bf());
  }
  function sv(): void {
    ns();
    let k = ds()(SF) || {},
      n = {
        sound: so ? 1 : 0,
        music: mo ? 1 : 0,
        vol: vo,
        disp: dp ? 1 : 0,
        bt: bt,
        ps: psp,
        bcl: bcl,
        bcu: bcl > 0 ? 1 : 0,
        sh: k.sh || 0,
        shs: k.shs || 0,
        fh: k.fh || 0,
        rh: k.rh || 0,
        mpv: k.mpv === void 0 ? 70 : k.mpv,
        scores: scores,
        u: un,
        ib: ib,
        ce: ce ? 1 : 0,
        ul: ul ? 1 : 0,
        csp: csp,
        cpa: cpa,
        cpb: cpb ? 1 : 0,
        csn: csn ? 1 : 0,
      };
    jw(SF, n);
  }
  function sq(): boolean {
    return (
      sc > 0 &&
      (scores.length < 10 ||
        sc > ((scores[scores.length - 1] as BrickBounceScoreRow).s || 0))
    );
  }
  function cr(i?: number): void {
    if (i === void 0) i = sl;
    pe = 0;
    slots[i] = 0;
    if (i === sl) sr = 0;
    jw(rn(i), 0);
  }
  function ad(e: string, n: number): void {
    n <= 0 ||
      (cr(),
      scores.push({
        n: e,
        s: n,
      }),
      ns(),
      sv());
  }
  function sm(e: string): void {
    if ((mt && (clearTimeout(mt), (mt = void 0)), !mo)) {
      try {
        Pip.audioStop();
      } catch (x) {}
      cm = '';
      return;
    }
    cm !== e &&
      ((function () {
        try {
          Pip.audioStop();
        } catch (x) {}
        cm = e;
      })(),
      (mt = setTimeout(function () {
        if (((mt = void 0), mo && cm === e))
          try {
            (Pip.audioStop(),
              Pip.audioStart(e, {
                repeat: !0,
              }));
          } catch (e) {}
      }, 350)));
  }
  function us(e: string): void {
    if (!so) return;
    if (e === 'SCROLL' && mo && cm) return;
    try {
      let t = getTime(),
        d = e === 'SCROLL' ? 0.22 : 0.16;
      if (t < ua) return;
      ua = t + d;
      Pip.playSound(e);
    } catch (e) {}
  }
  function ol(e: string, x: number, y: number): void {
    h.setColor(0);
    for (let a = -1; a < 2; a++)
      for (let b = -1; b < 2; b++) if (a || b) h.drawString(e, x + a, y + b);
    h.setColor(3).drawString(e, x, y);
  }
  function cs(a: number[]): string {
    let s = '';
    for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return s;
  }
  function rp(): void {
    try {
      let e = E.openFile(TB, 'r'),
        t = new Uint8Array(h.buffer),
        n = IY * IB,
        l = IH * IB,
        o!: Uint8Array<ArrayBufferLike> | undefined,
        p = 0;
      for (; p < l;)
        if ((o = e.read(Math.min(512, l - p)) as Uint8Array | undefined))
          (t.set(o, n + p), (p += o.length));
        else break;
      e.close();
    } catch (e) {
      h.setColor(0).fillRect(122, 286, 358, 318);
    }
  }
  function pt(p: number): void {
    rp();
    if (p)
      (h.setFontMonofonto16().setFontAlign(0, 0),
        ol('- PRESS KNOB -', 240, 301));
    h.flip();
    Pip.lastFlip = getTime();
  }
  function dt(p: number): undefined {
    try {
      if (!global.__bbUi1)
        global.__bbUi1 = Function(
          "let e=E.openFile('HOLO/BRKBNCE/UI1.BIN','r'),n=38144,t=new Uint8Array(h.buffer),o=e.read(256);while(o){t.set(o,n);n-=256;o=e.read(256)}e.close();",
        );
      global.__bbUi1();
      if (p)
        (h.setFontMonofonto16().setFontAlign(0, 0),
          ol('- PRESS KNOB -', 240, 301));
      return (h.flip(), (Pip.lastFlip = getTime()), void 0);
    } catch (e) {}
    h.clear(1)
      .setColor(3)
      .setFontMonofonto28()
      .setFontAlign(0, 0)
      .drawString('BRICK BOUNCE', 240, 120)
      .setFontMonofonto16()
      .drawString(cs([98, 121, 32, 72, 116, 104, 101, 66]), 240, 152);
    if (p) ol('- PRESS KNOB -', 240, 301);
    h.flip();
  }
  function at(): void {
    if (tt) clearInterval(tt);
    if (dtm) clearTimeout(dtm);
    tp = 1;
    dt(0);
    pt(tp);
    tt = setInterval(function () {
      if ('title' !== st) return;
      tp = tp ? 0 : 1;
      pt(tp);
    }, 850);
    dtm = setTimeout(function () {
      if ('title' === st) od();
    }, 20000);
  }
  function ct(): void {
    if (tt) clearInterval(tt);
    if (dtm) clearTimeout(dtm);
    tt = dtm = 0;
    try {
      Pip.videoStop();
    } catch (e) {}
  }
  function sh(k?: boolean | number): void {
    ((st = 'title'), at());
    if (k && mo) cm = MU;
    else if (!k) sm(MU);
  }
  function mb(e: number, n: number, t: number, o: number, s: boolean): void {
    h.setColor(s ? 1 : 0)
      .fillRect(e, n, t, o)
      .setColor(3)
      .drawRect(e, n, t, o);
  }
  function ml(e: string | number, n: number, t: boolean): void {
    (mb(112, n - 10, 368, n + 10, t),
      h
        .setColor(3)
        .setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString(e, 240, n + 1));
  }
  function dm(e: string, n: string[], t: number): void {
    h.setFontMonofonto18().setFontAlign(0, 0).setColor(0);
    for (let x = -1; x < 2; x++)
      for (let y = -1; y < 2; y++)
        if (x || y) h.drawString(e, 240 + x, t - 28 + y);
    h.setColor(3).drawString(e, 240, t - 28);
    let g = n.length > 6 ? 21 : 23;
    for (let e = 0; e < n.length; e++) ml(n[e], t + g * e, e === ms);
  }
  function mi(): string[] {
    let a = ['START GAME', 'SETTINGS', 'HIGH SCORES', 'HELP', 'ABOUT'];
    if (bcl > 0) a.push('BONUS CONTENT');
    a.push('EXIT GAME');
    return a;
  }
  function bi(): string[] {
    let a: string[] = [];
    if (bcl >= 1) a.push('PONG');
    if (bcl >= 2) a.push('SNAKE');
    if (bcl >= 3) a.push('FLOATY BALL');
    if (bcl >= 4) a.push('BOUNCE RUN');
    if (bcl >= 5) a.push('MUSIC PLAYER');
    if (bcl >= 6) a.push('CUSTOM LEVELS');
    a.push('BACK');
    return a;
  }
  function si(): string[] {
    return [
      'SOUND: ' + (so ? 'ON' : 'OFF'),
      'MUSIC: ' + (mo ? 'ON' : 'OFF'),
      'VOLUME: ' + vo + '%',
      'DISPLAY: ' + (dp ? 'CLEAN' : 'CRT'),
      'BONUS TOAST: ' + (bt === 2 ? 'RANDOM ONLY' : bt ? 'ON' : 'OFF'),
      'PADDLE SPEED: ' + (psp === 1 ? 'SLOW' : psp === 2 ? 'FAST' : 'NORMAL'),
      'BACK',
    ];
  }
  function dM(e?: number): void {
    (e || dt(0),
      dm('MAIN MENU', mi(), 174),
      h.flip(),
      (Pip.lastFlip = getTime()));
  }
  function dT(e?: number): void {
    (e || dt(0),
      dm('SETTINGS', si(), 166),
      h.flip(),
      (Pip.lastFlip = getTime()));
  }
  function dB(e?: number): void {
    let a = bi();
    (e || dt(0),
      dm('BONUS CONTENT', a, Math.max(154, 278 - a.length * 15)),
      h.flip(),
      (Pip.lastFlip = getTime()));
  }
  function dP(e?: number): void {
    (e || dt(0),
      dm('PONG', ['1 PLAYER', '2 PLAYERS', 'BACK'], 230),
      h.flip(),
      (Pip.lastFlip = getTime()));
  }
  function dZ(e?: number): void {
    (e || dt(0),
      dm('PONG DIFFICULTY', ['EASY', 'NORMAL', 'HARD', 'BACK'], 206),
      h.flip(),
      (Pip.lastFlip = getTime()));
  }
  function th(r: BrickBounceSlotSave | 0, x: number, y: number): void {
    let b = r && r.b;
    if (!b) return;
    h.setColor(3);
    for (let i = 0; i < 45 && i < b.length; i++) {
      let c = b[i];
      if (!c || c === '0') continue;
      let px = x + (i % 9) * 11,
        py = y + ((i / 9) | 0) * 7;
      c === '9'
        ? h.drawRect(px, py, px + 8, py + 5)
        : h.fillRect(px, py, px + 8, py + 5);
    }
    h.fillRect(x + 32, y + 47, x + 64, y + 49).fillCircle(x + 48, y + 40, 3);
  }
  function card(i: number, y: number, on: boolean): void {
    let r = slots[i];
    mb(38, y, 442, y + 66, on);
    h.setColor(3).setFontMonofonto14();
    h.setFontAlign(-1, 0).drawString('SLOT ' + (i + 1), 54, y + 15);
    if (!r) {
      h.setFontAlign(0, 0)
        .setFontMonofonto18()
        .drawString('EMPTY', 240, y + 41);
      return;
    }
    h.drawLine(318, y, 318, y + 66);
    if (r.x) h.setFontAlign(-1, 0).drawString('CHEATS USED', 220, y + 15);
    h.setFontAlign(-1, 0)
      .drawString('LVL ' + (r.l || 1), 54, y + 33)
      .drawString(di(r), 126, y + 33)
      .drawString(md(r), 220, y + 33)
      .drawString('LIVES ' + (r.v || 0), 54, y + 51)
      .drawString('CONTINUES ' + (r.c || 0), 126, y + 51)
      .drawString('SCORE ' + tx(r.s || 0), 220, y + 51);
    th(r, 332, y + 9);
  }
  function dS(e?: number): void {
    e || dt(0);
    h.setFontMonofonto18().setFontAlign(0, 0);
    ol('SELECT PROFILE', 240, 28);
    for (let i = 0; i < 3; i++) card(i, 54 + i * 78, i === ms);
    ml('BACK', 302, ms === 3);
    (h.flip(), (Pip.lastFlip = getTime()));
  }
  function dQ(e?: number): void {
    sr = slots[sl];
    (e || dt(0),
      dm(
        'SLOT ' + (sl + 1),
        sr ? ['CONTINUE', 'NEW GAME', 'DELETE', 'BACK'] : ['NEW GAME', 'BACK'],
        sr ? 206 : 230,
      ),
      h.flip(),
      (Pip.lastFlip = getTime()));
  }
  function dG(e?: number): void {
    (e || dt(0),
      dm('GAME MODE', ['ARCADE', 'CLASSIC', 'BACK'], 230),
      h.flip(),
      (Pip.lastFlip = getTime()));
  }
  function dl(): string[] {
    let a = ['EASY', 'NORMAL'];
    if (un > 0) a.push('HARD');
    if (un > 1) a.push('INSANE');
    return a;
  }
  function dc(i: number): 0 | 1 | 2 | 3 {
    return i === 0 ? 0 : i === 2 ? 2 : i === 3 ? 3 : 1;
  }
  function dD(e?: number): void {
    let a = dl();
    a.push('BACK');
    (e || dt(0),
      dm('DIFFICULTY', a, 206),
      h.flip(),
      (Pip.lastFlip = getTime()));
  }
  function dW(e?: number): void {
    (e || dt(0),
      dm(
        (wm ? 'OVERWRITE ' : 'DELETE ') + 'SLOT ' + (sl + 1) + '?',
        ['NO', 'YES'],
        242,
      ),
      h.flip(),
      (Pip.lastFlip = getTime()));
  }
  function dSc(): void {
    h.clear(1)
      .setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, 0)
      .drawString('HIGH SCORES', 240, 30)
      .setFontMonofonto14();
    h.setFontAlign(-1, 0)
      .drawString('#', 34, 66)
      .drawString('NAME', 58, 66)
      .drawString('MODE', 112, 66)
      .drawString('DIFF', 198, 66)
      .drawString('LEVEL', 300, 66);
    h.setFontAlign(1, 0)
      .drawString('SCORE', 448, 66)
      .drawLine(32, 74, 448, 74)
      .setFontMonofonto16();
    for (let e = 0; e < 10; e++) {
      let n = scores[e] || {
          n: '---',
          s: 0,
        },
        t = 88 + 20 * e;
      let l = 'LVL ' + ((n && n.l) || 1);
      h.setFontAlign(-1, 0)
        .drawString(e + 1 + '.', 34, t)
        .drawString(n.n || '---', 58, t)
        .drawString(md(n), 112, t)
        .drawString(di(n), 198, t)
        .drawString(l, 300, t);
      if (n && n.w) sx(300 + h.stringWidth(l) + 10, t);
      h.setFontAlign(1, 0).drawString(tx(n.s || 0), 448, t);
    }
    (h.flip(), (Pip.lastFlip = getTime()));
  }
  function dSm(e?: number): void {
    (e || dt(0),
      dm('HIGH SCORES', ['LOCAL', 'ONLINE', 'BACK'], 230),
      h.flip(),
      (Pip.lastFlip = getTime()));
  }
  function dO(): void {
    try {
      let f = E.openFile(ON, 'r'),
        a = new Uint8Array(h.buffer),
        p = 0,
        b!: Uint8Array<ArrayBufferLike> | undefined;
      while ((b = f.read(256) as Uint8Array | undefined))
        (a.set(b, p), (p += b.length));
      f.close();
    } catch (e) {
      h.clear(1)
        .setColor(3)
        .setFontMonofonto18()
        .setFontAlign(0, 0)
        .drawString('ONLINE HIGH SCORES', 240, 96)
        .setFontMonofonto14()
        .drawString('brickbounce.htheb.com', 240, 148)
        .drawString('PRESS KNOB: BACK', 240, 286);
    }
    (h.flip(), (Pip.lastFlip = getTime()));
  }
  function dR(): void {
    (h
      .clear(1)
      .setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, 0)
      .drawString('RESET SCORES?', 240, 96),
      dm('ARE YOU SURE', ['YES', 'NO'], 160),
      h.flip(),
      (Pip.lastFlip = getTime()));
  }
  function dA(): void {
    (h
      .clear(1)
      .setColor(3)
      .fillCircle(ax | 0, ay | 0, 8)
      .setFontMonofonto23()
      .setFontAlign(0, 0)
      .drawString('ABOUT', 240, 34)
      .setFontMonofonto28()
      .drawString('BRICK BOUNCE', 240, 82)
      .setFontMonofonto18()
      .drawString('v1.0.0', 240, 116)
      .setFontMonofonto14()
      .drawString('GAME DESIGNED AND MADE BY', 240, 158)
      .setFontMonofonto18()
      .drawString(cs([72, 116, 104, 101, 66]), 240, 184)
      .setFontMonofonto14()
      .drawString(
        cs([40, 67, 41, 32, 50, 48, 50, 54, 32, 72, 116, 104, 101, 66]),
        240,
        252,
      )
      .drawString('PRESS KNOB FOR MENU', 240, 296),
      h.flip(),
      (Pip.lastFlip = getTime()));
  }
  function aA(): void {
    ((ax += au), (ay += av));
    if (ax < 8 || ax > 472) ((au = -au), (ax += au * 2));
    if (ay < 8 || ay > 312) ((av = -av), (ay += av * 2));
    dA();
  }
  function hv(): void {
    Pip.lastFlip = getTime() + 1;
  }
  function vA(): void {
    try {
      h.clear(0).flip();
      hv();
      tt = setInterval(function () {
        'about' === st && hv();
      }, 100);
      Pip.videoStart(dp ? VA : VC, {
        x: 0,
        y: 0,
        repeat: !0,
      });
    } catch (e) {
      (dA(),
        (tt = setInterval(function () {
          'about' === st && aA();
        }, 60)));
    }
  }
  function kq(d: number): void {
    if ('about' !== st || kx) return;
    let t = getTime(),
      q = [-1, -1, 1, 1, -2, 2, -2, 2];
    if (d === ks && t - kr < 0.55) return;
    kr = t;
    if (d === q[kc]) {
      kc++;
      ks = d;
      ko = kc >= q.length ? 1 : 0;
      return;
    }
    kc = d === q[0] ? 1 : 0;
    ks = kc ? d : 0;
    ko = 0;
  }
  function dii(f: string): void {
    try {
      if (!global.__bbUi2)
        global.__bbUi2 = Function(
          "let e=E.openFile('HOLO/BRKBNCE/UI2.BIN','r'),n=38144,t=new Uint8Array(h.buffer),o=e.read(256);while(o){t.set(o,n);n-=256;o=e.read(256)}e.close();h.flip();Pip.lastFlip=getTime();",
        );
      global.__bbUi2();
    } catch (e) {
      dA();
    }
  }
  function ek(): void {
    if (kx) return;
    ((kx = 1),
      tt && clearInterval(tt),
      (tt = 0),
      dtm && clearTimeout(dtm),
      (dtm = 0),
      mt && (clearTimeout(mt), (mt = void 0)));
    if (un < 2) {
      un = 2;
    }
    bcl = 6;
    ce = 1;
    sv();
    try {
      Pip.videoStop();
    } catch (e) {}
    fv(0, function () {
      (h.clear(0).flip(),
        (Pip.lastFlip = getTime()),
        (dtm = setTimeout(function () {
          (dii(KI),
            (dtm = setTimeout(function () {
              (h.clear(0).flip(),
                (Pip.lastFlip = getTime()),
                (dtm = setTimeout(function () {
                  fv(1, function () {
                    ((kx = 0), oA());
                  });
                }, 300)));
            }, 4000)));
        }, 300)));
    });
  }
  function oM(): void {
    (ct(), (st = 'main'), (ms = 0), sm(MU), dM());
  }
  function oT(): void {
    ((st = 'settings'), (ms = 0), sm(MU), dT());
  }
  function oB(): void {
    ((st = 'bonus'), (ms = 0), sm(MU), dB());
  }
  function oP(): void {
    ((st = 'pong'), (ms = 0), sm(MU), dP());
  }
  function oZ(): void {
    ((st = 'pongdiff'), (ms = 0), sm(MU), dZ());
  }
  function oS(): void {
    (ls(), (st = 'slots'), (ms = sl), sm(MU), dS());
  }
  function oQ(): void {
    ((sr = slots[sl]), (st = 'slot'), (ms = 0), sm(MU), dQ());
  }
  function oG(): void {
    ((st = 'mode'), (ms = 0), sm(MU), dG());
  }
  function oD(): void {
    ((st = 'diff'), (ms = 0), sm(MU), dD());
  }
  function oW(w: number): void {
    ((wm = w ? 1 : 0), (st = 'warn'), (ms = 0), sm(MU), dW());
  }
  function oSc(): void {
    (ls(), (st = 'scores'), (ms = 0), sm(MU), dSc());
  }
  function oSm(): void {
    ((st = 'scoremenu'), (ms = 0), sm(MU), dSm());
  }
  function oO(): void {
    ((st = 'online'), (ms = 0), sm(MU), dO());
  }
  function oH(): void {
    cu(1);
    scores = [];
    sr = 0;
    E.defrag();
    if (!global.__bbLoadHelp)
      global.__bbLoadHelp = Function(
        'E.defrag();Pip.CURRENT=eval(fs.readFileSync("HOLO/BRKBNCE/HELP.JS"))();',
      );
    lt = setTimeout(global.__bbLoadHelp, 20);
  }
  function oR(): void {
    ((st = 'reset'), (ms = 1), sm(MU), dR());
  }
  function oA(): void {
    (ct(),
      (st = 'about'),
      (ms = 0),
      (ax = 42),
      (ay = 236),
      (au = 29),
      (av = -19),
      (ks = kc = kr = ko = kx = 0),
      sm(MU),
      vA());
  }
  function od(): void {
    ct();
    mt && clearTimeout(mt);
    lt && clearTimeout(lt);
    mt = lt = 0;
    Pip.removeListener('knob1', k1);
    Pip.removeListener('knob2', k2);
    scores = [];
    sr = 0;
    global.__bbDemoHigh = high;
    global.__bbDemoDisp = dp ? 1 : 0;
    E.defrag();
    global.__bbLoadDemo = Function(
      'let hi=global.__bbDemoHigh||0,di=global.__bbDemoDisp!==0;global.__bbDemoHigh=0;global.__bbDemoDisp=1;Pip.CURRENT=0;E.defrag();Pip.CURRENT=eval(fs.readFileSync("HOLO/BRKBNCE/DEMO.JS"))({high:hi,disp:di?1:0});',
    );
    lt = setTimeout(global.__bbLoadDemo, 20);
  }
  function oN(e?: number): HolotapeApp {
    (cu(), Pip.remove(), E.defrag());
    return (
      eval(fs.readFileSync('HOLO/BRKBNCE/NAME.JS')) as BrickBounceFactory
    )({
      score: e || 0,
      sound: so ? 1 : 0,
      music: mo ? 1 : 0,
      vol: vo,
      disp: dp ? 1 : 0,
      slot: sl,
    });
  }
  function tS(): void {
    ((so = so ? 0 : 1), sv(), rd());
  }
  function tM(): void {
    ((mo = mo ? 0 : 1), sv(), sm('name' === st ? OM : MU), rd());
  }
  function tV(): void {
    vo += 10;
    if (vo > 100) vo = 0;
    ap();
    us('TAB');
    sv();
    rd();
  }
  function tD(): void {
    dp = dp ? 0 : 1;
    bf();
    sv();
    rd();
  }
  function tB(): void {
    bt = (bt + 1) % 3;
    sv();
    rd();
  }
  function tP(): void {
    psp = (psp + 1) % 3;
    sv();
    rd();
  }
  function rd(): void {
    'main' === st
      ? dM(1)
      : 'settings' === st
        ? dT(1)
        : 'bonus' === st
          ? dB(1)
          : 'pong' === st
            ? dP(1)
            : 'pongdiff' === st
              ? dZ(1)
              : 'slots' === st
                ? dS(1)
                : 'slot' === st
                  ? dQ(1)
                  : 'mode' === st
                    ? dG(1)
                    : 'diff' === st
                      ? dD(1)
                      : 'warn' === st
                        ? dW(1)
                        : 'scoremenu' === st
                          ? dSm(1)
                          : 'scores' === st
                            ? dSc()
                            : 'about' === st || 'online' === st
                              ? 0
                              : dR();
  }
  function mL(): number {
    return 'main' === st
      ? mi().length
      : 'settings' === st
        ? si().length
        : 'bonus' === st
          ? bi().length
          : 'pong' === st
            ? 3
            : 'pongdiff' === st
              ? 4
              : 'slots' === st
                ? 4
                : 'slot' === st
                  ? sr
                    ? 4
                    : 2
                  : 'diff' === st
                    ? dl().length + 1
                    : 'warn' === st || 'reset' === st
                      ? 2
                      : 'mode' === st || 'scoremenu' === st
                        ? 3
                        : 1;
  }
  function mM(e: number): void {
    let n = mL(),
      o = ms;
    ms = Math.max(0, Math.min(n - 1, ms + e));
    if (ms !== o) (us('SCROLL'), rd());
  }
  function cu(k?: number): void {
    (mt && clearTimeout(mt),
      lt && clearTimeout(lt),
      tt && clearInterval(tt),
      dtm && clearTimeout(dtm),
      ft && clearInterval(ft),
      (tt = dtm = ft = 0));
    try {
      Pip.videoStop();
    } catch (e) {}
    (ap(),
      sv(),
      global.__bbLaunch && (global.__bbLaunch.cfg = cf()),
      (db = 0),
      Pip.removeListener('knob1', k1),
      Pip.removeListener('knob2', k2));
    if (!k) br();
    if (!k)
      try {
        Pip.audioStop();
      } catch (e) {}
  }
  function ex(): void {
    if (st === 'exit') return;
    st = 'exit';
    cu();
    try {
      if (Pip.CURRENT) Pip.CURRENT.fullscreen = !1;
    } catch (e) {}
    try {
      (h.clear(1).flip(), (Pip.lastFlip = getTime()));
    } catch (e) {}
    try {
      if (Pip.setWatches) Pip.setWatches();
    } catch (e) {}
    E.defrag();
    lt = setTimeout(function () {
      try {
        if (Pip.emit)
          Pip.emit('mode', typeof Pip.MODE === 'number' ? Pip.MODE : 1, !0);
        else if (Pip.changeMenu) Pip.changeMenu();
      } catch (e) {
        try {
          Pip.changeMenu && Pip.changeMenu();
        } catch (x) {}
      }
    }, 30);
  }
  function lg(resume: number): void {
    mt && (clearTimeout(mt), (mt = void 0));
    try {
      Pip.audioStop();
    } catch (e) {}
    ((cm = ''),
      resume || (sr = 0),
      (global.__bbLaunch = {
        resume: resume ? 1 : 0,
        sound: so ? 1 : 0,
        music: mo ? 1 : 0,
        vol: vo,
        disp: dp ? 1 : 0,
        ps: psp,
        save: sr || 0,
        high: high,
        mode: resume && sr ? (sr.m ? 1 : 0) : gm,
        diff: resume && sr && sr.d !== void 0 ? sr.d : df,
        slot: sl,
        cfg: cf(),
      }),
      (scores = []),
      (sr = 0),
      h
        .clear(1)
        .setColor(3)
        .setFontMonofonto18()
        .setFontAlign(0, 0)
        .drawString('LOADING...', 240, 160)
        .flip(),
      (Pip.lastFlip = getTime()));
    if (!global.__bbLoadStart)
      global.__bbLoadStart = Function(
        'try{Pip.audioStop()}catch (e){}Pip.remove();Pip.CURRENT=0;E.defrag();Pip.CURRENT=eval(fs.readFileSync("HOLO/BRKBNCE/START.JS"))();',
      );
    lt = setTimeout(global.__bbLoadStart, 20);
  }
  function gp(p: number, d: number): void {
    mt && (clearTimeout(mt), (mt = void 0));
    try {
      Pip.audioStop();
    } catch (e) {}
    ((cm = ''),
      (global.__bbPong = {
        players: p,
        diff: d,
        sound: so ? 1 : 0,
        music: mo ? 1 : 0,
        vol: vo,
        disp: dp ? 1 : 0,
      }),
      (scores = []),
      (sr = 0),
      h
        .clear(1)
        .setColor(3)
        .setFontMonofonto18()
        .setFontAlign(0, 0)
        .drawString('LOADING...', 240, 160)
        .flip(),
      (Pip.lastFlip = getTime()));
    if (!global.__bbLoadPong)
      global.__bbLoadPong = Function(
        'let p=global.__bbPong;global.__bbPong=0;try{Pip.audioStop()}catch (e){}Pip.remove();Pip.CURRENT=0;E.defrag();Pip.CURRENT=eval(fs.readFileSync("HOLO/BRKBNCE/PONG.JS"))(p);',
      );
    lt = setTimeout(global.__bbLoadPong, 20);
  }
  function gX(f: string): void {
    mt && (clearTimeout(mt), (mt = void 0));
    try {
      Pip.audioStop();
    } catch (e) {}
    ((cm = ''),
      (global.__bbMini = {
        f: f,
        sound: so ? 1 : 0,
        music: mo ? 1 : 0,
        vol: vo,
        disp: dp ? 1 : 0,
        ps: psp,
      }),
      (scores = []),
      (sr = 0),
      h
        .clear(1)
        .setColor(3)
        .setFontMonofonto18()
        .setFontAlign(0, 0)
        .drawString('LOADING...', 240, 160)
        .flip(),
      (Pip.lastFlip = getTime()));
    global.__bbLoadMini = 0;
    global.__bbMiniPhase2 = Function(
      'let p=global.__bbMini;global.__bbMini=0;delete global.__bbMiniPhase1;delete global.__bbMiniPhase2;try{Pip.audioStop()}catch (e){}Pip.CURRENT=0;E.defrag();Pip.CURRENT=eval(fs.readFileSync("HOLO/BRKBNCE/"+p.f))(p);',
    );
    global.__bbMiniPhase1 = Function(
      'let c=Pip.CURRENT;try{c&&c.remove&&c.remove()}catch (e){}Pip.CURRENT=0;E.defrag();setTimeout(global.__bbMiniPhase2,80);',
    );
    lt = setTimeout(global.__bbMiniPhase1, 20);
  }
  function bp(): void {
    oQ();
  }
  function ch(): void {
    if (!('settings' === st && (1 === ms || 2 === ms))) us('TAB');
    if ('main' === st)
      return 0 === ms
        ? oS()
        : 1 === ms
          ? oT()
          : 2 === ms
            ? oSm()
            : 3 === ms
              ? oH()
              : 4 === ms
                ? oA()
                : bcl > 0
                  ? 5 === ms
                    ? oB()
                    : ex()
                  : ex();
    if ('settings' === st) {
      let n = si().length - 1;
      return ms === 0
        ? tS()
        : ms === 1
          ? tM()
          : ms === 2
            ? tV()
            : ms === 3
              ? tD()
              : ms === 4
                ? tB()
                : ms === 5
                  ? tP()
                  : ms === n
                    ? oM()
                    : oM();
    }
    if ('bonus' === st) {
      let a = bi()[ms];
      return a === 'PONG'
        ? oP()
        : a === 'SNAKE'
          ? gX('SNAKE.JS')
          : a === 'FLOATY BALL'
            ? gX('FLOATY.JS')
            : a === 'BOUNCE RUN'
              ? gX('RUN.JS')
              : a === 'MUSIC PLAYER'
                ? gX('MUSIC.JS')
                : a === 'CUSTOM LEVELS'
                  ? gX('CUSTOM.JS')
                  : oM();
    }
    if ('scoremenu' === st) return ms === 0 ? oSc() : ms === 1 ? oO() : oM();
    if ('online' === st) return oM();
    if ('pong' === st) return ms === 0 ? oZ() : ms === 1 ? gp(2, 1) : oB();
    if ('pongdiff' === st) return ms === 3 ? oP() : gp(1, ms);
    if ('slots' === st) return 3 === ms ? oM() : ((sl = ms), oQ());
    if ('slot' === st)
      return sr
        ? 0 === ms
          ? lg(1)
          : 1 === ms
            ? oW(1)
            : 2 === ms
              ? oW(0)
              : oS()
        : 0 === ms
          ? oG()
          : oS();
    if ('warn' === st) return 0 === ms ? oQ() : (cr(sl), wm ? oG() : oS());
    if ('mode' === st) return 2 === ms ? bp() : ((gm = ms ? 0 : 1), oD());
    if ('diff' === st) {
      let n = dl().length;
      return ms === n ? oG() : ((df = dc(ms)), lg(0));
    }
    return 'scores' === st
      ? oM()
      : 'about' === st
        ? oM()
        : 'reset' === st
          ? (0 === ms && ((scores = []), sv()), oSc())
          : void 0;
  }
  function k1(e: KnobDirection, n: boolean | undefined): void {
    if (kx) return;
    if ('online' === st) return oM();
    return n
      ? ('about' === st
          ? ko
            ? ek()
            : (ks = kc = kr = ko = 0)
          : 'scores' === st
            ? oR()
            : 'title' === st && ex(),
        void 0)
      : 'title' === st
        ? (e || oM(), void 0)
        : (e
            ? ('about' === st && kq(e > 0 ? 1 : -1), mM(e))
            : 'about' === st
              ? ko
                ? ek()
                : oM()
              : ch(),
          void 0);
  }
  function k2(e: KnobDirection): void {
    if (kx) return;
    if ('online' === st) return oM();
    if (e)
      return (
        'about' === st && kq(e > 0 ? 2 : -2),
        'title' !== st && 'scores' !== st && mM(e),
        void 0
      );
  }
  ls();
  if (pe) return oN(pe);
  if (params && 'name' === params.view) return oN(params.score);
  if (params && params.keepMusic && mo) cm = MU;
  params && 'scores' === params.view
    ? oSc()
    : params && 'main' === params.view
      ? oM()
      : sh(params && params.keepMusic);
  Pip.onExclusive('knob1', k1);
  Pip.onExclusive('knob2', k2);
  return {
    id: 'BRKBNCE',
    notDefault: !0,
    fullscreen: !0,
    remove: function () {
      cu();
    },
  };
});
