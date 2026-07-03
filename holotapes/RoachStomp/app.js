// =============================================================================
//  Name: RoachStomp
//  Author: @tylerjbartlett
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/tylerjbartlett/pip-boy-3000a-holotapes
// =============================================================================

(function () {
  const FILE_PATHS = {
    APPINFO: '/APPINFO/ROACHSTOMP.info',
    ROACH1: '/HOLO/ROACHSTOMP/ROACH1.JSON',
    ROACH2: '/HOLO/ROACHSTOMP/ROACH2.JSON',
    // BOOT1: '/HOLO/ROACHSTOMP/BOOT1.JSON',
    BOOT2: '/HOLO/ROACHSTOMP/BOOT2.JSON',
    SPLAT1: '/HOLO/ROACHSTOMP/SPLAT1.JSON',
    // SPLAT2: '/HOLO/ROACHSTOMP/SPLAT2.JSON',
    HEARTFULL: '/HOLO/ROACHSTOMP/HEART_FULL.JSON',
    HEARTEMPTY: '/HOLO/ROACHSTOMP/HEART_EMPTY.JSON',
    TITLE: '/HOLO/ROACHSTOMP/TITLE.IMG',
  };

  const SFX = {
    TITLE: '/HOLO/ROACHSTOMP/TITLE.WAV',
    SPLAT: '/HOLO/ROACHSTOMP/SPLAT.WAV',
    GAMEOVER: '/HOLO/ROACHSTOMP/GAMEOVER.WAV',
    GRUNT: '/HOLO/ROACHSTOMP/GRUNT.WAV',
    WHOOSH: '/HOLO/ROACHSTOMP/WHOOSH.WAV',
  };

  const MENU_MAIN_OPTIONS = ['EASY', 'MEDIUM', 'HARD'];

  // prettier-ignore
  const GAME_BOARD_EASY = [
    [{ x: 142, y: 46 } , { x: 208, y: 46 } , { x: 274, y: 46 }],
    [{ x: 142, y: 102 }, { x: 208, y: 102 }, { x: 274, y: 102 }],
    [{ x: 142, y: 168 }, { x: 208, y: 168 }, { x: 274, y: 168 }],
    [{ x: 142, y: 234 }, { x: 208, y: 234 }, { x: 274, y: 234 }]
  ];
  // prettier-ignore
  const GAME_BOARD_MEDIUM = [
    [{ x: 76, y: 46 } , { x: 142, y: 46 } , { x: 208, y: 46 } , { x: 274, y: 46 } , { x: 340, y: 46 }],
    [{ x: 76, y: 102 }, { x: 142, y: 102 }, { x: 208, y: 102 }, { x: 274, y: 102 }, { x: 340, y: 102 }],
    [{ x: 76, y: 168 }, { x: 142, y: 168 }, { x: 208, y: 168 }, { x: 274, y: 168 }, { x: 340, y: 168 }],
    [{ x: 76, y: 234 }, { x: 142, y: 234 }, { x: 208, y: 234 }, { x: 274, y: 234 }, { x: 340, y: 234 }]
  ];
  // prettier-ignore
  const GAME_BOARD_HARD = [
    [{ x: 10, y: 46 } , { x: 76, y: 46 } , { x: 142, y: 46 } , { x: 208, y: 46 } , { x: 274, y: 46 } , { x: 340, y: 46 } , { x: 406, y: 46 }],
    [{ x: 10, y: 102 }, { x: 76, y: 102 }, { x: 142, y: 102 }, { x: 208, y: 102 }, { x: 274, y: 102 }, { x: 340, y: 102 }, { x: 406, y: 102 }],
    [{ x: 10, y: 168 }, { x: 76, y: 168 }, { x: 142, y: 168 }, { x: 208, y: 168 }, { x: 274, y: 168 }, { x: 340, y: 168 }, { x: 406, y: 168 }],
    [{ x: 10, y: 234 }, { x: 76, y: 234 }, { x: 142, y: 234 }, { x: 208, y: 234 }, { x: 274, y: 234 }, { x: 340, y: 234 }, { x: 406, y: 234 }]
  ];

  const HEART_LOCS_X = [400, 420, 440];

  const GAME_CONSTS = {
    MARCH_BASE_MS: 2000,
    MARCH_STEP_MS: 50,
    MARCH_FLOOR_MS: 1000,

    STOMP_WINDOW_BASE_MS: 2000,
    STOMP_WINDOW_STEP_MS: 20,
    STOMP_WINDOW_FLOOR_MS: 1000,

    SPAWN_GAP_MIN_MULT: 3,
    SPAWN_GAP_MAX_MULT: 6,

    STARTING_HEALTH: 3,
  };

  let fadeOn = 0;
  let menuIndexSelected = 0;
  let fadeInterval = undefined;
  let roach1Image = undefined;
  let roach2Image = undefined;
  let boot1Image = undefined;
  let boot2Image = undefined;
  let splat1Image = undefined;
  let splat2Image = undefined;
  let heartFullImage = undefined;
  let heartEmptyImage = undefined;
  let score = 0;
  let health = 0;
  let assetsLoaded = false;
  let playerLaneIndexSelected = 0;
  let playerLaneMaxIndex = 0;
  let gameBoard = undefined;
  let playerBoard = undefined;
  let lanes = undefined;
  let dirtyLanes = undefined;
  let laneSpawnTimeouts = undefined;
  let marchTimeout = undefined;
  let frameInterval = undefined;
  let gameOverInputDelay = undefined;
  // let staleTimerFires = 0; // diagnostic only — how often a timer fired after teardown

  // HELPER FUNCTIONS
  function readAppVersion() {
    try {
      return JSON.parse(require('fs').readFileSync(FILE_PATHS.APPINFO)).version;
    } catch (e) {
      return '0.0.0';
      // return e;
    }
  }

  function loadImage(path) {
    try {
      let file = require('fs').readFileSync(path);
      let data = JSON.parse(file);
      return {
        bpp: data.bpp,
        buffer: atob(data.buffer),
        height: data.height,
        transparent: data.transparent,
        width: data.width,
      };
    } catch (e) {
      return null;
    }
  }

  function gameStartFade() {
    fadeOn = !fadeOn;
    drawTitleStartGame();
  }

  function loadAssets() {
    if (assetsLoaded === true) return;

    E.defrag();
    roach1Image = loadImage(FILE_PATHS.ROACH1);
    roach2Image = loadImage(FILE_PATHS.ROACH2);
    // boot1Image = loadImage(FILE_PATHS.BOOT1);
    boot2Image = loadImage(FILE_PATHS.BOOT2);
    splat1Image = loadImage(FILE_PATHS.SPLAT1);
    // splat2Image = loadImage(FILE_PATHS.SPLAT2);
    heartFullImage = loadImage(FILE_PATHS.HEARTFULL);
    heartEmptyImage = loadImage(FILE_PATHS.HEARTEMPTY);

    assetsLoaded = true;
  }

  // GAME FUNCTIONS
  function updateScore(points) {
    score += points;

    const scoreStrLen = score.toString().length;

    // prettier-ignore
    h.clearRect(20, 10, 100 + (6*scoreStrLen), 28);
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(-1, -1, 0)
      .drawString('Score: ' + score, 20, 10);
  }

  function updateHealth(change) {
    health = E.clip(health + change, 0, 3);
    h.clearRect(HEART_LOCS_X[0], 10, 480, 26);
    for (let i = 0; i < 3; i++) {
      if (i < 3 - health) {
        h.drawImage(heartEmptyImage, HEART_LOCS_X[i], 10);
      } else {
        h.drawImage(heartFullImage, HEART_LOCS_X[i], 10);
      }
    }

    // Check for game over condition
    if (health <= 0) {
      endGame();
    }
  }

  function currentMarchIntervalMs() {
    // this can be used to speed up the marching (ie after a higher score)
    return GAME_CONSTS.MARCH_BASE_MS;
  }

  function currentStompWindowMs() {
    // this can be used to speed up the stomp timer (ie after a higher score) // makes the window shorter / game harder
    return GAME_CONSTS.STOMP_WINDOW_BASE_MS;
  }

  function spawnGapMs(laneIndex) {
    const march = currentMarchIntervalMs();
    const base =
      Math.randInt(
        GAME_CONSTS.SPAWN_GAP_MAX_MULT * march -
          GAME_CONSTS.SPAWN_GAP_MIN_MULT * march,
      ) +
      GAME_CONSTS.SPAWN_GAP_MIN_MULT * march;
    return base + laneIndex * 137; // arbitrary stagger, breaks simultaneity even if base is identical
  }

  function onMarchTick() {
    for (let i = 0; i < lanes.length; i++) {
      const roach = lanes[i];
      if (!roach) continue;
      if (roach.row < 2) {
        roach.row++;
        if (roach.row === 2) {
          roach.stompDeadline = getTime() + currentStompWindowMs() / 1000;
        }
        dirtyLanes[i] = 1;
      }
    }
  }

  function spawnRoach(laneIndex) {
    lanes[laneIndex] = { row: 0, stompDeadline: undefined };
    dirtyLanes[laneIndex] = 1;
  }

  function scheduleSpawn(laneIndex) {
    laneSpawnTimeouts[laneIndex] = setTimeout(function () {
      if (frameInterval == null) {
        // staleTimerFires++;
        return; // not in game, dont schedule a spawn
      }
      if (!lanes[laneIndex]) spawnRoach(laneIndex);
      scheduleSpawn(laneIndex);
    }, spawnGapMs(laneIndex));
  }

  function scheduleMarchTick() {
    marchTimeout = setTimeout(function () {
      if (frameInterval == null) {
        // staleTimerFires++;
        return; // not in game, dont schedule a march
      }
      onMarchTick();
      scheduleMarchTick();
    }, currentMarchIntervalMs());
  }

  function drawDirtyLanes() {
    'ram';
    for (let i = 0; i < lanes.length; i++) {
      if (dirtyLanes[i]) {
        drawRoach(i);
        dirtyLanes[i] = 0;
      }
    }
  }

  function checkStompTimeouts() {
    'ram';
    for (let i = 0; i < lanes.length; i++) {
      const roach = lanes[i];
      if (roach && roach.row === 2 && getTime() > roach.stompDeadline) {
        lanes[i] = null;
        dirtyLanes[i] = 1;
        updateHealth(-1);
        if (health <= 0) {
          return;
        }
        Pip.audioStart(SFX.GRUNT);
      }
    }
  }

  function onGameInterval() {
    'ram';

    checkStompTimeouts();

    if (health <= 0) {
      return;
    }

    drawDirtyLanes();
  }

  function setLanes(count) {
    lanes = [];
    dirtyLanes = [];
    laneSpawnTimeouts = [];
    for (let i = 0; i < count; i++) lanes.push(null);
    for (let i = 0; i < count; i++) dirtyLanes.push(0);
    for (let i = 0; i < count; i++) laneSpawnTimeouts.push(null);
  }

  function endGame() {
    Pip.audioStart(SFX.GAMEOVER);
    Pip.removeListener('knob1', onKnob1_InGame);
    Pip.removeListener('knob2', onKnob2_InGame);

    if (frameInterval != null) {
      clearInterval(frameInterval);
    }
    frameInterval = undefined;

    if (marchTimeout != null) {
      clearTimeout(marchTimeout);
    }
    marchTimeout = undefined;

    if (laneSpawnTimeouts != null) {
      for (let i = 0; i < laneSpawnTimeouts.length; i++) {
        if (laneSpawnTimeouts[i] != null) clearTimeout(laneSpawnTimeouts[i]);
      }
    }
    laneSpawnTimeouts = undefined;

    drawGameOverScreen();
    gameOverInputDelay = setTimeout(function () {
      Pip.onExclusive('knob1', onKnob1_GameOver);
    }, 500);
  }

  function startGame(difficulty) {
    if (difficulty === 'EASY') {
      gameBoard = GAME_BOARD_EASY;
      setLanes(gameBoard[0].length);
      playerBoard = GAME_BOARD_EASY[3];
      playerLaneIndexSelected = 1;
      playerLaneMaxIndex = 2;
    } else if (difficulty === 'MEDIUM') {
      gameBoard = GAME_BOARD_MEDIUM;
      setLanes(gameBoard[0].length);
      playerBoard = GAME_BOARD_MEDIUM[3];
      playerLaneIndexSelected = 2;
      playerLaneMaxIndex = 4;
    } else if (difficulty === 'HARD') {
      gameBoard = GAME_BOARD_HARD;
      setLanes(gameBoard[0].length);
      playerBoard = GAME_BOARD_HARD[3];
      playerLaneIndexSelected = 3;
      playerLaneMaxIndex = 6;
    }

    h.clear(1);
    drawPlayer(playerLaneIndexSelected, playerLaneIndexSelected - 1);
    updateHealth(GAME_CONSTS.STARTING_HEALTH);
    score = 0;
    h.setFontMonofonto16()
      .setFontAlign(-1, -1, 0)
      .drawString('Score: ' + score, 20, 10);

    Pip.onExclusive('knob1', onKnob1_InGame);
    Pip.onExclusive('knob2', onKnob2_InGame);

    frameInterval = setInterval(onGameInterval, 50);
    scheduleMarchTick();
    for (let i = 0; i < lanes.length; i++) scheduleSpawn(i);

    // do the initial spawn while the timers are still being scheduled
    for (let i = 0; i < lanes.length; i++) {
      if (Math.randInt(2) === 0) spawnRoach(i);
    }
    // guarantee at least one roach on start
    let anySpawned = false;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i]) {
        anySpawned = true;
        break;
      }
    }
    if (!anySpawned) spawnRoach(Math.randInt(lanes.length));
  }

  function drawGameOverScreen() {
    h.clear(1);
    h.setColor(3)
      .setFontMonofonto36()
      .setFontAlign(0, 0)
      .drawString('GAME OVER', 240, 120);
    h.setFontMonofonto28().drawString('Final Score: ' + score, 240, 180);
    h.setColor(1)
      .setFontMonofonto16()
      .drawString('Press left knob to return to title screen', 240, 300);
    // h.setColor(3).setFontMonofonto16().setFontAlign(-1, -1, 0)
    // .drawString('staleTimerFires: ' + staleTimerFires, 20, 10);
  }

  function drawRoach(laneIndex) {
    const laneX1 = gameBoard[0][laneIndex].x;
    const laneY1 = gameBoard[0][laneIndex].y;
    const laneX2 = gameBoard[2][laneIndex].x + 64;
    const laneY2 = gameBoard[2][laneIndex].y + 64;
    h.clearRect(laneX1, laneY1, laneX2, laneY2);

    const roach = lanes[laneIndex];

    if (roach) {
      const cell = gameBoard[roach.row][laneIndex];
      if (roach.row < 2) {
        h.drawImage(roach1Image, cell.x, cell.y);
      } else {
        h.drawImage(roach2Image, cell.x, cell.y);
      }
    }
  }

  function drawKick(laneIndex) {
    const cellX = gameBoard[2][laneIndex].x;
    const cellY = gameBoard[2][laneIndex].y;

    const roach = lanes[laneIndex];

    if (roach) {
      if (roach.row < 2) {
        h.drawImage(boot2Image, cellX, cellY);
      } else {
        h.drawImage(splat1Image, cellX, cellY);
      }
    } else {
      h.drawImage(boot2Image, cellX, cellY);
    }
  }

  function drawPlayer(newIndex, prevIndex) {
    h.clearRect(
      playerBoard[prevIndex].x,
      playerBoard[prevIndex].y,
      playerBoard[prevIndex].x + 64,
      playerBoard[prevIndex].y + 64,
    );
    h.drawImage(boot2Image, playerBoard[newIndex].x, playerBoard[newIndex].y);
  }

  function drawMenuMain() {
    const rowHeight = 60;
    h.setColor(3)
      .setFontMonofonto36()
      .setFontAlign(0, 0)
      .drawString('SELECT DIFFICULTY', 240, 50);

    MENU_MAIN_OPTIONS.forEach((option, index) => {
      const y = 120 + index * rowHeight;
      h.setColor(0).fillRect(180, y - 30, 300, y + 30);
      h.setColor(3).setFontMonofonto28().drawString(option, 240, y);
    });

    const selectedY = 120 + menuIndexSelected * rowHeight;
    Pip.shadeBox(180, selectedY - 30, 300, selectedY + 30);
  }

  function drawTitleStartGame() {
    h.setColor(0).fillRect(165, 257, 315, 290);
    h.setColor(fadeOn ? 3 : 1)
      .setFontMonofonto28()
      .setFontAlign(0, 0)
      .drawString('START GAME', 240, 275);
    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawTitleScreen() {
    const APP_VERSION = readAppVersion();

    let f = E.openFile(FILE_PATHS.TITLE, 'r');
    let a = new Uint8Array(h.buffer);
    let b = f.read(2048),
      offset = 0;
    while (b) {
      a.set(b, offset);
      offset += b.length;
      b = f.read(2048);
    }
    f.close();

    h.setColor(3)
      .setFontMonofonto18()
      .setFontAlign(1, 1)
      .drawString(APP_VERSION, 160, 115);

    h.setColor(0).fillRect(165, 257, 315, 290);
    h.setColor(1)
      .setFontMonofonto28()
      .setFontAlign(0, 0)
      .drawString('Loading...', 240, 275);

    setTimeout(function () {
      loadAssets();
    }, 0);

    fadeInterval = setInterval(gameStartFade, 1200);
    Pip.audioStart(SFX.TITLE, { repeat: true });
  }

  function onKnob1_InGame(dir) {
    if (dir === 0) {
      drawKick(playerLaneIndexSelected);
      const roach = lanes[playerLaneIndexSelected];
      dirtyLanes[playerLaneIndexSelected] = 1;
      if (roach && roach.row === 2) {
        Pip.audioStart(SFX.SPLAT);
        lanes[playerLaneIndexSelected] = null;
        updateScore(10);
      } else {
        Pip.audioStart(SFX.WHOOSH);
      }
    }
  }

  function onKnob2_InGame(dir) {
    const prevIndex = playerLaneIndexSelected;

    playerLaneIndexSelected = E.clip(
      playerLaneIndexSelected + dir,
      0,
      playerLaneMaxIndex,
    );
    drawPlayer(playerLaneIndexSelected, prevIndex);
  }

  function onKnob1_MenuMain(dir) {
    if (dir === 0) {
      Pip.removeListener('knob1', onKnob1_MenuMain);
      Pip.audioStop();
      if (menuIndexSelected === 0) {
        startGame('EASY');
      } else if (menuIndexSelected === 1) {
        startGame('MEDIUM');
      } else if (menuIndexSelected === 2) {
        startGame('HARD');
      }
    } else {
      menuIndexSelected = E.clip(
        menuIndexSelected + dir,
        0,
        MENU_MAIN_OPTIONS.length - 1,
      );
      drawMenuMain();
    }
  }

  function onKnob1_TitleScreen(dir) {
    if (dir === 0) {
      Pip.removeListener('knob1', onKnob1_TitleScreen);
      clearInterval(fadeInterval);
      h.clear(1);
      drawMenuMain();
      Pip.onExclusive('knob1', onKnob1_MenuMain);
    }
  }

  function onKnob1_GameOver(dir) {
    if (dir === 0) {
      Pip.removeListener('knob1', onKnob1_GameOver);
      if (gameOverInputDelay != null) {
        clearTimeout(gameOverInputDelay);
      }

      drawTitleScreen();

      Pip.onExclusive('knob1', onKnob1_TitleScreen);
    }
  }

  drawTitleScreen();
  Pip.onExclusive('knob1', onKnob1_TitleScreen);

  return {
    id: 'ROACHSTOMP',
    fullscreen: true,
    remove: function () {
      if (fadeInterval != null) {
        clearInterval(fadeInterval);
      }
      if (frameInterval != null) {
        clearInterval(frameInterval);
      }
      if (marchTimeout != null) {
        clearTimeout(marchTimeout);
      }
      if (gameOverInputDelay != null) {
        clearTimeout(gameOverInputDelay);
      }
      if (laneSpawnTimeouts != null) {
        for (let i = 0; i < laneSpawnTimeouts.length; i++) {
          if (laneSpawnTimeouts[i] != null) {
            clearTimeout(laneSpawnTimeouts[i]);
          }
        }
      }
      Pip.audioStop();
      Pip.removeListener('knob1', onKnob1_TitleScreen);
      Pip.removeListener('knob1', onKnob1_MenuMain);
      Pip.removeListener('knob1', onKnob1_InGame);
      Pip.removeListener('knob2', onKnob2_InGame);
      Pip.removeListener('knob1', onKnob1_GameOver);

      h.clear();
    },
  };
});
