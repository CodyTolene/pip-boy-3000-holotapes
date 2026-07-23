// =============================================================================
//  Name: Piptris
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app) {
  function drawBackground() {
    Pip.lastFlip = getTime();

    const file = E.openFile('HOLO/PIPTRIS/MENU.RAW', 'r');
    Pip.blitFile(h, file, {
      width: app.W,
      height: app.H,
      dstx: 0,
      dsty: 0,
      x: 0,
      y: 0,
      srcWidth: app.W,
      srcHeight: app.H,
    });
    file.close();
  }

  function drawCorners(x1, y1, x2, y2, len) {
    h.drawLine(x1, y1, x1 + len, y1)
      .drawLine(x1, y1, x1, y1 + len)
      .drawLine(x2, y1, x2 - len, y1)
      .drawLine(x2, y1, x2, y1 + len)
      .drawLine(x1, y2, x1 + len, y2)
      .drawLine(x1, y2, x1, y2 - len)
      .drawLine(x2, y2, x2 - len, y2)
      .drawLine(x2, y2, x2, y2 - len);
  }

  function drawLines(lines, x, y, lineHeight) {
    for (let i = 0; i < lines.length; i++) {
      h.drawString(lines[i], x, y + i * lineHeight);
    }

    return y + lines.length * lineHeight;
  }

  function draw() {
    drawBackground();

    const left = 34;
    const right = 446;
    const top = 16;
    const bottom = 306;
    const textX = 44;
    const textW = 392; // Wrap

    // Panel
    h.setColor(0).fillRect(left, top, right, bottom);
    h.setColor(3);
    drawCorners(left, top, right, bottom, 22);

    // Title
    h.setFontMonofonto23()
      .setFontAlign(0, 0)
      .setColor(3)
      .drawString('HOW TO PLAY', app.W / 2, 40);

    let y = 70;

    // General info
    h.setFontMonofonto14().setFontAlign(-1, 0).setColor(3);
    y = drawLines(
      h.wrapString(
        'Rotate and slide the falling blocks to fill full rows. ' +
          'Full rows clear and score points.',
        textW,
      ),
      textX,
      y,
      19,
    );

    // Nuke info
    y += 6;
    h.setFontMonofonto16().setColor(2).drawString('THE NUKES', textX, y);
    y += 23;
    h.setFontMonofonto14().setColor(3);
    y = drawLines(
      h.wrapString(
        'When it lands it detonates, clearing nearby blocks and ' +
          'collapsing the stack so floating blocks drop down. ' +
          'Scores bonus points per block! ' +
          'Nukes are random, about 1 in 17 pieces.',
        textW,
      ),
      textX,
      y,
      19,
    );

    // Game controls
    y += 6;
    h.setFontMonofonto16().setColor(2).drawString('CONTROLS', textX, y);
    y += 23;
    h.setFontMonofonto14()
      .setColor(3)
      .drawString('LEFT KNOB   ROTATE', textX, y)
      .drawString('RIGHT KNOB  MOVE', textX, y + 19)
      .drawString('PRESS        SOFT DROP', textX, y + 38);

    // Current window return controls
    h.setFontMonofonto14()
      .setFontAlign(0, 0)
      .setColor(2)
      .drawString('- PRESS LEFT KNOB TO RETURN -', app.W / 2, 296);

    h.flip();
  }

  function onLeftScrollWheel(direction) {
    if (direction) return;

    if (app.soundEffects) Pip.playSound('TAB');
    app.go(app.scenes.MENU);
  }

  function onRightScrollWheel() {}

  function remove() {
    Pip.removeListener('knob1', onLeftScrollWheel);
    Pip.removeListener('knob2', onRightScrollWheel);
  }

  Pip.onExclusive('knob1', onLeftScrollWheel);
  Pip.onExclusive('knob2', onRightScrollWheel);
  draw();

  return { remove: remove };
});
