/*
 * CARAVAN - CARAVAN_WIN_AUDIO.JS
 * Post-game-only win cue. Loaded only after the finished match has released
 * its heavy Engine/Renderer/Audio/data resources, so GAME_OVER_WIN does not
 * compete with active gameplay RAM.
 */
(function (api: CaravanWinAudioApi): CaravanDisposable {
  const fs = api[0],
    basePath = api[1],
    outcome = api[2];
  let done: CaravanPreviewCallback = api[3],
    removed = 0,
    timer = 0,
    savedVolume = -1;

  function restoreVolume(): void {
    if (savedVolume < 0) return;
    try {
      Pip.setVol(savedVolume);
    } catch (error) {}
    savedVolume = -1;
  }

  function finish(): void {
    if (removed) return;
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
    try {
      Pip.audioStop();
    } catch (audioError) {}
    restoreVolume();
    removed = 1;
    if (done) {
      const callback = done;
      done = 0;
      api[3] = 0;
      callback();
    }
  }

  function remove(): void {
    if (removed) return;
    removed = 1;
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
    try {
      Pip.audioStop();
    } catch (error) {}
    done = 0;
    api[3] = 0;
    restoreVolume();
  }

  function start(): void {
    let config = '',
      enabled = 1,
      level = 15,
      scaledVolume = 0;
    if (outcome === 'DRAW') {
      timer = setTimeout(finish, 1);
      return;
    }
    try {
      config = fs.readFileSync(basePath + 'VOLUME_SOUND.CFG') || '';
    } catch (error) {}
    if (config.length >= 11) {
      enabled = config.charAt(9) === '0' ? 0 : 1;
      level = parseInt(config.charAt(10), 16);
      if (isNaN(level) || level < 0 || level > 15) level = 15;
    }
    config = 0 as never;
    if (!enabled || level <= 0) {
      timer = setTimeout(finish, 1);
      return;
    }
    savedVolume =
      Pip.settings && typeof Pip.settings.volume === 'number'
        ? Pip.settings.volume
        : 15;
    scaledVolume = Math.round((savedVolume * level) / 15);
    if (scaledVolume < 0) scaledVolume = 0;
    try {
      Pip.setVol(scaledVolume);
      Pip.audioStart(basePath + 'GAME_OVER_WIN.WAV');
      timer = setTimeout(finish, 1600);
    } catch (error) {
      restoreVolume();
      timer = setTimeout(finish, 1);
    }
  }

  start();
  return {
    remove: remove,
  };
});
