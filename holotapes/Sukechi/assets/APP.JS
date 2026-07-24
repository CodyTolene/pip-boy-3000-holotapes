// =============================================================================
//  Name: Sukechi
//  Author: Theeohn Megistus
//  License: MIT
//  Repository: https://github.com/Theeohn/Sukechi-3000a
// =============================================================================

(function () {
  // Interior draw-area bounds (inside the border stroke) — reused by movement clipping and erase.
  const D = { x1: 21, y1: 21, x2: 459, y2: 283 };
  // Trail color cycle driven by Knob1 short-press: 3 -> 2 -> 1 -> 0 ...
  const PAL = [3, 2, 1, 0];
  const HILITE = [3, 3, 3, 1];
  // SD card paths for autosave — raw screen dump plus the tiny cursor/color state.
  const SAVE = {
    img: 'HOLO/SUKECHI/SUKECHI.IMG',
    json: 'HOLO/SUKECHI/SUKECHI.JSON',
  };

  let cx = 238,
    cy = 150,
    colorIdx = 0,
    eraseStage = 0,
    saveInterval,
    indicatorTimeout;

  function drawStatic() {
    h.clear(0);
    h.setColor(3).drawRect(20, 20, 460, 284);
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(0, 0)
      .drawString('SUKECHI', 240, 12);
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 0)
      .drawString('by Theeohn', 336, 13);
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(-1, 0)
      .drawString('L.wheel = ^/v', 20, 298);
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, 0)
      .drawString('Click=shading   Hold=erase', 240, 295);
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(1, 0)
      .drawString('R.wheel = </>', 460, 298);
  }

  // Bright right after a save, fades to dim "Autosave" 0.5s later until the next cycle.
  function drawAutosaveIndicator(txt, color) {
    h.setFontMonofonto14();
    const m = h.stringMetrics('Autosaving');

    const yTop = Math.max(0, Math.floor(13 - m.height / 2));
    h.setColor(0).fillRect(180 - m.width - 2, yTop, 180, 19);

    h.setColor(color).setFontAlign(1, 0).drawString(txt, 180, 13);
  }

  // Shows which of the four shades is currently active. Redrawn only on color change.
  function drawShadeIndicator() {
    h.setFontMonofonto14();
    const m = h.stringMetrics('Shade 0');
    const yTop = Math.max(0, Math.floor(313 - m.height / 2));
    h.setColor(0).fillRect(
      240 - m.width / 2 - 2,
      yTop,
      240 + m.width / 2 + 2,
      yTop + m.height + 2,
    );
    h.setColor(3)
      .setFontAlign(0, 0)
      .drawString('Shade ' + PAL[colorIdx], 240, 313);
  }

  function saveScreen() {
    try {
      require('fs').mkdirSync('SETTINGS');
    } catch (e) {}
    try {
      const a = new Uint8Array(h.buffer);
      const f = E.openFile(SAVE.img, 'w');
      for (let o = 0; o < a.length; o += 2048)
        f.write(E.toString(a.slice(o, o + 2048)));
      f.close();
      require('fs').writeFileSync(
        SAVE.json,
        JSON.stringify({ cx: cx, cy: cy, colorIdx: colorIdx }),
      );
    } catch (e) {
      Pip.log('Sukechi save failed: ' + e, 'SUKECHI');
    }
  }

  function loadScreen() {
    try {
      const a = new Uint8Array(h.buffer);
      const f = E.openFile(SAVE.img, 'r');
      let o = 0,
        chunk = f.read(1024);
      while (chunk) {
        a.set(E.toUint8Array(chunk), o);
        o += chunk.length;
        chunk = f.read(1024);
      }
      f.close();
      if (o !== a.length) return false;
      const s = JSON.parse(require('fs').readFileSync(SAVE.json));
      cx = s.cx;
      cy = s.cy;
      colorIdx = s.colorIdx;
      return true;
    } catch (e) {
      Pip.log('Sukechi load failed: ' + e, 'SUKECHI');
      return false;
    }
  }

  function autosave() {
    drawAutosaveIndicator('Autosaving', 3);
    h.flip();
    Pip.lastFlip = getTime();
    saveScreen();
    indicatorTimeout = setTimeout(function () {
      drawAutosaveIndicator('Autosave', 1);
      h.flip();
      Pip.lastFlip = getTime();
    }, 500);
  }

  function drawCursorIndicator() {
    'ram';
    h.setColor(HILITE[PAL[colorIdx]]).drawRect(cx, cy, cx + 4, cy + 4);
  }

  function moveCursor(dx, dy) {
    'ram';
    const nx = E.clip(cx + dx, D.x1, D.x2 - 4);
    const ny = E.clip(cy + dy, D.y1, D.y2 - 4);
    if (nx === cx && ny === cy) return;
    h.setColor(PAL[colorIdx]).fillRect(cx, cy, cx + 4, cy + 4);
    cx = nx;
    cy = ny;
    drawCursorIndicator();
    h.flip();
    Pip.lastFlip = getTime();
  }

  function cycleColor() {
    colorIdx = (colorIdx + 1) % 4;
    drawCursorIndicator();
    drawShadeIndicator();
    h.flip();
    Pip.lastFlip = getTime();
  }

  function eraseStep() {
    h.setColor(0);
    const blockSize = 16;

    for (let y = D.y1; y <= D.y2; y += blockSize) {
      let row = Math.floor((y - D.y1) / blockSize);

      for (let x = D.x1; x <= D.x2; x += blockSize) {
        let col = Math.floor((x - D.x1) / blockSize);

        if ((row + col) % 2 === eraseStage) {
          let x2 = Math.min(x + blockSize - 1, D.x2);
          let y2 = Math.min(y + blockSize - 1, D.y2);

          h.fillRect(x, y, x2, y2);
        }
      }
    }

    eraseStage = eraseStage === 0 ? 1 : 0;

    drawCursorIndicator();
    h.flip();
    Pip.lastFlip = getTime();
  }

  function onKnob1(dir, long) {
    'ram';
    if (dir) moveCursor(0, dir * 2);
    else if (long) eraseStep();
    else cycleColor();
  }

  function onKnob2(dir) {
    'ram';
    if (dir) moveCursor(dir * 2, 0);
  }

  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);

  if (!loadScreen()) drawStatic();
  drawAutosaveIndicator('Autosave', 1);
  drawCursorIndicator();
  drawShadeIndicator();
  h.flip();
  Pip.lastFlip = getTime();

  saveInterval = setInterval(autosave, 45000);

  return {
    id: 'sukechi',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      if (saveInterval) clearInterval(saveInterval);
      if (indicatorTimeout) clearTimeout(indicatorTimeout);

      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      h.clear();
    },
  };
});
