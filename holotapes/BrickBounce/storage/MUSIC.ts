(function (params?: BrickBounceParams | 0): HolotapeApp {
  h.clear(1);
  const DIR = 'HOLO/BRKBNCE/',
    SF = 'SETTINGS/BRKBNCE.DAT',
    DB = DIR + 'SAVE.JS';
  let sel = 0,
    track = -1,
    paused = 0,
    vol = 70,
    master = params && params.vol !== void 0 ? params.vol : 70,
    mt = 0,
    db: BrickBounceSaveDb | 0 = 0;
  function cl(n: number, a: number, b: number): number {
    return Math.max(a, Math.min(b, n));
  }
  function ds(): BrickBounceSaveDb {
    if (!db) db = (eval(fs.readFileSync(DB)) as () => BrickBounceSaveDb)();
    return db;
  }
  function av(n: number): void {
    try {
      let v = Math.round((n * 27) / 100);
      Pip.setVol(v);
      global.__bbVol = v;
    } catch (e) {}
  }
  function sv(): void {
    let s: BrickBounceSettings = (ds()(SF) as BrickBounceSettings) || {};
    s.mpv = vol;
    ds()(SF, s);
  }
  function list(): string[] {
    return [
      'INTRO',
      'TRACK 1',
      'TRACK 2',
      'TRACK 3',
      'TRACK 4',
      'VOLUME: ' + vol + '%',
      'BACK',
    ];
  }
  function box(t: string, y: number, on: boolean): void {
    h.setColor(on ? 1 : 0)
      .fillRect(106, y - 11, 374, y + 11)
      .setColor(3)
      .drawRect(106, y - 11, 374, y + 11)
      .setFontMonofonto16()
      .setFontAlign(0, 0)
      .drawString(t, 240, y + 1);
  }
  function icon(y: number): void {
    let x = 132;
    h.setColor(sel === track ? 0 : 3);
    if (paused) h.fillPoly([x - 4, y - 6, x + 7, y, x - 4, y + 6]);
    else
      h.fillRect(x - 5, y - 6, x - 2, y + 6).fillRect(
        x + 2,
        y - 6,
        x + 5,
        y + 6,
      );
  }
  function dr(): void {
    let a = list();
    h.clear(1)
      .setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, 0)
      .drawString('MUSIC PLAYER', 240, 54);
    for (let i = 0; i < a.length; i++) box(a[i], 100 + i * 32, sel === i);
    if (track >= 0) icon(100 + track * 32);
    h.flip();
    Pip.lastFlip = getTime();
  }
  function play(n: number): void {
    try {
      Pip.audioStop();
      track = n;
      paused = 0;
      av(vol);
      Pip.audioStart(DIR + (n ? 'MUS' + n + '.WAV' : 'INTRO.WAV'), {
        repeat: !0,
      });
    } catch (e) {}
    dr();
  }
  function leave(): void {
    rm();
    sv();
    av(master);
    h.clear(1)
      .setColor(3)
      .setFontMonofonto18()
      .setFontAlign(0, 0)
      .drawString('LOADING...', 240, 160)
      .flip();
    Pip.lastFlip = getTime();
    E.defrag();
    if (!global.__bbMusicBack)
      global.__bbMusicBack = Function(
        'delete global.__bbMusicBack;Pip.CURRENT=0;E.defrag();Pip.CURRENT=eval(fs.readFileSync("HOLO/BRKBNCE/APP.JS"))();',
      );
    mt = setTimeout(global.__bbMusicBack, 20);
  }
  function press(): void {
    if (sel < 5) {
      if (track === sel) {
        if (paused) play(sel);
        else (Pip.audioStop(), (paused = 1), dr());
      } else play(sel);
      return;
    }
    if (sel === 5) {
      vol = (vol + 10) % 110;
      av(vol);
      sv();
      dr();
      return;
    }
    leave();
  }
  function move(d: number): void {
    let o = sel;
    sel = cl(sel + d, 0, 6);
    if (sel !== o) dr();
  }
  function k1(d: KnobDirection): void {
    if (d) move(d);
    else press();
  }
  function k2(d: KnobDirection): void {
    if (d) move(d);
  }
  function rm(): void {
    if (mt) clearTimeout(mt);
    mt = 0;
    Pip.removeListener('knob1', k1);
    Pip.removeListener('knob2', k2);
    try {
      Pip.audioStop();
    } catch (e) {}
    db = 0;
  }
  let s = ds()(SF);
  vol = s && s.mpv !== void 0 ? s.mpv : 70;
  master = s && s.vol !== void 0 ? s.vol : master;
  av(vol);
  dr();
  Pip.onExclusive('knob1', k1);
  Pip.onExclusive('knob2', k2);
  return { id: 'BBMUSIC', notDefault: !0, fullscreen: !0, remove: rm };
});
