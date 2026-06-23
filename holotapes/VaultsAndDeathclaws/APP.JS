// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: APP.JS (main, scene manager)
//  Description: This is the main shell for the holotape, a "scene" manager
//  that swaps scenes in and out as needed to keep memory usage low.
// =============================================================================

(function () {
  const HOLOTAPE_DIR = 'HOLO/VND/';

  let scene = null; // Current scene
  let pending = null; // Next scene queued
  let loadTimer = null; // Timer for deferred scene switch

  const app = {
    listSel: 0, // List Selection (preserved between scenes)
    H: h.getHeight(), // Screen Height
    W: h.getWidth(), // Screen Width

    scenes: {
      DICE: 'DICE.JS',
      DICE_MENU: 'DICE_MENU.JS',
      DICE_ROLL: 'DICE_ROLL.JS',
      EDIT: 'EDIT.JS',
      EDIT_DELETE: 'EDIT_DELETE.JS',
      EDIT_FORM: 'EDIT_FORM.JS',
      EDIT_MENU: 'EDIT_MENU.JS',
      EDIT_TEXT: 'EDIT_TEXT.JS',
      INTRO: 'INTRO.JS',
      LIST: 'LIST.JS',
    },

    // Go to scene
    go: function (file, params) {
      // Wish we could do shorthand names here...
      pending = { file: file, params: params };

      if (!loadTimer) {
        // Defer a tick to clear and load scene safely.
        loadTimer = setTimeout(loadScene, 0);
      }
    },

    // Garbage collect
    gc: function () {
      try {
        // Garbage collect memory
        // https://www.espruino.com/Reference#l_process_memory
        process.memory(true); // true = GC
        // Defrag memory
        // https://www.espruino.com/Reference#l_E_defrag
        E.defrag(); // Probably overkill, but safe
      } catch (e) {}
    },
  };

  /**
   * Draw a scene load error
   * @param file The scene file path
   * @returns {void} Nothing
   */
  function drawError(file) {
    h.clear(0);
    h.setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, 0)
      .drawString('UNABLE TO LOAD', app.W / 2, app.H / 2 - 20);
    h.setColor(2)
      .setFontMonofonto16()
      .setFontAlign(0, 0)
      .drawString(file, app.W / 2, app.H / 2 + 12);
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 0)
      .drawString('Try Reinstalling Holotape.', app.W / 2, app.H / 2 + 44);
    h.flip();
    Pip.lastFlip = getTime();
  }

  /**
   * Load the next scene and remove the current scene
   * @returns {void} Nothing
   */
  function loadScene() {
    loadTimer = null;

    const p = pending;

    pending = null;

    if (!p) {
      return;
    }

    if (scene) {
      scene.remove();
      scene = null;
    }

    app.gc();

    try {
      // Load scene
      scene = eval(fs.readFileSync(HOLOTAPE_DIR + p.file))(app, p.params);
    } catch (e) {
      drawError(p.file);

      return;
    }
  }

  function remove() {
    if (loadTimer) {
      clearTimeout(loadTimer);
      loadTimer = null;
    }

    pending = null;
    app.editor = null;
    app.diceState = null;

    if (scene) {
      scene.remove();
      scene = null;
    }

    Pip.audioStop();

    try {
      Pip.videoStop();
    } catch (e) {}

    h.clear();
    h.flip();
  }

  // Start with the intro scene
  app.go(app.scenes.INTRO);

  return {
    id: 'vnd',
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
