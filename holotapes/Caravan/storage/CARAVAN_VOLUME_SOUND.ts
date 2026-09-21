/*
 * CARAVAN - CARAVAN_VOLUME_SOUND.JS
 * Compact Volume Adjustment UI. Preview engines are lazy-loaded only when used.
 */
(function (api: CaravanVolumeApi): CaravanMenuModule {
  const fs = api.fs,
    basePath = api.basePath,
    enableMap = [0, 2, 4, 8, 6],
    volumeMap = [1, 3, 5, 9, 7],
    titles = [
      'PLAYING CARD SOUND',
      'DISCARD SOUND',
      'BOTTLE CAP',
      'GAME OVER WIN',
      'Lazy Day - Tired',
    ],
    previewFiles = [
      'BOTTLE_CAP_PREVIEW.WAV',
      'GAME_OVER_WIN.WAV',
      'LAZY_DAYS-TIRED_PREVIEW.WAV',
    ];
  let cfg = [1, 15, 1, 15, 1, 15, 1, 15, 1, 15],
    appliedMusic = 15,
    detail = 0,
    row = 0,
    kind = 0,
    editing = 0,
    removed = 0,
    knob = 0,
    sfx: CaravanSfxModule = 0 as never,
    wav: CaravanVolumePreviewModule = 0 as never,
    previewing = 0,
    waiting = 0,
    previewTimer = 0;

  function loadConfig(): void {
    let s = '';
    try {
      s = fs.readFileSync(basePath + 'VOLUME_SOUND.CFG') || '';
    } catch (e) {}
    if (s.length >= 6) {
      cfg[0] = s.charAt(0) === '0' ? 0 : 1;
      cfg[1] = parseInt(s.charAt(1), 16);
      cfg[2] = s.charAt(2) === '0' ? 0 : 1;
      cfg[3] = parseInt(s.charAt(3), 16);
      cfg[4] = s.charAt(4) === '0' ? 0 : 1;
      cfg[5] = parseInt(s.charAt(5), 16);
    }
    if (s.length >= 8) {
      cfg[6] = s.charAt(6) === '0' ? 0 : 1;
      cfg[7] = parseInt(s.charAt(7), 16);
    }
    if (s.length >= 9) appliedMusic = parseInt(s.charAt(8), 16);
    if (s.length >= 11) {
      cfg[8] = s.charAt(9) === '0' ? 0 : 1;
      cfg[9] = parseInt(s.charAt(10), 16);
    }
    if (isNaN(appliedMusic) || appliedMusic < 1 || appliedMusic > 15)
      appliedMusic = 15;
    for (let i = 1; i < 10; i += 2) {
      if (isNaN(cfg[i]) || cfg[i] < 0 || cfg[i] > 15) cfg[i] = 15;
    }
  }

  function hex(v: number): string {
    return '0123456789ABCDEF'.charAt(v);
  }
  function saveConfig(): void {
    try {
      fs.writeFileSync(
        basePath + 'VOLUME_SOUND.CFG',
        '' +
          cfg[0] +
          hex(cfg[1]) +
          cfg[2] +
          hex(cfg[3]) +
          cfg[4] +
          hex(cfg[5]) +
          cfg[6] +
          hex(cfg[7]) +
          hex(appliedMusic) +
          cfg[8] +
          hex(cfg[9]),
      );
    } catch (e) {}
  }
  function enabled(): number {
    return cfg[enableMap[kind]];
  }
  function volume(): number {
    return cfg[volumeMap[kind]];
  }
  function setEnabled(v: number | boolean): void {
    cfg[enableMap[kind]] = v ? 1 : 0;
  }
  function setVolume(v: number): void {
    if (v < 0) v = 0;
    if (v > 15) v = 15;
    cfg[volumeMap[kind]] = v;
  }

  function header(): void {
    h.clear()
      .setColor(3)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString('VOLUME ADJUSTMENT', 240, 10)
      .drawLine(18, 34, 462, 34)
      .setFontAlign(-1, -1);
  }
  function drawRow(text: string, y: number, selected: number | boolean): void {
    h.setColor(3).drawString(text, 42, y);
    if (selected) h.drawRect(28, y - 5, 452, y + 23);
  }
  function drawList(): void {
    if (row < 0 || row > 5) row = 0;
    header();
    h.drawString('SOUND EFFECTS - Will Be Applied In-Game', 42, 44).drawLine(
      42,
      66,
      438,
      66,
    );
    drawRow('Playing Card', 72, row === 0);
    drawRow('Discard', 100, row === 1);
    drawRow('Bottle Cap', 128, row === 2);
    drawRow('Game Over Win', 156, row === 3);
    h.drawString(
      'BACKGROUND MUSIC - Will Be Applied In-Game',
      42,
      186,
    ).drawLine(42, 208, 438, 208);
    drawRow('Lazy Day - Tired', 216, row === 4);
    drawRow('< Back', 252, row === 5);
  }
  function drawDetail(): void {
    if (row < 0 || row > 3) row = 0;
    header();
    h.drawString(titles[kind], 42, 54).drawLine(42, 80, 438, 80);
    drawRow(
      (kind === 4 ? 'Music: ' : 'Sound: ') + (enabled() ? 'ON' : 'OFF'),
      96,
      row === 0,
    );
    drawRow(
      editing ? 'Volume: < ' + volume() + ' >' : 'Volume: ' + volume(),
      134,
      row === 1,
    );
    drawRow(
      previewing
        ? 'Preview: PLAYING'
        : waiting
          ? 'Preview: WAIT'
          : 'Preview: PLAY',
      172,
      row === 2,
    );
    drawRow('< Back', 210, row === 3);
    h.setFont('6x8', 1)
      .drawString(
        editing
          ? 'Turn left wheel to adjust. Press to finish.'
          : kind === 4
            ? 'Music by Geoff Harvey from Pixabay'
            : kind === 3
              ? 'Sound Distributed From Wand Company MK V (TV Series) PIP-BOY'
              : kind === 2
                ? 'Sound Distributed From Wand Company PIP-BOY 3000'
                : 'Sound Effect by Alex from Pixabay',
        42,
        258,
      )
      .setFontMonofonto16();
  }

  function stopPreview(): void {
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = 0;
    }
    if (sfx && sfx.stopPreview) sfx.stopPreview();
    if (wav && wav.stop) wav.stop();
    waiting = previewing = 0;
  }
  function releasePreviewEngines(): void {
    stopPreview();
    if (sfx && sfx.remove) sfx.remove();
    if (wav && wav.remove) wav.remove();
    sfx = wav = 0 as never;
  }
  function loadPreviewModule(
    file: string,
    args: CaravanFileApi | CaravanVolumePreviewApi,
  ): CaravanSfxModule | CaravanVolumePreviewModule | 0 {
    let code: string = 0 as never,
      factory: CaravanPreviewFactory = 0 as never,
      module: CaravanSfxModule | CaravanVolumePreviewModule = 0 as never;
    try {
      process.memory(true);
      E.defrag();
      code = fs.readFileSync(basePath + file);
      factory = eval(code) as CaravanPreviewFactory;
      code = 0 as never;
      module = factory(args);
      factory = 0 as never;
      process.memory(true);
    } catch (e) {
      code = factory = module = 0 as never;
    }
    return module;
  }
  function previewStarted(): void {
    waiting = 0;
    previewing = 1;
    if (!removed && detail) drawDetail();
  }
  function previewDone(): void {
    waiting = previewing = 0;
    if (!removed && detail) drawDetail();
  }
  function runPreview(): void {
    previewTimer = 0;
    if (removed || !waiting) return;
    if (kind < 2) {
      if (!sfx)
        sfx = loadPreviewModule('CARAVAN_SFX_ENGINE.MIN.JS', {
          fs: fs,
          basePath: basePath,
        }) as CaravanSfxModule;
      if (
        !sfx ||
        !sfx.startPreview(kind, volume(), previewStarted, previewDone)
      ) {
        waiting = 0;
        drawDetail();
      }
      return;
    }
    if (!wav)
      wav = loadPreviewModule('CARAVAN_VOLUME_PREVIEW.MIN.JS', {
        fs: fs,
        basePath: basePath,
      }) as CaravanVolumePreviewModule;
    if (
      !wav ||
      !wav.start(previewFiles[kind - 2], volume(), previewStarted, previewDone)
    ) {
      waiting = 0;
      drawDetail();
    }
  }
  function startPreview(): void {
    if (removed || waiting || previewing || volume() <= 0) return;
    waiting = 1;
    drawDetail();
    previewTimer = setTimeout(runPreview, 80);
  }

  function detach(): void {
    if (knob) {
      Pip.removeListener('knob1', onKnob);
      knob = 0;
    }
  }
  function attach(): void {
    if (!knob) {
      Pip.onExclusive('knob1', onKnob);
      knob = 1;
    }
  }
  function goBack(): void {
    releasePreviewEngines();
    detach();
    if (api.onBack) api.onBack();
  }
  function onKnob(direction: KnobDirection): void {
    if (editing) {
      if (direction) {
        setVolume(volume() + (direction > 0 ? 1 : -1));
        saveConfig();
        Pip.playSound('SCROLL');
        drawDetail();
      } else {
        editing = 0;
        saveConfig();
        Pip.playSound('SELECT');
        drawDetail();
      }
      return;
    }
    if (direction) {
      stopPreview();
      let max = detail ? 3 : 5;
      row += direction > 0 ? 1 : -1;
      if (row < 0) row = max;
      if (row > max) row = 0;
      Pip.playSound('SCROLL');
      if (detail) drawDetail();
      else drawList();
      return;
    }
    if (!(detail && row === 2)) Pip.playSound('SELECT');
    if (!detail) {
      if (row === 5) {
        goBack();
        return;
      }
      kind = row;
      row = 0;
      detail = 1;
      drawDetail();
      return;
    }
    if (row === 0) {
      setEnabled(!enabled());
      saveConfig();
      drawDetail();
    } else if (row === 1) {
      stopPreview();
      editing = 1;
      drawDetail();
    } else if (row === 2) {
      if (previewing || waiting) {
        stopPreview();
        drawDetail();
      } else startPreview();
    } else {
      releasePreviewEngines();
      detail = 0;
      row = kind;
      drawList();
    }
  }
  function remove(): void {
    if (removed) return;
    removed = 1;
    releasePreviewEngines();
    detach();
  }

  loadConfig();
  drawList();
  attach();
  return { id: 'CARAVAN_VOLUME', remove: remove };
});
