// =============================================================================
//  Name: RobCo Entertainment Terminal
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app) {
  const INTRO_TEXT =
    'ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM\n' +
    'COPYRIGHT 2075-2077 ROBCO INDUSTRIES\n\n' +
    'ROBCO ENTERTAINMENT TERMINAL V' +
    app.version +
    ' INITIALIZING... §\n\n' +
    'CONNECTING TO MEDIA BUS... §\n' +
    'PIP-BOY LINK ONLINE\n' +
    'UPLINK ONLINE\n\n' +
    'MOUNTING MUSIC/ VIDEOS/ IMAGES/ ARCHIVES... §\n' +
    'MEDIA INDEX ONLINE\n' +
    '\nMEDIA PLAYBACK READY... §§§';

  let done = false;

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
    if (Pip.timers && Pip.timers.typeText) {
      clearTimeout(Pip.timers.typeText);
      Pip.timers.typeText = 0;
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
  h.clear(0);
  try {
    Pip.typeText(INTRO_TEXT, 18, 18, 444, 284, 'Monofonto16').then(finishIntro);
  } catch (e) {
    finishIntro();
  }

  return {
    remove: removeScene,
  };
});
