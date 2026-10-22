(function (app: DndApp): DndScene {
  /**
   * \b   = delete
   * \x02 = shift
   * \x03 = accept
   * \x04 = cancel
   * Bottom row has two wide keys, CANCEL and OK.
   */
  const keys = {
    lower: [
      '`1234567890-=\b',
      ' qwertyuiop[]\x03',
      "\x02asdfghjkl;'\x03\x03",
      ' \\zxcvbnm,./  ',
      '\x04\x04\x04\x04\x04\x04\x04\x03\x03\x03\x03\x03\x03\x03',
    ],
    upper: [
      '~!"#$%^&*()_+\b',
      ' QWERTYUIOP{}\x03',
      '\x02ASDFGHJKL:@\x03\x03',
      ' |ZXCVBNM<>?  ',
      '\x04\x04\x04\x04\x04\x04\x04\x03\x03\x03\x03\x03\x03\x03',
    ],
  };
  let row = 1;
  let column = 0;
  let upper = false;
  let cursor = false;
  let blink: number | null = null;
  let text = app.character![app.editField];

  function drawText(): void {
    h.setColor(0).fillRect(12, 34, 468, 96);
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(-1, 0)
      .drawString(text.slice(-44) + (cursor ? '_' : ''), 18, 52);
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, 0)
      .drawString(text.length + '/' + limit(), 240, 86);
  }

  function limit(): number {
    return app.editField === 'name'
      ? 40
      : app.editField === 'conditions'
        ? 120
        : 240;
  }

  function keyAt(y: number, x: number): string {
    return (upper ? keys.upper : keys.lower)[y][x];
  }

  function keyLabel(key: string): string {
    return key === '\b'
      ? 'DEL'
      : key === '\x02'
        ? '^'
        : key === '\x03'
          ? 'OK >'
          : key === '\x04'
            ? '< CANCEL'
            : key === ' '
              ? 'SP'
              : key;
  }

  function drawKeys(): void {
    let y = 0;
    let x = 0;
    let end = 0;
    let key = '';
    let active = false;
    for (y = 0; y < 5; y++) {
      for (x = 0; x < 14; x = end + 1) {
        key = keyAt(y, x);
        end = x;
        if (y === 4) while (end < 13 && keyAt(y, end + 1) === key) end++;
        active = row === y && column >= x && column <= end;
        h.setColor(active ? 3 : 0).fillRect(
          16 + x * 32,
          110 + y * 36,
          46 + end * 32,
          144 + y * 36,
        );
        h.setColor(active ? 0 : 2)
          .setFontMonofonto14()
          .setFontAlign(0, 0)
          .drawString(keyLabel(key), 31 + (x + end) * 16, 127 + y * 36);
      }
    }
  }

  function tick(): void {
    cursor = !cursor;
    drawText();
  }

  function onLeft(direction: KnobDirection, long?: boolean): void {
    if (direction) row = (row + direction + 5) % 5;
    else if (long) upper = !upper;
    else {
      const key = keyAt(row, column);
      if (key === '\x02') upper = !upper;
      else if (key === '\x04') {
        app.go('SHEET.JS');
        return;
      } else if (key === '\x03') {
        app.character![app.editField] =
          app.editField === 'name' ? text.trim() : text;
        app.dirty = true;
        app.go('SHEET.JS');
        return;
      } else if (key === '\b') text = text.slice(0, -1);
      else if (text.length < limit()) text += key;
    }
    drawText();
    drawKeys();
  }

  function onRight(direction: KnobDirection): void {
    const step = direction > 0 ? 1 : -1;
    const key = keyAt(row, column);
    if (!direction) return;
    column = (column + direction + 14) % 14;
    if (row === 4)
      while (keyAt(row, column) === key) column = (column + step + 14) % 14;
    drawKeys();
  }

  function remove(): void {
    if (blink !== null) clearInterval(blink);
    blink = null;
    Pip.removeListener('knob1', onLeft);
    Pip.removeListener('knob2', onRight);
  }

  Pip.onExclusive('knob1', onLeft);
  Pip.onExclusive('knob2', onRight);
  app.frame(
    'EDIT ' + app.editField.toUpperCase(),
    'L-ROW/PRESS KEY   R-COLUMN   L-HOLD CASE',
  );
  drawText();
  drawKeys();
  blink = setInterval(tick, 600);
  return { remove: remove };
});
