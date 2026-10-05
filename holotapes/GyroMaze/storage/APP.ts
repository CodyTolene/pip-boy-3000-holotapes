(function (): HolotapeApp {
  // Maze dimensions in cells. The play area is 480x288 (below the 38px header).
  // With 16px cells and 10px padding we get a 28x18 grid.
  const COLS = 28;
  const ROWS = 18;
  const CELL = 16;
  const LEFT = 17;
  const TOP = 16;
  const BALL_R = 4;
  const WALL_W = 2;

  // Accelerometer sensitivity and physics.
  const ACCEL_SCALE = 0.8;
  const DRAG = 0.92;
  const MAX_SPEED = 8;

  // Walls are stored as bits: 1=N, 2=E, 4=S, 8=W.
  const N = 1;
  const E = 2;
  const S = 4;
  const W = 8;

  // Maze grid: each cell stores its walls as a bitmask.
  const maze = new Uint8Array(COLS * ROWS);

  // Ball state.
  let bx = 0;
  let by = 0;
  let vx = 0;
  let vy = 0;

  // Exit cell position.
  let exitCol = 0;
  let exitRow = 0;

  // Game state: 0 = title, 1 = playing, 2 = won, 3 = loading.
  let phase = 0;
  let tick!: number;
  let loadTimeout!: number;

  // Generates a maze using recursive backtracker. Every cell starts with all
  // four walls, then we carve passages by removing walls between cells.
  function generateMaze(): void {
    let i = 0;
    let cx = 0;
    let cy = 0;
    let nx = 0;
    let ny = 0;
    let dir = 0;
    let stackPtr = 0;
    let dirs!: Uint8Array;
    let temp = 0;

    // Initialize all cells with all four walls.
    for (i = 0; i < COLS * ROWS; i++) maze[i] = N | E | S | W;

    // Stack for backtracking. Stores col,row pairs.
    const stack = new Int16Array(COLS * ROWS * 2);

    // Start from center.
    cx = (COLS / 2) | 0;
    cy = (ROWS / 2) | 0;
    const visited = new Uint8Array(COLS * ROWS);
    visited[cy * COLS + cx] = 1;
    stack[0] = cx;
    stack[1] = cy;
    stackPtr = 2;

    // Direction offsets: N, E, S, W.
    const dx = new Int8Array([0, 1, 0, -1]);
    const dy = new Int8Array([-1, 0, 1, 0]);
    const opposite = new Uint8Array([S, W, N, E]);
    const wallBit = new Uint8Array([N, E, S, W]);

    while (stackPtr > 0) {
      cx = stack[stackPtr - 2];
      cy = stack[stackPtr - 1];

      // Find unvisited neighbors.
      dirs = new Uint8Array(4);
      let count = 0;
      for (dir = 0; dir < 4; dir++) {
        nx = cx + dx[dir];
        ny = cy + dy[dir];
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
          if (!visited[ny * COLS + nx]) {
            dirs[count] = dir;
            count++;
          }
        }
      }

      if (count > 0) {
        // Shuffle directions for randomness.
        for (i = count - 1; i > 0; i--) {
          temp = Math.randInt(i + 1);
          dir = dirs[i];
          dirs[i] = dirs[temp];
          dirs[temp] = dir;
        }

        // Pick a random unvisited neighbor.
        dir = dirs[0];
        nx = cx + dx[dir];
        ny = cy + dy[dir];

        // Remove walls between current and next cell.
        maze[cy * COLS + cx] &= ~wallBit[dir];
        maze[ny * COLS + nx] &= ~opposite[dir];

        // Mark visited and push to stack.
        visited[ny * COLS + nx] = 1;
        stack[stackPtr] = nx;
        stack[stackPtr + 1] = ny;
        stackPtr += 2;
      } else {
        // Backtrack.
        stackPtr -= 2;
      }
    }

    // Create exit on a random edge. Pick a random edge cell.
    const edge = Math.randInt(4);
    if (edge === 0) {
      exitCol = Math.randInt(COLS);
      exitRow = 0;
      maze[exitRow * COLS + exitCol] &= ~N;
    } else if (edge === 1) {
      exitCol = COLS - 1;
      exitRow = Math.randInt(ROWS);
      maze[exitRow * COLS + exitCol] &= ~E;
    } else if (edge === 2) {
      exitCol = Math.randInt(COLS);
      exitRow = ROWS - 1;
      maze[exitRow * COLS + exitCol] &= ~S;
    } else {
      exitCol = 0;
      exitRow = Math.randInt(ROWS);
      maze[exitRow * COLS + exitCol] &= ~W;
    }
  }

  function drawMaze(): void {
    let col = 0;
    let row = 0;
    let x = 0;
    let y = 0;
    let walls = 0;

    h.setColor(3);

    for (row = 0; row < ROWS; row++) {
      for (col = 0; col < COLS; col++) {
        walls = maze[row * COLS + col];
        x = LEFT + col * CELL;
        y = TOP + row * CELL;

        if (walls & N) h.fillRect(x, y, x + CELL - 1, y + WALL_W - 1);
        if (walls & S)
          h.fillRect(x, y + CELL - WALL_W, x + CELL - 1, y + CELL - 1);
        if (walls & W) h.fillRect(x, y, x + WALL_W - 1, y + CELL - 1);
        if (walls & E)
          h.fillRect(x + CELL - WALL_W, y, x + CELL - 1, y + CELL - 1);
      }
    }

    // Draw exit marker.
    x = (LEFT + exitCol * CELL + CELL / 2) | 0;
    y = (TOP + exitRow * CELL + CELL / 2) | 0;
    h.setColor(2).fillCircle(x, y, BALL_R + 2);
  }

  function drawBall(): void {
    h.setColor(3).fillCircle(bx | 0, by | 0, BALL_R);
  }

  // Check if ball collides with a wall segment.
  function wallCollision(): void {
    let col = 0;
    let row = 0;
    let cellX = 0;
    let cellY = 0;
    let walls = 0;
    let leftEdge = 0;
    let rightEdge = 0;
    let topEdge = 0;
    let botEdge = 0;

    // Find which cell the ball center is in.
    col = ((bx - LEFT) / CELL) | 0;
    row = ((by - TOP) / CELL) | 0;

    if (col < 0) col = 0;
    if (col >= COLS) col = COLS - 1;
    if (row < 0) row = 0;
    if (row >= ROWS) row = ROWS - 1;

    walls = maze[row * COLS + col];
    cellX = LEFT + col * CELL;
    cellY = TOP + row * CELL;

    leftEdge = cellX + WALL_W;
    rightEdge = cellX + CELL - WALL_W;
    topEdge = cellY + WALL_W;
    botEdge = cellY + CELL - WALL_W;

    // Check collision with each wall.
    if (walls & N && by - BALL_R < topEdge) {
      by = topEdge + BALL_R;
      vy = 0;
    }
    if (walls & S && by + BALL_R > botEdge) {
      by = botEdge - BALL_R;
      vy = 0;
    }
    if (walls & W && bx - BALL_R < leftEdge) {
      bx = leftEdge + BALL_R;
      vx = 0;
    }
    if (walls & E && bx + BALL_R > rightEdge) {
      bx = rightEdge - BALL_R;
      vx = 0;
    }

    // Also check walls of adjacent cells we might be overlapping.
    // Check cell to the north.
    if (row > 0 && by - BALL_R < cellY) {
      const nWalls = maze[(row - 1) * COLS + col];
      if (nWalls & S && by - BALL_R < cellY) {
        by = cellY + BALL_R;
        vy = 0;
      }
    }
    // Check cell to the south.
    if (row < ROWS - 1 && by + BALL_R > cellY + CELL) {
      const sWalls = maze[(row + 1) * COLS + col];
      if (sWalls & N && by + BALL_R > cellY + CELL) {
        by = cellY + CELL - BALL_R;
        vy = 0;
      }
    }
    // Check cell to the west.
    if (col > 0 && bx - BALL_R < cellX) {
      const wWalls = maze[row * COLS + (col - 1)];
      if (wWalls & E && bx - BALL_R < cellX) {
        bx = cellX + BALL_R;
        vx = 0;
      }
    }
    // Check cell to the east.
    if (col < COLS - 1 && bx + BALL_R > cellX + CELL) {
      const eWalls = maze[row * COLS + (col + 1)];
      if (eWalls & W && bx + BALL_R > cellX + CELL) {
        bx = cellX + CELL - BALL_R;
        vx = 0;
      }
    }
  }

  function checkExit(): boolean {
    // Check if ball has left the maze bounds (reached the exit).
    if (bx < LEFT + BALL_R || bx > LEFT + COLS * CELL - BALL_R) return true;
    if (by < TOP + BALL_R || by > TOP + ROWS * CELL - BALL_R) return true;
    return false;
  }

  function drawTitle(): void {
    h.setBgColor(0)
      .clear()
      .setColor(3)
      .setFontAlign(0, 0)
      .setFontMonofonto28()
      .drawString('GYRO MAZE', 240, 120)
      .setFontMonofonto16()
      .drawString('Tilt the Pip-Boy to roll the ball', 240, 170)
      .drawString('Find the exit to win', 240, 195)
      .setColor(2)
      .drawString('Press to start', 240, 250);
  }

  function drawWin(): void {
    h.setColor(3)
      .clearRect(140, 130, 340, 190)
      .drawRect(140, 130, 340, 190)
      .drawRect(142, 132, 338, 188)
      .setFontAlign(0, 0)
      .setFontMonofonto28()
      .drawString('You win!', 240, 160);
  }

  function drawLoading(): void {
    h.setBgColor(0)
      .clear()
      .setColor(3)
      .setFontAlign(0, 0)
      .setFontMonofonto28()
      .drawString('Loading...', 240, 160);
  }

  function startGame(): void {
    phase = 3;
    drawLoading();
    loadTimeout = setTimeout(function (): void {
      generateMaze();

      // Place ball at center of the center cell.
      const centerCol = (COLS / 2) | 0;
      const centerRow = (ROWS / 2) | 0;
      bx = LEFT + centerCol * CELL + CELL / 2;
      by = TOP + centerRow * CELL + CELL / 2;
      vx = 0;
      vy = 0;

      phase = 1;
      h.setBgColor(0).clear();
      drawMaze();
      drawBall();
    }, 10);
  }

  function onFrame(): void {
    if (phase !== 1) return;

    let ax = 0;
    let ay = 0;
    let speed = 0;

    // Read accelerometer if available.
    if (Pip.accel) {
      const sample = Pip.accel.read();
      if (sample && sample.length >= 2) {
        // Invert vertical axis so tilting feels natural on the device.
        ax = -sample[0] * ACCEL_SCALE;
        ay = sample[1] * ACCEL_SCALE;
      }
    }

    // Apply acceleration.
    vx += ax;
    vy += ay;

    // Apply drag.
    vx *= DRAG;
    vy *= DRAG;

    // Clamp speed.
    speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > MAX_SPEED) {
      vx = (vx / speed) * MAX_SPEED;
      vy = (vy / speed) * MAX_SPEED;
    }

    // Store old position for redraw.
    const oldX = bx | 0;
    const oldY = by | 0;

    // Update position.
    bx += vx;
    by += vy;

    // Check wall collisions.
    wallCollision();

    // Check if reached exit.
    if (checkExit()) {
      phase = 2;
      Pip.playSound('SELECT');
      drawWin();
      return;
    }

    // Redraw only if ball moved.
    const newX = bx | 0;
    const newY = by | 0;
    if (oldX !== newX || oldY !== newY) {
      // Erase old ball position by redrawing that area of the maze.
      h.setColor(0).fillCircle(oldX, oldY, BALL_R + 1);

      // Redraw walls near old position.
      const col1 = ((oldX - LEFT - BALL_R - 2) / CELL) | 0;
      const col2 = ((oldX - LEFT + BALL_R + 2) / CELL) | 0;
      const row1 = ((oldY - TOP - BALL_R - 2) / CELL) | 0;
      const row2 = ((oldY - TOP + BALL_R + 2) / CELL) | 0;

      let col = 0;
      let row = 0;
      let x = 0;
      let y = 0;
      let walls = 0;

      h.setColor(3);
      for (row = row1; row <= row2; row++) {
        if (row < 0 || row >= ROWS) continue;
        for (col = col1; col <= col2; col++) {
          if (col < 0 || col >= COLS) continue;
          walls = maze[row * COLS + col];
          x = LEFT + col * CELL;
          y = TOP + row * CELL;

          if (walls & N) h.fillRect(x, y, x + CELL - 1, y + WALL_W - 1);
          if (walls & S)
            h.fillRect(x, y + CELL - WALL_W, x + CELL - 1, y + CELL - 1);
          if (walls & W) h.fillRect(x, y, x + WALL_W - 1, y + CELL - 1);
          if (walls & E)
            h.fillRect(x + CELL - WALL_W, y, x + CELL - 1, y + CELL - 1);
        }
      }

      // Draw ball at new position.
      drawBall();
    }
  }

  function onKnob1(dir: number): void {
    if (dir) return;

    if (phase === 0 || phase === 1 || phase === 2) {
      Pip.playSound('SELECT');
      startGame();
    }
  }

  // Init.
  drawTitle();
  Pip.onExclusive('knob1', onKnob1);
  tick = setInterval(onFrame, 50);

  return {
    id: 'GYROMAZE',
    notDefault: true,
    fullscreen: true,
    remove: function (): void {
      clearInterval(tick);
      clearTimeout(loadTimeout);
      Pip.removeListener('knob1', onKnob1);
      Pip.audioStop();
      h.clear();
    },
  };
});
