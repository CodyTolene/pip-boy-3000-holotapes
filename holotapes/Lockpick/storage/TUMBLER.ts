(function (api: LockpickTumblerApi): LockpickTumblerScene {
  // A side cutaway of a pin-tumbler lock. Heights are in lift steps of
  // C.STEP pixels; a key pin's top meets the shear line when its height
  // equals that pin's target.
  const C = {
    X0: 92,
    X1: 372,
    TOP: 58,
    SHEAR: 142,
    BASE: 214,
    STEP: 3,
    MAX: 24,
    DRIVER: 22,
    PIN_W: 8,
    IDLE_SPRING: 350,
    IDLE_SET: 300,
  };
  const n = api.pins;
  const gap = (C.X1 - C.X0) / n;
  const height = new Int8Array(n);
  const target = new Int8Array(n);
  const isSet = new Uint8Array(n);
  const spool = new Uint8Array(n);
  const order = new Uint8Array(n);

  // Pick position: -1 is the EXIT tag left of the lock, 0..n-1 are pins.
  let cur = 0;
  // 1 light, 2 medium, 3 heavy.
  let tension = 2;
  let jam = -1;
  let falseSet = 0;
  let hp = api.hp;
  let shake = 0;
  let lastLift = 0;
  let opening = 0;
  let dirty = true;
  let tick!: number;
  let openTimer: number | undefined;

  function build(): void {
    let i = 0;
    let j = 0;
    let t = 0;
    for (i = 0; i < n; i++) {
      target[i] = 6 + Math.randInt(13);
      order[i] = i;
    }
    // Shuffle the binding order: machining tolerances decide which pin
    // binds first, so it is never simply left to right.
    for (i = n - 1; i > 0; i--) {
      j = Math.randInt(i + 1);
      t = order[i];
      order[i] = order[j];
      order[j] = t;
    }
    // Spool pins go anywhere but first in the binding order.
    for (i = 0; i < api.spools; i++) spool[order[n - 1 - i]] = 1;
  }

  // The pin currently binding, or -1 when every pin is set.
  function binder(): number {
    let k = 0;
    for (k = 0; k < n; k++) if (!isSet[order[k]]) return order[k];
    return -1;
  }

  function setCount(): number {
    let i = 0;
    let c = 0;
    for (i = 0; i < n; i++) c += isSet[i];
    return c;
  }

  function release(): void {
    let i = 0;
    for (i = 0; i < n; i++) {
      height[i] = 0;
      isSet[i] = 0;
    }
    jam = -1;
    falseSet = 0;
    dirty = true;
  }

  function pinX(i: number): number {
    return (C.X0 + gap * i + gap / 2) | 0;
  }

  function draw(): void {
    let i = 0;
    let x = 0;
    let keyTop = 0;
    let keyBottom = 0;
    let driverBottom = 0;
    let k = 0;
    const b = binder();
    // The plug nudges round a little for each set pin, and further on a
    // spool pin's false set; a strained pick makes it shudder.
    const dx = setCount() * 2 + falseSet * 6 + shake + opening;

    h.clearRect(0, 36, 479, 262);

    // Housing above the shear line, plug below it.
    h.setColor(1)
      .fillRect(C.X0 - 14, C.TOP - 6, C.X1 + 14, C.SHEAR - 1)
      .fillRect(C.X0 - 14 + dx, C.SHEAR + 1, C.X1 + 14 + dx, C.BASE + 10)
      .setColor(2)
      .drawLine(C.X0 - 30, C.SHEAR, C.X1 + 30, C.SHEAR);

    for (i = 0; i < n; i++) {
      x = pinX(i);
      // Clear the pin chamber through housing and plug.
      h.setColor(0)
        .fillRect(x - C.PIN_W, C.TOP, x + C.PIN_W, C.SHEAR - 1)
        .fillRect(x - C.PIN_W + dx, C.SHEAR + 1, x + C.PIN_W + dx, C.BASE + 4);
      keyBottom = C.BASE - height[i] * C.STEP;
      keyTop = keyBottom - (C.BASE - C.SHEAR - target[i] * C.STEP);
      // A set driver pin rests on the plug edge, above the shear line.
      driverBottom = isSet[i] ? C.SHEAR - 1 : keyTop - 1;
      if (isSet[i]) {
        keyBottom = C.BASE;
        keyTop = C.SHEAR + 3;
      }
      // Spring from the top of the chamber down to the driver pin.
      h.setColor(2);
      for (k = C.TOP + 2; k < driverBottom - C.DRIVER - 2; k += 6) {
        h.drawLine(x - 5, k, x + 5, k + 3).drawLine(x + 5, k + 3, x - 5, k + 6);
      }
      h.setColor(3).fillRect(
        x - C.PIN_W + 2,
        driverBottom - C.DRIVER,
        x + C.PIN_W - 2,
        driverBottom,
      );
      // Key pins sit in the plug, so they move with it.
      h.setColor(api.hint && i === b ? 3 : 2)
        .fillRect(x - C.PIN_W + 2 + dx, keyTop, x + C.PIN_W - 2 + dx, keyBottom)
        .fillPoly([
          x - C.PIN_W + 2 + dx,
          keyBottom,
          x + C.PIN_W - 2 + dx,
          keyBottom,
          x + dx,
          keyBottom + 5,
        ]);
      if (api.hint && i === b) {
        h.setColor(3).fillPoly([
          x - 6,
          C.SHEAR - 12,
          x + 6,
          C.SHEAR - 12,
          x,
          C.SHEAR - 4,
        ]);
      }
    }

    // Plug outline, then the shear line drawn over the pins so it is clear
    // where each stack has to split.
    h.setColor(2)
      .drawRect(C.X0 - 14 + dx, C.SHEAR + 1, C.X1 + 14 + dx, C.BASE + 10)
      .drawLine(C.X0 - 30, C.SHEAR, C.X1 + 30, C.SHEAR);

    // Tension wrench in the bottom of the keyway, right side.
    h.setColor(3)
      .fillRect(C.X1 - 40 + dx, C.BASE + 6, C.X1 + 10 + dx, C.BASE + 9)
      .fillRect(
        C.X1 + 10 + dx,
        C.BASE + 6,
        C.X1 + 14 + dx,
        C.BASE + 30 + tension * 4,
      );

    // Pick: a long shank from the left with a hook under the chosen pin.
    if (cur < 0) {
      x = 64;
      k = 222;
    } else {
      x = pinX(cur);
      k = C.BASE - height[cur] * C.STEP + 7;
    }
    h.setColor(3)
      .drawLine(x, k, x - 6, k + 8)
      .drawLine(x - 6, k + 8, 0, k + 8)
      .drawLine(x - 1, k, x - 7, k + 7)
      .drawLine(x - 7, k + 9, 0, k + 9);

    // EXIT tag bottom left, below the pick's path.
    h.setColor(cur < 0 ? 3 : 2).drawRect(8, 236, 72, 258);
    if (cur < 0) h.fillRect(9, 237, 71, 257).setColor(0);
    h.setFontMonofonto16().setFontAlign(0, 0).drawString('EXIT', 40, 247);

    // Tension and pick strength on the right, clear of the pick.
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(-1, -1)
      .drawString('TENSION', 404, 52);
    for (i = 0; i < 3; i++) {
      h.setColor(i < tension ? 3 : 1).fillRect(
        404 + i * 24,
        70,
        424 + i * 24,
        82,
      );
    }
    h.setColor(3)
      .setFontMonofonto16()
      .drawString(
        tension === 1 ? 'LIGHT' : tension === 2 ? 'MEDIUM' : 'HEAVY',
        404,
        88,
      );
    h.setColor(2).setFontMonofonto14().drawString('PICK', 404, 124);
    for (i = 0; i < api.hp; i++) {
      h.setColor(i < hp ? 3 : 1).fillRect(404 + i * 12, 142, 413 + i * 12, 152);
    }
  }

  function drawFrame(): void {
    h.clearRect(0, 0, 479, 35)
      .clearRect(0, 263, 479, 319)
      .setColor(3)
      .setFontMonofonto18()
      .setFontAlign(-1, -1)
      .drawString('LOCKPICK', 12, 8)
      .setFontAlign(1, -1)
      .drawString('TUMBLER ' + api.name, 468, 8)
      .setColor(2)
      .drawLine(0, 33, 479, 33)
      .setFontMonofonto14()
      .setFontAlign(0, -1)
      .drawString(
        'R TURN: MOVE PICK    L TURN: LIFT    L PRESS: TENSION',
        240,
        272,
      )
      .drawString('L HOLD: RELEASE ALL PINS    EXIT + L PRESS: MENU', 240, 292);
  }

  function snapPick(): void {
    const left = api.snap();
    Pip.playSound('SELECT');
    if (left <= 0) {
      api.end(2);
      return;
    }
    hp = api.hp;
    release();
  }

  // Left wheel up raises the pick (and the pin on it), down lowers it.
  function lift(dir: number): void {
    const pin = cur;
    const b = binder();
    if (pin < 0 || isSet[pin] || opening) return;
    lastLift = getTime() * 1000;
    dirty = true;
    if (dir > 0) {
      if (height[pin] > 0) height[pin]--;
      if (pin === b && height[pin] < target[pin] - api.tol) falseSet = 0;
      return;
    }
    if (pin !== b || jam >= 0) {
      // A loose pin just rides up on its spring.
      if (height[pin] < C.MAX) height[pin]++;
      Pip.playSound('SCROLL');
      return;
    }
    if (tension === 3) {
      // Too much tension: the binding pin is pinned solid and the pick
      // takes the strain instead.
      hp--;
      shake = 3;
      Pip.playSound('TAB');
      if (hp <= 0) snapPick();
      return;
    }
    height[pin]++;
    if (height[pin] > target[pin] + api.tol) {
      // Pushed the key pin past the shear line: overset and jammed.
      jam = pin;
      falseSet = 0;
      Pip.playSound('TAB');
      return;
    }
    if (spool[pin] && tension === 2 && height[pin] >= target[pin] - api.tol) {
      // A spool pin catches its waist at the shear line: the plug turns
      // further, a false set that feels like progress but is not.
      if (!falseSet) Pip.playSound('TAB');
      falseSet = 1;
      return;
    }
    if (!spool[pin] && tension === 2 && height[pin] >= target[pin]) {
      isSet[pin] = 1;
      falseSet = 0;
      Pip.playSound('SELECT');
      return;
    }
    Pip.playSound('SCROLL');
  }

  function onFrame(): void {
    'ram';
    let i = 0;
    const now = getTime() * 1000;
    const b = binder();
    if (opening) {
      if (opening < 18) opening += 6;
      dirty = true;
    }
    if (shake) {
      shake = shake > 0 ? -shake + 1 : -shake - 1;
      dirty = true;
    }
    for (i = 0; i < n; i++) {
      if (isSet[i] || !height[i] || i === jam) continue;
      if (i !== b) {
        // Loose pins spring back as soon as the pick leaves or rests.
        if (i !== cur || now - lastLift > C.IDLE_SPRING) {
          height[i]--;
          dirty = true;
        }
      } else if (now - lastLift > C.IDLE_SET) {
        if (spool[i] && tension === 1 && height[i] >= target[i] - api.tol) {
          // Light tension lets the spool's waist slip past: it sets.
          isSet[i] = 1;
          falseSet = 0;
          Pip.playSound('SELECT');
          dirty = true;
        } else if (tension === 1 && !spool[i]) {
          // Too little tension to hold a standard pin: it slides back.
          height[i]--;
          dirty = true;
        }
      }
    }
    if (!opening && b < 0) {
      opening = 1;
      Pip.playSound('SELECT');
      openTimer = setTimeout(function (): void {
        openTimer = undefined;
        api.end(1);
      }, 900);
    }
    if (dirty) {
      dirty = false;
      draw();
    }
  }

  function onKnob1(dir: KnobDirection, long?: boolean): void {
    if (opening) return;
    if (dir) {
      lift(dir);
      return;
    }
    if (long) {
      release();
      Pip.playSound('TAB');
      return;
    }
    if (cur < 0) {
      api.end(0);
      return;
    }
    tension = (tension % 3) + 1;
    if (tension !== 2) falseSet = 0;
    Pip.playSound('SCROLL');
    dirty = true;
  }

  function onKnob2(dir: KnobDirection): void {
    if (!dir || opening) return;
    cur = E.clip(cur + dir, -1, n - 1);
    Pip.playSound('SCROLL');
    dirty = true;
  }

  // Init.
  build();
  h.setBgColor(0).clear();
  drawFrame();
  draw();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  tick = setInterval(onFrame, 50);

  return {
    remove: function (): void {
      clearInterval(tick);
      if (openTimer) clearTimeout(openTimer);
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
    },
  };
});
