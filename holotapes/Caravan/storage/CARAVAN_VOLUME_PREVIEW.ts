/*
 * CARAVAN - CARAVAN_VOLUME_PREVIEW.JS
 * Lightweight standalone WAV preview controller.
 * Readable source only; installed runtime remains in the matching minified file.
 */
(function (api: CaravanVolumePreviewApi): CaravanVolumePreviewModule {
  const basePath = api.basePath;
  let removed = 0,
    active = 0,
    previewTimer = 0,
    previewFileName = '',
    previewLevel = 15,
    onPreviewStarted: CaravanPreviewCallback = 0,
    onPreviewDone: CaravanPreviewCallback = 0,
    previousMasterVolume = 15,
    masterVolumeSaved = 0;

  // --- Timer and master-volume helpers ---
  function clearPreviewTimer(): void {
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = 0;
    }
  }

  function saveMasterVolume(): void {
    if (masterVolumeSaved) return;
    try {
      previousMasterVolume =
        Pip.settings && typeof Pip.settings.volume === 'number'
          ? Pip.settings.volume
          : 15;
    } catch (error) {
      previousMasterVolume = 15;
    }
    masterVolumeSaved = 1;
  }

  function restoreMasterVolume(): void {
    if (!masterVolumeSaved) return;
    try {
      Pip.setVol(previousMasterVolume);
    } catch (error) {}
    masterVolumeSaved = 0;
  }

  // --- Preview lifecycle ---
  function previewDuration(): number {
    return previewFileName === 'LAZY_DAYS-TIRED_PREVIEW.WAV'
      ? 7680
      : previewFileName === 'BOTTLE_CAP_PREVIEW.WAV'
        ? 2050
        : previewFileName === 'GAME_OVER_WIN.WAV'
          ? 1650
          : 1000;
  }

  function finishPreview(): void {
    if (!active) return;
    clearPreviewTimer();
    active = 0;
    restoreMasterVolume();
    const doneCallback = onPreviewDone;
    onPreviewStarted = 0;
    onPreviewDone = 0;
    if (doneCallback) doneCallback();
  }

  // --- Playback controls ---
  function start(
    fileName: string,
    volumeLevel: number,
    startedCallback?: CaravanPreviewCallback,
    doneCallback?: CaravanPreviewCallback,
  ): number {
    stop();
    if (removed || volumeLevel <= 0) return 0;
    previewFileName = fileName;
    previewLevel = volumeLevel;
    onPreviewStarted = startedCallback || 0;
    onPreviewDone = doneCallback || 0;
    saveMasterVolume();
    try {
      let previewMasterVolume = Math.round(
        (previousMasterVolume * previewLevel) / 15,
      );
      if (previewMasterVolume < 0) previewMasterVolume = 0;
      Pip.setVol(previewMasterVolume);
      Pip.audioStart(basePath + previewFileName);
      active = 1;
      if (onPreviewStarted) onPreviewStarted();
      previewTimer = setTimeout(finishPreview, previewDuration());
      return 1;
    } catch (error) {
      active = 0;
      restoreMasterVolume();
      onPreviewStarted = 0;
      onPreviewDone = 0;
      return 0;
    }
  }

  function stop(): void {
    const wasActive = active;
    clearPreviewTimer();
    if (wasActive) {
      try {
        Pip.audioStop();
      } catch (stopError) {}
    }
    active = 0;
    restoreMasterVolume();
    onPreviewStarted = 0;
    onPreviewDone = 0;
  }

  // --- Final cleanup ---
  function remove(): void {
    if (removed) return;
    stop();
    removed = 1;
  }
  return {
    start: start,
    stop: stop,
    remove: remove,
    isActive: function (): number {
      return active;
    },
    isWaiting: function (): number {
      return 0;
    },
  };
});
