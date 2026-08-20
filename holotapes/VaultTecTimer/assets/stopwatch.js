// =============================================================================
//  Name: Vault-Tec Timer, Stopwatch
//  Authors: @Theeohn, @trekker87
//  License: MIT
//  Repository: https://github.com/Theeohn/Vault-Tec-Timer-3000a
// =============================================================================

(function (goTo) {
  const C = {
    FIELD_X: [152, 240, 328],
    FIELD_Y: 160,
    FIELD_LABELS: ['h', 'm', 's'],
    SIDE_W: 50,
    MENU_CX: 90,
    RESET_CX: 390,
    SIDE_Y1: 220,
    SIDE_Y2: 244,
    START_Y1: 198,
    START_Y2: 232,
    LAP_Y1: 240,
    LAP_Y2: 264,
    LAPCOUNT_Y: 282,
    LAPVIEW_Y: 302,
  };

  let running = false;
  let elapsed = 0; // seconds
  let laps = [];
  let lapView = 0;
  let row = 0; // 0 = start/stop, 1 = lap, 2 = lap list (only if laps exist)
  let focus = 'stack';
  let ticker, redrawInterval;

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function fmt(sec) {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return pad(hrs) + ':' + pad(mins) + ':' + pad(secs);
  }

  function maxRow() {
    return laps.length ? 2 : 1;
  }

  function rowEnabled(r) {
    if (r === 1) return running;
    return true;
  }

  function drawButton(cx, y1, y2, w, label, font, focused, enabled) {
    h.setColor(2).drawRect(cx - w, y1, cx + w, y2);
    if (enabled && focused) {
      h.setColor(3);
      for (let o = 1; o <= 3; o++) h.drawRect(cx - w - o, y1 - o, cx + w + o, y2 + o);
    }
    h.setColor(enabled ? 3 : 2);
    if (font === 28) h.setFontMonofonto28(); else h.setFontMonofonto18();
    h.setFontAlign(0, 0).drawString(label, cx, (y1 + y2) / 2);
  }

  const NUM_FONT_SIZE = 36, LETTER_FONT_SIZE = 28;
  const LETTER_Y_OFFSET = (NUM_FONT_SIZE - LETTER_FONT_SIZE) / 2;

  function drawField(x, y, numStr, letterStr) {
    const numW = h.setFontMonofonto36().stringWidth(numStr);
    const letterW = h.setFontMonofonto28().stringWidth(letterStr);
    const startX = x - (numW + letterW) / 2;
    h.setColor(3).setFontMonofonto36().setFontAlign(-1, 0).drawString(numStr, startX, y);
    h.setColor(3).setFontMonofonto28().setFontAlign(-1, 0)
      .drawString(letterStr, startX + numW, y + LETTER_Y_OFFSET);
  }

  function draw() {  "ram";
    h.clear(1);
    h.setColor(3).setFontMonofonto36().setFontAlign(0, 0).drawString('STOPWATCH', 240, 47);

    const hrs = Math.floor(elapsed / 3600);
    const mins = Math.floor((elapsed % 3600) / 60);
    const secs = elapsed % 60;
    const vals = [hrs, mins, secs];
    for (let i = 0; i < 3; i++) {
      drawField(C.FIELD_X[i], C.FIELD_Y - 25, pad(vals[i]), C.FIELD_LABELS[i]);
    }

    // Main vertical stack: START/STOP, LAP
    drawButton(240, C.START_Y1, C.START_Y2, 90, running ? 'STOP' : 'START', 28, focus === 'stack' && row === 0, true);
    drawButton(240, C.LAP_Y1, C.LAP_Y2, 70, 'LAP', 18, focus === 'stack' && row === 1, running);

    // MENU and RESET sit off to the sides, mirrored, reached via knob2.
    drawButton(C.MENU_CX, C.SIDE_Y1, C.SIDE_Y2, C.SIDE_W, 'MENU', 18, focus === 'menu', true);
    drawButton(C.RESET_CX, C.SIDE_Y1, C.SIDE_Y2, C.SIDE_W, 'RESET', 18, focus === 'reset', elapsed > 0);

    if (laps.length) {
      h.setColor(2).setFontMonofonto14().setFontAlign(0, 0)
        .drawString('LAP ' + (lapView + 1) + ' OF ' + laps.length, 240, C.LAPCOUNT_Y);
      h.setColor(focus === 'stack' && row === 2 ? 3 : 2).setFontMonofonto16().setFontAlign(0, 0)
        .drawString('<  ' + laps[lapView] + '  >', 240, C.LAPVIEW_Y);
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  function leaveForMenu() {
    if (ticker) clearInterval(ticker);
    running = false;
    Pip.playSound('TAB');
    goTo('HOLO/VAULT_TEC_TIMER/TITLE.JS');
  }

  function doReset() {
    if (elapsed <= 0) return;
    if (ticker) clearInterval(ticker);
    running = false;
    elapsed = 0;
    laps = [];
    lapView = 0;
    row = 0;
    focus = 'stack';
    Pip.playSound('TAB');
    draw();
  }

  function onPress() {
    if (focus === 'menu') {
      leaveForMenu();
      return;
    }
    if (focus === 'reset') {
      doReset();
      return;
    }

    if (row === 0) {
      running = !running;
      Pip.playSound('TAB');
      if (running) {
        ticker = setInterval(function () {
          elapsed++;
          draw();
        }, 1000);
      } else {
        clearInterval(ticker);
      }
      draw();
    } else if (row === 1) {
      if (!running) return;
      laps.push(fmt(elapsed));
      lapView = laps.length - 1;
      Pip.playSound('TAB');
      draw();
    }
  }

  function onKnob1(dir) {
    if (dir) {
      if (focus !== 'stack') return;
      const top = maxRow();
      let next = row, found = false;
      for (let i = 0; i < top + 1; i++) {
        const candidate = next + dir;
        if (candidate < 0 || candidate > top) break;
        next = candidate;
        if (rowEnabled(next)) { found = true; break; }
      }
      if (found) {
        row = next;
        Pip.playSound('SCROLL');
        draw();
      }
    } else {
      onPress();
    }
  }

  function onKnob2(dir) {
    if (focus === 'menu') {
      if (dir > 0) {
        focus = 'stack';
        Pip.playSound('SCROLL');
        draw();
      }
      return;
    }
    if (focus === 'reset') {
      if (dir < 0) {
        focus = 'stack';
        Pip.playSound('SCROLL');
        draw();
      }
      return;
    }
    if (row === 2 && laps.length) {
      lapView = E.clip(lapView + dir, 0, laps.length - 1);
      Pip.playSound('SCROLL');
      draw();
      return;
    }
    if (dir < 0) {
      focus = 'menu';
      Pip.playSound('SCROLL');
      draw();
    } else if (dir > 0 && (row === 0 || row === 1) && elapsed > 0) {
      focus = 'reset';
      Pip.playSound('SCROLL');
      draw();
    }
  }

  Pip.audioStop();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  redrawInterval = setInterval(draw, 1000);
  draw();

  return {
    remove: function () {
      clearInterval(redrawInterval);
      if (ticker) clearInterval(ticker);
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      Pip.audioStop();
      h.clear();
    },
  };
});