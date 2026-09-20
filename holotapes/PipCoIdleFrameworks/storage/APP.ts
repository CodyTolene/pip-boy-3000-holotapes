(function () {
  const fs = require('fs'),
    basePath = 'HOLO/FALLOUT_SCREENSAVER/',
    configPath = basePath + 'CONFIG.JSON',
    pipquariumModePath = basePath + 'PIPQMODE.CFG',
    mesmetronPath = 'HOLO/MESMETRON/',
    pipquariumPath = 'HOLO/PIPQUARIUM/',
    pipquariumSentinel = '@PIPQUARIUM';

  let config: PipCoIdleAppConfig,
    idleService: PipCoIdleService | undefined,
    providerNames: string[] = [],
    providerFiles: string[] = [],
    selectedProvider = 0,
    menuPage = 0,
    mainSelection = 0,
    mainScroll = 0,
    submenuIndex = -1,
    submenuSelection = 0,
    previewSubmenu = 0,
    configDirty = 0,
    appClosed = 0,
    previewOwned = 0,
    previewTimer = 0,
    pipquariumHandoff = 0,
    inputMask = 0,
    titleImage: PipCoIdleImage | undefined;

  function ignoreError(message: string): void {}

  function loadConfig(): PipCoIdleAppConfig {
    try {
      let savedConfig = JSON.parse(
        fs.readFileSync(configPath),
      ) as PipCoIdleAppConfig;
      return {
        enabled: savedConfig.enabled ? 1 : 0,
        mesEnabled: savedConfig.mesEnabled ? 1 : 0,
        mesFile: savedConfig.mesFile || '',
      };
    } catch (error) {
      return { enabled: 0, mesEnabled: 0, mesFile: '' };
    }
  }

  function saveConfig(currentConfig: PipCoIdleAppConfig): void {
    try {
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          enabled: currentConfig.enabled ? 1 : 0,
          mesEnabled: currentConfig.mesEnabled ? 1 : 0,
          mesFile: currentConfig.mesFile || '',
        }),
      );
    } catch (error) {
      ignoreError('config save failed: ' + error);
    }
  }

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

  function destroyExistingRuntime(): void {
    if (global.__PipCoIdleWake && global.__PipCoIdleWake.destroy) {
      try {
        global.__PipCoIdleWake.destroy();
      } catch (error) {
        ignoreError('existing wake cleanup failed: ' + error);
      }
    }
    if (global.__PipCoIdleService && global.__PipCoIdleService.destroy) {
      try {
        global.__PipCoIdleService.destroy();
      } catch (error) {
        ignoreError('existing service cleanup failed: ' + error);
      }
    }
  }

  function discoverProviders(): void {
    let sourceCode: string | 0 = 0,
      titleFactory: PipCoIdleFactory | 0 = 0,
      mesmetronTitle:
        { items?: Array<{ name?: string; file?: string }> } | 0 | undefined,
      mesmetronItems: Array<{ name?: string; file?: string }> | 0 | undefined,
      itemIndex!: number;

    try {
      sourceCode = fs.readFileSync(mesmetronPath + 'TITLE.JS');
      titleFactory = eval(sourceCode as string) as PipCoIdleFactory;
      sourceCode = 0;
      mesmetronTitle = (titleFactory as PipCoIdleFactory)() as {
        items?: Array<{ name?: string; file?: string }>;
      };
      titleFactory = 0;
      mesmetronItems =
        mesmetronTitle && mesmetronTitle.items ? mesmetronTitle.items : [];
      for (itemIndex = 0; itemIndex < mesmetronItems.length; itemIndex++) {
        if (
          mesmetronItems[itemIndex] &&
          mesmetronItems[itemIndex].name &&
          mesmetronItems[itemIndex].file
        ) {
          providerNames.push(String(mesmetronItems[itemIndex].name));
          providerFiles.push(String(mesmetronItems[itemIndex].file));
        }
      }
    } catch (error) {
      // Mesmetron is optional; a missing provider is not an Idle Framework failure.
    }
    sourceCode = titleFactory = mesmetronTitle = mesmetronItems = 0;

    if (fs.statSync(pipquariumPath + 'APP.JS')) {
      providerNames.push('Pipquarium');
      providerFiles.push(pipquariumSentinel);
    }
  }

  function resolveSelectedProvider(): void {
    let providerIndex!: number;
    if (!config.mesEnabled || !config.mesFile) return;
    for (
      providerIndex = 0;
      providerIndex < providerFiles.length;
      providerIndex++
    ) {
      if (providerFiles[providerIndex] === config.mesFile) {
        selectedProvider = providerIndex + 1;
        return;
      }
    }
    config.mesEnabled = 0;
    config.mesFile = '';
    idleService!.providerEnabled = 0;
    idleService!.providerFile = '';
    configDirty = 1;
  }

  function drawHeader(): void {
    h.clear();
    if (titleImage) h.setColor(3).drawImage(titleImage, 152, 6);
  }

  function drawText(y: number, text: string | number): void {
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(-1, -1)
      .drawString(text, 38, y);
  }

  function drawRow(y: number, text: string, selected: boolean): void {
    if (selected) Pip.shadeBox(24, y - 4, 456, y + 22);
    drawText(y, text);
  }

  function mainItemCount(): number {
    return providerNames.length + 2;
  }

  function mainItemLabel(index: number): string {
    if (index === 0) return 'PIP-BOY 3000';
    if (index === mainItemCount() - 1) return '< Back';
    return providerNames[index - 1];
  }

  function drawScroller(): void {
    let itemCount = mainItemCount(),
      trackTop!: number,
      trackBottom!: number,
      maxScroll!: number,
      thumbHeight!: number,
      thumbY!: number;
    if (itemCount <= 5) return;
    trackTop = 153;
    trackBottom = 274;
    maxScroll = Math.max(1, itemCount - 5);
    h.setColor(3)
      .drawLine(13, 148, 18, 143)
      .drawLine(18, 143, 23, 148)
      .drawLine(13, 279, 18, 284)
      .drawLine(18, 284, 23, 279)
      .drawLine(18, trackTop, 18, trackBottom);
    thumbHeight = Math.max(
      18,
      Math.floor(((trackBottom - trackTop + 1) * 5) / itemCount),
    );
    thumbY =
      trackTop +
      Math.floor(
        ((trackBottom - trackTop + 1 - thumbHeight) * mainScroll) / maxScroll,
      );
    h.fillRect(16, thumbY, 20, thumbY + thumbHeight - 1);
  }

  function drawMenu(): void {
    let itemCount!: number,
      visibleIndex!: number,
      itemIndex!: number,
      labelWidth!: number;

    drawHeader();
    if (menuPage === 0) {
      drawText(112, 'Screensaver Idle Animations:');
      itemCount = mainItemCount();
      if (mainSelection < mainScroll) mainScroll = mainSelection;
      if (mainSelection >= mainScroll + 5) mainScroll = mainSelection - 4;
      mainScroll = E.clip(mainScroll, 0, Math.max(0, itemCount - 5));
      for (
        visibleIndex = 0;
        visibleIndex < 5 && mainScroll + visibleIndex < itemCount;
        visibleIndex++
      ) {
        itemIndex = mainScroll + visibleIndex;
        drawRow(
          142 + visibleIndex * 30,
          mainItemLabel(itemIndex),
          itemIndex === mainSelection,
        );
      }
      drawScroller();
      return;
    }

    if (submenuIndex === 0) {
      drawRow(
        126,
        'PIP-BOY 3000 Idle: ' + (config.enabled ? 'ENABLED' : 'DISABLED'),
        submenuSelection === 0,
      );
      drawRow(166, 'Preview Screensaver', submenuSelection === 1);
      drawRow(206, '< Back', submenuSelection === 2);
      drawText(246, 'Idle Time: 2 Minutes');
      return;
    }

    if (submenuSelection === 0) Pip.shadeBox(24, 104, 456, 130);
    h.setColor(3).setFontMonofonto16().setFontAlign(-1, -1);
    h.drawString(providerNames[submenuIndex - 1], 38, 108);
    labelWidth = h.stringWidth(providerNames[submenuIndex - 1]);
    h.drawString(' Idle: ', 38 + labelWidth, 108);
    h.drawString(
      selectedProvider === submenuIndex ? 'ENABLED' : 'DISABLED',
      38 + labelWidth + h.stringWidth(' Idle: '),
      108,
    );
    drawRow(148, 'Preview Screensaver', submenuSelection === 1);
    drawRow(188, '< Back', submenuSelection === 2);
    drawText(228, 'Idle Time: 2 Minutes');
  }

  function launchPipquariumPreview(): void {
    if (pipquariumHandoff || appClosed) return;
    try {
      fs.writeFileSync(pipquariumModePath, '1');
    } catch (error) {
      ignoreError('Pipquarium preview handoff failed: ' + error);
      return;
    }
    pipquariumHandoff = 1;
    previewOwned = 0;
    setTimeout(function () {
      if (appClosed && !pipquariumHandoff) return;
      try {
        Pip.loadHolotape(basePath + 'PIPQRUN.JS');
      } catch (error) {
        pipquariumHandoff = 0;
        ignoreError('PIPQRUN.JS preview load failed: ' + error);
        Pip.errorBox('PIP-CO Idle Framework\nPIPQUARIUM LOAD FAILED');
      }
    }, 0);
  }

  function leavePreview(): void {
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = 0;
    }
    previewOwned = 0;
    idleService!.stop(0);
    menuPage = 1;
    submenuIndex = previewSubmenu;
    submenuSelection = 1;
    drawMenu();
  }

  function onKnob1(direction: KnobDirection): void {
    if (idleService) idleService!.last = getTime();
    if (
      previewOwned ||
      (idleService && idleService!.active && idleService!.preview)
    ) {
      leavePreview();
      return;
    }

    if (menuPage === 0) {
      if (direction) {
        mainSelection += direction > 0 ? 1 : -1;
        if (mainSelection < 0) mainSelection = mainItemCount() - 1;
        if (mainSelection >= mainItemCount()) mainSelection = 0;
        Pip.playSound('SCROLL');
        drawMenu();
        return;
      }
      Pip.playSound('SELECT');
      if (mainSelection === mainItemCount() - 1) {
        Pip.changeMenu('MISC.JS');
        return;
      }
      submenuIndex = mainSelection;
      menuPage = 1;
      submenuSelection = 0;
      drawMenu();
      return;
    }

    if (direction) {
      submenuSelection += direction > 0 ? 1 : -1;
      if (submenuSelection < 0) submenuSelection = 2;
      if (submenuSelection > 2) submenuSelection = 0;
      Pip.playSound('SCROLL');
      drawMenu();
      return;
    }

    if (submenuSelection !== 1) Pip.playSound('SELECT');
    if (submenuSelection === 2) {
      menuPage = 0;
      submenuIndex = -1;
      submenuSelection = 0;
      drawMenu();
      return;
    }

    if (submenuIndex === 0) {
      if (submenuSelection === 0) {
        config.enabled = config.enabled ? 0 : 1;
        if (config.enabled) selectedProvider = 0;
        idleService!.enabled = config.enabled;
        idleService!.providerEnabled = 0;
        idleService!.providerFile = '';
        configDirty = 1;
        drawMenu();
        return;
      }
      previewSubmenu = 0;
      previewOwned = 1;
      if (previewTimer) clearTimeout(previewTimer);
      previewTimer = setTimeout(function () {
        previewTimer = 0;
        if (!appClosed && !idleService!.active) {
          idleService!.play(1);
          if (!idleService!.active) previewOwned = 0;
        } else if (appClosed) {
          previewOwned = 0;
        }
      }, 120);
      return;
    }

    if (submenuSelection === 0) {
      if (selectedProvider === submenuIndex) {
        selectedProvider = 0;
        idleService!.providerEnabled = 0;
        idleService!.providerFile = '';
      } else {
        selectedProvider = submenuIndex;
        config.enabled = 0;
        idleService!.enabled = 0;
        idleService!.providerEnabled = 1;
        idleService!.providerFile = providerFiles[submenuIndex - 1];
      }
      configDirty = 1;
      drawMenu();
      return;
    }

    previewSubmenu = submenuIndex;
    if (providerFiles[previewSubmenu - 1] === pipquariumSentinel) {
      launchPipquariumPreview();
      return;
    }
    previewOwned = 1;
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(function () {
      previewTimer = 0;
      if (!appClosed && !idleService!.active) {
        idleService!.playProvider(1, providerFiles[previewSubmenu - 1]);
        if (!idleService!.active) previewOwned = 0;
      } else if (appClosed) {
        previewOwned = 0;
      }
    }, 120);
  }

  function onKnob2(): void {
    if (idleService) idleService!.last = getTime();
    if (
      previewOwned ||
      (idleService && idleService!.active && idleService!.preview)
    )
      leavePreview();
  }

  function releaseInputs(): void {
    if (inputMask & 1) {
      Pip.removeListener('knob1', onKnob1);
      inputMask &= ~1;
    }
    if (inputMask & 2) {
      Pip.removeListener('knob2', onKnob2);
      inputMask &= ~2;
    }
  }

  function claimInputs(): void {
    releaseInputs();
    Pip.onExclusive('knob1', onKnob1);
    inputMask |= 1;
    try {
      Pip.onExclusive('knob2', onKnob2);
      inputMask |= 2;
    } catch (error) {
      releaseInputs();
      throw error;
    }
  }

  function removeApp(): void {
    let shouldArmWake = 0;
    if (appClosed) return;
    appClosed = 1;
    previewOwned = 0;
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = 0;
    }
    releaseInputs();
    if (idleService) {
      idleService!.claimInputs = undefined;
      if (idleService!.active) idleService!.stop(0);
      if (configDirty) {
        config.mesEnabled = selectedProvider ? 1 : 0;
        config.mesFile = selectedProvider
          ? providerFiles[selectedProvider - 1]
          : '';
        idleService!.providerEnabled = config.mesEnabled;
        idleService!.providerFile = config.mesFile;
        saveConfig(config);
      }
      shouldArmWake = idleService!.enabled || idleService!.providerEnabled;
      idleService!.destroy();
      idleService = undefined;
    }
    providerNames = undefined as never;
    providerFiles = undefined as never;
    titleImage = undefined;
    h.clear();
    process.memory(true);
    E.defrag();
    if (shouldArmWake && !pipquariumHandoff) startWakeWatcher();
  }

  let coldSession = !global.__PipCoIdleSessionV120,
    serviceFactory: PipCoIdleFactory | 0 = 0;
  global.__PipCoIdleSessionV120 = 1;
  E.defrag();
  destroyExistingRuntime();
  config = loadConfig();
  if (coldSession && (config.enabled || config.mesEnabled)) {
    config.enabled = 0;
    config.mesEnabled = 0;
    config.mesFile = '';
    saveConfig(config);
  }

  try {
    serviceFactory = loadFactory('SERVICE.JS');
    idleService = (serviceFactory as PipCoIdleFactory)() as PipCoIdleService;
    serviceFactory = 0;
  } catch (error) {
    serviceFactory = 0;
    ignoreError('SERVICE.JS failed: ' + error);
    Pip.errorBox('PIP-CO Idle Framework\nSERVICE INIT FAILED');
    return {
      id: 'PIPCOIDLEFRAMEWORK',
      notDefault: true,
      fullscreen: true,
      remove: function () {},
    };
  }

  discoverProviders();
  resolveSelectedProvider();
  try {
    titleImage = {
      width: 176,
      height: 98,
      bpp: 1,
      transparent: 0,
      buffer: fs.readFileSync(basePath + 'TITLE.BIN'),
    };
  } catch (error) {
    titleImage = undefined;
  }

  idleService!.claimInputs = claimInputs;
  try {
    claimInputs();
    drawMenu();
  } catch (error) {
    ignoreError('input initialization failed: ' + error);
    removeApp();
    Pip.errorBox('PIP-CO Idle Framework\nINPUT INIT FAILED');
  }

  return {
    id: 'PIPCOIDLEFRAMEWORK',
    notDefault: true,
    fullscreen: true,
    remove: removeApp,
  };
});
