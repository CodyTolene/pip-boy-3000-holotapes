(function (): HolotapeApp {
  const C: PipInvadersConfig = {
    top: 38,
    colStep: 34,
    rowStep: 22,
    marginX: 6,
    marchX: 6,
    marchY: 8,
    startY: 70,
    bunkerY: 248,
    turretY: 292,
    turretSpeed: 3,
    glide: 6,
    shotSpeed: 12,
    bombSpeed: 4,
    guard: 40,
    vertibirdY: 40,
  };

  const SCORE_PATH = 'HOLO/PIPINVADERS/SCORE.TXT';

  // Ten 24x16 1bpp sprites packed end to end, 48 bytes each: two march frames
  // for each of the four creature rows, then two rotor frames for the
  // vertibird. Each is drawn from a 12x8 design with every pixel doubled, so
  // the art is built from 2x2 blocks the way the arcade originals were.
  // VIEW holds one window per sprite so drawing is a property write and a
  // native blit, with nothing allocated per frame.
  const SPRITE = new Uint8Array(480);
  const VIEW: Uint8Array[] = [];
  const img: GraphicsImageObject = {
    width: 24,
    height: 16,
    bpp: 1,
    transparent: 0,
    buffer: SPRITE,
  };

  // Four bunkers, each a 48x16 1bpp bitmap with a 6-byte row stride. Damage
  // clears bits straight out of these, so erosion is pixel accurate and a
  // whole bunker still costs one blit.
  //
  // Every image here is a multiple of 8 wide on purpose. Espruino blits an
  // image as one continuous bit stream and skips whole rows by
  // `bpp * width` bits, with no padding to a byte boundary, so any other
  // width would draw progressively sheared and no longer line up with the
  // bitmap the hit tests read.
  const BUNKER = new Uint8Array(384);
  const BVIEW: Uint8Array[] = [];
  const BUNKX = new Uint16Array([36, 156, 276, 396]);
  const bimg: GraphicsImageObject = {
    width: 48,
    height: 16,
    bpp: 1,
    transparent: 0,
    buffer: BUNKER,
  };

  // Points per formation row, top row first. The scariest thing is furthest
  // away and worth the most, as in the original.
  const VALUE = new Uint8Array([40, 30, 20, 10]);

  // Row-major, 4 rows of 8. Non-zero means the invader is still alive.
  const alive = new Uint8Array(32);

  // Projectiles are flat x,y pairs. A y of 0 marks a free slot, which is safe
  // because the play area starts well below row 0.
  const pshot = new Int16Array(4);
  const bomb = new Int16Array(8);

  let fx = 0;
  let fy = 0;
  let fdir = 0;
  let fanim = 0;
  let aliveCount = 0;
  let stepTimer = 0;
  let turretX = 0;
  let turretDir = 0;
  let turretGlide = 0;
  let turretGuard = 0;
  let vbX = 0;
  let vbDir = 0;
  let lives = 0;
  let score = 0;
  let best = 0;
  let wave = 0;
  let phase = 0;
  let frame = 0;
  let newBest = false;
  let tick!: number;

  // Unpacks the sprite designs into SPRITE once at startup. Each design row
  // is the low 12 bits of a word, most significant bit leftmost. Doubling
  // every bit and writing the result to two consecutive output rows turns a
  // 12x8 design into a 24x16 sprite built from 2x2 blocks. The design table
  // is a local and is reclaimed as soon as this returns.
  function buildSprites(): void {
    const rows = new Uint16Array([
      // DEATHCLAW A
      0x204, 0x30c, 0x1f8, 0x36c, 0x7fe, 0x6f6, 0x204, 0x606,
      // DEATHCLAW B
      0x402, 0x606, 0x1f8, 0x36c, 0x7fe, 0x6f6, 0x108, 0x30c,
      // RADSCORPION A
      0x204, 0x108, 0x3fc, 0x6f6, 0xfff, 0xbfd, 0xa05, 0x198,
      // RADSCORPION B
      0x204, 0x909, 0xbfd, 0xef7, 0xfff, 0x7fe, 0x204, 0x402,
      // BLOATFLY A
      0xc03, 0x70e, 0x3fc, 0x6f6, 0x7fe, 0x3fc, 0x108, 0x30c,
      // BLOATFLY B
      0x000, 0x606, 0x3fc, 0x6f6, 0x7fe, 0x3fc, 0x70e, 0xc03,
      // RADROACH A
      0x1f8, 0x7fe, 0xfff, 0xe67, 0xfff, 0x39c, 0x606, 0x30c,
      // RADROACH B
      0x1f8, 0x7fe, 0xfff, 0xe67, 0xfff, 0x198, 0x36c, 0xc03,
      // VERTIBIRD A
      0xfff, 0x060, 0x1f8, 0x7fe, 0xfff, 0xd9b, 0x30c, 0x000,
      // VERTIBIRD B
      0x1f8, 0x060, 0x1f8, 0x7fe, 0xfff, 0xd9b, 0x30c, 0x000,
    ]);
    let n = 0;
    let x = 0;
    let v = 0;
    let w = 0;
    let o = 0;

    for (n = 0; n < 80; n++) {
      v = rows[n];
      w = 0;
      for (x = 0; x < 12; x++) if (v & (0x800 >> x)) w |= 3 << (22 - x * 2);
      o = n * 6;
      SPRITE[o] = w >> 16;
      SPRITE[o + 1] = (w >> 8) & 255;
      SPRITE[o + 2] = w & 255;
      SPRITE[o + 3] = SPRITE[o];
      SPRITE[o + 4] = SPRITE[o + 1];
      SPRITE[o + 5] = SPRITE[o + 2];
    }
    for (n = 0; n < 10; n++)
      VIEW[n] = new Uint8Array(SPRITE.buffer, n * 48, 48);
  }

  // Redraws all four bunkers back to full strength. Called on every new run,
  // so it has to zero the old damage first.
  function buildBunkers(): void {
    let b = 0;
    let x = 0;
    let y = 0;
    let n = 0;
    let cx = 0;
    let cy = 0;
    let solid = false;

    for (n = 0; n < 384; n++) BUNKER[n] = 0;

    for (b = 0; b < 4; b++) {
      for (y = 0; y < 16; y++) {
        for (x = 0; x < 48; x++) {
          // Shaped on the same 2x2 block grid as the sprites so it belongs in
          // the same picture: chamfered top corners over an arch cut up into
          // the middle of the base.
          cx = x >> 1;
          cy = y >> 1;
          solid = true;
          if (cy < 3 && (cx < 3 - cy || cx > 20 + cy)) solid = false;
          else if (cy >= 5 && cx >= 15 - cy && cx <= 8 + cy) solid = false;
          if (solid) BUNKER[b * 96 + y * 6 + (x >> 3)] |= 0x80 >> (x & 7);
        }
      }
      BVIEW[b] = new Uint8Array(BUNKER.buffer, b * 96, 96);
    }
  }

  // How many frames between formation steps. The thinner the ranks and the
  // later the wave, the faster they come.
  function marchDelay(): number {
    let d = 0;

    d = 3 + (aliveCount >> 2) - wave;
    if (d < 2) d = 2;
    return d;
  }

  function resetFormation(): void {
    let n = 0;

    for (n = 0; n < 32; n++) alive[n] = 1;
    aliveCount = 32;
    // A full formation is 7 gaps plus one 24px sprite, so this centres it.
    fx = 109;
    fy = C.startY;
    fdir = 1;
    fanim = 0;
    stepTimer = marchDelay();
  }

  function resetTurret(): void {
    let n = 0;

    turretX = 228;
    turretDir = 0;
    turretGlide = 0;
    turretGuard = C.guard;
    for (n = 0; n < 4; n++) pshot[n] = 0;
    for (n = 0; n < 8; n++) bomb[n] = 0;
    vbX = 0;
    vbDir = 0;
  }

  function fire(): void {
    let i = 0;

    for (i = 0; i < 2; i++) {
      if (pshot[i * 2 + 1]) continue;
      pshot[i * 2] = turretX + 11;
      pshot[i * 2 + 1] = C.turretY - 6;
      Pip.playSound('SCROLL');
      return;
    }
  }

  // Picks a random column and drops from its lowest surviving invader, so
  // bombs always fall from the front rank rather than through their own ranks.
  function dropBomb(): void {
    let i = 0;
    let c = 0;
    let r = 0;

    for (i = 0; i < 8; i++) {
      if (bomb[i * 2 + 1]) continue;
      c = Math.randInt(8);
      for (r = 3; r >= 0; r--) {
        if (!alive[r * 8 + c]) continue;
        bomb[i * 2] = fx + c * C.colStep + 11;
        bomb[i * 2 + 1] = fy + r * C.rowStep + 16;
        return;
      }
      return;
    }
  }

  // Clears a blob of bits out of one bunker at the point of impact, much
  // wider and deeper than the projectile that made it.
  //
  // A projectile always stops at the first material it meets, so only the
  // half of the blob ahead of the impact removes anything the next shot would
  // have hit. Seven rows tall therefore advances a column by four rows a
  // shot, and cover wears through in four hits to the same spot rather than
  // being chipped away a couple of pixels at a time.
  function eatBunker(b: number, cx: number, cy: number): void {
    let x = 0;
    let y = 0;

    for (y = cy - 3; y <= cy + 3; y++) {
      if (y < 0 || y > 15) continue;
      for (x = cx - 4; x <= cx + 4; x++) {
        if (x < 0 || x > 47) continue;
        BUNKER[b * 96 + y * 6 + (x >> 3)] &= ~(0x80 >> (x & 7));
      }
    }
  }

  // True when a projectile's travel this frame crossed bunker material, which
  // is also consumed. `dy` is how far it moved, so the whole swept span gets
  // walked in travel order rather than only its end point.
  //
  // Testing one point per frame is what let shots through: a shot covers 12
  // pixels a frame and a bunker is only 16 tall, so from a fixed firing
  // height only two rows of it were ever sampled. Two hits cleared both, and
  // every later shot down that column sailed through cover that was still
  // plainly drawn on the screen. Nudging the turret sideways moved the column
  // and bought two more.
  function hitBunker(px: number, py: number, dy: number): boolean {
    let b = 0;
    let lx = 0;
    let ly = 0;
    let end = 0;
    let step = 0;

    for (b = 0; b < 4; b++) {
      lx = px - BUNKX[b];
      // The bunkers never overlap, so at most one can match.
      if (lx >= 0 && lx < 48) break;
    }
    if (b > 3) return false;

    step = dy < 0 ? -1 : 1;
    ly = py - dy - C.bunkerY;
    end = py - C.bunkerY;
    // Clamp the span to the bunker band. Clamping only the trailing edge
    // downward and the leading edge upward leaves a span that fails the loop
    // test outright when the travel never reached the band at all.
    if (step < 0) {
      if (ly > 15) ly = 15;
      if (end < 0) end = 0;
    } else {
      if (ly < 0) ly = 0;
      if (end > 15) end = 15;
    }

    for (; (end - ly) * step >= 0; ly += step) {
      if (BUNKER[b * 96 + ly * 6 + (lx >> 3)] & (0x80 >> (lx & 7))) {
        eatBunker(b, lx, ly);
        return true;
      }
    }
    return false;
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

    // Spare turrets: the same silhouette as the real one, scaled down to fit
    // the HUD band.
    for (i = 0; i < lives - 1; i++) {
      x = 130 + i * 20;
      h.fillRect(x, 19, x + 13, 24).fillRect(x + 5, 13, x + 8, 18);
    }
  }

  function drawInvaders(): void {
    'ram';
    let r = 0;
    let c = 0;
    let y = 0;

    h.setColor(3);
    for (r = 0; r < 4; r++) {
      y = fy + r * C.rowStep;
      // One buffer swap per row rather than per invader.
      img.buffer = VIEW[r * 2 + fanim];
      for (c = 0; c < 8; c++) {
        if (!alive[r * 8 + c]) continue;
        h.drawImage(img, fx + c * C.colStep, y);
      }
    }
  }

  function drawBunkers(): void {
    let b = 0;

    h.setColor(3);
    for (b = 0; b < 4; b++) {
      bimg.buffer = BVIEW[b];
      h.drawImage(bimg, BUNKX[b], C.bunkerY);
    }
  }

  function drawShots(): void {
    let i = 0;

    h.setColor(3);
    for (i = 0; i < 2; i++) {
      if (!pshot[i * 2 + 1]) continue;
      h.fillRect(
        pshot[i * 2],
        pshot[i * 2 + 1],
        pshot[i * 2] + 1,
        pshot[i * 2 + 1] + 5,
      );
    }

    h.setColor(2);
    for (i = 0; i < 4; i++) {
      if (!bomb[i * 2 + 1]) continue;
      h.fillRect(
        bomb[i * 2],
        bomb[i * 2 + 1],
        bomb[i * 2] + 1,
        bomb[i * 2 + 1] + 4,
      );
    }
  }

  function drawTurret(): void {
    // Blink while the respawn guard holds so the player can see they are
    // briefly safe.
    if (turretGuard && frame & 2) return;

    h.setColor(3)
      .fillRect(turretX, C.turretY + 6, turretX + 23, C.turretY + 13)
      .fillRect(turretX + 10, C.turretY, turretX + 13, C.turretY + 5);
  }

  // Clipped to the play area, because an invader or the vertibird drawn near
  // the divider would otherwise leave pixels in the HUD band, which is only
  // repainted when the score, wave, or turret count changes.
  function drawField(): void {
    h.setClipRect(0, C.top, 479, 319).clearRect(0, C.top, 479, 319);

    if (vbDir) {
      img.buffer = VIEW[8 + ((frame >> 1) & 1)];
      h.setColor(3).drawImage(img, vbX, C.vertibirdY);
    }

    drawInvaders();
    drawBunkers();
    drawShots();
    drawTurret();
    h.setClipRect(0, 0, 479, 319);
  }

  function drawOverlay(): void {
    h.setColor(3).setFontAlign(0, 0);

    if (phase === 2) {
      h.clearRect(150, 150, 330, 206)
        .drawRect(150, 150, 330, 206)
        .setFontMonofonto28()
        .drawString('PAUSED', 240, 178);
      return;
    }

    h.clearRect(54, 78, 426, 268)
      .drawRect(54, 78, 426, 268)
      .drawRect(56, 80, 424, 266);

    if (phase === 0) {
      h.setFontMonofonto28()
        .drawString('PIP INVADERS', 240, 110)
        .setFontMonofonto16()
        .drawString('WHEELS   TRACK LEFT / RIGHT', 240, 150)
        .drawString('L PRESS  FIRE', 240, 172)
        .drawString('DATA     PAUSE', 240, 194)
        .setColor(2)
        .drawString('DEATHCLAW 40   RADSCORPION 30', 240, 220)
        .drawString('BLOATFLY 20   RADROACH 10', 240, 238)
        .setColor(3)
        .drawString('PRESS TO DEPLOY', 240, 258);
      return;
    }

    h.setFontMonofonto28()
      .drawString('VAULT BREACHED', 240, 116)
      .setFontMonofonto23()
      .drawString('SCORE ' + score, 240, 160)
      .drawString('BEST ' + best, 240, 190);
    if (newBest) h.setColor(2).drawString('NEW BEST', 240, 218);
    h.setColor(2)
      .setFontMonofonto16()
      .drawString('PRESS TO REDEPLOY', 240, 248);
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

  function killTurret(): void {
    let n = 0;

    lives--;
    Pip.playSound('HIGHLIGHT');
    if (lives < 1) {
      endGame();
      return;
    }
    turretGuard = C.guard;
    for (n = 0; n < 8; n++) bomb[n] = 0;
    drawHud();
  }

  // Slides the formation one step, turning it around and dropping it a row
  // whenever it reaches an edge. Reaching the turret's row ends the run.
  function stepFormation(): void {
    let r = 0;
    let c = 0;
    let lo = 0;
    let left = 8;
    let right = 0;

    fanim = fanim ? 0 : 1;

    // Only the occupied columns matter for the turnaround, so a formation
    // whittled down to its middle can still use the full width.
    for (r = 0; r < 4; r++) {
      for (c = 0; c < 8; c++) {
        if (!alive[r * 8 + c]) continue;
        if (c < left) left = c;
        if (c > right) right = c;
        if (r > lo) lo = r;
      }
    }

    if (
      (fdir > 0 && fx + right * C.colStep + 24 + C.marchX > 480 - C.marginX) ||
      (fdir < 0 && fx + left * C.colStep - C.marchX < C.marginX)
    ) {
      fdir = -fdir;
      fy += C.marchY;
      // Reaching the bunker line counts as overrun. Stopping there also keeps
      // invader sprites from ever drawing on top of the bunkers.
      if (fy + lo * C.rowStep + 16 >= C.bunkerY) {
        lives = 0;
        endGame();
        return;
      }
    } else {
      fx += fdir * C.marchX;
    }

    stepTimer = marchDelay();
  }

  function stepPhysics(): void {
    'ram';
    let i = 0;
    let x = 0;
    let y = 0;
    let dx = 0;
    let dy = 0;
    let ic = 0;
    let ir = 0;

    if (turretGuard) turretGuard--;

    if (turretGlide) {
      turretGlide--;
      turretX += turretDir * C.turretSpeed;
      if (turretX < C.marginX) turretX = C.marginX;
      else if (turretX > 480 - C.marginX - 24) turretX = 480 - C.marginX - 24;
    }

    // Player shots: bunkers first, then the vertibird, then the formation.
    for (i = 0; i < 2; i++) {
      if (!pshot[i * 2 + 1]) continue;
      y = pshot[i * 2 + 1] - C.shotSpeed;
      x = pshot[i * 2];
      if (y < C.top) {
        pshot[i * 2 + 1] = 0;
        continue;
      }
      pshot[i * 2 + 1] = y;

      if (hitBunker(x, y, -C.shotSpeed)) {
        pshot[i * 2 + 1] = 0;
        continue;
      }

      if (
        vbDir &&
        y < C.vertibirdY + 16 &&
        y > C.vertibirdY &&
        x > vbX &&
        x < vbX + 24
      ) {
        pshot[i * 2 + 1] = 0;
        vbDir = 0;
        score += 150;
        if (score > best) {
          best = score;
          newBest = true;
        }
        Pip.playSound('SELECT');
        drawHud();
        continue;
      }

      // The formation is a fixed grid, so the struck cell comes straight out
      // of the offset rather than from a scan over all 32 slots.
      dx = x - fx;
      dy = y - fy;
      if (dx < 0 || dy < 0) continue;
      ic = (dx / C.colStep) | 0;
      ir = (dy / C.rowStep) | 0;
      if (ic > 7 || ir > 3) continue;
      // Columns are tested against the real 24px sprite, but a row owns its
      // whole band. Sprites are 16 tall in a 20 band, and a shot climbing 12
      // a frame would otherwise be able to land in the 4px gap and tunnel
      // through a rank untouched. Being generous by a third of a frame of
      // travel is invisible; missing a point-blank shot is not.
      if (dx - ic * C.colStep > 23) continue;
      if (!alive[ir * 8 + ic]) continue;

      alive[ir * 8 + ic] = 0;
      aliveCount--;
      pshot[i * 2 + 1] = 0;
      score += VALUE[ir];
      if (score > best) {
        best = score;
        newBest = true;
      }
      stepTimer = marchDelay();
      Pip.playSound('TAB');
      drawHud();
    }

    // Bombs: bunkers, then the turret.
    for (i = 0; i < 4; i++) {
      if (!bomb[i * 2 + 1]) continue;
      y = bomb[i * 2 + 1] + C.bombSpeed;
      x = bomb[i * 2];
      // With no ground line to land on, a bomb that misses runs off the
      // bottom edge instead of blinking out just above it.
      if (y > 319) {
        bomb[i * 2 + 1] = 0;
        continue;
      }
      bomb[i * 2 + 1] = y;

      if (hitBunker(x, y, C.bombSpeed)) {
        bomb[i * 2 + 1] = 0;
        continue;
      }

      if (
        !turretGuard &&
        y + 4 >= C.turretY &&
        x >= turretX &&
        x <= turretX + 23
      ) {
        bomb[i * 2 + 1] = 0;
        killTurret();
        if (phase !== 1) return;
      }
    }

    if (vbDir) {
      vbX += vbDir * 4;
      if (vbX < -34 || vbX > 480) vbDir = 0;
    } else if (Math.randInt(900) === 0) {
      vbDir = Math.randInt(2) ? 1 : -1;
      vbX = vbDir > 0 ? -32 : 480;
    }

    // Checked before the march so the last invader of a wave cannot be
    // stepped after it has already died.
    if (!aliveCount) {
      wave++;
      resetFormation();
      resetTurret();
      buildBunkers();
      drawHud();
      Pip.playSound('SELECT');
      return;
    }

    // A bomb takes about 40 frames to fall, so this rate is roughly the
    // average number of bombs in the air: one on wave 1, climbing from there.
    if (Math.randInt(80) < wave + 1) dropBomb();

    stepTimer--;
    if (stepTimer < 1) stepFormation();
  }

  function onFrame(): void {
    frame = (frame + 1) & 255;
    if (phase !== 1) return;

    stepPhysics();
    // A run can end inside stepPhysics, and endGame has already painted the
    // whole screen by then, so bail out rather than clearing over it.
    if (phase !== 1) return;

    drawField();
  }

  function startGame(): void {
    score = 0;
    lives = 3;
    wave = 1;
    newBest = false;
    phase = 1;
    resetFormation();
    resetTurret();
    buildBunkers();
    drawAll();
    Pip.playSound('SELECT');
  }

  // Both wheels track the turret, so either hand can steer. Only the left one
  // presses on this hardware, so it also carries the trigger. Each click buys
  // a short glide, and keeping the wheel rolling keeps the turret moving.
  function onKnob1(dir: KnobDirection, long: boolean | undefined): void {
    if (dir) {
      if (phase === 1) {
        turretDir = dir;
        turretGlide = C.glide;
      }
      return;
    }

    if (phase === 1) {
      if (!long) fire();
    } else if (phase === 2) {
      phase = 1;
      drawAll();
    } else {
      startGame();
    }
  }

  function onKnob2(dir: KnobDirection): void {
    if (dir && phase === 1) {
      turretDir = dir;
      turretGlide = C.glide;
    }
  }

  // DATA is swallowed and reused as pause, since both wheels and the left
  // press are already spoken for. STAT and ITEM are left alone and remain the
  // way out of the holotape.
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
  buildSprites();
  buildBunkers();
  if (fs.statSync(SCORE_PATH)) {
    best = parseInt(fs.readFileSync(SCORE_PATH), 10) | 0;
  }
  drawAll();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  Pip.prependListener('mode', onMode);
  tick = setInterval(onFrame, 50);

  return {
    id: 'PIPINVADERS',
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
