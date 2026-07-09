// =============================================================================
//  Name: Checkers
//  Author(s): @trekker87 @CodyTolene
//  License: MIT
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: app.js (main, scene manager)
//  Description: Main shell for the holotape, a "scene" manager that swaps
//  scenes (menu, game, help) in and out as needed to keep memory usage low.
// =============================================================================

(function () {
  let loadTimer = null; // Timer for deferred scene switch
  let pending = null; // Next scene queued
  let scene = null; // Current scene

  const app = {
    H: h.getHeight(), // Screen Height
    W: h.getWidth(), // Screen Width

    scenes: {
      GAME: 'GAME.JS',
      HELP: 'HELP.JS',
      MENU: 'MENU.JS',
    },

    // Garbage collect
    gc: function () {
      try {
        // Garbage collect memory
        // https://www.espruino.com/Reference#l_process_memory
        process.memory(true); // true = GC
        // Defrag memory
        // https://www.espruino.com/Reference#l_E_defrag
        E.defrag();
      } catch (e) {}
    },

    // Go to scene
    go: function (file, params) {
      pending = { file: file, params: params };

      if (!loadTimer) {
        // Defer a tick to clear and load the scene safely
        loadTimer = setTimeout(loadScene, 0);
      }
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
      scene = eval(fs.readFileSync('HOLO/CHECKERS/' + p.file))(app, p.params);
    } catch (e) {
      drawError(p.file);
    }
  }

  function remove() {
    if (loadTimer) {
      clearTimeout(loadTimer);
      loadTimer = null;
    }

    pending = null;

    if (scene) {
      scene.remove();
      scene = null;
    }

    Pip.audioStop();

    h.clear();
    h.flip();
  }

  // Start at the main menu
  app.go(app.scenes.MENU);

  return {
    id: 'CHECKERS',
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
