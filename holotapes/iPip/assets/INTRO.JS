// =============================================================================
//  Name: iPip Media Player
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app) {
  const INTRO_IMAGE = 'HOLO/IPIP/IMG_IPIP.BIN';
  const INTRO_SOUND = 'HOLO/IPIP/SND_INTRO.WAV';
  const INTRO_MS = 2500;

  let done = false;
  let introTimer = null;

  function drawIntro() {
    try {
      streamImageFile();
      h.flip();
      Pip.lastFlip = getTime();
    } catch (e) {
      try {
        console.log('iPip intro draw failed: ' + ((e && e.message) || e));
      } catch (e2) {}
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

  function onKnob2() {}

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

  function streamImageFile() {
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
  introTimer = setTimeout(finishIntro, INTRO_MS);

  return {
    remove: removeScene,
  };
});
