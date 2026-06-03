(function () {
  const APP_ID = 'AccessTerminal';

  const GAME_NAME = 'ACCESS TERMINAL';
  const GAME_VERSION = '1.0.0';

  const WORDS_DIR = 'HOLO/ACCESS/';

  const SOUND_PATHS = {
    bonus: 'SOUND/FX/ARC_03.WAV',
    highlight: 'SOUND/FX/PREVNEXT.WAV',
    lockout: 'SOUND/ALARM/Klaxon.WAV',
    select: 'SOUND/FX/HOLSTOP.WAV',
    success: 'SOUND/ALARM/Party.WAV',
  };

  const W = h.getWidth();
  const H = h.getHeight();

  const C_BLACK = 0;
  const C_DIM = 1;
  const C_MED = 2;
  const C_BRIGHT = 3;

  const ADDRESS_LEN = 5;
  const CHAR_WIDTH = 8;
  const CLICK_DEBOUNCE = 450;
  const GRID_FONT = '4x6';
  const GRID_FONT_SCALE = 2;
  const GRID_X_LEFT = 8;
  const GRID_X_RIGHT = 172;
  const HEADER_X = 14;
  const KNOB_DEBOUNCE = 45;
  const LINE_HEIGHT = 13;
  const LINE_LEN = 15;
  const LOCKOUT_SECONDS = 5;
  const LOG_BOTTOM = H - 12;
  const LOG_LINE_HEIGHT = 10;
  const LOG_X = 350;
  const LOG_Y = 62;
  const MAX_ATTEMPTS = 4;
  const ROWS_PER_COLUMN = 18;
  const TOTAL_ROWS = ROWS_PER_COLUMN * 2;

  const CLOSERS = ')]}>';
  const OPENERS = '([{<';
  const SYMBOLS = '!@#$%^&*_-+=|\\/:;"\',.?~';

  const DIFFICULTIES = [
    { name: 'NOVICE', length: 5, count: 18, bonuses: 5, restoreChance: 35 },
    { name: 'EASY', length: 6, count: 20, bonuses: 5, restoreChance: 30 },
    { name: 'STANDARD', length: 7, count: 22, bonuses: 6, restoreChance: 25 },
    { name: 'HARD', length: 8, count: 24, bonuses: 6, restoreChance: 18 },
    { name: 'EXPERT', length: 9, count: 26, bonuses: 7, restoreChance: 15 },
  ];

  let attemptsRemaining = MAX_ATTEMPTS;
  let candidates = [];
  let clickWatch = null;
  let consumedSpans = {};
  let cursorCol = 0;
  let cursorRow = 0;
  let difficultyIndex = 2;
  let gameState = 'start';
  let lastClickTime = 0;
  let lastLeftKnobTime = 0;
  let lastRightKnobTime = 0;
  let lockoutInterval = null;
  let lockoutUntil = 0;
  let logEntries = [];
  let password = '';
  let playWatch = null;
  let removed = false;
  let rows = [];
  let soundExists = {};
  let spans = [];

  function addLog(text) {
    logEntries.push(text);
    while (logEntries.length > getMaxLogLines()) logEntries.shift();
  }

  function buildLine() {
    let out = '';
    for (let i = 0; i < LINE_LEN; i++) out += randomSymbol();
    return out;
  }

  function canPlaceRange(line, start, len) {
    if (start < 0 || start + len > LINE_LEN) return false;
    for (let i = start; i < start + len; i++) {
      if (line[i] >= 'A' && line[i] <= 'Z') return false;
    }
    return true;
  }

  function clearLockoutTimer() {
    if (lockoutInterval) {
      clearInterval(lockoutInterval);
      lockoutInterval = null;
    }
  }

  function draw() {
    h.clear(1);

    if (gameState === 'start') {
      drawStartScreen();
    } else if (gameState === 'playing') {
      drawPlayScreen();
    } else if (gameState === 'won') {
      drawEndScreen('ACCESS GRANTED', 'CLICK LEFT SCROLL BUTTON');
    } else if (gameState === 'locked') {
      drawLockoutScreen();
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawAttemptCounter() {
    h.setColor(C_MED).setFont(GRID_FONT, GRID_FONT_SCALE).setFontAlign(-1, -1);
    h.drawString('ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL', HEADER_X, 9);
    h.drawString('ENTER PASSWORD NOW', HEADER_X, 23);

    const y = 48;
    const label = attemptsRemaining + ' ATTEMPT(S) LEFT';
    h.setColor(C_MED).setFont(GRID_FONT, GRID_FONT_SCALE).setFontAlign(-1, -1);
    h.drawString(label, HEADER_X, y);
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const x = 158 + i * 14;
      h.setColor(i < attemptsRemaining ? C_BRIGHT : C_DIM);
      h.fillRect(x, y, x + 9, y + 9);
    }
  }

  function drawCursor() {
    const side = getSide(cursorRow);
    const rowInSide = side.left ? cursorRow : cursorRow - ROWS_PER_COLUMN;
    const row = rows[cursorRow];
    if (!row) return;

    const areaX = side.left ? GRID_X_LEFT : GRID_X_RIGHT;
    const y = getGridRowY(rowInSide);
    const span = getSpanAtCursor();
    const candidate = getCandidateAtCursor();

    if (span) {
      drawHighlight(areaX, y, span.start, span.end - span.start + 1);
    } else if (candidate) {
      drawHighlight(areaX, y, candidate.start, candidate.value.length);
    } else {
      drawHighlight(areaX, y, cursorCol, 1);
    }
  }

  function drawEndScreen(title, subtitle) {
    h.setColor(C_BRIGHT).setFont('6x8', 4).setFontAlign(0, 0);
    h.drawString(title, W / 2, H / 2 - 36);

    h.setColor(C_MED).setFont('6x8', 2).setFontAlign(0, 0);
    h.drawString('ACCESS KEY: ' + password, W / 2, H / 2 + 10);

    h.setColor(C_DIM).setFont('6x8', 1).setFontAlign(0, 0);
    h.drawString(subtitle, W / 2, H / 2 + 50);
  }

  function drawGridColumn(left) {
    const startRow = left ? 0 : ROWS_PER_COLUMN;
    const x = left ? GRID_X_LEFT : GRID_X_RIGHT;
    h.setFont(GRID_FONT, GRID_FONT_SCALE).setFontAlign(-1, -1);

    for (let i = 0; i < ROWS_PER_COLUMN; i++) {
      const row = rows[startRow + i];
      const y = getGridRowY(i);
      const candidate = getCandidateInRow(startRow + i);
      h.setColor(candidate && candidate.guessed ? C_DIM : C_MED);
      h.drawString(getRowLabel(startRow + i) + row.line, x + 2, y);
    }
  }

  function drawHighlight(areaX, y, start, len) {
    const row = rows[cursorRow];
    const x = areaX + 2 + (ADDRESS_LEN + start) * CHAR_WIDTH;
    const text = row.line.substr(start, len);
    h.setColor(C_BRIGHT).fillRect(
      x - 1,
      y - 1,
      x + len * CHAR_WIDTH - 2,
      y + 10,
    );
    h.setColor(C_BLACK)
      .setFont(GRID_FONT, GRID_FONT_SCALE)
      .setFontAlign(-1, -1);
    h.drawString(text, x, y);
  }

  function drawLockoutScreen() {
    const seconds = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
    h.setColor(C_BRIGHT).setFont('6x8', 4).setFontAlign(0, 0);
    h.drawString('SECURITY DELAY', W / 2, H / 2 - 38);

    h.setColor(C_MED).setFont('6x8', 3);
    h.drawString(seconds + ' SEC', W / 2, H / 2 + 6);

    h.setColor(C_DIM).setFont('6x8', 1);
    h.drawString('RETURNING TO START SCREEN', W / 2, H / 2 + 48);
  }

  function drawLog() {
    const maxLines = getMaxLogLines();
    const first = Math.max(0, logEntries.length - maxLines);
    const visible = logEntries.length - first;
    h.setFont('6x8', 1).setFontAlign(-1, -1);

    for (let i = first; i < logEntries.length; i++) {
      const y = LOG_BOTTOM - LOG_LINE_HEIGHT * (visible - (i - first));
      h.setColor(i === logEntries.length - 1 ? C_BRIGHT : C_MED);
      h.drawString(logEntries[i], LOG_X + 2, y);
    }
  }

  function drawPlayScreen() {
    drawAttemptCounter();
    drawGridColumn(true);
    drawGridColumn(false);
    drawLog();
    drawCursor();
  }

  function drawStartScreen() {
    const diff = DIFFICULTIES[difficultyIndex];

    h.setColor(C_BRIGHT).setFont('6x8', 3).setFontAlign(-1, -1);
    h.drawString(GAME_NAME, HEADER_X, 6);

    h.setColor(C_DIM).setFont('6x8', 2).setFontAlign(1, -1);
    h.drawString('v' + GAME_VERSION, W - 12, 10);

    h.setColor(C_MED).setFont('6x8', 2).setFontAlign(0, 0);
    h.drawString('SELECT ACCESS CHALLENGE', W / 2, 96);

    h.setColor(C_BRIGHT).setFont('6x8', 4);
    h.drawString(diff.name, W / 2, 146);

    h.setColor(C_MED).setFont('6x8', 2);
    h.drawString(diff.length + '-LETTER KEYS', W / 2, 190);

    h.setColor(C_DIM).setFont('6x8', 1);
    h.drawString('LEFT KNOB CHANGES LEVEL', W / 2, 236);
    h.drawString('CLICK TO BEGIN', W / 2, 252);
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

  function finishLockout() {
    clearLockoutTimer();
    attemptsRemaining = MAX_ATTEMPTS;
    gameState = 'start';
    logEntries = [];
    draw();
  }

  function finishResult() {
    attemptsRemaining = MAX_ATTEMPTS;
    gameState = 'start';
    logEntries = [];
    draw();
  }

  function getCandidateAtCursor() {
    const row = rows[cursorRow];
    if (!row || row.candidate < 0) return null;
    const candidate = candidates[row.candidate];
    if (!candidate || candidate.removed) return null;
    if (
      cursorCol >= candidate.start &&
      cursorCol < candidate.start + candidate.value.length
    ) {
      return candidate;
    }
    return null;
  }

  function getCandidateInRow(rowIdx) {
    const row = rows[rowIdx];
    if (!row || row.candidate < 0) return null;
    return candidates[row.candidate];
  }

  function getMatchScore(guess, answer) {
    let score = 0;
    for (let i = 0; i < guess.length; i++) {
      if (guess[i] === answer[i]) score++;
    }
    return score;
  }

  function getSide(row) {
    return { left: row < ROWS_PER_COLUMN };
  }

  function getGridRowY(rowInSide) {
    return LOG_BOTTOM - LINE_HEIGHT * (ROWS_PER_COLUMN - rowInSide);
  }

  function getMaxLogLines() {
    return Math.max(1, Math.floor((LOG_BOTTOM - LOG_Y) / LOG_LINE_HEIGHT));
  }

  function getRowLabel(rowIndex) {
    return '0X' + rowIndex.toString(16).toUpperCase().padStart(2, '0') + ' ';
  }

  function getSpanAtCursor() {
    for (let i = 0; i < spans.length; i++) {
      const span = spans[i];
      if (
        !span.consumed &&
        span.row === cursorRow &&
        span.start === cursorCol
      ) {
        return span;
      }
    }
    return null;
  }

  function handleBonus(span) {
    span.consumed = true;
    consumedSpans[span.key] = true;

    if (Math.random() * 100 < DIFFICULTIES[difficultyIndex].restoreChance) {
      attemptsRemaining = MAX_ATTEMPTS;
      addLog('> ATTEMPTS RESTORED');
    } else {
      const dud = removeDud();
      if (dud) {
        addLog('> DUD REMOVED');
      } else {
        attemptsRemaining = MAX_ATTEMPTS;
        addLog('> ATTEMPTS RESTORED');
      }
    }

    playSound('bonus');
    draw();
  }

  function handleClick(source) {
    if (removed) return;

    const now = Date.now();
    if (now - lastClickTime < CLICK_DEBOUNCE) return;
    lastClickTime = now;

    if (gameState === 'won') {
      if (source === 'left') finishResult();
      return;
    }

    if (gameState === 'start') {
      startRound();
      return;
    }

    if (gameState !== 'playing') return;

    const span = getSpanAtCursor();
    if (span) {
      handleBonus(span);
      return;
    }

    const candidate = getCandidateAtCursor();
    if (!candidate) return;

    if (candidate.guessed) {
      addLog('> ALREADY CHECKED');
      draw();
      return;
    }

    candidate.guessed = true;
    addLog('> ' + candidate.value);
    playSound('select');

    if (candidate.isPassword) {
      addLog('> ACCESS GRANTED');
      gameState = 'won';
      draw();
      playSoundLater('success', 25);
      return;
    }

    attemptsRemaining--;
    addLog('> ENTRY DENIED');
    addLog(
      '> ' +
        getMatchScore(candidate.value, password) +
        '/' +
        password.length +
        ' MATCH',
    );
    if (attemptsRemaining <= 0) {
      gameState = 'locked';
      lockoutUntil = Date.now() + LOCKOUT_SECONDS * 1000;
      addLog('> SECURITY DELAY');
      clearLockoutTimer();
      lockoutInterval = setInterval(function () {
        if (Date.now() >= lockoutUntil) finishLockout();
        else draw();
      }, 1000);
      draw();
      playSoundLater('lockout', 25);
      return;
    }

    draw();
  }

  function insertBonusInLine(rowIndex) {
    const row = rows[rowIndex];
    const len = 3 + ((Math.random() * 4) | 0);
    const pair = (Math.random() * 4) | 0;
    let tries = 0;

    while (tries++ < 20) {
      const start = (Math.random() * (LINE_LEN - len + 1)) | 0;
      if (!canPlaceRange(row.line, start, len)) continue;

      let middle = '';
      for (let i = 0; i < len - 2; i++) middle += randomSymbol();
      row.line =
        row.line.slice(0, start) +
        OPENERS[pair] +
        middle +
        CLOSERS[pair] +
        row.line.slice(start + len);
      return true;
    }

    return false;
  }

  function insertBlockedSpan(candidate) {
    if (
      candidate.start <= 0 ||
      candidate.start + candidate.value.length >= LINE_LEN
    ) {
      return;
    }

    const pair = (Math.random() * 4) | 0;
    const row = rows[candidate.row];
    row.line =
      row.line.slice(0, candidate.start - 1) +
      OPENERS[pair] +
      row.line.slice(
        candidate.start,
        candidate.start + candidate.value.length,
      ) +
      CLOSERS[pair] +
      row.line.slice(candidate.start + candidate.value.length + 1);
  }

  function maskCandidate(candidate) {
    const row = rows[candidate.row];
    const dots = '.................'.substr(0, candidate.value.length);
    row.line =
      row.line.slice(0, candidate.start) +
      dots +
      row.line.slice(candidate.start + candidate.value.length);
  }

  function loadWords(length) {
    const out = [];
    let file = null;
    let data = null;
    let source = null;

    try {
      file = fs.readFile(WORDS_DIR + 'words_' + length + '.json');
      data = JSON.parse(file);
      source = Array.isArray(data)
        ? data
        : data[String(length)] || data[length] || [];

      for (let i = 0; i < source.length; i++) {
        const word = source[i];
        if (typeof word === 'string' && word.length === length) {
          out.push(word.toUpperCase());
        }
      }
    } catch (e) {}

    file = null;
    data = null;
    source = null;
    return out;
  }

  function moveCursorVertical(dir) {
    cursorRow = (cursorRow + (dir > 0 ? 1 : -1) + TOTAL_ROWS) % TOTAL_ROWS;
    const row = rows[cursorRow];
    if (cursorCol >= row.line.length) cursorCol = row.line.length - 1;
  }

  function moveCursorHorizontal(dir) {
    const row = rows[cursorRow];
    const candidate = getCandidateAtCursor();
    let step = 1;

    if (candidate) {
      if (dir > 0) step = candidate.start + candidate.value.length - cursorCol;
      else step = cursorCol - candidate.start + 1;
    }

    const nextCol = cursorCol + (dir > 0 ? step : -step);
    if (nextCol >= row.line.length || nextCol < 0) {
      const rowInSide = cursorRow % ROWS_PER_COLUMN;
      const side = getSide(cursorRow);
      const nextRow = side.left ? rowInSide + ROWS_PER_COLUMN : rowInSide;

      cursorRow = nextRow;
      cursorCol = nextCol < 0 ? rows[nextRow].line.length - 1 : 0;
      return;
    }

    cursorCol = nextCol;
  }

  function onKnob1(dir) {
    const now = Date.now();
    if (now - lastLeftKnobTime < KNOB_DEBOUNCE) return;
    lastLeftKnobTime = now;

    if (dir === 0) {
      handleClick('left');
      return;
    }

    if (gameState === 'start') {
      difficultyIndex =
        (difficultyIndex + (dir > 0 ? 1 : -1) + DIFFICULTIES.length) %
        DIFFICULTIES.length;
      playSound('highlight');
    } else if (gameState === 'playing') {
      const oldCursorRow = cursorRow;
      const oldCursorCol = cursorCol;
      moveCursorVertical(dir);
      if (cursorRow !== oldCursorRow || cursorCol !== oldCursorCol) {
        playSound('highlight');
      }
    }

    draw();
  }

  function onKnob2(dir) {
    const now = Date.now();
    if (now - lastRightKnobTime < KNOB_DEBOUNCE) return;
    lastRightKnobTime = now;

    if (dir === 0) {
      handleClick('right');
      return;
    }

    if (gameState === 'start') {
      difficultyIndex =
        (difficultyIndex + (dir > 0 ? 1 : -1) + DIFFICULTIES.length) %
        DIFFICULTIES.length;
      playSound('highlight');
      draw();
    } else if (gameState === 'playing') {
      const oldCursorRow = cursorRow;
      const oldCursorCol = cursorCol;
      moveCursorHorizontal(dir);
      if (cursorRow !== oldCursorRow || cursorCol !== oldCursorCol) {
        playSound('highlight');
      }
      draw();
    }
  }

  function placeCandidates(diff) {
    const pool = loadWords(diff.length);
    if (pool.length < diff.count) return false;

    shuffle(pool);
    const picked = pool.slice(0, diff.count);
    password = picked[(Math.random() * picked.length) | 0];

    for (let i = 0; i < picked.length; i++) {
      let rowIndex;
      do {
        rowIndex = (Math.random() * TOTAL_ROWS) | 0;
      } while (rows[rowIndex].candidate !== -1);

      const word = picked[i];
      const start = (Math.random() * (LINE_LEN - word.length + 1)) | 0;
      rows[rowIndex].line =
        rows[rowIndex].line.slice(0, start) +
        word +
        rows[rowIndex].line.slice(start + word.length);
      rows[rowIndex].candidate = i;
      candidates.push({
        value: word,
        row: rowIndex,
        start: start,
        removed: false,
        guessed: false,
        isPassword: word === password,
      });
    }

    for (let j = 0; j < candidates.length; j++) {
      if (!candidates[j].isPassword && Math.random() < 0.35) {
        insertBlockedSpan(candidates[j]);
      }
    }

    return true;
  }

  function playSound(key) {
    const path = SOUND_PATHS[key];
    if (!path) return;
    if (soundExists[path] === undefined) soundExists[path] = fileExists(path);
    if (!soundExists[path]) return;
    try {
      Pip.audioStart(path);
    } catch (e) {}
  }

  function playSoundLater(key, delay) {
    setTimeout(function () {
      if (!removed) playSound(key);
    }, delay || 0);
  }

  function randomSymbol() {
    return SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
  }

  function remove() {
    if (removed) return;
    removed = true;

    clearLockoutTimer();

    if (clickWatch) {
      clearWatch(clickWatch);
      clickWatch = null;
    }
    if (playWatch) {
      clearWatch(playWatch);
      playWatch = null;
    }

    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);

    Pip.audioStop();
    h.clear();
    h.flip();
  }

  function removeDud() {
    const options = [];
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (!c.isPassword && !c.removed && !c.guessed) options.push(c);
    }

    if (!options.length) return null;

    const pick = options[(Math.random() * options.length) | 0];
    pick.removed = true;
    maskCandidate(pick);
    rows[pick.row].candidate = -1;
    removeSpansForRow(pick.row);
    return pick;
  }

  function removeSpansForRow(rowIndex) {
    for (let i = spans.length - 1; i >= 0; i--) {
      if (spans[i].row === rowIndex) spans.splice(i, 1);
    }
  }

  function scanSpans() {
    const next = [];
    const pairs = { '(': ')', '[': ']', '{': '}', '<': '>' };

    for (let r = 0; r < rows.length; r++) {
      const line = rows[r].line;
      for (let c = 0; c < line.length; c++) {
        const closer = pairs[line[c]];
        if (!closer) continue;
        for (let end = c + 1; end < line.length; end++) {
          if (line[end] !== closer) continue;
          const key = r + ':' + c + ':' + end;
          if (!consumedSpans[key] && !spanContainsActiveWord(r, c, end)) {
            next.push({
              row: r,
              start: c,
              end: end,
              key: key,
              consumed: false,
            });
          }
          break;
        }
      }
    }

    spans = next;
  }

  function setupRows() {
    rows = [];
    for (let i = 0; i < TOTAL_ROWS; i++) {
      rows.push({ line: buildLine(), candidate: -1 });
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }

  function spanContainsActiveWord(rowIndex, start, end) {
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (candidate.row !== rowIndex || candidate.removed) continue;
      if (
        candidate.start >= start &&
        candidate.start + candidate.value.length - 1 <= end
      ) {
        return true;
      }
    }
    return false;
  }

  function start() {
    h.clear();
    Pip.audioStop();

    Pip.onExclusive('knob1', onKnob1);
    Pip.onExclusive('knob2', onKnob2);

    if (typeof ENC1_PRESS !== 'undefined') {
      clickWatch = setWatch(
        function () {
          handleClick('left');
        },
        ENC1_PRESS,
        {
          repeat: true,
          edge: 'rising',
          debounce: 50,
        },
      );
    }

    if (typeof BTN_PLAY !== 'undefined') {
      playWatch = setWatch(
        function () {
          handleClick('play');
        },
        BTN_PLAY,
        {
          repeat: true,
          edge: 'rising',
          debounce: 50,
        },
      );
    }

    draw();
  }

  function startRound() {
    const diff = DIFFICULTIES[difficultyIndex];
    clearLockoutTimer();

    attemptsRemaining = MAX_ATTEMPTS;
    candidates = [];
    consumedSpans = {};
    cursorCol = 0;
    cursorRow = 0;
    gameState = 'playing';
    logEntries = ['> SELECT ACCESS KEY'];
    password = '';
    spans = [];

    setupRows();
    if (!placeCandidates(diff)) {
      gameState = 'start';
      logEntries = ['> WORD DATA MISSING'];
      draw();
      return;
    }

    let inserted = 0;
    let safety = 0;
    while (inserted < diff.bonuses && safety++ < 100) {
      if (insertBonusInLine((Math.random() * TOTAL_ROWS) | 0)) inserted++;
    }

    scanSpans();
    draw();
  }

  start();

  return {
    id: APP_ID,
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
