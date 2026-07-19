// =============================================================================
//  Name: Radroach Races
//  Author: Theeohn Megistus
//  License: MIT
//  Repository: https://github.com/Theeohn/Radroach-Races
// =============================================================================
//  File: RACE.JS (scene)
//  Description: Runs a single race on the map chosen at the title screen
//  (or a random one). Counts down the betting timer, simulates the roaches
//  until one reaches the mutfruit, then waits for the left knob press to
//  return to the title screen.
// =============================================================================

(function (app, params) {
  const drawLineCached = h.drawLine.bind(h);
  const fillRectCached = h.fillRect.bind(h);
  const drawImageCached = h.drawImage.bind(h);
  const drawCircleCached = h.drawCircle.bind(h);
  const drawRectCached = h.drawRect.bind(h);
  const drawPolyCached = h.drawPoly.bind(h);

  // Asset File Directories
  const SFX = {
    FLAP: 'HOLO/RADROACH_RACES/FLAP.WAV',
    WINNER: 'HOLO/RADROACH_RACES/WINNER.WAV',
  };

  // Winner overlay art, keyed by roach id (matches the id assignments
  // used for hitbox shapes in drawRoachShape()).
  const WINNER_IMG = {
    1: 'HOLO/RADROACH_RACES/CIRCLEW.BIN',
    2: 'HOLO/RADROACH_RACES/TRIANGLEW.BIN',
    3: 'HOLO/RADROACH_RACES/DELTAW.BIN',
    4: 'HOLO/RADROACH_RACES/SQUAREW.BIN',
    5: 'HOLO/RADROACH_RACES/DIAMONDW.BIN',
  };

  const dirty = new Int16Array(20);

  let mainLoopInterval = null;
  let countdownTimer = null;

  // params.mapId comes from the title screen selector:
  // 0 = Random Map, 1-20 = a specific map (1-based).

  const ROACH_SPEED = 4; // Speed of roach in pixels per frame
  const ROACH_WALL_SPEED = 4; // Speed of roach in pixels per frame after wall bounces

  // Game States: COUNTDOWN -> RACING -> GAMEOVER
  let gameState = 'COUNTDOWN';
  let winnerId = -1;
  let countdownValue = 5;
  let currentMapId = 0;

  let trackWalls = new Int16Array(0);

  let goalPos = { x: 0, y: 0, w: 18, h: 18, hitW: 16, hitH: 16 };
  let radroaches = [];

  let trackDirty = 1;
  let lastFlapTime = 0;
  let roachImage = null;
  
  let gameOverTime = 0;
  let lastBlinkState = -1;

  // Rotate options
  const rotOpts = { rotate: 0 };

  const ROACH_HIT_R = 11.4;
  const ROACH_R_SUM = ROACH_HIT_R * 2; // a.hitR + b.hitR is always this

  const JITTER_COS = new Float32Array(21);
  const JITTER_SIN = new Float32Array(21);
  for (let jd = -10; jd <= 10; jd++) {
    const jrad = jd * 0.017453292519943295;
    JITTER_COS[jd + 10] = Math.cos(jrad);
    JITTER_SIN[jd + 10] = Math.sin(jrad);
  }

  // ─── Track Loading ────────────────────────────────────────────────────────
  /**
   * Pick a track, copy its walls out of the map data, and spawn the roaches.
   * The map data is released again once the track is extracted.
   * @returns {void} Nothing
   */
  function loadTrack() {
    let MAP_DATA = eval(fs.readFileSync('HOLO/RADROACH_RACES/MAPS.JS'));

    currentMapId =
      params && params.mapId > 0 ? params.mapId - 1 : Math.randInt(20);

    let base = 0;
    for (let i = 0; i < currentMapId; i++) {
      base += 5 + MAP_DATA[base + 4] * 4;
    }

    const wallCount = MAP_DATA[base + 4];

    trackWalls = new Int16Array(wallCount * 4);
    for (let i = 0; i < wallCount; i++) {
      const src = base + 5 + i * 4;
      const dst = i * 4;
      trackWalls[dst] = MAP_DATA[src];
      trackWalls[dst + 1] = MAP_DATA[src + 1];
      trackWalls[dst + 2] = MAP_DATA[src + 2];
      trackWalls[dst + 3] = MAP_DATA[src + 3];
    }

    goalPos.x = MAP_DATA[base];
    goalPos.y = MAP_DATA[base + 1];

    const startX = MAP_DATA[base + 2];
    const startYBase = MAP_DATA[base + 3];

    // Only the extracted track is needed from here on.
    MAP_DATA = null;
    app.gc();

    // Maps 2, 4, 5, 7, 9, 12, 15, 16 (0-based: 1, 3, 4, 6, 8, 11, 14, 15) use horizontal
    // spawn spread; all others use vertical.
    const horizSpawn =
      currentMapId === 1 || currentMapId === 3 || currentMapId === 4 ||
      currentMapId === 6 || currentMapId === 8 || currentMapId === 11 ||
      currentMapId === 14 || currentMapId === 15;
    const slots = horizSpawn ? [0, 21, 42, 63, 84] : [0, 23, 44, 65, 86];
    for (let s = 4; s > 0; s--) {
      const sv = Math.randInt(s + 1);
      const tmp = slots[s];
      slots[s] = slots[sv];
      slots[sv] = tmp;
    }
    radroaches = [];
    for (let i = 0; i < 5; i++) {
      radroaches.push({
        id: i + 1,
        cx: startX + 7 + (horizSpawn ? slots[i] : 0),
        cy: startYBase + 7 + (horizSpawn ? 0 : slots[i]),
        vx: 0,
        vy: 0,
      });
      setRandomVelocity(radroaches[i], ROACH_SPEED);
    }
  }

  // ─── Countdown ────────────────────────────────────────────────────────────
  function tickCountdown() {
    if (gameState !== 'COUNTDOWN') return;

    h.setColor(0).fillRect(0, 0, 480, 320);
    drawTrack();
    drawAllRoaches();

    if (countdownValue > 0) {
      h.setFont('Monofonto96')
        .setFontAlign(0, 0)
        .setColor(3)
        .drawString(countdownValue.toString(), 240, 160);
      h.setColor(0)
        .fillRect(67, 226, 407, 275)
        .setColor(3)
        .drawRect(69, 228, 405, 273);
      h.setFont('Monofonto36')
        .setFontAlign(0, -1)
        .setColor(3)
        .drawString('PLACE YOUR BETS!!!', 240, 230);
      countdownValue--;
    } else {
      clearInterval(countdownTimer);
      countdownTimer = null;
      gameState = 'RACING';
      trackDirty = 1;
    }
  }

  // ─── Drawing ──────────────────────────────────────────────────────────────
  /**
   * Draw a roach's type shape, outlined exactly to its collision hitbox
   * radius. Shapes are always drawn in a fixed orientation (never rotated
   * with travel direction) so Square never gets confused for Diamond, etc.
   * @param r
   * @returns {void}
   */
  function drawRoachShape(r) {
    'ram';
    const cx = r.cx,
      cy = r.cy;

    // Circle: outline of the hitbox.
    if (r.id === 1) {
      drawCircleCached(cx, cy, ROACH_HIT_R);
      return;
    }

    // Square: vertices touch the hitbox at the diagonal corners.
    if (r.id === 4) {
      const half = ROACH_HIT_R * 0.7071067811865476;
      drawRectCached(cx - half, cy - half, cx + half, cy + half);
      return;
    }

    // Diamond: same square, rotated so the vertices point at the walls
    // instead of the corners.
    if (r.id === 5) {
      drawPolyCached(
        [
          cx,
          cy - ROACH_HIT_R,
          cx + ROACH_HIT_R,
          cy,
          cx,
          cy + ROACH_HIT_R,
          cx - ROACH_HIT_R,
          cy,
        ],
        true,
      );
      return;
    }

    // Triangle (id 2) points up; Delta (id 3) is the same shape inverted.
    const rot = r.id === 3 ? 1.5707963267948966 : -1.5707963267948966;
    drawPolyCached(
      [
        cx + ROACH_HIT_R * Math.cos(rot),
        cy + ROACH_HIT_R * Math.sin(rot),
        cx + ROACH_HIT_R * Math.cos(rot + 2.0943951023931953),
        cy + ROACH_HIT_R * Math.sin(rot + 2.0943951023931953),
        cx + ROACH_HIT_R * Math.cos(rot - 2.0943951023931953),
        cy + ROACH_HIT_R * Math.sin(rot - 2.0943951023931953),
      ],
      true,
    );
  }

  function drawAllRoaches() {
    'ram';

    // Fallback: sprite failed to load, so just show the hitbox shape.
    if (!roachImage) {
      h.setColor(3);
      for (let i = 0; i < radroaches.length; i++) {
        drawRoachShape(radroaches[i]);
      }
      return;
    }

    for (let i = 0; i < radroaches.length; i++) {
      const r = radroaches[i];
      h.setColor(3);
      drawRoachShape(r);

      // Head (top of image) points along the direction of travel.
      rotOpts.rotate = Math.atan2(r.vy, r.vx) + 1.5707963267948966;
      h.setColor(3);
      drawImageCached(roachImage, r.cx, r.cy, rotOpts);
    }
    h.setColor(3);
  }

  function drawTrack(clipX1, clipY1, clipX2, clipY2) {
    'ram';
    // No region given -> drawing everything (countdown / full redraw), so
    // default to the whole screen and every element passes its overlap test.
    if (clipX1 === undefined) {
      clipX1 = 0;
      clipY1 = 0;
      clipX2 = 480;
      clipY2 = 320;
    }

    if (clipX1 <= 465 && clipX2 >= 18 && clipY1 <= 298 && clipY2 >= 18) {
      h.setColor(3).drawRect(18, 18, 465, 298);
    }

    for (let i = 0; i < trackWalls.length; i += 4) {
      const lx1 = trackWalls[i],
        ly1 = trackWalls[i + 1],
        lx2 = trackWalls[i + 2],
        ly2 = trackWalls[i + 3];
      const wMinX = lx1 < lx2 ? lx1 : lx2,
        wMaxX = lx1 < lx2 ? lx2 : lx1;
      const wMinY = ly1 < ly2 ? ly1 : ly2,
        wMaxY = ly1 < ly2 ? ly2 : ly1;
      if (wMaxX < clipX1 || wMinX > clipX2 || wMaxY < clipY1 || wMinY > clipY2)
        continue;
      drawLineCached(lx1, ly1, lx2, ly2);
    }

    if (clipX2 >= 225 && clipX1 <= 320 && clipY2 >= 302 && clipY1 <= 316) {
      h.setFont('Monofonto14')
        .setFontAlign(0, -1)
        .setColor(3)
        .drawString('Radroach Races  ~  Map ' + (currentMapId + 1), 240, 302);
    }

    const goalX1 = goalPos.x - 6,
      goalY1 = goalPos.y - 8;
    const goalX2 = goalPos.x + goalPos.w + 6,
      goalY2 = goalPos.y + goalPos.h + 11;
    if (
      clipX2 >= goalX1 &&
      clipX1 <= goalX2 &&
      clipY2 >= goalY1 &&
      clipY1 <= goalY2
    ) {
      h.setColor(3)
        .fillRect(
          goalPos.x,
          goalPos.y,
          goalPos.x + goalPos.w,
          goalPos.y + goalPos.h,
        )
        .setColor(2)
        .fillRect(goalPos.x + 6, goalPos.y - 8, goalPos.x + 11, goalPos.y)
        .fillRect(goalPos.x - 6, goalPos.y + 6, goalPos.x, goalPos.y + 11);
    }
  }

  // ─── Physics ──────────────────────────────────────────────────────────────
  function setRandomVelocity(r, speed) {
    const deg = Math.randInt(400);
    const rad = deg * 0.017453292519943295;
    r.vx = Math.cos(rad) * speed;
    r.vy = Math.sin(rad) * speed;
  }

  function jitterVelocity(r) {
    'ram';
    const idx = Math.randInt(21); // 0..20 maps to -10..+10 degrees
    const c = JITTER_COS[idx],
      s = JITTER_SIN[idx];
    const vx = r.vx,
      vy = r.vy;
    r.vx = vx * c - vy * s;
    r.vy = vx * s + vy * c;
  }

  function checkWallCollision(r) {
    'ram';

    // ── Border walls ─────────────────────────────────────────────────────────
    let bounced = false;
    const hr = ROACH_HIT_R;

    if (r.cx - hr <= 18) {
      r.cx = 18 + hr;
      r.vx = r.vx < 0 ? -r.vx : r.vx;
      bounced = true;
    } else if (r.cx + hr >= 465) {
      r.cx = 465 - hr;
      r.vx = r.vx > 0 ? -r.vx : r.vx;
      bounced = true;
    }
    if (r.cy - hr <= 18) {
      r.cy = 18 + hr;
      r.vy = r.vy < 0 ? -r.vy : r.vy;
      bounced = true;
    } else if (r.cy + hr >= 298) {
      r.cy = 298 - hr;
      r.vy = r.vy > 0 ? -r.vy : r.vy;
      bounced = true;
    }

    // ── Interior walls: circle vs line-segment ────────────────────────────────
    for (let i = 0; i < trackWalls.length; i += 4) {
      const x1 = trackWalls[i],
        y1 = trackWalls[i + 1];
      const x2 = trackWalls[i + 2],
        y2 = trackWalls[i + 3];

      const segDx = x2 - x1,
        segDy = y2 - y1;
      const lenSq = segDx * segDx + segDy * segDy;
      let t =
        lenSq > 0 ? ((r.cx - x1) * segDx + (r.cy - y1) * segDy) / lenSq : 0;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;

      const clx = x1 + t * segDx;
      const cly = y1 + t * segDy;
      const ex = r.cx - clx;
      const ey = r.cy - cly;
      const distSq = ex * ex + ey * ey;

      if (distSq < hr * hr && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const nx = ex / dist;
        const ny = ey / dist;

        const pen = hr - dist;
        r.cx += nx * pen;
        r.cy += ny * pen;

        const dot = r.vx * nx + r.vy * ny;
        if (dot < 0) {
          r.vx -= 2 * dot * nx;
          r.vy -= 2 * dot * ny;

          const spd = Math.sqrt(r.vx * r.vx + r.vy * r.vy);
          if (spd > 0) {
            r.vx = (r.vx / spd) * ROACH_WALL_SPEED;
            r.vy = (r.vy / spd) * ROACH_WALL_SPEED;
          }

          jitterVelocity(r);
          bounced = true;
        }
      }
    }

    if (bounced) {
      if (getTime() - lastFlapTime >= 0.2) {
        lastFlapTime = getTime();
        Pip.audioStart(SFX.FLAP);
      }

      const vxAbs = r.vx < 0 ? -r.vx : r.vx;
      const vyAbs = r.vy < 0 ? -r.vy : r.vy;
      let fixed = 0;
      if (r.cx - hr <= 19) {
        if (vxAbs < 1.5) {
          r.vx = 1.5;
          fixed = 1;
        }
      } else if (r.cx + hr >= 464) {
        if (vxAbs < 1.5) {
          r.vx = -1.5;
          fixed = 1;
        }
      }
      if (r.cy - hr <= 19) {
        if (vyAbs < 1.5) {
          r.vy = 1.5;
          fixed = 1;
        }
      } else if (r.cy + hr >= 297) {
        if (vyAbs < 1.5) {
          r.vy = -1.5;
          fixed = 1;
        }
      }
      if (fixed) {
        const spd = Math.sqrt(r.vx * r.vx + r.vy * r.vy);
        if (spd > 0) {
          r.vx = (r.vx / spd) * ROACH_WALL_SPEED;
          r.vy = (r.vy / spd) * ROACH_WALL_SPEED;
        }
      }
    }
  }

  function checkRoachCollisions() {
    'ram';
    for (let i = 0; i < radroaches.length; i++) {
      for (let j = i + 1; j < radroaches.length; j++) {
        const a = radroaches[i];
        const b = radroaches[j];
        const rSum = ROACH_R_SUM;

        const dx = a.cx - b.cx;
        const dy = a.cy - b.cy;
        const distSq = dx * dx + dy * dy;

        if (distSq < rSum * rSum && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist,
            ny = dy / dist;

          const overlap = rSum - dist;
          a.cx += nx * overlap * 0.5;
          a.cy += ny * overlap * 0.5;
          b.cx -= nx * overlap * 0.5;
          b.cy -= ny * overlap * 0.5;

          const relVel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (relVel >= 0) continue;

          const aN = a.vx * nx + a.vy * ny;
          const bN = b.vx * nx + b.vy * ny;

          a.vx += (bN - aN) * nx;
          a.vy += (bN - aN) * ny;
          b.vx += (aN - bN) * nx;
          b.vy += (aN - bN) * ny;

          let sMag = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
          if (sMag > 0) {
            a.vx = (a.vx / sMag) * ROACH_SPEED;
            a.vy = (a.vy / sMag) * ROACH_SPEED;
          }
          sMag = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (sMag > 0) {
            b.vx = (b.vx / sMag) * ROACH_SPEED;
            b.vy = (b.vy / sMag) * ROACH_SPEED;
          }
          jitterVelocity(a);
          jitterVelocity(b);

          if (getTime() - lastFlapTime >= 0.2) {
            lastFlapTime = getTime();
            Pip.audioStart(SFX.FLAP);
          }
        }
      }
    }
  }

  function updatePhysics() {
    'ram';
    if (gameState !== 'RACING') return;

    if (trackDirty) {
      trackDirty = 0;
      h.setColor(0).fillRect(0, 0, 480, 320);
      drawTrack();
      drawAllRoaches();
      h.flip();
      Pip.lastFlip = getTime();
      return;
    }

    let dIdx = 0;
    h.setColor(0);
    const hr = ROACH_HIT_R;
    for (let i = 0; i < radroaches.length; i++) {
      const r = radroaches[i];
      const dx1 = r.cx - hr - 4,
        dy1 = r.cy - hr - 4;
      const dx2 = r.cx + hr + 4,
        dy2 = r.cy + hr + 4;

      fillRectCached(dx1, dy1, dx2, dy2);

      dirty[dIdx++] = dx1;
      dirty[dIdx++] = dy1;
      dirty[dIdx++] = dx2;
      dirty[dIdx++] = dy2;
    }

    for (let i = 0; i < radroaches.length; i++) {
      const r = radroaches[i];
      r.cx += r.vx;
      r.cy += r.vy;
      checkWallCollision(r);
    }
    checkRoachCollisions();

    let minX = dirty[0],
      minY = dirty[1],
      maxX = dirty[2],
      maxY = dirty[3];
    for (let i = 4; i < 20; i += 4) {
      if (dirty[i] < minX) minX = dirty[i];
      if (dirty[i + 1] < minY) minY = dirty[i + 1];
      if (dirty[i + 2] > maxX) maxX = dirty[i + 2];
      if (dirty[i + 3] > maxY) maxY = dirty[i + 3];
    }
    h.setClipRect(minX, minY, maxX, maxY);
    drawTrack(minX, minY, maxX, maxY);
    h.setClipRect(0, 0, 480, 320);

    const goalX1 = goalPos.x - hr,
      goalX2 = goalPos.x + goalPos.hitW + hr;
    const goalY1 = goalPos.y - hr,
      goalY2 = goalPos.y + goalPos.hitH + hr;
    for (let i = 0; i < radroaches.length; i++) {
      const r = radroaches[i];
      if (
        r.cx >= goalX1 &&
        r.cx <= goalX2 &&
        r.cy >= goalY1 &&
        r.cy <= goalY2
      ) {
        gameState = 'GAMEOVER';
        winnerId = r.id;
        gameOverTime = getTime();
        lastBlinkState = -1; // Reset to force immediate evaluation
        Pip.audioStart(SFX.WINNER);
        break;
      }
    }

    drawAllRoaches();

    if (gameState === 'GAMEOVER') {
      updateGameOverAnimation();
    } else {
      h.flip();
      Pip.lastFlip = getTime();
    }
  }

  function updateGameOverAnimation() {
    'ram';
    const elapsed = getTime() - gameOverTime;
    
    const showWinner = Math.floor(elapsed / 2.3) % 2 === 0;

    if (showWinner !== lastBlinkState) {
      lastBlinkState = showWinner;

      if (showWinner) {
        displayWinner();
      } else {
        h.setColor(0).fillRect(0, 0, 480, 320);
        drawTrack();
        drawAllRoaches();

        h.flip();
        Pip.lastFlip = getTime();
      }
    }
  }

  function displayWinner() {
    try {
      let file = E.openFile(WINNER_IMG[winnerId], 'r');
      let target = new Uint8Array(h.buffer);
      let offset = target.length;
      let chunk = file.read(256);
      while (chunk) {
        offset -= chunk.length;
        target.set(chunk, offset);
        chunk = file.read(256);
      }
      file.close();
    } catch (e) {}

    h.setColor(0)
     .fillRect(128, 282, 351, 309)
     .setColor(3)
     .drawRect(130, 284, 349, 307);

    h.setFont('Monofonto14')
     .drawString('Press left wheel to race again!', 241, 289);

    h.flip();
    Pip.lastFlip = getTime();
  }

  // ─── Main Loop ────────────────────────────────────────────────────────────
  function mainLoop() {
    'ram';
    if (gameState === 'RACING') {
      updatePhysics();
    } else if (gameState === 'GAMEOVER') {
      updateGameOverAnimation();
    }
  }

  /**
   * Handle the left scroll wheel input
   * @param dir
   * @returns {void}
   */
  function onKnob1(dir) {
    if (dir !== 0) return;

    if (gameState === 'GAMEOVER') {
      app.go(app.scenes.TITLE);
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  loadTrack();

  // Head (top of image) faces the direction of travel.
  try {
    const data = JSON.parse(fs.readFileSync('HOLO/RADROACH_RACES/ROACH.JSON'));
    roachImage = {
      bpp: data.bpp,
      buffer: atob(data.buffer),
      height: data.height,
      transparent: data.transparent,
      width: data.width,
    };
  } catch (e) {
    roachImage = null;
  }

  Pip.onExclusive('knob1', onKnob1);

  countdownTimer = setInterval(tickCountdown, 1000);
  tickCountdown();

  mainLoopInterval = setInterval(mainLoop, 33); // ~30fps

  return {
    remove: function () {
      if (mainLoopInterval) {
        clearInterval(mainLoopInterval);
        mainLoopInterval = null;
      }
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
      Pip.removeListener('knob1', onKnob1);
    },
  };
});