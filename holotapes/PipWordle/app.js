(function () {
  const APP_ID = 'pipwordle';
  const APP_NAME = 'PIP-WORDLE';
  const VERSION = '1.0.0';
  const SOUND_DIR = 'HOLO/PIP_WORDLE/';

  const WORD_LEN = 5;
  const MAX_GUESSES = 6;
  const MARGIN = 10;

  const EMPTY = 0;
  const ABSENT = 1;
  const PRESENT = 2;
  const CORRECT = 3;

  const SFX = {
    type: 'SOUND/FX/PREVNEXT.WAV',
    submit: 'SOUND/FX/HOLSTOP.WAV',
    invalid: 'SOUND/ALARM/Klaxon.WAV',
    win: 'SOUND/ALARM/Party.WAV',
    lose: 'SOUND/ALARM/Klaxon.WAV',
  };

  const WORD_DIR = 'HOLO/PIP_WORDLE/';

  const FALLBACK_BLOB =
    'ABOUTOTHERWHICHTHEIRTHEREFIRSTWOULDTHESECLICKSOUND' +
    'RADIOPOWERBOARDARMORSTORMTRAINPLANTLIGHTNIGHTWORLD' +
    'HOUSEMUSICPAPEREARTHOCEANRIVERBRAVESHARPSOLIDQUIET' +
    'SMARTGHOSTSTEELMETALGLASSSTONEFRAMESCOPELASERVAULT' +
    'RAIDSSCRAPNOISESHADETORCHFUSEDWIRESRELAYDRIVEPULSE';

  function loadWordBlob(len) {
    try {
      const raw = fs.readFile(WORD_DIR + 'words_' + len + '.txt');
      const blob = raw.replace(/[^A-Z]/g, '');
      if (blob.length >= len && blob.length % len === 0) return blob;
    } catch (e) {}
    return FALLBACK_BLOB;
  }

  const WORD_BLOB = loadWordBlob(WORD_LEN);
  const WORD_COUNT = WORD_BLOB.length / WORD_LEN;

  function randomAnswer() {
    const idx = (Math.random() * WORD_COUNT) | 0;
    return WORD_BLOB.substr(idx * WORD_LEN, WORD_LEN);
  }

  function isValidWord(w) {
    for (let i = 0; i < WORD_BLOB.length; i += WORD_LEN) {
      if (WORD_BLOB.substr(i, WORD_LEN) === w) return true;
    }
    return false;
  }

  const SCREEN_W = h.getWidth();
  const SCREEN_H = h.getHeight();

  const TILE = 26;
  const TILE_GAP = 4;
  const GRID_W = WORD_LEN * TILE + (WORD_LEN - 1) * TILE_GAP;
  const GRID_X = Math.max(MARGIN, ((SCREEN_W - GRID_W) / 2) | 0);
  const GRID_TOP = MARGIN + 26;

  const LEGEND_TILE = 34;

  const KEY_LAYOUT = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', null],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', null, 'DEL', 'ENT'],
  ];
  const KB_ROWS = KEY_LAYOUT.length;
  const KB_COLS = KEY_LAYOUT[0].length;

  const KEY_W = 24;
  const KEY_H = 22;
  const KEY_GAP = 2;
  const KEYBOARD_W = KB_COLS * KEY_W + (KB_COLS - 1) * KEY_GAP;
  const KEYBOARD_X = Math.max(MARGIN, ((SCREEN_W - KEYBOARD_W) / 2) | 0);
  const KEYBOARD_TOP = GRID_TOP + MAX_GUESSES * (TILE + TILE_GAP) + 16;

  let grid = [];
  let row = 0;
  let col = 0;
  let answer = '';
  let phase = 'title';
  let message = '';

  let keyStates = {};
  let resultDetail = '';

  let cursorRow = 0;
  let cursorCol = 0;

  let watchEnter = null;
  let watchBack = null;
  let soundCache = {};
  let stopped = false;

  function newGame() {
    grid = [];
    for (let r = 0; r < MAX_GUESSES; r++) {
      const r2 = [];
      for (let c = 0; c < WORD_LEN; c++) r2.push({ letter: '', state: EMPTY });
      grid.push(r2);
    }
    row = 0;
    col = 0;
    phase = 'playing';
    message = '';
    keyStates = {};
    resultDetail = '';
    answer = randomAnswer();
    cursorRow = 0;
    cursorCol = 0;
    Pip.log('New game started, word length ' + answer.length, 'wordle.log');
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

  function playSound(name) {
    const path = SFX[name];
    if (!path) return;
    if (soundCache[path] === undefined) soundCache[path] = fileExists(path);
    if (!soundCache[path]) return;
    try {
      Pip.audioStart(path);
    } catch (e) {}
  }

  function evaluateGuess(guess) {
    const result = new Array(WORD_LEN).fill(ABSENT);
    const answerChars = answer.split('');
    const used = new Array(WORD_LEN).fill(false);

    for (let i = 0; i < WORD_LEN; i++) {
      if (guess[i] === answerChars[i]) {
        result[i] = CORRECT;
        used[i] = true;
      }
    }
    for (let i = 0; i < WORD_LEN; i++) {
      if (result[i] === CORRECT) continue;
      for (let j = 0; j < WORD_LEN; j++) {
        if (!used[j] && guess[i] === answerChars[j]) {
          result[i] = PRESENT;
          used[j] = true;
          break;
        }
      }
    }
    return result;
  }

  function updateKeyStates(guess, result) {
    for (let i = 0; i < WORD_LEN; i++) {
      const letter = guess[i];
      const newState = result[i];
      const cur = keyStates[letter] || EMPTY;
      if (newState > cur) keyStates[letter] = newState;
    }
  }

  function submitGuess() {
    const word = grid[row]
      .map(function (cell) {
        return cell.letter;
      })
      .join('');
    if (word.length < WORD_LEN) {
      message = 'NOT ENOUGH LETTERS';
      playSound('invalid');
      return;
    }
    if (!isValidWord(word)) {
      message = 'NOT IN WORD LIST';
      playSound('invalid');
      return;
    }

    const result = evaluateGuess(word);
    for (let c = 0; c < WORD_LEN; c++) grid[row][c].state = result[c];
    updateKeyStates(word, result);

    if (word === answer) {
      phase = 'won';
      message = 'ACCESS GRANTED';
      resultDetail = '';
      playSound('win');
    } else if (row === MAX_GUESSES - 1) {
      phase = 'lost';
      message = 'ACCESS DENIED';
      resultDetail = 'PASSWORD: ' + answer;
      playSound('lose');
    } else {
      row++;
      col = 0;
      message = '';
      playSound('submit');
    }
  }

  function typeLetter(letter) {
    if (col >= WORD_LEN) return;
    grid[row][col].letter = letter;
    grid[row][col].state = EMPTY;
    col++;
    message = '';
    playSound('type');
  }

  function backspace() {
    if (col <= 0) return;
    col--;
    grid[row][col].letter = '';
    grid[row][col].state = EMPTY;
    message = '';
    playSound('type');
  }

  function pressKey(label) {
    if (label === null) return;
    if (label === 'ENT') submitGuess();
    else if (label === 'DEL') backspace();
    else typeLetter(label);
    render();
  }

  function moveCursor(dRow, dCol) {
    const prevRow = cursorRow;
    const prevCol = cursorCol;
    let r = cursorRow;
    let c = cursorCol;
    for (let i = 0; i < KB_ROWS * KB_COLS; i++) {
      r = (r + dRow + KB_ROWS) % KB_ROWS;
      c = (c + dCol + KB_COLS) % KB_COLS;
      if (KEY_LAYOUT[r][c] !== null) break;
    }
    if (r === prevRow && c === prevCol) return;
    cursorRow = r;
    cursorCol = c;
    playSound('type');
    redrawCursor(prevRow, prevCol);
  }

  function redrawCursor(prevRow, prevCol) {
    const prevLabel = KEY_LAYOUT[prevRow][prevCol];
    const px = KEYBOARD_X + prevCol * (KEY_W + KEY_GAP);
    const py = KEYBOARD_TOP + prevRow * (KEY_H + KEY_GAP);
    drawKey(px, py, prevLabel, false);

    const curLabel = KEY_LAYOUT[cursorRow][cursorCol];
    const cx = KEYBOARD_X + cursorCol * (KEY_W + KEY_GAP);
    const cy = KEYBOARD_TOP + cursorRow * (KEY_H + KEY_GAP);
    drawKey(cx, cy, curLabel, true);

    h.flip();
    Pip.lastFlip = getTime();
  }

  function activateCursor() {
    pressKey(KEY_LAYOUT[cursorRow][cursorCol]);
  }

  function colorForState(state) {
    if (state === CORRECT) return 3;
    if (state === PRESENT) return 2;
    if (state === ABSENT) return 1;
    return 0;
  }

  function correctOutline(x, y, w, h2) {
    h.setColor(0);
    h.drawRect(x, y, x + w - 1, y + h2 - 1);
    h.drawRect(x + 1, y + 1, x + w - 2, y + h2 - 2);
    h.setColor(3);
    h.drawRect(x + 2, y + 2, x + w - 3, y + h2 - 3);
    h.drawRect(x + 3, y + 3, x + w - 4, y + h2 - 4);
  }

  function drawTile(x, y, cell) {
    if (cell.state === EMPTY) {
      h.setColor(cell.letter ? 2 : 1);
      h.drawRect(x, y, x + TILE - 1, y + TILE - 1);
      if (cell.letter) {
        h.setColor(2).setFont('6x8', 2).setFontAlign(0, 0);
        h.drawString(cell.letter, x + TILE / 2, y + TILE / 2);
      }
      return;
    }
    h.setColor(colorForState(cell.state));
    h.fillRect(x, y, x + TILE - 1, y + TILE - 1);
    if (cell.state === CORRECT) correctOutline(x, y, TILE, TILE);
    h.setColor(0).setFont('6x8', 2).setFontAlign(0, 0);
    h.drawString(cell.letter, x + TILE / 2, y + TILE / 2);
  }

  function drawGrid() {
    for (let r = 0; r < MAX_GUESSES; r++) {
      for (let c = 0; c < WORD_LEN; c++) {
        const x = GRID_X + c * (TILE + TILE_GAP);
        const y = GRID_TOP + r * (TILE + TILE_GAP);
        drawTile(x, y, grid[r][c]);
      }
    }
  }

  function drawKey(x, y, label, isCursor) {
    const state = keyStates[label] || EMPTY;

    h.setColor(0);
    h.fillRect(x, y, x + KEY_W - 1, y + KEY_H - 1);

    if (isCursor) {
      h.setColor(3);
      h.fillRect(x, y, x + KEY_W - 1, y + KEY_H - 1);
      h.setColor(0);
    } else if (state !== EMPTY) {
      h.setColor(colorForState(state));
      h.fillRect(x, y, x + KEY_W - 1, y + KEY_H - 1);
      if (state === CORRECT) correctOutline(x, y, KEY_W, KEY_H);
      h.setColor(0);
    } else {
      h.setColor(2);
      h.drawRect(x, y, x + KEY_W - 1, y + KEY_H - 1);
    }

    if (label.length === 1) h.setFont('6x8', 2).setFontAlign(0, 0);
    else h.setFont('6x8', 1).setFontAlign(0, 0);
    h.drawString(label, x + KEY_W / 2, y + KEY_H / 2);
  }

  function drawKeyboard() {
    for (let r = 0; r < KB_ROWS; r++) {
      for (let c = 0; c < KB_COLS; c++) {
        const label = KEY_LAYOUT[r][c];
        if (label === null) continue;
        const x = KEYBOARD_X + c * (KEY_W + KEY_GAP);
        const y = KEYBOARD_TOP + r * (KEY_H + KEY_GAP);
        drawKey(x, y, label, r === cursorRow && c === cursorCol);
      }
    }
  }

  function drawHeader() {
    h.setColor(3).setFont('6x8', 3).setFontAlign(-1, -1);
    h.drawString(APP_NAME, MARGIN, MARGIN);
    h.setColor(1).setFont('6x8', 2).setFontAlign(1, -1);
    h.drawString('v' + VERSION, SCREEN_W - MARGIN, MARGIN + 4);
  }

  function drawMessageBox(title, detail, footer) {
    const boxW = Math.min(SCREEN_W - 2 * MARGIN, 250);
    let boxH = 50;
    if (detail) boxH += 22;
    if (footer) boxH += 22;
    const x = ((SCREEN_W - boxW) / 2) | 0;
    const y = ((SCREEN_H - boxH) / 2) | 0;

    h.setColor(0);
    h.fillRect(x, y, x + boxW - 1, y + boxH - 1);
    h.setColor(3);
    h.drawRect(x, y, x + boxW - 1, y + boxH - 1);
    h.drawRect(x + 3, y + 3, x + boxW - 4, y + boxH - 4);

    h.setFont('6x8', 2).setFontAlign(0, 0);
    h.drawString(title, SCREEN_W / 2, y + 26);

    if (detail) {
      h.setColor(2).setFont('6x8', 1).setFontAlign(0, 0);
      h.drawString(detail, SCREEN_W / 2, y + 52);
    }

    if (footer) {
      h.setColor(1).setFont('6x8', 1).setFontAlign(0, 0);
      h.drawString(footer, SCREEN_W / 2, y + boxH - 14);
    }
  }

  function drawLegendRow(x, y, state, label) {
    h.setColor(colorForState(state));
    h.fillRect(x, y, x + LEGEND_TILE - 1, y + LEGEND_TILE - 1);
    if (state === CORRECT) correctOutline(x, y, LEGEND_TILE, LEGEND_TILE);
    h.setColor(0).setFont('6x8', 3).setFontAlign(0, 0);
    h.drawString('A', x + LEGEND_TILE / 2, y + LEGEND_TILE / 2);

    h.setColor(2).setFont('6x8', 2).setFontAlign(-1, 0);
    h.drawString(label, x + LEGEND_TILE + 10, y + LEGEND_TILE / 2);
  }

  function drawTitleScreen() {
    h.setColor(3).setFont('6x8', 4).setFontAlign(0, -1);
    h.drawString('PIP-WORDLE', SCREEN_W / 2, MARGIN);

    const legendX = MARGIN;
    const legendTop = MARGIN + 54;
    const legendGap = LEGEND_TILE + 14;
    h.setColor(2).setFont('6x8', 2).setFontAlign(-1, -1);
    h.drawString('TILE COLOR KEY:', legendX, legendTop - 22);

    drawLegendRow(legendX, legendTop, CORRECT, 'CORRECT SPOT');
    drawLegendRow(legendX, legendTop + legendGap, PRESENT, 'WRONG SPOT');
    drawLegendRow(legendX, legendTop + legendGap * 2, ABSENT, 'NOT IN WORD');

    h.setColor(3).setFont('6x8', 2).setFontAlign(0, 1);
    h.drawString('CLICK TO BEGIN', SCREEN_W / 2, SCREEN_H - MARGIN);
  }

  function render() {
    h.clear();
    if (phase === 'title') {
      drawTitleScreen();
    } else {
      drawHeader();
      drawGrid();
      drawKeyboard();
      if (phase === 'playing' && message) drawMessageBox(message, '', '');
      if (phase === 'won' || phase === 'lost')
        drawMessageBox(message, resultDetail, 'CLICK TO PLAY AGAIN');
    }
    h.flip();
    Pip.lastFlip = getTime();
  }

  const KNOB1_DEBOUNCE = 90;
  const KNOB2_DEBOUNCE = 40;
  const CLICK_KNOB1_DELAY = 200;
  let lastKnob1 = 0;
  let lastKnob2 = 0;
  let lastClickTime = 0;

  function onKnob1(dir) {
    if (phase !== 'playing') return;
    const now = Date.now();
    if (now - lastClickTime < CLICK_KNOB1_DELAY) return;
    if (now - lastKnob1 < KNOB1_DEBOUNCE) return;
    lastKnob1 = now;
    moveCursor(dir > 0 ? 1 : -1, 0);
  }

  function onKnob2(dir) {
    if (phase !== 'playing') return;
    const now = Date.now();
    if (now - lastKnob2 < KNOB2_DEBOUNCE) return;
    lastKnob2 = now;
    moveCursor(0, dir > 0 ? 1 : -1);
  }

  function onPress(e) {
    lastClickTime = Date.now();
    if (e && !e.state) return;
    if (phase === 'title') {
      newGame();
      render();
    } else if (phase === 'playing') {
      activateCursor();
    } else {
      newGame();
      render();
    }
  }

  function onBack() {
    if (phase === 'playing') {
      backspace();
      render();
    } else {
      newGame();
      render();
    }
  }

  function init() {
    Pip.audioStop();
    Pip.onExclusive('knob1', onKnob1);
    Pip.onExclusive('knob2', onKnob2);

    if (typeof ENC1_PRESS !== 'undefined') {
      watchEnter = setWatch(onPress, ENC1_PRESS, {
        repeat: true,
        edge: 'both',
        debounce: 50,
      });
    }
    if (typeof BTN_PLAY !== 'undefined') {
      watchBack = setWatch(onBack, BTN_PLAY, {
        repeat: true,
        edge: 'rising',
        debounce: 50,
      });
    }

    phase = 'title';
    render();
  }

  function remove() {
    if (stopped) return;
    stopped = true;
    if (watchEnter) {
      clearWatch(watchEnter);
      watchEnter = null;
    }
    if (watchBack) {
      clearWatch(watchBack);
      watchBack = null;
    }
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
    Pip.audioStop();
    h.clear();
    h.flip();
  }

  init();

  return { id: APP_ID, notDefault: true, fullscreen: true, remove: remove };
});
