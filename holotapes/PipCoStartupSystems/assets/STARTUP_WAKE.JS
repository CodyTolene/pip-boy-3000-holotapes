(function () {
  const fs = require('fs'),
    B = 'HOLO/STARTUP_ANIMATIONS/',
    S = B + 'SELECT.JSON';
  if (!global.__PipCoStartupSessionV130) {
    try {
      fs.writeFileSync(S, '{"startup":-1}');
    } catch (e) {}
    global.__PipCoStartupSessionV130 = 1;
    return;
  }
  if (global.__PipCoStartupRuntimeV130 || global.__PipCoStartupWakeV130) return;
  let t = 0,
    dead = 0;
  function cancel() {
    dead = 1;
    if (t) clearTimeout(t);
    try {
      delete global.__PipCoStartupWakeV130;
    } catch (e) {}
  }
  function go() {
    if (dead) return;
    try {
      if (Pip.CURRENT && Pip.CURRENT.notDefault) {
        t = setTimeout(go, 800);
        return;
      }
    } catch (e) {}
    try {
      eval(fs.readFileSync(B + 'STARTUP_RUNTIME.JS'));
    } catch (e) {
      try {
        if (Pip.log) Pip.log('STARTUP runtime ' + e, 'pipco.txt');
      } catch (x) {}
    }
    cancel();
  }
  global.__PipCoStartupWakeV130 = {
    cancel: cancel,
  };
  t = setTimeout(go, 800);
})();
