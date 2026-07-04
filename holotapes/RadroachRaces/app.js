// =============================================================================
//  Name: Radroach Races
//  Author: Theeohn Megistus
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/Theeohn/Radroach-Races
// =============================================================================

(function() {
  const drawLineCached = h.drawLine.bind(h);
  const fillRectCached = h.fillRect.bind(h);
  const drawStringCached = h.drawString.bind(h);

  const dirty = new Int16Array(20);

  let mainLoopInterval = null;
  let countdownTimer = null;

  // Set to 0 for random map, or 1–10 to force a specific map for testing.
  const TEST_MAP = 0;

  // Game States
  let gameState = 'TITLE_SCREEN';
  let winnerId = -1;
  let countdownValue = 5;
  let currentMapId = 2;

  let trackWalls = new Int16Array(0);

  let goalPos = { x: 0, y: 0, w: 18, h: 18, hitW: 16, hitH: 16 };
  let startX = 0;
  let startYBase = 0;
  let radroaches = [];

  let trackDirty = 1;
  let lastFlapTime = 0;

  const ROACH_LETTERS = { 1: 'R', 2: 'O', 3: 'A', 4: 'C', 5: 'H' };

  const ROACH_HIT_R = 10.7;
  const ROACH_R_SUM = ROACH_HIT_R * 2; // a.hitR + b.hitR is always this

  const JITTER_COS = new Float32Array(21);
  const JITTER_SIN = new Float32Array(21);
  for (let jd = -10; jd <= 10; jd++) {
    const jrad = jd * 0.017453292519943295;
    JITTER_COS[jd + 10] = Math.cos(jrad);
    JITTER_SIN[jd + 10] = Math.sin(jrad);
  }

  // ─── Map Data ─────────────────────────────────────────────────────────────
  //
  // Format per map entry in MAP_DATA:
  //   index+0 : goalX
  //   index+1 : goalY
  //   index+2 : startX
  //   index+3 : startY
  //   index+4 : wallCount  (number of walls)
  //   index+5 .. index+4+wallCount*4 : wall entries (x1,y1,x2,y2 each)

  const MAP_DATA = new Int16Array([
    // Map 1
    420, 205, 22, 62,  0,

    // Map 2
    392, 260, 40, 27,  2,
    160, 18, 160, 200,
    326, 113, 326, 298,

    // Map 3
    340, 150, 22, 110,  2,
    160, 95, 160, 225,
    323, 75, 323, 245,

    // Map 4
    32, 220, 22, 38,  3,
    18, 160, 340, 160,
    395, 18, 465, 94,
    395, 298, 465, 226,

    // Map 5
    75, 176, 450, 36,  3,
    18, 160, 180, 160,
    300, 160, 465, 160,
    240, 220, 240, 298,

    // Map 6
    165, 210, 348, 28,  3,
    200, 184, 200, 298,
    120, 110, 200, 184,
    330, 18, 330, 165,

    // Map 7
    357, 130, 22, 110,  4,
    160, 160, 223, 70,
    95, 160, 158, 250,
    310, 160, 373, 70,
    245, 160, 308, 250,

    // Map 8
    35, 65, 190, 28,  4,
    140, 18, 140, 135,
    100, 215, 220, 250,
    300, 115, 465, 115,
    316, 175, 316, 258,

    // Map 9
    172, 172, 22, 38,  4,
    18, 160, 219, 160,
    175, 235, 246, 120,
    350, 18, 380, 145,
    290, 220, 385, 220,

    // Map 10
    250, 186, 22, 32,  5,
    18, 145, 305, 145,
    90, 145, 90, 210,
    305, 145, 305, 238,
    140, 238, 305, 238,
    382, 66, 465, 116
  ]);

  function findMapBase(m) {
    let pos = 0;
    for (let i = 0; i < m; i++) pos += 5 + MAP_DATA[pos + 4] * 4;
    return pos;
  }

  // ─── Title Screen ─────────────────────────────────────────────────────────

  function showTitleScreen() {
    gameState = 'TITLE_SCREEN';
    winnerId = -1;

    h.setColor(0).fillRect(0, 0, 480, 320).setColor(2).drawRect(18, 18, 465, 298);

    h.setFont("Monofonto36").setFontAlign(0, -1).setColor(3).drawString("RADROACH RACES", 240, 52).setFont("Monofonto18").setFontAlign(0, -1).setColor(2).drawString("by Theeohn", 360, 94);

    h.setColor(2).drawLine(55, 180, 425, 180).drawLine(55, 200, 425, 200);
    for (let fx = 75; fx < 425; fx += 35) {
      h.fillRect(fx, 150, fx + 15, 230);
    }

    for (let gx = 35; gx < 445; gx += 12) {
      h.drawLine(gx, 230, gx - 4, 210).drawLine(gx + 3, 230, gx + 6, 205);
    }

    h.setColor(3).fillEllipse(200, 165, 280, 215).fillCircle(240, 150, 18).drawLine(236, 138, 205, 105).drawLine(244, 138, 275, 105).drawPoly([205, 165, 180, 175, 165, 200], false).drawPoly([200, 190, 175, 200, 160, 230], false).drawPoly([275, 165, 300, 175, 315, 200], false).drawPoly([280, 190, 305, 200, 320, 230], false);

    h.setFont("Monofonto23").setFontAlign(0, -1).setColor(3).drawString("PRESS LEFT WHEEL TO START!", 240, 255);

    Pip.onExclusive("knob1", handleKnobStart);
  }

  function handleKnobStart(dir) {
    if (dir !== 0) return;
    if (gameState === 'TITLE_SCREEN') {
      Pip.audioStart('HOLO/RADROACH_RACES/BUGLE.WAV');
      startCountdown();
    } else if (gameState === 'GAMEOVER') {
      showTitleScreen();
    }
  }

  // ─── Countdown ────────────────────────────────────────────────────────────

  function startCountdown() {
    gameState = 'COUNTDOWN';
    countdownValue = 5;

    currentMapId = TEST_MAP > 0 ? TEST_MAP - 1 : Math.randInt(10);
    const base = findMapBase(currentMapId);
    const wallCount = MAP_DATA[base + 4];

    trackWalls = new Int16Array(wallCount * 4);
    for (let i = 0; i < wallCount; i++) {
      const src = base + 5 + i * 4;
      const dst = i * 4;
      trackWalls[dst]   = MAP_DATA[src];
      trackWalls[dst+1] = MAP_DATA[src+1];
      trackWalls[dst+2] = MAP_DATA[src+2];
      trackWalls[dst+3] = MAP_DATA[src+3];
    }

    goalPos.x  = MAP_DATA[base];
    goalPos.y  = MAP_DATA[base + 1];
    startX     = MAP_DATA[base + 2];
    startYBase = MAP_DATA[base + 3];

    // Maps 2, 6, 8 (0-based: 1, 5, 7) use horizontal spawn spread; all others use vertical.
    const horizSpawn = (currentMapId === 1 || currentMapId === 5 || currentMapId === 7);
    const slots = horizSpawn ? [0, 21, 42, 63, 84] : [0, 23, 44, 65, 86];
    for (let s = 4; s > 0; s--) {
      const sv = Math.randInt(s + 1);
      const tmp = slots[s]; slots[s] = slots[sv]; slots[sv] = tmp;
    }
    radroaches = [
      { id: 1, cx: startX + 7 + (horizSpawn ? slots[0] : 0), cy: startYBase + 7 + (horizSpawn ? 0 : slots[0]), vx: 0, vy: 0 },
      { id: 2, cx: startX + 7 + (horizSpawn ? slots[1] : 0), cy: startYBase + 7 + (horizSpawn ? 0 : slots[1]), vx: 0, vy: 0 },
      { id: 3, cx: startX + 7 + (horizSpawn ? slots[2] : 0), cy: startYBase + 7 + (horizSpawn ? 0 : slots[2]), vx: 0, vy: 0 },
      { id: 4, cx: startX + 7 + (horizSpawn ? slots[3] : 0), cy: startYBase + 7 + (horizSpawn ? 0 : slots[3]), vx: 0, vy: 0 },
      { id: 5, cx: startX + 7 + (horizSpawn ? slots[4] : 0), cy: startYBase + 7 + (horizSpawn ? 0 : slots[4]), vx: 0, vy: 0 }
    ];
    for (let i = 0; i < radroaches.length; i++) {
      setRandomVelocity(radroaches[i], 4);
    }

    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(tickCountdown, 1000);
    tickCountdown();
  }

  function tickCountdown() {
    if (gameState !== 'COUNTDOWN') return;

    h.setColor(0).fillRect(0, 0, 480, 320);
    drawTrack();
    drawAllRoaches();

    if (countdownValue > 0) {
      h.setFont("Monofonto96").setFontAlign(0, 0).setColor(3).drawString(countdownValue.toString(), 240, 160);
      h.setColor(0).fillRect(67, 226, 407, 275).setColor(3).drawRect(69, 228, 405, 273);
      h.setFont("Monofonto36").setFontAlign(0, -1).setColor(3).drawString("PLACE YOUR BETS!!!", 240, 230);
      countdownValue--;
    } else {
      clearInterval(countdownTimer);
      countdownTimer = null;
      gameState = 'RACING';
      trackDirty = 1;
    }
  }

  // ─── Drawing ──────────────────────────────────────────────────────────────

  function drawAllRoaches() {  "ram";
    h.setColor(3).setFont("Monofonto23").setFontAlign(0, 0);
    for (let i = 0; i < radroaches.length; i++) {
      const r = radroaches[i];
      drawStringCached(ROACH_LETTERS[r.id], r.cx, r.cy);
    }
  }

  function drawTrack(clipX1, clipY1, clipX2, clipY2) {  "ram";
    // No region given -> drawing everything (countdown / full redraw), so
    // default to the whole screen and every element passes its overlap test.
    if (clipX1 === undefined) { clipX1 = 0; clipY1 = 0; clipX2 = 480; clipY2 = 320; }

    if (clipX1 <= 465 && clipX2 >= 18 && clipY1 <= 298 && clipY2 >= 18) {
      h.setColor(3).drawRect(18, 18, 465, 298);
    }

    for (let i = 0; i < trackWalls.length; i += 4) {
      const lx1 = trackWalls[i], ly1 = trackWalls[i+1], lx2 = trackWalls[i+2], ly2 = trackWalls[i+3];
      const wMinX = lx1 < lx2 ? lx1 : lx2, wMaxX = lx1 < lx2 ? lx2 : lx1;
      const wMinY = ly1 < ly2 ? ly1 : ly2, wMaxY = ly1 < ly2 ? ly2 : ly1;
      if (wMaxX < clipX1 || wMinX > clipX2 || wMaxY < clipY1 || wMinY > clipY2) continue;
      drawLineCached(lx1, ly1, lx2, ly2);
    }

    if (clipX2 >= 225 && clipX1 <= 320 && clipY2 >= 302 && clipY1 <= 316) {
      h.setFont("Monofonto14").setFontAlign(-1, -1).setColor(3).drawString("Map " + (currentMapId + 1), 225, 302);
    }

    const goalX1 = goalPos.x - 6, goalY1 = goalPos.y - 8;
    const goalX2 = goalPos.x + goalPos.w + 6, goalY2 = goalPos.y + goalPos.h + 11;
    if (clipX2 >= goalX1 && clipX1 <= goalX2 && clipY2 >= goalY1 && clipY1 <= goalY2) {
      h.setColor(3).fillRect(goalPos.x, goalPos.y, goalPos.x + goalPos.w, goalPos.y + goalPos.h).setColor(2).fillRect(goalPos.x + 6, goalPos.y - 8, goalPos.x + 11, goalPos.y).fillRect(goalPos.x - 6, goalPos.y + 6, goalPos.x, goalPos.y + 11);
    }
  }

  // ─── Physics ──────────────────────────────────────────────────────────────

  function setRandomVelocity(r, speed) {
    const deg = Math.randInt(400);
    const rad = deg * 0.017453292519943295;
    r.vx = Math.cos(rad) * speed;
    r.vy = Math.sin(rad) * speed;
  }

  function jitterVelocity(r) {  "ram";
    const idx = Math.randInt(21); // 0..20 maps to -10..+10 degrees
    const c = JITTER_COS[idx], s = JITTER_SIN[idx];
    const vx = r.vx, vy = r.vy;
    r.vx = vx * c - vy * s;
    r.vy = vx * s + vy * c;
  }

  function checkWallCollision(r) {  "ram";

    // ── Border walls ─────────────────────────────────────────────────────────
    let bounced = false;
    const hr = ROACH_HIT_R;

    if (r.cx - hr <= 18) {
      r.cx = 18 + hr; r.vx = r.vx < 0 ? -r.vx : r.vx; bounced = true;
    } else if (r.cx + hr >= 465) {
      r.cx = 465 - hr; r.vx = r.vx > 0 ? -r.vx : r.vx; bounced = true;
    }
    if (r.cy - hr <= 18) {
      r.cy = 18 + hr; r.vy = r.vy < 0 ? -r.vy : r.vy; bounced = true;
    } else if (r.cy + hr >= 298) {
      r.cy = 298 - hr; r.vy = r.vy > 0 ? -r.vy : r.vy; bounced = true;
    }

    // ── Interior walls: circle vs line-segment ────────────────────────────────

    for (let i = 0; i < trackWalls.length; i += 4) {
      const x1 = trackWalls[i],   y1 = trackWalls[i+1];
      const x2 = trackWalls[i+2], y2 = trackWalls[i+3];

      const segDx = x2 - x1, segDy = y2 - y1;
      const lenSq = segDx * segDx + segDy * segDy;
      let t = lenSq > 0 ? ((r.cx - x1) * segDx + (r.cy - y1) * segDy) / lenSq : 0;
      if (t < 0) t = 0; else if (t > 1) t = 1;

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
          if (spd > 0) { r.vx = r.vx / spd * 3; r.vy = r.vy / spd * 3; }

          jitterVelocity(r);
          bounced = true;
        }
      }
    }

    if (bounced) {
      if (getTime() - lastFlapTime >= 0.2) {
        lastFlapTime = getTime();
        Pip.audioStart('HOLO/RADROACH_RACES/FLAP.WAV');
      }

      const vxAbs = r.vx < 0 ? -r.vx : r.vx;
      const vyAbs = r.vy < 0 ? -r.vy : r.vy;
      let fixed = 0;
      if (r.cx - hr <= 19) {
        if (vxAbs < 1.5) { r.vx = 1.5; fixed = 1; }
      } else if (r.cx + hr >= 464) {
        if (vxAbs < 1.5) { r.vx = -1.5; fixed = 1; }
      }
      if (r.cy - hr <= 19) {
        if (vyAbs < 1.5) { r.vy = 1.5; fixed = 1; }
      } else if (r.cy + hr >= 297) {
        if (vyAbs < 1.5) { r.vy = -1.5; fixed = 1; }
      }
      if (fixed) {
        const spd = Math.sqrt(r.vx * r.vx + r.vy * r.vy);
        if (spd > 0) { r.vx = r.vx / spd * 3; r.vy = r.vy / spd * 3; }
      }
    }
  }

  function checkRoachCollisions() {  "ram";
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
          const nx = dx / dist, ny = dy / dist;

          const overlap = rSum - dist;
          a.cx += nx * overlap * 0.5; a.cy += ny * overlap * 0.5;
          b.cx -= nx * overlap * 0.5; b.cy -= ny * overlap * 0.5;

          const relVel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (relVel >= 0) continue;

          const aN = a.vx * nx + a.vy * ny;
          const bN = b.vx * nx + b.vy * ny;

          a.vx += (bN - aN) * nx; a.vy += (bN - aN) * ny;
          b.vx += (aN - bN) * nx; b.vy += (aN - bN) * ny;

          let sMag = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
          if (sMag > 0) { a.vx = a.vx / sMag * 4; a.vy = a.vy / sMag * 4; }
          sMag = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (sMag > 0) { b.vx = b.vx / sMag * 4; b.vy = b.vy / sMag * 4; }
          jitterVelocity(a);
          jitterVelocity(b);

          if (getTime() - lastFlapTime >= 0.2) {
            lastFlapTime = getTime();
            Pip.audioStart('HOLO/RADROACH_RACES/FLAP.WAV');
          }
        }
      }
    }
  }

  function updatePhysics() {  "ram";
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
      const dx1 = r.cx - hr - 2, dy1 = r.cy - hr - 2;
      const dx2 = r.cx + hr + 2, dy2 = r.cy + hr + 2;

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

    let minX = dirty[0], minY = dirty[1], maxX = dirty[2], maxY = dirty[3];
    for (let i = 4; i < 20; i += 4) {
      if (dirty[i]   < minX) minX = dirty[i];
      if (dirty[i+1] < minY) minY = dirty[i+1];
      if (dirty[i+2] > maxX) maxX = dirty[i+2];
      if (dirty[i+3] > maxY) maxY = dirty[i+3];
    }
    h.setClipRect(minX, minY, maxX, maxY);
    drawTrack(minX, minY, maxX, maxY);
    h.setClipRect(0, 0, 480, 320);

    const goalX1 = goalPos.x - hr, goalX2 = goalPos.x + goalPos.hitW + hr;
    const goalY1 = goalPos.y - hr, goalY2 = goalPos.y + goalPos.hitH + hr;
    for (let i = 0; i < radroaches.length; i++) {
      const r = radroaches[i];
      if (r.cx >= goalX1 && r.cx <= goalX2 && r.cy >= goalY1 && r.cy <= goalY2) {
        gameState = 'GAMEOVER';
        winnerId = r.id;
        Pip.audioStart('HOLO/RADROACH_RACES/assets/WINNER.WAV');
        break;
      }
    }

    drawAllRoaches();

    if (gameState === 'GAMEOVER') {
      displayWinner();
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  function displayWinner() {
    h.setColor(0).fillRect(120, 130, 360, 190).setColor(3).drawRect(122, 132, 358, 188);

    h.setFont("Monofonto16").setFontAlign(0, -1).setColor(3).drawString('"' + ROACH_LETTERS[winnerId] + '" ROACH WINS!!!', 240, 140).setFont("Monofonto14").drawString("Press left wheel to race again!", 240, 167);
  }

  // ─── Main Loop ────────────────────────────────────────────────────────────

  function mainLoop() {  "ram";
    if (gameState === 'RACING') {
      updatePhysics();
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  showTitleScreen();
  mainLoopInterval = setInterval(mainLoop, 33); // ~30fps

  return {
    id: "RADROACHRACES",
    notDefault: true,
    fullscreen: true,
    remove: function() {
      if (mainLoopInterval) { clearInterval(mainLoopInterval); mainLoopInterval = null; }
      if (countdownTimer)   { clearInterval(countdownTimer);   countdownTimer = null; }
      Pip.removeListener("knob1", handleKnobStart);
      Pip.audioStop();
    }
  };
});