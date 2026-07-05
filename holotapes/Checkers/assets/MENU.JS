// =============================================================================
//  Name: Checkers
//  Author(s): @trekker87 @CodyTolene
//  License: MIT
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: MENU.JS (scene)
//  Description: Title screen with the main menu.
// =============================================================================

(function (app) {
  let selected = 0; // 0 = NEW GAME, 1 = HOW TO PLAY

  function draw() {
    h.clear(1);
    h.setColor(3)
      .setFontMonofonto36()
      .setFontAlign(0, -1)
      .drawString('CHECKERS', app.W / 2, 48);
    h.setColor(1)
      .setFontMonofonto14()
      .drawString('VAULT-TEC RECREATIONAL SOFTWARE', app.W / 2, 96);

    // Menu options, hardcoded 2 for performance
    let i, top;

    for (i = 0; i < 2; i++) {
      top = 164 + i * 40;

      if (selected === i) {
        Pip.shadeBox(app.W / 2 - 110, top - 6, app.W / 2 + 110, top + 24);
      }

      h.setColor(selected === i ? 3 : 2)
        .setFontMonofonto18()
        .setFontAlign(0, -1)
        .drawString(i ? 'HOW TO PLAY' : 'NEW GAME', app.W / 2, top);
    }

    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString('L-KNOB SCROLL/SELECT', app.W / 2, app.H - 6);
    h.flip();
    Pip.lastFlip = getTime();
  }

  function onLeftScrollWheel(direction) {
    if (direction) {
      selected = E.clip(selected + direction, 0, 1);

      if (Pip.playSound) {
        Pip.playSound('SCROLL');
      }

      draw();

      return;
    }

    // Pressed
    if (Pip.playSound) {
      Pip.playSound('TAB');
    }

    app.go(selected ? app.scenes.HELP : app.scenes.GAME);
  }

  function onRightScrollWheel(direction) {
    if (!direction) {
      return;
    }

    selected = E.clip(selected + direction, 0, 1);

    if (Pip.playSound) {
      Pip.playSound('SCROLL');
    }

    draw();
  }

  function remove() {
    Pip.removeListener('knob1', onLeftScrollWheel);
    Pip.removeListener('knob2', onRightScrollWheel);
  }

  Pip.onExclusive('knob1', onLeftScrollWheel);
  Pip.onExclusive('knob2', onRightScrollWheel);

  draw();

  return { remove: remove };
});
