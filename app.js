(function() {
  // ── State ────────────────────────────────────────────────────────────────
  let clickWatch, aiTimer;
  let gameState; // 'title' | 'player' | 'ai' | 'over'
  let winner;    // 'player' | 'ai' | 'draw'

  // board[r][c]: 1=white(player), -1=black(AI), 0=empty
  // 5 rows (0=top/AI, 4=bottom/player), 9 cols
  let board;

  // Cursor position
  let curRow, curCol;

  // Currently selected piece {row,col} or null
  let selected;

  // Moves available for selected piece (plain + capture starts)
  let selectedMoves;

  // During a capture chain: the piece doing the chaining
  let chainPiece; // {row,col} or null
  // Squares visited this chain turn (flat keys r*9+c)
  let chainVisited;
  // Last direction used in chain (to forbid repeating same direction)
  let chainLastDir; // {dr,dc} or null

  // ── Strong/weak intersection ──────────────────────────────────────────────
  // Strong = diagonal moves allowed; pattern: (row+col) % 2 === 0
  function isStrong(r, c) { return (r + c) % 2 === 0; }

  // ── Valid directions from a cell ─────────────────────────────────────────
  // Returns array of [dr,dc] pairs
  function dirsFrom(r, c) {
    let d = [[-1,0],[1,0],[0,-1],[0,1]]; // orthogonal always
    if (isStrong(r, c)) {
      d.push([-1,-1]); d.push([-1,1]); d.push([1,-1]); d.push([1,1]);
    }
    return d;
  }

  // ── Board initialisation ─────────────────────────────────────────────────
  // Start position: row0-1 = black(-1), row3-4 = white(1),
  // row2 (middle) = alternating starting from col0 with black, center empty.
  // Middle row pattern (cols 0-8): B W B W _ W B W B
  function initBoard() {
    board = [
      [-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1, 1,-1, 1, 0, 1,-1, 1,-1],
      [ 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [ 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];
    curRow = 4; curCol = 4;
    selected = null; selectedMoves = [];
    chainPiece = null; chainVisited = {}; chainLastDir = null;
    gameState = 'player'; winner = null;
  }

  // ── Capture helpers ───────────────────────────────────────────────────────
  // Collect all enemy pieces in a line starting at (r,c) going (dr,dc)
  // stopping at empty or own piece. Returns array of {row,col}.
  function lineCaptures(r, c, dr, dc, isPlayerTurn) {
    let caps = [];
    let tr = r + dr, tc = c + dc;
    while (tr >= 0 && tr < 5 && tc >= 0 && tc < 9) {
      let v = board[tr][tc];
      if (v === 0) break;
      if (isPlayerTurn ? v > 0 : v < 0) break; // own piece
      caps.push({row:tr, col:tc});
      tr += dr; tc += dc;
    }
    return caps;
  }

  // ── Move generation ───────────────────────────────────────────────────────
  // A "move" is { fr, fc, tr, tc, dr, dc, caps:[], isCapture }
  // caps = array of {row,col} to remove

  // Get all moves for a piece at (r,c) that are NOT part of a chain continuation.
  // If anyCapture is true (mandatory capture exists on the board for this side),
  // only return capturing moves.
  function movesForPiece(r, c, isPlayerTurn, mustCapture) {
    let moves = [];
    let dirs = dirsFrom(r, c);
    for (let i = 0; i < dirs.length; i++) {
      let dr = dirs[i][0], dc = dirs[i][1];
      let tr = r + dr, tc = c + dc;
      if (tr < 0 || tr >= 5 || tc < 0 || tc >= 9) continue;
      if (board[tr][tc] !== 0) continue; // destination must be empty

      // Approach capture: enemy in front (tr+dr, tc+dc)
      let approachCaps = lineCaptures(tr, tc, dr, dc, isPlayerTurn);
      // Withdrawal capture: enemy behind from (r,c) in direction (-dr,-dc)
      let withdrawCaps = lineCaptures(r, c, -dr, -dc, isPlayerTurn);

      if (approachCaps.length > 0 && withdrawCaps.length > 0) {
        // Must choose; add both options
        moves.push({fr:r,fc:c,tr:tr,tc:tc,dr:dr,dc:dc,caps:approachCaps,isCapture:true,captureType:'approach'});
        moves.push({fr:r,fc:c,tr:tr,tc:tc,dr:dr,dc:dc,caps:withdrawCaps,isCapture:true,captureType:'withdraw'});
      } else if (approachCaps.length > 0) {
        moves.push({fr:r,fc:c,tr:tr,tc:tc,dr:dr,dc:dc,caps:approachCaps,isCapture:true,captureType:'approach'});
      } else if (withdrawCaps.length > 0) {
        moves.push({fr:r,fc:c,tr:tr,tc:tc,dr:dr,dc:dc,caps:withdrawCaps,isCapture:true,captureType:'withdraw'});
      } else if (!mustCapture) {
        // paika (non-capture) only if not forced to capture
        moves.push({fr:r,fc:c,tr:tr,tc:tc,dr:dr,dc:dc,caps:[],isCapture:false,captureType:'none'});
      }
    }
    return moves;
  }

  // Check if any piece on the given side can capture
  function anyCapturePossible(isPlayerTurn) {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 9; c++) {
        let v = board[r][c];
        if (isPlayerTurn ? v !== 1 : v !== -1) continue;
        let dirs = dirsFrom(r, c);
        for (let i = 0; i < dirs.length; i++) {
          let dr = dirs[i][0], dc = dirs[i][1];
          let tr = r + dr, tc = c + dc;
          if (tr < 0 || tr >= 5 || tc < 0 || tc >= 9) continue;
          if (board[tr][tc] !== 0) continue;
          if (lineCaptures(tr, tc, dr, dc, isPlayerTurn).length > 0) return true;
          if (lineCaptures(r, c, -dr, -dc, isPlayerTurn).length > 0) return true;
        }
      }
    }
    return false;
  }

  // Get all legal moves for a side (respects mandatory capture)
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

  // Continuation moves for a chain capture (piece at tr,tc after a capture)
  // Restrictions: cannot revisit visited squares; cannot use same direction twice in a row.
  function chainMoves(r, c, isPlayerTurn, visited, lastDir) {
    let moves = [];
    let dirs = dirsFrom(r, c);
    for (let i = 0; i < dirs.length; i++) {
      let dr = dirs[i][0], dc = dirs[i][1];
      // Forbid same direction as last (prevents approach-then-withdrawal on same line)
      if (lastDir && dr === lastDir.dr && dc === lastDir.dc) continue;
      let tr = r + dr, tc = c + dc;
      if (tr < 0 || tr >= 5 || tc < 0 || tc >= 9) continue;
      if (board[tr][tc] !== 0) continue;
      if (visited[tr * 9 + tc]) continue; // cannot revisit
      let approachCaps = lineCaptures(tr, tc, dr, dc, isPlayerTurn);
      let withdrawCaps = lineCaptures(r, c, -dr, -dc, isPlayerTurn);
      if (approachCaps.length > 0) {
        moves.push({fr:r,fc:c,tr:tr,tc:tc,dr:dr,dc:dc,caps:approachCaps,isCapture:true,captureType:'approach'});
      }
      if (withdrawCaps.length > 0) {
        moves.push({fr:r,fc:c,tr:tr,tc:tc,dr:dr,dc:dc,caps:withdrawCaps,isCapture:true,captureType:'withdraw'});
      }
    }
    return moves;
  }

  // ── Apply / remove captures ───────────────────────────────────────────────
  function removeCaptures(caps) {
    for (let i = 0; i < caps.length; i++) board[caps[i].row][caps[i].col] = 0;
  }

  // Count pieces for a side
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
    let wp = countPieces(true), bp = countPieces(false);
    if (bp === 0) return 'player';
    if (wp === 0) return 'ai';
    let wm = getAllMoves(true), bm = getAllMoves(false);
    if (wm.length === 0 && bm.length === 0) return 'draw';
    if (wm.length === 0) return 'ai';
    if (bm.length === 0) return 'player';
    return null;
  }

  // ── Board scoring for AI ──────────────────────────────────────────────────
  function boardScore() {
    let s = 0;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 9; c++) {
        let v = board[r][c];
        if (v === 1) s++;
        else if (v === -1) s--;
      }
    }
    return s;
  }

  // Simple 1-ply AI (greedy best capture, then random paika)
  // For a microcontroller we keep it shallow but include capture chains.
  function bestAiMove() {
    let moves = getAllMoves(false);
    if (moves.length === 0) return null;
    // Prefer moves that capture the most pieces
    let best = null, bestVal = -999;
    for (let i = 0; i < moves.length; i++) {
      let m = moves[i];
      let val = m.caps.length;
      if (val > bestVal) { bestVal = val; best = m; }
    }
    return best;
  }

  // Execute a move on board (move piece + remove caps)
  function applyMoveToBoard(m) {
    let piece = board[m.fr][m.fc];
    board[m.fr][m.fc] = 0;
    board[m.tr][m.tc] = piece;
    removeCaptures(m.caps);
  }

  // ── Layout constants (hardcoded per agents.md) ────────────────────────────
  // Screen: 480 x 320
  // Board area: 9 cols x 5 rows of intersections
  // Cell size: 46px wide, 52px tall  → board width = 8*46=368, board height = 4*52=208
  // Board origin: x0=56, y0=52  → board right=56+368=424, board bottom=52+208=260
  // Title bar: y=14 (centered)
  // Status bar: y=296 (centered)

  // ── Dirty flag approach (state-change only, no realtime redraws) ──────────
  // We redraw on demand after each state change (no frame loop needed).

  function drawTitle() {
    h.clear(0);
    h.setColor(3).setFontMonofonto36().setFontAlign(0, 0)
      .drawString('FANORONA', 240, 110);
    h.setColor(2).setFontMonofonto18().setFontAlign(0, 0)
      .drawString('Press left wheel to begin!', 240, 210);
    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawBoardLines() {
    // Draw lines connecting intersections (only along valid connections)
    h.setColor(2);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 9; c++) {
        let x = 56 + c * 46, y = 52 + r * 52;
        // Horizontal line to right neighbour
        if (c < 8) h.drawLine(x, y, x + 46, y);
        // Vertical line to bottom neighbour
        if (r < 4) h.drawLine(x, y, x, y + 52);
        // Diagonals only from strong intersections
        if (isStrong(r, c)) {
          if (r < 4 && c < 8) h.drawLine(x, y, x + 46, y + 52);
          if (r < 4 && c > 0) h.drawLine(x, y, x - 46, y + 52);
        }
      }
    }
  }

  function draw() {
    h.clear(0);

    // ── Title (always top) ────────────────────────────────────────────────
    h.setColor(3).setFontMonofonto23().setFontAlign(0, 0)
      .drawString('FANORONA', 240, 14);

    // ── Status bar ────────────────────────────────────────────────────────
    if (gameState === 'over') {
      if (winner === 'player') {
        h.setColor(3).setFontMonofonto18().setFontAlign(0, 0)
          .drawString('You Win!', 240, 290);
        h.setColor(2).setFontMonofonto14().setFontAlign(0, 0)
          .drawString('Press left wheel to play again!', 240, 308);
      } else if (winner === 'ai') {
        h.setColor(1).setFontMonofonto18().setFontAlign(0, 0)
          .drawString('CPU Wins!', 240, 290);
        h.setColor(2).setFontMonofonto14().setFontAlign(0, 0)
          .drawString('Press left wheel to play again!', 240, 308);
      } else {
        h.setColor(2).setFontMonofonto18().setFontAlign(0, 0)
          .drawString('Draw!', 240, 290);
        h.setColor(2).setFontMonofonto14().setFontAlign(0, 0)
          .drawString('Press left wheel to play again!', 240, 308);
      }
    } else if (gameState === 'ai') {
      h.setColor(2).setFontMonofonto18().setFontAlign(0, 0)
        .drawString("CPU's Turn", 240, 296);
    } else if (chainPiece) {
      h.setColor(3).setFontMonofonto18().setFontAlign(0, 0)
        .drawString('Chain! Capture or pass', 240, 290);
      h.setColor(2).setFontMonofonto14().setFontAlign(0, 0)
        .drawString('Press to end turn', 240, 308);
    } else {
      h.setColor(3).setFontMonofonto18().setFontAlign(0, 0)
        .drawString('Your Turn', 240, 296);
    }

    // ── Board lines ───────────────────────────────────────────────────────
    drawBoardLines();

    // Build dest lookup for highlights
    let destSet = {};
    if (selectedMoves.length > 0) {
      for (let i = 0; i < selectedMoves.length; i++) {
        destSet[selectedMoves[i].tr * 9 + selectedMoves[i].tc] = true;
      }
    }

    // ── Pieces & cursor ───────────────────────────────────────────────────
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 9; c++) {
        let x = 56 + c * 46, y = 52 + r * 52;
        let isCursor = r === curRow && c === curCol;
        let isSel = selected && r === selected.row && c === selected.col;
        let isChain = chainPiece && r === chainPiece.row && c === chainPiece.col;
        let isDest = destSet[r * 9 + c];

        // Destination highlight
        if (isDest) {
          h.setColor(2).fillCircle(x, y, 8);
        }

        // Cursor ring
        if (isCursor) {
          h.setColor(3).drawCircle(x, y, 11).drawCircle(x, y, 12);
        }

        // Piece
        let v = board[r][c];
        if (v !== 0) {
          let isWhite = v === 1;
          // Extra outer ring for black pieces so they read against dark bg
          if (!isWhite) {
            h.setColor(2).drawCircle(x, y, 11).drawCircle(x, y, 12);
          }
          // Fill
          h.setColor(isWhite ? 3 : 0).fillCircle(x, y, 9);
          // Inner outline
          h.setColor(isWhite ? 1 : 3).drawCircle(x, y, 9);
          // Selection / chain indicator: bright ring inside
          if (isSel || isChain) {
            h.setColor(3).drawCircle(x, y, 6);
          }
        }
      }
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  // ── AI turn execution ─────────────────────────────────────────────────────
  function doAiTurn() {
    let m = bestAiMove();
    if (!m) {
      // AI has no moves
      let w = checkOver();
      winner = w ? w : 'player';
      gameState = 'over';
      draw();
      return;
    }
    applyMoveToBoard(m);

    // Check for chain captures
    if (m.isCapture) {
      // Build visited set and check for chain
      let vis = {};
      vis[m.tr * 9 + m.tc] = true;
      vis[m.fr * 9 + m.fc] = true;
      let chains = chainMoves(m.tr, m.tc, false, vis, {dr:m.dr,dc:m.dc});

      // AI greedily continues chain if capture available
      while (chains.length > 0) {
        let best = chains[0];
        for (let i = 1; i < chains.length; i++) {
          if (chains[i].caps.length > best.caps.length) best = chains[i];
        }
        applyMoveToBoard(best);
        vis[best.fr * 9 + best.fc] = true;
        vis[best.tr * 9 + best.tc] = true;
        chains = chainMoves(best.tr, best.tc, false, vis, {dr:best.dr,dc:best.dc});
      }
    }

    let w = checkOver();
    if (w) {
      winner = w;
      gameState = 'over';
    } else {
      gameState = 'player';
      chainPiece = null; chainVisited = {}; chainLastDir = null;
    }
    draw();
  }

  // ── Cursor movement ───────────────────────────────────────────────────────
  function moveCursor(dr, dc) {
    let r = curRow + dr, c = curCol + dc;
    if (r < 0) r = 0;
    if (r > 4) r = 4;
    if (c < 0) c = 0;
    if (c > 8) c = 8;
    curRow = r; curCol = c;
  }

  // ── Press handler ─────────────────────────────────────────────────────────
  function onPress() {
    Pip.playSound('TAB');

    if (gameState === 'title') {
      initBoard();
      draw();
      return;
    }

    if (gameState === 'over') {
      gameState = 'title';
      drawTitle();
      return;
    }

    if (gameState !== 'player') return;

    let r = curRow, c = curCol;

    // ── Chain continuation mode ───────────────────────────────────────────
    if (chainPiece) {
      // Check if pressing on a valid chain destination
      let dest = null;
      for (let i = 0; i < selectedMoves.length; i++) {
        let m = selectedMoves[i];
        if (m.tr === r && m.tc === c) { dest = m; break; }
      }

      if (dest) {
        applyMoveToBoard(dest);
        chainVisited[dest.tr * 9 + dest.tc] = true;
        chainVisited[dest.fr * 9 + dest.fc] = true;

        // Update chain: compute next continuation moves
        let nextChain = chainMoves(dest.tr, dest.tc, true, chainVisited, {dr:dest.dr,dc:dest.dc});
        if (nextChain.length > 0) {
          chainPiece = {row:dest.tr, col:dest.tc};
          chainLastDir = {dr:dest.dr, dc:dest.dc};
          selectedMoves = nextChain;
          curRow = dest.tr; curCol = dest.tc;
        } else {
          // No more chains — end turn
          chainPiece = null; chainVisited = {}; chainLastDir = null;
          selected = null; selectedMoves = [];
          let w = checkOver();
          if (w) { winner = w; gameState = 'over'; draw(); return; }
          gameState = 'ai';
          draw();
          aiTimer = setTimeout(doAiTurn, 600);
          return;
        }
      } else {
        // Player pressed somewhere else — end chain turn (chain is optional to continue)
        chainPiece = null; chainVisited = {}; chainLastDir = null;
        selected = null; selectedMoves = [];
        let w = checkOver();
        if (w) { winner = w; gameState = 'over'; draw(); return; }
        gameState = 'ai';
        draw();
        aiTimer = setTimeout(doAiTurn, 600);
        return;
      }
      draw();
      return;
    }

    // ── Normal selection / move ───────────────────────────────────────────
    if (selected) {
      // Check if pressing a valid destination
      let dest = null;
      for (let i = 0; i < selectedMoves.length; i++) {
        let m = selectedMoves[i];
        if (m.tr === r && m.tc === c) { dest = m; break; }
      }

      if (dest) {
        applyMoveToBoard(dest);

        if (dest.isCapture) {
          // Enter chain check
          let vis = {};
          vis[dest.tr * 9 + dest.tc] = true;
          vis[dest.fr * 9 + dest.fc] = true;
          let chains = chainMoves(dest.tr, dest.tc, true, vis, {dr:dest.dr,dc:dest.dc});
          if (chains.length > 0) {
            chainPiece = {row:dest.tr, col:dest.tc};
            chainVisited = vis;
            chainLastDir = {dr:dest.dr, dc:dest.dc};
            selected = null;
            selectedMoves = chains;
            curRow = dest.tr; curCol = dest.tc;
            draw();
            return;
          }
        }

        // Turn ends
        selected = null; selectedMoves = [];
        let w = checkOver();
        if (w) { winner = w; gameState = 'over'; draw(); return; }
        gameState = 'ai';
        draw();
        aiTimer = setTimeout(doAiTurn, 600);
        return;
      }

      // Pressing same piece = deselect
      if (r === selected.row && c === selected.col) {
        selected = null; selectedMoves = [];
        draw();
        return;
      }
    }

    // Try to select a white piece
    if (board[r][c] === 1) {
      let must = anyCapturePossible(true);
      let ms = movesForPiece(r, c, true, must);
      if (ms.length > 0) {
        selected = {row:r, col:c};
        selectedMoves = ms;
        Pip.playSound('SCROLL');
      }
    }
    draw();
  }

  // ── Knob handlers ─────────────────────────────────────────────────────────
  function onKnob1(d) {
    if (!d) return; // press events handled exclusively by setWatch(ENC1_PRESS)
    if (gameState !== 'player') return;
    moveCursor(d, 0);
    Pip.playSound('SCROLL');
    draw();
  }

  function onKnob2(d) {
    if (gameState !== 'player') return;
    moveCursor(0, d);
    Pip.playSound('SCROLL');
    draw();
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  Pip.audioStop();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);

  clickWatch = setWatch(function() { onPress(); }, ENC1_PRESS, {repeat:true, edge:'rising', debounce:50});

  gameState = 'title';
  drawTitle();

  return {
    id: 'FANORONA',
    notDefault: true,
    fullscreen: true,
    remove: function() {
      if (aiTimer) clearTimeout(aiTimer);
      if (clickWatch) clearWatch(clickWatch);
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      Pip.audioStop();
      h.clear();
      h.flip();
    }
  };
});