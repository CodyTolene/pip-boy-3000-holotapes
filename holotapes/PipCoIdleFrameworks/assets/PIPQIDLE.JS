(function (idleService, fs, pipquariumPath, log) {
  let pipquariumFactory, pipquariumApp;

  idleService.detachInputs();
  E.defrag();

  try {
    pipquariumFactory = eval(fs.readFileSync(pipquariumPath + 'APP.JS'));
    pipquariumApp = pipquariumFactory();
    pipquariumFactory = undefined;

    if (!pipquariumApp || typeof pipquariumApp.remove !== 'function') {
      throw new Error('Invalid Pipquarium APP.JS');
    }
    if (pipquariumApp.pipcoSafe !== true) {
      throw new Error('Pipquarium build is not PIP-CO-safe');
    }

    if (idleService.preview && idleService.claimInputs) {
      idleService.claimInputs();
    }
  } catch (e) {
    log('Pipquarium start failed: ' + e);
    try {
      if (pipquariumApp && typeof pipquariumApp.remove === 'function') {
        pipquariumApp.remove();
      }
    } catch (cleanupError) {}
    pipquariumApp = undefined;
    pipquariumFactory = undefined;
    E.defrag();
    return;
  }

  return {
    stop: function () {
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
    },
  };
});
