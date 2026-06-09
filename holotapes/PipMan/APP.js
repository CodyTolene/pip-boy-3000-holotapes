// ============================================================
//  PIP MAN  —  Pip-Boy 3000 App
//  Controls:
//    knob1 (scroll wheel) → UP (-1) / DOWN (+1)
//    knob2 (thumb wheel)  → LEFT (-1) / RIGHT (+1)
//    ENC1_PRESS           → start / pause / resume / confirm
// ============================================================

(function () {
  const APP_ID    = 'PIPMAN';
  const SAVE_FILE = 'HOLO/PIPMAN/save.json';

  const W = h.getWidth();
  const H = h.getHeight();

  // ── Map geometry ──────────────────────────────────────────
  const COLS = 20, ROWS = 13;
  const TW = Math.floor(W / COLS);
  const TH = Math.floor(H / ROWS);
  const OX = Math.floor((W - COLS * TW) / 2);
  const OY = Math.floor((H - ROWS * TH) / 2);

  const T_DOT  = 0;
  const T_WALL = 1;
  const T_VOID = 2;
  const T_PWR  = 3;

  const BASE_MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,3,1,0,1,1,0,1,1,0,0,1,1,1,0,1,1,0,3,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
    [1,0,1,1,1,0,1,1,2,1,1,2,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,2,2,2,2,2,2,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,2,2,2,2,2,2,1,0,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,2,1,1,2,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,3,1,0,1,1,1,0,1,1,1,1,0,1,1,1,0,1,3,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ];

  const MOVE_DIRS = [
    { x: 1,  y: 0  },
    { x: 0,  y: 1  },
    { x: -1, y: 0  },
    { x: 0,  y: -1 },
  ];

  const GHOST_NAMES   = ['DEATH', 'RAIDER', 'S.MUT.', 'FERAL'];
  const GHOST_SPAWN_X = [9, 10, 9, 10];
  const GHOST_SPAWN_Y = [5,  5, 6,  6];
  const GHOST_COLORS  = [1, 2, 3, 1];

  const TICK_MS = 120;   // matches bloodworm tick rate

  // ── Lifecycle ─────────────────────────────────────────────
  let tickInterval = null;
  let pressWatch   = null;

  // ── Persistent ────────────────────────────────────────────
  let highScore = 0;

  // ── Game state ────────────────────────────────────────────
  let map, score, lives, level, gameState;
  let px, py, pDir, pAnimTick, pendingDir;
  let ghosts;
  let frightenTimer, pelletTick, gameTick, stateTimer;

  // ── Input debounce (mirrors bloodworm M/U/V/Y) ────────────
  const INPUT_DEBOUNCE = 30;
  let lastKnob1 = 0, lastKnob2 = 0;

  // ── Persistence ───────────────────────────────────────────
  function loadSave() {
    try {
      var data = fs.readFile(SAVE_FILE);
      if (!data) throw new Error('missing');
      var parsed = JSON.parse(data);
      highScore = parsed.highScore || 0;
    } catch (e) {
      highScore = 0;
      writeSave();
    }
  }

  function writeSave() {
    try {
      fs.writeFile(SAVE_FILE, JSON.stringify({ highScore: highScore }));
    } catch (e) {}
  }

  function maybeUpdateHighScore() {
    if (score > highScore) { highScore = score; writeSave(); }
  }

  // ── Map helpers ───────────────────────────────────────────
  function cloneMap() { return BASE_MAP.map(function(r) { return r.slice(); }); }

  function tileOf(tx, ty) {
    if (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) return T_WALL;
    return map[ty][tx];
  }

  function isPassable(tx, ty) { return tileOf(tx, ty) !== T_WALL; }

  function countDots() {
    var n = 0;
    for (var r = 0; r < ROWS; r++)
      for (var c = 0; c < COLS; c++)
        if (map[r][c] === T_DOT || map[r][c] === T_PWR) n++;
    return n;
  }

  // ── Spawn ─────────────────────────────────────────────────
  function spawnPlayer() {
    px = 10; py = 9;
    pDir = { x: 1, y: 0 };
    pAnimTick = 0;
    pendingDir = { x: 1, y: 0 };
  }

  function spawnGhosts() {
    ghosts = GHOST_NAMES.map(function(name, i) {
      return {
        name: name,
        x: GHOST_SPAWN_X[i], y: GHOST_SPAWN_Y[i],
        dir: { x: i % 2 === 0 ? 1 : -1, y: 0 },
        scared: false, dead: false, respawn: 0, moveTick: 0,
      };
    });
  }

  // ── Movement ──────────────────────────────────────────────
  var PLAYER_EVERY = 1;
  var GHOST_EVERY  = 2;
  var SCARED_EVERY = 4;

  function stepPlayer() {
    if (gameTick % PLAYER_EVERY !== 0) return;
    if (isPassable(px + pendingDir.x, py + pendingDir.y)) pDir = pendingDir;
    var nx = px + pDir.x, ny = py + pDir.y;
    if (isPassable(nx, ny)) { px = nx; py = ny; }
    pAnimTick++;
    var cell = tileOf(px, py);
    if (cell === T_DOT) {
      map[py][px] = T_VOID; score += 10;
    } else if (cell === T_PWR) {
      map[py][px] = T_VOID; score += 50;
      frightenTimer = 80 + level * 5;
      ghosts.forEach(function(g) { if (!g.dead) g.scared = true; });
    }
    if (countDots() === 0) { gameState = 'levelclear'; stateTimer = 8; }
  }

  function stepGhosts() {
    ghosts.forEach(function(g, i) {
      if (g.respawn > 0) { g.respawn--; return; }
      if (g.dead) {
        g.dead = false; g.scared = false;
        g.x = GHOST_SPAWN_X[i]; g.y = GHOST_SPAWN_Y[i];
        g.dir = { x: 1, y: 0 };
      }
      var every = g.scared ? SCARED_EVERY : GHOST_EVERY;
      g.moveTick++;
      if (g.moveTick < every) return;
      g.moveTick = 0;
      var opp = { x: -g.dir.x, y: -g.dir.y };
      var options = MOVE_DIRS.filter(function(d) {
        if (d.x === opp.x && d.y === opp.y) return false;
        return isPassable(g.x + d.x, g.y + d.y);
      });
      if (options.length === 0) { g.dir = opp; return; }
      var chosen;
      if (g.scared || Math.random() < 0.3) {
        chosen = options[Math.floor(Math.random() * options.length)];
      } else {
        chosen = options.reduce(function(best, d) {
          var dist  = Math.abs(g.x + d.x - px) + Math.abs(g.y + d.y - py);
          var bdist = Math.abs(g.x + best.x - px) + Math.abs(g.y + best.y - py);
          return dist < bdist ? d : best;
        });
      }
      g.dir = chosen; g.x += chosen.x; g.y += chosen.y;
    });
  }

  function checkCollisions() {
    ghosts.forEach(function(g) {
      if (g.dead || g.respawn > 0) return;
      if (g.x !== px || g.y !== py) return;
      if (g.scared) {
        g.dead = true; g.scared = false; g.respawn = 8; score += 200;
      } else {
        lives--;
        if (lives <= 0) {
          maybeUpdateHighScore();
          gameState = 'gameover';
        } else {
          gameState = 'dead'; stateTimer = 8;
        }
      }
    });
  }

  function advanceState() {
    if (gameState === 'dead') {
      spawnPlayer(); spawnGhosts(); frightenTimer = 0; gameState = 'playing';
    } else if (gameState === 'levelclear') {
      level++; score += 500 * level;
      map = cloneMap(); spawnPlayer(); spawnGhosts(); frightenTimer = 0;
      gameState = 'playing';
    }
  }

  // ── Tick ──────────────────────────────────────────────────
  function onTick() {
    if (gameState === 'dead' || gameState === 'levelclear') {
      stateTimer--;
      if (stateTimer <= 0) advanceState();
      draw(); return;
    }
    if (gameState !== 'playing') return;
    gameTick++; pelletTick++;
    if (frightenTimer > 0) {
      frightenTimer--;
      if (frightenTimer === 0)
        ghosts.forEach(function(g) { if (!g.dead) g.scared = false; });
    }
    stepPlayer(); stepGhosts(); checkCollisions(); draw();
  }

  // ── Draw ──────────────────────────────────────────────────
  function draw() {
    h.clear(1);
    if (gameState === 'start')    { drawStart();    h.flip(); Pip.lastFlip = getTime(); return; }
    if (gameState === 'gameover') { drawGameOver(); h.flip(); Pip.lastFlip = getTime(); return; }
    drawMaze(); drawDots(); drawGhosts(); drawPlayer(); drawHUD();
    if (gameState === 'paused')     drawCentreBox('-- PAUSED --', '');
    if (gameState === 'dead')       drawCentreBox('IRRADIATED!', lives + ' LIVES LEFT');
    if (gameState === 'levelclear') drawCentreBox('SECTOR CLEAR!', '+' + (500 * level) + ' CAPS');
    h.flip(); Pip.lastFlip = getTime();
  }

  function drawMaze() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (map[r][c] !== T_WALL) continue;
        var x = OX + c * TW, y = OY + r * TH;
        h.setColor(2).fillRect(x, y, x + TW - 1, y + TH - 1);
        h.setColor(3).drawRect(x, y, x + TW - 1, y + TH - 1);
      }
    }
  }

  function drawDots() {
    var pwrVis = Math.floor(pelletTick / 5) % 2 === 0;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cx = OX + c * TW + Math.floor(TW / 2);
        var cy = OY + r * TH + Math.floor(TH / 2);
        if (map[r][c] === T_DOT) {
          h.setColor(3).fillRect(cx - 1, cy - 1, cx + 1, cy + 1);
        } else if (map[r][c] === T_PWR && pwrVis) {
          h.setColor(1).fillRect(cx - 3, cy - 3, cx + 3, cy + 3);
          h.setColor(3).fillRect(cx - 1, cy - 1, cx + 1, cy + 1);
        }
      }
    }
  }

  function drawPlayer() {
    var cx = OX + px * TW + Math.floor(TW / 2);
    var cy = OY + py * TH + Math.floor(TH / 2);
    var r  = Math.floor(Math.min(TW, TH) / 2) - 1;
    h.setColor(3).fillRect(cx - r, cy - r, cx + r, cy + r);
    if (Math.floor(pAnimTick / 2) % 2 === 0 && (pDir.x !== 0 || pDir.y !== 0)) {
      var mw = Math.floor(r / 2);
      if (pDir.x === 1)  h.setColor(0).fillRect(cx,     cy - mw, cx + r, cy + mw);
      if (pDir.x === -1) h.setColor(0).fillRect(cx - r, cy - mw, cx,     cy + mw);
      if (pDir.y === 1)  h.setColor(0).fillRect(cx - mw, cy,     cx + mw, cy + r);
      if (pDir.y === -1) h.setColor(0).fillRect(cx - mw, cy - r, cx + mw, cy);
    }
    var ex = cx + (-pDir.y) * Math.floor(r / 2) - 1;
    var ey = cy + (-pDir.x) * Math.floor(r / 2) - 1;
    h.setColor(0).fillRect(ex, ey, ex + 2, ey + 2);
  }

  function drawGhosts() {
    ghosts.forEach(function(g, i) {
      if (g.dead || g.respawn > 0) return;
      var cx = OX + g.x * TW + Math.floor(TW / 2);
      var cy = OY + g.y * TH + Math.floor(TH / 2);
      var r  = Math.floor(Math.min(TW, TH) / 2) - 1;
      var col;
      if (g.scared) {
        col = (frightenTimer < 30 && Math.floor(pelletTick / 5) % 2 === 0) ? 3 : 2;
      } else {
        col = GHOST_COLORS[i % 4];
      }
      h.setColor(col);
      h.fillRect(cx - r, cy - r, cx + r, cy + r);
      h.fillRect(cx - r + 1, cy - r - 2, cx + r - 1, cy - r);
      if (!g.scared) {
        h.setColor(3);
        h.fillRect(cx - r + 1, cy - 3, cx - 1,     cy + 1);
        h.fillRect(cx + 1,     cy - 3, cx + r - 1, cy + 1);
        var plx  = cx - r + 1 + (g.dir.x > 0 ? 2 : 0);
        var prx  = cx + 1     + (g.dir.x > 0 ? 2 : 0);
        var eyeY = cy - 3     + (g.dir.y > 0 ? 2 : 0);
        h.setColor(0);
        h.fillRect(plx, eyeY, plx + 2, eyeY + 2);
        h.fillRect(prx, eyeY, prx + 2, eyeY + 2);
      }
    });
  }

  function drawHUD() {
    h.setFont('6x8', 1).setFontAlign(-1, -1).setColor(3).drawString(score, 2, 1);
    h.setFontAlign(0, -1).setColor(2).drawString('LVL ' + level, W / 2, 1);
    var lifeStr = '';
    for (var i = 0; i < lives; i++) lifeStr += 'O ';
    h.setFontAlign(1, -1).setColor(3).drawString(lifeStr, W - 2, 1);
  }

  function drawCentreBox(line1, line2) {
    var bw = 130, bh = line2 ? 38 : 20;
    var bx = Math.floor(W / 2 - bw / 2), by = Math.floor(H / 2 - bh / 2);
    h.setColor(0).fillRect(bx, by, bx + bw, by + bh);
    h.setColor(3).drawRect(bx, by, bx + bw, by + bh);
    h.setFont('6x8', 1).setFontAlign(0, 0);
    h.setColor(2).drawString(line1, W / 2, H / 2 - (line2 ? 8 : 0));
    if (line2) h.setColor(3).drawString(line2, W / 2, H / 2 + 10);
  }

  function drawStart() {
    h.setFontMonofonto28().setFontAlign(0, 0)
     .setColor(3).drawString('PIP MAN', W / 2, H / 2 - 60);
    h.setFont('6x8', 2).setColor(2)
     .drawString('Click to START', W / 2, H / 2 - 20);
    if (highScore > 0) {
      h.setFont('6x8', 2).setColor(2).setFontAlign(0, 0)
       .drawString('HIGH SCORE', W / 2, H / 2 + 5);
      h.setFont('6x8', 4).setColor(1).setFontAlign(0, 0)
       .drawString('' + highScore, W / 2, H / 2 + 30);
    }
    h.setFont('6x8', 2).setColor(3).setFontAlign(0, 0)
     .drawString('SCROLL=UP/DN', W / 2, H / 2 + 68)
     .drawString('THUMB=L/R', W / 2, H / 2 + 88);
  }

  function drawGameOver() {
    h.setFont('6x8', 3).setFontAlign(0, 0)
     .setColor(3).drawString('GAME OVER', W / 2, H / 2 - 60);
    h.setFont('6x8', 2).setColor(2)
     .drawString('Click to RESTART', W / 2, H / 2 - 20);
    h.setFont('6x8', 1).setColor(3)
     .drawString('Score: ' + score, W / 2, H / 2 + 5)
     .drawString('Level: ' + level, W / 2, H / 2 + 20);
    h.setColor(2).drawString('High Score: ' + highScore, W / 2, H / 2 + 40);
  }

  // ── Input ─────────────────────────────────────────────────
  function onLeftWheel(dir) {
    if (!dir) return;
    var now = Date.now();
    if (now - lastKnob1 < INPUT_DEBOUNCE) return;
    lastKnob1 = now;
    // knob1 = scroll wheel: up = -1 = move UP, down = +1 = move DOWN
    if (gameState === 'playing') {
      pendingDir = dir < 0 ? { x: 0, y: -1 } : { x: 0, y: 1 };
    } else {
      // allow wheel to toggle mode on non-play screens like bloodworm
    }
  }

  function onRightWheel(dir) {
    if (!dir) return;
    var now = Date.now();
    if (now - lastKnob2 < INPUT_DEBOUNCE) return;
    lastKnob2 = now;
    // knob2 = thumb wheel: away = -1 = move LEFT, toward = +1 = move RIGHT
    if (gameState === 'playing') {
      pendingDir = dir < 0 ? { x: -1, y: 0 } : { x: 1, y: 0 };
    }
  }

  function onPress(e) {
    if (!e.state) return;  // press-down only, release is passed through to OS
    if (gameState === 'start' || gameState === 'gameover') {
      resetGame();
    } else if (gameState === 'playing') {
      gameState = 'paused'; draw();
    } else if (gameState === 'paused') {
      gameState = 'playing';
    } else if (gameState === 'dead' || gameState === 'levelclear') {
      stateTimer = 0;
    }
  }

  // ── Reset ─────────────────────────────────────────────────
  function resetGame() {
    map = cloneMap(); score = 0; lives = 3; level = 1;
    frightenTimer = 0; pelletTick = 0; gameTick = 0;
    gameState = 'playing';
    spawnPlayer(); spawnGhosts(); draw();
  }

  // ── Start / Remove ────────────────────────────────────────
  function start() {
    h.clear();
    Pip.audioStop();
    loadSave();

    gameState = 'start';
    map = cloneMap(); score = 0; lives = 3; level = 1;
    frightenTimer = 0; pelletTick = 0; gameTick = 0;
    spawnPlayer(); spawnGhosts();

    // onExclusive for wheels so input is routed to us during gameplay
    Pip.onExclusive('knob1', onLeftWheel);
    Pip.onExclusive('knob2', onRightWheel);

    // edge:'both' + !e.state guard means the OS still sees the button release
    // which is what it uses to handle navigation / exit
    pressWatch = setWatch(onPress, ENC1_PRESS, {
      repeat  : true,
      edge    : 'both',
      debounce: 20,
    });

    draw();
    tickInterval = setInterval(onTick, TICK_MS);
  }

  function remove() {
    Pip.removeListener('knob1', onLeftWheel);
    Pip.removeListener('knob2', onRightWheel);
    clearInterval(tickInterval);
    clearWatch(pressWatch);
    Pip.audioStop();
    h.clear();
  }

  start();

  return {
    id        : APP_ID,
    notDefault: true,
    fullscreen: true,
    remove    : remove,
  };
});