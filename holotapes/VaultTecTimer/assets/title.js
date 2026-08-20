// =============================================================================
//  Name: Vault-Tec Timer, title screen
//  Authors: @Theeohn, @trekker87
//  License: MIT
//  Repository: https://github.com/Theeohn/Vault-Tec-Timer-3000a
// =============================================================================

(function (goTo) {
  const C = {
    OPTIONS: ['TIMER', 'STOPWATCH'],
    TARGETS: ['HOLO/VAULT_TEC_TIMER/TIMER.JS', 'HOLO/VAULT_TEC_TIMER/STOPWATCH.JS'],
    BOX_Y1: 263,
    BOX_Y2: 303,
  };

  let selected = 0;
  let bxX1, bxX2;

  function drawBackground() {
    let file = E.openFile('HOLO/VAULT_TEC_TIMER/title.bin', 'r');
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

  function drawTitleCard() {
    const title = 'VAULT-TEC TIMER';
    const tw = h.setFontMonofonto36().stringWidth(title);
    const bx1 = 240 - tw / 2 - 14;
    const bx2 = 240 + tw / 2 + 14;

    h.setColor(3).setFontMonofonto36().setFontAlign(0, 0).drawString(title, 240, 40);

    h.setColor(1).setFontMonofonto16().setFontAlign(0, 1).drawString("A product of Vault 919", 375, 80);

  }

  // Computes the fixed x-bounds for the TIMER/STOPWATCH boxes
  function layoutSelector() {
    h.setFontMonofonto23();
    const pad = 16, gap = 24;
    const w0 = h.stringWidth(C.OPTIONS[0]) + pad * 2;
    const w1 = h.stringWidth(C.OPTIONS[1]) + pad * 2;
    const x0 = 240 - (w0 + gap + w1) / 2;
    bxX1 = [x0, x0 + w0 + gap];
    bxX2 = [x0 + w0, x0 + w0 + gap + w1];
  }

  // Draws both selector boxes for the current `selected` state
  function drawSelector() {  "ram";
    h.setFontMonofonto23();
    for (let i = 0; i < 2; i++) {
      Pip.shadeBox(bxX1[i], C.BOX_Y1, bxX2[i], C.BOX_Y2);
      h.setColor(i === selected ? 3 : 0);
      for (let o = 1; o <= 3; o++) h.drawRect(bxX1[i] - o, C.BOX_Y1 - o, bxX2[i] + o, C.BOX_Y2 + o);
      h.setColor(3).setFontMonofonto23().setFontAlign(0, 0)
        .drawString(C.OPTIONS[i], (bxX1[i] + bxX2[i]) / 2, (C.BOX_Y1 + C.BOX_Y2) / 2);
    }
  }

  function redrawSelector() {
    drawSelector();
    Pip.blitOptions.y1 = C.BOX_Y1 - 3;
    Pip.blitOptions.y2 = C.BOX_Y2 + 3;
    h.flip();
    Pip.lastFlip = getTime();
    delete Pip.blitOptions.y1;
    delete Pip.blitOptions.y2;
  }

  function moveCursor(dir) {
    const next = dir > 0 ? 1 : 0;
    if (next === selected) return;
    selected = next;
    Pip.playSound('SCROLL');
    redrawSelector();
  }

  function onKnob1(dir) {
    if (dir) {
      moveCursor(dir);
    } else {
      Pip.playSound('TAB');
      goTo(C.TARGETS[selected]);
    }
  }

  function onKnob2(dir) {
    if (dir) moveCursor(dir);
  }

  Pip.audioStop();
  drawBackground();
  drawTitleCard();
  layoutSelector();
  drawSelector();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  h.flip();
  Pip.lastFlip = getTime();

  return {
    remove: function () {
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      h.clear();
    },
  };
});