(function (): HolotapeApp {
  // Lock geometry and tuning. Angles are in degrees.
  const C = {
    SAVE: 'HOLO/LOCKPICK/SAVE.JSON',
    CX: 240,
    CY: 182,
    RING: 118,
    PLUG: 72,
    PIN_STEP: 3,
    TURN_STEP: 10,
    FALLOFF: 50,
    SPRING: 7,
    IDLE_MS: 260,
    START_PINS: 8,
    D2R: 0.0174533,
  };
  const LEVELS: LockpickLevel[] = [
    { name: 'VERY EASY', tol: 22, hp: 6, force: 90, pts: 1, win: 0 },
    { name: 'EASY', tol: 14, hp: 5, force: 70, pts: 2, win: 1 },
    { name: 'AVERAGE', tol: 9, hp: 4, force: 45, pts: 3, win: 2 },
    { name: 'HARD', tol: 5, hp: 3, force: 25, pts: 5, win: 2 },
    { name: 'VERY HARD', tol: 3, hp: 2, force: 10, pts: 8, win: 3 },
  ];

  // Scratch buffer for polygons, reused to avoid allocating every frame.
  const pts = new Float32Array(8);

  let save: LockpickSave = { p: C.START_PINS, n: 0, s: 0, b: 0, d: 2 };

  // 0 menu, 1 picking, 2 unlocked, 3 pin snapped, 4 jammed, 5 run over.
  let phase = 0;
  let sweet = 0;
  let pinAng = 90;
  let lockAng = 0;
  let pinHp = 0;
  let jitter = 0;
  let lastTurn = 0;
  let dirty = true;

  let tick!: number;
  let msgTimer: number | undefined;

  function load(): void {
    if (!fs.statSync(C.SAVE)) return;
    try {
      const s = JSON.parse(fs.readFileSync(C.SAVE)) as LockpickSave;
      if (s.p >= 0) save.p = s.p;
      if (s.n >= 0) save.n = s.n;
      if (s.s >= 0) save.s = s.s;
      if (s.b >= 0) save.b = s.b;
      if (s.d >= 0 && s.d < LEVELS.length) save.d = s.d;
    } catch (e) {
      // Corrupt save: keep the defaults.
    }
  }

  function store(): void {
    fs.writeFileSync(C.SAVE, JSON.stringify(save));
  }

  // How far the lock may turn for the current pin position, 0 to 90.
  function allowed(): number {
    const d = Math.abs(pinAng - sweet) - LEVELS[save.d].tol;
    if (d <= 0) return 90;
    return Math.max(0, (90 * (1 - d / C.FALLOFF)) | 0);
  }

  function newLock(): void {
    sweet = 6 + Math.randInt(169);
    pinAng = 90;
    lockAng = 0;
    pinHp = LEVELS[save.d].hp;
    jitter = 0;
    phase = 1;
    dirty = true;
  }

  // Writes a rotated rectangle (a thick line along the lock's local Y axis,
  // from y1 to y2 with half-width w) into `pts`, turned by angle a.
  function bar(a: number, y1: number, y2: number, w: number): Float32Array {
    const c = Math.cos(a * C.D2R);
    const s = Math.sin(a * C.D2R);
    pts[0] = C.CX - w * c - y1 * s;
    pts[1] = C.CY - w * s + y1 * c;
    pts[2] = C.CX + w * c - y1 * s;
    pts[3] = C.CY + w * s + y1 * c;
    pts[4] = C.CX + w * c - y2 * s;
    pts[5] = C.CY + w * s + y2 * c;
    pts[6] = C.CX - w * c - y2 * s;
    pts[7] = C.CY - w * s + y2 * c;
    return pts;
  }

  function drawLock(): void {
    const a = lockAng;
    const c = Math.cos(a * C.D2R);
    const s = Math.sin(a * C.D2R);
    const p = pinAng * C.D2R;

    h.clearRect(100, 36, 379, 319);

    // Lock body, knocked sideways (and a little up) by the strain shake,
    // then the rotating plug, which holds still.
    h.setColor(2)
      .drawCircle(C.CX + jitter, C.CY - (jitter >> 1), C.RING)
      .drawCircle(C.CX + jitter, C.CY - (jitter >> 1), C.RING - 3)
      .setColor(1)
      .fillCircle(C.CX, C.CY, C.PLUG)
      .setColor(2)
      .drawCircle(C.CX, C.CY, C.PLUG);

    // Index mark on the plug so the turn is easy to read.
    h.setColor(3).fillPoly(bar(a + 180, 54, 66, 2));

    // Keyhole: a round top and a tapered slot, turned with the plug.
    h.setColor(0)
      .fillCircle((C.CX + 10 * s) | 0, (C.CY - 10 * c) | 0, 11)
      .fillPoly(bar(a, -6, 26, 5));

    // Screwdriver: shaft into the keyhole, handle off the bottom of the lock.
    h.setColor(2)
      .fillPoly(bar(a + 14, 6, 98, 3))
      .setColor(3)
      .fillPoly(bar(a + 14, 98, 128, 11))
      .setColor(1)
      .fillPoly(bar(a + 14, 106, 128, 4));

    // Bobby pin: two parallel wires from outside the lock into the keyhole,
    // with a bent tip. It does not turn with the plug.
    if (phase !== 3) {
      h.setColor(3)
        .drawLine(
          C.CX - 140 * Math.cos(p),
          C.CY - 140 * Math.sin(p),
          C.CX - 12 * Math.cos(p),
          C.CY - 12 * Math.sin(p),
        )
        .drawLine(
          C.CX - 140 * Math.cos(p) + 2 * Math.sin(p),
          C.CY - 140 * Math.sin(p) - 2 * Math.cos(p),
          C.CX - 14 * Math.cos(p) + 2 * Math.sin(p),
          C.CY - 14 * Math.sin(p) - 2 * Math.cos(p),
        )
        .fillCircle(
          (C.CX - 12 * Math.cos(p) + 2 * Math.sin(p)) | 0,
          (C.CY - 12 * Math.sin(p) - 2 * Math.cos(p)) | 0,
          2,
        );
    } else {
      // A snapped stub left in the keyhole.
      h.setColor(2).drawLine(
        C.CX - 40 * Math.cos(p),
        C.CY - 40 * Math.sin(p),
        C.CX - 12 * Math.cos(p),
        C.CY - 12 * Math.sin(p),
      );
    }
  }

  function drawHud(): void {
    h.clearRect(0, 36, 99, 319)
      .clearRect(380, 36, 479, 319)
      .setColor(2)
      .setFontMonofonto14()
      .setFontAlign(-1, -1)
      .drawString('LOCK', 8, 44)
      .drawString('BOBBY PINS', 388, 44)
      .drawString('SCORE', 388, 108)
      .drawString('BEST', 388, 168)
      .drawString('L TURN:\n LOCK\nL HOLD:\n FORCE\nL PRESS:\n MENU', 8, 212)
      .drawString('R TURN:\n PIN', 388, 238)
      .setColor(3)
      .setFontMonofonto16()
      .drawString(LEVELS[save.d].name.replace(' ', '\n'), 8, 62)
      .setFontMonofonto28()
      .drawString(String(save.p), 388, 62)
      .drawString(String(save.s), 388, 126)
      .setFontMonofonto18()
      .drawString(String(save.b), 388, 186);
  }

  function drawHeader(text: string): void {
    h.clearRect(0, 0, 479, 35)
      .setColor(3)
      .setFontMonofonto18()
      .setFontAlign(-1, -1)
      .drawString('LOCKPICK', 12, 8)
      .setFontAlign(1, -1)
      .drawString(text, 468, 8)
      .setColor(2)
      .drawLine(0, 33, 479, 33);
  }

  // A boxed message over the lock, e.g. "LOCK OPENED".
  function drawBanner(title: string, sub: string): void {
    h.setColor(0)
      .fillRect(130, 140, 350, 222)
      .setColor(3)
      .drawRect(130, 140, 350, 222)
      .drawRect(132, 142, 348, 220)
      .setFontMonofonto23()
      .setFontAlign(0, 0)
      .drawString(title, 240, 164)
      .setColor(2)
      .setFontMonofonto14()
      .drawString(sub, 240, 198);
  }

  function drawMenu(): void {
    let i = 0;
    h.setBgColor(0).clear();
    drawHeader('SELECT LOCK');
    h.setColor(2)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString(
        'PINS ' + save.p + '    SCORE ' + save.s + '    BEST ' + save.b,
        240,
        52,
      );
    for (i = 0; i < LEVELS.length; i++) {
      if (i === save.d) {
        h.setColor(3).fillRect(140, 88 + i * 34, 340, 116 + i * 34);
        h.setColor(0);
      } else {
        h.setColor(3);
      }
      h.setFontMonofonto23()
        .setFontAlign(0, 0)
        .drawString(LEVELS[i].name, 240, 103 + i * 34);
    }
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, -1)
      .drawString('TURN LEFT WHEEL TO CHOOSE, PRESS TO START', 240, 268)
      .drawString('PRESS AGAIN DURING A LOCK TO RETURN HERE', 240, 288);
  }

  // End of a run: the last bobby pin is gone.
  function drawRunOver(): void {
    const best = save.s > 0 && save.s >= save.b;
    h.setBgColor(0).clear();
    drawHeader('RUN OVER');
    h.setColor(3)
      .setFontMonofonto28()
      .setFontAlign(0, 0)
      .drawString('OUT OF BOBBY PINS', 240, 80)
      .setFontMonofonto23()
      .drawString('LOCKS PICKED  ' + save.n, 240, 136)
      .drawString('SCORE  ' + save.s, 240, 172)
      .setColor(best ? 3 : 2)
      .drawString(best ? 'NEW BEST!' : 'BEST  ' + save.b, 240, 208)
      .setColor(2)
      .setFontMonofonto14()
      .drawString('PRESS LEFT WHEEL FOR A NEW RUN', 240, 280);
  }

  function drawGame(): void {
    h.setBgColor(0).clear();
    drawHeader(LEVELS[save.d].name);
    drawHud();
    drawLock();
  }

  // Shows a banner, then moves on after a delay.
  function later(fn: () => void, ms: number): void {
    if (msgTimer) clearTimeout(msgTimer);
    msgTimer = setTimeout(function (): void {
      msgTimer = undefined;
      fn();
    }, ms);
  }

  function snapPin(): void {
    phase = 3;
    jitter = 0;
    save.p--;
    store();
    Pip.playSound('SELECT');
    drawLock();
    drawHud();
    drawBanner('PIN BROKE', save.p + ' BOBBY PINS LEFT');
    later(function (): void {
      if (save.p <= 0) {
        phase = 5;
        drawRunOver();
        return;
      }
      // Same lock, fresh pin back at the top; the sweet spot stays put.
      phase = 1;
      pinAng = 90;
      lockAng = 0;
      pinHp = LEVELS[save.d].hp;
      dirty = true;
    }, 1200);
  }

  function unlocked(forced: boolean): void {
    phase = 2;
    lockAng = 90;
    jitter = 0;
    // Only a clean pick earns pins and score; forcing just gets you in.
    if (!forced) {
      save.n++;
      save.p += LEVELS[save.d].win;
      save.s += LEVELS[save.d].pts;
      if (save.s > save.b) save.b = save.s;
    }
    store();
    Pip.playSound('SELECT');
    drawLock();
    drawHud();
    drawBanner(
      'LOCK OPENED',
      forced
        ? 'FORCED IT, NO REWARD\nPRESS FOR NEXT LOCK'
        : (LEVELS[save.d].win
            ? '+' + LEVELS[save.d].win + ' PINS   +'
            : 'NO PINS   +') +
            LEVELS[save.d].pts +
            ' SCORE\nPRESS FOR NEXT LOCK',
    );
  }

  function forceLock(): void {
    if (Math.randInt(100) < LEVELS[save.d].force) {
      unlocked(true);
      return;
    }
    phase = 4;
    Pip.playSound('SELECT');
    drawBanner('LOCK JAMMED', 'PRESS FOR A NEW LOCK');
  }

  function onFrame(): void {
    'ram';
    if (phase !== 1) return;
    // The spring pulls the plug back once the right wheel stops turning.
    if (lockAng > 0 && getTime() * 1000 - lastTurn > C.IDLE_MS) {
      lockAng = Math.max(0, lockAng - C.SPRING);
      dirty = true;
    }
    if (jitter) {
      jitter = jitter > 0 ? -jitter + 1 : -jitter - 1;
      dirty = true;
    }
    if (dirty) {
      dirty = false;
      drawLock();
    }
  }

  // Turning the left wheel either way tries the lock with the screwdriver.
  // Letting go lets the spring ease it back.
  function turnLock(): void {
    let max = 0;
    lastTurn = getTime() * 1000;
    max = allowed();
    if (lockAng + C.TURN_STEP <= max) {
      lockAng += C.TURN_STEP;
      Pip.playSound('SCROLL');
    } else {
      // Pushing past where the pin allows: the lock shudders and the pin
      // takes strain. The weaker the pin, the harder the outer ring shakes,
      // in pixels.
      lockAng = max;
      pinHp--;
      jitter = (3 + ((LEVELS[save.d].hp - pinHp) * 10) / LEVELS[save.d].hp) | 0;
      Pip.playSound('TAB');
    }
    dirty = true;
    if (lockAng >= 90) unlocked(false);
    else if (pinHp <= 0) snapPin();
  }

  function onKnob1(dir: KnobDirection, long?: boolean): void {
    if (phase === 0) {
      if (dir) {
        save.d = E.clip(save.d + dir, 0, LEVELS.length - 1);
        Pip.playSound('SCROLL');
        drawMenu();
        return;
      }
      store();
      Pip.playSound('TAB');
      newLock();
      drawGame();
      return;
    }
    if (phase === 2 || phase === 4) {
      if (dir) return;
      Pip.playSound('TAB');
      newLock();
      drawGame();
      return;
    }
    if (phase === 5) {
      if (dir) return;
      save.p = C.START_PINS;
      save.n = 0;
      save.s = 0;
      store();
      Pip.playSound('TAB');
      phase = 0;
      drawMenu();
      return;
    }
    if (phase !== 1) return;
    if (dir) {
      turnLock();
      return;
    }
    if (long) {
      forceLock();
    } else {
      phase = 0;
      store();
      Pip.playSound('TAB');
      drawMenu();
    }
  }

  // Right wheel slides the bobby pin. Moving it releases the tension, like
  // lifting off the trigger in the games.
  function onKnob2(dir: KnobDirection): void {
    if (phase !== 1 || !dir) return;
    pinAng = E.clip(pinAng + dir * C.PIN_STEP, 0, 180);
    lockAng = 0;
    dirty = true;
  }

  // Init. A save left with no pins (the app was closed on the last snap)
  // starts a fresh run.
  load();
  if (save.p <= 0) {
    save.p = C.START_PINS;
    save.n = 0;
    save.s = 0;
  }
  drawMenu();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  tick = setInterval(onFrame, 50);

  return {
    id: 'LOCKPICK',
    notDefault: true,
    fullscreen: true,
    remove: function (): void {
      clearInterval(tick);
      if (msgTimer) clearTimeout(msgTimer);
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      h.clear();
    },
  };
});
