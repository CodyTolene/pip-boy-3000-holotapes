// =============================================================================
//  Name: RobCo Entertainment Terminal
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app) {
  const INTRO_IMAGE = 'HOLO/RCET/IMG_RCET.BIN';
  const INTRO_SOUND = 'HOLO/RCET/INTRO.WAV';
  const INTRO_MS = 3000;

  let done = false;
  let introTimer = null;
  let loadFailed = false;

  function drawIntro() {
    try {
      const file = E.openFile(INTRO_IMAGE, 'r');
      const target = new Uint8Array(h.buffer);
      let offset = target.length;
      let chunk = file.read(256);

      while (chunk) {
        offset -= chunk.length;
        target.set(chunk, offset);
        chunk = file.read(256);
      }

      file.close();
      h.flip();
      Pip.lastFlip = getTime();
    } catch (e) {
      // Silently fail, image is now optional.
      // Draw loading text instead.
      loadFailed = true;
      h.clear()
        .setColor(3)
        .setFontAlign(0, 0)
        .setFontMonofonto28()
        .drawString('RobCo Entertainment Terminal', 240, 130)
        .setFontMonofonto18()
        .drawString('Vault-Tec Media Utility', 240, 180)
        .drawString('Pip-Boy.com', 240, 210)
        .setFontMonofonto14()
        .drawString('Loading...', 240, 240)
        .flip();
      Pip.lastFlip = getTime();
    }
  }

  function finishIntro() {
    if (done) return;
    done = true;
    removeInputs();
    app.gc();
    app.go(app.scenes.MENU || 'MENU.JS');
  }

  function onKnob1(dir) {
    if (!dir) finishIntro();
  }

  function onKnob2() {
    // noop
  }

  function removeInputs() {
    if (introTimer) {
      clearTimeout(introTimer);
      introTimer = null;
    }

    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
  }

  function removeScene() {
    removeInputs();
    Pip.audioStop();
  }

  Pip.audioStop();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  drawIntro();
  try {
    Pip.audioStart(INTRO_SOUND);
  } catch (e) {
    // Do nothing if the sound fails to play.
  }
  introTimer = setTimeout(finishIntro, loadFailed ? 3000 : INTRO_MS);

  return {
    remove: removeScene,
  };
});
