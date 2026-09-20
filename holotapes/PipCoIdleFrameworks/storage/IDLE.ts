(function () {
  const fs = require('fs'),
    basePath = 'HOLO/FALLOUT_SCREENSAVER/';

  let idleService: PipValue,
    returnTimer = 0,
    inputMask = 0,
    removed = 0;

  function ignoreError(message: string): void {}

  function loadFactory(fileName: string): PipCoIdleFactory {
    let sourceCode: string | 0 = 0,
      factory: PipCoIdleFactory | 0 = 0;
    process.memory(true);
    E.defrag();
    sourceCode = fs.readFileSync(basePath + fileName);
    factory = eval(sourceCode as string) as PipCoIdleFactory;
    sourceCode = 0;
    return factory as PipCoIdleFactory;
  }

  function startWakeWatcher(): void {
    let wakeFactory: PipCoIdleFactory | 0 = 0;
    try {
      wakeFactory = loadFactory('WAKE.JS');
      wakeFactory();
      wakeFactory = 0;
      process.memory(true);
    } catch (error) {
      wakeFactory = 0;
      ignoreError('WAKE.JS failed: ' + error);
    }
  }

  function returnToMenu(): void {
    returnTimer = 0;
    try {
      Pip.changeMenu();
    } catch (error) {
      ignoreError('menu return failed: ' + error);
    }
  }

  function scheduleReturnToMenu(): void {
    if (returnTimer) clearTimeout(returnTimer);
    returnTimer = setTimeout(returnToMenu, 0);
  }

  function detachInputs(): void {
    if (inputMask & 1) {
      Pip.removeListener('knob1', onExitInput);
      inputMask &= ~1;
    }
    if (inputMask & 2) {
      Pip.removeListener('knob2', onExitInput);
      inputMask &= ~2;
    }
  }

  function attachInputs(): void {
    detachInputs();
    Pip.onExclusive('knob1', onExitInput);
    inputMask |= 1;
    try {
      Pip.onExclusive('knob2', onExitInput);
      inputMask |= 2;
    } catch (error) {
      detachInputs();
      throw error;
    }
  }

  function onExitInput(): void {
    returnToMenu();
  }

  function removeRunner(): void {
    if (removed) return;
    removed = 1;
    if (returnTimer) {
      clearTimeout(returnTimer);
      returnTimer = 0;
    }
    detachInputs();
    if (idleService) {
      idleService.stop(0);
      idleService.runner = 0;
      idleService.destroy();
      idleService = undefined;
    }
    process.memory(true);
    E.defrag();
    startWakeWatcher();
  }

  if (!global.__PipCoIdleSessionV120) {
    try {
      fs.writeFileSync(
        basePath + 'CONFIG.JSON',
        '{"enabled":0,"mesEnabled":0,"mesFile":""}',
      );
    } catch (error) {
      // The cold runner will simply exit if the config cannot be rewritten.
    }
    global.__PipCoIdleSessionV120 = 1;
  }

  if (global.__PipCoIdleWake && global.__PipCoIdleWake.destroy) {
    try {
      global.__PipCoIdleWake.destroy();
    } catch (error) {
      ignoreError('wake cleanup failed: ' + error);
    }
  }

  try {
    idleService = loadFactory('SERVICE.JS')();
  } catch (error) {
    ignoreError('SERVICE.JS failed in IDLE.JS: ' + error);
    idleService = undefined;
    startWakeWatcher();
    scheduleReturnToMenu();
    return {
      id: 'PIPCOIDLERUNNER',
      notDefault: true,
      fullscreen: true,
      remove: removeRunner,
    };
  }

  idleService.runner = 1;
  if (idleService.enabled) idleService.play(0);
  else if (idleService.providerEnabled)
    idleService.playProvider(0, idleService.providerFile);

  if (!idleService.active) {
    idleService.runner = 0;
    idleService.destroy();
    idleService = undefined;
    startWakeWatcher();
    scheduleReturnToMenu();
    return {
      id: 'PIPCOIDLERUNNER',
      notDefault: true,
      fullscreen: true,
      remove: removeRunner,
    };
  }

  try {
    attachInputs();
  } catch (error) {
    ignoreError('runner input attach failed: ' + error);
    idleService.stop(0);
    idleService.runner = 0;
    idleService.destroy();
    idleService = undefined;
    startWakeWatcher();
    scheduleReturnToMenu();
  }

  return {
    id: 'PIPCOIDLERUNNER',
    notDefault: true,
    fullscreen: true,
    remove: removeRunner,
  };
});
