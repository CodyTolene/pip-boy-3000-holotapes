// =============================================================================
//  Name: Piptris
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app) {
  const ROWS = ['CRT', 'VOLUME', 'SOUND', 'MUSIC', 'BACK'];

  let selected = 0;

  function adjust(direction) {
    const row = ROWS[selected];

    if (row === 'SOUND') {
      app.soundEffects = !app.soundEffects;
      Pip.playSound('HIGHLIGHT');
      app.saveData();
    } else if (row === 'MUSIC') {
      app.musicSource += direction > 0 ? 1 : -1;

      if (app.musicSource < 0) {
        app.musicSource = app.musicSources.length - 1;
      } else if (app.musicSource >= app.musicSources.length) {
        app.musicSource = 0;
      }

      sound('HIGHLIGHT');
      app.saveData();
    } else if (row === 'VOLUME') {
      app.currentVol = E.clip(app.currentVol + (direction > 0 ? 1 : -1), 0, 27);

      try {
        Pip.setVol(app.currentVol);
      } catch (e) {}

      sound('HIGHLIGHT');
    } else if (row === 'CRT') {
      app.displayClean = !app.displayClean;
      app.applyDisplay();
      sound('HIGHLIGHT');
      app.saveData();
    } else {
      return;
    }

    if (row === 'SOUND' || row === 'MUSIC') {
      draw();
    } else {
      drawButtons();
    }
  }

  function draw() {
    drawBackground();
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
    return app.H / 2 + (index - (ROWS.length - 1) / 2) * 32;
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
      .drawString(rowText(index), app.W / 2, y + 1);
  }

  function drawButtons() {
    Pip.lastFlip = getTime();

    for (let i = 0; i < ROWS.length; i++) drawButton(i);

    drawNotice();
    h.flip();
  }

  function drawNotice() {
    // Nuke SFX is skipped while music plays (no audio overlap yet).
    if (!app.soundEffects || app.musicSources[app.musicSource] === 'OFF') {
      return;
    }

    h.setColor(0).fillRect(96, 248, 384, 294);
    h.setColor(1).drawRect(96, 248, 384, 294);

    h.setFontMonofonto14().setFontAlign(0, 0);
    h.setColor(3).drawString('NUKE SFX NEEDS MUSIC OFF', app.W / 2, 264);
    h.setColor(2).drawString('(NO OVERLAPPING AUDIO YET)', app.W / 2, 282);
  }

  function onLeftScrollWheel(direction) {
    if (direction) {
      const previous = selected;

      selected = E.clip(
        selected + (direction > 0 ? 1 : -1),
        0,
        ROWS.length - 1,
      );

      if (selected === previous) return;

      sound('HIGHLIGHT');
      drawButtons();
      return;
    }

    if (ROWS[selected] === 'BACK') {
      sound('TAB');
      app.go(app.scenes.MENU);
      return;
    }

    adjust(1);
  }

  function onRightScrollWheel(direction) {
    if (direction) adjust(direction);
  }

  function remove() {
    Pip.removeListener('knob1', onLeftScrollWheel);
    Pip.removeListener('knob2', onRightScrollWheel);
  }

  function rowText(index) {
    const row = ROWS[index];

    if (row === 'SOUND') {
      return 'SOUND FX: ' + (app.soundEffects ? 'ON' : 'OFF');
    }

    if (row === 'MUSIC') {
      let value = app.musicSources[app.musicSource];

      if (value === 'PIPTRIS') value += '/';
      else if (value !== 'OFF') value = value.slice(6);

      return 'MUSIC: ' + value.slice(0, 18);
    }

    if (row === 'VOLUME') return 'VOLUME: ' + app.currentVol;
    if (row === 'CRT') return 'CRT: ' + (app.displayClean ? 'OFF' : 'ON');

    return 'BACK';
  }

  function sound(name) {
    if (app.soundEffects) Pip.playSound(name);
  }

  Pip.onExclusive('knob1', onLeftScrollWheel);
  Pip.onExclusive('knob2', onRightScrollWheel);
  draw();

  return { remove: remove };
});
