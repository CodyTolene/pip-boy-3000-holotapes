(function () {
  let clickWatch;
  let removed = false;
  let redrawInterval;
  let gameState;
  let winner;
  let board;
  let curRow, curCol;
  let selected;
  let validMoves;
  let selectedMoves;
  let mustContinue;
  let aiTimer;

  const CELL = 35;
  const GRID_X = Math.floor((480 - 8 * CELL) / 2); // 100
  const GRID_Y = 20;

  function isPlayer(v) {
    return v === 2 || v === 4;
  }
  function isAI(v) {
    return v === 1 || v === 3;
  }
  function isKing(v) {
    return v === 3 || v === 4;
  }
  function isEmpty(v) {
    return v === 0;
  }
  function isDark(r, c) {
    return (r + c) % 2 === 1;
  }

  function initBoard() {
    board = [];
    for (let r = 0; r < 8; r++) {
      board.push([0, 0, 0, 0, 0, 0, 0, 0]);
    }
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if (isDark(r, c)) board[r][c] = 1;
      }
    }
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (isDark(r, c)) board[r][c] = 2;
      }
    }
    curRow = 5;
    curCol = 1;
    selected = null;
    selectedMoves = [];
    mustContinue = null;
    gameState = 'player';
    winner = null;
    validMoves = getValidMoves(true);
  }

  function getJumps(r, c, isPlayerPiece) {
    let jumps = [];
    let piece = board[r][c];
    let dirs = [];
    if (isPlayerPiece) {
      dirs.push([-1, -1], [-1, 1]);
      if (isKing(piece)) dirs.push([1, -1], [1, 1]);
    } else {
      dirs.push([1, -1], [1, 1]);
      if (isKing(piece)) dirs.push([-1, -1], [-1, 1]);
    }
    for (let i = 0; i < dirs.length; i++) {
      let dr = dirs[i][0],
        dc = dirs[i][1];
      let mr = r + dr,
        mc = c + dc;
      let tr = r + 2 * dr,
        tc = c + 2 * dc;
      if (tr < 0 || tr > 7 || tc < 0 || tc > 7) continue;
      if (!isDark(tr, tc)) continue;
      let mid = board[mr][mc];
      let target = board[tr][tc];
      let midIsEnemy = isPlayerPiece ? isAI(mid) : isPlayer(mid);
      if (midIsEnemy && isEmpty(target)) {
        jumps.push({
          from: { row: r, col: c },
          to: { row: tr, col: tc },
          capture: { row: mr, col: mc },
        });
      }
    }
    return jumps;
  }

  function getSimpleMoves(r, c, isPlayerPiece) {
    let moves = [];
    let piece = board[r][c];
    let dirs = [];
    if (isPlayerPiece) {
      dirs.push([-1, -1], [-1, 1]);
      if (isKing(piece)) dirs.push([1, -1], [1, 1]);
    } else {
      dirs.push([1, -1], [1, 1]);
      if (isKing(piece)) dirs.push([-1, -1], [-1, 1]);
    }
    for (let i = 0; i < dirs.length; i++) {
      let dr = dirs[i][0],
        dc = dirs[i][1];
      let tr = r + dr,
        tc = c + dc;
      if (tr < 0 || tr > 7 || tc < 0 || tc > 7) continue;
      if (!isDark(tr, tc)) continue;
      if (isEmpty(board[tr][tc])) {
        moves.push({
          from: { row: r, col: c },
          to: { row: tr, col: tc },
          capture: null,
        });
      }
    }
    return moves;
  }

  function getValidMoves(isPlayerTurn) {
    let allJumps = [],
      allMoves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        let piece = board[r][c];
        if (isPlayerTurn && !isPlayer(piece)) continue;
        if (!isPlayerTurn && !isAI(piece)) continue;
        allJumps = allJumps.concat(getJumps(r, c, isPlayerTurn));
        allMoves = allMoves.concat(getSimpleMoves(r, c, isPlayerTurn));
      }
    }
    return allJumps.length > 0 ? allJumps : allMoves;
  }

  function getMovesForPiece(r, c, isPlayerTurn) {
    let hasJumps = false;
    for (let i = 0; i < validMoves.length; i++) {
      if (validMoves[i].capture) {
        hasJumps = true;
        break;
      }
    }
    return hasJumps
      ? getJumps(r, c, isPlayerTurn)
      : getSimpleMoves(r, c, isPlayerTurn);
  }

  function executeMove(move) {
    let piece = board[move.from.row][move.from.col];
    board[move.from.row][move.from.col] = 0;
    board[move.to.row][move.to.col] = piece;
    if (move.capture) board[move.capture.row][move.capture.col] = 0;
    if (piece === 2 && move.to.row === 0) board[move.to.row][move.to.col] = 4;
    if (piece === 1 && move.to.row === 7) board[move.to.row][move.to.col] = 3;
  }

  function checkWin() {
    let pp = 0,
      ap = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (isPlayer(board[r][c])) pp++;
        if (isAI(board[r][c])) ap++;
      }
    }
    if (ap === 0) return 'player';
    if (pp === 0) return 'ai';
    if (getValidMoves(true).length === 0) return 'ai';
    if (getValidMoves(false).length === 0) return 'player';
    return null;
  }

  function endAITurn() {
    let w = checkWin();
    if (w) {
      winner = w;
      gameState = 'over';
    } else {
      gameState = 'player';
      validMoves = getValidMoves(true);
      selected = null;
      selectedMoves = [];
      mustContinue = null;
    }
    draw();
  }

  function aiMove() {
    let moves = getValidMoves(false);
    if (moves.length === 0) {
      winner = 'player';
      gameState = 'over';
      draw();
      return;
    }
    let jumps = moves.filter(function (m) {
      return m.capture !== null;
    });
    let candidates = jumps.length > 0 ? jumps : moves;
    let kingMoves = candidates.filter(function (m) {
      return m.to.row === 7;
    });
    if (kingMoves.length > 0) candidates = kingMoves;
    let move = candidates[Math.randInt(candidates.length)];
    executeMove(move);
    if (move.capture) {
      let more = getJumps(move.to.row, move.to.col, false);
      if (more.length > 0) {
        draw();
        aiTimer = setTimeout(function () {
          let next = more[Math.randInt(more.length)];
          executeMove(next);
          endAITurn();
        }, 400);
        return;
      }
    }
    endAITurn();
  }

  function moveCursor(dr, dc) {
    let r = curRow + dr;
    let c = curCol + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      curRow = r;
      curCol = c;
    }
  }

  function onPress() {
    if (gameState === 'over') {
      initBoard();
      draw();
      return;
    }
    if (gameState !== 'player') return;
    let r = curRow,
      c = curCol;
    if (mustContinue && (r !== mustContinue.row || c !== mustContinue.col))
      return;

    if (selected) {
      let dest = null;
      for (let i = 0; i < selectedMoves.length; i++) {
        let m = selectedMoves[i];
        if (m.to.row === r && m.to.col === c) {
          dest = m;
          break;
        }
      }
      if (dest) {
        executeMove(dest);
        if (dest.capture) {
          let more = getJumps(dest.to.row, dest.to.col, true);
          if (more.length > 0) {
            mustContinue = { row: dest.to.row, col: dest.to.col };
            selected = mustContinue;
            selectedMoves = more;
            curRow = dest.to.row;
            curCol = dest.to.col;
            draw();
            return;
          }
        }
        let w = checkWin();
        if (w) {
          winner = w;
          gameState = 'over';
          draw();
          return;
        }
        selected = null;
        selectedMoves = [];
        mustContinue = null;
        gameState = 'ai';
        draw();
        aiTimer = setTimeout(aiMove, 500);
        return;
      }
      if (r === selected.row && c === selected.col) {
        selected = null;
        selectedMoves = [];
        draw();
        return;
      }
    }

    if (isPlayer(board[r][c])) {
      let moves = getMovesForPiece(r, c, true);
      if (moves.length > 0) {
        selected = { row: r, col: c };
        selectedMoves = moves;
      }
    }
    draw();
  }

  function cellSX(c) {
    return GRID_X + c * CELL;
  }
  function cellSY(r) {
    return GRID_Y + r * CELL;
  }

  function isValidDest(r, c) {
    for (let i = 0; i < selectedMoves.length; i++) {
      if (selectedMoves[i].to.row === r && selectedMoves[i].to.col === c)
        return true;
    }
    return false;
  }

  function draw() {
    h.clear(1);

    // HUD
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(-1, 0)
      .drawString('CHECKERS', 10, 12);
    if (gameState === 'ai') {
      h.setColor(2)
        .setFontMonofonto16()
        .setFontAlign(1, 0)
        .drawString('AI...', 470, 12);
    } else if (gameState === 'over') {
      h.setColor(winner === 'player' ? 3 : 1)
        .setFontMonofonto16()
        .setFontAlign(1, 0)
        .drawString(winner === 'player' ? 'YOU WIN!' : 'AI WINS!', 470, 12);
    } else {
      h.setColor(2)
        .setFontMonofonto16()
        .setFontAlign(1, 0)
        .drawString('YOUR TURN', 470, 12);
    }

    // Board
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        let sx = cellSX(c);
        let sy = cellSY(r);
        let dark = isDark(r, c);
        let isCursor = r === curRow && c === curCol;
        let isSelected = selected && r === selected.row && c === selected.col;
        let isDest = isValidDest(r, c);

        if (dark) {
          if (isSelected) {
            Pip.shadeBox(sx, sy, sx + CELL, sy + CELL);
          } else if (isDest) {
            h.setColor(2).fillRect(sx, sy, sx + CELL, sy + CELL);
          } else {
            h.setColor(1).fillRect(sx, sy, sx + CELL, sy + CELL);
          }
        }

        if (isCursor) {
          h.setColor(3)
            .drawRect(sx + 1, sy + 1, sx + CELL - 1, sy + CELL - 1)
            .drawRect(sx + 2, sy + 2, sx + CELL - 2, sy + CELL - 2);
        }

        h.setColor(1).drawRect(sx, sy, sx + CELL, sy + CELL);

        let piece = board[r][c];
        if (piece > 0) {
          let pr = 12;
          let pcx = sx + CELL / 2;
          let pcy = sy + CELL / 2;
          if (isPlayer(piece)) {
            h.setColor(3).fillCircle(pcx, pcy, pr);
            h.setColor(1).drawCircle(pcx, pcy, pr);
            if (isKing(piece)) {
              h.setColor(1)
                .setFontMonofonto16()
                .setFontAlign(0, 0)
                .drawString('K', pcx, pcy);
            }
          } else {
            h.setColor(1).fillCircle(pcx, pcy, pr);
            h.setColor(2).drawCircle(pcx, pcy, pr);
            if (isKing(piece)) {
              h.setColor(2)
                .setFontMonofonto16()
                .setFontAlign(0, 0)
                .drawString('K', pcx, pcy);
            }
          }
        }
      }
    }

    // Bottom bar
    h.setColor(2)
      .setFontMonofonto16()
      .setFontAlign(0, 0)
      .drawString(
        gameState === 'over'
          ? 'PRESS TO PLAY AGAIN'
          : 'SELECT + CONFIRM TO MOVE',
        240,
        308,
      );

    h.flip();
    Pip.lastFlip = getTime();
  }

  function onKnob1(d) {
    if (gameState !== 'player') return;
    moveCursor(d, 0);
    draw();
  }
  function onKnob2(d) {
    if (gameState !== 'player') return;
    moveCursor(0, d);
    draw();
  }

  Pip.audioStop();
  Pip.blitOptions.idleFilter = [];
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);

  clickWatch = setWatch(onPress, ENC1_PRESS, {
    repeat: true,
    edge: 'rising',
    debounce: 50,
  });

  initBoard();
  redrawInterval = setInterval(draw, 1000);
  draw();

  return {
    id: 'CHECKERS',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      if (removed) return;
      removed = true;
      if (redrawInterval) clearInterval(redrawInterval);
      if (aiTimer) clearTimeout(aiTimer);
      Pip.blitOptions.idleFilter = [307];
      if (clickWatch) clearWatch(clickWatch);
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      h.clear();
      h.flip();
    },
  };
});
