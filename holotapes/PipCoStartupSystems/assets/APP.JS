(function () {
  const fs = require('fs'),
    B = 'HOLO/STARTUP_ANIMATIONS/',
    S = B + 'SELECT.JSON';
  const F = [
    'MISTER.AVI',
    'VAULTGIRL.AVI',
    'DEATHCLAW.AVI',
    'YESMAN.AVI',
    'ENCLAVE.AVI',
    'BOS.AVI',
    'MOTHMAN.AVI',
    'MINUTEMEN.AVI',
    'ENCLAVE_PIPBOY.AVI',
    'MRHOUSE.AVI',
    'CLASSIC_MRHOUSE.AVI',
    'CLASSIC_MRHOUSE_ANIMATED.AVI',
    'CLASSIC_MRHOUSE_FULLY_ANIMATED.AVI',
    'DOGMEAT.AVI',
    'Custom_Bootup.AVI',
    'Custom_Bootup_2.AVI',
    'Custom_Bootup_3.AVI',
    'Custom_Bootup_4.AVI',
    'Custom_Bootup_5.AVI',
  ];
  const L = [
    'Mister Handy',
    'Vault Girl',
    'Deathclaw Vault Experiment',
    'YES MAN',
    'The Enclave',
    'The Brotherhood of Steel',
    'Mothman',
    'The Minutemen',
    'Enclave PIP-BOY',
    'Mr. House',
    'Classic Mr. House',
    'Classic Mr. House Animated',
    'Classic Mr. House Fully Animated',
    'Dogmeat',
    'Custom Bootup',
    'Custom Bootup 2',
    'Custom Bootup 3',
    'Custom Bootup 4',
    'Custom Bootup 5',
  ];
  const G = [
    [0, 1, 2, 8],
    [4, 5, 7, 6],
    [3, 9, 10, 11, 12, 13],
    [14, 15, 16, 17, 18],
  ];
  let P = new Uint8Array(19),
    a = -1,
    p = 0,
    s = 0,
    sc = 0,
    closed = 0,
    T;
  function err(x) {
    try {
      if (Pip.log) Pip.log('STARTUP: ' + x, 'pipco.txt');
    } catch (e) {}
  }
  function legacy() {
    try {
      if (global.__PipCoStartupRuntimeV202)
        global.__PipCoStartupRuntimeV202.restore();
    } catch (e) {}
    try {
      if (global.__PipCoStartupRuntimeV2)
        global.__PipCoStartupRuntimeV2.restore();
    } catch (e) {}
    try {
      if (global.__PIPCO_RT) global.__PIPCO_RT.restore();
    } catch (e) {}
  }
  function cancelWake() {
    try {
      if (global.__PipCoStartupWakeV130) global.__PipCoStartupWakeV130.cancel();
    } catch (e) {}
  }
  function read() {
    try {
      let n = JSON.parse(fs.readFileSync(S)).startup | 0;
      return n >= -1 && n < 19 ? n : -1;
    } catch (e) {
      return -1;
    }
  }
  function save(n) {
    try {
      fs.writeFileSync(S, '{"startup":' + n + '}');
      a = n;
      return 1;
    } catch (e) {
      err('save ' + e);
      return 0;
    }
  }
  function scan() {
    for (let i = 0; i < 19; i++)
      try {
        P[i] = fs.statSync(B + F[i]) ? 1 : 0;
      } catch (e) {
        P[i] = 0;
      }
  }
  function cnt(k) {
    let q = G[k - 1],
      n = 0;
    for (let i = 0; i < q.length; i++) if (P[q[i]]) n++;
    return n;
  }
  function at(k, n) {
    let q = G[k - 1],
      z = 0;
    for (let i = 0; i < q.length; i++)
      if (P[q[i]]) {
        if (z === n) return q[i];
        z++;
      }
    return -1;
  }
  function mc() {
    let n = 2;
    for (let k = 1; k < 5; k++) if (cnt(k)) n++;
    return n;
  }
  function mr(i) {
    let q = 0;
    if (i === q++) return [-1, 'Default Bootup', 0];
    if (cnt(1) && i === q++) return [-10, 'Special Bootups', 1];
    if (cnt(2) && i === q++) return [-11, 'Faction Bootups', 2];
    if (cnt(3) && i === q++) return [-12, 'NPC Bootups', 3];
    if (cnt(4) && i === q++) return [-13, 'Custom Bootups', 4];
    return [-99, '< Back', -1];
  }
  function shade(y) {
    try {
      Pip.shadeBox(24, y - 4, 456, y + 22);
    } catch (e) {}
  }
  function scroller(total, first, visible) {
    if (total <= visible) return;
    let top = 108,
      bottom = 294,
      height = bottom - top,
      thumb = Math.max(18, Math.floor((height * visible) / total));
    let range = total - visible,
      y = top;
    if (range > 0) y += Math.floor(((height - thumb) * first) / range);
    h.setColor(3);
    h.drawRect(466, top, 470, bottom);
    h.fillRect(467, y + 1, 469, y + thumb - 1);
  }
  function head() {
    h.clear().setColor(3).setFontMonofonto16();
    if (T)
      try {
        h.drawImage(T, 152, 6);
      } catch (e) {}
  }
  function draw() {
    head();
    let y = 112;
    if (!p) {
      let n = mc();
      for (let i = 0; i < n; i++) {
        let r = mr(i);
        if (s === i) shade(y);
        h.setColor(3).setFontAlign(-1, -1).drawString(r[1], 38, y);
        if (r[0] === -1 && a === -1)
          h.setFontAlign(1, -1).drawString('ACTIVE', 442, y);
        y += 36;
      }
      return;
    }
    let n = cnt(p),
      t = n + 1;
    if (s < sc) sc = s;
    if (s >= sc + 5) sc = s - 4;
    sc = E.clip(sc, 0, Math.max(0, t - 5));
    for (let i = 0; i < 5 && sc + i < t; i++) {
      let pos = sc + i;
      if (s === pos) shade(y);
      h.setColor(3).setFontAlign(-1, -1);
      if (pos < n) {
        let x = at(p, pos);
        h.drawString(L[x], 38, y);
        if (a === x) h.setFontAlign(1, -1).drawString('ACTIVE', 442, y);
      } else h.drawString('< Back', 38, y);
      y += 36;
    }
    scroller(t, sc, 5);
  }
  function ensureLater() {
    if (a < 0 || global.__PipCoStartupRuntimeV130) return;
    try {
      eval(fs.readFileSync(B + 'STARTUP_WAKE.JS'));
    } catch (e) {
      err('wake ' + e);
    }
  }
  function knob(d) {
    if (d) {
      let m = p ? cnt(p) : mc() - 1;
      s += d > 0 ? 1 : -1;
      if (s < 0) s = m;
      if (s > m) s = 0;
      try {
        Pip.playSound('SCROLL');
      } catch (e) {}
      draw();
      return;
    }
    try {
      Pip.playSound('SELECT');
    } catch (e) {}
    if (!p) {
      let r = mr(s);
      if (r[0] === -99) {
        Pip.changeMenu('MISC.JS');
        return;
      }
      if (r[0] === -1) {
        if (save(-1)) {
          cancelWake();
          try {
            if (global.__PipCoStartupRuntimeV130)
              global.__PipCoStartupRuntimeV130.restore();
          } catch (e) {}
          draw();
        }
        return;
      }
      p = r[2];
      s = 0;
      sc = 0;
      draw();
      return;
    }
    let n = cnt(p);
    if (s === n) {
      let old = p;
      p = 0;
      s = 0;
      for (let i = 0; i < mc(); i++)
        if (mr(i)[2] === old) {
          s = i;
          break;
        }
      sc = 0;
      draw();
      return;
    }
    let x = at(p, s);
    if (x >= 0 && save(x)) draw();
  }
  let cold = !(
    global.__PipCoStartupSessionV130 ||
    global.__PipCoStartupRuntimeV130 ||
    global.__PipCoStartupWakeV130
  );
  global.__PipCoStartupSessionV130 = 1;
  cancelWake();
  legacy();
  a = read();
  if (cold && a !== -1) save(-1);
  scan();
  if (a >= 0 && !P[a]) save(-1);
  try {
    T = {
      width: 176,
      height: 98,
      bpp: 1,
      transparent: 0,
      buffer: fs.readFileSync(B + 'TITLE.BIN'),
    };
  } catch (e) {
    T = undefined;
  }
  try {
    Pip.onExclusive('knob1', knob);
    draw();
  } catch (e) {
    err('UI ' + e);
    try {
      Pip.errorBox('PIP-CO Startup Systems\nUI INIT FAILED');
    } catch (x) {}
  }
  return {
    id: 'STARTUPANIMATIONS',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      if (closed) return;
      closed = 1;
      try {
        Pip.removeListener('knob1', knob);
      } catch (e) {}
      try {
        h.clear();
      } catch (e) {}
      P = undefined;
      T = undefined;
      try {
        process.memory(true);
        if (E.defrag) E.defrag();
      } catch (e) {}
      if (a >= 0 && !global.__PipCoStartupRuntimeV130) ensureLater();
    },
  };
});
