// =============================================================================
//  Name: Dice & Deathclaws Terminal
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: APP.JS (main, scene manager)
//  Description: This is the main shell for the holotape, a "scene" manager
//  that swaps scenes in and out as needed to keep memory usage low.
// =============================================================================

(function () {
  const HOLOTAPE_DIR = 'HOLO/DNDC/';

  let scene: DndcScene | null = null; // Current scene
  let pending: DndcPendingScene | null = null; // Next scene queued
  let loadTimer: number | null = null; // Timer for deferred scene switch

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
    go: function (file: string, params?: object) {
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
  } as DndcApp;

  /**
   * Draw a scene load error
   * @param file The scene file path
   * @returns {void} Nothing
   */
  function drawError(file: string | number): void {
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
  function loadScene(): void {
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
      scene = (
        eval(fs.readFileSync(HOLOTAPE_DIR + p.file)) as DndcSceneFactory
      )(app, p.params);
    } catch (e) {
      drawError(p.file);

      return;
    }
  }

  function remove(): void {
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

  /**
   * One-time move of saves made before the 2.0.0 rename.
   *   Prev: `HOLO/VND/CHAR/`
   *   New: `HOLO/DNDC/CHAR/`
   */
  function migrateSaves(): void {
    const OLD_CHARACTER_DIR = 'HOLO/VND/CHAR/';
    const NEW_CHARACTER_DIR = HOLOTAPE_DIR + 'CHAR/';

    let entries: string[] = [];
    let entryIndex = 0;
    let saveText = '';

    try {
      entries = fs.readdir(OLD_CHARACTER_DIR.slice(0, -1));
    } catch (e) {
      return; // None
    }

    if (!entries || !entries.length) {
      return;
    }

    try {
      fs.mkdir(NEW_CHARACTER_DIR.slice(0, -1));
    } catch (e) {} // Already exists

    for (entryIndex = 0; entryIndex < entries.length; entryIndex++) {
      if (!/^\d+\.json$/i.test(entries[entryIndex])) {
        continue;
      }

      try {
        if (fs.statSync(NEW_CHARACTER_DIR + entries[entryIndex])) {
          continue; // Never overwrite a save in new folder
        }
      } catch (e) {}

      try {
        saveText = fs.readFileSync(OLD_CHARACTER_DIR + entries[entryIndex]);

        if (!saveText) {
          continue;
        }

        fs.writeFileSync(NEW_CHARACTER_DIR + entries[entryIndex], saveText);

        if (
          fs.readFileSync(NEW_CHARACTER_DIR + entries[entryIndex]) === saveText
        ) {
          fs.unlink(OLD_CHARACTER_DIR + entries[entryIndex]);
        }
      } catch (e) {} // Keep old file when anything fails

      saveText = '';
    }
  }

  migrateSaves();

  // Start with the intro scene
  app.go(app.scenes.INTRO);

  return {
    id: 'dndc',
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
