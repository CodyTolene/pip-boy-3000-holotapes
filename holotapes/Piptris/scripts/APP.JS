// =============================================================================
//  Name: Piptris
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function () {
  let currentTrack,
    initialVol = null,
    loadTimer,
    musicChanging = false,
    musicEnabled = false,
    musicIndex = 0,
    pending,
    savedDisplay,
    savedMusicSource = 'OFF',
    scene,
    sourcesScanned = false;

  function applyDisplay() {
    try {
      if (app.displayClean) {
        Pip.blitOptions.idleFilter = [0];
        Pip.blitOptions.noScanEffect = 1;
      } else if (savedDisplay) {
        if (savedDisplay.idleFilter === undefined) {
          delete Pip.blitOptions.idleFilter;
        } else {
          Pip.blitOptions.idleFilter = savedDisplay.idleFilter;
        }

        if (savedDisplay.noScanEffect === undefined) {
          delete Pip.blitOptions.noScanEffect;
        } else {
          Pip.blitOptions.noScanEffect = savedDisplay.noScanEffect;
        }
      }
    } catch (e) {}
  }

  function garbageCollect() {
    try {
      process.memory(true);
      E.defrag();
    } catch (e) {}
  }

  function getVersion() {
    try {
      return (
        JSON.parse(fs.readFileSync('APPINFO/PIPTRIS.info')).version || '0.0.0'
      );
    } catch (e) {
      return '0.0.0';
    }
  }

  function handleMusicStopped() {
    if (musicEnabled) playMusic();
  }

  function isDirectory(path) {
    try {
      const stat = fs.statSync('/' + path);

      return !!stat && !!stat.dir;
    } catch (e) {
      return false;
    }
  }

  function loadData() {
    if (typeof app.highScore === 'number') return;

    let data;

    try {
      data = JSON.parse(fs.readFileSync('HOLO/PIPTRIS/piptris.json'));
    } catch (e) {
      data = null;
    }

    app.highScore = (data && data.highScore) || 0;
    app.soundEffects = !data || data.sound !== 0;
    app.displayClean = !data || data.disp !== 0;

    if (data && data.music) savedMusicSource = data.music;

    applyDisplay();

    if (!data) saveData();
  }

  function loadMusic() {
    const source = app.musicSources[app.musicSource];
    const entries = source === 'OFF' ? [] : readDir(source);

    app.musicList = [];
    currentTrack = undefined;
    musicIndex = 0;

    for (let i = 0; i < entries.length; i++) {
      if (/\.wav$/i.test(entries[i])) {
        app.musicList.push(source + '/' + entries[i]);
      }
    }

    shuffleMusic();

    return app.musicList.length > 0;
  }

  function loadMusicSources() {
    let selected = savedMusicSource;

    if (sourcesScanned && app.musicSources[app.musicSource]) {
      selected = app.musicSources[app.musicSource];
    }

    const entries = readDir('MUSIC');

    app.musicSources = ['PIPTRIS'];

    let i;

    for (i = 0; i < entries.length; i++) {
      if (isDirectory('MUSIC/' + entries[i])) {
        app.musicSources.push('MUSIC/' + entries[i]);
      }
    }

    app.musicSources.push('OFF');
    app.musicSource = 0;

    for (i = 0; i < app.musicSources.length; i++) {
      if (app.musicSources[i] === selected) {
        app.musicSource = i;
        break;
      }
    }

    sourcesScanned = true;
  }

  function loadScene() {
    loadTimer = undefined;

    const next = pending;

    pending = undefined;

    if (!next) return;

    if (scene) {
      scene.remove();
      scene = undefined;
    }

    garbageCollect();

    try {
      scene = eval(fs.readFileSync('HOLO/PIPTRIS/' + next.file))(
        app,
        next.params,
      );
    } catch (e) {
      Pip.lastFlip = getTime();
      h.clear(0)
        .setColor(3)
        .setFontMonofonto23()
        .setFontAlign(0, 0)
        .drawString('UNABLE TO LOAD', 240, 140)
        .setColor(2)
        .setFontMonofonto16()
        .drawString(next.file, 240, 172)
        .setColor(1)
        .setFontMonofonto14()
        .drawString('Try Reinstalling Holotape.', 240, 204)
        .flip();
    }
  }

  function playMusic() {
    if (!musicEnabled || !app.musicList.length || musicChanging) return;

    musicChanging = true;

    let attempts = app.musicList.length,
      track;

    while (attempts--) {
      if (musicIndex >= app.musicList.length) {
        shuffleMusic();
        musicIndex = 0;
      }

      track = app.musicList[musicIndex++];

      try {
        Pip.audioStart(track);
        currentTrack = track;
        musicChanging = false;
        return;
      } catch (e) {}
    }

    musicChanging = false;
    musicEnabled = false;
  }

  function playNukeSound(ignoreMusic) {
    if (!app.soundEffects) return;

    // We can't overlap non-system audio yet, so we shouldn't play the nuke
    // sound if any music is playing.
    if (!ignoreMusic && app.musicSources[app.musicSource] !== 'OFF') return;

    try {
      // Play a random explosion sound (1-4).
      Pip.audioStart('HOLO/PIPTRIS/EXPL_0' + (Math.randInt(4) + 1) + '.WAV');
    } catch (e) {}
  }

  function readDir(path) {
    try {
      return fs
        .readdir('/' + path)
        .filter(function (name) {
          return name !== '.' && name !== '..';
        })
        .sort();
    } catch (e) {
      try {
        E.defrag();

        return fs
          .readdir('/' + path)
          .filter(function (name) {
            return name !== '.' && name !== '..';
          })
          .sort();
      } catch (e2) {
        return [];
      }
    }
  }

  function recordScore(score) {
    if (score <= app.highScore) return;

    app.highScore = score;
    saveData();
  }

  function remove() {
    if (loadTimer) clearTimeout(loadTimer);

    loadTimer = undefined;
    pending = undefined;

    if (scene) {
      scene.remove();
    }

    scene = undefined;
    Pip.removeListener('audioStopped', handleMusicStopped);
    stopMusic();

    app.displayClean = false;
    applyDisplay();

    if (initialVol !== null && app.currentVol !== initialVol) {
      try {
        Pip.setVol(initialVol);
      } catch (e) {}
    }

    h.clear().flip();

    currentTrack = undefined;
    musicChanging = musicEnabled = musicIndex = undefined;
    app.menuLoaded = undefined;
    garbageCollect();
  }

  function saveData() {
    try {
      fs.writeFile(
        'HOLO/PIPTRIS/piptris.json',
        JSON.stringify({
          highScore: app.highScore || 0,
          sound: app.soundEffects ? 1 : 0,
          music: sourcesScanned
            ? app.musicSources[app.musicSource] || 'OFF'
            : savedMusicSource,
          disp: app.displayClean ? 1 : 0,
        }),
      );
    } catch (e) {}
  }

  function startMusic() {
    if (musicEnabled) return;

    musicEnabled = loadMusic();

    if (musicEnabled) playMusic();
  }

  function stopMusic() {
    musicEnabled = false;
    musicChanging = false;
    currentTrack = undefined;
    musicIndex = 0;
    Pip.audioStop();
  }

  function shuffleMusic() {
    let i, randomIndex, swap;

    for (i = app.musicList.length - 1; i > 0; i--) {
      randomIndex = Math.randInt(i + 1);

      swap = app.musicList[i];
      app.musicList[i] = app.musicList[randomIndex];
      app.musicList[randomIndex] = swap;
    }

    if (
      currentTrack &&
      app.musicList.length > 1 &&
      app.musicList[0] === currentTrack
    ) {
      swap = app.musicList[0];
      app.musicList[0] = app.musicList[1];
      app.musicList[1] = swap;
    }
  }

  const app = {
    H: 320,
    W: 480,
    currentVol: 20,
    displayClean: true,
    musicSource: 0,
    musicSources: ['PIPTRIS', 'OFF'],
    soundEffects: true,
    version: getVersion(),

    scenes: {
      GAME: 'GAME.JS',
      GAME_OVER: 'GAME_OVER.JS',
      INSTRUCTIONS: 'INST.JS',
      INTRO: 'INTRO.JS',
      MENU: 'MENU.JS',
      PRELOAD: 'PRELOAD.JS',
      SETTINGS: 'SETTINGS.JS',
    },

    applyDisplay: applyDisplay,
    gc: garbageCollect,
    loadData: loadData,
    loadMusicSources: loadMusicSources,
    playNukeSound: playNukeSound,
    recordScore: recordScore,
    saveData: saveData,
    startMusic: startMusic,
    stopMusic: stopMusic,

    go: function (file, params) {
      pending = { file: file, params: params };

      if (!loadTimer) loadTimer = setTimeout(loadScene, 0);
    },
  };

  try {
    if (Pip.settings && typeof Pip.settings.volume === 'number') {
      initialVol = Pip.settings.volume;
      app.currentVol = initialVol;
    }
  } catch (e) {}

  savedDisplay = {
    idleFilter: Pip.blitOptions.idleFilter,
    noScanEffect: Pip.blitOptions.noScanEffect,
  };

  Pip.audioStop();
  Pip.on('audioStopped', handleMusicStopped);
  app.go(app.scenes.INTRO);

  return {
    id: 'PIPTRIS',
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
