// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: KEYBOARD.JS (utility, not a scene)
//  Description: A reusable keyboard for character text fields
//  Notes:
//    The left knob moves rows and selects keys
//    The right knob moves columns
//    Hold the left knob to change case
//    \b is DEL, \x03 is OK, \x02 is shift, and a space is SP
//    Only changed screen rows are sent to the display
// =============================================================================

(function (keyboardOptions) {
  // Keep lower and upper case in matching 14 key rows
  const KEYS = {
    lowercase: [
      '`1234567890-=\b',
      ' qwertyuiop[]\x03',
      "\x02asdfghjkl;'\x03\x03",
      ' \\zxcvbnm,./  ',
    ],
    uppercase: [
      '~!"#$%^&*()_+\b',
      ' QWERTYUIOP{}\x03',
      '\x02ASDFGHJKL:@\x03\x03',
      ' |ZXCVBNM<>?  ',
    ],
  };
  const LAYOUT = {
    cellHeight: 34,
    cellWidth: 32,
    columnCount: 14,
    gridBottom: 256,
    gridLeft: 16,
    gridTop: 120,
    rowCount: 4,
    textBottom: 70, // Bottom of the text box
    textTop: 28,
  };
  const TIMING = {
    cursorBlink: 600, // Time between cursor blinks
    longPress: 400, // Hold time before case changes
  };
  const maximumLength = keyboardOptions.maximumLength || 64;

  let columnIndex = 0; // Selected key column
  let cursorBlinkInterval = null;
  let cursorVisible = false; // Text cursor state
  let hasLongPressFired = false; // Stops release after a long press
  let isUppercase = false;
  let pressTimer = null; // Tracks the case change hold
  let pressWatch = null; // Hardware press watch
  let rowIndex = 1; // Start on the home row
  let text = keyboardOptions.text || ''; // Text being edited

  /**
   * Send part of the screen to the display
   * @param firstRow The first screen row
   * @param lastRow The last screen row
   * @returns {void} Nothing
   */
  function blitRows(firstRow, lastRow) {
    Pip.blitOptions.y1 = firstRow;
    Pip.blitOptions.y2 = lastRow;
    h.flip();
    delete Pip.blitOptions.y1;
    delete Pip.blitOptions.y2;
    Pip.lastFlip = getTime();
  }

  /**
   * Draw the full keyboard
   * @returns {void} Nothing
   */
  function drawAll() {
    h.clear(0);
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, -1)
      .drawString(
        keyboardOptions.description || 'TEXT ENTRY',
        keyboardOptions.app.W / 2,
        8,
      );
    drawText();
    drawKeys();
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString(
        'R-KNOB COL  L-KNOB ROW/PRESS  HOLD = CASE  OK = DONE',
        keyboardOptions.app.W / 2,
        keyboardOptions.app.H - 4,
      );
    h.flip();
    Pip.lastFlip = getTime();
  }

  /**
   * Draw one keyboard key
   * @param cellColumn The key column
   * @param cellRow The key row
   * @returns {void} Nothing
   */
  function drawCell(cellColumn, cellRow) {
    const cellLeft = LAYOUT.gridLeft + cellColumn * LAYOUT.cellWidth;
    const cellTop = LAYOUT.gridTop + cellRow * LAYOUT.cellHeight;
    const isSelected = cellColumn === columnIndex && cellRow === rowIndex;

    h.setColor(isSelected ? 3 : 0).fillRect(
      cellLeft,
      cellTop,
      cellLeft + LAYOUT.cellWidth - 2,
      cellTop + LAYOUT.cellHeight - 2,
    );

    if (!isSelected) {
      h.setColor(1).drawRect(
        cellLeft,
        cellTop,
        cellLeft + LAYOUT.cellWidth - 2,
        cellTop + LAYOUT.cellHeight - 2,
      );
    }

    h.setColor(isSelected ? 0 : 3)
      .setFontMonofonto14()
      .setFontAlign(0, 0)
      .drawString(
        formatKeyLabel(
          (isUppercase ? KEYS.uppercase : KEYS.lowercase)[cellRow][cellColumn],
        ),
        cellLeft + (LAYOUT.cellWidth - 2) / 2,
        cellTop + (LAYOUT.cellHeight - 2) / 2,
      );
  }

  function drawKeys() {
    for (let keyRow = 0; keyRow < LAYOUT.rowCount; keyRow++) {
      for (let keyColumn = 0; keyColumn < LAYOUT.columnCount; keyColumn++) {
        drawCell(keyColumn, keyRow);
      }
    }
  }

  /**
   * Draw the text box and cursor
   * @returns {void} Nothing
   */
  function drawText() {
    h.setColor(0).fillRect(
      17,
      LAYOUT.textTop + 1,
      keyboardOptions.app.W - 17,
      LAYOUT.textBottom - 1,
    );
    h.setColor(2).drawRect(
      16,
      LAYOUT.textTop,
      keyboardOptions.app.W - 16,
      LAYOUT.textBottom,
    );

    let visibleText = text;

    h.setFontMonofonto23();

    // Trim the front so new text stays visible
    while (
      visibleText.length &&
      h.stringWidth(visibleText) > keyboardOptions.app.W - 60
    ) {
      visibleText = visibleText.slice(1);
    }

    h.setColor(3)
      .setFontAlign(-1, 0)
      .drawString(visibleText + (cursorVisible ? '_' : ' '), 24, 49);
  }

  /**
   * Get the label shown for a key
   * @param character The key value
   * @returns {string} The key label
   */
  function formatKeyLabel(character) {
    if (character === '\b') {
      return 'DEL';
    }

    if (character === '\x03') {
      return 'OK';
    }

    if (character === '\x02') {
      return '^';
    }

    if (character === ' ') {
      return 'SP';
    }

    return character;
  }

  /**
   * Blink the text cursor
   * @returns {void} Nothing
   */
  function handleCursorBlink() {
    cursorVisible = !cursorVisible;
    drawText();
    blitRows(LAYOUT.textTop, LAYOUT.textBottom);
  }

  /**
   * Start the case change hold
   * @returns {void} Nothing
   */
  function handlePressDown() {
    hasLongPressFired = false;

    if (pressTimer) {
      clearTimeout(pressTimer);
    }

    pressTimer = setTimeout(handlePressTimer, TIMING.longPress);
  }

  function handlePressTimer() {
    pressTimer = null;
    hasLongPressFired = true;
    toggleCase();
  }

  /**
   * Handle the end of a key press
   * @returns {void} Nothing
   */
  function handlePressUp() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }

    if (hasLongPressFired) {
      hasLongPressFired = false;

      return;
    }

    handleShortPress();
  }

  /**
   * Handle both press edges
   * @param event The hardware press event
   * @returns {void} Nothing
   */
  function handlePressWatch(event) {
    if (event.state) {
      handlePressDown();
    } else {
      handlePressUp();
    }
  }

  /**
   * Use the selected key
   * @returns {void} Nothing
   */
  function handleShortPress() {
    const character = (isUppercase ? KEYS.uppercase : KEYS.lowercase)[rowIndex][
      columnIndex
    ];

    if (character === '\x02') {
      toggleCase(); // Shift key

      return;
    }

    if (character === '\x03') {
      keyboardOptions.onDone(text); // Finish text entry

      return;
    }

    if (character === '\b') {
      text = text.slice(0, -1); // Delete the last character
    } else {
      if (text.length < maximumLength) {
        text += character;
      }
    }

    drawText();

    if (Pip.playSound) {
      Pip.playSound('TAB');
    }

    blitRows(LAYOUT.textTop, LAYOUT.textBottom);
  }

  /**
   * Handle the left scroll wheel input
   * @param direction The direction of the scroll wheel
   * @returns {void} Nothing
   */
  function onLeftScrollWheel(direction) {
    if (!direction) {
      // Handle presses without a hardware watch
      if (!pressWatch) {
        handleShortPress();
      }

      return;
    }

    const previousRow = rowIndex;

    // Wrap at the first and last row
    rowIndex =
      (rowIndex + (direction > 0 ? 1 : -1) + LAYOUT.rowCount) % LAYOUT.rowCount;
    drawCell(columnIndex, previousRow); // Clear the old key
    drawCell(columnIndex, rowIndex); // Select the new key

    if (Pip.playSound) {
      Pip.playSound('SCROLL');
    }

    // Update the old and new rows
    blitRows(
      LAYOUT.gridTop + Math.min(previousRow, rowIndex) * LAYOUT.cellHeight,
      LAYOUT.gridTop +
        (Math.max(previousRow, rowIndex) + 1) * LAYOUT.cellHeight,
    );
  }

  /**
   * Handle the right scroll wheel input
   * @param direction The direction of the scroll wheel
   * @returns {void} Nothing
   */
  function onRightScrollWheel(direction) {
    if (!direction) {
      return;
    }

    const previousColumn = columnIndex;

    columnIndex =
      (columnIndex + (direction > 0 ? 1 : -1) + LAYOUT.columnCount) %
      LAYOUT.columnCount;
    drawCell(previousColumn, rowIndex);
    drawCell(columnIndex, rowIndex);

    if (Pip.playSound) {
      Pip.playSound('SCROLL');
    }

    // Update only the current row
    blitRows(
      LAYOUT.gridTop + rowIndex * LAYOUT.cellHeight,
      LAYOUT.gridTop + (rowIndex + 1) * LAYOUT.cellHeight,
    );
  }

  function removeScene() {
    if (cursorBlinkInterval) {
      clearInterval(cursorBlinkInterval);
      cursorBlinkInterval = null;
    }

    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }

    if (pressWatch) {
      clearWatch(pressWatch);
      pressWatch = null;
    }

    Pip.removeListener('knob1', onLeftScrollWheel);
    Pip.removeListener('knob2', onRightScrollWheel);
  }

  /**
   * Change case and redraw every key
   * @returns {void} Nothing
   */
  function toggleCase() {
    isUppercase = !isUppercase;
    drawKeys();

    if (Pip.playSound) {
      Pip.playSound('TAB');
    }

    blitRows(LAYOUT.gridTop, LAYOUT.gridBottom);
  }

  Pip.onExclusive('knob1', onLeftScrollWheel);
  Pip.onExclusive('knob2', onRightScrollWheel);

  // Use the hardware press watch when available
  if (typeof ENC1_PRESS !== 'undefined') {
    pressWatch = setWatch(handlePressWatch, ENC1_PRESS, {
      debounce: 50,
      edge: 'both',
      repeat: true,
    });
  }

  cursorBlinkInterval = setInterval(handleCursorBlink, TIMING.cursorBlink);
  drawAll();

  return {
    remove: removeScene,
  };
});
