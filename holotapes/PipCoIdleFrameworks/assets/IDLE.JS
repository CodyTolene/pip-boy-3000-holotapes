(function () {
  let S = global.__PipCoIdleService;

  function exitIdle() {
    Pip.changeMenu();
  }

  if (!S) {
    setTimeout(exitIdle, 0);
    return {
      id: 'PIPCOIDLERUNNER',
      notDefault: true,
      fullscreen: true,
      remove: function () {},
    };
  }

  S.detachInputs();
  S.pageSuspended = 0;

  if (S.runnerMode === 2) S.play(0);
  else if (S.runnerMode === 3) {
    S.mf = S.runnerFile || S.mf;
    S.playMes(0, S.mf);
  } else setTimeout(exitIdle, 0);

  function wake() {
    if (!S.active) return;
    exitIdle();
  }

  Pip.onExclusive('knob1', wake);
  Pip.onExclusive('knob2', wake);

  return {
    id: 'PIPCOIDLERUNNER',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      Pip.removeListener('knob1', wake);
      Pip.removeListener('knob2', wake);
      S.stop(0);
      S.runner = 0;
      S.runnerMode = 0;
      S.runnerFile = '';
      S.last = getTime();
      S.attachInputs();
    },
  };
});
