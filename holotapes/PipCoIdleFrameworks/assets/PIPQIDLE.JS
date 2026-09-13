(function (idleService, fs, pipquariumPath, log) {
  let pipquariumFactory,
    pipquariumApp,
    readyTimer,
    ready = 0,
    stopPending = 0;
  idleService.detachInputs();
  E.defrag();
  function removePipquarium() {
    if (pipquariumApp) {
      try {
        pipquariumApp.remove();
      } catch (e) {
        log('Pipquarium stop failed: ' + e);
      }
    }
    pipquariumApp = undefined;
    pipquariumFactory = undefined;
    E.defrag();
  }
  try {
    pipquariumFactory = eval(fs.readFileSync(pipquariumPath + 'APP.JS'));
    pipquariumApp = pipquariumFactory();
    pipquariumFactory = undefined;
    if (!pipquariumApp || typeof pipquariumApp.remove !== 'function')
      throw new Error('Invalid Pipquarium APP.JS');
    readyTimer = setTimeout(function () {
      readyTimer = undefined;
      ready = 1;
      if (stopPending) removePipquarium();
    }, 1);
    if (idleService.preview && idleService.claimInputs)
      idleService.claimInputs();
  } catch (e) {
    log('Pipquarium start failed: ' + e);
    if (readyTimer) {
      clearTimeout(readyTimer);
      readyTimer = undefined;
    }
    removePipquarium();
    return;
  }
  return {
    stop: function () {
      if (ready) removePipquarium();
      else stopPending = 1;
    },
  };
});
