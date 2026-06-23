//PIP-TAC-TOE
//First espruino project I've made for the Wand Company Pip-Boy Mk.V, hope you enjoy!
//github.com/Pip-4111
// Fixes, updates, and other contributions by James L. Denson
// Pip-Boy 3000 / 3000a Holotape Edition by James L. Denson
// Sound effects used from Public Domain sources
(function () {
  const APP_ID = 'PIPTACTOE';

  let oldCurrent = Pip.CURRENT,
    oldDisable = Pip.blitOptions && Pip.blitOptions.disable;

  if (Pip.blitOptions) {
    Pip.blitOptions.disable = false;
  }

  let bC = h,
    screenWidth = bC.getWidth(),
    screenHeight = bC.getHeight(),
    currentPlayer = 'X',
    board = [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ],
    cursorX = 0,
    cursorY = 0,
    gameOver = false,
    inMenu = true,
    menuOptions = ['2 PLAYER', 'VS CPU'],
    menuSelection = 0,
    vsCPU = false,
    snd_Start = '/HOLO/PIPTACTOE/StartGame.wav',
    snd_Play = '/HOLO/PIPTACTOE/StartPlay.wav',
    snd_X = '/HOLO/PIPTACTOE/PlaceX.wav',
    snd_O = '/HOLO/PIPTACTOE/PlaceO.wav',
    snd_Win = '/HOLO/PIPTACTOE/Winner.wav',
    snd_Draw = '/HOLO/PIPTACTOE/Tied.wav',
    snd_Lose = '/HOLO/PIPTACTOE/Loser.wav';

  const spacing = 10,
    cellWidth = 50,
    cellHeight = 50;
  const boardWidth = 3 * cellWidth + 2 * spacing;
  const boardHeight = 3 * cellHeight + 2 * spacing;
  const offsetX = (screenWidth - boardWidth) / 2 + 0;
  const offsetY = (screenHeight - boardHeight) / 2 - 18;

  // Play Sounds
  function playSound(name) {
    try {
      Pip.audioStop();
      Pip.audioStart(name);
    } catch (e) {}
  }

  // Brighten things up overall
  function drawBoard() {
    bC.clear();
    bC.setFont('6x8', 4);
    bC.setColor(1, 1, 1);
    bC.setBgColor(0, 0, 0);

    const thickness = 3;
    for (let i = 1; i < 3; i++) {
      let x = offsetX + i * (cellWidth + spacing) - spacing / 2;
      let y = offsetY + i * (cellHeight + spacing) - spacing / 2;
      for (
        let dx = -Math.floor(thickness / 2);
        dx <= Math.floor(thickness / 2);
        dx++
      ) {
        bC.drawLine(x + dx, offsetY, x + dx, offsetY + boardHeight);
      }

      for (
        let dy = -Math.floor(thickness / 2);
        dy <= Math.floor(thickness / 2);
        dy++
      ) {
        bC.drawLine(offsetX, y + dy, offsetX + boardWidth, y + dy);
      }
    }

    bC.setFontAlign(0, 0);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        let val = board[y][x] || ' ';
        let cellCX =
          offsetX + x * (cellWidth + spacing) + Math.round(cellWidth / 2);
        let cellCY =
          offsetY + y * (cellHeight + spacing) + Math.round(cellHeight / 2);
        bC.drawString(val, cellCX, cellCY);
      }
    }
    bC.setFontAlign(-1, -1);

    let boxX1 = offsetX + cursorX * (cellWidth + spacing) - 2;
    let boxY1 = offsetY + cursorY * (cellHeight + spacing) - 2;
    let boxX2 = boxX1 + cellWidth + 4;
    let boxY2 = boxY1 + cellHeight + 4;
    bC.drawRect(boxX1, boxY1, boxX2, boxY2);

    if (!gameOver) {
      bC.setFont('6x8', 3);
      bC.setFontAlign(0, 0);
      let turnMsg = `Player ${currentPlayer}'s turn.`;
      let msgY = screenHeight - 16;
      bC.drawString(turnMsg, Math.round(screenWidth / 2), msgY);
      bC.setFontAlign(-1, -1);
    }

    bC.flip();
  }

  function checkWin() {
    const lines = [
      board[0],
      board[1],
      board[2],
      [board[0][0], board[1][0], board[2][0]],
      [board[0][1], board[1][1], board[2][1]],
      [board[0][2], board[1][2], board[2][2]],
      [board[0][0], board[1][1], board[2][2]],
      [board[0][2], board[1][1], board[2][0]],
    ];
    for (let line of lines) {
      if (line.every((cell) => cell === 'X')) return 'X';
      if (line.every((cell) => cell === 'O')) return 'O';
    }
    for (let row of board) {
      if (row.includes('')) return null;
    }
    return 'Draw';
  }

  function checkWinner(b) {
    const lines = [
      b[0],
      b[1],
      b[2],
      [b[0][0], b[1][0], b[2][0]],
      [b[0][1], b[1][1], b[2][1]],
      [b[0][2], b[1][2], b[2][2]],
      [b[0][0], b[1][1], b[2][2]],
      [b[0][2], b[1][1], b[2][0]],
    ];
    for (let line of lines) {
      if (line.every((cell) => cell === 'X')) return 'X';
      if (line.every((cell) => cell === 'O')) return 'O';
    }
    for (let row of b) {
      if (row.includes('')) return null;
    }
    return 'Draw';
  }

  function minimax(b, depth, isMaximizing) {
    let result = checkWinner(b);
    if (result !== null) {
      if (result === 'O') return 10 - depth;
      else if (result === 'X') return depth - 10;
      return 0;
    }

    if (depth >= 2) return 0;

    let bestScore = isMaximizing ? -Infinity : Infinity;

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (b[i][j] === '') {
          b[i][j] = isMaximizing ? 'O' : 'X';
          let score = minimax(b, depth + 1, !isMaximizing);
          b[i][j] = '';
          bestScore = isMaximizing
            ? Math.max(score, bestScore)
            : Math.min(score, bestScore);
        }
      }
    }

    return bestScore;
  }

  function getBestMove() {
    let bestScore = -Infinity;
    let bestMove = null;

    let availableMoves = [];
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        if (board[y][x] === '') {
          availableMoves.push({
            x,
            y,
          });
        }
      }
    }

    if (availableMoves.length === 0) return null;

    for (let move of availableMoves) {
      board[move.y][move.x] = 'O';
      let score = minimax(board, 0, false);
      board[move.y][move.x] = '';

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  function showGameOverMessage(result) {
    if (result === 'Draw') {
      playSound(snd_Draw);
    } else if (vsCPU && result === 'O') {
      playSound(snd_Lose);
    } else {
      playSound(snd_Win);
    }
    bC.clear();
    let msg = result === 'Draw' ? "It's a draw!" : `Player ${result} wins!`;
    bC.setFont('6x8', 3);
    bC.setColor(1, 1, 1);
    bC.setBgColor(0, 0, 0);
    bC.setFontAlign(0, 0);
    bC.drawString(
      msg,
      Math.round(screenWidth / 2),
      Math.round(screenHeight / 2),
    );
    bC.setFontAlign(-1, -1);
    bC.flip();

    setTimeout(() => {
      showMainMenu();
    }, 5500); // Set time for end-of-game screen to display
  }

  function placeMark() {
    if (gameOver || board[cursorY][cursorX] !== '') return;

    board[cursorY][cursorX] = currentPlayer;
    playSound(currentPlayer === 'X' ? snd_X : snd_O);
    drawBoard();

    let result = checkWin();
    if (result) {
      gameOver = true;
      setTimeout(function () {
        showGameOverMessage(result);
      }, 750); // Waits half a second after last move to allow for placement sound before End Screen
      return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';

    if (!gameOver && vsCPU && currentPlayer === 'O') {
      setTimeout(cpuMove, 500);
    }
  }

  function cpuMove() {
    if (gameOver || !vsCPU) return;

    let move;

    if (board[1][1] === '') {
      move = {
        x: 1,
        y: 1,
      };
    } else {
      move = getBestMove();
    }

    if (!move) return;

    setTimeout(() => {
      board[move.y][move.x] = 'O';
      playSound(snd_O);
      drawBoard();

      let result = checkWin();
      if (result) {
        gameOver = true;
        showGameOverMessage(result);
        return;
      }

      currentPlayer = 'X';
      drawBoard();
    }, 30); // Changes the pause between Player & CPU turns
  }

  function resetGame() {
    currentPlayer = 'X';
    board = [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ];
    cursorX = 0;
    cursorY = 0;
    gameOver = false;
    bindGameControls();
    drawBoard();
  }

  let leftWheelPressWatch;

  function onGameKnob1(val) {
    if (gameOver) return;
    cursorY = val > 0 ? (cursorY + 1) % 3 : (cursorY + 2) % 3;
    drawBoard();
  }

  function onGameKnob2(val) {
    if (gameOver) return;
    cursorX = val > 0 ? (cursorX + 1) % 3 : (cursorX + 2) % 3;
    drawBoard();
  }

  function onMenuKnob1(val) {
    if (val > 0) {
      menuSelection = (menuSelection + 1) % menuOptions.length;
    } else {
      menuSelection =
        (menuSelection + menuOptions.length - 1) % menuOptions.length;
    }
    drawMenu();
  }

  function bindGameControls() {
    Pip.removeListener('knob1', onMenuKnob1);
    Pip.removeListener('knob1', onGameKnob1);
    Pip.removeListener('knob2', onGameKnob2);

    if (leftWheelPressWatch) {
      clearWatch(leftWheelPressWatch);
      leftWheelPressWatch = undefined;
    }

    Pip.onExclusive('knob1', onGameKnob1);
    Pip.onExclusive('knob2', onGameKnob2);

    if (typeof ENC1_PRESS !== 'undefined') {
      leftWheelPressWatch = setWatch(placeMark, ENC1_PRESS, {
        repeat: true,
        edge: 'rising',
        debounce: 50,
      });
    }
  }

  function exitGame() {
    gameOver = true;
    inMenu = true;
    Pip.removeAllListeners();
    showMainMenu();
  }

  function showMainMenu() {
    inMenu = true;

    drawMenu();

    Pip.removeListener('knob1', onGameKnob1);
    Pip.removeListener('knob2', onGameKnob2);
    Pip.removeListener('knob1', onMenuKnob1);

    if (leftWheelPressWatch) {
      clearWatch(leftWheelPressWatch);
      leftWheelPressWatch = undefined;
    }

    Pip.onExclusive('knob1', onMenuKnob1);

    if (typeof ENC1_PRESS !== 'undefined') {
      leftWheelPressWatch = setWatch(
        function () {
          playSound(snd_Play);
          inMenu = false;
          vsCPU = menuSelection === 1;
          resetGame();
        },
        ENC1_PRESS,
        {
          repeat: true,
          edge: 'rising',
          debounce: 50,
        },
      );
      playSound(snd_Start);
    }
  }

  function drawMenu() {
    bC.clear();
    bC.setFont('6x8', 3);
    bC.setColor(1, 1, 1);
    bC.setBgColor(0, 0, 0);

    let cx = Math.round(screenWidth / 2);

    bC.setFontAlign(0, 0);
    bC.drawString('PIP-TAC-TOE', cx, 50);

    for (let i = 0; i < menuOptions.length; i++) {
      let y = 126 + i * 40;
      let opt = menuOptions[i];
      let halfW = Math.round(bC.stringWidth(opt) / 2);

      if (i === menuSelection) {
        bC.setFontAlign(-1, -1);
        bC.drawRect(cx - halfW - 4, y - 16, cx + halfW + 4, y + 16);
      }

      bC.setFontAlign(0, 0);
      bC.drawString(opt, cx, y);
    }

    bC.setFont('6x8', 2);
    bC.setFontAlign(0, 0);
    bC.drawString('Left Wheel Vertical/Select', cx, 240);
    bC.drawString('Right Wheel Horizontal', cx, 270);

    bC.setFontAlign(-1, -1);
    bC.flip();
  }

  setTimeout(showMainMenu, 200);

  return {
    id: APP_ID,
    notDefault: true,
    fullscreen: true,

    remove: function () {
      if (leftWheelPressWatch) clearWatch(leftWheelPressWatch);

      Pip.removeListener('knob1', onMenuKnob1);
      Pip.removeListener('knob1', onGameKnob1);
      Pip.removeListener('knob2', onGameKnob2);

      Pip.audioStop();
      h.clear();
      h.flip();

      if (Pip.blitOptions) {
        Pip.blitOptions.disable = false;
      }
    },
  };
});
