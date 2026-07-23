// =============================================================================
//  Name: Piptris
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app) {
  const ITEMS = ['START GAME', 'SETTINGS', 'INSTRUCTIONS', 'EXIT GAME'];

  let selected = 0;

  function draw() {
    drawBackground();

    if (app.highScore > 0) {
      h.setFontMonofonto18().setFontAlign(0, 0);
      drawOutlinedText('HIGH SCORE: ' + app.highScore, app.W / 2, 272);
    }

    drawButtons();
  }

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

  function buttonCenterY(index) {
    return app.H / 2 + (index - (ITEMS.length - 1) / 2) * 36;
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

  function drawButton(index) {
    const isSelected = index === selected;
    const y = buttonCenterY(index);
    const left = 96;
    const right = 384;
    const top = y - 12;
    const bottom = y + 12;

    // Body
    h.setColor(isSelected ? 1 : 0).fillRect(left, top, right, bottom);

    // Corner brackets
    h.setColor(isSelected ? 3 : 2);
    drawCorners(left, top, right, bottom, isSelected ? 18 : 14);
    if (isSelected) drawCorners(left + 4, top + 4, right - 4, bottom - 4, 10);

    // Row text
    h.setFontMonofonto16()
      .setFontAlign(0, 0)
      .setColor(isSelected ? 3 : 2)
      .drawString(ITEMS[index], app.W / 2, y + 1);
  }

  function drawButtons() {
    Pip.lastFlip = getTime();

    for (let i = 0; i < ITEMS.length; i++) drawButton(i);

    h.flip();
  }

  function drawOutlinedText(text, x, y) {
    h.setColor(0);

    for (let dx = -1; dx < 2; dx++) {
      for (let dy = -1; dy < 2; dy++) {
        if (dx || dy) h.drawString(text, x + dx, y + dy);
      }
    }

    h.setColor(3).drawString(text, x, y);
  }

  function move(direction) {
    const previous = selected;

    selected = E.clip(selected + (direction > 0 ? 1 : -1), 0, ITEMS.length - 1);

    if (selected === previous) return;

    sound('HIGHLIGHT');
    drawButtons();
  }

  function onLeftScrollWheel(direction) {
    if (direction) {
      move(direction);
      return;
    }

    sound('TAB');

    if (selected === 0) {
      app.go(app.scenes.PRELOAD);
    } else if (selected === 1) {
      app.go(app.scenes.SETTINGS);
    } else if (selected === 2) {
      app.go(app.scenes.INSTRUCTIONS);
    } else {
      Pip.emit('mode', 1);
    }
  }

  function onRightScrollWheel(direction) {
    if (direction) move(direction);
  }

  function remove() {
    Pip.removeListener('knob1', onLeftScrollWheel);
    Pip.removeListener('knob2', onRightScrollWheel);
  }

  function sound(name) {
    if (app.soundEffects) Pip.playSound(name);
  }

  app.loadData();
  app.stopMusic();
  app.loadMusicSources();

  // Play explosion sfx initial session on menu enter
  if (!app.menuLoaded) {
    app.menuLoaded = true;
    app.playNukeSound(true);
  }

  Pip.onExclusive('knob1', onLeftScrollWheel);
  Pip.onExclusive('knob2', onRightScrollWheel);
  draw();

  return { remove: remove };
});
