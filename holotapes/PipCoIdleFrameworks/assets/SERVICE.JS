(function (
  config,
  fs,
  basePath,
  mesmetronPath,
  pipquariumPath,
  pipquariumSentinel,
  log,
) {
  let previousService = global.__PipCoIdleService;

  if (previousService && previousService.version === 'rewrite2i') {
    previousService.enabled = config.enabled ? 1 : 0;
    previousService.providerEnabled = config.mesEnabled ? 1 : 0;
    previousService.providerFile = config.mesFile || '';
    previousService.last = getTime();
    previousService.detachInputs();
    return previousService;
  }

  if (previousService) {
    try {
      if (typeof previousService.destroy === 'function')
        previousService.destroy();
    } catch (e) {}
    delete global.__PipCoIdleService;
  }

  let idleService = {
    version: 'rewrite2i',
    enabled: config.enabled ? 1 : 0,
    providerEnabled: config.mesEnabled ? 1 : 0,
    providerFile: config.mesFile || '',
    last: getTime(),
    active: 0,
    preview: 0,
    previewFile: '',
    runner: 0,
    tick: undefined,
    run: undefined,
    inputsOn: 0,
    claimInputs: undefined,
  };

  function radioActive() {
    try {
      if (Pip.radioOn) return 1;
      if (global.__PipRadioActive) return 1;
      if (Pip.audioIsPlaying && Pip.audioIsPlaying()) return 1;
      if (Pip.streamPlaying) {
        let streamType = Pip.streamPlaying();
        if (streamType === 'audio' || streamType === 'both') return 1;
      }
    } catch (e) {}
    return 0;
  }

  function recordActivity() {
    idleService.last = getTime();
  }

  function detachInputs() {
    /* removeListener may remove one matching registration at a time.
     Repeat defensively so an older duplicate cannot survive into an
     exclusive foreground owner. */
    for (let i = 0; i < 3; i++) {
      Pip.removeListener('knob1', recordActivity);
      Pip.removeListener('knob2', recordActivity);
      Pip.removeListener('menuX', recordActivity);
      Pip.removeListener('STATS', recordActivity);
      Pip.removeListener('ITEMS', recordActivity);
      Pip.removeListener('DATA', recordActivity);
    }
    idleService.inputsOn = 0;
  }

  function attachInputs() {
    detachInputs();
    Pip.on('knob1', recordActivity);
    Pip.on('knob2', recordActivity);
    Pip.on('menuX', recordActivity);
    Pip.on('STATS', recordActivity);
    Pip.on('ITEMS', recordActivity);
    Pip.on('DATA', recordActivity);
    idleService.inputsOn = 1;
  }

  function stop(redraw) {
    let renderer = idleService.run;
    idleService.run = undefined;

    if (renderer && typeof renderer.stop === 'function') {
      try {
        renderer.stop();
      } catch (e) {
        log('renderer stop failed: ' + e);
      }
    }

    idleService.active = 0;
    idleService.preview = 0;
    idleService.previewFile = '';
    idleService.last = getTime();
    E.defrag();

    if (redraw && !idleService.runner) {
      setTimeout(function () {
        try {
          Pip.changeMenu();
        } catch (e) {
          log('redraw failed: ' + e);
        }
      }, 0);
    }
  }

  function loadRunner(fileName, argumentsList) {
    let runnerFactory;
    E.defrag();

    try {
      runnerFactory = eval(fs.readFileSync(basePath + fileName));
    } catch (e) {
      log(fileName + ' load failed: ' + e);
      return;
    }

    try {
      return runnerFactory.apply(undefined, argumentsList);
    } catch (e) {
      log(fileName + ' start failed: ' + e);
    }
  }

  function play(preview) {
    if (idleService.active || (!preview && !idleService.enabled)) return;

    idleService.preview = preview ? 1 : 0;
    idleService.active = 1;
    idleService.run = loadRunner('BOMBRUN.JS', [
      idleService,
      fs,
      basePath,
      log,
      radioActive(),
    ]);

    if (!idleService.run) {
      idleService.active = 0;
      idleService.preview = 0;
      idleService.last = getTime();
      E.defrag();
    }
  }

  function playProvider(preview, fileName) {
    if (idleService.active) return;

    if (preview) {
      if (!fileName) return;
      idleService.preview = 1;
      idleService.previewFile = fileName;
    } else {
      if (!idleService.providerEnabled || !idleService.providerFile) return;
      idleService.preview = 0;
      idleService.previewFile = '';
      fileName = idleService.providerFile;
    }

    idleService.active = 1;
    if (fileName === pipquariumSentinel) {
      idleService.run = loadRunner('PIPQIDLE.JS', [
        idleService,
        fs,
        pipquariumPath,
        log,
      ]);
    } else {
      idleService.run = loadRunner('MESIDLE.JS', [
        idleService,
        mesmetronPath,
        fs,
        h,
        log,
        fileName,
      ]);
    }

    if (!idleService.run) {
      idleService.active = 0;
      idleService.preview = 0;
      idleService.previewFile = '';
      idleService.last = getTime();
      E.defrag();
    }
  }

  function launchFullscreenRunner() {
    if (idleService.active || idleService.runner) return;

    idleService.runner = 1;
    detachInputs();

    setTimeout(function () {
      try {
        if (typeof Pip.loadHolotape !== 'function') {
          throw new Error('Pip.loadHolotape unavailable');
        }
        Pip.loadHolotape(basePath + 'IDLE.JS');
      } catch (e) {
        log('runner load failed: ' + e);
        idleService.runner = 0;
        idleService.last = getTime();
        attachInputs();
      }
    }, 0);
  }

  function destroy() {
    stop(0);
    if (idleService.tick) {
      clearInterval(idleService.tick);
      idleService.tick = undefined;
    }
    detachInputs();
    idleService.claimInputs = undefined;
    delete global.__PipCoIdleService;
  }

  idleService.stop = stop;
  idleService.play = play;
  idleService.playProvider = playProvider;
  idleService.launchRunner = launchFullscreenRunner;
  idleService.attachInputs = attachInputs;
  idleService.detachInputs = detachInputs;
  idleService.destroy = destroy;

  global.__PipCoIdleService = idleService;

  idleService.tick = setInterval(function () {
    if (Pip.sleeping) {
      idleService.last = getTime();
      return;
    }

    if (Pip.menuChanging) return;

    try {
      if (Pip.MODE === 2 && Pip.MENUX === 0) {
        idleService.last = getTime();
        return;
      }
    } catch (e) {}

    if (
      !idleService.active &&
      !idleService.runner &&
      (idleService.enabled || idleService.providerEnabled) &&
      getTime() - idleService.last >= 120
    ) {
      launchFullscreenRunner();
    }
  }, 1000);

  return idleService;
});
