// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: EDIT.JS (scene)
//  Description: Loads or creates a character and opens the editor
//  Notes:
//    New characters open the keyboard and saved characters open the edit menu
//    Character files use HOLO/VND/CHAR/NN.JSON
// =============================================================================

(function (app, editorParameters) {
  const CHARACTER_DIR = 'HOLO/VND/CHAR/';
  const EDIT_DATA = 'HOLO/VND/EDIT_DATA.JS';

  // Defer setup by one tick
  let initializationTimeout = setTimeout(function () {
    initializationTimeout = null;

    try {
      process.memory(true);
      E.defrag();
    } catch (error) {}

    let character = null;

    // Load the character save file when it exists
    if (!editorParameters.isNewCharacter) {
      try {
        character = JSON.parse(
          fs.readFileSync(
            CHARACTER_DIR +
              (editorParameters.characterNumber < 10 ? '0' : '') +
              editorParameters.characterNumber +
              '.JSON',
          ),
        );
      } catch (error) {}
    }

    // Build the editor state
    app.editor = {
      data: eval(fs.readFileSync(EDIT_DATA))({
        requestType: character ? 'load' : 'new',
        storedCharacter: character,
      }),
      history: [], // Screen history for the back button
      number: editorParameters.characterNumber, // Character slot number
    };
    character = null; // Drop the loaded copy

    try {
      process.memory(true);
      E.defrag();
    } catch (error) {}

    if (editorParameters.isNewCharacter) {
      // Save the new slot before asking for a name
      fs.writeFileSync(
        CHARACTER_DIR +
          (app.editor.number < 10 ? '0' : '') +
          app.editor.number +
          '.JSON',
        JSON.stringify(app.editor.data),
      );
      app.go(app.scenes.EDIT_TEXT, {
        label: 'NAME YOUR CHARACTER',
        maximumLength: 20,
        path: ['name'],
        returnToMenu: true,
      });
    } else {
      app.go(app.scenes.EDIT_MENU);
    }
  }, 0);

  return {
    remove: function () {
      // Cancel setup if the scene closes early
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
    },
  };
});
