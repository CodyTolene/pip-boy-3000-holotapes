// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: EDIT_TEXT.JS (scene)
//  Description: Opens the keyboard for one character text field
//  Notes:
//    returnToMenu saves the name and opens the edit menu
//    Other text fields return to the last form
// =============================================================================

(function (app, options) {
  const CHARACTER_DIR = 'HOLO/VND/CHAR/';
  const KEYBOARD = 'HOLO/VND/KEYBOARD.JS';

  let keyboard = null;
  // Defer loading the keyboard by one tick
  let loadTimeout = setTimeout(function () {
    loadTimeout = null;

    try {
      process.memory(true);
      E.defrag();
    } catch (error) {}

    keyboard = eval(fs.readFileSync(KEYBOARD))({
      app: app,
      description: options.label,
      maximumLength: options.maximumLength || 64,
      onDone: done,
      text: get(options.path) || '', // Start with the current field value
    });
  }, 0);

  /**
   * Save the text when the user selects OK
   * @param text The text from the keyboard
   * @returns {void} Nothing
   */
  function done(text) {
    // Find the field and set its value
    let value = app.editor.data;

    for (let i = 0; i < options.path.length - 1; i++) {
      value = value[options.path[i]];
    }

    value[options.path[options.path.length - 1]] = text;

    if (options.returnToMenu) {
      // Save names right away for the character list
      fs.writeFileSync(
        CHARACTER_DIR +
          (app.editor.number < 10 ? '0' : '') +
          app.editor.number +
          '.JSON',
        JSON.stringify(app.editor.data),
      );
      app.go(app.scenes.EDIT_MENU);
    } else {
      // Return to the same form screen
      app.go(app.scenes.EDIT_FORM, options.screen);
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

  return {
    remove: function () {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }

      if (keyboard) {
        keyboard.remove();
      }
    },
  };
});
