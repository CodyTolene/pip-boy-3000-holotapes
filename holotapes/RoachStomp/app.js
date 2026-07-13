// =============================================================================
//  Name: RoachStomp
//  Author: @tylerjbartlett
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/tylerjbartlett/pip-boy-3000a-holotapes
// =============================================================================

(function () {
  const IMG = {
    ROACH1: '/HOLO/ROACHSTOMP/ROACH1.JSON',
    ROACH2: '/HOLO/ROACHSTOMP/ROACH2.JSON',
    BOOT1: '/HOLO/ROACHSTOMP/BOOT1.JSON',
    SPLAT1: '/HOLO/ROACHSTOMP/SPLAT1.JSON',
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
    HISS1: '/HOLO/ROACHSTOMP/HISS-01.WAV',
    HISS2: '/HOLO/ROACHSTOMP/HISS-02.WAV',
    HISS3: '/HOLO/ROACHSTOMP/HISS-03.WAV',
  };

  const MENU_MAIN_OPTIONS = ['EASY', 'MEDIUM', 'HARD', 'HIGH SCORES'];

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
    STARTING_HEALTH: 3,
    MAX_ACTIVE_ROACHES: 5,

    SPAWN_GAP_MIN_MULT: 3,
    SPAWN_GAP_MAX_MULT: 6,

    SCORE_TIERS: {
      EASY: [60, 120, 200, 280, 380, 480, 600],
      MEDIUM: [100, 200, 300, 450, 600, 750, 900],
      HARD: [100, 200, 300, 450, 600, 750, 900],
    },

    MARCH_BASE_MS: {
      EASY: 1500,
      MEDIUM: 2000,
      HARD: 2000,
    },
    MARCH_FLOOR_MS: {
      EASY: 500,
      MEDIUM: 1000,
      HARD: 1000,
    },
    MARCH_STEP_MS: 150,

    STOMP_WINDOW_BASE_MS: {
      EASY: 2000,
      MEDIUM: 2400,
      HARD: 2800,
    },
    STOMP_WINDOW_FLOOR_MS: {
      EASY: 1500,
      MEDIUM: 1800,
      HARD: 1800,
    },
    STOMP_WINDOW_STEP_MS: {
      EASY: 72,
      MEDIUM: 86,
      HARD: 115,
    },
  };

  let fadeOn = 0;
  let menuIndexSelected = 0;
  let fadeInterval = undefined;
  let roach1Image = undefined;
  let roach2Image = undefined;
  let boot1Image = undefined;
  let splat1Image = undefined;
  let heartFullImage = undefined;
  let heartEmptyImage = undefined;
  let score = 0;
  let isNewHighScore = false;
  let health = 0;
  let difficulty = undefined;
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
  let sfxWhooshRawInfo = {};
  let sfxSplatRawInfo = {};
  let sfxWhoosh = undefined;
  let sfxSplat = undefined;
  let clickWatch = undefined;
  let sfxHissRawInfo = [{}, {}, {}];
  let sfxHiss = [undefined, undefined, undefined];
  let hissTimeout = undefined;

  // HELPER FUNCTIONS
  function readAppVersion() {
    try {
      return JSON.parse(require('fs').readFileSync('/APPINFO/ROACHSTOMP.info'))
        .version;
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

  function loadHighScores() {
    try {
      return JSON.parse(
        require('fs').readFileSync('/SETTINGS/ROACHSTOMP.JSON'),
      );
    } catch (e) {
      return [
        { name: 'EASY', score: 0 },
        { name: 'MEDIUM', score: 0 },
        { name: 'HARD', score: 0 },
      ];
    }
  }

  function saveHighScore() {
    const scores = loadHighScores();
    for (let i = 0; i < scores.length; i++) {
      if (scores[i].name === difficulty) {
        if (score > scores[i].score) {
          scores[i].score = score;
          try {
            require('fs').writeFileSync(
              '/SETTINGS/ROACHSTOMP.JSON',
              JSON.stringify(scores),
            );
          } catch (e) {}
          isNewHighScore = true;
        } else {
          isNewHighScore = false;
        }
        return;
      }
    }
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

  function scoreTiersCrossed() {
    const tiers = GAME_CONSTS.SCORE_TIERS[difficulty];
    let count = 0;
    for (let i = 0; i < tiers.length; i++) {
      if (score >= tiers[i]) count++;
    }
    return count;
  }

  function currentMarchIntervalMs() {
    return Math.max(
      GAME_CONSTS.MARCH_FLOOR_MS[difficulty],
      GAME_CONSTS.MARCH_BASE_MS[difficulty] -
        scoreTiersCrossed() * GAME_CONSTS.MARCH_STEP_MS,
    );
  }

  function currentStompWindowMs() {
    return Math.max(
      GAME_CONSTS.STOMP_WINDOW_FLOOR_MS[difficulty],
      GAME_CONSTS.STOMP_WINDOW_BASE_MS[difficulty] -
        scoreTiersCrossed() * GAME_CONSTS.STOMP_WINDOW_STEP_MS[difficulty],
    );
  }

  function playRandomHiss() {
    const i = Math.randInt(3);
    Pip.audioStartVar(sfxHiss[i], sfxHissRawInfo[i]);
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

  function countActiveRoaches() {
    let count = 0;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i]) count++;
    }
    return count;
  }

  function spawnRoach(laneIndex) {
    lanes[laneIndex] = { row: 0, stompDeadline: undefined };
    dirtyLanes[laneIndex] = 1;
    if (Math.randInt(3) === 0) playRandomHiss();
  }

  function scheduleSpawn(laneIndex) {
    laneSpawnTimeouts[laneIndex] = setTimeout(function () {
      if (frameInterval == null) {
        return; // not in game, dont schedule a spawn
      }
      if (
        !lanes[laneIndex] &&
        countActiveRoaches() < GAME_CONSTS.MAX_ACTIVE_ROACHES
      ) {
        spawnRoach(laneIndex);
      }
      scheduleSpawn(laneIndex);
    }, spawnGapMs(laneIndex));
  }

  function scheduleMarchTick() {
    marchTimeout = setTimeout(function () {
      if (frameInterval == null) {
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

    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] && lanes[i].row === 2) dirtyLanes[i] = 1;
    }

    drawDirtyLanes();

    // const mem = process.memory();
    // h.clearRect(240, 10, 340, 28);
    // h.setColor(3)
    //   .setFontMonofonto16()
    //   .setFontAlign(-1, -1, 0)
    //   .drawString(mem.free + '/' + mem.total, 240, 10);
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
    if (hissTimeout != null) {
      clearTimeout(hissTimeout);
    }
    hissTimeout = undefined;

    Pip.audioStart(SFX.GAMEOVER);
    if (clickWatch) {
      clearWatch(clickWatch);
      clickWatch = undefined;
    }
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

    saveHighScore();
    drawGameOverScreen();
    gameOverInputDelay = setTimeout(function () {
      Pip.onExclusive('knob1', onKnob1_GameOver);
    }, 500);
  }

  function startGame() {
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

    Pip.audioStop();

    h.clear(1);
    drawPlayer(playerLaneIndexSelected, playerLaneIndexSelected - 1);
    updateHealth(GAME_CONSTS.STARTING_HEALTH);
    score = 0;
    h.setFontMonofonto16()
      .setFontAlign(-1, -1, 0)
      .drawString('Score: ' + score, 20, 10);

    Pip.onExclusive('knob2', onKnob2_InGame);
    clickWatch = setWatch(onClick_InGame, ENC1_PRESS, {
      repeat: true,
      edge: 'rising',
      debounce: 20,
    });

    frameInterval = setInterval(onGameInterval, 50);
    scheduleMarchTick();
    for (let i = 0; i < lanes.length; i++) scheduleSpawn(i);

    // do the initial spawn while the timers are still being scheduled
    for (let i = 0; i < lanes.length; i++) {
      if (
        Math.randInt(2) === 0 &&
        countActiveRoaches() < GAME_CONSTS.MAX_ACTIVE_ROACHES
      )
        spawnRoach(i);
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
    if (isNewHighScore) {
      h.setFontMonofonto18().drawString('NEW HIGH SCORE!', 240, 230);
    }
    h.setColor(1)
      .setFontMonofonto16()
      .drawString('Press left knob to return to title screen', 240, 300);
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
        const remaining = E.clip(
          (roach.stompDeadline - getTime()) / (currentStompWindowMs() / 1000),
          0,
          1,
        );
        const barWidth = (64 * remaining) | 0;
        if (barWidth > 0) {
          h.setColor(3).fillRect(
            cell.x,
            cell.y + 60,
            cell.x + barWidth,
            cell.y + 63,
          );
        }
      }
    }
  }

  function drawPlayer(newIndex, prevIndex) {
    h.clearRect(
      playerBoard[prevIndex].x,
      playerBoard[prevIndex].y,
      playerBoard[prevIndex].x + 64,
      playerBoard[prevIndex].y + 64,
    );
    h.drawImage(boot1Image, playerBoard[newIndex].x, playerBoard[newIndex].y);
  }

  function drawHighScores() {
    const scores = loadHighScores();
    h.clear(1);
    h.setColor(3)
      .setFontMonofonto36()
      .setFontAlign(0, 0)
      .drawString('HIGH SCORES', 240, 50);
    const startY = 130;
    const rowHeight = 60;
    for (let i = 0; i < scores.length; i++) {
      h.setFontMonofonto28().drawString(
        scores[i].name + ': ' + scores[i].score,
        240,
        startY + i * rowHeight,
      );
    }
    h.setColor(1)
      .setFontMonofonto16()
      .drawString('Press left knob to go back', 240, 310);
  }

  function drawMenuMain() {
    const rowHeight = 60;
    h.setColor(3)
      .setFontMonofonto36()
      .setFontAlign(0, 0)
      .drawString('SELECT DIFFICULTY', 240, 50);

    MENU_MAIN_OPTIONS.forEach((option, index) => {
      const y = 105 + index * rowHeight;
      h.setColor(0).fillRect(150, y - 30, 330, y + 30);
      h.setColor(3).setFontMonofonto28().drawString(option, 240, y);
    });

    const selectedY = 105 + menuIndexSelected * rowHeight;
    Pip.shadeBox(150, selectedY - 30, 330, selectedY + 30);
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

    let f = E.openFile(IMG.TITLE, 'r');
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
      if (assetsLoaded === true) return;

      process.memory(true);
      E.defrag();
      roach1Image = loadImage(IMG.ROACH1);
      roach2Image = loadImage(IMG.ROACH2);
      boot1Image = loadImage(IMG.BOOT1);
      splat1Image = loadImage(IMG.SPLAT1);
      heartFullImage = loadImage(IMG.HEARTFULL);
      heartEmptyImage = loadImage(IMG.HEARTEMPTY);
      sfxWhoosh = Pip.audioRead(SFX.WHOOSH, sfxWhooshRawInfo);
      sfxSplat = Pip.audioRead(SFX.SPLAT, sfxSplatRawInfo);

      for (let i = 0; i < 3; i++) {
        sfxHiss[i] = Pip.audioRead(SFX['HISS' + (i + 1)], sfxHissRawInfo[i]);
      }

      assetsLoaded = true;
    }, 0);

    fadeInterval = setInterval(gameStartFade, 1200);
    Pip.audioStart(SFX.TITLE, { repeat: true });
  }

  function onClick_InGame(event) {
    const roach = lanes[playerLaneIndexSelected];
    dirtyLanes[playerLaneIndexSelected] = 1;
    if (roach && roach.row === 2) {
      lanes[playerLaneIndexSelected] = null;
      Pip.audioStartVar(sfxSplat, sfxSplatRawInfo);
      h.drawImage(
        splat1Image,
        gameBoard[2][playerLaneIndexSelected].x,
        gameBoard[2][playerLaneIndexSelected].y,
      );
      updateScore(10);
    } else {
      Pip.audioStartVar(sfxWhoosh, sfxWhooshRawInfo);
      h.drawImage(
        boot1Image,
        gameBoard[2][playerLaneIndexSelected].x,
        gameBoard[2][playerLaneIndexSelected].y,
      );
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

  function onKnob1_HighScores(dir) {
    if (dir === 0) {
      Pip.removeListener('knob1', onKnob1_HighScores);
      h.clear(1);
      drawMenuMain();
      Pip.onExclusive('knob1', onKnob1_MenuMain);
    }
  }

  function onKnob1_MenuMain(dir) {
    if (dir === 0) {
      Pip.removeListener('knob1', onKnob1_MenuMain);
      if (menuIndexSelected === 3) {
        drawHighScores();
        Pip.onExclusive('knob1', onKnob1_HighScores);
        return;
      } else if (menuIndexSelected === 0) {
        difficulty = 'EASY';
      } else if (menuIndexSelected === 1) {
        difficulty = 'MEDIUM';
      } else if (menuIndexSelected === 2) {
        difficulty = 'HARD';
      }
      startGame();
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

  Pip.audioStop();
  drawTitleScreen();
  Pip.onExclusive('knob1', onKnob1_TitleScreen);

  return {
    id: 'ROACHSTOMP',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      if (hissTimeout != null) {
        clearTimeout(hissTimeout);
      }
      hissTimeout = undefined;

      Pip.audioStop();

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

      if (clickWatch) {
        clearWatch(clickWatch);
      }

      Pip.removeListener('knob1', onKnob1_TitleScreen);
      Pip.removeListener('knob1', onKnob1_MenuMain);
      Pip.removeListener('knob1', onKnob1_HighScores);
      Pip.removeListener('knob2', onKnob2_InGame);
      Pip.removeListener('knob1', onKnob1_GameOver);

      h.clear();
    },
  };
});
