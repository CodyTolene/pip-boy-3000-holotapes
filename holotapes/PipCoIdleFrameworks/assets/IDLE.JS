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
  }
  function L(x) {
    try {
      if (Pip.log) Pip.log('IDLEFW: ' + x, 'pipco.txt');
    } catch (e) {}
  }
  function W() {
    try {
      let s = f.readFileSync(B + 'WAKE.JS'),
        q = Function('return ' + s)();
      s = undefined;
      q();
      q = undefined;
    } catch (e) {
      L('WAKE.JS failed: ' + e);
    }
  }
  function M() {
    try {
      Pip.changeMenu();
    } catch (e) {}
  }
  try {
    if (global.__PipCoIdleWake && global.__PipCoIdleWake.destroy)
      global.__PipCoIdleWake.destroy();
  } catch (e) {}
  let s, q, o;
  try {
    s = f.readFileSync(B + 'SERVICE.JS');
    q = Function('return ' + s)();
    s = undefined;
    o = q();
    q = undefined;
  } catch (e) {
    L('SERVICE.JS failed in IDLE.JS: ' + e);
    W();
    setTimeout(M, 0);
    return {
      id: 'PIPCOIDLERUNNER',
      notDefault: true,
      fullscreen: true,
      remove: function () {},
    };
  }
  o.runner = 1;
  if (o.enabled) o.play(0);
  else if (o.providerEnabled) o.playProvider(0, o.providerFile);
  if (!o.active) {
    o.runner = 0;
    o.destroy();
    o = undefined;
    W();
    setTimeout(M, 0);
    return {
      id: 'PIPCOIDLERUNNER',
      notDefault: true,
      fullscreen: true,
      remove: function () {},
    };
  }
  function K() {
    M();
  }
  Pip.onExclusive('knob1', K);
  Pip.onExclusive('knob2', K);
  return {
    id: 'PIPCOIDLERUNNER',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      Pip.removeListener('knob1', K);
      Pip.removeListener('knob2', K);
      if (o) {
        o.stop(0);
        o.runner = 0;
        o.destroy();
        o = undefined;
      }
      E.defrag();
      W();
    },
  };
});
