(function () {
  const fs = require('fs'),
    basePath = 'HOLO/FALLOUT_SCREENSAVER/',
    pipquariumPath = 'HOLO/PIPQUARIUM/';

  let pipquariumApp,
    exitTimer = 0,
    inputMask = 0,
    removed = 0,
    preview = 0;

  function releaseInputs() {
    if (inputMask & 1) {
      Pip.removeListener('knob1', onExitInput);
      inputMask &= ~1;
    }
    if (inputMask & 2) {
      Pip.removeListener('knob2', onExitInput);
      inputMask &= ~2;
    }
  }

  function claimInputs() {
    releaseInputs();
    Pip.onExclusive('knob1', onExitInput);
    inputMask |= 1;
    try {
      Pip.onExclusive('knob2', onExitInput);
      inputMask |= 2;
    } catch (error) {
      releaseInputs();
      throw error;
    }
  }

  function startWakeWatcher() {
    let sourceCode = 0,
      wakeFactory = 0;
    try {
      E.defrag();
      sourceCode = fs.readFileSync(basePath + 'WAKE.JS');
      wakeFactory = eval(sourceCode);
      sourceCode = 0;
      wakeFactory();
      wakeFactory = 0;
    } catch (error) {
      sourceCode = wakeFactory = 0;
    }
  }

  function removeRunner() {
    if (removed) return;
    removed = 1;
    if (exitTimer) {
      clearTimeout(exitTimer);
      exitTimer = 0;
    }
    releaseInputs();
    if (pipquariumApp && typeof pipquariumApp.remove === 'function') {
      try {
        pipquariumApp.remove();
      } catch (error) {
        // Pipquarium owns its renderer/file cleanup. Continue our own cleanup.
      }
    }
    pipquariumApp = undefined;
    E.defrag();
    if (!preview) startWakeWatcher();
  }

  function finishExit() {
    exitTimer = 0;
    if (preview) Pip.loadHolotape(basePath + 'APP.JS');
    else Pip.changeMenu();
  }

  function onExitInput() {
    if (exitTimer) return;
    exitTimer = setTimeout(finishExit, 0);
  }

  if (global.__PipCoIdleWake && global.__PipCoIdleWake.destroy) {
    try {
      global.__PipCoIdleWake.destroy();
    } catch (error) {
      // The runner can continue even if an obsolete wake watcher was already gone.
    }
  }

  try {
    preview = fs.readFileSync(basePath + 'PIPQMODE.CFG') === '1' ? 1 : 0;
  } catch (error) {
    preview = 0;
  }
  try {
    fs.writeFileSync(basePath + 'PIPQMODE.CFG', '0');
  } catch (error) {
    // The mode has already been captured in RAM.
  }

  try {
    let sourceCode = 0,
      pipquariumFactory = 0;
    E.defrag();
    sourceCode = fs.readFileSync(pipquariumPath + 'APP.JS');
    pipquariumFactory = eval(sourceCode);
    sourceCode = 0;
    pipquariumApp = pipquariumFactory();
    pipquariumFactory = 0;
    if (!pipquariumApp || typeof pipquariumApp.remove !== 'function') {
      throw new Error('Invalid Pipquarium APP.JS');
    }
    E.defrag();
    claimInputs();
  } catch (error) {
    releaseInputs();
    if (pipquariumApp && typeof pipquariumApp.remove === 'function') {
      try {
        pipquariumApp.remove();
      } catch (removeError) {}
    }
    pipquariumApp = undefined;
    E.defrag();
    Pip.errorBox('PIP-CO Idle Framework\nPIPQUARIUM START FAILED');
    exitTimer = setTimeout(finishExit, 0);
  }

  return {
    id: 'PIPCOIDLEPIPQUARIUM',
    notDefault: true,
    fullscreen: true,
    remove: removeRunner,
  };
});
