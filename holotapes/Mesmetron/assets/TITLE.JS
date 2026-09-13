// MESMETRON title/menu screen.
//
// This is the SINGLE list of available screensavers - app.js has no list of
// its own, it just reads .file off of whichever item is currently selected.
// That means adding a new screensaver only ever requires editing ONE file:
// this one. See the ITEMS array below.

(function () {
  // To add your own screensaver:
  //   1. Copy an existing module file (e.g. web.js) as a template, following
  //      its { init(variant), draw(h) } shape.
  //   2. Add one line below: { name: "YOUR NAME", file: "YOURFILE.JS" }.
  //      Order doesn't matter - insert it anywhere in the list.
  //   3. That's it. app.js will load "YOURFILE.JS" automatically once your
  //      entry is selected - nothing in app.js needs to change.
  // If the file named here doesn't actually exist on disk, app.js catches
  // that when you select it - it shows Pip's standard error box instead of
  // crashing, and drops you back at this menu so you can try something else.
  const ITEMS = [
    { name: 'BOUNCER', file: 'bouncer.js' },
    { name: 'BURST', file: 'burst.js' },
    { name: 'FIREWORKS', file: 'fireworks.js' },
    { name: 'MATRIX', file: 'matrix.js' },
    { name: 'RIBBON', file: 'ribbon.js' },
    { name: 'SPIRAL', file: 'spiral.js' },
    { name: 'SHAPES', file: 'shapes.js' },
    { name: 'VORTEX', file: 'vortex.js' },
    { name: 'WARP', file: 'warp.js' },
    { name: 'WEB', file: 'web.js' },
  ];
  const BX1 = 90,
    BY1 = 138,
    BX2 = 390,
    BY2 = 280;
  const ROWY0 = 163,
    ROWH = 30;
  // Footer hint box - same width as the list box, sitting just below it.
  // Drawn once from repaint(), never touched by move()/scroll, so it can't
  // be scrolled to or selected.
  const HY1 = BY2 + 1,
    HY2 = 316;

  const HINT = [
    'HOLD LEFT WHEEL TO RESTORE NORMALITY',
    'RIGHT WHEEL VIBES, LEFT WHEEL BLINDS',
  ];
  const LINEH = h.setFont('Monofonto14').stringMetrics(HINT[0]).height + 1;
  let selected = 0;
  let scroll = 0;

  function drawBackground() {
    let file = E.openFile('HOLO/MESMETRON/MSMR.BIN', 'r');
    let target = new Uint8Array(h.buffer);
    let offset = target.length;
    let chunk = file.read(256);
    while (chunk) {
      offset -= chunk.length;
      target.set(chunk, offset);
      chunk = file.read(256);
    }
    file.close();
  }

  function drawBorder() {
    h.setColor(3);
    h.drawRect(BX1, BY1, BX2, BY2);
    h.drawRect(BX1 + 1, BY1 + 1, BX2 - 1, BY2 - 1);
  }

  function drawHint() {
    h.setColor(0).fillRect(BX1 + 2, HY1 + 2, BX2 - 2, HY2 - 2);
    h.setColor(2);
    h.drawRect(BX1, HY1, BX2, HY2);
    h.drawRect(BX1 + 1, HY1 + 1, BX2 - 1, HY2 - 1);
    h.setFont('Monofonto14').setFontAlign(0, 0);
    const y0 = (HY1 + HY2) / 2 - (LINEH * (HINT.length - 1)) / 2 + 3;
    for (let i = 0; i < HINT.length; i++)
      h.drawString(HINT[i], 240, y0 + i * LINEH);
  }

  function drawList() {
    h.setColor(0).fillRect(BX1 + 2, BY1 + 2, BX2 - 2, BY2 - 2);
    h.setFont('Monofonto23').setFontAlign(0, 0);

    for (let i = 0; i < 4 && scroll + i < ITEMS.length; i++) {
      const idx = scroll + i;
      const cy = ROWY0 + i * ROWH;
      const isSelected = idx === selected;

      if (isSelected) {
        h.setColor(3).fillRect(BX1 + 6, cy - 14, BX2 - 6, cy + 14);
        h.setColor(0).drawString(ITEMS[idx].name, 240, cy);
      } else {
        h.setColor(3).drawString(ITEMS[idx].name, 240, cy);
      }

      // In-line scroll indicators
      const leftX = BX1 + 24;
      const rightX = BX2 - 24;

      // Up indicator on the first visible row if we can scroll up
      if (i === 0 && scroll > 0) {
        h.setColor(isSelected ? 0 : 3);
        for (let dy = 0; dy < 15; dy++) {
          let w = dy >> 1;
          let y = cy - 7 + dy;
          h.drawLine(leftX - w, y, leftX + w, y);
          h.drawLine(rightX - w, y, rightX + w, y);
        }
      }

      // Down indicator on the fourth visible row if we can scroll down
      if (i === 3 && scroll + 4 < ITEMS.length) {
        h.setColor(isSelected ? 0 : 3);
        for (let dy = 0; dy < 15; dy++) {
          let w = dy >> 1;
          let y = cy + 7 - dy;
          h.drawLine(leftX - w, y, leftX + w, y);
          h.drawLine(rightX - w, y, rightX + w, y);
        }
      }
    }
  }

  return {
    id: 'MESMETRON_MENU',
    remove: function () {},
    items: ITEMS,
    repaint: function () {
      drawBackground();
      drawBorder();
      drawHint();
    },
    init: function (startIndex) {
      selected = E.clip(startIndex || 0, 0, ITEMS.length - 1);
      scroll = selected > 3 ? selected - 3 : 0;
      if (scroll > ITEMS.length - 4) scroll = Math.max(0, ITEMS.length - 4);
      this.repaint();
    },
    move: function (dir) {
      selected = E.clip(selected + dir, 0, ITEMS.length - 1);
      if (selected < scroll) {
        scroll = selected;
      } else if (selected >= scroll + 4) {
        scroll = selected - 3;
      }
      if (scroll > ITEMS.length - 4) scroll = Math.max(0, ITEMS.length - 4);
      if (scroll < 0) scroll = 0;
    },
    getSelected: function () {
      return selected;
    },
    draw: function (h) {
      'ram';
      drawList();
    },
  };
});
