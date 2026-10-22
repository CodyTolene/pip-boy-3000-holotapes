(function (app: DiceRollerApp): DiceRollerScene {
  let selected = 1;
  let selectedButton = 1;

  function adjust(direction: number): void {
    if (selected === 2) {
      app.type = E.clip(app.type + direction, 0, 7);
      app.critical = E.clip(app.critical, 0, app.faces[app.type]);
    } else if (selected === 3) {
      app.count = E.clip(app.count + direction, 1, 10);
    } else if (selected === 4) {
      app.modifier = E.clip(app.modifier + direction, -99, 99);
    } else if (selected === 5) {
      app.target = E.clip(app.target + direction, 0, 1099);
    } else {
      app.critical = E.clip(app.critical + direction, 0, app.faces[app.type]);
    }
    app.ready = false;
  }

  function label(row: number): string {
    if (row === 0) {
      return 'DIE TYPE';
    }
    if (row === 1) {
      return 'DICE';
    }
    if (row === 2) {
      return 'MODIFIER';
    }
    return row === 3 ? 'TARGET TOTAL >=' : 'CRITICAL FACE >=';
  }

  function value(row: number): string {
    if (row === 0) {
      return 'D' + app.faces[app.type];
    }
    if (row === 1) {
      return '' + app.count;
    }
    if (row === 2) {
      return (app.modifier >= 0 ? '+' : '') + app.modifier;
    }
    return '' + ((row === 3 ? app.target : app.critical) || 'OFF');
  }

  function draw(): void {
    let button = 0;
    let left = 0;
    let row = 0;
    let top = 0;
    h.clear(0)
      .setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, -1)
      .drawString('DICE ROLLER', app.W / 2, 4);
    const width = (app.W - 36) / 2;
    for (button = 0; button < 2; button++) {
      left = 14 + button * (width + 8);
      h.setColor(selected === button ? 3 : 2);
      if (selected === button) {
        h.fillRect(left, 30, left + width, 60);
      } else {
        h.drawRect(left, 30, left + width, 60);
      }
      h.setColor(selected === button ? 0 : 3)
        .setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString(button ? 'ROLL' : '< EXIT', left + width / 2, 45);
    }
    for (row = 0; row < 5; row++) {
      top = 74 + row * 26;
      if (selected === row + 2) {
        Pip.shadeBox(6, top, app.W - 6, top + 24);
      }
      h.setColor(selected === row + 2 ? 3 : 2)
        .setFontMonofonto16()
        .setFontAlign(-1, -1)
        .drawString(label(row), 12, top + 3)
        .setFontAlign(1, -1)
        .drawString(value(row), app.W - 14, top + 3);
    }
    h.setColor(1).drawLine(8, 216, app.W - 8, 216);
    h.setColor(app.ready ? 3 : 1)
      .setFontMonofonto18()
      .setFontAlign(0, -1)
      .drawString(
        app.ready ? 'LAST TOTAL ' + app.total : 'Select ROLL to roll the dice.',
        app.W / 2,
        230,
      );
    if (app.ready) {
      h.setColor(2)
        .setFontMonofonto16()
        .drawString(
          (app.target
            ? app.total >= app.target
              ? 'TARGET MET'
              : 'TARGET MISSED'
            : 'TARGET OFF') +
            '   ' +
            (app.critical ? 'CRITICALS ' + app.criticals : 'CRITICALS OFF'),
          app.W / 2,
          256,
        );
    }
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString(
        'L-KNOB MOVE/SELECT    R-KNOB ADJUST/SWITCH',
        app.W / 2,
        app.H - 6,
      );
  }

  function onLeft(direction: KnobDirection): void {
    if (direction) {
      if (direction > 0) {
        if (selected < 2) {
          selectedButton = selected;
          selected = 2;
        } else {
          selected = E.clip(selected + 1, 2, 6);
        }
      } else if (selected === 2) {
        selected = selectedButton;
      } else if (selected > 2) {
        selected--;
      }
      Pip.playSound('SCROLL');
      draw();
    } else if (selected === 0) {
      Pip.emit('mode', 1);
    } else if (selected === 1) {
      app.go('DICE_ROLL.JS');
    }
  }

  function onRight(direction: KnobDirection): void {
    if (!direction) {
      return;
    }
    if (selected < 2) {
      selected = E.clip(selected + direction, 0, 1);
      selectedButton = selected;
    } else {
      adjust(direction);
    }
    Pip.playSound('SCROLL');
    draw();
  }

  function remove(): void {
    Pip.removeListener('knob1', onLeft);
    Pip.removeListener('knob2', onRight);
    Pip.audioStop();
  }

  Pip.onExclusive('knob1', onLeft);
  Pip.onExclusive('knob2', onRight);
  draw();
  return { remove: remove };
});
