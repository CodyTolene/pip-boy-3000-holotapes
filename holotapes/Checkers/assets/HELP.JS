// =============================================================================
//  Name: Checkers
//  Author(s): @trekker87 @CodyTolene
//  License: MIT
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: HELP.JS (scene)
//  Description: Static rules and controls screen.
// =============================================================================

(function (app) {
  const LINES = [
    'You play the bright pieces and move first.',
    '',
    'L-KNOB scroll moves the cursor up and down.',
    'R-KNOB scroll moves the cursor left and right.',
    'L-KNOB press selects a piece or confirms a move.',
    '',
    'Jumps are forced, if a jump exists you must take it.',
    'After a jump, keep jumping while captures remain.',
    'Reaching the far row crowns a king (K), ends the turn.',
    'Kings move and jump both forward and backward.',
    'Win by capturing all AI pieces or blocking their moves.',
  ];

  function draw() {
    h.clear(1);
    h.setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, -1)
      .drawString('HOW TO PLAY', app.W / 2, 10);
    h.setColor(2).setFontMonofonto14().setFontAlign(-1, -1);

    let i;

    for (i = 0; i < LINES.length; i++) {
      h.drawString(LINES[i], 24, 52 + i * 20);
    }

    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString('PRESS L-KNOB TO RETURN', app.W / 2, app.H - 6);
    h.flip();
    Pip.lastFlip = getTime();
  }

  function onLeftScrollWheel(direction) {
    if (!direction) {
      // Pressed
      if (Pip.playSound) {
        Pip.playSound('TAB');
      }

      app.go(app.scenes.MENU);
    }
  }

  function remove() {
    Pip.removeListener('knob1', onLeftScrollWheel);
  }

  Pip.onExclusive('knob1', onLeftScrollWheel);

  draw();

  return { remove: remove };
});
