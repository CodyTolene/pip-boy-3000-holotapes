// =============================================================================
//  Name: Fanorona
//  Author: Theeohn Megistus
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/Theeohn/Fanorona
// =============================================================================

(function () {
  // ── State ────────────────────────────────────────────────────────────────
  let clickWatch, aiTimer;
  let gameState; // 'title' | 'p1' | 'p2' | 'ai' | 'over'
  let winner; // 'p1' | 'p2' | 'ai' | 'draw'
  let gameMode = 'cpu'; // 'cpu' | '2p'
  let titleMenuIdx = 0;

  let board;

  let curRow, curCol, prevCurRow, prevCurCol;

  let selected;

  let selectedMoves;

  let chainPiece;
  let chainVisited;
  let chainLastDir;

  let pendingMove; // array of 2 moves (approach+withdraw) awaiting player capture choice
  let pendingIdx; // 0 or 1 — which candidate is currently highlighted

  // ── Strong/weak intersection ──────────────────────────────────────────────
  function isStrong(r, c) {
    return (r + c) % 2 === 0;
  }

  // ── Valid directions from a cell ─────────────────────────────────────────
  function dirsFrom(r, c) {
    let d = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]; // orthogonal always
    if (isStrong(r, c)) {
      d.push([-1, -1]);
      d.push([-1, 1]);
      d.push([1, -1]);
      d.push([1, 1]);
    }
    return d;
  }

  // ── Board initialisation ─────────────────────────────────────────────────
  // Start position: row0-1 = black(-1), row3-4 = white(1),
  // row2 (middle) = alternating starting from col0 with black, center empty.
  // Middle row pattern (cols 0-8): B W B W _ W B W B
  function initBoard(mode) {
    gameMode = mode || 'cpu';
    board = [
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [1, -1, 1, -1, 0, 1, -1, 1, -1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];
    curRow = 4;
    curCol = 4;
    prevCurRow = 4;
    prevCurCol = 4;
    selected = null;
    selectedMoves = [];
    chainPiece = null;
    chainVisited = {};
    chainLastDir = null;
    pendingMove = null;
    pendingIdx = 0;
    gameState = 'p1';
    winner = null;
  }

  // ── Capture helpers ───────────────────────────────────────────────────────
  function lineCaptures(r, c, dr, dc, isPlayerTurn) {
    let caps = [];
    let tr = r + dr,
      tc = c + dc;
    while (tr >= 0 && tr < 5 && tc >= 0 && tc < 9) {
      let v = board[tr][tc];
      if (v === 0) break;
      if (isPlayerTurn ? v > 0 : v < 0) break; // own piece
      caps.push({ row: tr, col: tc });
      tr += dr;
      tc += dc;
    }
    return caps;
  }

  // ── Move generation ───────────────────────────────────────────────────────
  function movesForPiece(r, c, isPlayerTurn, mustCapture) {
    let moves = [];
    let dirs = dirsFrom(r, c);
    for (let i = 0; i < dirs.length; i++) {
      let dr = dirs[i][0],
        dc = dirs[i][1];
      let tr = r + dr,
        tc = c + dc;
      if (tr < 0 || tr >= 5 || tc < 0 || tc >= 9) continue;
      if (board[tr][tc] !== 0) continue;

      let approachCaps = lineCaptures(tr, tc, dr, dc, isPlayerTurn);
      let withdrawCaps = lineCaptures(r, c, -dr, -dc, isPlayerTurn);

      if (approachCaps.length > 0 && withdrawCaps.length > 0) {
        moves.push({
          fr: r,
          fc: c,
          tr: tr,
          tc: tc,
          dr: dr,
          dc: dc,
          caps: approachCaps,
          isCapture: true,
          captureType: 'approach',
        });
        moves.push({
          fr: r,
          fc: c,
          tr: tr,
          tc: tc,
          dr: dr,
          dc: dc,
          caps: withdrawCaps,
          isCapture: true,
          captureType: 'withdraw',
        });
      } else if (approachCaps.length > 0) {
        moves.push({
          fr: r,
          fc: c,
          tr: tr,
          tc: tc,
          dr: dr,
          dc: dc,
          caps: approachCaps,
          isCapture: true,
          captureType: 'approach',
        });
      } else if (withdrawCaps.length > 0) {
        moves.push({
          fr: r,
          fc: c,
          tr: tr,
          tc: tc,
          dr: dr,
          dc: dc,
          caps: withdrawCaps,
          isCapture: true,
          captureType: 'withdraw',
        });
      } else if (!mustCapture) {
        moves.push({
          fr: r,
          fc: c,
          tr: tr,
          tc: tc,
          dr: dr,
          dc: dc,
          caps: [],
          isCapture: false,
          captureType: 'none',
        });
      }
    }
    return moves;
  }

  function anyCapturePossible(isPlayerTurn) {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 9; c++) {
        let v = board[r][c];
        if (isPlayerTurn ? v !== 1 : v !== -1) continue;
        let dirs = dirsFrom(r, c);
        for (let i = 0; i < dirs.length; i++) {
          let dr = dirs[i][0],
            dc = dirs[i][1];
          let tr = r + dr,
            tc = c + dc;
          if (tr < 0 || tr >= 5 || tc < 0 || tc >= 9) continue;
          if (board[tr][tc] !== 0) continue;
          if (lineCaptures(tr, tc, dr, dc, isPlayerTurn).length > 0)
            return true;
          if (lineCaptures(r, c, -dr, -dc, isPlayerTurn).length > 0)
            return true;
        }
      }
    }
    return false;
  }

  function getAllMoves(isPlayerTurn) {
    let must = anyCapturePossible(isPlayerTurn);
    let all = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 9; c++) {
        let v = board[r][c];
        if (isPlayerTurn ? v !== 1 : v !== -1) continue;
        let ms = movesForPiece(r, c, isPlayerTurn, must);
        for (let i = 0; i < ms.length; i++) all.push(ms[i]);
      }
    }
    return all;
  }

  function chainMoves(r, c, isPlayerTurn, visited, lastDir) {
    let moves = [];
    let dirs = dirsFrom(r, c);
    for (let i = 0; i < dirs.length; i++) {
      let dr = dirs[i][0],
        dc = dirs[i][1];
      if (lastDir && dr === lastDir.dr && dc === lastDir.dc) continue;
      let tr = r + dr,
        tc = c + dc;
      if (tr < 0 || tr >= 5 || tc < 0 || tc >= 9) continue;
      if (board[tr][tc] !== 0) continue;
      if (visited[tr * 9 + tc]) continue; // cannot revisit
      let approachCaps = lineCaptures(tr, tc, dr, dc, isPlayerTurn);
      let withdrawCaps = lineCaptures(r, c, -dr, -dc, isPlayerTurn);
      if (approachCaps.length > 0) {
        moves.push({
          fr: r,
          fc: c,
          tr: tr,
          tc: tc,
          dr: dr,
          dc: dc,
          caps: approachCaps,
          isCapture: true,
          captureType: 'approach',
        });
      }
      if (withdrawCaps.length > 0) {
        moves.push({
          fr: r,
          fc: c,
          tr: tr,
          tc: tc,
          dr: dr,
          dc: dc,
          caps: withdrawCaps,
          isCapture: true,
          captureType: 'withdraw',
        });
      }
    }
    return moves;
  }

  function removeCaptures(caps) {
    for (let i = 0; i < caps.length; i++) board[caps[i].row][caps[i].col] = 0;
  }

  function countPieces(isPlayerTurn) {
    let n = 0;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 9; c++) {
        let v = board[r][c];
        if (isPlayerTurn ? v === 1 : v === -1) n++;
      }
    }
    return n;
  }

  // ── Win check ─────────────────────────────────────────────────────────────
  function checkOver() {
    let wp = countPieces(true),
      bp = countPieces(false);
    if (bp === 0) return 'p1';
    if (wp === 0) return gameMode === '2p' ? 'p2' : 'ai';
    let wm = getAllMoves(true),
      bm = getAllMoves(false);
    if (wm.length === 0 && bm.length === 0) return 'draw';
    if (wm.length === 0) return gameMode === '2p' ? 'p2' : 'ai';
    if (bm.length === 0) return 'p1';
    return null;
  }

  // ── Board scoring for AI ──────────────────────────────────────────────────
  function bestAiMove() {
    let moves = getAllMoves(false);
    if (moves.length === 0) return null;
    let best = null,
      bestVal = -999;
    for (let i = 0; i < moves.length; i++) {
      let m = moves[i];
      let val = m.caps.length;
      if (val > bestVal) {
        bestVal = val;
        best = m;
      }
    }
    return best;
  }

  function applyMoveToBoard(m) {
    let piece = board[m.fr][m.fc];
    board[m.fr][m.fc] = 0;
    board[m.tr][m.tc] = piece;
    removeCaptures(m.caps);
  }

  function drawTitle() {
    h.clear(0);
    h.setColor(3)
      .setFontMonofonto36()
      .setFontAlign(0, 0)
      .drawString('FANORONA', 240, 110);

    let y1 = 190,
      y2 = 230;

    if (titleMenuIdx === 0) Pip.shadeBox(160, y1 - 15, 320, y1 + 15);
    h.setColor(titleMenuIdx === 0 ? 3 : 1)
      .setFontMonofonto18()
      .setFontAlign(0, 0)
      .drawString('VS CPU', 240, y1);

    if (titleMenuIdx === 1) Pip.shadeBox(160, y2 - 15, 320, y2 + 15);
    h.setColor(titleMenuIdx === 1 ? 3 : 1)
      .setFontMonofonto18()
      .setFontAlign(0, 0)
      .drawString('2P MODE', 240, y2);

    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawBoardLines() {
    h.setColor(3);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 9; c++) {
        let x = 56 + c * 46,
          y = 52 + r * 52;
        if (c < 8) h.drawLine(x + 11, y, x + 35, y);
        if (r < 4) h.drawLine(x, y + 11, x, y + 41);
        if (isStrong(r, c)) {
          if (r < 4 && c < 8) h.drawLine(x + 8, y + 8, x + 38, y + 44);
          if (r < 4 && c > 0) h.drawLine(x - 8, y + 8, x - 38, y + 44);
        }
      }
    }
  }

  function draw() {
    h.clear(0);

    h.setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, 0)
      .drawString('FANORONA', 240, 21);

    if (gameState === 'over') {
      if (winner === 'p1') {
        h.setColor(3)
          .setFontMonofonto18()
          .setFontAlign(0, 0)
          .drawString(gameMode === '2p' ? 'P1 Wins!' : 'You Win!', 240, 290);
        h.setColor(2)
          .setFontMonofonto14()
          .setFontAlign(0, 0)
          .drawString('Press left wheel to play again!', 240, 308);
      } else if (winner === 'ai' || winner === 'p2') {
        h.setColor(1)
          .setFontMonofonto18()
          .setFontAlign(0, 0)
          .drawString(gameMode === '2p' ? 'P2 Wins!' : 'CPU Wins!', 240, 290);
        h.setColor(2)
          .setFontMonofonto14()
          .setFontAlign(0, 0)
          .drawString('Press left wheel to play again!', 240, 308);
      } else {
        h.setColor(2)
          .setFontMonofonto18()
          .setFontAlign(0, 0)
          .drawString('Draw!', 240, 290);
        h.setColor(2)
          .setFontMonofonto14()
          .setFontAlign(0, 0)
          .drawString('Press left wheel to play again!', 240, 308);
      }
    } else if (gameState === 'ai') {
      h.setColor(2)
        .setFontMonofonto18()
        .setFontAlign(0, 0)
        .drawString("CPU's Turn", 240, 296);
    } else if (chainPiece) {
      h.setColor(3)
        .setFontMonofonto18()
        .setFontAlign(0, 0)
        .drawString('Chain! Must capture', 240, 290);
      h.setColor(2)
        .setFontMonofonto14()
        .setFontAlign(0, 0)
        .drawString('Move cursor to a target', 240, 308);
    } else if (pendingMove) {
      h.setColor(3)
        .setFontMonofonto18()
        .setFontAlign(0, 0)
        .drawString('Choose capture line', 240, 290);
      h.setColor(2)
        .setFontMonofonto14()
        .setFontAlign(0, 0)
        .drawString('Scroll to switch, press to confirm', 240, 308);
    } else {
      let turnStr = 'Your Turn';
      if (gameMode === '2p')
        turnStr = gameState === 'p1' ? "P1's Turn" : "P2's Turn";

      h.setColor(3)
        .setFontMonofonto18()
        .setFontAlign(0, 0)
        .drawString(turnStr, 240, 296);
    }

    drawBoardLines();

    let destSet = {};
    if (selectedMoves.length > 0) {
      for (let i = 0; i < selectedMoves.length; i++) {
        destSet[selectedMoves[i].tr * 9 + selectedMoves[i].tc] = true;
      }
    }

    let pendingCapSet = {};
    if (pendingMove) {
      let pm = pendingMove[pendingIdx];
      for (let i = 0; i < pm.caps.length; i++) {
        pendingCapSet[pm.caps[i].row * 9 + pm.caps[i].col] = true;
      }
    }

    // ── Pieces & cursor ───────────────────────────────────────────────────
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 9; c++) {
        let x = 56 + c * 46,
          y = 52 + r * 52;
        let isCursor = r === curRow && c === curCol;
        let isSel = selected && r === selected.row && c === selected.col;
        let isChain =
          chainPiece && r === chainPiece.row && c === chainPiece.col;
        let isDest = destSet[r * 9 + c];
        let isPendingCap = pendingCapSet[r * 9 + c];
        let isPendingDest =
          pendingMove &&
          r === pendingMove[pendingIdx].tr &&
          c === pendingMove[pendingIdx].tc;

        if (isDest) {
          h.setColor(2)
            .drawCircle(x, y, 10)
            .drawLine(x - 4, y - 4, x + 4, y + 4)
            .drawLine(x - 3, y - 4, x + 5, y + 4)
            .drawLine(x - 4, y + 4, x + 4, y - 4)
            .drawLine(x - 3, y + 4, x + 5, y - 4);
        }
        if (isPendingDest) {
          h.setColor(3).drawCircle(x, y, 10);
          h.drawLine(x - 4, y - 4, x + 4, y + 4)
            .drawLine(x - 3, y - 4, x + 5, y + 4)
            .drawLine(x - 4, y + 4, x + 4, y - 4)
            .drawLine(x - 3, y + 4, x + 5, y - 4);
        }

        let v = board[r][c];
        if (v !== 0) {
          let isWhite = v === 1;
          if (!isWhite) {
            h.setColor(2).drawCircle(x, y, 11).drawCircle(x, y, 12);
          }
          h.setColor(isWhite ? 3 : 0).fillCircle(x, y, 9);
          h.setColor(isWhite ? 3 : 3).drawCircle(x, y, 8);
          if (isSel || isChain) {
            h.setColor(3).drawCircle(x, y, 6);
          }
          if (isPendingCap) {
            h.setColor(1).drawCircle(x, y, 7).drawCircle(x, y, 8);
            h.setColor(3).drawCircle(x, y, 12).drawCircle(x, y, 13);
          }
        } else if (!isDest && !isPendingDest) {
          h.setColor(2).drawCircle(x, y, 10);
        }

        if (isCursor) {
          h.setColor(3).drawCircle(x, y, 12).drawCircle(x, y, 13);
        }
      }
    }
  }

  // ── AI turn execution ─────────────────────────────────────────────────────
  let aiMoveQueue;

  function buildAiQueue() {
    let m = bestAiMove();
    if (!m) return [];
    let queue = [m];
    if (!m.isCapture) return queue;
    let vis = {};
    vis[m.fr * 9 + m.fc] = true;
    vis[m.tr * 9 + m.tc] = true;
    let chains = chainMoves(m.tr, m.tc, false, vis, { dr: m.dr, dc: m.dc });
    while (chains.length > 0) {
      let best = chains[0];
      for (let i = 1; i < chains.length; i++) {
        if (chains[i].caps.length > best.caps.length) best = chains[i];
      }
      queue.push(best);
      vis[best.fr * 9 + best.fc] = true;
      vis[best.tr * 9 + best.tc] = true;
      chains = chainMoves(best.tr, best.tc, false, vis, {
        dr: best.dr,
        dc: best.dc,
      });
    }
    return queue;
  }

  function doAiStep() {
    if (!aiMoveQueue || aiMoveQueue.length === 0) {
      let w = checkOver();
      if (w) {
        winner = w;
        gameState = 'over';
      } else {
        gameState = 'p1';
        chainPiece = null;
        chainVisited = {};
        chainLastDir = null;
      }
      draw();
      return;
    }
    applyMoveToBoard(aiMoveQueue.shift());
    Pip.playSound('TAB');
    draw();
    aiTimer = setTimeout(doAiStep, 750);
  }

  function doAiTurn() {
    aiMoveQueue = buildAiQueue();
    if (aiMoveQueue.length === 0) {
      let w = checkOver();
      winner = w ? w : 'p1';
      gameState = 'over';
      draw();
      return;
    }
    doAiStep();
  }

  // ── Cursor movement ───────────────────────────────────────────────────────
  function moveCursor(dr, dc) {
    prevCurRow = curRow;
    prevCurCol = curCol;
    let r = curRow + dr,
      c = curCol + dc;
    if (r < 0) r = 0;
    if (r > 4) r = 4;
    if (c < 0) c = 0;
    if (c > 8) c = 8;
    curRow = r;
    curCol = c;
  }

  // ── Fast single-cell redraw (for cursor movement only) ────────────────────
  function drawCell(r, c) {
    'ram';
    let x = 56 + c * 46,
      y = 52 + r * 52;
    h.clearRect(x - 15, y - 15, x + 15, y + 15);
    // Redraw the inner half of each board line segment touching this node
    h.setColor(2);
    if (c < 8) h.drawLine(x + 11, y, x + 15, y);
    if (c > 0) h.drawLine(x - 15, y, x - 11, y);
    if (r < 4) h.drawLine(x, y + 11, x, y + 15);
    if (r > 0) h.drawLine(x, y - 15, x, y - 11);
    if (isStrong(r, c)) {
      if (r < 4 && c < 8) h.drawLine(x + 8, y + 8, x + 15, y + 15);
      if (r < 4 && c > 0) h.drawLine(x - 8, y + 8, x - 15, y + 15);
      if (r > 0 && c < 8) h.drawLine(x + 8, y - 8, x + 15, y - 15);
      if (r > 0 && c > 0) h.drawLine(x - 8, y - 8, x - 15, y - 15);
    }
    let isSel = selected && r === selected.row && c === selected.col;
    let isChain = chainPiece && r === chainPiece.row && c === chainPiece.col;
    let isDest = false;
    for (let i = 0; i < selectedMoves.length; i++) {
      if (selectedMoves[i].tr === r && selectedMoves[i].tc === c) {
        isDest = true;
        break;
      }
    }
    let isPendingCap = false,
      isPendingDest = false;
    if (pendingMove) {
      let pm = pendingMove[pendingIdx];
      if (pm.tr === r && pm.tc === c) isPendingDest = true;
      for (let i = 0; i < pm.caps.length; i++) {
        if (pm.caps[i].row === r && pm.caps[i].col === c) {
          isPendingCap = true;
          break;
        }
      }
    }
    if (isDest) {
      h.setColor(2).drawCircle(x, y, 8);
      h.drawLine(x - 4, y - 4, x + 4, y + 4)
        .drawLine(x - 3, y - 4, x + 5, y + 4)
        .drawLine(x - 4, y + 4, x + 4, y - 4)
        .drawLine(x - 3, y + 4, x + 5, y - 4);
    }
    if (isPendingDest) {
      h.setColor(3).drawCircle(x, y, 8);
      h.drawLine(x - 4, y - 4, x + 4, y + 4)
        .drawLine(x - 3, y - 4, x + 5, y + 4)
        .drawLine(x - 4, y + 4, x + 4, y - 4)
        .drawLine(x - 3, y + 4, x + 5, y - 4);
    }

    let v = board[r][c];
    if (v !== 0) {
      let isWhite = v === 1;
      if (!isWhite) h.setColor(2).drawCircle(x, y, 11).drawCircle(x, y, 12);
      h.setColor(isWhite ? 3 : 0).fillCircle(x, y, 9);
      h.setColor(isWhite ? 1 : 3).drawCircle(x, y, 9);
      if (isSel || isChain) h.setColor(3).drawCircle(x, y, 6);
      if (isPendingCap) {
        h.setColor(1).drawCircle(x, y, 7).drawCircle(x, y, 8);
        h.setColor(3).drawCircle(x, y, 12).drawCircle(x, y, 13);
      }
    } else if (!isDest && !isPendingDest) {
      h.setColor(2).drawCircle(x, y, 10);
    }
    if (r === curRow && c === curCol) {
      h.setColor(3).drawCircle(x, y, 12).drawCircle(x, y, 13);
    }
  }

  function redrawCursor() {
    'ram';
    drawCell(prevCurRow, prevCurCol);
    if (prevCurRow !== curRow || prevCurCol !== curCol)
      drawCell(curRow, curCol);
    let y1 =
      52 + E.clip(prevCurRow < curRow ? prevCurRow : curRow, 0, 4) * 52 - 15;
    let y2 =
      52 + E.clip(prevCurRow > curRow ? prevCurRow : curRow, 0, 4) * 52 + 15;
    Pip.blitOptions.y1 = E.clip(y1, 0, 319);
    Pip.blitOptions.y2 = E.clip(y2, 0, 319);
    h.flip();
    Pip.lastFlip = getTime();
    delete Pip.blitOptions.y1;
    delete Pip.blitOptions.y2;
  }

  // ── Press handler ─────────────────────────────────────────────────────────
  function applyChosenMove(dest, isChainContext) {
    applyMoveToBoard(dest);
    let vis = chainVisited;
    if (!isChainContext) {
      vis = {};
    }
    vis[dest.tr * 9 + dest.tc] = true;
    vis[dest.fr * 9 + dest.fc] = true;
    let isCurrentPlayerTurn = gameState === 'p1';
    let nextChain = chainMoves(dest.tr, dest.tc, isCurrentPlayerTurn, vis, {
      dr: dest.dr,
      dc: dest.dc,
    });

    if (nextChain.length > 0) {
      chainPiece = { row: dest.tr, col: dest.tc };
      chainVisited = vis;
      chainLastDir = { dr: dest.dr, dc: dest.dc };
      selected = null;
      selectedMoves = nextChain;
      curRow = dest.tr;
      curCol = dest.tc;
      prevCurRow = curRow;
      prevCurCol = curCol;
      pendingMove = null;
      pendingIdx = 0;
      draw();
    } else {
      chainPiece = null;
      chainVisited = {};
      chainLastDir = null;
      selected = null;
      selectedMoves = [];
      pendingMove = null;
      pendingIdx = 0;
      let w = checkOver();
      if (w) {
        winner = w;
        gameState = 'over';
        draw();
        return;
      }

      if (gameMode === '2p') {
        gameState = gameState === 'p1' ? 'p2' : 'p1';
        draw();
      } else {
        gameState = 'ai';
        draw();
        aiTimer = setTimeout(doAiTurn, 600);
      }
    }
  }

  function onPress() {
    Pip.playSound('TAB');

    if (gameState === 'title') {
      let mode = titleMenuIdx === 0 ? 'cpu' : '2p';
      initBoard(mode);
      draw();
      return;
    }

    if (gameState === 'over') {
      gameState = 'title';
      titleMenuIdx = 0;
      drawTitle();
      return;
    }

    if (gameState !== 'p1' && gameState !== 'p2') return;

    // ── Pending capture-direction choice ──────────────────────────────────
    if (pendingMove) {
      let chosen = pendingMove[pendingIdx];
      pendingMove = null;
      pendingIdx = 0;
      applyChosenMove(chosen, !!chainPiece);
      return;
    }

    let r = curRow,
      c = curCol;

    // ── Chain continuation mode ───────────────────────────────────────────
    if (chainPiece) {
      let candidates = [];
      for (let i = 0; i < selectedMoves.length; i++) {
        let m = selectedMoves[i];
        if (m.tr === r && m.tc === c) candidates.push(m);
      }

      if (candidates.length === 2) {
        pendingMove = candidates;
        pendingIdx = 0;
        draw();
        return;
      }
      if (candidates.length === 1) {
        applyChosenMove(candidates[0], true);
        return;
      }
      draw();
      return;
    }

    // ── Normal selection / move ───────────────────────────────────────────
    if (selected) {
      let candidates = [];
      for (let i = 0; i < selectedMoves.length; i++) {
        let m = selectedMoves[i];
        if (m.tr === r && m.tc === c) candidates.push(m);
      }

      if (candidates.length === 2) {
        pendingMove = candidates;
        pendingIdx = 0;
        draw();
        return;
      }
      if (candidates.length === 1) {
        let dest = candidates[0];
        if (!dest.isCapture) {
          // Non-capture move: apply directly, transition turn
          applyMoveToBoard(dest);
          selected = null;
          selectedMoves = [];
          let w = checkOver();
          if (w) {
            winner = w;
            gameState = 'over';
            draw();
            return;
          }

          if (gameMode === '2p') {
            gameState = gameState === 'p1' ? 'p2' : 'p1';
            draw();
          } else {
            gameState = 'ai';
            draw();
            aiTimer = setTimeout(doAiTurn, 600);
          }
          return;
        }
        applyChosenMove(dest, false);
        return;
      }

      if (r === selected.row && c === selected.col) {
        selected = null;
        selectedMoves = [];
        draw();
        return;
      }
    }

    let isP1 = gameState === 'p1';
    let expectedPieceVal = isP1 ? 1 : -1;

    if (board[r][c] === expectedPieceVal) {
      let must = anyCapturePossible(isP1);
      let ms = movesForPiece(r, c, isP1, must);
      if (ms.length > 0) {
        selected = { row: r, col: c };
        selectedMoves = ms;
        Pip.playSound('SCROLL');
      }
    }
    draw();
  }

  // ── Knob handlers ─────────────────────────────────────────────────────────
  function onKnob1(d) {
    if (!d) return;
    if (gameState === 'title') {
      titleMenuIdx = E.clip(titleMenuIdx + d, 0, 1);
      Pip.playSound('SCROLL');
      drawTitle();
      return;
    }
    if (gameState !== 'p1' && gameState !== 'p2') return;
    if (pendingMove) {
      pendingIdx = pendingIdx === 0 ? 1 : 0;
      Pip.playSound('SCROLL');
      draw();
      return;
    }
    moveCursor(d, 0);
    Pip.playSound('SCROLL');
    redrawCursor();
  }

  function onKnob2(d) {
    if (!d) return;
    if (gameState === 'title') {
      titleMenuIdx = E.clip(titleMenuIdx + d, 0, 1);
      Pip.playSound('SCROLL');
      drawTitle();
      return;
    }
    if (gameState !== 'p1' && gameState !== 'p2') return;
    if (pendingMove) {
      pendingIdx = pendingIdx === 0 ? 1 : 0;
      Pip.playSound('SCROLL');
      draw();
      return;
    }
    moveCursor(0, d);
    Pip.playSound('SCROLL');
    redrawCursor();
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  Pip.audioStop();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);

  clickWatch = setWatch(
    function () {
      onPress();
    },
    ENC1_PRESS,
    { repeat: true, edge: 'rising', debounce: 50 },
  );

  gameState = 'title';
  drawTitle();

  return {
    id: 'fanorona',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      if (aiTimer) clearTimeout(aiTimer);
      if (clickWatch) clearWatch(clickWatch);
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      Pip.audioStop();
      h.clear();
      h.flip();
    },
  };
});
