(function () {

  const APP_ID = "NUKESWEEPER";
  const COLS = 9;
  const ROWS = 9;
  const MINES = 10;
  const CELL = 32;
  const GRID_X = Math.floor((480 - COLS * CELL) / 2); // 96
  const GRID_Y = 16;
  const STATES = { GAME: "game", WIN: "win", LOSE: "lose" };

  let grid, revealed;
  let curX, curY;
  let gameState;
  let firstClick;
  let removed = false;
  let clickWatch;
  let redrawInterval;

  // --- Initialization ---

  function initGrid() {
    grid = [];
    revealed = [];
    for (let r = 0; r < ROWS; r++) {
      grid.push([]);
      revealed.push([]);
      for (let c = 0; c < COLS; c++) {
        grid[r].push(0);
        revealed[r].push(false);
      }
    }
    curX = 4;
    curY = 4;
    gameState = STATES.GAME;
    firstClick = true;
  }

  function placeMines(safeR, safeC) {
    let placed = 0;
    while (placed < MINES) {
      let r = Math.randInt(ROWS);
      let c = Math.randInt(COLS);
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      if (grid[r][c] === -1) continue;
      grid[r][c] = -1;
      placed++;
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === -1) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === -1) count++;
          }
        }
        grid[r][c] = count;
      }
    }
  }

  // --- Game logic ---

  function floodReveal(startR, startC) {
    let queue = [[startR, startC]];
    while (queue.length > 0) {
      let next = queue.pop();
      let r = next[0], c = next[1];
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      if (revealed[r][c]) continue;
      revealed[r][c] = true;
      if (grid[r][c] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr !== 0 || dc !== 0) {
              let nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !revealed[nr][nc]) {
                queue.push([nr, nc]);
              }
            }
          }
        }
      }
    }
  }

  function revealAllMines() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === -1) revealed[r][c] = true;
      }
    }
  }

  function checkWin() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] !== -1 && !revealed[r][c]) return false;
      }
    }
    return true;
  }

  function onClick() {
    if (gameState !== STATES.GAME) {
      initGrid();
      drawAll();
      return;
    }

    if (firstClick) {
      placeMines(curY, curX);
      firstClick = false;
    }

    if (revealed[curY][curX]) return;

    if (grid[curY][curX] === -1) {
      revealed[curY][curX] = true;
      gameState = STATES.LOSE;
      revealAllMines();
      drawAll();
      return;
    }

    floodReveal(curY, curX);
    if (checkWin()) gameState = STATES.WIN;
    drawAll();
  }

  // --- Drawing ---

  function cellX(c) { return GRID_X + c * CELL; }
  function cellY(r) { return GRID_Y + r * CELL; }

  function drawCell(r, c) {
    let x = cellX(c);
    let y = cellY(r);
    let isCursor = (r === curY && c === curX);

    if (revealed[r][c]) {
      h.setColor(2).drawRect(x, y, x + CELL - 1, y + CELL - 1);
      if (grid[r][c] > 0) {
        h.setColor(3).setFontMonofonto18().setFontAlign(0, 0)
          .drawString(grid[r][c], x + CELL / 2, y + CELL / 2);
      } else if (grid[r][c] === -1) {
        let isHit = (r === curY && c === curX && gameState === STATES.LOSE);
        h.setColor(isHit ? 1 : 2).setFontMonofonto18().setFontAlign(0, 0)
          .drawString("*", x + CELL / 2, y + CELL / 2);
      }
    } else {
      if (isCursor) {
        Pip.shadeBox(x + 1, y + 1, x + CELL - 2, y + CELL - 2);
      } else {
        h.setColor(2).fillRect(x + 1, y + 1, x + CELL - 2, y + CELL - 2);
      }
      h.setColor(1).drawRect(x, y, x + CELL - 1, y + CELL - 1);
    }
  }

  function drawGrid() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        drawCell(r, c);
      }
    }
  }

  function drawStatus() {
    h.setColor(3).setFontMonofonto16().setFontAlign(-1, 0)
      .drawString("MINES: " + MINES, 10, 305);
    h.setColor(2).setFontMonofonto16().setFontAlign(1, 0)
      .drawString("PRESS KNOB TO DIG", 470, 305);
  }

  function drawOverlay() {
    if (gameState === STATES.WIN) {
      h.setColor(3).setFontMonofonto23().setFontAlign(0, 0)
        .drawString("** YOU WIN! **", 240, 305);
    } else if (gameState === STATES.LOSE) {
      h.setColor(1).setFontMonofonto23().setFontAlign(0, 0)
        .drawString("** BOOM! **", 240, 305);
    }
  }

  function drawAll() {
    h.clear(1);
    drawGrid();
    if (gameState === STATES.GAME) {
      drawStatus();
    } else {
      drawOverlay();
    }
    h.flip();
    Pip.lastFlip = getTime();
  }

  // --- Input ---

  function onLeftWheel(d) {
    if (gameState !== STATES.GAME) return;
    curY = Math.max(0, Math.min(ROWS - 1, curY + d));
    Pip.playSound("SCROLL");
    drawAll();
  }

  function onRightWheel(d) {
    if (gameState !== STATES.GAME) return;
    curX = Math.max(0, Math.min(COLS - 1, curX + d));
    Pip.playSound("SCROLL");
    drawAll();
  }

  // --- Lifecycle ---

  function start() {
    h.clear();
    Pip.audioStop();
    initGrid();

    Pip.onExclusive("knob1", onLeftWheel);
    Pip.onExclusive("knob2", onRightWheel);

    clickWatch = setWatch(onClick, ENC1_PRESS, {
      repeat: true,
      edge: "rising",
      debounce: 50,
    });

    redrawInterval = setInterval(drawAll, 1000);
    drawAll();
  }

  function remove() {
    if (removed) return;
    removed = true;

    if (redrawInterval) clearInterval(redrawInterval);
    if (clickWatch) clearWatch(clickWatch);
    Pip.removeListener("knob1", onLeftWheel);
    Pip.removeListener("knob2", onRightWheel);

    Pip.audioStop();
    h.clear();
    h.flip();
  }

  start();

  return {
    id: APP_ID,
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };

})
