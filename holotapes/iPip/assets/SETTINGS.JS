// =============================================================================
//  Name: iPip Media Player
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app) {
  const ROWS = ['sort', 'brightness', 'volume', 'back'];
  const BRIGHT_LEVELS = [0.01, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

  let selected = 0;

  function adjust(dir) {
    const row = ROWS[selected];
    if (row === 'sort') {
      app.sortDir = app.sortDir > 0 ? -1 : 1;
      global.__iPipSort = app.sortDir;
      sound('TAB');
    } else if (row === 'brightness') {
      stepBright(dir > 0 ? 1 : -1);
      sound('HIGHLIGHT');
    } else if (row === 'volume') {
      app.currentVol = E.clip(readVol() + (dir > 0 ? 1 : -1), 0, 27);
      try {
        Pip.setVol(app.currentVol);
      } catch (e) {}
      sound('HIGHLIGHT');
    }
    draw();
  }

  function back() {
    sound('TAB');
    app.go(app.scenes.MUSIC || 'MUSIC.JS');
  }

  function draw() {
    h.clear(1);
    try {
      Pip.renderHeader();
      Pip.renderFooter();
    } catch (e) {
      h.setColor(1)
        .drawLine(0, 39, app.W - 1, 39)
        .drawLine(0, app.H - 30, app.W - 1, app.H - 30);
    }

    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(-1, -1)
      .drawString('iPip Settings Menu', 18, 52);
    h.setColor(1).drawLine(12, 74, app.W - 12, 74);

    for (let i = 0; i < ROWS.length; i++) drawRow(i);

    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawRow(i) {
    const y = 88 + i * 44;
    const row = ROWS[i];
    const on = i === selected;
    let val = '';

    if (on) h.setColor(1).fillRect(14, y, app.W - 14, y + 34);

    if (row === 'sort') val = app.sortDir > 0 ? 'A-Z' : 'Z-A';
    else if (row === 'brightness') val = Math.round(readBright() * 100) + '%';
    else if (row === 'volume') val = '' + readVol();
    else val = 'RETURN';

    h.setColor(on ? 3 : 2)
      .setFontMonofonto14()
      .setFontAlign(-1, -1)
      .drawString(label(row), 24, y + 8)
      .setFontAlign(1, -1)
      .drawString(val, app.W - 28, y + 8);
  }

  function label(row) {
    if (row === 'sort') return 'SONG SORT ORDER';
    if (row === 'brightness') return 'SCREEN BRIGHTNESS';
    if (row === 'volume') return 'AUDIO VOLUME';
    return 'BACK TO MUSIC';
  }

  function move(dir) {
    selected += dir > 0 ? 1 : -1;
    if (selected < 0) selected = 0;
    if (selected >= ROWS.length) selected = ROWS.length - 1;
    draw();
    sound('HIGHLIGHT');
  }

  function onKnob1(dir) {
    if (dir) move(dir);
    else if (ROWS[selected] === 'back') back();
    else adjust(1);
  }

  function onKnob2(dir) {
    if (dir) adjust(dir);
  }

  function readBright() {
    if (typeof app.currentBright === 'number') return app.currentBright;
    try {
      if (typeof Pip.brightness === 'number') return Pip.brightness;
    } catch (e) {}
    return 1;
  }

  function readVol() {
    if (typeof app.currentVol === 'number') return app.currentVol;
    try {
      if (Pip.settings && typeof Pip.settings.volume === 'number')
        return Pip.settings.volume;
    } catch (e) {}
    return 20;
  }

  function remove() {
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
  }

  function sound(name) {
    try {
      if (Pip.playSound) Pip.playSound(name);
    } catch (e) {}
  }

  function stepBright(dir) {
    let b = readBright(),
      idx = 0,
      diff = 9;
    for (let i = 0; i < BRIGHT_LEVELS.length; i++) {
      if (Math.abs(BRIGHT_LEVELS[i] - b) < diff) {
        diff = Math.abs(BRIGHT_LEVELS[i] - b);
        idx = i;
      }
    }
    idx = E.clip(idx + dir, 0, BRIGHT_LEVELS.length - 1);
    app.currentBright = BRIGHT_LEVELS[idx];
    try {
      Pip.setBrightness(app.currentBright);
    } catch (e) {}
  }

  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  draw();

  return {
    remove: remove,
  };
});
