// =============================================================================
//  Name: Sukechi
//  Author: Theeohn Megistus
//  License: MIT
//  Repository: https://github.com/Theeohn/Sukechi-3000a
// =============================================================================

(function () {
  // Interior draw-area bounds (inside the border stroke) — reused by movement clipping and erase.
  const D = { x1: 21, y1: 21, x2: 459, y2: 283 };
  // Trail color cycle driven by Knob1 short-press: 0 -> 3 -> 2 -> 1 -> 0 ...
  const PAL = [0, 3, 2, 1];
  const HILITE = [3, 2, 3, 3];

  let cx = 238,
    cy = 150,
    colorIdx = 0,
    eraseStage = 0;

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
      .drawString('by Theeohn', 311, 13);
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(-1, 0)
      .drawString('L.wheel = ^/v', 20, 299);
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, 0)
      .drawString('Click=shading   Hold=erase', 240, 301);
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(1, 0)
      .drawString('R.wheel = </>', 460, 299);
  }

  function drawCursorIndicator() {
    'ram';
    h.setColor(HILITE[PAL[colorIdx]]).drawRect(cx, cy, cx + 3, cy + 3);
  }

  function moveCursor(dx, dy) {
    'ram';
    const nx = E.clip(cx + dx, D.x1, D.x2 - 3);
    const ny = E.clip(cy + dy, D.y1, D.y2 - 3);
    if (nx === cx && ny === cy) return;
    h.setColor(PAL[colorIdx]).fillRect(cx, cy, cx + 3, cy + 3);
    cx = nx;
    cy = ny;
    drawCursorIndicator();
    h.flip();
    Pip.lastFlip = getTime();
  }

  function cycleColor() {
    colorIdx = (colorIdx + 1) % 4;
    drawCursorIndicator();
    h.flip();
    Pip.lastFlip = getTime();
  }

  function eraseStep() {
    if (eraseStage) {
      h.setColor(0).fillRect(D.x1, 153, D.x2, D.y2);
      eraseStage = 0;
    } else {
      h.setColor(0).fillRect(D.x1, D.y1, D.x2, 152);
      eraseStage = 1;
    }
    drawCursorIndicator();
    h.flip();
    Pip.lastFlip = getTime();
  }

  function onKnob1(dir, long) {
    'ram';
    if (dir) moveCursor(0, dir);
    else if (long) eraseStep();
    else cycleColor();
  }

  function onKnob2(dir) {
    'ram';
    if (dir) moveCursor(dir, 0);
  }

  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);

  drawStatic();
  drawCursorIndicator();
  h.flip();
  Pip.lastFlip = getTime();

  return {
    id: 'sukechi',
    fullscreen: true,
    remove: function () {
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      h.clear();
    },
  };
});
