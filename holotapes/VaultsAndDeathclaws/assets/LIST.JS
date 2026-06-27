// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: LIST.JS (scene)
//  Description: Shows character saves and the main action buttons
//  Notes:
//    Buttons come before character cells in the selection order
//    Press to open and hold a character to delete it
// =============================================================================

(function (app) {
  const ACTION_BUTTONS = {
    count: 2,
    labels: ['+ ADD NEW CHARACTER', 'ROLL DICE'],
  };
  const CHARACTER_DIR = 'HOLO/VND/CHAR';
  const CONFIRM = 'HOLO/VND/CONFIRM.JS';
  const LAYOUT = {
    actionButtonHeight: 24,
    actionButtonTop: 72,
    columnCount: 2,
    columnGap: 8,
    columnWidth: (app.W - 2 * 14 - 8) / 2, // Width after margins and the gap
    gridRowHeight: 28,
    gridTop: 106,
    sideMargin: 14,
    subtitleTop: 44,
    // Rows that fit above the footer
    visibleRowCount: Math.floor((app.H - 18 - 106) / 28),
  };
  const TIMING = {
    longPress: 500, // Hold time before delete
  };

  let characterNames = []; // Names matched to character slots
  let characterSlots = []; // Sorted save slot numbers
  let confirmationScene = null; // Open delete dialog
  let hasLongPressFired = false; // Stops release after a long press
  let pendingDeleteIndex = null; // Character waiting to be deleted
  let pressTimer = null; // Tracks the delete hold
  let pressWatch = null; // Hardware press watch
  let scrollOffset = 0; // First visible row
  let selectedColumn = 0; // Last selected column
  let selectedControl = app.listSel || 0; // Last list selection

  /**
   * Start the hardware press watch when available
   * @returns {void} Nothing
   */
  function armPressWatch() {
    if (typeof ENC1_PRESS !== 'undefined' && !pressWatch) {
      pressWatch = setWatch(handlePressWatch, ENC1_PRESS, {
        debounce: 50,
        edge: 'both',
        repeat: true,
      });
    }
  }

  /**
   * Keep the selected character visible
   * @returns {void} Nothing
   */
  function clampScroll() {
    if (selectedControl < ACTION_BUTTONS.count) {
      return; // Buttons do not scroll the grid
    }

    const selectedRow = Math.floor(
      (selectedControl - ACTION_BUTTONS.count) / LAYOUT.columnCount,
    );

    if (selectedRow < scrollOffset) {
      scrollOffset = selectedRow;
    }

    if (selectedRow >= scrollOffset + LAYOUT.visibleRowCount) {
      scrollOffset = selectedRow - LAYOUT.visibleRowCount + 1;
    }

    if (scrollOffset < 0) {
      scrollOffset = 0;
    }

    const maximumScrollOffset = Math.max(
      0,
      getGridRowCount() - LAYOUT.visibleRowCount,
    );

    if (scrollOffset > maximumScrollOffset) {
      scrollOffset = maximumScrollOffset;
    }
  }

  /**
   * Trim text to fit a width
   * @param text The text to trim
   * @param maximumWidth The pixel width
   * @returns {string} The text that fits
   */
  function clipText(text, maximumWidth) {
    if (h.stringWidth(text) <= maximumWidth) {
      return text;
    }

    while (text.length && h.stringWidth(text + '..') > maximumWidth) {
      text = text.slice(0, -1);
    }

    return text + '..';
  }

  /**
   * Compare two slot numbers for sorting
   * @param firstNumber The first slot number
   * @param secondNumber The second slot number
   * @returns {number} The sort value
   */
  function compareNumbers(firstNumber, secondNumber) {
    return firstNumber - secondNumber;
  }

  /**
   * Create the character folder when missing
   * @returns {void} Nothing
   */
  function createCharacterDirectory() {
    const pathParts = CHARACTER_DIR.split('/');

    let currentPath = '';

    for (let partIndex = 0; partIndex < pathParts.length; partIndex++) {
      currentPath += (partIndex ? '/' : '') + pathParts[partIndex];

      if (!directoryExists(currentPath)) {
        try {
          fs.mkdir(currentPath);
        } catch (error) {}
      }
    }
  }

  /**
   * Check whether a folder exists
   * @param path The folder path
   * @returns {boolean} Whether the folder exists
   */
  function directoryExists(path) {
    try {
      const fileStatus = fs.statSync(path);

      return !!fileStatus && !!fileStatus.dir;
    } catch (error) {
      return false;
    }
  }

  /**
   * Stop the hold timer and hardware press watch
   * @returns {void} Nothing
   */
  function disarmPressWatch() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }

    if (pressWatch) {
      clearWatch(pressWatch);
      pressWatch = null;
    }
  }

  function drawList() {
    h.clear(0);
    h.setColor(3)
      .setFontMonofonto28()
      .setFontAlign(0, -1)
      .drawString('VAULTS & DEATHCLAWS', app.W / 2, 6);
    h.setColor(2)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString(
        'A FALLOUT RPG CHARACTER & DICE TERMINAL',
        app.W / 2,
        LAYOUT.subtitleTop,
      );

    // Draw the two action buttons
    for (
      let buttonIndex = 0;
      buttonIndex < ACTION_BUTTONS.count;
      buttonIndex++
    ) {
      const buttonLeft =
        LAYOUT.sideMargin +
        buttonIndex * (LAYOUT.columnWidth + LAYOUT.columnGap);

      if (selectedControl === buttonIndex) {
        h.setColor(3).fillRect(
          buttonLeft,
          LAYOUT.actionButtonTop,
          buttonLeft + LAYOUT.columnWidth,
          LAYOUT.actionButtonTop + LAYOUT.actionButtonHeight,
        );
        h.setColor(0);
      } else {
        h.setColor(2).drawRect(
          buttonLeft,
          LAYOUT.actionButtonTop,
          buttonLeft + LAYOUT.columnWidth,
          LAYOUT.actionButtonTop + LAYOUT.actionButtonHeight,
        );
        h.setColor(3);
      }

      h.setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString(
          clipText(ACTION_BUTTONS.labels[buttonIndex], LAYOUT.columnWidth - 12),
          buttonLeft + LAYOUT.columnWidth / 2,
          LAYOUT.actionButtonTop + LAYOUT.actionButtonHeight / 2,
        );
    }

    const characterCount = getCharacterCount();
    const gridRowCount = getGridRowCount();

    // Draw the visible character rows
    for (
      let gridRow = scrollOffset;
      gridRow < scrollOffset + LAYOUT.visibleRowCount && gridRow < gridRowCount;
      gridRow++
    ) {
      for (let gridColumn = 0; gridColumn < LAYOUT.columnCount; gridColumn++) {
        const characterIndex = gridRow * LAYOUT.columnCount + gridColumn;

        if (characterIndex >= characterCount) {
          break; // The last row may have one character
        }

        const cellLeft =
          LAYOUT.sideMargin +
          gridColumn * (LAYOUT.columnWidth + LAYOUT.columnGap);
        const cellTop =
          LAYOUT.gridTop + (gridRow - scrollOffset) * LAYOUT.gridRowHeight;
        // Character cells come after the buttons
        const isSelected =
          selectedControl === ACTION_BUTTONS.count + characterIndex;

        if (isSelected) {
          Pip.shadeBox(
            cellLeft,
            cellTop,
            cellLeft + LAYOUT.columnWidth,
            cellTop + LAYOUT.gridRowHeight - 4,
          );
        }

        h.setColor(isSelected ? 3 : 2)
          .setFontMonofonto16()
          .setFontAlign(-1, -1)
          .drawString(
            clipText(
              characterNames[characterIndex] ||
                'CHARACTER ' +
                  formatCharacterNumber(characterSlots[characterIndex]),
              LAYOUT.columnWidth - 12,
            ),
            cellLeft + 6,
            cellTop + 4,
          );
      }
    }

    if (!characterCount) {
      h.setColor(1)
        .setFontMonofonto16()
        .setFontAlign(0, -1)
        .drawString('No character sheets yet.', app.W / 2, LAYOUT.gridTop + 12);
    }

    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString(
        'L-KNOB UP/DOWN   R-KNOB LEFT/RIGHT   HOLD=DELETE',
        app.W / 2,
        app.H - 4,
      );
    h.flip();
    Pip.lastFlip = getTime();
  }

  /**
   * Find the first open character slot
   * @returns {number} The open slot number
   */
  function findNextAvailableSlot() {
    let nextSlot = 1;

    for (let slotIndex = 0; slotIndex < characterSlots.length; slotIndex++) {
      if (characterSlots[slotIndex] === nextSlot) {
        nextSlot++;
      } else {
        if (characterSlots[slotIndex] > nextSlot) {
          break; // Stop at the first gap
        }
      }
    }

    return nextSlot;
  }

  /**
   * Format a slot number for its file name
   * @param characterNumber The slot number
   * @returns {string} The two digit slot number
   */
  function formatCharacterNumber(characterNumber) {
    return (characterNumber < 10 ? '0' : '') + characterNumber;
  }

  /**
   * Get the number of saved characters
   * @returns {number} The saved character count
   */
  function getCharacterCount() {
    return characterSlots.length;
  }

  /**
   * Get the number of character grid rows
   * @returns {number} The grid row count
   */
  function getGridRowCount() {
    return Math.ceil(getCharacterCount() / LAYOUT.columnCount);
  }

  /**
   * Close the delete dialog and restore list input
   * @returns {void} Nothing
   */
  function handleConfirmationCancel() {
    confirmationScene.remove();
    confirmationScene = null;
    pendingDeleteIndex = null;

    Pip.onExclusive('knob1', onLeftScrollWheel);
    Pip.onExclusive('knob2', onRightScrollWheel);

    armPressWatch();
    drawList();
  }

  /**
   * Delete the save and reload the character list
   * @returns {void} Nothing
   */
  function handleConfirmationDelete() {
    confirmationScene.remove();
    confirmationScene = null;

    try {
      fs.unlink(
        CHARACTER_DIR +
          '/' +
          formatCharacterNumber(characterSlots[pendingDeleteIndex]) +
          '.JSON',
      );
    } catch (error) {}

    pendingDeleteIndex = null;
    loadCharacters();

    // Keep the cursor on a valid item
    const maximumSelection = ACTION_BUTTONS.count + getCharacterCount() - 1;

    if (selectedControl > maximumSelection) {
      selectedControl = maximumSelection;
    }

    if (selectedControl < 0) {
      selectedControl = 0;
    }

    rememberSelectedColumn();
    clampScroll();

    Pip.onExclusive('knob1', onLeftScrollWheel);
    Pip.onExclusive('knob2', onRightScrollWheel);

    armPressWatch();
    drawList();
  }

  /**
   * Open delete after a completed hold
   * @returns {void} Nothing
   */
  function handleLongPress() {
    if (selectedControl >= ACTION_BUTTONS.count) {
      if (Pip.playSound) {
        Pip.playSound('TAB');
      }

      openConfirmation(selectedControl - ACTION_BUTTONS.count);
    }
  }

  /**
   * Start the delete hold timer
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
    handleLongPress();
  }

  /**
   * Handle the end of a press
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
   * Handle both hardware press edges
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

  function handleShortPress() {
    if (Pip.playSound) {
      Pip.playSound('TAB');
    }

    openSelection();
  }

  /**
   * Load character slots and names
   * @returns {void} Nothing
   */
  function loadCharacters() {
    createCharacterDirectory();
    characterNames = [];
    characterSlots = [];

    let directoryEntries = [];

    try {
      directoryEntries = fs.readdir(CHARACTER_DIR);
    } catch (error) {}

    // Find save files for slots 1 through 99
    for (
      let entryIndex = 0;
      entryIndex < directoryEntries.length;
      entryIndex++
    ) {
      if (/\.json$/i.test(directoryEntries[entryIndex])) {
        const characterNumber = parseInt(directoryEntries[entryIndex], 10);

        if (characterNumber >= 1 && characterNumber <= 99) {
          characterSlots.push(characterNumber);
        }
      }
    }

    characterSlots.sort(compareNumbers);

    // Read each character name
    for (let slotIndex = 0; slotIndex < characterSlots.length; slotIndex++) {
      let characterName = '';

      try {
        const character = JSON.parse(
          fs.readFileSync(
            CHARACTER_DIR +
              '/' +
              formatCharacterNumber(characterSlots[slotIndex]) +
              '.JSON',
          ),
        );

        if (character && typeof character.name === 'string') {
          characterName = character.name;
        }
      } catch (error) {}

      characterNames.push(characterName);
    }
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

    const characterCount = getCharacterCount();

    if (direction > 0) {
      // Move down
      if (selectedControl < ACTION_BUTTONS.count) {
        // Move from a button into its character column
        if (characterCount > 0) {
          selectedControl =
            ACTION_BUTTONS.count +
            (selectedColumn < characterCount ? selectedColumn : 0);
        }
      } else {
        // Move down one character row
        const characterIndex = selectedControl - ACTION_BUTTONS.count;
        const currentRow = Math.floor(characterIndex / LAYOUT.columnCount);
        const currentColumn = characterIndex % LAYOUT.columnCount;
        const nextCharacterIndex =
          (currentRow + 1) * LAYOUT.columnCount + currentColumn;

        if (nextCharacterIndex < characterCount) {
          selectedControl = ACTION_BUTTONS.count + nextCharacterIndex;
        } else {
          // Use the first cell when the next row is not full
          if ((currentRow + 1) * LAYOUT.columnCount < characterCount) {
            selectedControl =
              ACTION_BUTTONS.count + (currentRow + 1) * LAYOUT.columnCount;
          }
        }
      }
    } else {
      // Move up
      if (selectedControl >= ACTION_BUTTONS.count) {
        const characterIndex = selectedControl - ACTION_BUTTONS.count;
        const currentRow = Math.floor(characterIndex / LAYOUT.columnCount);
        const currentColumn = characterIndex % LAYOUT.columnCount;

        if (currentRow === 0) {
          // Move from the first row to its button
          selectedControl = currentColumn;
        } else {
          selectedControl =
            ACTION_BUTTONS.count +
            (currentRow - 1) * LAYOUT.columnCount +
            currentColumn;
        }
      }
    }

    rememberSelectedColumn();
    clampScroll();

    if (Pip.playSound) {
      Pip.playSound('SCROLL');
    }

    drawList();
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

    // Move between buttons
    if (selectedControl < ACTION_BUTTONS.count) {
      selectedControl = E.clip(
        selectedControl + (direction > 0 ? 1 : -1),
        0,
        ACTION_BUTTONS.count - 1,
      );
      selectedColumn = selectedControl;

      if (Pip.playSound) {
        Pip.playSound('SCROLL');
      }

      drawList();

      return;
    }

    // Move between characters in the same row
    const characterCount = getCharacterCount();
    const characterIndex = selectedControl - ACTION_BUTTONS.count;
    const currentRow = Math.floor(characterIndex / LAYOUT.columnCount);
    const currentColumn = characterIndex % LAYOUT.columnCount;

    if (direction > 0) {
      // Move right when the cell has a character
      if (
        currentColumn === 0 &&
        currentRow * LAYOUT.columnCount + 1 < characterCount
      ) {
        selectedControl =
          ACTION_BUTTONS.count + currentRow * LAYOUT.columnCount + 1;
      }
    } else {
      // Move left
      if (currentColumn === 1) {
        selectedControl =
          ACTION_BUTTONS.count + currentRow * LAYOUT.columnCount;
      }
    }

    rememberSelectedColumn();

    if (Pip.playSound) {
      Pip.playSound('SCROLL');
    }

    drawList();
  }

  /**
   * Open the delete dialog for a character
   * @param characterIndex The character list index
   * @returns {void} Nothing
   */
  function openConfirmation(characterIndex) {
    let source;

    try {
      source = fs.readFileSync(CONFIRM);
    } catch (error) {
      return; // Stop when the dialog file is missing
    }

    pendingDeleteIndex = characterIndex;
    // Hand input to the dialog
    disarmPressWatch();
    Pip.removeListener('knob1', onLeftScrollWheel);
    Pip.removeListener('knob2', onRightScrollWheel);
    confirmationScene = eval(source)(app, {
      name:
        characterNames[characterIndex] ||
        'CHARACTER ' + formatCharacterNumber(characterSlots[characterIndex]),
      onCancel: handleConfirmationCancel,
      onConfirm: handleConfirmationDelete,
    });
  }

  /**
   * Open the selected button or character
   * @returns {void} Nothing
   */
  function openSelection() {
    app.listSel = selectedControl; // Save the cursor for later

    if (selectedControl === 0) {
      // Add a character in the next open slot
      const nextSlot = findNextAvailableSlot();

      if (nextSlot > 99) {
        return;
      }

      app.go(app.scenes.EDIT, {
        characterNumber: nextSlot,
        isNewCharacter: true,
      });
    } else {
      if (selectedControl === 1) {
        app.go(app.scenes.DICE); // Open the dice roller
      } else {
        // Open the character editor
        app.go(app.scenes.EDIT, {
          characterNumber:
            characterSlots[selectedControl - ACTION_BUTTONS.count],
          isNewCharacter: false,
        });
      }
    }
  }

  /**
   * Save the column for vertical moves
   * @returns {void} Nothing
   */
  function rememberSelectedColumn() {
    selectedColumn =
      selectedControl < ACTION_BUTTONS.count
        ? selectedControl
        : (selectedControl - ACTION_BUTTONS.count) % LAYOUT.columnCount;
  }

  function removeScene() {
    disarmPressWatch();

    if (confirmationScene) {
      confirmationScene.remove();
      confirmationScene = null;
    }

    pendingDeleteIndex = null;
    Pip.removeListener('knob1', onLeftScrollWheel);
    Pip.removeListener('knob2', onRightScrollWheel);
  }

  Pip.onExclusive('knob1', onLeftScrollWheel);
  Pip.onExclusive('knob2', onRightScrollWheel);

  armPressWatch();
  loadCharacters();

  // Keep the saved cursor on a valid item
  const maximumSelection = ACTION_BUTTONS.count + getCharacterCount() - 1;

  if (selectedControl > maximumSelection) {
    selectedControl = maximumSelection;
  }

  if (selectedControl < 0) {
    selectedControl = 0;
  }

  rememberSelectedColumn();
  clampScroll();
  drawList();

  return {
    remove: removeScene,
  };
});
