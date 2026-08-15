(function () {
  // USB HID usage IDs (HID Usage Table, keyboard/keypad page 0x07):
  //   ENTER 40  ESC 41  BACKSPACE 42  TAB 43  SPACE 44  HOME 74
  //   DELETE 76  END 77  RIGHT 79  LEFT 80  DOWN 81  UP 82
  const KEYS = [43, 44, 76, 42, 74, 77, 41];
  const LABELS = ['TAB', 'SPACE', 'DEL', 'BACK', 'HOME', 'END', 'ESC'];

  // Pip.createKeyboard's grid mapped to HID usage IDs, indexed row * 14 + col.
  // Rows match the firmware KEYMAP: number row, qwerty, asdf, then zxcv.
  // 0 marks the shift cell. Keys are sent by position with a shift modifier, so
  // the host's own layout decides the resulting character.
  const KB = new Uint8Array([
    53, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 45, 46, 42, 44, 20, 26, 8, 21,
    23, 28, 24, 12, 18, 19, 47, 48, 40, 0, 4, 22, 7, 9, 10, 11, 13, 14, 15, 51,
    52, 40, 40, 44, 49, 29, 27, 6, 25, 5, 17, 16, 54, 55, 56, 44, 44,
  ]);

  // Up, down, left and right arrow glyphs. Identical geometry to the Mk V,
  // shifted by (40, 65) -- the origin its 400x210 buffer was blitted at -- so
  // the layout lands on the same screen pixels as the original.
  const ARROWS = [
    [240, 85, 260, 105, 250, 105, 250, 125, 230, 125, 230, 105, 220, 105],
    [240, 245, 260, 225, 250, 225, 250, 205, 230, 205, 230, 225, 220, 225],
    [140, 165, 160, 145, 160, 155, 180, 155, 180, 175, 160, 175, 160, 185],
    [340, 165, 320, 145, 320, 155, 300, 155, 300, 175, 320, 175, 320, 185],
  ];

  const originalIdleTimeout = Pip.settings.idleTimeout;

  let connectInterval, drawTimeout, releaseTimeout;
  let connectTicks = 0;
  let connected = false;
  let keyIndex = 0;
  // Keyboard screen: the picker object, its own knob handlers, and a mirror of
  // its cursor so we know which key a click is about to type.
  let kbd, kbdKnob1, kbdKnob2;
  let kbdRow = 0,
    kbdCol = 0,
    kbdShift = false;

  // A labelled key cap: filled with the highlight colour while held.
  function drawCap(x1, y1, x2, y2, label, on) {
    h.setBgColor(on ? 3 : 1).clearRect(x1, y1, x2, y2);
    h.setColor(0).drawString(label, (x1 + x2) / 2, (y1 + y2) / 2 + 1);
  }

  // Redraw the key map, highlighting index hl (null highlights nothing).
  // Highlights appear on the next tick; clearing them is held back 100ms so a
  // burst of key presses does not flicker.
  function render(hl) {
    if (drawTimeout) clearTimeout(drawTimeout);
    drawTimeout = setTimeout(
      function () {
        drawTimeout = undefined;
        for (let i = 0; i < 4; i++)
          h.setColor(hl === i ? 3 : 1).fillPoly(ARROWS[i]);
        h.setFontMonofonto23().setFontAlign(0, 0);
        drawCap(205, 150, 275, 180, 'ENTER', hl === 4);
        drawCap(315, 210, 385, 240, LABELS[keyIndex], hl === 5);
        h.setBgColor(0);
      },
      hl === null ? 100 : 0,
    );
  }

  // Press and release one key. mod is the HID modifier byte (2 = left shift).
  // hl highlights a cap on the main screen; the keyboard screen passes none.
  function sendKey(code, mod, hl) {
    if (!code) return;
    if (!kbd) render(hl);
    E.sendUSBHID([mod, 0, code, 0, 0, 0, 0, 0]);
    if (releaseTimeout) clearTimeout(releaseTimeout);
    releaseTimeout = setTimeout(function () {
      releaseTimeout = undefined;
      E.sendUSBHID([0, 0, 0, 0, 0, 0, 0, 0]);
      if (!kbd) render(null);
    }, 5);
  }

  function drawMain() {
    h.clear();
    h.setColor(3).setFontAlign(0, -1);
    h.setFontMonofonto23().drawString('PipHID', 240, 14);
    h.setColor(1).setFontMonofonto14();
    h.drawString('DATA: SEND KEY     STATS: SELECT KEY', 240, 284);
    h.drawString('HOLD KNOB: KEYBOARD     ITEMS: EXIT', 240, 300);
    render(null);
  }

  // --- On-screen keyboard ----------------------------------------------------
  // Pip.createKeyboard only reports its text when Enter is chosen, so instead of
  // waiting for that we mirror its cursor and send each key as it is clicked.

  function onKbdKnob1(dir, long) {
    if (!dir) {
      if (long) {
        closeKeyboard();
        return;
      }
      if (kbdRow === 2 && kbdCol === 0) kbdShift = !kbdShift;
      else sendKey(KB[kbdRow * 14 + kbdCol], kbdShift ? 2 : 0);
      kbdKnob1(0);
      return;
    }
    // Clamp to one row per event: the firmware wraps rows with (n + 4 + dir),
    // which underflows on the faster scroll steps the encoder can emit.
    dir = dir > 0 ? 1 : -1;
    kbdRow = (kbdRow + 4 + dir) % 4;
    kbdKnob1(dir);
  }

  function onKbdKnob2(dir) {
    if (!dir) return;
    kbdCol = (kbdCol + dir + 14) % 14;
    kbdKnob2(dir);
  }

  // Enter has already been sent as a keystroke, so start a fresh empty line
  // rather than letting the echo run into the width limit.
  function onKbdEnter() {
    openKeyboard();
  }

  // Pull a knob listener back out of the event store. The firmware keeps these
  // as an array even when only one is attached, so unwrap before calling it.
  function grabKnob(event) {
    const l = Pip['#on' + event];
    return Array.isArray(l) ? l[0] : l;
  }

  function openKeyboard() {
    if (kbd) kbd.remove();
    // Detach first: createKeyboard takes the knobs with Pip.onExclusive, which
    // logs every listener it displaces to errors.txt.
    Pip.removeAllListeners('knob1');
    Pip.removeAllListeners('knob2');
    h.clear();
    kbdRow = 0;
    kbdCol = 0;
    kbdShift = false;
    kbd = Pip.createKeyboard(
      '',
      'TYPES DIRECTLY TO THE CONNECTED TERMINAL',
      onKbdEnter,
    );
    // createKeyboard claims both knobs; wrap its handlers so we see each click
    // first.
    kbdKnob1 = grabKnob('knob1');
    kbdKnob2 = grabKnob('knob2');
    Pip.removeAllListeners('knob1');
    Pip.removeAllListeners('knob2');
    Pip.on('knob1', onKbdKnob1);
    Pip.on('knob2', onKbdKnob2);
    h.setColor(1).setFontMonofonto14().setFontAlign(0, -1);
    h.drawString(
      'KNOB CLICK TYPES     HOLD KNOB: BACK     ITEMS: EXIT',
      240,
      300,
    );
    h.flip();
  }

  function closeKeyboard() {
    kbd.remove();
    kbd = undefined;
    Pip.removeAllListeners('knob1');
    Pip.removeAllListeners('knob2');
    Pip.on('knob1', onKnob1);
    Pip.on('knob2', onKnob2);
    drawMain();
  }

  // --- Main screen input -----------------------------------------------------

  function onKnob1(dir, long) {
    if (!connected) return;
    if (dir > 0) sendKey(81, 0, 1);
    else if (dir < 0) sendKey(82, 0, 0);
    else if (long) openKeyboard();
    else sendKey(40, 0, 4);
  }

  function onKnob2(dir) {
    if (!connected || !dir) return;
    if (dir < 0) sendKey(80, 0, 2);
    else sendKey(79, 0, 3);
  }

  // STATS and DATA normally switch mode and drop straight out of the app. This
  // runs ahead of the OS handler and swallows both so they can drive the
  // terminal instead. ITEMS is left alone and remains the way out.
  function onMode(m) {
    if (m === 1) return;
    E.stopEventPropagation();
    if (!connected || kbd) return;
    if (m === 0) {
      keyIndex = (keyIndex + 1) % 7;
      Pip.playSound('SCROLL');
      render(null);
    } else {
      sendKey(KEYS[keyIndex], 0, 5);
    }
  }

  function drawConnecting() {
    h.clear();
    h.setColor(3).setFontAlign(0, -1);
    h.setFontMonofonto28().drawString('PipHID', 240, 60);
    h.setFontMonofonto23().drawString(
      'Connecting' + ['.  ', '.. ', '...'][connectTicks % 3],
      240,
      180,
      true,
    );
    h.setFontMonofonto16().drawString('Please reconnect USB', 240, 212, true);
    h.setColor(1).setFontMonofonto14().drawString('ITEMS: EXIT', 240, 300);
  }

  function onConnected() {
    if (connectInterval) clearInterval(connectInterval);
    connectInterval = undefined;
    connected = true;
    drawMain();
  }

  // The HID descriptor only takes effect once the host re-enumerates the
  // device, so poll until a report is actually accepted.
  function pollConnect() {
    connectTicks++;
    if (E.sendUSBHID([0, 0, 0, 0, 0, 0, 0, 0])) onConnected();
    else drawConnecting();
  }

  // --- Init ------------------------------------------------------------------
  Pip.settings.idleTimeout = 0;
  // Boot-protocol keyboard: 1 modifier byte, 1 reserved byte, 6 key slots.
  E.setUSBHID({
    reportDescriptor: atob(
      'BQEJBqEBdQGVCAUHGeAp5xUAJQGBApUBdQiBA5UFdQEFCBkBKQWRApUBdQORA5UGdQgVACVoBQcZAClogQDA',
    ),
  });
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  Pip.prependListener('mode', onMode);
  connectInterval = setInterval(pollConnect, 1000);
  pollConnect();

  return {
    id: 'piphid',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      if (connectInterval) clearInterval(connectInterval);
      if (drawTimeout) clearTimeout(drawTimeout);
      if (releaseTimeout) clearTimeout(releaseTimeout);
      if (kbd) kbd.remove();
      Pip.removeListener('mode', onMode);
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      Pip.removeListener('knob1', onKbdKnob1);
      Pip.removeListener('knob2', onKbdKnob2);
      // Release any held key, then drop the HID profile so the next re-plug
      // enumerates as a normal Pip-Boy again.
      E.sendUSBHID([0, 0, 0, 0, 0, 0, 0, 0]);
      E.setUSBHID();
      Pip.settings.idleTimeout = originalIdleTimeout;
      h.clear();
    },
  };
});
