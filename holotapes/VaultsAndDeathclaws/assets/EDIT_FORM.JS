// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: EDIT_FORM.JS (scene)
//  Description: Draws and handles every character form
//  Notes:
//    Screens use [title, buttons, rows]
//    Row 2 is a number, 3 is a toggle, 4 is text, and 5 is a skill
//    Row 6 opens a form and row 7 runs an action
//    Paths list the keys used to find character data
// =============================================================================

(function (app, initialScreen) {
  // Form builder files
  const EDIT_BASIC = 'HOLO/VND/EDIT_BASIC.JS';
  const EDIT_BODY = 'HOLO/VND/EDIT_BODY.JS';
  const EDIT_DATA = 'HOLO/VND/EDIT_DATA.JS';
  const EDIT_SKILL = 'HOLO/VND/EDIT_SKILL.JS';
  const EDIT_TABLE = 'HOLO/VND/EDIT_TABLE.JS';

  const LAYOUT = {
    buttonHeight: 30,
    buttonTop: 30,
    rowHeight: 22,
    rowsTop: 68,
    // Rows that fit between the header and footer
    visibleRows: Math.floor((app.H - 90) / 22),
  };

  let currentDescriptor = initialScreen; // Current form details
  let currentScreen = null; // Current title, buttons, and rows
  // Build the first form on the next tick
  let initializationTimeout = setTimeout(function () {
    initializationTimeout = null;
    apply(currentDescriptor);
  }, 0);
  let scroll = 0; // First visible row
  let selected = 0; // Buttons come before rows
  let selectedButton = 0; // Last selected button

  /**
   * Run a form button action
   * @param button The button data
   * @returns {void} Nothing
   */
  function action(button) {
    if (button[1] === 'back') {
      back();
    } else if (button[1] === 'deleteEntry') {
      // Delete the selected table entry
      app.editor.data[button[2]].splice(button[3], 1);
      back();
    } else if (button[1] === 'add') {
      // Add a blank table entry
      const entries = app.editor.data[button[2]];

      entries.push(
        eval(fs.readFileSync(EDIT_DATA))({
          requestType: 'entry',
          tableName: button[2],
        }),
      );
      // Open the new entry
      app.editor.history.push(currentDescriptor);
      apply({ code: 'entry', table: button[2], index: entries.length - 1 });
    }
  }

  /**
   * Build and open a form
   * @param descriptor The form details
   * @returns {void} Nothing
   */
  function apply(descriptor) {
    currentDescriptor = descriptor;
    currentScreen = null;

    // Clear memory before building the form
    try {
      process.memory(true);
      E.defrag();
    } catch (error) {}

    // Pick the form builder
    let file = EDIT_BASIC;

    if (descriptor.code === 'skills') {
      file = EDIT_SKILL;
    } else if (descriptor.code === 'body' || descriptor.code === 'loc') {
      file = EDIT_BODY;
    } else if (descriptor.code === 'table' || descriptor.code === 'entry') {
      file = EDIT_TABLE;
    }

    currentScreen = eval(fs.readFileSync(file))({
      characterData: app.editor.data,
      screenDescriptor: descriptor,
    });

    try {
      process.memory(true);
      E.defrag();
    } catch (error) {}

    // Reset the cursor and scroll
    scroll = 0;
    selected = 0;
    selectedButton = 0;

    Pip.onExclusive('knob1', onLeftScrollWheel);
    Pip.onExclusive('knob2', onRightScrollWheel);

    draw();
  }

  /**
   * Open the last form or the edit menu
   * @returns {void} Nothing
   */
  function back() {
    if (app.editor.history.length) {
      apply(app.editor.history.pop());
    } else {
      app.go(app.scenes.EDIT_MENU);
    }
  }

  /**
   * Trim text to fit a width
   * @param text The text to trim
   * @param width The pixel width
   * @returns {string} The text that fits
   */
  function clip(text, width) {
    if (h.stringWidth(text) <= width) {
      return text;
    }

    while (text.length && h.stringWidth(text + '..') > width) {
      text = text.slice(0, -1);
    }

    return text + '..';
  }

  function draw() {
    const buttons = currentScreen[1];
    const rows = currentScreen[2];
    // Space the buttons across the screen
    const buttonWidth = (app.W - 8 * (buttons.length + 1)) / buttons.length;
    const rowIndex = selectedRow(selected); // Current row or -1 for a button

    // Keep the selected row visible
    if (rowIndex < 0) {
      scroll = 0;
    } else if (rowIndex < scroll) {
      scroll = rowIndex;
    } else if (rowIndex >= scroll + LAYOUT.visibleRows) {
      scroll = rowIndex - LAYOUT.visibleRows + 1;
    }

    scroll = E.clip(scroll, 0, Math.max(0, rows.length - LAYOUT.visibleRows));
    h.clear(0)
      .setColor(3)
      .setFontMonofonto18()
      .setFontAlign(0, -1)
      .drawString(currentScreen[0], app.W / 2, 5); // Form title

    // Draw the top buttons
    for (let i = 0; i < buttons.length; i++) {
      const left = 8 + i * (buttonWidth + 8);

      if (selected === i) {
        h.setColor(3)
          .fillRect(left, 30, left + buttonWidth, 60)
          .setColor(0);
      } else {
        h.setColor(2)
          .drawRect(left, 30, left + buttonWidth, 60)
          .setColor(3);
      }

      h.setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString(buttons[i][0], left + buttonWidth / 2, 45);
    }

    // Draw the visible form rows
    for (
      let i = scroll;
      i < rows.length && i < scroll + LAYOUT.visibleRows;
      i++
    ) {
      drawRow(rows[i], 68 + (i - scroll) * 22, i === rowIndex);
    }

    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString('L-KNOB MOVE/SELECT    R-KNOB ADJUST', app.W / 2, app.H - 6);
    h.flip();
    Pip.lastFlip = getTime();
  }

  /**
   * Draw one form row
   * @param row The row data
   * @param top The top screen position
   * @param active Whether the row is selected
   * @returns {void} Nothing
   */
  function drawRow(row, top, active) {
    if (active) {
      Pip.shadeBox(6, top, app.W - 6, top + 20);
    }

    const color = active ? 3 : 2;

    // Draw the row label on the left
    h.setColor(color)
      .setFontMonofonto14()
      .setFontAlign(-1, -1)
      .drawString(clip(row[1], 230), 12, top + 4);

    if (row[0] === 2) {
      // Draw a number value
      h.setFontAlign(1, 0).drawString('' + get(row[2]), app.W - 14, top + 11);
    } else if (row[0] === 3) {
      // Draw a checkbox
      h.drawRect(app.W - 28, top + 4, app.W - 14, top + 18);

      if (get(row[2])) {
        h.fillRect(app.W - 25, top + 7, app.W - 17, top + 15);
      }
    } else if (row[0] === 5) {
      // Draw the skill tag and rank
      const skill = get(row[2]);

      h.drawRect(app.W - 60, top + 4, app.W - 46, top + 18); // Tag checkbox

      if (skill & 8) {
        h.fillRect(app.W - 57, top + 7, app.W - 49, top + 15);
      }

      h.setFontAlign(1, 0).drawString('' + (skill & 7), app.W - 14, top + 11); // Skill rank
    } else if (row[0] === 4) {
      // Draw text or an edit label
      const text = get(row[2]);

      h.setColor(text ? color : 1)
        .setFontAlign(1, 0)
        .drawString(text ? clip(text, 200) : '[ EDIT ]', app.W - 14, top + 11);
    } else if (row[0] === 6) {
      // Show that the row opens another form
      h.setFontAlign(1, 0).drawString('>', app.W - 14, top + 11);
    }
  }

  /**
   * Get a character value by its path
   * @param path The keys used to find the value
   * @returns {*} The value at the path
   */
  function get(path) {
    let value = app.editor.data;

    for (let i = 0; i < path.length; i++) {
      value = value[path[i]];
    }

    return value;
  }

  /**
   * Count each button and selectable row
   * @returns {number} The number of selectable items
   */
  function navigationLength() {
    let count = currentScreen[1].length;

    for (let i = 0; i < currentScreen[2].length; i++) {
      if (currentScreen[2][i][0] > 1) {
        count++;
      }
    }

    return count;
  }

  /**
   * Handle the left scroll wheel input
   * @param direction The direction of the scroll wheel
   * @returns {void} Nothing
   */
  function onLeftScrollWheel(direction) {
    if (direction) {
      const buttonCount = currentScreen[1].length;

      if (direction > 0) {
        // Move from the buttons into the rows
        if (selected < buttonCount) {
          selectedButton = selected; // Save the current button

          if (navigationLength() > buttonCount) {
            selected = buttonCount;
          }
        } else {
          selected = E.clip(selected + 1, 0, navigationLength() - 1);
        }
      } else if (selected === buttonCount) {
        // Move from the first row back to the saved button
        selected = selectedButton;
      } else if (selected > buttonCount) {
        selected--;
      }

      if (Pip.playSound) {
        Pip.playSound('SCROLL');
      }

      draw();

      return;
    }

    // Run the selected item
    if (Pip.playSound) {
      Pip.playSound('TAB');
    }

    // Run a button
    if (selected < currentScreen[1].length) {
      action(currentScreen[1][selected]);

      return;
    }

    // Handle the selected row type
    const row = currentScreen[2][selectedRow(selected)];

    if (row[0] === 3) {
      set(row[2], !get(row[2])); // Change the checkbox
      draw();
    } else if (row[0] === 5) {
      set(row[2], get(row[2]) ^ 8); // Change the skill tag
      draw();
    } else if (row[0] === 4) {
      // Open the keyboard for this field
      app.go(app.scenes.EDIT_TEXT, {
        label: 'EDIT ' + row[1],
        maximumLength: row[3],
        path: row[2],
        screen: currentDescriptor,
      });
    } else if (row[0] === 6) {
      // Save this form and open the next one
      app.editor.history.push(currentDescriptor);
      apply({ code: row[2], table: row[3], index: row[4] });
    } else if (row[0] === 7) {
      // Run a row action with the button handler
      action([row[1], row[2], row[3], row[4]]);
    }
  }

  /**
   * Handle the right scroll wheel input
   * @param direction The direction of the scroll wheel
   * @returns {void} Nothing
   */
  function onRightScrollWheel(direction) {
    if (!direction) {
      return; // Ignore right knob presses
    }

    // Move between buttons
    if (selected < currentScreen[1].length) {
      selected = E.clip(
        selected + (direction > 0 ? 1 : -1),
        0,
        currentScreen[1].length - 1,
      );
      selectedButton = selected;

      if (Pip.playSound) {
        Pip.playSound('SCROLL');
      }

      draw();

      return;
    }

    const row = currentScreen[2][selectedRow(selected)];

    if (row[0] === 2) {
      // Change a number within its range
      set(
        row[2],
        E.clip(
          get(row[2]) + (direction > 0 ? row[5] : -row[5]),
          row[3],
          row[4],
        ),
      );
    } else if (row[0] === 5) {
      // Change the rank and keep the tag
      const skill = get(row[2]);

      set(
        row[2],
        (skill & 8) | E.clip((skill & 7) + (direction > 0 ? 1 : -1), 0, 6),
      );
    } else {
      return; // Other rows do not use the right knob
    }

    if (Pip.playSound) {
      Pip.playSound('HIGHLIGHT');
    }

    draw();
  }

  /**
   * Find the row for a cursor position
   * @param selection The cursor position
   * @returns {number} The row index or -1 for a button
   */
  function selectedRow(selection) {
    let remaining = selection - currentScreen[1].length;

    if (remaining < 0) {
      return -1; // The cursor is on a button
    }

    for (let i = 0; i < currentScreen[2].length; i++) {
      if (currentScreen[2][i][0] > 1) {
        if (!remaining) {
          return i;
        }

        remaining--;
      }
    }

    return -1;
  }

  /**
   * Set a character value by its path
   * @param path The keys used to find the value
   * @param value The new value
   * @returns {void} Nothing
   */
  function set(path, value) {
    let parent = app.editor.data;

    for (let i = 0; i < path.length - 1; i++) {
      parent = parent[path[i]];
    }

    parent[path[path.length - 1]] = value;
  }

  return {
    remove: function () {
      // Cancel setup if the scene closes early
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }

      currentScreen = null;
      Pip.removeListener('knob1', onLeftScrollWheel);
      Pip.removeListener('knob2', onRightScrollWheel);
    },
  };
});
