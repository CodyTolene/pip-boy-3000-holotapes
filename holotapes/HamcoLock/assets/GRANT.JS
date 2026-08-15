/* HAMCO LOCK - grant / video / reveal module.
 *
 * Lazily eval-loaded by LOCK.JS ONLY after a correct PIN, so waking the Pip only
 * has to eval the small login core. The full lock + this video/reveal code
 * eval'ing on top of the freshly rebuilt watch UI was the out-of-memory
 * (LOW_MEMORY/MEMORY) watchdog reboot on wake; by the time a PIN is entered the
 * heavy UI is gone and there is plenty of RAM to eval this.
 *
 * Factory args: (ctx) where ctx = {
 *   video, videoMs : tunables owned by LOCK.JS (single tuning spot),
 *   finish()   : end the whole unlock  -> LOCK.JS leave("OPEN"),
 *   resetRoll(): clear the scroll/blit anim (shared with LOCK.JS),
 *   clearHud() : clear LOCK.JS HUD timers. }
 * Returns { start, abort }. LOCK.JS sets its own `granted` flag before start()
 * and calls abort() from cleanup(). All video/reveal state lives here.
 */
(function (ctx) {
  const screenW = h.getWidth(),
    screenH = h.getHeight();
  const videoPath = ctx.video,
    fallbackMs = ctx.videoMs;
  let alive = true,
    videoActive = false,
    videoStartedAt = 0,
    timersPaused = false,
    videoTimer = 0;

  /* Read the real length of the AVI from its header so a swapped-in video "just
     works". This is genuine file I/O and can fail (missing/locked file), so on
     any error we fall back to the fixed cap (fallbackMs). */
  function videoLengthMs() {
    let file = 0,
      header,
      avihPos,
      fieldBase,
      usPerFrame,
      frameCount;
    try {
      file = E.openFile(videoPath, 'r');
      header = file.read(256);
      file.close();
      file = 0;
      avihPos = header.indexOf('avih');
      if (avihPos >= 0) {
        fieldBase = avihPos + 8; // skip the 'avih' tag + chunk-size field
        usPerFrame =
          header.charCodeAt(fieldBase) |
          (header.charCodeAt(fieldBase + 1) << 8) |
          (header.charCodeAt(fieldBase + 2) << 16);
        frameCount =
          header.charCodeAt(fieldBase + 16) |
          (header.charCodeAt(fieldBase + 17) << 8) |
          (header.charCodeAt(fieldBase + 18) << 16);
        if (usPerFrame > 0 && frameCount > 0)
          return Math.round((frameCount * usPerFrame) / 1000) + 200;
      }
    } catch (err) {
      if (file) file.close();
    }
    return fallbackMs;
  }

  function removeVideoListener() {
    Pip.removeListener('videoStopped', onVideoStopped);
  }
  function pauseDisplayForVideo() {
    if (Pip.stopTimers) {
      Pip.stopTimers(['timeHeader']);
      timersPaused = true;
    }
    if (Pip.blitOptions) {
      Pip.blitOptions.anim = [];
      Pip.blitOptions.y =
        Pip.settings && typeof Pip.settings.vShift === 'number'
          ? Pip.settings.vShift
          : 0;
      Pip.blitOptions.ydiff = 1;
      delete Pip.blitOptions.disable;
    }
  }
  function restartDisplayTimers() {
    if (!timersPaused) return;
    timersPaused = false;
    if (Pip.startTimers) Pip.startTimers();
  }

  /* Hand control back to the OS as fast as possible: clear the screen and finish
     (FW then draws the normal menu). */
  function finishUnlock() {
    restartDisplayTimers();
    h.setColor(0).fillRect(0, 0, screenW - 1, screenH - 1);
    h.flip();
    Pip.lastFlip = getTime();
    ctx.resetRoll();
    ctx.finish();
  }
  function unlockWithoutVideo() {
    videoActive = false;
    finishUnlock();
  }
  function stopVideoAndUnlock() {
    if (!alive || !videoActive) return;
    videoActive = false;
    if (Pip.videoStop) Pip.videoStop();
    if (videoTimer) clearTimeout(videoTimer);
    videoTimer = 0;
    removeVideoListener();
    ctx.clearHud();
    finishUnlock();
  }
  function onVideoStopped() {
    if (!alive || !videoActive) return;
    // ignore a stray "stopped" event fired right as the video starts
    if (videoStartedAt && getTime() - videoStartedAt < 0.7) return;
    stopVideoAndUnlock();
  }

  function start() {
    if (!alive) return;
    if (Pip.videoStop) Pip.videoStop();
    videoActive = true;
    pauseDisplayForVideo();
    h.setColor(0).fillRect(0, 0, screenW - 1, screenH - 1);
    h.flip();
    Pip.lastFlip = getTime();
    /* Intentional: if the video can't start (missing file, or videoStart
       throws), fall back to unlocking without it so the user is never stuck. */
    try {
      if (!Pip.videoStart) throw 'NO VIDEO';
      videoStartedAt = getTime();
      Pip.on('videoStopped', onVideoStopped);
      Pip.videoStart(videoPath, { x: 0, y: 0, repeat: false, debug: false });
      videoTimer = setTimeout(stopVideoAndUnlock, videoLengthMs());
    } catch (err) {
      videoActive = false;
      removeVideoListener();
      ctx.clearHud();
      unlockWithoutVideo();
    }
  }
  function abort() {
    alive = false;
    if (videoTimer) clearTimeout(videoTimer);
    videoTimer = 0;
    removeVideoListener();
    if (videoActive) {
      videoActive = false;
      if (Pip.videoStop) Pip.videoStop();
    }
    restartDisplayTimers();
  }
  return { start: start, abort: abort };
});
