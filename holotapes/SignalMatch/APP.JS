(function () {
  // Pip-Boy 3000 screen is a fixed 480x320 pixel buffer.
  const SCREEN_WIDTH = 480;
  const SCREEN_HEIGHT = 320;
  const CENTER_X = SCREEN_WIDTH / 2;
  const CENTER_Y = 178;
  const OUTER_RING_RADIUS = 70;
  const RING_INNER_RADIUS = 52;
  const INNER_HOLE_RADIUS = 20;
  const WHEEL_POSITIONS = 16;

  // Maps wheel position index -> digit (0-7) shown there.
  // Digits sit on every other position around the 16-position wheel.
  const positionValues = {};
  for (let digit = 0; digit < 8; digit++) {
    positionValues[2 * digit] = digit;
  }

  function angleForPosition(index) {
    return -Math.PI / 2 + index * ((2 * Math.PI) / WHEEL_POSITIONS);
  }

  // Computes the 4-point "gear tooth" polygon for one wheel position.
  function wedgeGeometry(index) {
    const angleStep = (2 * Math.PI) / WHEEL_POSITIONS;
    const angle = angleForPosition(index);
    const innerHalfAngle = 0.42 * angleStep;
    const outerHalfAngle = 0.22 * angleStep;
    const innerR = 66;
    const outerR = 84;
    return {
      angle: angle,
      outerR: outerR,
      x0: CENTER_X + innerR * Math.cos(angle - innerHalfAngle),
      y0: CENTER_Y + innerR * Math.sin(angle - innerHalfAngle),
      x1: CENTER_X + innerR * Math.cos(angle + innerHalfAngle),
      y1: CENTER_Y + innerR * Math.sin(angle + innerHalfAngle),
      x2: CENTER_X + outerR * Math.cos(angle + outerHalfAngle),
      y2: CENTER_Y + outerR * Math.sin(angle + outerHalfAngle),
      x3: CENTER_X + outerR * Math.cos(angle - outerHalfAngle),
      y3: CENTER_Y + outerR * Math.sin(angle - outerHalfAngle),
    };
  }

  // Draws the small dumbbell-shaped marker at an active (numbered) position.
  function drawPositionMarker(angle) {
    const dx = 5 * -Math.sin(angle);
    const dy = 5 * Math.cos(angle);
    const x1 = CENTER_X + 18 * Math.cos(angle);
    const y1 = CENTER_Y + 18 * Math.sin(angle);
    const x2 = CENTER_X + RING_INNER_RADIUS * Math.cos(angle);
    const y2 = CENTER_Y + RING_INNER_RADIUS * Math.sin(angle);
    h.setColor(1);
    h.fillPoly([
      x1 + dx,
      y1 + dy,
      x2 + dx,
      y2 + dy,
      x2 - dx,
      y2 - dy,
      x1 - dx,
      y1 - dy,
    ]);
    h.setColor(2);
    h.fillCircle(x1, y1, 5);
    h.fillCircle(x2, y2, 5);
  }

  // --- Game state ---
  let gameState = 'idle'; // 'idle' | 'playback' | 'input' | 'gameover'
  let sequence = [];
  let round = 0;
  let progress = 0;
  let selectedValue = 0;
  let highlightValue = -1;
  let statusText = 'HOLD LEFT WHEEL TO START';
  let pendingTimer = null;

  function drawFrame() {
    const innerMargin = 10;
    const cornerNotch = 14;
    h.setColor(1);
    h.drawLine(6, 6, SCREEN_WIDTH - 6, 6);
    h.drawLine(SCREEN_WIDTH - 6, 6, SCREEN_WIDTH - 6, SCREEN_HEIGHT - 6);
    h.drawLine(SCREEN_WIDTH - 6, SCREEN_HEIGHT - 6, 6, SCREEN_HEIGHT - 6);
    h.drawLine(6, SCREEN_HEIGHT - 6, 6, 6);
    h.drawLine(
      innerMargin,
      innerMargin,
      SCREEN_WIDTH - innerMargin,
      innerMargin,
    );
    h.drawLine(
      SCREEN_WIDTH - innerMargin,
      innerMargin,
      SCREEN_WIDTH - innerMargin,
      SCREEN_HEIGHT - innerMargin,
    );
    h.drawLine(
      SCREEN_WIDTH - innerMargin,
      SCREEN_HEIGHT - innerMargin,
      innerMargin,
      SCREEN_HEIGHT - innerMargin,
    );
    h.drawLine(
      innerMargin,
      SCREEN_HEIGHT - innerMargin,
      innerMargin,
      innerMargin,
    );
    h.drawLine(6, 20, 20, 6);
    h.drawLine(SCREEN_WIDTH - 6, 20, SCREEN_WIDTH - 6 - cornerNotch, 6);
    h.drawLine(6, SCREEN_HEIGHT - 6 - cornerNotch, 20, SCREEN_HEIGHT - 6);
    h.drawLine(
      SCREEN_WIDTH - 6,
      SCREEN_HEIGHT - 6 - cornerNotch,
      SCREEN_WIDTH - 6 - cornerNotch,
      SCREEN_HEIGHT - 6,
    );
    h.drawLine(0.18 * SCREEN_WIDTH, 48, 0.82 * SCREEN_WIDTH, 48);
    h.drawLine(
      0.18 * SCREEN_WIDTH,
      SCREEN_HEIGHT - 22,
      0.82 * SCREEN_WIDTH,
      SCREEN_HEIGHT - 22,
    );
  }

  function drawWheel() {
    h.setColor(1).fillCircle(CENTER_X, CENTER_Y, OUTER_RING_RADIUS);
    h.setColor(0).fillCircle(CENTER_X, CENTER_Y, RING_INNER_RADIUS);

    for (const key in positionValues) {
      drawPositionMarker(angleForPosition(Number(key)));
    }

    for (let position = 0; position < WHEEL_POSITIONS; position++) {
      const digit = positionValues[position];
      const hasDigit = digit !== undefined;
      const isHighlighted =
        (hasDigit && gameState === 'playback' && highlightValue === digit) ||
        (hasDigit && gameState === 'input' && selectedValue === digit);
      const wedge = wedgeGeometry(position);

      h.setColor(hasDigit ? (isHighlighted ? 3 : 2) : 1);
      h.fillPoly([
        wedge.x0,
        wedge.y0,
        wedge.x1,
        wedge.y1,
        wedge.x2,
        wedge.y2,
        wedge.x3,
        wedge.y3,
      ]);

      if (hasDigit) {
        const labelX = CENTER_X + 96 * Math.cos(wedge.angle);
        const labelY = CENTER_Y + 96 * Math.sin(wedge.angle);
        h.setColor(isHighlighted ? 3 : 2)
          .setFontMonofonto16()
          .setFontAlign(0, 0)
          .drawString(String(digit + 1), labelX, labelY);
      }
    }

    h.setColor(1).fillCircle(CENTER_X, CENTER_Y, INNER_HOLE_RADIUS);
    h.setColor(2).drawCircle(CENTER_X, CENTER_Y, INNER_HOLE_RADIUS);
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(0, 0)
      .drawString('101', CENTER_X, CENTER_Y);
  }

  function render() {
    h.clear(0);
    drawFrame();
    h.setColor(3)
      .setFontMonofonto28()
      .setFontAlign(0, 0)
      .drawString('SIGNAL MATCH', SCREEN_WIDTH / 2, 18)
      .setFontMonofonto16()
      .drawString('VAULT-TEC LOCK - ROUND ' + round, SCREEN_WIDTH / 2, 38)
      .drawString(statusText, SCREEN_WIDTH / 2, SCREEN_HEIGHT - 14);
    drawWheel();
  }

  function clearPendingTimer() {
    if (pendingTimer !== null) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  }

  function playbackStep(step) {
    if (step >= sequence.length) {
      gameState = 'input';
      progress = 0;
      selectedValue = 0;
      statusText = 'TURN EITHER WHEEL, TAP LEFT TO CONFIRM';
      render();
      return;
    }
    highlightValue = sequence[step];
    Pip.playSound('SCROLL');
    render();
    pendingTimer = setTimeout(function () {
      highlightValue = -1;
      render();
      pendingTimer = setTimeout(function () {
        playbackStep(step + 1);
      }, 180);
    }, 450);
  }

  function startRound() {
    round++;
    sequence.push(Math.randInt(8));
    gameState = 'playback';
    statusText = 'WATCH THE PATTERN';
    render();
    pendingTimer = setTimeout(function () {
      playbackStep(0);
    }, 600);
  }

  function startGame() {
    clearPendingTimer();
    sequence = [];
    round = 0;
    progress = 0;
    selectedValue = 0;
    highlightValue = -1;
    gameState = 'playback';
    startRound();
  }

  function confirmSelection(value) {
    if (value === sequence[progress]) {
      Pip.playSound('TAB');
      progress++;
      if (progress === sequence.length) {
        statusText = 'CORRECT!';
        gameState = 'idle';
        render();
        pendingTimer = setTimeout(startRound, 800);
      } else {
        render();
      }
    } else {
      gameState = 'gameover';
      statusText = 'WRONG - SCORE ' + (round - 1) + ' - HOLD LEFT TO RETRY';
      render();
    }
  }

  function rotateSelection(delta) {
    if (gameState === 'input') {
      selectedValue = (selectedValue + delta + 8) % 8;
      Pip.playSound('SCROLL');
      render();
    }
  }

  function onLeftWheel(delta, held) {
    if (delta) {
      rotateSelection(delta);
    } else if (held) {
      startGame();
    } else if (gameState === 'input') {
      confirmSelection(selectedValue);
    }
  }

  function onRightWheel(delta) {
    if (delta) rotateSelection(delta);
  }

  Pip.audioStop();
  Pip.onExclusive('knob1', onLeftWheel);
  Pip.onExclusive('knob2', onRightWheel);
  render();

  return {
    id: 'signal-match',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      clearPendingTimer();
      Pip.removeListener('knob1', onLeftWheel);
      Pip.removeListener('knob2', onRightWheel);
      Pip.audioStop();
      h.clear();
    },
  };
});
