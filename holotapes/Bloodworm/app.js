// =============================================================================
//  Name: Bloodworm
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000a-holotapes
// =============================================================================

(function () {
  const APP_ID = 'Bloodworm';

  const GAME_NAME = 'BLOODWORM';
  const GAME_VERSION = '2.0.0';

  const CONFIG_PATH = 'HOLO/BLOODWORM/bloodworm.json';

  const SOUND_PATHS = {
    eat: 'HOLO/BLOODWORM/bloodworm-eat.wav',
    die: 'HOLO/BLOODWORM/bloodworm-die.wav',
    start: 'HOLO/BLOODWORM/bloodworm-start.wav',
  };

  const W = h.getWidth();
  const H = h.getHeight();

  const C_BLACK = 0;
  const C_DIM = 1;
  const C_MED = 2;
  const C_BRIGHT = 3;

  const TILE = 16;
  const HUD_HEIGHT = 32;
  const HUD_SIDE_INSET = 24;
  const BORDER = 8;

  const PLAY_X = BORDER;
  const PLAY_Y = HUD_HEIGHT + BORDER;
  const PLAY_W = Math.floor((W - BORDER * 2) / TILE) * TILE;
  const PLAY_H = Math.floor((H - HUD_HEIGHT - BORDER * 2) / TILE) * TILE;
  const COLS = PLAY_W / TILE;
  const ROWS = PLAY_H / TILE;

  const START_SPEED = 180;
  const MIN_SPEED = 70;
  const SPEED_STEP = 5;
  const SPEED_RAMP_EVERY = 5;

  const KNOB_DEBOUNCE = 30;

  // Directions (0=right, 1=down, 2=left, 3=up)
  const DIR = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
  ];

  let gameState = 'start'; // 'start' | 'playing' | 'gameover'
  let mode = '1P';

  let players = [];
  let apple = { x: 0, y: 0 };
  let grass = [];

  let score1P = 0;
  let highScore1P = 0;
  let highScore2P = 0;
  let applesEaten = 0;

  let tickSpeed = START_SPEED;
  let mainInterval = null;
  let clickWatch = null;
  let lastK1Time = 0;
  let lastK2Time = 0;
  let lastMenuToggleTime = 0;
  let removed = false;

  function clearTile(c, r) {
    h.setColor(C_BLACK);
    h.fillRect(tileX(c), tileY(r), tileX(c) + TILE - 1, tileY(r) + TILE - 1);
    // Redraw grass if needed
    for (let i = 0; i < grass.length; i++) {
      if (grass[i].x === c && grass[i].y === r) {
        drawGrass(c, r);
        return;
      }
    }
  }

  function drawApple(c, r) {
    const x = tileX(c);
    const y = tileY(r);
    h.setColor(C_BRIGHT);
    h.fillCircle(x + TILE / 2, y + TILE / 2 + 1, TILE / 2 - 2);
    h.setColor(C_MED);
    h.fillRect(x + TILE / 2 - 1, y + 1, x + TILE / 2 + 1, y + 4);
    h.setColor(C_DIM);
    h.fillRect(x + TILE / 2 + 1, y + 1, x + TILE / 2 + 4, y + 3);
  }

  function drawBoundary() {
    h.setColor(C_MED);
    h.drawRect(
      PLAY_X - 2,
      PLAY_Y - 2,
      PLAY_X + PLAY_W + 1,
      PLAY_Y + PLAY_H + 1,
    );
  }

  function drawDecoSnake(x, y) {
    h.setColor(C_BRIGHT);
    for (let i = 0; i < 6; i++) {
      const sx = x + i * TILE;
      h.fillRect(sx + 2, y + 2, sx + TILE - 3, y + TILE - 3);
    }
    const hx = x + 6 * TILE;
    h.setColor(C_BRIGHT);
    h.fillRect(hx + 1, y + 1, hx + TILE - 2, y + TILE - 2);
    h.setColor(C_BLACK);
    h.fillRect(hx + 11, y + 3, hx + 13, y + 5);
    h.fillRect(hx + 11, y + 11, hx + 13, y + 13);
    const ax = x + 8 * TILE;
    h.setColor(C_BRIGHT);
    h.fillCircle(ax + TILE / 2, y + TILE / 2 + 1, TILE / 2 - 2);
    h.setColor(C_MED);
    h.fillRect(ax + TILE / 2 - 1, y + 1, ax + TILE / 2 + 1, y + 4);
  }

  function drawGameOverScreen(reason) {
    h.clear(1);
    const cx = W / 2;
    const cy = H / 2;

    h.setColor(C_BRIGHT).setFont('6x8', 4).setFontAlign(0, 0);
    h.drawString('GAME OVER', cx, cy - 80);

    h.setColor(C_MED).setFont('6x8', 2).setFontAlign(0, 0);
    if (mode === '1P' || players.length < 2) {
      h.drawString('Score: ' + score1P, cx, cy - 20);
      h.setColor(C_DIM);
      h.drawString('High: ' + highScore1P, cx, cy + 10);
    } else {
      // Figure out winnder
      const p1Alive = players[0].alive;
      const p2Alive = players[1].alive;
      let result = 'TIE!';
      if (p1Alive && !p2Alive) result = 'PLAYER 1 WINS!';
      else if (!p1Alive && p2Alive) result = 'PLAYER 2 WINS!';
      else if (!p1Alive && !p2Alive) {
        if (players[0].score > players[1].score) result = 'PLAYER 1 WINS!';
        else if (players[1].score > players[0].score) result = 'PLAYER 2 WINS!';
      }
      h.setColor(C_BRIGHT);
      h.drawString(result, cx, cy - 30);
      h.setColor(C_MED).setFont('6x8', 1).setFontAlign(0, 0);
      h.drawString(
        'P1: ' + players[0].score + '   P2: ' + players[1].score,
        cx,
        cy,
      );
      h.setColor(C_DIM);
      h.drawString('Best Round: ' + highScore2P, cx, cy + 18);
    }

    h.setColor(C_BRIGHT).setFont('6x8', 2).setFontAlign(0, 0);
    h.drawString('CLICK TO RESTART', cx, cy + 70);
    h.setColor(C_BRIGHT).setFont('6x8', 2).setFontAlign(0, 0);
    h.drawString(
      'MODE: ' + mode + (mode === '1P' ? ' (SOLO)' : ' (VERSUS)'),
      cx,
      cy + 93,
    );
    h.setColor(C_MED).setFont('6x8', 1).setFontAlign(0, 0);
    h.drawString('TURN KNOB TO CHANGE', cx, cy + 115);

    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawGrass(c, r) {
    const x = tileX(c);
    const y = tileY(r);
    h.setColor(C_DIM);
    h.fillRect(x + 2, y + TILE - 4, x + 4, y + TILE - 2);
    h.fillRect(x + 7, y + TILE - 5, x + 9, y + TILE - 2);
    h.fillRect(x + TILE - 5, y + TILE - 4, x + TILE - 3, y + TILE - 2);
  }

  function drawHud() {
    h.setColor(C_BLACK);
    h.fillRect(0, 0, W - 1, HUD_HEIGHT - 1);

    h.setFont('6x8', 2).setFontAlign(-1, -1);

    if (mode === '1P') {
      h.setColor(C_BRIGHT);
      h.drawString('SCORE: ' + score1P, HUD_SIDE_INSET, 8);
      h.setColor(C_MED);
      h.setFontAlign(1, -1);
      h.drawString('HIGH: ' + highScore1P, W - HUD_SIDE_INSET, 8);
    } else {
      h.setColor(C_BRIGHT);
      h.drawString('P1: ' + players[0].score, HUD_SIDE_INSET, 8);
      h.setColor(C_MED);
      h.setFontAlign(0, -1);
      h.drawString('VS', W / 2, 8);
      h.setColor(C_DIM);
      h.setFontAlign(1, -1);
      h.drawString('P2: ' + players[1].score, W - HUD_SIDE_INSET, 8);
    }

    h.setFontAlign(-1, -1); // reset
  }

  function drawPlayfield() {
    // Clear
    h.setColor(C_BLACK);
    h.fillRect(
      PLAY_X - 2,
      PLAY_Y - 2,
      PLAY_X + PLAY_W + 1,
      PLAY_Y + PLAY_H + 1,
    );
    // Grass
    for (let i = 0; i < grass.length; i++) {
      drawGrass(grass[i].x, grass[i].y);
    }
    // Snakes
    for (let p = 0; p < players.length; p++) {
      const segs = players[p].segments;
      const col = players[p].color;
      for (let i = 0; i < segs.length; i++) {
        const kind = i === 0 ? 'head' : i === segs.length - 1 ? 'tail' : 'body';
        drawSnakeSegment(segs[i].x, segs[i].y, col, kind, players[p].dirIdx);
      }
    }
    // Apple
    drawApple(apple.x, apple.y);
    // Border
    drawBoundary();
  }

  function drawSnakeSegment(c, r, color, kind, dirIdx) {
    const x = tileX(c);
    const y = tileY(r);

    h.setColor(color);
    if (kind === 'head') {
      h.fillRect(x + 1, y + 1, x + TILE - 2, y + TILE - 2);
      // Eyes
      h.setColor(C_BLACK);
      const cx = x + TILE / 2;
      const cy = y + TILE / 2;
      const off = 4;
      let e1x = cx,
        e1y = cy,
        e2x = cx,
        e2y = cy;
      if (dirIdx === 0) {
        // right
        e1x = cx + off;
        e1y = cy - off;
        e2x = cx + off;
        e2y = cy + off;
      } else if (dirIdx === 1) {
        // down
        e1x = cx - off;
        e1y = cy + off;
        e2x = cx + off;
        e2y = cy + off;
      } else if (dirIdx === 2) {
        // left
        e1x = cx - off;
        e1y = cy - off;
        e2x = cx - off;
        e2y = cy + off;
      } else {
        // up
        e1x = cx - off;
        e1y = cy - off;
        e2x = cx + off;
        e2y = cy - off;
      }
      h.fillRect(e1x - 1, e1y - 1, e1x + 1, e1y + 1);
      h.fillRect(e2x - 1, e2y - 1, e2x + 1, e2y + 1);
    } else {
      // tail
      h.fillRect(x + 2, y + 2, x + TILE - 3, y + TILE - 3);
    }
  }

  function drawStartScreen() {
    h.clear(1);

    const cx = W / 2;
    const cy = H / 2;

    h.setColor(C_BRIGHT).setFontMonofonto28().setFontAlign(0, 0);
    h.drawString(GAME_NAME, cx, cy - 80);

    h.setColor(C_MED).setFont('6x8', 1).setFontAlign(0, 0);
    h.drawString('v' + GAME_VERSION, cx, cy - 55);

    drawDecoSnake(cx - 90, cy - 25);

    h.setColor(C_BRIGHT).setFont('6x8', 2).setFontAlign(0, 0);
    h.drawString(
      'MODE: ' + mode + (mode === '1P' ? ' (SOLO)' : ' (VERSUS)'),
      cx,
      cy + 25,
    );

    h.setColor(C_MED).setFont('6x8', 1).setFontAlign(0, 0);
    h.drawString('TURN EITHER KNOB TO TOGGLE MODE', cx, cy + 50);

    h.setColor(C_BRIGHT).setFont('6x8', 2).setFontAlign(0, 0);
    h.drawString('CLICK TO START', cx, cy + 80);

    if (highScore1P > 0) {
      h.setColor(C_DIM).setFont('6x8', 1).setFontAlign(0, 0);
      h.drawString('1P High: ' + highScore1P, cx, cy + 110);
    }
    if (highScore2P > 0) {
      h.setColor(C_DIM).setFont('6x8', 1).setFontAlign(0, 0);
      h.drawString('2P Best Round: ' + highScore2P, cx, cy + 125);
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  function endGame() {
    Pip.audioStop();
    playSound('die');
    gameState = 'gameover';
    if (mainInterval) {
      clearInterval(mainInterval);
      mainInterval = null;
    }

    if (mode === '1P') {
      if (score1P > highScore1P) {
        highScore1P = score1P;
      }
    } else {
      const round = players[0].score + players[1].score;
      if (round > highScore2P) highScore2P = round;
    }
    saveConfig();

    drawGameOverScreen();
  }

  function fileExists(path) {
    try {
      const f = E.openFile(path, 'r');
      if (f) {
        f.close();
        return true;
      }
    } catch (e) {}
    return false;
  }

  function inBounds(c, r) {
    return c >= 0 && c < COLS && r >= 0 && r < ROWS;
  }

  function isOccupiedByAny(c, r, ignoreTail) {
    for (let p = 0; p < players.length; p++) {
      const segs = players[p].segments;
      const lim = ignoreTail ? segs.length - 1 : segs.length;
      for (let i = 0; i < lim; i++) {
        if (segs[i].x === c && segs[i].y === r) return true;
      }
    }
    return false;
  }

  function loadConfig() {
    try {
      const file = fs.readFile(CONFIG_PATH);
      if (!file) throw new Error('no config');
      const data = JSON.parse(file);
      highScore1P = data.highScore1P || 0;
      highScore2P = data.highScore2P || 0;
      mode = data.mode === '2P' ? '2P' : '1P';
    } catch (e) {
      highScore1P = 0;
      highScore2P = 0;
      mode = '1P';
      saveConfig();
    }
  }

  function mainLoop() {
    if (gameState !== 'playing') return;

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p.alive) continue;
      const opp = (p.dirIdx + 2) & 3;
      if (p.nextDir !== p.dirIdx && p.nextDir !== opp) {
        p.dirIdx = p.nextDir;
      } else {
        p.nextDir = p.dirIdx;
      }
    }

    const newHeads = [];
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p.alive) {
        newHeads.push(null);
        continue;
      }
      const d = DIR[p.dirIdx];
      newHeads.push({ x: p.segments[0].x + d.x, y: p.segments[0].y + d.y });
    }

    // Collision checks
    let anyDied = false;
    let ateThisTick = [false, false];
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p.alive) continue;
      const head = newHeads[i];

      // Wall check
      if (!inBounds(head.x, head.y)) {
        p.alive = false;
        anyDied = true;
        continue;
      }

      // Self & other snake check
      const eats = head.x === apple.x && head.y === apple.y;
      ateThisTick[i] = eats;

      for (let j = 0; j < players.length; j++) {
        const other = players[j];
        const segs = other.segments;
        const skipTail = !ateThisTick[j];
        const lim = skipTail ? segs.length - 1 : segs.length;
        for (let s = 0; s < lim; s++) {
          if (segs[s].x === head.x && segs[s].y === head.y) {
            p.alive = false;
            anyDied = true;
            break;
          }
        }
        if (!p.alive) break;
      }

      // Head on collision check
      if (p.alive) {
        for (let j = 0; j < players.length; j++) {
          if (j === i) continue;
          const otherHead = newHeads[j];
          if (
            players[j].alive &&
            otherHead &&
            otherHead.x === head.x &&
            otherHead.y === head.y
          ) {
            p.alive = false;
            anyDied = true;
            break;
          }
        }
      }
    }

    // Move snakes
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p.alive) continue;
      const head = newHeads[i];

      // Erase tail unless eating
      if (!ateThisTick[i]) {
        const tail = p.segments[p.segments.length - 1];
        p.segments.pop();
        clearTile(tail.x, tail.y);
      }

      p.segments.unshift(head);

      if (ateThisTick[i]) {
        p.score++;
        if (mode === '1P') score1P = p.score;
        applesEaten++;
        playSound('eat');
        spawnApple();
        drawApple(apple.x, apple.y);

        // Speed ups
        if (applesEaten % SPEED_RAMP_EVERY === 0 && tickSpeed > MIN_SPEED) {
          tickSpeed = Math.max(MIN_SPEED, tickSpeed - SPEED_STEP);
          if (mainInterval) clearInterval(mainInterval);
          mainInterval = setInterval(mainLoop, tickSpeed);
        }
      }

      // Redraw
      if (p.segments.length > 1) {
        drawSnakeSegment(
          p.segments[1].x,
          p.segments[1].y,
          p.color,
          'body',
          p.dirIdx,
        );
      }
      drawSnakeSegment(head.x, head.y, p.color, 'head', p.dirIdx);
      // Make sure the new tail is drawn
      const tailSeg = p.segments[p.segments.length - 1];
      if (p.segments.length > 1) {
        drawSnakeSegment(tailSeg.x, tailSeg.y, p.color, 'tail', p.dirIdx);
      }
    }

    drawHud();

    if (mode === '1P') {
      if (!players[0].alive) {
        endGame();
      }
    } else {
      // 2P ends when both dead
      const aliveCount = players.filter(function (p) {
        return p.alive;
      }).length;
      if (aliveCount === 0) {
        endGame();
      }
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  function onClick() {
    if (gameState === 'start' || gameState === 'gameover') {
      startGame();
    }
  }

  function onKnob1(dir) {
    if (!dir) return;

    if (gameState === 'playing') {
      const now = Date.now();
      if (now - lastK1Time < KNOB_DEBOUNCE) return;
      lastK1Time = now;

      turnPlayer(0, dir);
    } else {
      toggleModeFromMenu(dir);
    }
  }

  function onKnob2(dir) {
    if (!dir) return;

    if (gameState === 'playing') {
      const now = Date.now();
      if (now - lastK2Time < KNOB_DEBOUNCE) return;
      lastK2Time = now;

      if (mode === '1P') turnPlayer(0, dir);
      else turnPlayer(1, dir);
    } else {
      toggleModeFromMenu(dir);
    }
  }

  function playSound(key) {
    const path = SOUND_PATHS[key];
    if (!path || !fileExists(path)) return;
    try {
      Pip.audioStart(path);
    } catch (e) {}
  }

  function remove() {
    if (removed) return;
    removed = true;

    if (mainInterval) {
      clearInterval(mainInterval);
      mainInterval = null;
    }
    if (clickWatch) {
      clearWatch(clickWatch);
      clickWatch = null;
    }

    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);

    Pip.audioStop();
    h.clear();
    h.flip();
  }

  function saveConfig() {
    try {
      fs.writeFile(
        CONFIG_PATH,
        JSON.stringify({
          highScore1P: highScore1P,
          highScore2P: highScore2P,
          mode: mode,
        }),
      );
    } catch (e) {}
  }

  function spawnApple() {
    let nx, ny, ok;
    let tries = 0;
    do {
      nx = Math.floor(Math.random() * COLS);
      ny = Math.floor(Math.random() * ROWS);
      ok = !isOccupiedByAny(nx, ny, false);
      tries++;
    } while (!ok && tries < 200);
    apple.x = nx;
    apple.y = ny;
  }

  function spawnGrass() {
    grass = [];
    const count = 14;
    for (let i = 0; i < count; i++) {
      const gx = Math.floor(Math.random() * COLS);
      const gy = Math.floor(Math.random() * ROWS);
      // Dont start on grass
      let overlap = false;
      for (let p = 0; p < players.length; p++) {
        const segs = players[p].segments;
        for (let s = 0; s < segs.length; s++) {
          if (segs[s].x === gx && segs[s].y === gy) {
            overlap = true;
            break;
          }
        }
      }
      // Dont duplicate grass
      for (let j = 0; j < grass.length; j++) {
        if (grass[j].x === gx && grass[j].y === gy) overlap = true;
      }
      if (overlap) continue;
      grass.push({ x: gx, y: gy });
    }
  }

  function start() {
    h.clear();
    Pip.audioStop();

    loadConfig();

    gameState = 'start';

    Pip.onExclusive('knob1', onKnob1);
    Pip.onExclusive('knob2', onKnob2);

    clickWatch = setWatch(onClick, ENC1_PRESS, {
      repeat: true,
      edge: 'rising',
      debounce: 50,
    });

    drawStartScreen();
  }

  function startGame() {
    if (mainInterval) {
      clearInterval(mainInterval);
      mainInterval = null;
    }
    Pip.audioStop();

    score1P = 0;
    applesEaten = 0;
    tickSpeed = START_SPEED;

    players = [];
    if (mode === '1P') {
      players.push({
        color: C_BRIGHT,
        dirIdx: 0,
        nextDir: 0,
        alive: true,
        score: 0,
        segments: [
          { x: 5, y: Math.floor(ROWS / 2) },
          { x: 4, y: Math.floor(ROWS / 2) },
          { x: 3, y: Math.floor(ROWS / 2) },
        ],
      });
    } else {
      players.push({
        color: C_BRIGHT,
        dirIdx: 0,
        nextDir: 0,
        alive: true,
        score: 0,
        segments: [
          { x: 4, y: Math.floor(ROWS / 3) },
          { x: 3, y: Math.floor(ROWS / 3) },
          { x: 2, y: Math.floor(ROWS / 3) },
        ],
      });
      players.push({
        color: C_DIM,
        dirIdx: 2,
        nextDir: 2,
        alive: true,
        score: 0,
        segments: [
          { x: COLS - 5, y: Math.floor((2 * ROWS) / 3) },
          { x: COLS - 4, y: Math.floor((2 * ROWS) / 3) },
          { x: COLS - 3, y: Math.floor((2 * ROWS) / 3) },
        ],
      });
    }

    spawnGrass();
    spawnApple();

    h.clear(1);
    drawHud();
    drawPlayfield();
    h.flip();
    Pip.lastFlip = getTime();

    gameState = 'playing';
    playSound('start');

    mainInterval = setInterval(mainLoop, tickSpeed);
  }

  function tileX(c) {
    return PLAY_X + c * TILE;
  }

  function tileY(r) {
    return PLAY_Y + r * TILE;
  }

  function toggleModeFromMenu(dir) {
    if (!dir) return;
    const now = Date.now();
    if (now - lastMenuToggleTime < KNOB_DEBOUNCE) return;
    lastMenuToggleTime = now;

    mode = mode === '1P' ? '2P' : '1P';
    saveConfig();
    if (gameState === 'start') drawStartScreen();
    else if (gameState === 'gameover') drawGameOverScreen();
  }

  function turnPlayer(playerIdx, knobDir) {
    const p = players[playerIdx];
    if (!p || !p.alive) return;
    // CW (turn right)
    if (knobDir > 0) p.nextDir = (p.dirIdx + 1) & 3;
    // CCW (turn left)
    else if (knobDir < 0) p.nextDir = (p.dirIdx + 3) & 3;
  }

  start();

  return {
    id: APP_ID,
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
