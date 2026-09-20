(function (p?: BrickBounceParams | 0): HolotapeApp {
  const MAIN = 'HOLO/BRKBNCE/APP.JS',
    KEY = 'BB-PIP-2|BRICK-BOUNCE|HTHEB',
    BASE = 'https://brickbounce.htheb.com/highscores/pipboy-3000/submit/#';
  let dead = 0,
    to = 0;
  let payload: BrickBounceParams = (p ||
    global.__bbUpload ||
    {}) as BrickBounceParams;
  delete global.__bbUpload;
  p = payload;

  function snd(s: PipSoundName): void {
    if (payload.sound !== 0)
      try {
        Pip.playSound(s);
      } catch (e) {}
  }
  function u32(a: Uint8Array<ArrayBuffer>, n: number): number {
    return (
      (a[n] * 16777216 + (a[n + 1] << 16) + (a[n + 2] << 8) + a[n + 3]) >>> 0
    );
  }
  function put32(a: Uint8Array<ArrayBuffer>, n: number, v: number): void {
    a[n] = (v / 16777216) & 255;
    a[n + 1] = (v >> 16) & 255;
    a[n + 2] = (v >> 8) & 255;
    a[n + 3] = v & 255;
  }
  function raw(a: Uint8Array<ArrayBuffer>, n: number): string {
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(a[i]);
    return s;
  }
  function crypt(a: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
    let id = u32(a, 0).toString(16),
      seed = E.CRC32(KEY + '|' + id) | 0;
    for (let i = 4; i < a.length; i++) {
      seed = (seed * 1664525 + 1013904223) | 0;
      a[i] ^= seed >>> 24;
    }
    return a;
  }
  function token(): string {
    let a = new Uint8Array(27),
      serial = (process.env && process.env.SERIAL) || 'PIPBOY',
      id = E.CRC32(serial + '|BB-PIP-2') >>> 0,
      score = Math.max(0, Math.min(16777215, (payload.s || 0) | 0)),
      name = (payload.n || '').substr(0, 6),
      flags =
        (payload.m ? 1 : 0) |
        (((payload.d || 0) & 3) << 1) |
        (payload.w ? 8 : 0),
      nonce = E.CRC32(serial + '|' + getTime() + '|' + Math.random()) >>> 0;
    while (name.length < 6) name += ' ';
    put32(a, 0, id);
    a[4] = score >> 16;
    a[5] = score >> 8;
    a[6] = score;
    a[7] = Math.max(1, Math.min(50, (payload.l || 0) | 0));
    a[8] = flags;
    for (let i = 0; i < 6; i++) a[9 + i] = name.charCodeAt(i);
    put32(a, 15, nonce);
    put32(a, 19, E.CRC32(KEY + 'A' + raw(a, 19)) >>> 0);
    put32(a, 23, E.CRC32(KEY + 'B' + raw(a, 23)) >>> 0);
    return (
      'p2.' +
      btoa(raw(crypt(a), a.length))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
    );
  }
  function u8(a: Uint8Array | 0): Uint8Array {
    return a as Uint8Array;
  }
  function mul(x: number, y: number): number {
    let z = 0;
    for (let i = 7; i >= 0; i--)
      z = (((z << 1) ^ ((z >>> 7) * 285)) & 255) ^ (((y >>> i) & 1) * x);
    return z;
  }
  let qm: Uint8Array | 0 = 0,
    qrsv: Uint8Array | 0 = 0;
  function qbit(a: Uint8Array | 0, n: number): number {
    return (u8(a)[n >> 3] >> (7 - (n & 7))) & 1;
  }
  function qset(x: number, y: number, v: boolean | number): void {
    if (x >= 0 && y >= 0 && x < 37 && y < 37) {
      let n = y * 37 + x,
        i = n >> 3,
        b = 128 >> (n & 7);
      u8(qrsv)[i] |= b;
      if (v) u8(qm)[i] |= b;
      else u8(qm)[i] &= ~b;
    }
  }
  function qfinder(x: number, y: number): void {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        let d = Math.max(Math.abs(dx), Math.abs(dy));
        qset(x + dx, y + dy, d !== 2 && d !== 4);
      }
  }
  let qd: Uint8Array | 0 = 0,
    qg: Uint8Array | 0 = 0,
    qrem: Uint8Array | 0 = 0,
    qindex = 0,
    qrow = 0,
    qit = 0;
  function qclear(): void {
    if (qit) clearInterval(qit);
    qit = 0;
    qd = qg = qrem = qm = qrsv = 0;
    qindex = qrow = 0;
    delete global.__bbQrChunk;
    delete global.__bbQrPaint;
  }
  function qstart(text: string): 0 | 1 {
    const cap = 108,
      all = 134,
      ecc = 26;
    if (text.length > 106) return 0;
    let data = new Uint8Array(all),
      bits = 0;
    for (let v = 4, i = 3; i >= 0; i--, bits++)
      data[bits >> 3] |= ((v >>> i) & 1) << (7 - (bits & 7));
    for (let v = text.length, i = 7; i >= 0; i--, bits++)
      data[bits >> 3] |= ((v >>> i) & 1) << (7 - (bits & 7));
    for (let t = 0; t < text.length; t++)
      for (let v = text.charCodeAt(t), i = 7; i >= 0; i--, bits++)
        data[bits >> 3] |= ((v >>> i) & 1) << (7 - (bits & 7));
    bits += Math.min(4, cap * 8 - bits);
    while (bits & 7) bits++;
    for (let v = 236; bits < cap * 8; v = v === 236 ? 17 : 236)
      for (let i = 7; i >= 0; i--, bits++)
        data[bits >> 3] |= ((v >>> i) & 1) << (7 - (bits & 7));
    let g = new Uint8Array(ecc),
      r = 1;
    g[ecc - 1] = 1;
    for (let i = 0; i < ecc; i++) {
      for (let j = 0; j < ecc; j++) {
        g[j] = mul(g[j], r);
        if (j + 1 < ecc) g[j] ^= g[j + 1];
      }
      r = mul(r, 2);
    }
    qd = data;
    qg = g;
    qrem = new Uint8Array(ecc);
    qindex = 0;
    return 1;
  }
  function qchunk(): void {
    if (dead) return;
    try {
      let end = Math.min(qindex + 27, 108);
      for (; qindex < end; qindex++) {
        let f = u8(qd)[qindex] ^ u8(qrem)[0];
        for (let j = 0; j < 25; j++) u8(qrem)[j] = u8(qrem)[j + 1];
        u8(qrem)[25] = 0;
        for (let j = 0; j < 26; j++) u8(qrem)[j] ^= mul(u8(qg)[j], f);
      }
      if (qindex < 108) {
        h.flip();
        Pip.lastFlip = getTime();
        return;
      }
      if (qit) clearInterval(qit);
      qit = 0;
      for (let i = 0; i < 26; i++) u8(qd)[108 + i] = u8(qrem)[i];
      qg = qrem = 0;
      qmatrix();
    } catch (e) {
      qfail(e);
    }
  }
  function qmatrix(): void {
    try {
      const z = 37,
        all = 134;
      qm = new Uint8Array(172);
      qrsv = new Uint8Array(172);
      for (let i = 0; i < z; i++) (qset(6, i, !(i & 1)), qset(i, 6, !(i & 1)));
      (qfinder(3, 3), qfinder(z - 4, 3), qfinder(3, z - 4));
      for (let i = 0; i < 9; i++) (qset(8, i, i === 6), qset(i, 8, i === 6));
      for (let i = 0; i < 8; i++)
        (qset(8, z - 8 + i, 0), qset(z - 8 + i, 8, 0));
      for (let y = -2; y <= 2; y++)
        for (let x = -2; x <= 2; x++)
          qset(
            30 + x,
            30 + y,
            Math.max(Math.abs(x), Math.abs(y)) === 2 || (!x && !y),
          );
      let bi = 0;
      for (let right = z - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < z; vert++)
          for (let j = 0; j < 2; j++) {
            let x = right - j,
              y = ((right + 1) & 2) === 0 ? z - 1 - vert : vert,
              k = y * z + x;
            if (!qbit(qrsv, k) && bi < all * 8) {
              let b = 128 >> (k & 7);
              if ((u8(qd)[bi >> 3] >>> (7 - (bi++ & 7))) & 1)
                u8(qm)[k >> 3] |= b;
            }
          }
      }
      for (let y = 0; y < z; y++)
        for (let x = 0; x < z; x++) {
          let k = y * z + x;
          if (!qbit(qrsv, k) && !((x + y) & 1))
            u8(qm)[k >> 3] ^= 128 >> (k & 7);
        }
      let v = 8,
        rn = v;
      for (let i = 0; i < 10; i++) rn = (rn << 1) ^ ((rn >> 9) * 1335);
      let f = ((v << 10) | rn) ^ 21522;
      for (let i = 0; i <= 5; i++) qset(8, i, (f >> i) & 1);
      (qset(8, 7, (f >> 6) & 1),
        qset(8, 8, (f >> 7) & 1),
        qset(7, 8, (f >> 8) & 1));
      for (let i = 9; i < 15; i++) qset(14 - i, 8, (f >> i) & 1);
      for (let i = 0; i < 8; i++) qset(z - 1 - i, 8, (f >> i) & 1);
      for (let i = 8; i < 15; i++) qset(8, z - 15 + i, (f >> i) & 1);
      qset(8, z - 8, 1);
      qrsv = 0;
      h.clear(1)
        .setColor(3)
        .setFontMonofonto18()
        .setFontAlign(0, 0)
        .drawString('UPLOAD SCORE ONLINE', 240, 18)
        .setFontMonofonto14()
        .drawString('SCAN QR CODE', 240, 36);
      h.fillRect(127, 43, 351, 267).setColor(0);
      qrow = 0;
      h.flip();
      Pip.lastFlip = getTime();
      qit = setInterval(global.__bbQrPaint, 16);
    } catch (e) {
      qfail(e);
    }
  }
  function qpaint(): void {
    if (dead) return;
    try {
      let end = Math.min(qrow + 19, 37);
      h.setColor(0);
      for (; qrow < end; qrow++)
        for (let x = 0; x < 37; x++)
          if (qbit(qm, qrow * 37 + x))
            h.fillRect(147 + x * 5, 63 + qrow * 5, 151 + x * 5, 67 + qrow * 5);
      if (qrow < 37) {
        h.flip();
        Pip.lastFlip = getTime();
        return;
      }
      h.setColor(3)
        .setFontMonofonto14()
        .setFontAlign(0, 0)
        .drawString('brickbounce.htheb.com', 240, 282)
        .drawString('PRESS KNOB: BACK', 240, 302)
        .flip();
      Pip.lastFlip = getTime();
      qclear();
    } catch (e) {
      qfail(e);
    }
  }
  function qfail(e?: PipValue): void {
    qclear();
    h.clear(1)
      .setColor(3)
      .setFontMonofonto18()
      .setFontAlign(0, 0)
      .drawString('COULD NOT MAKE QR CODE', 240, 150)
      .setFontMonofonto14()
      .drawString('PRESS KNOB: BACK', 240, 286)
      .flip();
    Pip.lastFlip = getTime();
  }
  function show(): void {
    try {
      if (!qstart(BASE + token())) {
        qfail();
        return;
      }
      global.__bbQrChunk = qchunk;
      global.__bbQrPaint = qpaint;
      qit = setInterval(global.__bbQrChunk, 16);
      try {
        Pip.startTimers();
      } catch (x) {}
    } catch (e) {
      qfail(e);
    }
  }
  function close(): void {
    if (dead) return;
    dead = 1;
    if (to) clearTimeout(to);
    qclear();
    Pip.removeListener('knob1', k1);
    Pip.removeListener('knob2', k2);
    h.clear(1)
      .setColor(3)
      .setFontMonofonto18()
      .setFontAlign(0, 0)
      .drawString('LOADING...', 240, 160)
      .flip();
    Pip.lastFlip = getTime();
    E.defrag();
    global.__bbUploadBack = Function(
      "delete global.__bbUploadBack;Pip.CURRENT=0;E.defrag();Pip.CURRENT=eval(fs.readFileSync('HOLO/BRKBNCE/APP.JS'))({view:'scores'});",
    );
    to = setTimeout(global.__bbUploadBack, 40);
  }
  function k1(d: KnobDirection): void {
    if (!dead) close();
  }
  function k2(d: KnobDirection): void {}
  function remove(): void {
    if (to) clearTimeout(to);
    qclear();
    Pip.removeListener('knob1', k1);
    Pip.removeListener('knob2', k2);
  }
  h.clear(1)
    .setColor(3)
    .setFontMonofonto18()
    .setFontAlign(0, 0)
    .drawString('CREATING QR CODE...', 240, 160)
    .flip();
  Pip.lastFlip = getTime();
  to = setTimeout(show, 20);
  Pip.onExclusive('knob1', k1);
  Pip.onExclusive('knob2', k2);
  return { id: 'BRKBNCEUP', notDefault: !0, fullscreen: !0, remove: remove };
});
