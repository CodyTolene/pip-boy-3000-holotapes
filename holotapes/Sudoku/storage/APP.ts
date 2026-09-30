(function (): HolotapeApp {
  const C: SudokuLayout = {
    cell: 32,
    gridX: 13,
    gridY: 16,
    panelX: 309,
    panelR: 467,
    panelMid: 388,
  };

  // Thirty-six clue masks, twelve bytes each, base64 encoded back to back:
  // twelve per difficulty, in the order EASY, NORMAL, HARD. Bit n of a mask
  // marks cell n of the base grid as a clue. Every mask was verified
  // off-device against the base grid built in newPuzzle: it leaves a puzzle
  // with exactly one solution that is solvable by logic alone at its own
  // difficulty and NOT at the one below it. Easy needs only naked and hidden
  // singles; normal also needs locked candidates and pairs; hard also needs
  // triples or an X-wing.
  const MASKS =
    // EASY
    'koF2VAkhVdwCkwAARZXE2BAQNkZSRQEAJJRG6gbArsRSSAAAogKVXZASdFOBigAA' +
    'GDlcIDx4CHQ4MQAAVCcCUtKWlIDIVQAAcCcAFzq40AHIHQAAKU1ogCuoAyxkKQEA' +
    'hoeoGCkoMSrCwwAAZs4hEMgmEAjnzAAASi8QEjOYkRDopQAAoJCdMYxiGHMTCgAA' +
    // NORMAL
    'h4KYVBbQVDKCwgEAT4iBMgqgmAIj5AEAwMJSUIOCFZSGBgAAzkhgOCAIOAwk5gAA' +
    'DoUQQjx4hBBC4QAAITQQirKaohBYCAEARmoFGIRCMECtxAAAiAHkzDAYZk4AIwAA' +
    'jAWMwEbEBmJAYwAA2AgYxSgoRjEgNgAAMBkBoeEOCwExGQAAOQAjoGENC4gBOAEA' +
    // HARD
    'agBQA7VagRUArAAAAitiEUOEEY2ogQAA4mICUJKSFICMjgAANohECLRaIEQi2AAA' +
    'Ahl40QggFj0wgQAAkYPEUAghFEaCEwEAgBHhcQKBHA8RAwAACqGEKDRYKEIKoQAA' +
    'cCYQCDVYIRDIHAAAiEWEEUkkEUNEIwAAOBIRkBbQEhCROAAACrkgEDKYEAg6oQAA';

  const solution = new Uint8Array(81);
  const given = new Uint8Array(81);
  const board = new Uint8Array(81);
  const conflict = new Uint8Array(81);

  let cursor = 40;
  let level = 0;
  let menu = false;
  let menuPick = 0;
  let editing = false;
  let editDigit = 1;
  let blink = true;
  let filled = 0;
  let errors = 0;
  let hints = 0;
  let won = false;
  let startTime = 0;
  let shownSeconds = 0;
  let tick!: number;

  function shuffleSmall(values: Uint8Array, count: number): void {
    let i = 0;
    let j = 0;
    let swap = 0;

    for (i = count - 1; i > 0; i--) {
      j = Math.randInt(i + 1);
      swap = values[i];
      values[i] = values[j];
      values[j] = swap;
    }
  }

  function levelName(index: number): string {
    return index ? (index === 1 ? 'NORMAL' : 'HARD') : 'EASY';
  }

  function timeText(): string {
    const minutes = (shownSeconds / 60) | 0;
    const seconds = shownSeconds % 60;

    return (
      (minutes < 10 ? '0' : '') +
      minutes +
      ':' +
      (seconds < 10 ? '0' : '') +
      seconds
    );
  }

  // The base grid is the canonical pattern ((r%3)*3 + r/3 + c) % 9 + 1. Each
  // puzzle is that grid relabelled, its bands, stacks, rows, and columns
  // shuffled, and optionally transposed. Those keep a valid grid and preserve
  // the stored mask's difficulty, so the device never has to solve anything.
  function newPuzzle(): void {
    const bits = atob(MASKS.substr((level * 12 + Math.randInt(12)) * 16, 16));
    const digits = new Uint8Array(9);
    const bands = new Uint8Array(3);
    const stacks = new Uint8Array(3);
    const trio = new Uint8Array(3);
    const rowMap = new Uint8Array(9);
    const colMap = new Uint8Array(9);
    let transposed = 0;
    let i = 0;
    let band = 0;
    let k = 0;
    let row = 0;
    let col = 0;
    let baseRow = 0;
    let baseCol = 0;
    let src = 0;
    let cell = 0;

    for (i = 0; i < 9; i++) digits[i] = i + 1;
    shuffleSmall(digits, 9);

    for (i = 0; i < 3; i++) {
      bands[i] = i;
      stacks[i] = i;
    }
    shuffleSmall(bands, 3);
    shuffleSmall(stacks, 3);

    for (band = 0; band < 3; band++) {
      for (k = 0; k < 3; k++) trio[k] = k;
      shuffleSmall(trio, 3);
      for (k = 0; k < 3; k++) rowMap[band * 3 + k] = bands[band] * 3 + trio[k];
      for (k = 0; k < 3; k++) trio[k] = k;
      shuffleSmall(trio, 3);
      for (k = 0; k < 3; k++) colMap[band * 3 + k] = stacks[band] * 3 + trio[k];
    }

    transposed = Math.randInt(2);
    filled = 0;

    for (row = 0; row < 9; row++) {
      for (col = 0; col < 9; col++) {
        if (transposed) {
          baseRow = colMap[col];
          baseCol = rowMap[row];
        } else {
          baseRow = rowMap[row];
          baseCol = colMap[col];
        }
        src = baseRow * 9 + baseCol;
        cell = row * 9 + col;
        solution[cell] =
          digits[((baseRow % 3) * 3 + ((baseRow / 3) | 0) + baseCol) % 9];
        given[cell] = (bits.charCodeAt(src >> 3) >> (src & 7)) & 1;
        board[cell] = given[cell] ? solution[cell] : 0;
        conflict[cell] = 0;
        if (given[cell]) filled++;
      }
    }
  }

  function cellClashes(i: number): boolean {
    const value = board[i];
    const row = (i / 9) | 0;
    const col = i % 9;
    const boxRow = row - (row % 3);
    const boxCol = col - (col % 3);
    let k = 0;
    let peer = 0;

    if (!value) return false;

    for (k = 0; k < 9; k++) {
      if (k !== col && board[row * 9 + k] === value) return true;
      if (k !== row && board[k * 9 + col] === value) return true;
      peer = (boxRow + ((k / 3) | 0)) * 9 + boxCol + (k % 3);
      if (peer !== i && board[peer] === value) return true;
    }

    return false;
  }

  function drawCell(i: number): void {
    const x = C.gridX + (i % 9) * C.cell;
    const y = C.gridY + ((i / 9) | 0) * C.cell;
    const active = i === cursor && !won;

    h.clearRect(x + 1, y + 1, x + C.cell - 1, y + C.cell - 1);

    if (active) {
      if (editing) {
        h.setColor(2);
        Pip.shadeBox(x + 1, y + 1, x + C.cell - 1, y + C.cell - 1);
      }
      h.setColor(3)
        .drawRect(x + 1, y + 1, x + C.cell - 1, y + C.cell - 1)
        .drawRect(x + 2, y + 2, x + C.cell - 2, y + C.cell - 2);
    }

    if (active && editing) {
      if (!blink) return;
      h.setColor(3)
        .setFontMonofonto23()
        .setFontAlign(0, 0)
        .drawString(editDigit, x + 16, y + 17);
      return;
    }

    if (!board[i]) return;

    h.setColor(given[i] ? 3 : conflict[i] ? 1 : 2)
      .setFontMonofonto23()
      .setFontAlign(0, 0)
      .drawString(board[i], x + 16, y + 17);
  }

  function refreshCell(i: number): void {
    const clash = cellClashes(i) ? 1 : 0;

    if (clash === conflict[i]) return;
    errors += clash - conflict[i];
    conflict[i] = clash;
    drawCell(i);
  }

  // Only the row, column, and box of a changed cell can gain or lose a clash,
  // so a full 81 cell rescan is never needed. Repeated indices are harmless:
  // the second pass over a cell sees the flag it just wrote. The changed cell
  // itself is redrawn by the caller, since its digit moves without its flag.
  function refreshArea(i: number): void {
    const row = (i / 9) | 0;
    const col = i % 9;
    const boxRow = row - (row % 3);
    const boxCol = col - (col % 3);
    let k = 0;

    for (k = 0; k < 9; k++) {
      refreshCell(row * 9 + k);
      refreshCell(k * 9 + col);
      refreshCell((boxRow + ((k / 3) | 0)) * 9 + boxCol + (k % 3));
    }
  }

  function drawGridLines(): void {
    const span = C.cell * 9;
    let i = 0;
    let at = 0;

    for (i = 0; i <= 9; i++) {
      at = i * C.cell;
      h.setColor(i % 3 ? 1 : 3)
        .drawLine(C.gridX + at, C.gridY, C.gridX + at, C.gridY + span)
        .drawLine(C.gridX, C.gridY + at, C.gridX + span, C.gridY + at);
    }
  }

  function drawPanel(): void {
    h.setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, 0)
      .drawString('SUDOKU', C.panelMid, 28)
      .setColor(2)
      .setFontMonofonto16()
      .drawString(levelName(level), C.panelMid, 50)
      .drawLine(C.panelX, 62, C.panelR, 62)
      .drawLine(C.panelX, 152, C.panelR, 152)
      .setFontAlign(-1, 0)
      .drawString('TIME', C.panelX + 2, 78)
      .drawString('EMPTY', C.panelX + 2, 98)
      .drawString('CLASH', C.panelX + 2, 118)
      .drawString('HINTS', C.panelX + 2, 138);
  }

  function drawStats(): void {
    h.clearRect(C.panelX + 90, 70, C.panelR, 146)
      .setColor(3)
      .setFontMonofonto16()
      .setFontAlign(1, 0)
      .drawString(timeText(), C.panelR, 78)
      .drawString(81 - filled, C.panelR, 98)
      .drawString(errors, C.panelR, 118)
      .drawString(hints, C.panelR, 138);
  }

  function drawHints(): void {
    h.clearRect(C.panelX, 158, C.panelR, 300)
      .setColor(2)
      .setFontMonofonto14()
      .setFontAlign(-1, 0);

    if (menu) {
      h.drawString('WHEEL  LEVEL', C.panelX + 2, 168)
        .drawString('L PRS  START', C.panelX + 2, 186)
        .drawString('STAT   CANCEL', C.panelX + 2, 204);
    } else if (won) {
      h.drawString('L PRS  NEW GAME', C.panelX + 2, 168)
        .drawString('STAT   NEW GAME', C.panelX + 2, 186)
        .drawString('DATA   LEVEL', C.panelX + 2, 204);
    } else if (editing) {
      h.drawString('UP     DIGIT +1', C.panelX + 2, 168)
        .drawString('DOWN   DIGIT -1', C.panelX + 2, 186)
        .drawString('L PRS  CONFIRM', C.panelX + 2, 204)
        .drawString('STAT   CANCEL', C.panelX + 2, 222);
    } else {
      h.drawString('L WHL  ROW', C.panelX + 2, 168)
        .drawString('R WHL  COLUMN', C.panelX + 2, 186)
        .drawString('L PRS  ENTER', C.panelX + 2, 204)
        .drawString('L HOLD HINT', C.panelX + 2, 222)
        .drawString('STAT   CLEAR', C.panelX + 2, 240)
        .drawString('DATA   NEW GAME', C.panelX + 2, 258);
    }

    h.setColor(1).drawString('ITEMS  EXIT', C.panelX + 2, 290);
  }

  function drawWin(): void {
    h.clearRect(45, 118, 269, 202)
      .setColor(3)
      .drawRect(45, 118, 269, 202)
      .drawRect(47, 120, 267, 200)
      .setFontMonofonto28()
      .setFontAlign(0, 0)
      .drawString('SOLVED', 157, 146)
      .setFontMonofonto18()
      .drawString(timeText() + '  ' + hints + ' HINTS', 157, 178);
  }

  function drawMenu(): void {
    let i = 0;
    let y = 0;

    h.clearRect(44, 90, 260, 238)
      .setColor(3)
      .drawRect(44, 90, 260, 238)
      .drawRect(46, 92, 258, 236)
      .setFontMonofonto18()
      .setFontAlign(0, 0)
      .drawString('NEW GAME', 152, 112);

    for (i = 0; i < 3; i++) {
      y = 148 + i * 30;
      if (i === menuPick) {
        h.setColor(2);
        Pip.shadeBox(58, y - 15, 246, y + 15);
      }
      h.setColor(3)
        .setFontMonofonto23()
        .setFontAlign(0, 0)
        .drawString(levelName(i), 152, y);
    }
  }

  function drawAll(): void {
    let i = 0;

    h.setBgColor(0).clear();
    drawGridLines();
    for (i = 0; i < 81; i++) drawCell(i);
    drawPanel();
    drawStats();
    drawHints();
    if (won) drawWin();
  }

  function moveCursor(rowStep: number, colStep: number): void {
    const previous = cursor;

    cursor =
      ((((cursor / 9) | 0) + rowStep + 9) % 9) * 9 +
      (((cursor % 9) + colStep + 9) % 9);
    drawCell(previous);
    drawCell(cursor);
  }

  // Scrolling up counts the digit up, so the wheel direction matches the
  // digit order rather than the screen order. dir is 1 for down.
  function changeDigit(dir: KnobDirection): void {
    editDigit = ((editDigit - dir + 8) % 9) + 1;
    blink = true;
    drawCell(cursor);
  }

  function winGame(): void {
    won = true;
    editing = false;
    drawCell(cursor);
    drawWin();
    drawHints();
    Pip.playSound('SELECT');
  }

  function setValue(value: number): void {
    if (!board[cursor]) filled++;
    board[cursor] = value;
    refreshArea(cursor);
    drawCell(cursor);
    drawStats();
    if (filled === 81 && errors === 0) winGame();
  }

  function commitDigit(): void {
    editing = false;
    drawHints();

    if (board[cursor] === editDigit) {
      drawCell(cursor);
      Pip.playSound('HIGHLIGHT');
      return;
    }

    Pip.playSound('TAB');
    setValue(editDigit);
  }

  function giveHint(): void {
    if (board[cursor] === solution[cursor]) {
      Pip.playSound('HIGHLIGHT');
      return;
    }

    hints++;
    Pip.playSound('SELECT');
    setValue(solution[cursor]);
  }

  function clearCell(): void {
    if (given[cursor] || !board[cursor]) {
      Pip.playSound('HIGHLIGHT');
      return;
    }

    board[cursor] = 0;
    filled--;
    refreshArea(cursor);
    drawCell(cursor);
    drawStats();
    Pip.playSound('TAB');
  }

  function beginEdit(): void {
    if (given[cursor]) {
      Pip.playSound('HIGHLIGHT');
      return;
    }

    editing = true;
    editDigit = board[cursor] ? board[cursor] : 1;
    blink = true;
    drawCell(cursor);
    drawHints();
    Pip.playSound('SELECT');
  }

  function cancelEdit(): void {
    editing = false;
    drawCell(cursor);
    drawHints();
    Pip.playSound('HIGHLIGHT');
  }

  function newGame(): void {
    newPuzzle();
    cursor = 40;
    editing = false;
    won = false;
    editDigit = 1;
    errors = 0;
    hints = 0;
    shownSeconds = 0;
    startTime = getTime();
    drawAll();
  }

  function openMenu(): void {
    menu = true;
    menuPick = level;
    editing = false;
    drawMenu();
    drawHints();
    Pip.playSound('SELECT');
  }

  function moveMenu(dir: KnobDirection): void {
    menuPick = (menuPick + dir + 3) % 3;
    drawMenu();
    Pip.playSound('SCROLL');
  }

  // Cancelling repaints everything, which also restores whatever the overlay
  // covered: the grid, and the win box when the menu was opened over it.
  function closeMenu(): void {
    menu = false;
    drawAll();
    Pip.playSound('HIGHLIGHT');
  }

  function startLevel(): void {
    menu = false;
    level = menuPick;
    newGame();
    Pip.playSound('TAB');
  }

  function onTick(): void {
    let seconds = 0;

    blink = !blink;
    if (editing) drawCell(cursor);
    if (won) return;

    seconds = Math.floor(getTime() - startTime);
    if (seconds !== shownSeconds) {
      shownSeconds = seconds;
      drawStats();
    }
  }

  function onKnob1(dir: KnobDirection, long: boolean | undefined): void {
    if (menu) {
      if (dir) moveMenu(dir);
      else if (long) closeMenu();
      else startLevel();
    } else if (won) {
      if (!dir) newGame();
    } else if (dir) {
      if (editing) changeDigit(dir);
      else moveCursor(dir, 0);
      Pip.playSound('SCROLL');
    } else if (long) {
      if (editing) cancelEdit();
      else giveHint();
    } else if (editing) {
      commitDigit();
    } else {
      beginEdit();
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  // The right wheel only scrolls on this hardware, so it carries no press
  // actions; STAT and DATA stand in for them. Registering the handler still
  // claims the exclusive slot so the firmware does not act on the wheel.
  function onKnob2(dir: KnobDirection): void {
    if (!dir) return;

    if (menu) {
      moveMenu(dir);
    } else if (!won) {
      if (editing) changeDigit(dir);
      else moveCursor(0, dir);
      Pip.playSound('SCROLL');
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  // STAT and DATA normally change page, which drops straight out of a
  // notDefault holotape. Running ahead of the OS handler and swallowing both
  // turns them into app buttons, covering the presses the right wheel cannot
  // make. ITEM is left alone and stays the way out.
  function onMode(m: number): void {
    if (m === 1) return;
    E.stopEventPropagation();

    if (m === 2) {
      if (menu) closeMenu();
      else openMenu();
    } else if (menu) {
      closeMenu();
    } else if (won) {
      newGame();
    } else if (editing) {
      cancelEdit();
    } else {
      clearCell();
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  // Init last, Espruino does not hoist functions.
  newGame();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  Pip.prependListener('mode', onMode);
  tick = setInterval(onTick, 500);
  h.flip();
  Pip.lastFlip = getTime();

  return {
    id: 'SUDOKU',
    notDefault: true,
    fullscreen: true,
    remove: function (): void {
      clearInterval(tick);
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      Pip.removeListener('mode', onMode);
      Pip.audioStop();
      h.clear();
    },
  };
});
