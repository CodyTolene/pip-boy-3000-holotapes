(function () {
  const fillRectCached = h.fillRect.bind(h),
    drawStringCached = h.drawString.bind(h),
    SFX = {
      PADDLE_PLAYER: 'HOLO/PIPPONG/PADDLE1.WAV',
      PADDLE_CPU: 'HOLO/PIPPONG/PADDLE2.WAV',
      WALL: 'HOLO/PIPPONG/WALL.WAV',
      SCORE: 'HOLO/PIPPONG/SCORE.WAV',
      WIN: 'HOLO/PIPPONG/WIN.WAV'
    },
    FIELD_LEFT = 18,
    FIELD_TOP = 40,
    FIELD_RIGHT = 465,
    FIELD_BOTTOM = 300,
    FIELD_W = FIELD_RIGHT - FIELD_LEFT,
    FIELD_H = FIELD_BOTTOM - FIELD_TOP,
    PADDLE_W = 6,
    PADDLE_H = 44,
    PLAYER_X = FIELD_RIGHT - 14 - PADDLE_W,
    CPU_X = FIELD_LEFT + 14,
    BALL_R = 4,
    PADDLE_SPEED = 4.5,
    CPU_SPEED = 3.2,
    BALL_SPEED_START = 3.6,
    BALL_SPEED_MAX = 8,
    BOUNCE_ANGLE = 0.9,
    WIN_SCORE = 7;
  let mainLoopInterval = null,
    gameState = 'TITLE_SCREEN',
    playerY = FIELD_TOP + FIELD_H / 2 - PADDLE_H / 2,
    cpuY = FIELD_TOP + FIELD_H / 2 - PADDLE_H / 2,
    prevPlayerY = playerY,
    prevCpuY = cpuY,
    ballX = 0,
    ballY = 0,
    ballVX = 0,
    ballVY = 0,
    ballSpeed = BALL_SPEED_START,
    prevBallX = 0,
    prevBallY = 0,
    playerScore = 0,
    cpuScore = 0,
    winnerLabel = '',
    fieldDirty = 1;
  function showTitleScreen() {
    ((gameState = 'TITLE_SCREEN'),
      (winnerLabel = ''),
      h
        .setColor(0)
        .fillRect(0, 0, 480, 320)
        .setColor(2)
        .drawRect(18, 18, 465, 298),
      h
        .setFont('Monofonto36')
        .setFontAlign(0, -1)
        .setColor(3)
        .drawString('PIP PONG', 240, 52));
    (h.setColor(3).fillRect(140, 140, 148, 188).fillRect(332, 140, 340, 188).fillCircle(218, 150, 5),
      h.setColor(2));
    for (let t = 128; t < 200; t += 14) h.fillRect(238, t, 242, t + 7);
    (h
      .setFont('Monofonto23')
      .setFontAlign(0, -1)
      .setColor(3)
      .drawString('TURN RIGHT WHEEL TO MOVE PADDLE', 240, 225)
      .drawString('PRESS LEFT WHEEL TO START!', 240, 255),
      Pip.onExclusive('knob1', handleKnobInput),
      Pip.onExclusive('knob2', handlePaddleInput));
  }
  function handleKnobInput(t) {
    0 === t &&
      ('TITLE_SCREEN' === gameState
        ? (Pip.audioStart(SFX.WALL), startMatch())
        : 'GAMEOVER' === gameState && showTitleScreen());
  }
  function handlePaddleInput(t) {
    'PLAYING' === gameState &&
      ((playerY += t * PADDLE_SPEED),
        playerY < FIELD_TOP + 2
          ? (playerY = FIELD_TOP + 2)
          : playerY + PADDLE_H > FIELD_BOTTOM - 2 &&
            (playerY = FIELD_BOTTOM - 2 - PADDLE_H));
  }
  function startMatch() {
    ((gameState = 'PLAYING'),
      (playerScore = 0),
      (cpuScore = 0),
      (playerY = prevPlayerY = FIELD_TOP + FIELD_H / 2 - PADDLE_H / 2),
      (cpuY = prevCpuY = FIELD_TOP + FIELD_H / 2 - PADDLE_H / 2),
      (fieldDirty = 1),
      serveBall(Math.randInt(2) ? 1 : -1));
  }
  function serveBall(dir) {
    ((ballX = FIELD_LEFT + FIELD_W / 2),
      (ballY = FIELD_TOP + FIELD_H / 2),
      (prevBallX = ballX),
      (prevBallY = ballY),
      (ballSpeed = BALL_SPEED_START));
    const t = 0.017453292519943295 * (Math.randInt(60) - 30);
    ((ballVX = Math.cos(t) * ballSpeed * dir), (ballVY = Math.sin(t) * ballSpeed));
  }
  function drawField(t, o, a, e) {
    'ram';
    (void 0 === t && ((t = 0), (o = 0), (a = 480), (e = 320)),
      t <= FIELD_RIGHT &&
        a >= FIELD_LEFT &&
        o <= FIELD_BOTTOM &&
        e >= FIELD_TOP &&
        h.setColor(3).drawRect(FIELD_LEFT, FIELD_TOP, FIELD_RIGHT, FIELD_BOTTOM));
    const r = FIELD_LEFT + FIELD_W / 2;
    if (a >= r - 2 && t <= r + 2) {
      h.setColor(2);
      for (let n = FIELD_TOP + 6; n < FIELD_BOTTOM; n += 16)
        e >= n && o <= n + 8 && fillRectCached(r - 1, n, r + 1, n + 8);
    }
  }
  function drawScore() {
    'ram';
    const t = FIELD_LEFT + FIELD_W / 2;
    (h.setColor(0).fillRect(0, 0, 480, 38),
      h
        .setFont('Monofonto36')
        .setFontAlign(0, -1)
        .setColor(3)
        .drawString(cpuScore.toString(), t - 80, 4)
        .drawString(playerScore.toString(), t + 80, 4));
  }
  function drawPaddleShape(t, o) {
    'ram';
    h.setColor(3).fillRect(t, o, t + PADDLE_W, o + PADDLE_H);
  }
  function drawBallShape(t, o) {
    'ram';
    h.setColor(3).fillCircle(t, o, BALL_R);
  }
  function bounceOffPaddle(t, o) {
    'ram';
    let a = (ballY - (t + PADDLE_H / 2)) / (PADDLE_H / 2);
    (a < -1 ? (a = -1) : a > 1 && (a = 1), (ballSpeed = Math.min(ballSpeed * 1.06, BALL_SPEED_MAX)));
    const e = a * BOUNCE_ANGLE;
    ((ballVX = Math.cos(e) * ballSpeed * o), (ballVY = Math.sin(e) * ballSpeed));
  }
  function displayWinner() {
    (h
      .setColor(0)
      .fillRect(120, 130, 360, 190)
      .setColor(3)
      .drawRect(122, 132, 358, 188),
      h
        .setFont('Monofonto18')
        .setFontAlign(0, -1)
        .setColor(3)
        .drawString(winnerLabel, 240, 145)
        .setFont('Monofonto14')
        .drawString('Press left wheel to play again!', 240, 172));
  }
  function updatePhysics() {
    'ram';
    if (fieldDirty)
      return (
        (fieldDirty = 0),
        h.setColor(0).fillRect(0, 0, 480, 320),
        drawField(),
        drawScore(),
        drawPaddleShape(PLAYER_X, playerY),
        drawPaddleShape(CPU_X, cpuY),
        drawBallShape(ballX, ballY),
        h.flip(),
        (Pip.lastFlip = getTime()),
        void 0
      );
    h.setColor(0);
    const t = Math.min(playerY, prevPlayerY) - 2,
      o = Math.max(playerY, prevPlayerY) + PADDLE_H + 2,
      a = Math.min(cpuY, prevCpuY) - 2,
      e = Math.max(cpuY, prevCpuY) + PADDLE_H + 2;
    (fillRectCached(PLAYER_X - 2, t, PLAYER_X + PADDLE_W + 2, o),
      fillRectCached(CPU_X - 2, a, CPU_X + PADDLE_W + 2, e),
      fillRectCached(
        prevBallX - BALL_R - 2,
        prevBallY - BALL_R - 2,
        prevBallX + BALL_R + 2,
        prevBallY + BALL_R + 2
      ));
    ((prevPlayerY = playerY), (prevCpuY = cpuY));
    const r = cpuY + PADDLE_H / 2;
    (r < ballY - 4
      ? (cpuY += CPU_SPEED)
      : r > ballY + 4 && (cpuY -= CPU_SPEED),
      cpuY < FIELD_TOP + 2
        ? (cpuY = FIELD_TOP + 2)
        : cpuY + PADDLE_H > FIELD_BOTTOM - 2 && (cpuY = FIELD_BOTTOM - 2 - PADDLE_H));
    ((prevBallX = ballX), (prevBallY = ballY), (ballX += ballVX), (ballY += ballVY));
    (ballY - BALL_R <= FIELD_TOP
      ? ((ballY = FIELD_TOP + BALL_R), (ballVY = -ballVY), Pip.audioStart(SFX.WALL))
      : ballY + BALL_R >= FIELD_BOTTOM &&
        ((ballY = FIELD_BOTTOM - BALL_R), (ballVY = -ballVY), Pip.audioStart(SFX.WALL)));
    (ballVX > 0 &&
      ballX + BALL_R >= PLAYER_X &&
      ballX <= PLAYER_X + PADDLE_W &&
      ballY + BALL_R >= playerY &&
      ballY - BALL_R <= playerY + PADDLE_H
      ? ((ballX = PLAYER_X - BALL_R),
        bounceOffPaddle(playerY, -1),
        Pip.audioStart(SFX.PADDLE_PLAYER))
      : ballVX < 0 &&
        ballX - BALL_R <= CPU_X + PADDLE_W &&
        ballX >= CPU_X &&
        ballY + BALL_R >= cpuY &&
        ballY - BALL_R <= cpuY + PADDLE_H &&
        ((ballX = CPU_X + PADDLE_W + BALL_R), bounceOffPaddle(cpuY, 1), Pip.audioStart(SFX.PADDLE_CPU)));
    let n = !1;
    (ballX < FIELD_LEFT - BALL_R
      ? ((playerScore += 1),
        Pip.audioStart(SFX.SCORE),
        (n = !0),
        playerScore >= WIN_SCORE
          ? ((gameState = 'GAMEOVER'), (winnerLabel = 'PLAYER WINS!!!'), Pip.audioStart(SFX.WIN))
          : serveBall(1))
      : ballX > FIELD_RIGHT + BALL_R &&
        ((cpuScore += 1),
          Pip.audioStart(SFX.SCORE),
          (n = !0),
          cpuScore >= WIN_SCORE
            ? ((gameState = 'GAMEOVER'), (winnerLabel = 'CPU WINS!!!'), Pip.audioStart(SFX.WIN))
            : serveBall(-1)));
    let l, c, i, s;
    n
      ? ((l = 0), (c = 0), (i = 480), (s = 320), h.setColor(0).fillRect(0, 0, 480, 320))
      : ((l = Math.min(PLAYER_X - 2, CPU_X - 2, ballX - BALL_R - 2, prevBallX - BALL_R - 2)),
        (i = Math.max(
          PLAYER_X + PADDLE_W + 2,
          CPU_X + PADDLE_W + 2,
          ballX + BALL_R + 2,
          prevBallX + BALL_R + 2
        )),
        (c = Math.min(t, a, ballY - BALL_R - 2, prevBallY - BALL_R - 2)),
        (s = Math.max(o, e, ballY + BALL_R + 2, prevBallY + BALL_R + 2)));
    (h.setClipRect(l, c, i, s),
      drawField(l, c, i, s),
      n && drawScore(),
      h.setClipRect(0, 0, 480, 320));
    (drawPaddleShape(PLAYER_X, playerY),
      drawPaddleShape(CPU_X, cpuY),
      drawBallShape(ballX, ballY),
      'GAMEOVER' === gameState && displayWinner(),
      h.flip(),
      (Pip.lastFlip = getTime()));
  }
  function mainLoop() {
    'ram';
    'PLAYING' === gameState && updatePhysics();
  }
  return (
    showTitleScreen(),
    (mainLoopInterval = setInterval(mainLoop, 33)),
    {
      id: 'pong',
      notDefault: !0,
      fullscreen: !0,
      remove: function () {
        (mainLoopInterval &&
          (clearInterval(mainLoopInterval), (mainLoopInterval = null)),
          Pip.removeListener('knob1', handleKnobInput),
          Pip.removeListener('knob2', handlePaddleInput),
          Pip.audioStop());
      }
    }
  );
});
