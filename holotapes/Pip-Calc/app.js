// =============================================================================
//  Name: Pip-Calc
//  Author: @tylerjbartlett
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/tylerjbartlett/pip-boy-3000a-holotapes
// =============================================================================

(function () {
  // General variables
  const APP_NAME = 'PIP-CALC';
  const APP_VERSION = 'v1.0.0';

  // Screen layout variables
  const W = h.getWidth();
  const H = h.getHeight();
  const C = {
    DISP_X: 16,
    DISP_Y: 8,
    DISP_W: W - 32,
    DISP_H: 52,
    DISP_MAX_CHARS: 24,
    EXPR_MAX_CHARS: 14,
    GRID_X: 16,
    GRID_Y: 68,
    BTN_GAP: 4,
    BTN_H: 48,
    BTN_PAD: 6,
  };
  C.BTN_W = (C.DISP_W - 3 * C.BTN_GAP) / 4;

  // prettier-ignore
  const BTNS = [
    '(', ')', '*', '/',
    '7', '8', '9', '-',
    '4', '5', '6', '+',
    '1', '2', '3', '=',
    '0', '.', 'DEL', 'CLR',
  ];

  // Store original device settings to restore on exit
  let originalIdleTimeout = Pip.settings.idleTimeout;

  // ── Calculator state ─────────────────────────────────────────────────────────
  let expression = '0';
  let justEvaluated = false;
  let selectedCol = 0;
  let selectedRow = 0;
  let dirtyDisplay = 1;
  let dirtyCells = []; // list of {col, row} cells needing redraw

  function markDirty(col, row) {
    dirtyCells.push({ col: col, row: row });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function getButtonLabel(col, row) {
    return BTNS[row * 4 + col] || '';
  }

  function trimDisplay(s) {
    return s.length > C.DISP_MAX_CHARS
      ? s.slice(s.length - C.DISP_MAX_CHARS)
      : s;
  }

  function evaluateExpression(s) {
    try {
      const result = eval(s);
      if (result === undefined || result !== result) return 'ERR';
      if (result === Infinity || result === -Infinity) return 'ERR';
      // Only round non-integer results — rounding is meant to clean up
      // float noise from division/decimals (e.g. 0.1+0.2). For integers it
      // serves no purpose and pushes the value through a much larger
      // intermediate (result * 1e8), which has caused incorrect output on
      // Espruino for large integers (e.g. 999999*999999). Uses `% 1` rather
      // than Number.isInteger() since that method isn't guaranteed to exist
      // on this device's JS engine.
      const value = result % 1 === 0 ? result : Math.round(result * 1e8) / 1e8;
      const formatted = '' + value;
      if (formatted.length > C.DISP_MAX_CHARS) return 'ERR';
      return formatted;
    } catch (e) {
      return 'ERR';
    }
  }

  // ── Draw ─────────────────────────────────────────────────────────────────────
  function drawDisplay() {
    h.clearRect(C.DISP_X, C.DISP_Y, C.DISP_X + C.DISP_W, C.DISP_Y + C.DISP_H);
    h.drawRect(C.DISP_X, C.DISP_Y, C.DISP_X + C.DISP_W, C.DISP_Y + C.DISP_H);

    h.setClipRect(
      C.DISP_X + 1,
      C.DISP_Y + 1,
      C.DISP_X + C.DISP_W - 1,
      C.DISP_Y + C.DISP_H - 1,
    );

    h.setFontAlign(-1, -1, 0).setFontMonofonto14();
    h.drawString(APP_NAME + ' ' + APP_VERSION, C.DISP_X + 4, C.DISP_Y + 4);

    const displayString = trimDisplay(expression);
    h.setFontMonofonto36().setFontAlign(1, -1, 0);
    h.drawString(displayString, C.DISP_X + C.DISP_W - 6, C.DISP_Y + 14);

    h.setClipRect(0, 0, W - 1, H - 1);
  }

  function drawButton(col, row) {
    const label = getButtonLabel(col, row);
    if (label === '') return;

    const buttonX = C.GRID_X + col * (C.BTN_W + C.BTN_GAP);
    const buttonY = C.GRID_Y + row * (C.BTN_H + C.BTN_GAP);
    const isSelected = col === selectedCol && row === selectedRow;

    h.clearRect(buttonX, buttonY, buttonX + C.BTN_W - 1, buttonY + C.BTN_H - 1);
    h.drawRect(buttonX, buttonY, buttonX + C.BTN_W - 1, buttonY + C.BTN_H - 1);

    h.setClipRect(
      buttonX + C.BTN_PAD,
      buttonY + 1,
      buttonX + C.BTN_W - 1 - C.BTN_PAD,
      buttonY + C.BTN_H - 2,
    );
    h.setFontMonofonto16().setFontAlign(0, 0, 0);
    h.drawString(label, buttonX + C.BTN_W / 2, buttonY + C.BTN_H / 2);
    h.setClipRect(0, 0, W - 1, H - 1);

    if (isSelected)
      Pip.shadeBox(
        buttonX,
        buttonY,
        buttonX + C.BTN_W - 1,
        buttonY + C.BTN_H - 1,
      );
  }

  function drawGrid() {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 4; col++) drawButton(col, row);
    }
  }

  function draw() {
    if (dirtyDisplay) {
      drawDisplay();
      dirtyDisplay = 0;
    }
    if (dirtyCells.length) {
      for (let i = 0; i < dirtyCells.length; i++) {
        drawButton(dirtyCells[i].col, dirtyCells[i].row);
      }
      dirtyCells = [];
    }
  }

  function drawAll() {
    dirtyDisplay = 0;
    dirtyCells = [];
    drawDisplay();
    drawGrid();
  }

  // ── Input handlers ───────────────────────────────────────────────────────────
  function pressSelected() {
    const label = getButtonLabel(selectedCol, selectedRow);
    if (label === '') return;

    Pip.playSound('TAB');

    if (label === 'CLR') {
      expression = '0';
      justEvaluated = false;
    } else if (label === 'DEL') {
      if (justEvaluated) {
        expression = '0';
        justEvaluated = false;
      } else {
        expression = expression.length > 1 ? expression.slice(0, -1) : '0';
      }
    } else if (label === '=') {
      expression = evaluateExpression(expression);
      justEvaluated = true;
    } else if (justEvaluated) {
      const isOperator =
        label === '+' || label === '-' || label === '*' || label === '/';
      expression = isOperator ? expression + label : label;
      justEvaluated = false;
    } else {
      const isOperator =
        label === '+' || label === '-' || label === '*' || label === '/';
      const lastChar = expression.slice(-1);
      const lastIsOperator =
        lastChar === '+' ||
        lastChar === '-' ||
        lastChar === '*' ||
        lastChar === '/';

      if (isOperator && lastIsOperator) {
        expression = expression.slice(0, -1) + label;
      } else if (expression.length >= C.EXPR_MAX_CHARS) {
        // Input is already at the safety cap — ignore further appends.
        // (Operator replacement above and DEL are unaffected by this cap.)
      } else {
        expression =
          expression === '0' && label !== '.' ? label : expression + label;
      }
    }

    dirtyDisplay = 1;
    draw();
  }

  function onLeftWheel(dir, longPress) {
    if (dir === 0) {
      if (longPress) {
        Pip.playSound('TAB');
        expression = '0';
        justEvaluated = false;
        dirtyDisplay = 1;
        draw();
      } else {
        pressSelected();
      }
    } else {
      Pip.playSound('SCROLL');
      const previousRow = selectedRow;
      selectedRow += dir === 1 ? 1 : -1;
      if (selectedRow > 4) selectedRow = 0;
      if (selectedRow < 0) selectedRow = 4;
      markDirty(selectedCol, previousRow);
      markDirty(selectedCol, selectedRow);
      draw();
    }
  }

  function onRightWheel(dir) {
    if (dir === 0) return;
    Pip.playSound('SCROLL');
    const previousCol = selectedCol;
    selectedCol += dir === 1 ? 1 : -1;
    if (selectedCol > 3) selectedCol = 0;
    if (selectedCol < 0) selectedCol = 3;
    markDirty(previousCol, selectedRow);
    markDirty(selectedCol, selectedRow);
    draw();
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  Pip.settings.idleTimeout = 0;
  h.clear(1).flip();

  Pip.onExclusive('knob1', onLeftWheel);
  Pip.onExclusive('knob2', onRightWheel);

  drawAll();

  return {
    id: 'PIPCALC',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      Pip.removeListener('knob1', onLeftWheel);
      Pip.removeListener('knob2', onRightWheel);
      Pip.settings.idleTimeout = originalIdleTimeout;
    },
  };
});
