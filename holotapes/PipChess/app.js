(function () {
  let removed = false;
  let instance;

  const SQUARE_SIZE = 26;
  const BOARD_X = 20;
  const BOARD_Y = 52;
  const BASE_COLOR = 3;
  const HIGHLIGHT_COLOR = 2;

  let board = [
    'r',
    'n',
    'b',
    'q',
    'k',
    'b',
    'n',
    'r',
    'p',
    'p',
    'p',
    'p',
    'p',
    'p',
    'p',
    'p',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    '.',
    'P',
    'P',
    'P',
    'P',
    'P',
    'P',
    'P',
    'P',
    'R',
    'N',
    'B',
    'Q',
    'K',
    'B',
    'N',
    'R',
  ];

  let phase = 'MAIN_MENU';
  let menuSel = 0;
  let winner = '';
  let turn = 'WHITE';
  let curR = 6;
  let curC = 0;
  let origR = -1;
  let origC = -1;
  let statusMsg = 'PICK PIECE';
  let checkP = '';
  let validTargets = new Array(64);
  let promoR = -1;
  let promoC = -1;
  let wKingR = 7;
  let wKingC = 4;
  let bKingR = 0;
  let bKingC = 4;
  let wKingM = false;
  let wRookAM = false;
  let wRookHM = false;
  let bKingM = false;
  let bRookAM = false;
  let bRookHM = false;
  let epCol = -1;
  let loneMoves = 0;
  let drawRes = '';
  let gameMode = 'TWO_PLAYER';
  let diff = 'NORMAL';

  let aiRow = 0;
  let aiMoves = [];

  function playSound(type) {
    if (Pip.playSound) {
      try {
        Pip.playSound(type);
      } catch (e) {}
    }
  }

  function isP(char, player) {
    if (char === '.') return false;
    return player === 'WHITE'
      ? char === char.toUpperCase()
      : char !== char.toUpperCase();
  }

  function calculateValidMovesCache(or, oc, piece) {
    for (let i = 0; i < 64; i++) validTargets[i] = false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        validTargets[r * 8 + c] = isValidMove(or, oc, r, c, piece, false);
      }
    }
  }

  function resetGame() {
    board = [
      'r',
      'n',
      'b',
      'q',
      'k',
      'b',
      'n',
      'r',
      'p',
      'p',
      'p',
      'p',
      'p',
      'p',
      'p',
      'p',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      'P',
      'P',
      'P',
      'P',
      'P',
      'P',
      'P',
      'P',
      'R',
      'N',
      'B',
      'Q',
      'K',
      'B',
      'N',
      'R',
    ];
    turn = 'WHITE';
    phase = 'SELECT_PIECE';
    curR = 6;
    curC = 0;
    origR = -1;
    origC = -1;
    statusMsg = 'PICK PIECE';
    checkP = '';
    winner = '';
    promoR = -1;
    promoC = -1;
    wKingR = 7;
    wKingC = 4;
    bKingR = 0;
    bKingC = 4;
    wKingM = false;
    wRookAM = false;
    wRookHM = false;
    bKingM = false;
    bRookAM = false;
    bRookHM = false;
    epCol = -1;
    loneMoves = 0;
    drawRes = '';
    for (let i = 0; i < 64; i++) validTargets[i] = false;
  }

  function isKingInCheck(playerColor) {
    let kr = playerColor === 'WHITE' ? wKingR : bKingR;
    let kc = playerColor === 'WHITE' ? wKingC : bKingC;
    if (kr === -1 || kc === -1) return false;
    const enemy = playerColor === 'WHITE' ? 'BLACK' : 'WHITE';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        let p = board[r * 8 + c];
        if (p !== '.' && isP(p, enemy)) {
          if (isValidMove(r, c, kr, kc, p, true)) return true;
        }
      }
    }
    return false;
  }

  function hasLegalMoves(playerColor) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        let p = board[r * 8 + c];
        if (p === '.' || !isP(p, playerColor)) continue;
        for (let tr = 0; tr < 8; tr++) {
          for (let tc = 0; tc < 8; tc++) {
            if (isValidMove(r, c, tr, tc, p, false)) return true;
          }
        }
      }
    }
    return false;
  }

  function countPieces(playerColor) {
    let count = 0;
    for (let i = 0; i < 64; i++) {
      if (board[i] !== '.' && isP(board[i], playerColor)) count++;
    }
    return count;
  }

  function isValidMove(or, oc, tr, tc, piece, skipKingCheck) {
    const pieceTurn = piece === piece.toUpperCase() ? 'WHITE' : 'BLACK';
    if (isP(board[tr * 8 + tc], pieceTurn)) return false;

    const rDiff = tr - or,
      cDiff = tc - oc;
    const absR = Math.abs(rDiff),
      absC = Math.abs(cDiff);
    const target = board[tr * 8 + tc];
    const type = piece.toUpperCase();

    let geoValid = false;

    if (type === 'P') {
      const dir = pieceTurn === 'WHITE' ? -1 : 1;
      if (cDiff === 0 && rDiff === dir && target === '.') geoValid = true;
      else if (
        cDiff === 0 &&
        or === (pieceTurn === 'WHITE' ? 6 : 1) &&
        rDiff === 2 * dir &&
        board[(or + dir) * 8 + oc] === '.' &&
        target === '.'
      )
        geoValid = true;
      else if (absC === 1 && rDiff === dir && target !== '.') geoValid = true;
      else if (absC === 1 && rDiff === dir && target === '.' && epCol === tc) {
        if (pieceTurn === 'WHITE' && or === 3) geoValid = true;
        if (pieceTurn === 'BLACK' && or === 4) geoValid = true;
      }
    } else if (type === 'N') {
      geoValid = (absR === 2 && absC === 1) || (absR === 1 && absC === 2);
    } else if (type === 'K') {
      if (absR <= 1 && absC <= 1) geoValid = true;
      if (!skipKingCheck && rDiff === 0 && absC === 2) {
        const kingMoved = pieceTurn === 'WHITE' ? wKingM : bKingM;
        if (!kingMoved && !isKingInCheck(pieceTurn)) {
          if (tc === 6) {
            const rookMoved = pieceTurn === 'WHITE' ? wRookHM : bRookHM;
            if (
              !rookMoved &&
              board[or * 8 + 5] === '.' &&
              board[or * 8 + 6] === '.'
            ) {
              board[or * 8 + 5] = piece;
              board[or * 8 + oc] = '.';
              let safe = !isKingInCheck(pieceTurn);
              board[or * 8 + oc] = piece;
              board[or * 8 + 5] = '.';
              if (safe) geoValid = true;
            }
          } else if (tc === 2) {
            const rookMoved = pieceTurn === 'WHITE' ? wRookAM : bRookAM;
            if (
              !rookMoved &&
              board[or * 8 + 1] === '.' &&
              board[or * 8 + 2] === '.' &&
              board[or * 8 + 3] === '.'
            ) {
              board[or * 8 + 3] = piece;
              board[or * 8 + oc] = '.';
              let safe = !isKingInCheck(pieceTurn);
              board[or * 8 + oc] = piece;
              board[or * 8 + 3] = '.';
              if (safe) geoValid = true;
            }
          }
        }
      }
    } else if (type === 'R' || type === 'B' || type === 'Q') {
      if (type === 'R' && rDiff !== 0 && cDiff !== 0) return false;
      if (type === 'B' && absR !== absC) return false;
      if (type === 'Q' && rDiff !== 0 && cDiff !== 0 && absR !== absC)
        return false;

      geoValid = true;
      let sR = rDiff === 0 ? 0 : rDiff > 0 ? 1 : -1;
      let sC = cDiff === 0 ? 0 : cDiff > 0 ? 1 : -1;
      let curR = or + sR,
        curC = oc + sC;
      while (curR !== tr || curC !== tc) {
        if (board[curR * 8 + curC] !== '.') {
          geoValid = false;
          break;
        }
        curR += sR;
        curC += sC;
      }
    }

    if (!geoValid) return false;

    if (!skipKingCheck) {
      let oldS = board[or * 8 + oc],
        oldT = board[tr * 8 + tc];
      let isEP = type === 'P' && absC === 1 && oldT === '.';
      let epRow = pieceTurn === 'WHITE' ? 3 : 4;
      let oldEP = isEP ? board[epRow * 8 + tc] : '.';
      if (isEP) board[epRow * 8 + tc] = '.';

      board[tr * 8 + tc] = oldS;
      board[or * 8 + oc] = '.';
      let saveR = type === 'K' ? (pieceTurn === 'WHITE' ? wKingR : bKingR) : -1;
      let saveC = type === 'K' ? (pieceTurn === 'WHITE' ? wKingC : bKingC) : -1;
      if (type === 'K') {
        if (pieceTurn === 'WHITE') {
          wKingR = tr;
          wKingC = tc;
        } else {
          bKingR = tr;
          bKingC = tc;
        }
      }
      let checkFlag = isKingInCheck(pieceTurn);

      board[or * 8 + oc] = oldS;
      board[tr * 8 + tc] = oldT;
      if (isEP) board[epRow * 8 + tc] = oldEP;
      if (type === 'K') {
        if (pieceTurn === 'WHITE') {
          wKingR = saveR;
          wKingC = saveC;
        } else {
          bKingR = saveR;
          bKingC = saveC;
        }
      }
      if (checkFlag) return false;
    }
    return true;
  }

  function processAIRow() {
    if (phase !== 'AI_THINKING') return;

    for (let c = 0; c < 8; c++) {
      let p = board[aiRow * 8 + c];
      if (p !== '.' && isP(p, 'BLACK')) {
        for (let tr = 0; tr < 8; tr++) {
          for (let tc = 0; tc < 8; tc++) {
            if (isValidMove(aiRow, c, tr, tc, p, false)) {
              let isCastling =
                p.toUpperCase() === 'K' && Math.abs(tc - c) === 2;
              let isEnPassant =
                p === 'p' &&
                tc === epCol &&
                c !== tc &&
                board[tr * 8 + tc] === '.';

              if (diff === 'EASY' && (isCastling || isEnPassant)) continue;
              if (diff === 'NORMAL' && isEnPassant) continue;

              let score = 0;
              let target = board[tr * 8 + tc];
              let tu = target.toUpperCase();

              if (diff === 'EASY') {
                if (target !== '.') {
                  if (tu === 'P') score += 10;
                  else if (tu === 'N' || tu === 'B') score += 30;
                  else if (tu === 'R') score += 50;
                  else if (tu === 'Q') score += 90;
                }
                score += Math.random() * 150;
              } else if (diff === 'NORMAL') {
                if (target !== '.') {
                  if (tu === 'P') score += 100;
                  else if (tu === 'N' || tu === 'B') score += 300;
                  else if (tu === 'R') score += 500;
                  else if (tu === 'Q') score += 900;
                }
                if (tr >= 3 && tr <= 4 && tc >= 3 && tc <= 4) score += 15;
                if (p === 'p') score += aiRow * 2;
                score += Math.random() * 40;
              } else if (diff === 'HARD') {
                if (target !== '.') {
                  if (tu === 'P') score += 150;
                  else if (tu === 'N' || tu === 'B') score += 400;
                  else if (tu === 'R') score += 650;
                  else if (tu === 'Q') score += 1200;
                }
                if (isCastling) score += 60;
                if (isEnPassant) score += 40;
                if (tr >= 2 && tr <= 5 && tc >= 2 && tc <= 5) {
                  score += tr >= 3 && tr <= 4 && tc >= 3 && tc <= 4 ? 35 : 15;
                }
                if (p === 'p') score += aiRow * 4;
                score += Math.random() * 5;
              }

              aiMoves.push({
                or: aiRow,
                oc: c,
                tr: tr,
                tc: tc,
                piece: p,
                score: score,
              });
            }
          }
        }
      }
    }

    aiRow++;
    if (aiRow < 8) {
      setTimeout(processAIRow, 40);
    } else {
      executeAIMove();
    }
  }

  function executeAIMove() {
    if (aiMoves.length === 0) return;

    aiMoves.sort(function (a, b) {
      return b.score - a.score;
    });
    let choice = aiMoves[0];

    let nextEpTarget = -1;
    let p = choice.piece;

    if (
      p.toUpperCase() === 'P' &&
      choice.tc === epCol &&
      choice.oc !== choice.tc &&
      board[choice.tr * 8 + choice.tc] === '.'
    ) {
      board[4 * 8 + choice.tc] = '.';
    }

    if (p.toUpperCase() === 'K' && Math.abs(choice.tc - choice.oc) === 2) {
      if (choice.tc === 6) {
        board[choice.tr * 8 + 5] = board[choice.tr * 8 + 7];
        board[choice.tr * 8 + 7] = '.';
      } else if (choice.tc === 2) {
        board[choice.tr * 8 + 3] = board[choice.tr * 8 + 0];
        board[choice.tr * 8 + 0] = '.';
      }
    }

    if (p.toUpperCase() === 'P' && Math.abs(choice.tr - choice.or) === 2) {
      nextEpTarget = choice.tc;
    }

    if (p === 'k') bKingM = true;
    if (p === 'r' && choice.or === 0 && choice.oc === 0) bRookAM = true;
    if (p === 'r' && choice.or === 0 && choice.oc === 7) bRookHM = true;

    board[choice.or * 8 + choice.oc] = '.';
    board[choice.tr * 8 + choice.tc] = p;
    epCol = nextEpTarget;

    if (p === 'k') {
      bKingR = choice.tr;
      bKingC = choice.tc;
    }

    if (p === 'p' && choice.tr === 7) {
      board[choice.tr * 8 + choice.tc] = 'q';
    }

    playSound('SELECT');
    resolvePostMoveEffects();
  }

  function drawBtn(label, yPos, isSelected) {
    if (isSelected) {
      h.setColor(BASE_COLOR).fillRect(130, yPos, 350, yPos + 32);
      h.setColor(1);
    } else {
      h.setColor(BASE_COLOR).drawRect(130, yPos, 350, yPos + 32);
    }
    h.drawString(label, 240, yPos + 16);
  }

  function resolvePostMoveEffects() {
    if (countPieces('WHITE') === 1 && countPieces('BLACK') === 1) {
      winner = 'DRAW';
      drawRes = 'LONE_KINGS';
      phase = 'GAME_OVER_SCREEN';
      menuSel = 0;
      for (let i = 0; i < 64; i++) validTargets[i] = false;
      draw();
      return;
    }

    if (countPieces('WHITE') === 1 || countPieces('BLACK') === 1) {
      if (countPieces(turn) === 1) loneMoves++;
    } else {
      loneMoves = 0;
    }

    if (loneMoves >= 15) {
      winner = 'STALEMATE';
      drawRes = '15_MOVE_RULE';
      phase = 'GAME_OVER_SCREEN';
      menuSel = 0;
      for (let i = 0; i < 64; i++) validTargets[i] = false;
      draw();
      return;
    }

    let nextTurn = turn === 'WHITE' ? 'BLACK' : 'WHITE';
    let nextCheck = isKingInCheck(nextTurn);

    if (!hasLegalMoves(nextTurn)) {
      if (nextCheck) winner = turn;
      else {
        winner = 'DRAW';
        drawRes = 'STALEMATE';
      }
      phase = 'GAME_OVER_SCREEN';
      menuSel = 0;
    } else {
      turn = nextTurn;
      phase = 'SELECT_PIECE';
      statusMsg = 'PICK PIECE';
      checkP = nextCheck ? nextTurn : '';
      if (nextCheck) playSound('ALARM');

      if (gameMode === 'SINGLE_PLAYER' && turn === 'BLACK') {
        phase = 'AI_THINKING';
        statusMsg = 'AI COMPUTING...';
        aiRow = 0;
        aiMoves = [];
        draw();
        setTimeout(processAIRow, 400);
      }
    }
    for (let i = 0; i < 64; i++) validTargets[i] = false;
    draw();
  }

  function draw() {
    h.clear(1);
    if (phase === 'MAIN_MENU') {
      h.setColor(BASE_COLOR)
        .setFontMonofonto28()
        .setFontAlign(0, 0)
        .drawString('PipChess', 240, 50);
      h.drawLine(80, 75, 400, 75);
      h.setFontMonofonto18();
      drawBtn('2 Player Mode', 130, menuSel === 0);
      drawBtn('Single Player Mode', 180, menuSel === 1);
      h.setFontMonofonto16().drawString(
        'Rotate any dial to navigate. Click to select.',
        240,
        270,
      );
      return;
    }
    if (phase === 'DIFFICULTY_MENU') {
      h.setColor(BASE_COLOR)
        .setFontMonofonto28()
        .setFontAlign(0, 0)
        .drawString('AI Difficulty', 240, 45);
      h.drawLine(80, 68, 400, 68);
      h.setFontMonofonto18();
      drawBtn('Easy Mode', 110, menuSel === 0);
      drawBtn('Normal Mode', 150, menuSel === 1);
      drawBtn('Hard Mode', 190, menuSel === 2);
      h.setFontMonofonto16().drawString(
        'Select opponent skill level.',
        240,
        270,
      );
      return;
    }
    if (phase === 'PROMOTION_MENU') {
      let displayColor = turn === 'WHITE' ? 'White' : 'Black';
      h.setColor(BASE_COLOR)
        .setFontMonofonto18()
        .setFontAlign(0, 0)
        .drawString(displayColor + ', Choose Your Promotion', 240, 45);
      drawBtn('Queen', 85, menuSel === 0);
      drawBtn('Bishop', 125, menuSel === 1);
      drawBtn('Rook', 165, menuSel === 2);
      drawBtn('Knight', 205, menuSel === 3);
      return;
    }
    if (phase === 'GAME_OVER_SCREEN') {
      h.setColor(BASE_COLOR)
        .setFontMonofonto28()
        .setFontAlign(0, 0)
        .drawString('GAME OVER', 240, 45);
      h.setFontMonofonto16();

      let endMsg = 'Draw Match.';
      if (winner === 'WHITE') endMsg = 'Black has been Checkmated. White Wins!';
      else if (winner === 'BLACK')
        endMsg = 'White has been Checkmated. Black Wins!';
      else if (winner === 'DRAW') {
        if (drawRes === 'STALEMATE') endMsg = 'Stalemate! No legal moves left.';
        else if (drawRes === '15_MOVE_RULE') endMsg = 'Draw: 15-Move Rule met.';
        else if (drawRes === 'LONE_KINGS') endMsg = 'Stalemate, Lone Kings';
      }

      h.drawString(endMsg, 240, 85);
      drawBtn('Play Again', 125, menuSel === 0);
      drawBtn('Main Menu', 165, menuSel === 1);
      h.setColor(BASE_COLOR).drawString('Press the "ITEMS" button', 240, 245);
      h.drawString('on your Pip-Boy to exit', 240, 265);
      return;
    }

    h.setColor(BASE_COLOR)
      .drawLine(0, 44, 480, 44)
      .setFontMonofonto28()
      .setFontAlign(0, 0)
      .drawString('PipChess v2.0.0', 240, 25);
    if (phase === 'SELECT_TARGET') {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (r === origR && c === origC)
            h.setColor(BASE_COLOR).fillRect(
              BOARD_X + c * SQUARE_SIZE + 1,
              BOARD_Y + r * SQUARE_SIZE + 1,
              BOARD_X + c * SQUARE_SIZE + SQUARE_SIZE - 1,
              BOARD_Y + r * SQUARE_SIZE + SQUARE_SIZE - 1,
            );
          else if (validTargets[r * 8 + c])
            h.setColor(HIGHLIGHT_COLOR).fillRect(
              BOARD_X + c * SQUARE_SIZE + 1,
              BOARD_Y + r * SQUARE_SIZE + 1,
              BOARD_X + c * SQUARE_SIZE + SQUARE_SIZE - 1,
              BOARD_Y + r * SQUARE_SIZE + SQUARE_SIZE - 1,
            );
        }
      }
    }
    h.setColor(BASE_COLOR);
    for (let i = 0; i <= 8; i++) {
      h.drawLine(
        BOARD_X,
        BOARD_Y + i * SQUARE_SIZE,
        BOARD_X + 8 * SQUARE_SIZE,
        BOARD_Y + i * SQUARE_SIZE,
      );
      h.drawLine(
        BOARD_X + i * SQUARE_SIZE,
        BOARD_Y,
        BOARD_X + i * SQUARE_SIZE,
        BOARD_Y + 8 * SQUARE_SIZE,
      );
    }
    let tx = BOARD_X + curC * SQUARE_SIZE,
      ty = BOARD_Y + curR * SQUARE_SIZE;
    h.drawRect(tx + 1, ty + 1, tx + SQUARE_SIZE - 1, ty + SQUARE_SIZE - 1);

    h.setFontMonofonto18()
      .setFontAlign(-1, -1)
      .drawString('TURN: ' + turn, 245, 60);
    h.drawString('STATUS: ' + statusMsg, 245, 90);

    h.setFontMonofonto14();
    if (phase === 'SELECT_PIECE') {
      h.drawString('Left Knob: Up/Down', 245, 120);
      h.drawString('Right Knob: L/R', 245, 140);
      h.drawString('Click: Select Piece', 245, 160);
    } else if (phase === 'SELECT_TARGET') {
      h.drawString('Move cursor to target', 245, 120);
      h.drawString('Click target to move', 245, 140);
      h.drawString('Click origin to cancel', 245, 160);
    } else if (phase === 'AI_THINKING') {
      h.drawString('Matrix calculations', 245, 120);
      h.drawString('running...', 245, 140);
    }

    h.setFontMonofonto14().setFontAlign(0, 0);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        let p = board[r * 8 + c];
        if (p !== '.') {
          let isWhite = p === p.toUpperCase();
          h.setColor(
            phase === 'SELECT_TARGET' && r === origR && c === origC
              ? 1
              : BASE_COLOR,
          );
          let disp = isWhite ? p : '[' + p.toUpperCase() + ']';
          let yNudge = isWhite ? 16 : 14;
          h.drawString(
            disp,
            BOARD_X + c * SQUARE_SIZE + 13,
            BOARD_Y + r * SQUARE_SIZE + yNudge,
          );
        }
      }
    }

    if (checkP !== '') {
      h.setColor(BASE_COLOR).setFontMonofonto16().setFontAlign(-1, -1);
      h.drawString(checkP + ' KING CHECK!', 245, 190);
    }
  }

  function handleSelectionClick() {
    if (phase === 'MAIN_MENU') {
      playSound('SELECT');
      if (menuSel === 0) {
        gameMode = 'TWO_PLAYER';
        resetGame();
      } else if (menuSel === 1) {
        phase = 'DIFFICULTY_MENU';
        menuSel = 0;
      }
      draw();
      return;
    }
    if (phase === 'DIFFICULTY_MENU') {
      playSound('SELECT');
      if (menuSel === 0) diff = 'EASY';
      else if (menuSel === 1) diff = 'NORMAL';
      else if (menuSel === 2) diff = 'HARD';
      gameMode = 'SINGLE_PLAYER';
      resetGame();
      draw();
      return;
    }
    if (phase === 'PROMOTION_MENU') {
      playSound('SELECT');
      let pc =
        menuSel === 0 ? 'Q' : menuSel === 1 ? 'B' : menuSel === 2 ? 'R' : 'N';
      if (turn === 'BLACK') pc = pc.toLowerCase();
      board[promoR * 8 + promoC] = pc;
      resolvePostMoveEffects();
      return;
    }
    if (phase === 'GAME_OVER_SCREEN') {
      playSound('SELECT');
      if (menuSel === 0) {
        resetGame();
      } else if (menuSel === 1) {
        phase = 'MAIN_MENU';
        menuSel = 0;
      }
      draw();
      return;
    }
    if (phase === 'AI_THINKING') return;

    if (phase === 'SELECT_PIECE') {
      if (isP(board[curR * 8 + curC], turn)) {
        playSound('SELECT');
        origR = curR;
        origC = curC;
        phase = 'SELECT_TARGET';
        statusMsg = 'DESTINATION';
        calculateValidMovesCache(origR, origC, board[origR * 8 + origC]);
        draw();
      } else playSound('CANCELED');
    } else if (phase === 'SELECT_TARGET') {
      if (curR === origR && curC === origC) {
        playSound('SELECT');
        phase = 'SELECT_PIECE';
        statusMsg = 'PICK PIECE';
        for (let i = 0; i < 64; i++) validTargets[i] = false;
        draw();
        return;
      }
      if (validTargets[curR * 8 + curC]) {
        playSound('SELECT');
        let p = board[origR * 8 + origC];
        let nextEpTarget = -1;

        if (
          p.toUpperCase() === 'P' &&
          curC === epCol &&
          curC !== origC &&
          board[curR * 8 + curC] === '.'
        ) {
          let captureRow = turn === 'WHITE' ? 3 : 4;
          board[captureRow * 8 + curC] = '.';
        }

        if (p.toUpperCase() === 'K' && Math.abs(curC - origC) === 2) {
          if (curC === 6) {
            board[curR * 8 + 5] = board[curR * 8 + 7];
            board[curR * 8 + 7] = '.';
          } else if (curC === 2) {
            board[curR * 8 + 3] = board[curR * 8 + 0];
            board[curR * 8 + 0] = '.';
          }
        }

        if (p.toUpperCase() === 'P' && Math.abs(curR - origR) === 2) {
          nextEpTarget = curC;
        }

        if (p === 'K') wKingM = true;
        if (p === 'k') bKingM = true;
        if (p === 'R' && origR === 7 && origC === 0) wRookAM = true;
        if (p === 'R' && origR === 7 && origC === 7) wRookHM = true;
        if (p === 'r' && origR === 0 && origC === 0) bRookAM = true;
        if (p === 'r' && origR === 0 && origC === 7) bRookHM = true;

        board[origR * 8 + origC] = '.';
        board[curR * 8 + curC] = p;
        epCol = nextEpTarget;

        if (p === 'K') {
          wKingR = curR;
          wKingC = curC;
        }
        if (p === 'k') {
          bKingR = curR;
          bKingC = curC;
        }

        if (p.toUpperCase() === 'P' && (curR === 0 || curR === 7)) {
          promoR = curR;
          promoC = curC;
          phase = 'PROMOTION_MENU';
          menuSel = 0;
          for (let i = 0; i < 64; i++) validTargets[i] = false;
          draw();
          return;
        }
        resolvePostMoveEffects();
      } else {
        statusMsg = 'INVALID MOVE';
        playSound('CANCELED');
        draw();
      }
    }
  }

  function handleMenuScroll(dir, max) {
    menuSel = dir > 0 ? (menuSel + 1) % max : (menuSel - 1 + max) % max;
    draw();
  }

  function onWheel(knob, dir) {
    if (phase === 'AI_THINKING') return;
    if (dir === 0) {
      handleSelectionClick();
      return;
    }
    playSound('SCROLL');
    if (phase === 'MAIN_MENU') {
      handleMenuScroll(dir, 2);
      return;
    }
    if (phase === 'DIFFICULTY_MENU') {
      handleMenuScroll(dir, 3);
      return;
    }
    if (phase === 'PROMOTION_MENU') {
      handleMenuScroll(dir, 4);
      return;
    }
    if (phase === 'GAME_OVER_SCREEN') {
      handleMenuScroll(dir, 2);
      return;
    }
    if (knob === 1) curR = dir > 0 ? (curR + 1) % 8 : (curR - 1 + 8) % 8;
    else curC = dir > 0 ? (curC + 1) % 8 : (curC - 1 + 8) % 8;
    draw();
  }

  if (Pip.audioStop) Pip.audioStop();
  for (let i = 0; i < 64; i++) validTargets[i] = false;
  Pip.onExclusive('knob1', function (d) {
    onWheel(1, d);
  });
  Pip.onExclusive('knob2', function (d) {
    onWheel(2, d);
  });
  draw();

  instance = {
    id: 'pipchess',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      if (removed) return;
      removed = true;
      Pip.removeListener('knob1');
      Pip.removeListener('knob2');
      if (Pip.audioStop) Pip.audioStop();
      h.clear();
    },
  };
  return instance;
});
