(function () {
  const f = require('fs'),
    B = 'HOLO/FALLOUT_SCREENSAVER/',
    M = 'HOLO/MESMETRON/',
    Q = 'HOLO/PIPQUARIUM/',
    S = '@PIPQUARIUM';
  function L(x) {
    try {
      if (Pip.log) Pip.log('IDLEFW: ' + x, 'pipco.txt');
    } catch (e) {}
  }
  function C() {
    try {
      let x = JSON.parse(f.readFileSync(B + 'CONFIG.JSON'));
      return [x.enabled ? 1 : 0, x.mesEnabled ? 1 : 0, x.mesFile || ''];
    } catch (e) {
      return [0, 0, ''];
    }
  }
  let p = global.__PipCoIdleService;
  if (p && p.destroy)
    try {
      p.destroy();
    } catch (e) {}
  let c = C(),
    o = {
      version: 'rewrite2k-transient',
      enabled: c[0],
      providerEnabled: c[1],
      providerFile: c[2],
      last: getTime(),
      active: 0,
      preview: 0,
      runner: 0,
      run: undefined,
      claimInputs: undefined,
    };
  c = p = undefined;
  function R() {
    try {
      if (Pip.radioOn || global.__PipRadioActive) return 1;
      if (Pip.audioIsPlaying && Pip.audioIsPlaying()) return 1;
      if (Pip.streamPlaying) {
        let x = Pip.streamPlaying();
        if (x === 'audio' || x === 'both') return 1;
      }
    } catch (e) {}
    return 0;
  }
  function D() {}
  function I() {}
  function X(r) {
    let x = o.run;
    o.run = undefined;
    if (x && x.stop)
      try {
        x.stop();
      } catch (e) {
        L('renderer stop failed: ' + e);
      }
    o.active = 0;
    o.preview = 0;
    o.last = getTime();
    E.defrag();
    if (r && !o.runner)
      setTimeout(function () {
        try {
          Pip.changeMenu();
        } catch (e) {
          L('redraw failed: ' + e);
        }
      }, 0);
  }
  function G(n, a) {
    let g;
    E.defrag();
    try {
      g = eval(f.readFileSync(B + n));
    } catch (e) {
      L(n + ' load failed: ' + e);
      return;
    }
    try {
      return g.apply(undefined, a);
    } catch (e) {
      L(n + ' start failed: ' + e);
    }
  }
  function P(v) {
    if (o.active || (!v && !o.enabled)) return;
    o.preview = v ? 1 : 0;
    o.active = 1;
    o.run = G('BOMBRUN.JS', [o, f, B, L, R()]);
    if (!o.run) {
      o.active = 0;
      o.preview = 0;
      o.last = getTime();
      E.defrag();
    }
  }
  function V(v, n) {
    if (o.active) return;
    if (v) {
      if (!n) return;
      o.preview = 1;
    } else {
      if (!o.providerEnabled || !o.providerFile) return;
      o.preview = 0;
      n = o.providerFile;
    }
    o.active = 1;
    o.run =
      n === S
        ? G('PIPQIDLE.JS', [o, f, Q, L])
        : G('MESIDLE.JS', [o, M, f, h, L, n]);
    if (!o.run) {
      o.active = 0;
      o.preview = 0;
      o.last = getTime();
      E.defrag();
    }
  }
  function Z() {
    if (o.active) X(0);
    o.claimInputs = undefined;
    o.run = undefined;
    if (global.__PipCoIdleService === o) global.__PipCoIdleService = undefined;
    E.defrag();
  }
  o.stop = X;
  o.play = P;
  o.playProvider = V;
  o.attachInputs = I;
  o.detachInputs = D;
  o.destroy = Z;
  global.__PipCoIdleService = o;
  return o;
});
