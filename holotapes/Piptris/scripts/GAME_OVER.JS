// =============================================================================
//  Name: Piptris
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app, stats) {
  let blinkTimer,
    blinkOn = true;

  function drawBorder() {
    h.setColor(2);

    for (let x = -12; x < app.W; x += 12) {
      h.drawLine(x, 0, x + 11, 11) // Top band
        .drawLine(x + 1, 0, x + 12, 11)
        .drawLine(x + 8, 308, x + 19, 319) // Bottom band
        .drawLine(x + 9, 308, x + 20, 319);
    }

    for (let y = -12; y < app.H; y += 12) {
      h.drawLine(0, y, 11, y + 11) // Left band
        .drawLine(0, y + 1, 11, y + 12)
        .drawLine(468, y, 479, y + 11) // Right band
        .drawLine(468, y + 1, 479, y + 12);
    }

    h.setColor(1).drawRect(13, 13, 466, 306);
  }

  function drawFooter() {
    h.setColor(0).fillRect(110, 284, 370, 302);

    if (blinkOn) {
      h.setColor(2)
        .setFontMonofonto14()
        .setFontAlign(0, 0)
        .drawString('- PRESS LEFT KNOB FOR MENU -', app.W / 2, 293);
    }
  }

  function draw() {
    Pip.lastFlip = getTime();

    const cx = app.W / 2;
    const newHigh = stats.score > 0 && stats.score >= app.highScore;

    h.clear(0);

    // Frame
    drawBorder();

    // Title
    h.setFont('6x8', 4)
      .setFontAlign(0, 0)
      .setColor(2)
      .drawString('GAME OVER', cx + 3, 61)
      .setColor(3)
      .drawString('GAME OVER', cx, 58)
      .setColor(2)
      .drawLine(70, 90, 410, 90);

    // Stats
    const x1 = 90,
      y1 = 104,
      x2 = 390,
      y2 = 240,
      len = 18;
    h.setColor(0)
      .fillRect(90, 104, 390, 240)
      .setColor(2)
      .drawLine(x1, y1, x1 + len, y1) // Corners
      .drawLine(x1, y1, x1, y1 + len)
      .drawLine(x2, y1, x2 - len, y1)
      .drawLine(x2, y1, x2, y1 + len)
      .drawLine(x1, y2, x1 + len, y2)
      .drawLine(x1, y2, x1, y2 - len)
      .drawLine(x2, y2, x2 - len, y2)
      .drawLine(x2, y2, x2, y2 - len);

    // Score
    h.setFontMonofonto16()
      .setFontAlign(0, 0)
      .setColor(2)
      .drawString('SCORE', cx, 128)
      .setFontMonofonto23()
      .setColor(3)
      .drawString('' + stats.score, cx, 158);

    // Dividers
    h.setColor(1).drawLine(118, 184, 362, 184).drawLine(cx, 196, cx, 232);

    // Level and lines
    h.setFontMonofonto14()
      .setFontAlign(0, 0)
      .setColor(2)
      .drawString('LEVEL', 168, 204)
      .drawString('LINES', 312, 204)
      .setFontMonofonto18()
      .setColor(3)
      .drawString('' + stats.level, 168, 224)
      .drawString('' + stats.lines, 312, 224);

    // High score / new record
    if (newHigh) {
      h.setColor(3)
        .fillRect(120, 250, 360, 276)
        .setColor(0)
        .setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString('NEW HIGH SCORE!', cx, 263);
    } else {
      h.setColor(2)
        .setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString('HIGH SCORE ' + app.highScore, cx, 263);
    }

    drawFooter();
    h.flip();
  }

  function blink() {
    blinkOn = !blinkOn;
    Pip.lastFlip = getTime();
    drawFooter();
    h.flip();
  }

  function onLeftScrollWheel(direction) {
    if (direction) return;

    app.go(app.scenes.MENU);
  }

  function onRightScrollWheel() {}

  function remove() {
    if (blinkTimer) clearInterval(blinkTimer);

    Pip.removeListener('knob1', onLeftScrollWheel);
    Pip.removeListener('knob2', onRightScrollWheel);

    blinkTimer = blinkOn = undefined;
  }

  stats = stats || { level: 0, lines: 0, score: 0 };
  app.stopMusic();
  Pip.onExclusive('knob1', onLeftScrollWheel);
  Pip.onExclusive('knob2', onRightScrollWheel);
  draw();
  blinkTimer = setInterval(blink, 600);

  return { remove: remove };
});
