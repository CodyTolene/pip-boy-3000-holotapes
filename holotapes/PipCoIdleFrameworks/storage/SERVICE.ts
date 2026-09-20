(function () {
  const fs = require('fs'),
    basePath = 'HOLO/FALLOUT_SCREENSAVER/',
    mesmetronPath = 'HOLO/MESMETRON/';

  let existingService: PipCoIdleService | undefined = global.__PipCoIdleService,
    returnToMenuTimer = 0;

  function ignoreError(message: string): void {}

  function loadConfig(): PipCoIdleServiceConfig {
    try {
      let savedConfig = JSON.parse(
        fs.readFileSync(basePath + 'CONFIG.JSON'),
      ) as PipCoIdleAppConfig;
      return {
        enabled: savedConfig.enabled ? 1 : 0,
        providerEnabled: savedConfig.mesEnabled ? 1 : 0,
        providerFile: savedConfig.mesFile || '',
      };
    } catch (error) {
      return { enabled: 0, providerEnabled: 0, providerFile: '' };
    }
  }

  function audioAlreadyActive(): 0 | 1 {
    try {
      if (Pip.radioOn || global.__PipRadioActive) return 1;
      if (Pip.audioIsPlaying && Pip.audioIsPlaying()) return 1;
      if (Pip.streamPlaying) {
        let streamType = Pip.streamPlaying();
        if (streamType === 'audio' || streamType === 'both') return 1;
      }
    } catch (error) {
      ignoreError('audio-state check failed: ' + error);
      return 1;
    }
    return 0;
  }

  function loadRenderer(
    fileName: string,
    args: PipValue[],
  ): PipCoIdleRenderer | 0 {
    let sourceCode: string | 0 = 0,
      rendererFactory: PipCoIdleFactory | 0 = 0,
      renderer: PipCoIdleRenderer | 0 = 0;
    process.memory(true);
    E.defrag();
    try {
      sourceCode = fs.readFileSync(basePath + fileName);
      rendererFactory = eval(sourceCode as string) as PipCoIdleFactory;
      sourceCode = 0;
      renderer = (rendererFactory as PipCoIdleFactory).apply(
        undefined,
        args,
      ) as PipCoIdleRenderer;
      rendererFactory = 0;
      process.memory(true);
      return renderer;
    } catch (error) {
      sourceCode = rendererFactory = 0;
      ignoreError(fileName + ' load/start failed: ' + error);
      process.memory(true);
      return 0;
    }
  }

  function stopRenderer(returnToMenu: number): void {
    let renderer: PipCoIdleRenderer | 0 | undefined = service.run;
    service.run = undefined;
    if (renderer && renderer.stop) {
      try {
        renderer.stop();
      } catch (error) {
        ignoreError('renderer stop failed: ' + error);
      }
    }
    renderer = 0;
    service.active = 0;
    service.preview = 0;
    service.last = getTime();
    process.memory(true);
    E.defrag();
    if (returnToMenu && !service.runner) {
      if (returnToMenuTimer) clearTimeout(returnToMenuTimer);
      returnToMenuTimer = setTimeout(function () {
        returnToMenuTimer = 0;
        try {
          Pip.changeMenu();
        } catch (error) {
          ignoreError('menu return failed: ' + error);
        }
      }, 0);
    }
  }

  function playBuiltIn(preview?: number | boolean): void {
    if (service.active || (!preview && !service.enabled)) return;
    service.preview = preview ? 1 : 0;
    service.active = 1;
    service.run = loadRenderer('BOMBRUN.JS', [
      service,
      fs,
      basePath,
      ignoreError,
      audioAlreadyActive(),
    ]);
    if (!service.run) {
      service.active = 0;
      service.preview = 0;
      service.last = getTime();
      E.defrag();
    }
  }

  function playProvider(preview?: number | boolean, fileName?: string): void {
    if (service.active) return;
    if (preview) {
      if (!fileName) return;
      service.preview = 1;
    } else {
      if (!service.providerEnabled || !service.providerFile) return;
      service.preview = 0;
      fileName = service.providerFile;
    }

    if (fileName === '@PIPQUARIUM') return;
    service.active = 1;
    service.run = loadRenderer('MESIDLE.JS', [
      service,
      mesmetronPath,
      fs,
      ignoreError,
      fileName,
    ]);
    if (!service.run) {
      service.active = 0;
      service.preview = 0;
      service.last = getTime();
      E.defrag();
    }
  }

  function destroyService(): void {
    if (returnToMenuTimer) {
      clearTimeout(returnToMenuTimer);
      returnToMenuTimer = 0;
    }
    if (service.active) stopRenderer(0);
    service.claimInputs = undefined;
    service.run = undefined;
    if (global.__PipCoIdleService === service)
      global.__PipCoIdleService = undefined;
    process.memory(true);
    E.defrag();
  }

  if (existingService && existingService.destroy) {
    try {
      existingService.destroy();
    } catch (error) {
      ignoreError('existing service cleanup failed: ' + error);
    }
  }
  existingService = undefined;

  let savedConfig: PipCoIdleServiceConfig | undefined = loadConfig();
  const service: PipCoIdleService = {
    version: '1.2.0',
    enabled: savedConfig!.enabled,
    providerEnabled: savedConfig!.providerEnabled,
    providerFile: savedConfig!.providerFile,
    last: getTime(),
    active: 0,
    preview: 0,
    runner: 0,
    run: undefined,
    claimInputs: undefined,
    stop: stopRenderer,
    play: playBuiltIn,
    playProvider: playProvider,
    destroy: destroyService,
  };
  savedConfig = undefined;
  global.__PipCoIdleService = service;
  return service;
});
