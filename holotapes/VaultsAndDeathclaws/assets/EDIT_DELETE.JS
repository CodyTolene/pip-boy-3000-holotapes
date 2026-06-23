// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: EDIT_DELETE.JS (scene)
//  Description: Opens the delete dialog for the current character
//  Notes: Cancel opens the edit menu and confirm deletes the save file
// =============================================================================

(function (app) {
  const CHARACTER_DIR = 'HOLO/VND/CHAR/';
  const CONFIRM = 'HOLO/VND/CONFIRM.JS';

  let confirmation = null;
  // Defer loading the dialog by one tick
  let loadTimeout = setTimeout(function () {
    loadTimeout = null;

    try {
      process.memory(true);
      E.defrag();
    } catch (error) {}

    confirmation = eval(fs.readFileSync(CONFIRM))(app, {
      // Show the name or slot number
      name:
        app.editor.data.name ||
        'CHARACTER ' + (app.editor.number < 10 ? '0' : '') + app.editor.number,
      onCancel: function () {
        app.go(app.scenes.EDIT_MENU);
      },
      onConfirm: function () {
        // Delete the character save file
        try {
          fs.unlink(
            CHARACTER_DIR +
              (app.editor.number < 10 ? '0' : '') +
              app.editor.number +
              '.JSON',
          );
        } catch (error) {}

        app.editor = null; // Drop the working copy

        try {
          process.memory(true);
          E.defrag();
        } catch (error) {}

        app.go(app.scenes.LIST);
      },
    });
  }, 0);

  return {
    remove: function () {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }

      if (confirmation) {
        confirmation.remove();
      }
    },
  };
});
