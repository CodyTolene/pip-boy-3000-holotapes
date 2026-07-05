// =============================================================================
//  Name: Radroach Races
//  Author: Theeohn Megistus
//  License: MIT
//  Repository: https://github.com/Theeohn/Radroach-Races
// =============================================================================
//  File: APP.JS (main, scene manager)
//  Description: This is the main shell for the holotape, a "scene" manager
//  that swaps scenes in and out as needed to keep memory usage low.
// =============================================================================

(function () {
  const HOLOTAPE_DIR = 'HOLO/RADROACH_RACES/';

  let scene = null; // Current scene
  let pending = null; // Next scene queued
  let loadTimer = null; // Timer for deferred scene switch

  const app = {
    scenes: {
      RACE: 'RACE.JS',
      TITLE: 'TITLE.JS',
    },

    // Go to scene
    go: function (file, params) {
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
      .drawString('UNABLE TO LOAD', 240, 140);
    h.setColor(2)
      .setFontMonofonto16()
      .setFontAlign(0, 0)
      .drawString(file, 240, 172);
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 0)
      .drawString('Try Reinstalling Holotape.', 240, 204);
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

    if (scene) {
      scene.remove();
      scene = null;
    }

    Pip.audioStop();

    h.clear();
    h.flip();
  }

  // Start with the title scene
  app.go(app.scenes.TITLE);

  return {
    id: 'radroachraces',
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
