// =============================================================================
//  Name: Piptris
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000a-holotapes
// =============================================================================

(function () {
  const APP_ID = 'Piptris';

  const GAME_NAME = 'PIPTRIS';
  const GAME_VERSION = '4.0.0';

  const BLOCK_IMAGE_PATH = 'HOLO/PIPTRIS/block.json';
  const CONFIG_PATH = 'HOLO/PIPTRIS/piptris.json';
  const NUKE_IMAGE_PATH = 'HOLO/PIPTRIS/nuke.json';
  const RADIOACTIVE_IMAGE_PATH = 'HOLO/PIPTRIS/radioactive.json';

  const KNOWN_MUSIC = [
    'HOLO/PIPTRIS/piptris-big-band-swing.wav',
    'HOLO/PIPTRIS/piptris-electro-swing.wav',
    'HOLO/PIPTRIS/piptris-symphony.wav',
    'HOLO/PIPTRIS/piptris-whimsical.wav',
  ];

  const W = h.getWidth();
  const H = h.getHeight();

  const C_BLACK = 0; // Black
  const C_DIM = 1; // Dim
  const C_MED = 2; // Medium
  const C_BRIGHT = 3; // Bright

  const BLOCK_SIZE = 15;
  const BLOCK_START_SPEED = 800;
  const FAST_DROP_SPEED = 80;
  const LINES_PER_LEVEL = 10;
  const MIN_DROP_SPEED = 100;
  const NUKE_POINTS_PER_BLOCK = 10;
  const NUKE_RADIUS = 2;
  const SPEED_STEP = 50;

  const KNOB_DEBOUNCE = 30;

  const MUSIC_STOPPED = 'audioStopped';

  const SCREEN_AREA = { x1: 60, x2: W - 60, y1: 10, y2: H - 10 };

  const PLAY_AREA_WIDTH = 10;
  const PLAY_AREA_HEIGHT = 20;
  const PLAY_AREA_BLOCKS = new Uint8Array(PLAY_AREA_WIDTH * PLAY_AREA_HEIGHT);
  const PLAY_AREA_X =
    (SCREEN_AREA.x1 + SCREEN_AREA.x2) / 2 - (BLOCK_SIZE * PLAY_AREA_WIDTH) / 2;
  const PLAY_AREA_Y =
    SCREEN_AREA.y1 +
    (SCREEN_AREA.y2 - SCREEN_AREA.y1) / 2 -
    (BLOCK_SIZE * PLAY_AREA_HEIGHT) / 2;
  const PLAY_AREA = {
    x1: PLAY_AREA_X - 1,
    y1: PLAY_AREA_Y - 1,
    x2: PLAY_AREA_X + PLAY_AREA_WIDTH * BLOCK_SIZE,
    y2: PLAY_AREA_Y + PLAY_AREA_HEIGHT * BLOCK_SIZE,
  };

  const T_SHAPE = [
    [0, 1, 0],
    [1, 1, 1],
  ];
  const SHAPES = [
    [[1, 1, 1, 1]], // I
    [[1, 1, 1, 1]], // I (extra)
    [
      [1, 1, 0],
      [0, 1, 1],
    ], // Z
    [
      [0, 1, 1],
      [1, 1, 0],
    ], // S
    [
      [1, 0, 0],
      [1, 1, 1],
    ], // J
    [
      [0, 0, 1],
      [1, 1, 1],
    ], // L
    T_SHAPE,
    [
      [1, 1],
      [1, 1],
    ], // O
    [[2]], // Nuke
  ];

  let blockCurrent = null;
  let blockDropSpeed = BLOCK_START_SPEED;
  let blockImage = null;
  let blockNext = null;
  let clickWatch = null;
  let currentInterval = BLOCK_START_SPEED;
  let currentTrack = null;
  let difficultyLevel = 0;
  let fastDrop = false;
  let gameOverTimeout = null;
  let gameState = 'start'; // 'start' | 'starting' | 'playing' | 'gameover'
  let highScore = 0;
  let isGameOver = false;
  let lastLeftKnobTime = 0;
  let linesCleared = 0;
  let mainLoopInterval = null;
  let musicChanging = false;
  let musicList = [];
  let nukeImage = null;
  let nukeInProgress = false;
  let nukeWarningActive = false;
  let radioactiveImage = null;
  let removed = false;
  let score = 0;

  function applyGravity() {
    for (let y = PLAY_AREA_HEIGHT - 2; y >= 0; y--) {
      for (let x = 0; x < PLAY_AREA_WIDTH; x++) {
        if (PLAY_AREA_BLOCKS[y * PLAY_AREA_WIDTH + x]) {
          let ny = y;
          while (
            ny + 1 < PLAY_AREA_HEIGHT &&
            !PLAY_AREA_BLOCKS[(ny + 1) * PLAY_AREA_WIDTH + x]
          ) {
            PLAY_AREA_BLOCKS[(ny + 1) * PLAY_AREA_WIDTH + x] =
              PLAY_AREA_BLOCKS[ny * PLAY_AREA_WIDTH + x];
            PLAY_AREA_BLOCKS[ny * PLAY_AREA_WIDTH + x] = 0;
            ny++;
          }
        }
      }
    }
  }

  function checkHighScore() {
    if (score > highScore) {
      highScore = score;
      saveConfig();
    }
  }

  function clearLines() {
    let linesRemoved = 0;
    let passes = 0;

    while (passes++ < PLAY_AREA_HEIGHT) {
      let anyCleared = false;
      for (let y = PLAY_AREA_HEIGHT - 1; y >= 0; y--) {
        let full = true;
        for (let x = 0; x < PLAY_AREA_WIDTH; x++) {
          if (!PLAY_AREA_BLOCKS[y * PLAY_AREA_WIDTH + x]) {
            full = false;
            break;
          }
        }

        if (full) {
          for (let x = 0; x < PLAY_AREA_WIDTH; x++) {
            eraseBlock(x, y);
          }
          for (let ty = y; ty > 0; ty--) {
            for (let x = 0; x < PLAY_AREA_WIDTH; x++) {
              PLAY_AREA_BLOCKS[ty * PLAY_AREA_WIDTH + x] =
                PLAY_AREA_BLOCKS[(ty - 1) * PLAY_AREA_WIDTH + x];
            }
          }
          for (let x = 0; x < PLAY_AREA_WIDTH; x++) {
            PLAY_AREA_BLOCKS[x] = 0;
          }

          linesRemoved++;
          linesCleared++;
          updateDifficulty();
          anyCleared = true;
          break;
        }
      }

      if (!anyCleared) break;
    }

    switch (linesRemoved) {
      case 1:
        score += 100;
        break;
      case 2:
        score += 300;
        break;
      case 3:
        score += 500;
        break;
      case 4:
        score += 800;
        break;
    }
  }

  function collides(piece) {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (!piece.shape[y][x]) continue;
        let fx = piece.x + x,
          fy = piece.y + y;
        if (
          fx < 0 ||
          fx >= PLAY_AREA_WIDTH ||
          fy >= PLAY_AREA_HEIGHT ||
          (fy >= 0 && PLAY_AREA_BLOCKS[fy * PLAY_AREA_WIDTH + fx])
        ) {
          return true;
        }
      }
    }
    return false;
  }

  function drawBlock(x, y, forceValue) {
    const blockValue =
      typeof forceValue !== 'undefined'
        ? forceValue
        : PLAY_AREA_BLOCKS[y * PLAY_AREA_WIDTH + x];

    const x1 = PLAY_AREA_X + x * BLOCK_SIZE;
    const y1 = PLAY_AREA_Y + y * BLOCK_SIZE;

    if (blockValue === 2) {
      try {
        h.setColor(C_DIM);
        h.drawImage(nukeImage, x1, y1);
      } catch (e) {}
    } else if (blockValue) {
      h.setColor(C_BRIGHT);
      h.drawImage(blockImage, x1, y1);
    }
  }

  function drawBoundaries(area) {
    h.setColor(C_BRIGHT);
    h.drawRect(area.x1, area.y1, area.x2, area.y2);
  }

  function drawCurrentPiece(erase) {
    for (let y = 0; y < blockCurrent.shape.length; y++) {
      for (let x = 0; x < blockCurrent.shape[y].length; x++) {
        if (blockCurrent.shape[y][x]) {
          if (erase) {
            eraseBlock(blockCurrent.x + x, blockCurrent.y + y);
          } else {
            drawBlock(
              blockCurrent.x + x,
              blockCurrent.y + y,
              blockCurrent.shape[y][x],
            );
          }
        }
      }
    }
  }

  function drawField() {
    for (let y = 0; y < PLAY_AREA_HEIGHT; y++) {
      for (let x = 0; x < PLAY_AREA_WIDTH; x++) {
        if (PLAY_AREA_BLOCKS[y * PLAY_AREA_WIDTH + x]) {
          drawBlock(x, y);
        } else {
          eraseBlock(x, y);
        }
      }
    }
    drawScore();
    drawLevel();
    drawLinesCleared();
    drawNextPiece();
    drawIncomingNuke();
  }

  function drawGameName() {
    const fontHeight = 20;
    const startX = PLAY_AREA.x1 - 65;
    const startY = PLAY_AREA.y1 + 35;

    h.setColor(C_BRIGHT).setFontMonofonto28().setFontAlign(0, 0);
    h.drawString(GAME_NAME, startX, startY);

    h.setColor(C_MED).setFont('6x8', 1).setFontAlign(0, 0);
    h.drawString('v' + GAME_VERSION, startX, startY + fontHeight);
  }

  function drawGameOverScreen() {
    h.clear(1);

    const centerX = W / 2;
    const centerY = H / 2;

    h.setColor(C_BRIGHT).setFont('6x8', 4).setFontAlign(0, 0);
    h.drawString('GAME OVER', centerX, centerY - 75);

    h.setColor(C_MED).setFont('6x8', 2).setFontAlign(0, 0);
    h.drawString('Click to RESTART', centerX, centerY - 35);

    const statsYStart = centerY + 5;
    const statsLineHeight = 18;

    h.setColor(C_BRIGHT).setFont('6x8').setFontAlign(0, 0);
    h.drawString('Score: ' + score, centerX, statsYStart);
    h.drawString(
      'Level: ' + difficultyLevel,
      centerX,
      statsYStart + statsLineHeight,
    );
    h.drawString(
      'Lines: ' + linesCleared,
      centerX,
      statsYStart + statsLineHeight * 2,
    );

    h.setColor(C_MED);
    h.drawString(
      'High Score: ' + highScore,
      centerX,
      statsYStart + statsLineHeight * 3 + 10,
    );

    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawIncomingNuke() {
    const startX = PLAY_AREA.x2 + 65;
    const startY = PLAY_AREA.y1 + 100;
    const textLineHeight = 18;

    if (!nukeWarningActive) {
      const clearWidth = 100;
      const clearHeight = textLineHeight * 2 + 50 + 25;
      h.setColor(C_BLACK);
      h.fillRect(
        startX - clearWidth / 2 - 5,
        startY - 10,
        startX + clearWidth / 2,
        startY - 10 + clearHeight,
      );
      return;
    }

    h.setFont('6x8', 2).setColor(C_DIM).setFontAlign(0, 0);
    h.drawString('INCOMING', startX, startY);
    h.drawString('NUKE!', startX, startY + textLineHeight);

    if (radioactiveImage) {
      try {
        const imgSize = 50;
        h.setColor(C_DIM);
        h.drawImage(
          radioactiveImage,
          startX - imgSize / 2,
          startY + textLineHeight * 2 + 5,
        );
      } catch (e) {}
    }
  }

  function drawLevel() {
    const levelX = PLAY_AREA.x1 - 65;
    const levelY = PLAY_AREA.y2 - 120;
    const fontHeight = 20;

    h.setFont('6x8', 2);
    const text = difficultyLevel.toString();
    const textWidth = h.stringWidth(text);
    const textHeight = 16;

    const clearPadding = 4;
    const clearX1 = levelX - textWidth / 2 - clearPadding;
    const clearY1 = levelY + fontHeight - clearPadding * 2;
    const clearX2 = levelX + textWidth / 2 + clearPadding;
    const clearY2 = clearY1 + textHeight + clearPadding;

    h.setColor(C_BLACK).fillRect(clearX1, clearY1, clearX2, clearY2);

    h.setColor(C_MED).setFontAlign(0, 0);
    h.drawString('LEVEL', levelX, levelY);

    h.setColor(C_BRIGHT).setFontAlign(0, 0);
    h.drawString(text, levelX, levelY + fontHeight);
  }

  function drawLinesCleared() {
    const linesX = PLAY_AREA.x1 - 65;
    const linesY = PLAY_AREA.y2 - 60;
    const fontHeight = 20;

    h.setFont('6x8', 2);
    const text = linesCleared.toString();
    const textHeight = 16;

    const clearWidth = 80;
    const clearHeight = fontHeight + textHeight + 10;
    const clearX1 = linesX - clearWidth / 2;
    const clearY1 = linesY + fontHeight - 8;

    h.setColor(C_BLACK).fillRect(
      clearX1,
      clearY1,
      clearX1 + clearWidth,
      clearY1 + clearHeight,
    );

    h.setColor(C_MED).setFontAlign(0, 0);
    h.drawString('LINES', linesX, linesY);

    h.setColor(C_BRIGHT).setFontAlign(0, 0);
    h.drawString(text, linesX, linesY + fontHeight);
  }

  function drawNextPiece() {
    if (!blockNext) return;

    const startX = PLAY_AREA.x2 + 65;
    const startY = PLAY_AREA.y1 + 25;

    const previewBlockArea = 4 * BLOCK_SIZE;
    const previewPadding = 6;

    const clearX1 = startX - previewBlockArea / 2 - previewPadding;
    const clearY1 = startY + BLOCK_SIZE - previewPadding;
    const clearX2 = startX + previewBlockArea / 2 + previewPadding;
    const clearY2 = startY + 15 + previewBlockArea + previewPadding;

    h.setColor(C_BLACK).fillRect(clearX1, clearY1, clearX2, clearY2);

    h.setFont('6x8', 2).setColor(C_MED).setFontAlign(0, 0);
    h.drawString('NEXT', startX, startY);

    const piece = blockNext.shape;
    const piecePixelWidth = piece[0].length * BLOCK_SIZE;
    const offsetX = startX - piecePixelWidth / 2 - 2;
    const offsetY = startY + 20;

    for (let y = 0; y < piece.length; y++) {
      for (let x = 0; x < piece[y].length; x++) {
        if (piece[y][x]) {
          const blockValue = piece[y][x];
          const blockX = offsetX + x * BLOCK_SIZE;
          const blockY = offsetY + y * BLOCK_SIZE;

          if (blockValue === 2) {
            h.setColor(C_DIM).drawImage(nukeImage, blockX, blockY);
          } else {
            h.setColor(C_BRIGHT).drawImage(blockImage, blockX, blockY);
          }
        }
      }
    }
  }

  function drawScore() {
    const scoreX = PLAY_AREA.x2 + 65;
    const scoreY = PLAY_AREA.y2 - 60;
    const fontHeight = 20;

    h.setFont('6x8', 2);
    const text = score.toString();
    const textHeight = 16;

    const clearWidth = 100;
    const clearHeight = fontHeight + textHeight + 10;
    const clearX1 = scoreX - clearWidth / 2;
    const clearY1 = scoreY + fontHeight - 8;

    h.setColor(C_BLACK).fillRect(
      clearX1,
      clearY1,
      clearX1 + clearWidth,
      clearY1 + clearHeight,
    );

    h.setColor(C_MED).setFontAlign(0, 0);
    h.drawString('SCORE', scoreX, scoreY);

    h.setColor(C_BRIGHT).setFontAlign(0, 0);
    h.drawString(text, scoreX, scoreY + fontHeight);
  }

  function drawStartScreen() {
    h.clear(1);

    const centerX = W / 2;
    const centerY = H / 2;

    h.setColor(C_BRIGHT).setFontMonofonto28().setFontAlign(0, 0);
    h.drawString(GAME_NAME, centerX, centerY - 50);

    h.setColor(C_MED).setFont('6x8', 2).setFontAlign(0, 0);
    h.drawString('Click to START', centerX, centerY - 10);

    if (highScore > 0) {
      h.setColor(C_MED).setFont('6x8', 1).setFontAlign(0, 0);
      h.drawString('High Score: ' + highScore, centerX, centerY + 25);
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  function dropPiece() {
    if (!blockCurrent || isGameOver) return;

    drawCurrentPiece(true);
    blockCurrent.y++;

    if (collides(blockCurrent)) {
      blockCurrent.y--;
      drawCurrentPiece(false);
      merge(blockCurrent);
      clearLines();
      spawnPiece();
    }

    drawCurrentPiece(false);
    drawBoundaries(PLAY_AREA);

    const desiredInterval = fastDrop ? FAST_DROP_SPEED : blockDropSpeed;
    if (currentInterval !== desiredInterval) {
      if (mainLoopInterval) clearInterval(mainLoopInterval);
      mainLoopInterval = setInterval(mainLoop, desiredInterval);
      currentInterval = desiredInterval;
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  function eraseBlock(x, y) {
    h.setColor(C_BLACK);
    h.fillRect(
      PLAY_AREA_X + x * BLOCK_SIZE,
      PLAY_AREA_Y + y * BLOCK_SIZE,
      PLAY_AREA_X + (x + 1) * BLOCK_SIZE - 1,
      PLAY_AREA_Y + (y + 1) * BLOCK_SIZE - 1,
    );
  }

  function fileExists(path) {
    try {
      let f = E.openFile(path, 'r');
      if (f) {
        f.close();
        return true;
      }
    } catch (e) {}
    return false;
  }

  function getRandomPiece(allowNuke) {
    if (typeof allowNuke === 'undefined') allowNuke = true;

    let shapeData;
    while (true) {
      let picked = Math.floor(Math.random() * SHAPES.length);
      shapeData = SHAPES[picked];

      if (shapeData[0][0] === 2) {
        if (!allowNuke) continue;
        if (Math.random() < 0.5) continue;
      }

      break;
    }

    let offset = Math.floor((PLAY_AREA_WIDTH - shapeData[0].length) / 2);
    return { shape: shapeData, x: offset, y: 0 };
  }

  function handleClick(e) {
    const pressed = e.state;

    if (gameState === 'start' || gameState === 'gameover') {
      if (pressed) {
        gameState = 'starting';
        startGame();
      }
      return;
    }

    if (gameState === 'playing') {
      fastDrop = pressed;
      const desiredInterval = fastDrop ? FAST_DROP_SPEED : blockDropSpeed;
      if (currentInterval !== desiredInterval) {
        if (mainLoopInterval) clearInterval(mainLoopInterval);
        mainLoopInterval = setInterval(mainLoop, desiredInterval);
        currentInterval = desiredInterval;
      }
    }
  }

  function handleLeftKnob(dir) {
    if (!dir || gameState !== 'playing') return;

    let now = Date.now();
    if (now - lastLeftKnobTime < KNOB_DEBOUNCE) return;
    lastLeftKnobTime = now;

    rotate(dir);
  }

  function handleMusicStopped() {
    playMusic();
  }

  function handleRightKnob(dir) {
    if (gameState !== 'playing') return;
    move(dir > 0 ? 1 : -1);
  }

  function loadConfig() {
    try {
      let file = fs.readFile(CONFIG_PATH);
      if (!file) throw new Error('Config file missing');
      let data = JSON.parse(file);
      highScore = data.highScore || 0;
    } catch (e) {
      highScore = 0;
      saveConfig();
    }

    musicList = [];
    for (let i = 0; i < KNOWN_MUSIC.length; i++) {
      if (fileExists(KNOWN_MUSIC[i])) {
        musicList.push(KNOWN_MUSIC[i]);
      }
    }
  }

  function loadImage(path) {
    try {
      let file = fs.readFile(path);
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

  function mainLoop() {
    dropPiece();
  }

  function merge(piece) {
    let nuked = false;
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const fx = piece.x + x;
          const fy = piece.y + y;

          if (!isFinite(fx) || !isFinite(fy)) continue;

          if (piece.shape[y][x] === 2) {
            if (
              fx >= 0 &&
              fx < PLAY_AREA_WIDTH &&
              fy >= 0 &&
              fy < PLAY_AREA_HEIGHT
            ) {
              PLAY_AREA_BLOCKS[fy * PLAY_AREA_WIDTH + fx] = 0;
              nuke(fx, fy);
              nuked = true;
            }
          } else {
            PLAY_AREA_BLOCKS[fy * PLAY_AREA_WIDTH + fx] = 1;
          }
        }
      }
    }

    if (nuked) clearLines();
  }

  function move(dir) {
    if (isGameOver || !blockCurrent) return;

    let oldX = blockCurrent.x;
    blockCurrent.x += dir;

    if (collides(blockCurrent)) {
      blockCurrent.x = oldX;
      return;
    }

    for (let y = 0; y < blockCurrent.shape.length; y++) {
      for (let x = 0; x < blockCurrent.shape[y].length; x++) {
        if (blockCurrent.shape[y][x]) {
          eraseBlock(oldX + x, blockCurrent.y + y);
        }
      }
    }

    drawCurrentPiece(false);
    drawBoundaries(PLAY_AREA);

    h.flip();
    Pip.lastFlip = getTime();
  }

  function nuke(centerX, centerY) {
    if (nukeInProgress) return;
    nukeInProgress = true;

    if (!isFinite(centerX) || !isFinite(centerY)) {
      nukeInProgress = false;
      return;
    }

    centerX = Math.max(0, Math.min(centerX, PLAY_AREA_WIDTH - 1));
    centerY = Math.max(0, Math.min(centerY, PLAY_AREA_HEIGHT - 1));

    let blastArea = {
      x1: PLAY_AREA_X + (centerX - NUKE_RADIUS) * BLOCK_SIZE + 1,
      y1: PLAY_AREA_Y + (centerY - NUKE_RADIUS) * BLOCK_SIZE + 1,
      x2: PLAY_AREA_X + (centerX + NUKE_RADIUS + 1) * BLOCK_SIZE - 2,
      y2: PLAY_AREA_Y + (centerY + NUKE_RADIUS + 1) * BLOCK_SIZE - 2,
    };
    blastArea.x1 = Math.max(blastArea.x1, PLAY_AREA.x1 + 1);
    blastArea.y1 = Math.max(blastArea.y1, PLAY_AREA.y1 + 1);
    blastArea.x2 = Math.min(blastArea.x2, PLAY_AREA.x2 - 1);
    blastArea.y2 = Math.min(blastArea.y2, PLAY_AREA.y2 - 1);

    h.setColor(C_DIM);
    h.drawRect(blastArea.x1, blastArea.y1, blastArea.x2, blastArea.y2);

    let blocksDestroyed = 0;
    for (let y = -NUKE_RADIUS; y <= NUKE_RADIUS; y++) {
      for (let x = -NUKE_RADIUS; x <= NUKE_RADIUS; x++) {
        let fx = centerX + x;
        let fy = centerY + y;

        if (
          fx >= 0 &&
          fx < PLAY_AREA_WIDTH &&
          fy >= 0 &&
          fy < PLAY_AREA_HEIGHT &&
          PLAY_AREA_BLOCKS[fy * PLAY_AREA_WIDTH + fx]
        ) {
          PLAY_AREA_BLOCKS[fy * PLAY_AREA_WIDTH + fx] = 0;
          eraseBlock(fx, fy);
          blocksDestroyed++;
        }
      }
    }

    score += blocksDestroyed * NUKE_POINTS_PER_BLOCK;
    drawScore();

    h.setColor(C_BLACK);
    h.fillRect(blastArea.x1, blastArea.y1, blastArea.x2, blastArea.y2);

    applyGravity();
    nukeInProgress = false;
  }

  function playMusic() {
    if (!musicList.length || musicChanging) return;
    musicChanging = true;

    let track;
    if (musicList.length === 1) {
      track = musicList[0];
    } else {
      do {
        track = musicList[Math.floor(Math.random() * musicList.length)];
      } while (track === currentTrack);
    }

    Pip.audioStart(track);
    currentTrack = track;

    musicChanging = false;
  }

  function remove() {
    if (removed) return;
    removed = true;

    if (mainLoopInterval) {
      clearInterval(mainLoopInterval);
      mainLoopInterval = null;
    }
    if (clickWatch) {
      clearWatch(clickWatch);
      clickWatch = null;
    }

    Pip.removeListener('knob1', handleLeftKnob);
    Pip.removeListener('knob2', handleRightKnob);
    Pip.removeListener(MUSIC_STOPPED, handleMusicStopped);

    Pip.audioStop();
    h.clear();
    h.flip();
  }

  function resetField() {
    for (let i = 0; i < PLAY_AREA_BLOCKS.length; i++) PLAY_AREA_BLOCKS[i] = 0;
    h.setColor(C_BLACK);
    h.fillRect(
      PLAY_AREA_X,
      PLAY_AREA_Y,
      PLAY_AREA_X + PLAY_AREA_WIDTH * BLOCK_SIZE - 1,
      PLAY_AREA_Y + PLAY_AREA_HEIGHT * BLOCK_SIZE - 1,
    );
  }

  function rotate(dir) {
    if (isGameOver || !blockCurrent) return;

    const oldShape = blockCurrent.shape;
    const oldX = blockCurrent.x;
    const oldY = blockCurrent.y;

    for (let y = 0; y < oldShape.length; y++) {
      for (let x = 0; x < oldShape[y].length; x++) {
        if (oldShape[y][x]) eraseBlock(oldX + x, oldY + y);
      }
    }

    const newShape =
      dir > 0
        ? oldShape[0].map((_, i) =>
            oldShape.map((row) => row[row.length - 1 - i]),
          )
        : oldShape[0].map((_, i) => oldShape.map((row) => row[i]).reverse());

    let newX = oldX;
    let newY = oldY;

    if (oldShape.length === 1 && oldShape[0].length === 4) {
      newX += 1;
      newY -= 1;
    } else if (oldShape.length === 4 && oldShape[0].length === 1) {
      newX -= 1;
      newY += 1;
    }

    blockCurrent.shape = newShape;
    blockCurrent.x = newX;
    blockCurrent.y = newY;

    if (collides(blockCurrent)) {
      blockCurrent.shape = oldShape;
      blockCurrent.x = oldX;
      blockCurrent.y = oldY;
      drawCurrentPiece(false);
      return;
    }

    drawCurrentPiece(false);
    drawBoundaries(PLAY_AREA);

    h.flip();
    Pip.lastFlip = getTime();
  }

  function saveConfig() {
    try {
      fs.writeFile(CONFIG_PATH, JSON.stringify({ highScore: highScore }));
    } catch (e) {}
  }

  function spawnPiece() {
    if (!blockNext) blockNext = getRandomPiece();

    blockCurrent = blockNext;
    blockNext = getRandomPiece();

    nukeWarningActive = blockNext.shape.some((row) => row.includes(2));

    drawField();

    if (collides(blockCurrent)) {
      isGameOver = true;
      checkHighScore();
      if (mainLoopInterval) {
        clearInterval(mainLoopInterval);
        mainLoopInterval = null;
      }
      if (gameOverTimeout) clearTimeout(gameOverTimeout);
      gameOverTimeout = setTimeout(function () {
        gameOverTimeout = null;
        gameState = 'gameover';
        drawGameOverScreen();
      }, 50);
    }
  }

  function start() {
    h.clear();
    Pip.audioStop();

    loadConfig();

    blockImage = loadImage(BLOCK_IMAGE_PATH);
    nukeImage = loadImage(NUKE_IMAGE_PATH);
    radioactiveImage = loadImage(RADIOACTIVE_IMAGE_PATH);

    gameState = 'start';

    Pip.onExclusive('knob1', handleLeftKnob);
    Pip.onExclusive('knob2', handleRightKnob);
    Pip.on(MUSIC_STOPPED, handleMusicStopped);

    clickWatch = setWatch(handleClick, ENC1_PRESS, {
      repeat: true,
      edge: 'both',
      debounce: 20,
    });

    drawStartScreen();
  }

  function startGame() {
    if (gameOverTimeout) {
      clearTimeout(gameOverTimeout);
      gameOverTimeout = null;
    }

    musicChanging = true;
    Pip.audioStop();

    if (mainLoopInterval) {
      clearInterval(mainLoopInterval);
      mainLoopInterval = null;
    }

    blockCurrent = null;
    blockDropSpeed = BLOCK_START_SPEED;
    currentInterval = BLOCK_START_SPEED;
    difficultyLevel = 0;
    fastDrop = false;
    isGameOver = false;
    linesCleared = 0;
    nukeInProgress = false;
    nukeWarningActive = false;
    score = 0;
    blockNext = getRandomPiece(false);

    h.setColor(C_BLACK).fillRect(0, 0, W, H);
    resetField();
    drawBoundaries(PLAY_AREA);

    spawnPiece();
    drawGameName();

    gameState = 'playing';

    musicChanging = false;
    playMusic();

    mainLoopInterval = setInterval(mainLoop, blockDropSpeed);
  }

  function updateDifficulty() {
    let newLevel = Math.floor(linesCleared / LINES_PER_LEVEL);
    if (newLevel > difficultyLevel) {
      difficultyLevel = newLevel;
      blockDropSpeed = Math.max(
        BLOCK_START_SPEED - difficultyLevel * SPEED_STEP,
        MIN_DROP_SPEED,
      );
    }
  }

  start();

  return {
    id: APP_ID,
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
