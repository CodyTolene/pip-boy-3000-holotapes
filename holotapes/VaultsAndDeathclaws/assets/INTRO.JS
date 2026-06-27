// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: INTRO.JS (scene)
//  Description: Plays the intro video before opening the character list
//  Notes: The left knob skips the intro
// =============================================================================

(function (app) {
  const VAULT_VIDEO = 'HOLO/VND/VAULT.AVI';

  let hasFinished = false; // Only move on once
  let videoHoldInterval = null;

  /**
   * Stop the intro and open the character list
   * @returns {void} Nothing
   */
  function finishIntro() {
    if (hasFinished) {
      return;
    }

    hasFinished = true;
    stopPlayback();
    app.go(app.scenes.LIST);
  }

  function handleVideoStopped() {
    finishIntro();
  }

  /**
   * Keep the OS from drawing over the video
   * @returns {void} Nothing
   */
  function holdVideoFrame() {
    Pip.lastFlip = getTime() + 1;
  }

  /**
   * Handle the left scroll wheel input
   * @param direction The direction of the scroll wheel
   * @returns {void} Nothing
   */
  function onLeftScrollWheel(direction) {
    if (!direction) {
      // Pressed
      finishIntro();
    }
  }

  function onRightScrollWheel() {
    // No op
  }

  function removeScene() {
    stopPlayback();
    Pip.removeListener('knob1', onLeftScrollWheel);
    Pip.removeListener('knob2', onRightScrollWheel);
  }

  function stopPlayback() {
    if (videoHoldInterval) {
      clearInterval(videoHoldInterval);
      videoHoldInterval = null;
    }

    Pip.lastFlip = getTime();
    Pip.removeListener('videoStopped', handleVideoStopped);
    Pip.videoStop();
    Pip.audioStop();
  }

  Pip.audioStop();
  h.clear(0).flip();
  holdVideoFrame();

  Pip.onExclusive('knob1', onLeftScrollWheel);
  Pip.onExclusive('knob2', onRightScrollWheel);
  Pip.on('videoStopped', handleVideoStopped);

  try {
    videoHoldInterval = setInterval(holdVideoFrame, 100);
    holdVideoFrame();
    Pip.videoStart(VAULT_VIDEO, { x: 0, y: 0 });
  } catch (error) {
    // Continue on if media fails
    finishIntro();
  }

  return {
    remove: removeScene,
  };
});
