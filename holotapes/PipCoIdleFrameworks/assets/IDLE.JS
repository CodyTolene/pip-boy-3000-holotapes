(function () {
  let idleService = global.__PipCoIdleService;

  function returnToMenu() {
    try {
      Pip.changeMenu();
    } catch (e) {}
  }

  if (!idleService) {
    setTimeout(returnToMenu, 0);
    return {
      id: 'PIPCOIDLERUNNER',
      notDefault: true,
      fullscreen: true,
      remove: function () {},
    };
  }

  idleService.detachInputs();
  idleService.runner = 1;

  if (idleService.enabled) idleService.play(0);
  else if (idleService.providerEnabled)
    idleService.playProvider(0, idleService.providerFile);

  if (!idleService.active) {
    idleService.runner = 0;
    setTimeout(returnToMenu, 0);
    return {
      id: 'PIPCOIDLERUNNER',
      notDefault: true,
      fullscreen: true,
      remove: function () {
        idleService.attachInputs();
      },
    };
  }

  function wakeFromIdle() {
    returnToMenu();
  }

  Pip.onExclusive('knob1', wakeFromIdle);
  Pip.onExclusive('knob2', wakeFromIdle);

  return {
    id: 'PIPCOIDLERUNNER',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      Pip.removeListener('knob1', wakeFromIdle);
      Pip.removeListener('knob2', wakeFromIdle);
      idleService.stop(0);
      idleService.runner = 0;
      idleService.last = getTime();
      idleService.attachInputs();
    },
  };
});
