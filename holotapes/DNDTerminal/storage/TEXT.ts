(function (app: DndApp): DndScene {
  let lines!: string[];
  let offset = 0;
  let selected = 0;

  function draw(): void {
    let row = 0;
    app.frame(
      app.editField.toUpperCase(),
      'L-SCROLL/PRESS    R-CHOOSE BACK/EDIT',
    );
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(0, 0)
      .drawString((selected === 0 ? '> ' : '  ') + 'BACK', 124, 46)
      .drawString((selected === 1 ? '> ' : '  ') + 'EDIT', 356, 46);
    h.setColor(2).setFontMonofonto16().setFontAlign(-1, -1);
    for (row = 0; row < 11 && offset + row < lines.length; row++) {
      h.drawString(lines[offset + row], 16, 72 + row * 18);
    }
  }

  function onLeft(direction: KnobDirection): void {
    if (direction) {
      offset = E.clip(offset + direction, 0, Math.max(0, lines.length - 11));
      draw();
    } else app.go(selected ? 'KEYBOARD.JS' : 'SHEET.JS');
  }

  function onRight(direction: KnobDirection): void {
    if (direction) {
      selected = E.clip(selected + direction, 0, 1);
      draw();
    }
  }

  function remove(): void {
    Pip.removeListener('knob1', onLeft);
    Pip.removeListener('knob2', onRight);
  }

  h.setFontMonofonto16();
  lines = h.wrapString(app.character![app.editField] || '(empty)', 448);
  Pip.onExclusive('knob1', onLeft);
  Pip.onExclusive('knob2', onRight);
  draw();
  return { remove: remove };
});
