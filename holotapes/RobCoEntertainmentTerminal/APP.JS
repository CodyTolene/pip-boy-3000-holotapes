// =============================================================================
//  Name: RobCo Entertainment Terminal
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function () {
  const HOLOTAPE_DIR = 'HOLO/RCET/';

  let scene = null;
  let pending = null;
  let loading = null;
  let loadTimer = null;

  const app = {
    H: 320,
    W: 480,
    currentBright: null,
    currentVol: null,
    initialBright: null,
    initialVol: null,
    names: [
      'RobCo Entertainment Terminal',
      'RobCo Image Terminal',
      'RobCo Music Terminal',
      'RobCo Video Terminal',
    ],
    sortDir: global.__RCETSort || 1,
    version: '2.1.0',

    scenes: {
      INTRO: 'INTRO.JS',
      MENU: 'MENU.JS',
      MUSIC: 'MUSIC.JS',
      VIDEO: 'VIDEO.JS',
      IMAGES: 'IMAGES.JS',
      SETTINGS: 'SETTINGS.JS',
    },

    go: function (file, params) {
      if (!file) {
        logLoadError('app.go called without file', file);
      }
      pending = { file: file, params: params };

      if (!loadTimer) {
        loadTimer = setTimeout(loadScene, 0);
      }
    },

    gc: function () {
      try {
        process.memory(true);
        E.defrag();
      } catch (e) {}
    },
  };

  function drawError(file, err) {
    h.clear(0);
    h.setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, 0)
      .drawString('UNABLE TO LOAD', app.W / 2, app.H / 2 - 20);
    h.setColor(2)
      .setFontMonofonto16()
      .setFontAlign(0, 0)
      .drawString(file || 'NO SCENE FILE', app.W / 2, app.H / 2 + 12);
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 0)
      .drawString(
        err && err.message
          ? err.message.slice(0, 34)
          : 'Try Reinstalling Holotape.',
        app.W / 2,
        app.H / 2 + 44,
      );
    h.flip();
    Pip.lastFlip = getTime();
  }

  function loadScene() {
    loadTimer = null;

    loading = pending;
    pending = null;

    if (!loading) return;

    if (scene) {
      scene.remove();
      scene = null;
      app.gc();
      loadTimer = setTimeout(openScene, 0);
      return;
    }

    openScene();
  }

  function logLoadError(msg, file, err) {
    try {
      console.log(
        'RobCo Entertainment Terminal scene load: ' +
          msg +
          ' file=' +
          (file || 'undefined') +
          (err ? ' error=' + ((err && err.message) || err) : ''),
      );
    } catch (e) {}
  }

  function openScene() {
    loadTimer = null;

    const p = loading;
    loading = null;

    if (!p) return;

    if (!p.file) {
      logLoadError('missing scene file', p.file);
      drawError(p.file, { message: 'Missing scene file' });
      return;
    }

    app.gc();

    try {
      scene = eval(fs.readFileSync(HOLOTAPE_DIR + p.file))(app, p.params);
    } catch (e) {
      logLoadError('failed to open scene', p.file, e);
      drawError(p.file, e);
    }
  }

  function remove() {
    if (loadTimer) {
      clearTimeout(loadTimer);
      loadTimer = null;
    }

    pending = null;
    loading = null;

    if (scene) {
      scene.remove();
      scene = null;
    }

    Pip.audioStop();
    if (app.initialBright !== null) {
      try {
        Pip.setBrightness(app.initialBright);
      } catch (e) {}
    }
    if (app.initialVol !== null) {
      try {
        Pip.setVol(app.initialVol);
      } catch (e) {}
    }
    h.clear();
    h.flip();
  }

  try {
    if (Pip.settings && typeof Pip.settings.volume === 'number') {
      app.initialVol = Pip.settings.volume;
      app.currentVol = app.initialVol;
    }
  } catch (e) {}

  try {
    if (typeof Pip.brightness === 'number') {
      app.initialBright = Pip.brightness;
      app.currentBright = app.initialBright;
    }
  } catch (e) {}

  app.go(app.scenes.INTRO);

  return {
    id: 'rcet',
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
