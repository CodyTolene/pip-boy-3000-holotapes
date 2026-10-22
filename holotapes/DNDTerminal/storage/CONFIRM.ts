(function (app: DndApp): DndScene {
  let selected = 0;
  let pressWatch: number | null = null;
  let pressed = false;

  function draw(): void {
    app.frame(
      app.confirm === 'delete' ? 'DELETE CHARACTER?' : 'DISCARD UNSAVED EDITS?',
      'L/R CHOOSE   L-PRESS CONFIRM',
    );
    h.setColor(2)
      .setFontMonofonto18()
      .setFontAlign(0, 0)
      .drawString(
        app.confirm === 'delete'
          ? 'SAVE SLOT ' + app.slot
          : app.character!.name.slice(0, 36),
        240,
        106,
      );
    h.setColor(3)
      .setFontMonofonto18()
      .drawString((selected === 0 ? '> ' : '  ') + 'CANCEL', 240, 168)
      .drawString(
        (selected === 1 ? '> ' : '  ') +
          (app.confirm === 'delete' ? 'DELETE' : 'DISCARD'),
        240,
        214,
      );
    h.setColor(2).setFontMonofonto14().drawString(app.message, 240, 272);
  }

  function accept(): void {
    if (!selected) app.go(app.confirm === 'delete' ? 'LIST.JS' : 'SHEET.JS');
    else if (app.confirm === 'discard') app.go('LIST.JS');
    else if (app.erase()) app.go('LIST.JS');
    else draw();
  }

  function pressEdge(event: WatchEvent): void {
    if (event.state) pressed = true;
    else if (pressed) {
      pressed = false;
      accept();
    }
  }

  function onLeft(direction: KnobDirection, long?: boolean): void {
    if (direction) {
      selected = E.clip(selected + direction, 0, 1);
      draw();
    } else if (!pressWatch && !long) accept();
  }

  function onRight(direction: KnobDirection): void {
    if (direction) onLeft(direction);
  }

  function remove(): void {
    if (pressWatch) clearWatch(pressWatch);
    pressWatch = null;
    Pip.removeListener('knob1', onLeft);
    Pip.removeListener('knob2', onRight);
  }

  app.message = '';
  Pip.onExclusive('knob1', onLeft);
  Pip.onExclusive('knob2', onRight);
  if (typeof ENC1_PRESS !== 'undefined')
    pressWatch = setWatch(pressEdge, ENC1_PRESS, {
      debounce: 50,
      edge: 'both',
      repeat: true,
    });
  draw();
  return { remove: remove };
});
