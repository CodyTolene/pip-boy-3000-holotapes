(function () {
  /* All the service logic lives in HOLO/HAMCOLOCK/SERVICE.JS. Arming is
     idempotent, so re-playing this tape won't double-wrap Pip.wakeUp. fs is a
     firmware global, so no require() needed. */
  let svc;
  try {
    svc = eval(fs.readFileSync('HOLO/HAMCOLOCK/SERVICE.JS'))()();
  } catch (e) {
    Pip.errorBox('LOCK SVC: ' + e);
  }

  /* Open the lock/settings screen AFTER this factory returns, so the firmware
     assigns Pip.CURRENT to the holotape object first and the sub-module then
     takes it over cleanly.

     svc.settings() -> PIN gate -> LOCK SETTINGS (first run: CREATE ACCESS CODE).
     To make playing the tape immediately LOCK instead, use: svc.lock(); */
  if (svc)
    setTimeout(function () {
      if (svc.settings) svc.settings();
    }, 0);

  return {
    id: 'hamcolock',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      /* Leave the persistent service ARMED - only close the visible screen;
         don't undo the patch on exit. */
      if (svc && svc.closeUI) svc.closeUI();
    },
  };
});
