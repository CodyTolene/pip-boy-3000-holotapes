// =============================================================================
//  Name: Checkers
//  Author(s): @trekker87 @CodyTolene
//  License: MIT
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: GAME.JS (scene)
//  Description: The checkers board and game logic, player versus AI.
//  Notes:
//    Board is a flat Uint8Array(64), index = row * 8 + col.
//    Cell values: 0 empty, 1 AI man, 2 player man, 3 AI king, 4 player king.
//    AI pieces are odd (value & 1), player pieces are even, kings are > 2.
//    Moves are encoded as a single integer:
//      from (bits 0-5) | to << 6 (bits 6-11) | capture << 12 (64 = none).
//    state: 0 = player turn, 1 = AI turn, 2 = game over.
// =============================================================================

(function (app) {
  let aiTimer = null; // Pending AI move timeout
  let board = null; // Uint8Array(64) of cell values
  let chainFrom = -1; // Piece mid multi-jump, -1 = none
  let cursor = 41; // Cursor cell index
  let selected = -1; // Selected piece cell index, -1 = none
  let selectedMoves = []; // Encoded moves for the selected piece
  let state = 0; // 0 = player turn, 1 = AI turn, 2 = game over
  let turnMoves = []; // All legal player moves this turn
  let winner = 0; // 1 = player, 2 = AI

  /**
   * Execute one AI move, chaining multi-jumps on a timer
   * @returns {void} Nothing
   */
  function aiPlay() {
    aiTimer = null;

    // Mid-chain the same piece must keep jumping
    const moves = chainFrom >= 0 ? movesFrom(chainFrom, 1) : legalMoves(0);

    if (!moves.length && chainFrom < 0) {
      // AI cannot move, player wins
      state = 2;
      winner = 1;
      draw();

      return;
    }

    if (moves.length) {
      // Prefer moves that crown a king
      let pool = moves.filter(function (m) {
        return board[m & 63] === 1 && ((m >> 6) & 63) > 55;
      });

      if (!pool.length) {
        pool = moves;
      }

      const m = pool[Math.randInt(pool.length)];
      const promoted = applyMove(m);
      const to = (m >> 6) & 63;

      // A capture that did not promote may continue jumping
      if (m >> 12 !== 64 && !promoted && movesFrom(to, 1).length) {
        chainFrom = to;
        draw();
        aiTimer = setTimeout(aiPlay, 400);

        return;
      }
    }

    // Hand the turn back to the player
    chainFrom = -1;
    turnMoves = legalMoves(1);

    if (turnMoves.length) {
      state = 0;
    } else {
      // Player cannot move, AI wins
      state = 2;
      winner = 2;
    }

    draw();
  }

  /**
   * Apply an encoded move to the board
   * @param m The encoded move
   * @returns {boolean} True if the piece was promoted to a king
   */
  function applyMove(m) {
    const from = m & 63;
    const to = (m >> 6) & 63;
    let v = board[from];

    // Reaching the far row crowns a king and ends the turn
    const promoted = (v === 2 && to < 8) || (v === 1 && to > 55);

    board[from] = 0;

    if (m >> 12 !== 64) {
      board[m >> 12] = 0;
    }

    if (promoted) {
      v += 2;
    }

    board[to] = v;

    return promoted;
  }

  function draw() {
    'ram';
    h.clear(1);

    // HUD
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(-1, 0)
      .drawString('CHECKERS', 10, 12);
    h.setFontAlign(1, 0);

    if (state === 1) {
      h.setColor(2).drawString('AI...', 470, 12);
    } else if (state === 2) {
      h.setColor(winner === 1 ? 3 : 1).drawString(
        winner === 1 ? 'YOU WIN!' : 'AI WINS!',
        470,
        12,
      );
    } else {
      h.setColor(2).drawString('YOUR TURN', 470, 12);
    }

    // Board, 35px cells at x 100, y 20
    let i, j, sx, sy, v, dest;

    for (i = 0; i < 64; i++) {
      sx = 100 + (i & 7) * 35;
      sy = 20 + (i >> 3) * 35;

      if (((i >> 3) + (i & 7)) & 1) {
        // Dark square, playable
        dest = 0;

        for (j = 0; j < selectedMoves.length; j++) {
          if (((selectedMoves[j] >> 6) & 63) === i) {
            dest = 1;
            break;
          }
        }

        if (i === selected) {
          Pip.shadeBox(sx, sy, sx + 35, sy + 35);
        } else {
          h.setColor(dest ? 2 : 1).fillRect(sx, sy, sx + 35, sy + 35);
        }
      }

      if (i === cursor) {
        h.setColor(3)
          .drawRect(sx + 1, sy + 1, sx + 34, sy + 34)
          .drawRect(sx + 2, sy + 2, sx + 33, sy + 33);
      }

      h.setColor(1).drawRect(sx, sy, sx + 35, sy + 35);

      v = board[i];

      if (v) {
        // Player pieces bright, AI pieces dark
        h.setColor(v & 1 ? 1 : 3).fillCircle(sx + 17, sy + 17, 12);
        h.setColor(v & 1 ? 2 : 1).drawCircle(sx + 17, sy + 17, 12);

        if (v > 2) {
          h.setColor(v & 1 ? 2 : 1)
            .setFontMonofonto16()
            .setFontAlign(0, 0)
            .drawString('K', sx + 17, sy + 17);
        }
      }
    }

    // Bottom bar
    h.setColor(2)
      .setFontMonofonto16()
      .setFontAlign(0, 0)
      .drawString(
        state === 2
          ? 'PRESS TO PLAY AGAIN'
          : state === 1
            ? 'AI IS THINKING...'
            : chainFrom >= 0
              ? 'JUMP AGAIN!'
              : 'SELECT + CONFIRM TO MOVE',
        240,
        308,
      );

    h.flip();
    Pip.lastFlip = getTime();
  }

  /**
   * All legal moves for one side, jumps are forced when available
   * @param forPlayer 1 for the player side, 0 for the AI side
   * @returns {number[]} Encoded moves
   */
  function legalMoves(forPlayer) {
    const side = forPlayer ? 0 : 1;
    let jumps = [],
      slides = [],
      i;

    for (i = 0; i < 64; i++) {
      if (!board[i] || (board[i] & 1) !== side) {
        continue;
      }

      jumps = jumps.concat(movesFrom(i, 1));

      if (!jumps.length) {
        slides = slides.concat(movesFrom(i, 0));
      }
    }

    return jumps.length ? jumps : slides;
  }

  /**
   * Moves available to the piece on one cell
   * @param i The cell index of the piece
   * @param jumping 1 for jump moves, 0 for simple moves
   * @returns {number[]} Encoded moves
   */
  function movesFrom(i, jumping) {
    'ram';
    const v = board[i];
    const fwd = v & 1 ? 1 : -1; // AI men move down, player men move up
    const list = [];
    let d, dr, dc, r, c, mid;

    for (d = 0; d < 4; d++) {
      if (d > 1 && v < 3) {
        // Men cannot move backward
        break;
      }

      dr = d < 2 ? fwd : -fwd;
      dc = d & 1 ? 1 : -1;
      r = (i >> 3) + dr;
      c = (i & 7) + dc;

      if (jumping) {
        if (r < 0 || r > 7 || c < 0 || c > 7) {
          continue;
        }

        mid = board[r * 8 + c];
        r += dr;
        c += dc;

        // Need an enemy piece adjacent and an empty cell beyond it
        if (r < 0 || r > 7 || c < 0 || c > 7) {
          continue;
        }

        if (!mid || (mid & 1) === (v & 1) || board[r * 8 + c]) {
          continue;
        }

        list.push(i | ((r * 8 + c) << 6) | (((r - dr) * 8 + c - dc) << 12));
      } else {
        if (r < 0 || r > 7 || c < 0 || c > 7 || board[r * 8 + c]) {
          continue;
        }

        list.push(i | ((r * 8 + c) << 6) | (64 << 12));
      }
    }

    return list;
  }

  function onLeftScrollWheel(direction) {
    if (!direction) {
      // Pressed
      select();

      return;
    }

    if (state) {
      // AI turn or game over
      return;
    }

    const r = (cursor >> 3) + direction;

    if (r < 0 || r > 7) {
      return;
    }

    cursor += direction * 8;

    if (Pip.playSound) {
      Pip.playSound('SCROLL');
    }

    draw();
  }

  function onRightScrollWheel(direction) {
    if (!direction || state) {
      return;
    }

    const c = (cursor & 7) + direction;

    if (c < 0 || c > 7) {
      return;
    }

    cursor += direction;

    if (Pip.playSound) {
      Pip.playSound('SCROLL');
    }

    draw();
  }

  function remove() {
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }

    Pip.removeListener('knob1', onLeftScrollWheel);
    Pip.removeListener('knob2', onRightScrollWheel);
  }

  /**
   * Reset the board and start a new game
   * @returns {void} Nothing
   */
  function reset() {
    board = new Uint8Array(64);

    let i;

    for (i = 0; i < 24; i++) {
      if (((i >> 3) + (i & 7)) & 1) {
        board[i] = 1; // AI men on the top three rows
      }
    }

    for (i = 40; i < 64; i++) {
      if (((i >> 3) + (i & 7)) & 1) {
        board[i] = 2; // Player men on the bottom three rows
      }
    }

    chainFrom = -1;
    cursor = 41;
    selected = -1;
    selectedMoves = [];
    state = 0;
    winner = 0;
    turnMoves = legalMoves(1);
  }

  /**
   * Handle a confirm press on the cursor cell
   * @returns {void} Nothing
   */
  function select() {
    if (state === 2) {
      // Game over, play again
      reset();
      draw();

      return;
    }

    if (state === 1) {
      // AI turn
      return;
    }

    // Is the cursor on a destination of the selected piece?
    let i,
      dest = -1;

    for (i = 0; i < selectedMoves.length; i++) {
      if (((selectedMoves[i] >> 6) & 63) === cursor) {
        dest = selectedMoves[i];
        break;
      }
    }

    if (dest >= 0) {
      const to = (dest >> 6) & 63;
      const promoted = applyMove(dest);

      cursor = to;

      if (Pip.playSound) {
        Pip.playSound('TAB');
      }

      // A capture that did not promote may continue jumping
      if (dest >> 12 !== 64 && !promoted) {
        selectedMoves = movesFrom(to, 1);

        if (selectedMoves.length) {
          chainFrom = to;
          selected = to;
          draw();

          return;
        }
      }

      // Turn over, hand off to the AI
      chainFrom = -1;
      selected = -1;
      selectedMoves = [];
      state = 1;
      draw();
      aiTimer = setTimeout(aiPlay, 500);

      return;
    }

    if (chainFrom >= 0) {
      // Mid multi-jump the chain must be finished, only the
      // highlighted landing squares are valid presses
      return;
    }

    if (selected === cursor) {
      // Deselect
      selected = -1;
      selectedMoves = [];

      if (Pip.playSound) {
        Pip.playSound('TAB');
      }

      draw();

      return;
    }

    if (board[cursor] && !(board[cursor] & 1)) {
      // Select a player piece, jumps elsewhere on the board are
      // forced so turnMoves may exclude this piece entirely
      const mine = turnMoves.filter(function (m) {
        return (m & 63) === cursor;
      });

      if (mine.length) {
        selected = cursor;
        selectedMoves = mine;

        if (Pip.playSound) {
          Pip.playSound('TAB');
        }

        draw();
      }
    }
  }

  reset();

  Pip.onExclusive('knob1', onLeftScrollWheel);
  Pip.onExclusive('knob2', onRightScrollWheel);

  draw();

  return { remove: remove };
});
