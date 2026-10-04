(function (): HolotapeApp {
  const C: PipRoidsConfig = {
    top: 38,
    height: 282,
    turn: 0.2618,
    accel: 0.34,
    drag: 0.986,
    maxSpeed: 4.6,
    shotSpeed: 6.5,
    shotLife: 40,
    thrustFrames: 7,
    spawnGuard: 44,
  };

  const SCORE_PATH = 'HOLO/PIPROIDS/SCORE.TXT';

  // One lumpy six-point rock outline, pre-rotated into 32 orientations and
  // stored as unit offsets: 32 headings of 12 floats each. Drawing a rock is
  // then a table lookup and a scale, with no trig and no rotation maths in
  // the frame loop, which is what the interpreter was spending its time on.
  const SPIN = new Float32Array(384);

  // Both indexed by rock size: 1 small, 2 medium, 3 large.
  const RADIUS = new Uint8Array([0, 7, 13, 22]);
  const VALUE = new Uint8Array([0, 100, 50, 20]);

  // Rocks are a flat array with a stride of six: x, y, vx, vy, heading, spin.
  // Heading is measured in SPIN table steps rather than radians, so drawing
  // can index straight into the table. A slot is live only while its rockSize
  // entry is non-zero. Twenty slots is the worst case, since five large rocks
  // become twenty small ones.
  const rock = new Float32Array(120);
  const rockSize = new Uint8Array(20);

  // Shots use a stride of four: x, y, vx, vy. Eight may be in the air at
  // once, and since each one holds its slot for its whole flight, that cap is
  // what sets the sustained rate of fire.
  const shot = new Float32Array(32);
  const shotLife = new Uint8Array(8);

  // Reused vertex scratch, so drawing never allocates inside the frame loop.
  const poly = new Int16Array(12);
  const shipPoly = new Int16Array(8);

  let shipX = 0;
  let shipY = 0;
  let shipVx = 0;
  let shipVy = 0;
  let shipAng = 0;
  let shipThrust = 0;
  let shipGuard = 0;
  let lives = 0;
  let score = 0;
  let best = 0;
  let wave = 0;
  let phase = 0;
  let frame = 0;
  let rockCount = 0;
  let newBest = false;
  let tick!: number;

  // Rotates the base outline into every SPIN slot once at startup. The shape
  // itself is a local, so its 48 bytes go away as soon as this returns.
  function buildSpin(): void {
    const base = new Float32Array([
      1.0, 0.0, 0.48, 0.9, -0.52, 0.8, -1.02, 0.0, -0.5, -0.82, 0.5, -0.88,
    ]);
    let a = 0;
    let n = 0;
    let c = 0;
    let s = 0;
    let at = 0;
    let ux = 0;
    let uy = 0;

    for (a = 0; a < 32; a++) {
      c = Math.cos(a * 0.19635);
      s = Math.sin(a * 0.19635);
      at = a * 12;
      for (n = 0; n < 6; n++) {
        ux = base[n * 2];
        uy = base[n * 2 + 1];
        SPIN[at + n * 2] = ux * c - uy * s;
        SPIN[at + n * 2 + 1] = ux * s + uy * c;
      }
    }
  }

  function spawnRock(
    x: number,
    y: number,
    size: number,
    vx: number,
    vy: number,
  ): void {
    let i = 0;
    let k = 0;

    for (i = 0; i < 20; i++) {
      if (rockSize[i]) continue;
      k = i * 6;
      rock[k] = x;
      rock[k + 1] = y;
      rock[k + 2] = vx;
      rock[k + 3] = vy;
      rock[k + 4] = Math.randInt(32);
      rock[k + 5] = (Math.randInt(9) - 4) * 0.056;
      rockSize[i] = size;
      rockCount++;
      return;
    }
  }

  // Rocks are placed on a ring around the ship rather than anywhere on the
  // field, so a new wave can never materialise on top of the player.
  function newWave(): void {
    let n = 0;
    let count = 0;
    let bearing = 0;
    let drift = 0;
    let x = 0;
    let y = 0;

    count = wave + 3;
    if (count > 5) count = 5;

    for (n = 0; n < count; n++) {
      bearing = Math.randInt(64) * 0.0982;
      drift = Math.randInt(64) * 0.0982;
      x = shipX + Math.cos(bearing) * (130 + Math.randInt(70));
      y = shipY + Math.sin(bearing) * (110 + Math.randInt(60));
      if (x < 0) x += 480;
      else if (x >= 480) x -= 480;
      if (y < C.top) y += C.height;
      else if (y >= 320) y -= C.height;
      spawnRock(x, y, 3, Math.cos(drift) * 0.75, Math.sin(drift) * 0.75);
    }
  }

  function resetShip(): void {
    shipX = 240;
    shipY = 179;
    shipVx = 0;
    shipVy = 0;
    shipAng = -1.5708;
    shipThrust = 0;
    shipGuard = C.spawnGuard;
  }

  function fire(): void {
    let i = 0;
    let k = 0;

    for (i = 0; i < 8; i++) {
      if (shotLife[i]) continue;
      k = i * 4;
      shot[k] = shipX + Math.cos(shipAng) * 13;
      shot[k + 1] = shipY + Math.sin(shipAng) * 13;
      shot[k + 2] = shipVx + Math.cos(shipAng) * C.shotSpeed;
      shot[k + 3] = shipVy + Math.sin(shipAng) * C.shotSpeed;
      shotLife[i] = C.shotLife;
      Pip.playSound('SCROLL');
      return;
    }
  }

  function hyperspace(): void {
    shipX = Math.randInt(480);
    shipY = C.top + Math.randInt(C.height);
    shipVx = 0;
    shipVy = 0;
    shipGuard = 14;
    Pip.playSound('SELECT');
  }

  function drawHud(): void {
    let i = 0;
    let x = 0;

    h.clearRect(0, 0, 479, 36)
      .setColor(3)
      .setFontMonofonto18()
      .setFontAlign(-1, 0)
      .drawString(score, 20, 23)
      .setColor(2)
      .setFontAlign(0, 0)
      .drawString('WAVE ' + wave, 240, 23)
      .setFontAlign(1, 0)
      .drawString('BEST ' + best, 460, 23)
      .setColor(3)
      .drawLine(0, 36, 479, 36);

    // Spare ships, drawn as outlines rather than a count so the HUD reads at
    // a glance. Three line calls each beats allocating a polygon per life.
    for (i = 0; i < lives - 1; i++) {
      x = 130 + i * 16;
      h.drawLine(x, 15, x - 5, 29)
        .drawLine(x, 15, x + 5, 29)
        .drawLine(x - 5, 29, x + 5, 29);
    }
  }

  function drawRocks(): void {
    'ram';
    let i = 0;
    let k = 0;
    let b = 0;
    let r = 0;
    let x = 0;
    let y = 0;

    h.setColor(3);
    for (i = 0; i < 20; i++) {
      if (!rockSize[i]) continue;
      k = i * 6;
      x = rock[k];
      y = rock[k + 1];
      r = RADIUS[rockSize[i]];
      b = (rock[k + 4] | 0) * 12;
      // Deliberately unrolled. Espruino runs this from source, so with up to
      // twenty rocks a frame the loop counter costs more than the six lines
      // it would save.
      poly[0] = x + SPIN[b] * r;
      poly[1] = y + SPIN[b + 1] * r;
      poly[2] = x + SPIN[b + 2] * r;
      poly[3] = y + SPIN[b + 3] * r;
      poly[4] = x + SPIN[b + 4] * r;
      poly[5] = y + SPIN[b + 5] * r;
      poly[6] = x + SPIN[b + 6] * r;
      poly[7] = y + SPIN[b + 7] * r;
      poly[8] = x + SPIN[b + 8] * r;
      poly[9] = y + SPIN[b + 9] * r;
      poly[10] = x + SPIN[b + 10] * r;
      poly[11] = y + SPIN[b + 11] * r;
      h.drawPoly(poly, true);
    }
  }

  function drawShots(): void {
    let i = 0;
    let k = 0;

    h.setColor(3);
    for (i = 0; i < 8; i++) {
      if (!shotLife[i]) continue;
      k = i * 4;
      h.fillRect(shot[k] - 1, shot[k + 1] - 1, shot[k] + 1, shot[k + 1] + 1);
    }
  }

  function drawShip(): void {
    let c = 0;
    let s = 0;

    // Blink away every other pair of frames while the respawn guard holds, so
    // the player can see at a glance that they cannot be hit yet.
    if (shipGuard && frame & 2) return;

    c = Math.cos(shipAng);
    s = Math.sin(shipAng);
    shipPoly[0] = shipX + c * 13;
    shipPoly[1] = shipY + s * 13;
    shipPoly[2] = shipX + (-9 * c - 7 * s);
    shipPoly[3] = shipY + (-9 * s + 7 * c);
    shipPoly[4] = shipX - c * 4;
    shipPoly[5] = shipY - s * 4;
    shipPoly[6] = shipX + (-9 * c + 7 * s);
    shipPoly[7] = shipY + (-9 * s - 7 * c);
    h.setColor(3).drawPoly(shipPoly, true);

    if (shipThrust && frame & 1) {
      h.setColor(2).drawLine(
        shipX - c * 6,
        shipY - s * 6,
        shipX - c * 16,
        shipY - s * 16,
      );
    }
  }

  // Clipped to the play area on purpose. A rock's vertices reach up to 22px
  // past its centre and the ship's nose 13px, so a sprite sitting just below
  // the divider would otherwise paint into the HUD band - which only gets
  // repainted when the score, wave, or ship count changes, leaving the stray
  // pixels stuck there. The left, right, and bottom edges need no clip since
  // the buffer bounds already cut those off.
  function drawField(): void {
    h.setClipRect(0, C.top, 479, 319).clearRect(0, C.top, 479, 319);
    drawRocks();
    drawShots();
    drawShip();
    h.setClipRect(0, 0, 479, 319);
  }

  function drawOverlay(): void {
    h.setColor(3).setFontAlign(0, 0);

    if (phase === 2) {
      h.clearRect(150, 142, 330, 198)
        .drawRect(150, 142, 330, 198)
        .setFontMonofonto28()
        .drawString('PAUSED', 240, 170);
      return;
    }

    h.clearRect(60, 78, 420, 262)
      .drawRect(60, 78, 420, 262)
      .drawRect(62, 80, 418, 260);

    if (phase === 0) {
      h.setFontMonofonto28()
        .drawString('PIPROIDS', 240, 110)
        .setFontMonofonto16()
        .drawString('L WHL   THRUST', 240, 150)
        .drawString('R WHL   TURN', 240, 172)
        .drawString('L PRS   FIRE', 240, 194)
        .drawString('L HOLD  HYPERSPACE', 240, 216)
        .setColor(2)
        .drawString('PRESS TO LAUNCH', 240, 244);
      return;
    }

    h.setFontMonofonto28()
      .drawString('GAME OVER', 240, 112)
      .setFontMonofonto23()
      .drawString('SCORE ' + score, 240, 154)
      .drawString('BEST ' + best, 240, 184);
    if (newBest) h.setColor(2).drawString('NEW BEST', 240, 212);
    h.setColor(2)
      .setFontMonofonto16()
      .drawString('PRESS TO PLAY AGAIN', 240, 242);
  }

  function drawAll(): void {
    h.setBgColor(0).clear();
    drawHud();
    if (phase === 1 || phase === 2) drawField();
    if (phase !== 1) drawOverlay();
  }

  function endGame(): void {
    phase = 3;
    if (newBest) fs.writeFileSync(SCORE_PATH, '' + best);
    drawAll();
    Pip.playSound('HIGHLIGHT');
  }

  function killShip(): void {
    lives--;
    Pip.playSound('HIGHLIGHT');
    if (lives < 1) {
      endGame();
      return;
    }
    resetShip();
    drawHud();
  }

  function hitRock(i: number): void {
    const k = i * 6;
    const size = rockSize[i];
    let n = 0;
    let a = 0;

    score += VALUE[size];
    if (score > best) {
      best = score;
      newBest = true;
    }
    rockSize[i] = 0;
    rockCount--;

    // A rock breaks into two of the next size down, each nudged off the
    // parent's course so the pieces visibly separate.
    if (size > 1) {
      for (n = 0; n < 2; n++) {
        a = Math.randInt(64) * 0.0982;
        spawnRock(
          rock[k],
          rock[k + 1],
          size - 1,
          rock[k + 2] + Math.cos(a) * 0.95,
          rock[k + 3] + Math.sin(a) * 0.95,
        );
      }
    }

    Pip.playSound('TAB');
    drawHud();
  }

  function stepPhysics(): void {
    'ram';
    let i = 0;
    let j = 0;
    let k = 0;
    let sp = 0;
    let dx = 0;
    let dy = 0;
    let r = 0;
    let r2 = 0;

    if (shipThrust) {
      shipThrust--;
      shipVx += Math.cos(shipAng) * C.accel;
      shipVy += Math.sin(shipAng) * C.accel;
      sp = Math.sqrt(shipVx * shipVx + shipVy * shipVy);
      if (sp > C.maxSpeed) {
        shipVx = (shipVx / sp) * C.maxSpeed;
        shipVy = (shipVy / sp) * C.maxSpeed;
      }
    }

    shipVx *= C.drag;
    shipVy *= C.drag;
    shipX += shipVx;
    shipY += shipVy;
    if (shipX < 0) shipX += 480;
    else if (shipX >= 480) shipX -= 480;
    if (shipY < C.top) shipY += C.height;
    else if (shipY >= 320) shipY -= C.height;
    if (shipGuard) shipGuard--;

    for (i = 0; i < 8; i++) {
      if (!shotLife[i]) continue;
      shotLife[i]--;
      k = i * 4;
      shot[k] += shot[k + 2];
      shot[k + 1] += shot[k + 3];
      if (shot[k] < 0) shot[k] += 480;
      else if (shot[k] >= 480) shot[k] -= 480;
      if (shot[k + 1] < C.top) shot[k + 1] += C.height;
      else if (shot[k + 1] >= 320) shot[k + 1] -= C.height;
    }

    // One pass over the rocks does the moving and both collision tests. The
    // shots have already moved and the ship is where it will stay this frame,
    // so folding three walks of the twenty slots into one is free.
    for (i = 0; i < 20; i++) {
      if (!rockSize[i]) continue;
      k = i * 6;
      rock[k] += rock[k + 2];
      rock[k + 1] += rock[k + 3];
      rock[k + 4] += rock[k + 5];
      if (rock[k] < 0) rock[k] += 480;
      else if (rock[k] >= 480) rock[k] -= 480;
      if (rock[k + 1] < C.top) rock[k + 1] += C.height;
      else if (rock[k + 1] >= 320) rock[k + 1] -= C.height;
      if (rock[k + 4] >= 32) rock[k + 4] -= 32;
      else if (rock[k + 4] < 0) rock[k + 4] += 32;

      r = RADIUS[rockSize[i]];
      r2 = r * r;
      for (j = 0; j < 8; j++) {
        if (!shotLife[j]) continue;
        // Reject on each axis before paying for the squared distance; almost
        // every shot and rock pair is nowhere near each other.
        dx = shot[j * 4] - rock[k];
        if (dx > r || dx < -r) continue;
        dy = shot[j * 4 + 1] - rock[k + 1];
        if (dy > r || dy < -r) continue;
        if (dx * dx + dy * dy < r2) {
          shotLife[j] = 0;
          hitRock(i);
          break;
        }
      }

      if (!rockSize[i] || shipGuard) continue;

      dx = shipX - rock[k];
      dy = shipY - rock[k + 1];
      r += 7;
      if (dx * dx + dy * dy < r * r) {
        killShip();
        return;
      }
    }

    if (rockCount) return;

    wave++;
    resetShip();
    newWave();
    drawHud();
    Pip.playSound('SELECT');
  }

  function onFrame(): void {
    frame = (frame + 1) & 255;
    if (phase !== 1) return;

    stepPhysics();
    // stepPhysics can end the run, and endGame has already painted the whole
    // screen by then, so bail out rather than clearing over it.
    if (phase !== 1) return;

    drawField();
  }

  function startGame(): void {
    let i = 0;

    for (i = 0; i < 20; i++) rockSize[i] = 0;
    for (i = 0; i < 8; i++) shotLife[i] = 0;
    rockCount = 0;
    score = 0;
    lives = 3;
    wave = 1;
    newBest = false;
    phase = 1;
    resetShip();
    newWave();
    drawAll();
    Pip.playSound('SELECT');
  }

  // The left wheel runs the engine, and is also the only wheel that presses,
  // so it carries firing too. Each click burns the thruster for a fixed run
  // of frames, and keeping it rolling keeps the engine lit.
  function onKnob1(dir: KnobDirection, long: boolean | undefined): void {
    if (dir) {
      if (phase === 1) shipThrust = C.thrustFrames;
      return;
    }

    if (phase === 1) {
      if (long) hyperspace();
      else fire();
    } else if (phase === 2) {
      phase = 1;
      drawAll();
    } else {
      startGame();
    }
  }

  // The right wheel has no press on this hardware, so it is given over
  // entirely to steering.
  function onKnob2(dir: KnobDirection): void {
    if (dir && phase === 1) shipAng += dir * C.turn;
  }

  // DATA is swallowed and reused as pause, since both wheels and the left
  // press are already spoken for in flight. STAT and ITEM are left alone and
  // remain the way out of the holotape.
  function onMode(m: number): void {
    if (m !== 2) return;
    E.stopEventPropagation();

    if (phase === 1) {
      phase = 2;
      drawAll();
      Pip.playSound('HIGHLIGHT');
    } else if (phase === 2) {
      phase = 1;
      drawAll();
    }
  }

  // Init last, Espruino does not hoist functions.
  buildSpin();
  if (fs.statSync(SCORE_PATH)) {
    best = parseInt(fs.readFileSync(SCORE_PATH), 10) | 0;
  }
  drawAll();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  Pip.prependListener('mode', onMode);
  tick = setInterval(onFrame, 50);

  return {
    id: 'PIPROIDS',
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
