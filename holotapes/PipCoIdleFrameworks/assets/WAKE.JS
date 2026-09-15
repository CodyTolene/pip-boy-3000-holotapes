(function () {
  const f = require('fs'),
    B = 'HOLO/FALLOUT_SCREENSAVER/';
  if (!global.__PipCoIdleSessionV105) {
    try {
      f.writeFileSync(
        B + 'CONFIG.JSON',
        '{"enabled":0,"mesEnabled":0,"mesFile":""}',
      );
    } catch (e) {}
    global.__PipCoIdleSessionV105 = 1;
    return 0;
  }
  function L(x) {
    try {
      if (Pip.log) Pip.log('IDLEFW: ' + x, 'pipco.txt');
    } catch (e) {}
  }
  function C() {
    try {
      let x = JSON.parse(f.readFileSync(B + 'CONFIG.JSON'));
      return [x.enabled ? 1 : 0, x.mesEnabled ? 1 : 0];
    } catch (e) {
      return [0, 0];
    }
  }
  let t,
    a = 1,
    p = global.__PipCoIdleWake;
  if (p && p.destroy)
    try {
      p.destroy();
    } catch (e) {}
  function D() {
    try {
      Pip.removeListener('mode', A);
      Pip.removeListener('menuX', A);
    } catch (e) {}
  }
  function S() {
    if (!a) return;
    if (t) {
      clearTimeout(t);
      t = undefined;
    }
    t = setTimeout(H, 120000);
  }
  function A() {
    S();
  }
  function K() {
    try {
      if (Pip.sleeping || Pip.menuChanging) return 1;
      if (Pip.CURRENT && Pip.CURRENT.notDefault) return 1;
      if (Pip.MODE === 2 && Pip.MENUX === 0) return 1;
    } catch (e) {
      return 1;
    }
    return 0;
  }
  function Z() {
    if (!a) return;
    a = 0;
    if (t) {
      clearTimeout(t);
      t = undefined;
    }
    D();
    if (global.__PipCoIdleWake === o) global.__PipCoIdleWake = undefined;
  }
  function H() {
    t = undefined;
    if (!a) return;
    let c = C();
    if (!c[0] && !c[1]) {
      Z();
      return;
    }
    if (K()) {
      S();
      return;
    }
    D();
    try {
      if (typeof Pip.loadHolotape !== 'function')
        throw new Error('Pip.loadHolotape unavailable');
      Pip.loadHolotape(B + 'IDLE.JS');
    } catch (e) {
      L('runner load failed: ' + e);
      if (a) {
        try {
          Pip.on('mode', A);
          Pip.on('menuX', A);
        } catch (x) {}
        S();
      }
    }
  }
  let c = C(),
    o = { version: 'tiny-wake-1', destroy: Z, touch: A };
  global.__PipCoIdleWake = o;
  if (!c[0] && !c[1]) {
    Z();
    return 0;
  }
  try {
    Pip.on('mode', A);
    Pip.on('menuX', A);
  } catch (e) {}
  S();
  return o;
});
