// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: EDIT_MENU.JS (scene)
//  Description: Shows the character actions and sheet sections
//  Notes: Selection 0 through 3 is a button and 4 onward is a section
// =============================================================================

(function (app) {
  const CHARACTER_DIR = 'HOLO/VND/CHAR/';
  const BUTTONS = [
    ['< BACK', 'back'],
    ['SAVE', 'save'],
    ['DELETE', 'delete'],
    ['RENAME', 'rename'],
  ];
  // Each section stores its label, code, and optional table
  const SECTIONS = [
    ['PROFILE', 'profile'],
    ['S.P.E.C.I.A.L.', 'special'],
    ['SKILLS', 'skills'],
    ['COMBAT', 'combat'],
    ['DAMAGE RESIST.', 'body'],
    ['CONDITIONS', 'conditions'],
    ['CAPS & CARRY', 'caps'],
    ['EQUIPMENT', 'equip'],
    ['WEAPONS', 'table', 'weapons'],
    ['AMMO', 'table', 'ammo'],
    ['GEAR', 'table', 'gear'],
    ['PERKS & TRAITS', 'table', 'perks'],
    ['COMPANIONS', 'companions'],
    ['NOTES', 'notes'],
  ];
  // Section rows that fit between the buttons and the footer
  const VISIBLE_SECTIONS = Math.floor((app.H - 90) / 22);

  let savedTimeout = null; // Tracks the saved message
  let sectionScroll = 0; // First visible section row
  // 0 through 3 are buttons and 4 onward are sections
  let selected = 0;
  let selectedButton = 0; // Last selected button

  function draw() {
    const width = (app.W - 40) / 4; // Four equal buttons with margins

    h.clear(0)
      .setColor(3)
      .setFontMonofonto18()
      .setFontAlign(0, -1)
      .drawString(
        // Show the name or slot number
        app.editor.data.name ||
          'CHARACTER ' +
            (app.editor.number < 10 ? '0' : '') +
            app.editor.number,
        app.W / 2,
        5,
      );

    // Draw the four action buttons
    // Hardcoded 4 for performance
    for (let i = 0; i < 4; i++) {
      const left = 8 + i * (width + 8);

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
        .drawString(BUTTONS[i][0], left + width / 2, 45);
    }

    // Keep the selected section visible
    if (selected >= 4) {
      const sectionIndex = selected - 4;

      if (sectionIndex < sectionScroll) {
        sectionScroll = sectionIndex;
      } else if (sectionIndex >= sectionScroll + VISIBLE_SECTIONS) {
        sectionScroll = sectionIndex - VISIBLE_SECTIONS + 1;
      }
    }

    sectionScroll = E.clip(
      sectionScroll,
      0,
      Math.max(0, SECTIONS.length - VISIBLE_SECTIONS),
    );

    // Draw the visible section rows after the buttons
    for (
      let i = sectionScroll;
      i < SECTIONS.length && i < sectionScroll + VISIBLE_SECTIONS;
      i++
    ) {
      const top = 68 + (i - sectionScroll) * 22;

      if (selected === i + 4) {
        Pip.shadeBox(6, top, app.W - 6, top + 20);
      }

      h.setColor(selected === i + 4 ? 3 : 2)
        .setFontMonofonto14()
        .setFontAlign(-1, -1)
        .drawString(SECTIONS[i][0], 12, top + 3)
        .setFontAlign(1, -1)
        .drawString('>', app.W - 14, top + 3); // Show that the row opens
    }

    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString(
        // Show saved in the footer after saving
        savedTimeout ? 'SAVED' : 'L-KNOB MOVE/SELECT    R-KNOB BUTTONS',
        app.W / 2,
        app.H - 6,
      );
    h.flip();
    Pip.lastFlip = getTime();
  }

  /**
   * Handle the left scroll wheel input
   * @param direction The direction of the scroll wheel
   * @returns {void} Nothing
   */
  function onLeftScrollWheel(direction) {
    if (direction) {
      if (direction > 0) {
        // Move from the buttons into the section list
        selected =
          selected < 4 ? 4 : E.clip(selected + 1, 4, SECTIONS.length + 3);
      } else if (selected === 4) {
        selected = selectedButton; // Move back to the last button
      } else if (selected > 4) {
        selected--;
      }

      if (Pip.playSound) {
        Pip.playSound('SCROLL');
      }

      draw();

      return;
    }

    // Run the selected action
    if (Pip.playSound) {
      Pip.playSound('TAB');
    }

    // Handle a button
    if (selected < 4) {
      const command = BUTTONS[selected][1];

      if (command === 'back') {
        // Drop the editor and return to the list
        app.editor = null;

        try {
          process.memory(true);
          E.defrag();
        } catch (error) {}

        app.go(app.scenes.LIST);
      } else if (command === 'save') {
        save();

        // Show saved in the footer for a short time
        if (savedTimeout) {
          clearTimeout(savedTimeout);
        }

        savedTimeout = setTimeout(function () {
          savedTimeout = null;
          draw();
        }, 1200);
        draw();
      } else if (command === 'delete') {
        app.go(app.scenes.EDIT_DELETE);
      } else {
        // Open the keyboard for the name
        app.go(app.scenes.EDIT_TEXT, {
          label: 'RENAME CHARACTER',
          maximumLength: 20,
          path: ['name'],
          returnToMenu: true,
        });
      }

      return;
    }

    // Open the selected section with fresh history
    app.editor.history = [];
    app.go(app.scenes.EDIT_FORM, {
      code: SECTIONS[selected - 4][1],
      table: SECTIONS[selected - 4][2],
    });
  }

  /**
   * Handle the right scroll wheel input
   * @param direction The direction of the scroll wheel
   * @returns {void} Nothing
   */
  function onRightScrollWheel(direction) {
    if (!direction || selected >= 4) {
      return;
    }

    selected = E.clip(selected + (direction > 0 ? 1 : -1), 0, 3);
    selectedButton = selected;

    if (Pip.playSound) {
      Pip.playSound('SCROLL');
    }

    draw();
  }

  /**
   * Save the character to its slot file
   * @returns {void} Nothing
   */
  function save() {
    fs.writeFileSync(
      CHARACTER_DIR +
        (app.editor.number < 10 ? '0' : '') +
        app.editor.number +
        '.JSON',
      JSON.stringify(app.editor.data),
    );
  }

  Pip.onExclusive('knob1', onLeftScrollWheel);
  Pip.onExclusive('knob2', onRightScrollWheel);

  draw();

  return {
    remove: function () {
      if (savedTimeout) {
        clearTimeout(savedTimeout);
      }

      Pip.removeListener('knob1', onLeftScrollWheel);
      Pip.removeListener('knob2', onRightScrollWheel);
    },
  };
});
