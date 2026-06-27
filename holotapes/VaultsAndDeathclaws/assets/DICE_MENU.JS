// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: DICE_MENU.JS (scene)
//  Description: This file handles the dice rolling menu, this is where the
//  user can configure their roll.
//  Notes:
//    code = 0: MODE
//    code = 1: DIE TYPE
//    code = 2: DICE COUNT
//    code = 3: TARGET NUMBER
//    code = 4: CRITICAL <=
//    selected = 0: < BACK
//    selected = 1: ROLL
//    selected = 2+: config rows
// =============================================================================

(function (app) {
  let selected = 0; // 0 = BACK, 1 = ROLL, 2.. = other config rows
  let selectedButton = 0; // Remember the button to return to from the rows

  function adjust(code, direction) {
    if (code === 0) {
      // MODE: Cycle 0 > 1 > 2 > 0
      app.diceState[0] = (app.diceState[0] + (direction > 0 ? 1 : 2)) % 3;
      selected = E.clip(selected, 0, rowCount() + 1);
    } else if (code === 1) {
      // DIE TYPE: Cycle d2 > d4 > d6 > d8 > d10 > d12 > d20 > d100
      app.diceState[4] = E.clip(app.diceState[4] + direction, 0, 7);
    } else if (code === 2) {
      // DICE COUNT: Adjust the number of dice based on the current mode
      // Fallout caps at 5 dice, all others 10
      const index = app.diceState[0] + 1;

      app.diceState[index] = E.clip(
        app.diceState[index] + direction,
        1,
        app.diceState[0] === 0 ? 5 : 10,
      );
    } else if (code === 3) {
      // TARGET NUMBER: Adjust the number the player is aiming for
      app.diceState[5] = E.clip(app.diceState[5] + direction, 1, 30);
    } else {
      // CRITICAL <=: Adjust the critical range
      app.diceState[6] = E.clip(app.diceState[6] + direction, 1, 5);
    }

    app.diceState[9] = 0;
  }

  /**
   * Get the current dice count based on the mode.
   * @returns {number} The number of dice currently selected.
   */
  function diceCount() {
    return app.diceState[app.diceState[0] + 1];
  }

  /**
   * Get the face count for the currently selected dice.
   * @returns {number} The number of faces on the currently selected dice.
   */
  function diceFaces() {
    if (app.diceState[4] === 0) {
      return 2;
    }

    if (app.diceState[4] === 1) {
      return 4;
    }

    if (app.diceState[4] === 2) {
      return 6;
    }

    if (app.diceState[4] === 3) {
      return 8;
    }

    if (app.diceState[4] === 4) {
      return 10;
    }

    if (app.diceState[4] === 5) {
      return 12;
    }

    if (app.diceState[4] === 6) {
      return 20;
    }

    return 100;
  }

  function draw() {
    h.clear(0)
      .setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, -1)
      .drawString('DICE ROLLER', app.W / 2, 4);

    const width = (app.W - 36) / 2;

    // Draw "< BACK" and "ROLL" buttons (row)
    // Selected one is styled
    // Hardcoded 2 for performance
    for (let i = 0; i < 2; i++) {
      const left = 14 + i * (width + 8);

      if (selected === i) {
        h.setColor(3)
          .fillRect(left, 30, left + width, 60)
          .setColor(0);
      } else {
        h.setColor(2)
          .drawRect(left, 30, left + width, 60)
          .setColor(3);
      }

      h.setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString(i ? 'ROLL' : '< BACK', left + width / 2, 45);
    }

    // Config rows for the current mode
    for (let i = 0; i < rowCount(); i++) {
      const top = 74 + i * 26;
      const active = selected === i + 2;

      if (active) {
        Pip.shadeBox(6, top, app.W - 6, top + 24);
      }

      h.setColor(active ? 3 : 2)
        .setFontMonofonto16()
        .setFontAlign(-1, -1)
        .drawString(label(setting(i)), 12, top + 3) // Label on the left.
        .setFontAlign(1, -1)
        .drawString(value(setting(i)), app.W - 14, top + 3); // Value on the right.
    }

    // Dice result, below list
    const resultTop = 86 + rowCount() * 26;

    h.setColor(1).drawLine(8, resultTop - 6, app.W - 8, resultTop - 6);
    h.setColor(app.diceState[9] ? 3 : 1)
      .setFont(app.diceState[9] ? 'Monofonto18' : 'Monofonto16')
      .setFontAlign(0, -1)
      .drawString(
        app.diceState[9] ? result() : 'Select ROLL to roll the dice.',
        app.W / 2,
        resultTop + 6,
      );
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString(
        'L-KNOB MOVE/SELECT    R-KNOB ADJUST/SWITCH',
        app.W / 2,
        app.H - 6,
      );
    h.flip();
    Pip.lastFlip = getTime();
  }

  /**
   * Get the label for a setting code.
   * @param code The code representing the setting.
   * @returns {string} The label for the given setting code.
   */
  function label(code) {
    if (code === 0) {
      return 'MODE';
    }

    if (code === 1) {
      return 'DIE TYPE';
    }

    if (code === 2) {
      return 'DICE';
    }

    if (code === 3) {
      return 'TARGET NUMBER';
    }

    return 'CRITICAL <=';
  }

  function onLeftScrollWheel(direction) {
    if (direction) {
      if (direction > 0) {
        // Scrolling down from a button, drop into config rows
        if (selected < 2) {
          selectedButton = selected;
          selected = 2;
        } else {
          selected = E.clip(selected + 1, 0, rowCount() + 1);
        }
      } else if (selected === 2) {
        // Scrolling up off the first row back to buttons
        selected = selectedButton;
      } else if (selected > 2) {
        selected--;
      }

      if (Pip.playSound) {
        Pip.playSound('SCROLL');
      }

      draw();

      return;
    }

    if (Pip.playSound) {
      Pip.playSound('TAB');
    }

    if (selected === 0) {
      // Pressing the "< BACK" button
      app.diceState = null; // Clear state
      // Return to the list scene
      app.go(app.scenes.LIST);
    } else if (selected === 1) {
      // Open the roll scene
      app.go(app.scenes.DICE_ROLL);
    } else if (setting(selected - 2) === 0) {
      // Pressing the MODE row goes to the next
      // In addition to right scroll wheel updates
      adjust(0, 1);
      draw();
    }
  }

  function onRightScrollWheel(direction) {
    if (!direction) {
      return;
    }

    // The current selection is on a button
    if (selected < 2) {
      selected = E.clip(selected + (direction > 0 ? 1 : -1), 0, 1);
      selectedButton = selected;

      if (Pip.playSound) {
        Pip.playSound('SCROLL');
      }
    } else {
      // The current selection is on a config row, adjust value
      adjust(setting(selected - 2), direction > 0 ? 1 : -1);

      if (Pip.playSound) {
        Pip.playSound('HIGHLIGHT');
      }
    }

    draw();
  }

  function remove() {
    Pip.removeListener('knob1', onLeftScrollWheel);
    Pip.removeListener('knob2', onRightScrollWheel);
  }

  /**
   * Get the result string for the current roll mode.
   * @returns {string} The result string for the current roll mode.
   */
  function result() {
    if (app.diceState[0] === 0) {
      // Fallout 2d20
      return (
        // Successes
        app.diceState[7] +
        ' SUCCESS' +
        (app.diceState[7] === 1 ? '' : 'ES') +
        '   ' +
        // Complications
        app.diceState[8] +
        ' COMPLICATION' +
        (app.diceState[8] === 1 ? '' : 'S')
      );
    }

    if (app.diceState[0] === 1) {
      // Combat dice
      return (
        // Total damage
        app.diceState[7] +
        ' DAMAGE   ' +
        // Effects
        app.diceState[8] +
        ' EFFECT' +
        (app.diceState[8] === 1 ? '' : 'S')
      );
    }

    if (diceFaces() === 2) {
      // Coin flip
      return app.diceState[7] + ' HEADS   ' + app.diceState[8] + ' TAILS';
    }

    // All other cases
    return 'TOTAL ' + app.diceState[7];
  }

  /**
   * How many config rows for the current mode.
   * @returns {number} The number of config rows.
   */
  function rowCount() {
    //   - Fallout (4 rows)
    //   - Combat Dice (2 rows)
    //   - All others (3 rows)
    return app.diceState[0] === 0 ? 4 : app.diceState[0] === 1 ? 2 : 3;
  }

  /**
   * Map rows by mode
   *   - Row 0 is always the MODE
   *   - Row 1 in Fallout and Combat mode is the DICE count
   *   - Row 1 in all other modes is the DIE TYPE
   *   - Row 2 in Fallout mode is the TARGET
   *   - Row 2 in all other modes is the DICE count
   *   - Row 3 in Fallout mode is "CRITICAL <="
   * @param row Row index
   * @returns {number} The setting code corresponding to the row.
   */
  function setting(row) {
    if (!row) {
      // Row 0 is always MODE
      return 0;
    }

    // Fallout MODE
    if (app.diceState[0] === 0) {
      return row === 1 ? 2 : row === 2 ? 3 : 4;
    }

    // Combat MODE
    if (app.diceState[0] === 1) {
      return 2;
    }

    // All other MODEs
    return row === 1 ? 1 : 2;
  }

  /**
   * Get the readable value for a setting code.
   * @param code The setting code.
   * @returns {string} The readable value for the setting.
   */
  function value(code) {
    if (code === 0) {
      return app.diceState[0] === 0
        ? 'Fallout 2d20'
        : app.diceState[0] === 1
          ? 'Combat Dice'
          : 'Normal Dice';
    }

    if (code === 1) {
      return 'D' + diceFaces();
    }

    if (code === 2) {
      return '' + diceCount();
    }

    if (code === 3) {
      return '' + app.diceState[5];
    }

    return '' + app.diceState[6];
  }

  Pip.onExclusive('knob1', onLeftScrollWheel);
  Pip.onExclusive('knob2', onRightScrollWheel);

  draw();

  return { remove: remove };
});
