(function (app: DndApp): DndScene {
  const W = h.getWidth();
  const H = h.getHeight();
  const C = {
    buttons: ['+ ADD NEW CHARACTER', 'ROLL DICE'],
    count: 2,
    buttonHeight: 24,
    buttonTop: 72,
    columns: 2,
    gap: 8,
    width: (W - 2 * 14 - 8) / 2,
    rowHeight: 28,
    gridTop: 106,
    margin: 14,
    subtitleTop: 44,
    visibleRows: Math.floor((H - 18 - 106) / 28),
    longPress: 500,
  };
  let entries: DndListEntry[] = [];
  let selected = app.listRow || 0;
  let column = 0;
  let scroll = 0;
  let pressTimer: number | null = null;
  let pressWatch: number | null = null;
  let pressed = false;
  let longFired = false;

  function rowCount(): number {
    return Math.ceil(entries.length / C.columns);
  }

  function clipText(text: string, maximum: number): string {
    if (h.stringWidth(text) <= maximum) return text;
    while (text.length && h.stringWidth(text + '..') > maximum)
      text = text.slice(0, -1);
    return text + '..';
  }

  function remember(): void {
    column = selected < C.count ? selected : (selected - C.count) % C.columns;
  }

  function clampSelection(): void {
    selected = E.clip(selected, 0, C.count + entries.length - 1);
  }

  function clampScroll(): void {
    if (selected < C.count) return;
    const row = Math.floor((selected - C.count) / C.columns);
    if (row < scroll) scroll = row;
    if (row >= scroll + C.visibleRows) scroll = row - C.visibleRows + 1;
    scroll = E.clip(scroll, 0, Math.max(0, rowCount() - C.visibleRows));
  }

  function draw(): void {
    const title = 'DICE & DUNGEONS TERMINAL';
    let index = 0;
    let row = 0;
    let cell = 0;
    let left = 0;
    let top = 0;
    let active = false;
    h.clear(0).setColor(3).setFontMonofonto28().setFontAlign(0, -1);
    if (h.stringWidth(title) > W - 2 * C.margin) h.setFontMonofonto23();
    h.drawString(title, W / 2, 6);
    h.setColor(app.message ? 3 : 2)
      .setFontMonofonto16()
      .setFontAlign(0, -1);
    h.drawString(
      clipText(
        app.message || 'RPG CHARACTER SHEET & DICE TERMINAL',
        W - 2 * C.margin,
      ),
      W / 2,
      C.subtitleTop,
    );
    for (index = 0; index < C.count; index++) {
      left = C.margin + index * (C.width + C.gap);
      if (selected === index) {
        h.setColor(3).fillRect(
          left,
          C.buttonTop,
          left + C.width,
          C.buttonTop + C.buttonHeight,
        );
        h.setColor(0);
      } else {
        h.setColor(2).drawRect(
          left,
          C.buttonTop,
          left + C.width,
          C.buttonTop + C.buttonHeight,
        );
        h.setColor(3);
      }
      h.setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString(
          clipText(C.buttons[index], C.width - 12),
          left + C.width / 2,
          C.buttonTop + C.buttonHeight / 2,
        );
    }
    for (
      row = scroll;
      row < scroll + C.visibleRows && row < rowCount();
      row++
    ) {
      for (cell = 0; cell < C.columns; cell++) {
        index = row * C.columns + cell;
        if (index >= entries.length) break;
        left = C.margin + cell * (C.width + C.gap);
        top = C.gridTop + (row - scroll) * C.rowHeight;
        active = selected === C.count + index;
        if (active)
          Pip.shadeBox(left, top, left + C.width, top + C.rowHeight - 4);
        h.setColor(active ? 3 : 2)
          .setFontMonofonto16()
          .setFontAlign(-1, -1)
          .drawString(
            clipText(entries[index].name, C.width - 12),
            left + 6,
            top + 4,
          );
      }
    }
    if (!entries.length)
      h.setColor(1)
        .setFontMonofonto16()
        .setFontAlign(0, -1)
        .drawString('No character sheets yet.', W / 2, C.gridTop + 12);
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString(
        'L-KNOB UP/DOWN   R-KNOB LEFT/RIGHT   HOLD=DELETE',
        W / 2,
        H - 4,
      );
    h.flip();
    Pip.lastFlip = getTime();
  }

  function openSelection(): void {
    app.listRow = selected;
    if (selected === 0) {
      if (app.create()) app.go('SHEET.JS');
      else draw();
    } else if (selected === 1) {
      app.dice = null;
      app.go('DICE_MENU.JS');
    } else if (app.open(entries[selected - C.count].slot)) app.go('SHEET.JS');
    else draw();
  }

  function shortPress(): void {
    Pip.playSound('TAB');
    openSelection();
  }

  function longPress(): void {
    if (selected < C.count) return;
    Pip.playSound('TAB');
    app.listRow = selected;
    app.slot = entries[selected - C.count].slot;
    app.confirm = 'delete';
    app.go('CONFIRM.JS');
  }

  function pressTimeout(): void {
    pressTimer = null;
    longFired = true;
    longPress();
  }

  function pressEdge(event: WatchEvent): void {
    if (event.state) {
      pressed = true;
      longFired = false;
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = setTimeout(pressTimeout, C.longPress);
      return;
    }
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    if (!pressed || longFired) {
      pressed = false;
      longFired = false;
      return;
    }
    pressed = false;
    shortPress();
  }

  function onLeft(direction: KnobDirection, long?: boolean): void {
    let index = 0;
    let row = 0;
    let cell = 0;
    if (!direction) {
      if (!pressWatch) {
        if (long) longPress();
        else shortPress();
      }
      return;
    }
    if (direction > 0) {
      if (selected < C.count) {
        if (entries.length)
          selected = C.count + (column < entries.length ? column : 0);
      } else {
        index = selected - C.count;
        row = Math.floor(index / C.columns);
        cell = index % C.columns;
        if ((row + 1) * C.columns + cell < entries.length)
          selected = C.count + (row + 1) * C.columns + cell;
        else if ((row + 1) * C.columns < entries.length)
          selected = C.count + (row + 1) * C.columns;
      }
    } else if (selected >= C.count) {
      index = selected - C.count;
      row = Math.floor(index / C.columns);
      cell = index % C.columns;
      selected = row ? C.count + (row - 1) * C.columns + cell : cell;
    }
    remember();
    clampScroll();
    Pip.playSound('SCROLL');
    draw();
  }

  function onRight(direction: KnobDirection): void {
    let index = 0;
    if (!direction) return;
    if (selected < C.count) {
      selected = E.clip(selected + (direction > 0 ? 1 : -1), 0, C.count - 1);
      column = selected;
    } else {
      index = selected - C.count;
      if (direction > 0) {
        if (index % C.columns === 0 && index + 1 < entries.length) selected++;
      } else if (index % C.columns === 1) selected--;
      remember();
    }
    Pip.playSound('SCROLL');
    draw();
  }

  function remove(): void {
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
    if (pressWatch) clearWatch(pressWatch);
    pressWatch = null;
    Pip.removeListener('knob1', onLeft);
    Pip.removeListener('knob2', onRight);
    entries = [];
  }

  app.character = null;
  app.dice = null;
  entries = app.list();
  clampSelection();
  remember();
  clampScroll();
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
