(function (app: DndApp): DndScene {
  const W = h.getWidth();
  const H = h.getHeight();
  const state = app.dice!;
  let animationInterval: number | null = null;
  let initializationTimeout: number | null = null;
  let pressWatch: number | null = null;
  let dice!: DndDiceBuffer;
  let polygon!: Float32Array;
  let polygonBuffer!: Float32Array;
  let faces = 20;
  let count = 1;
  let frame = 0;
  let holding = false;
  let selected = 1;
  let settled = false;

  function begin(): void {
    settled = false;
    state.ready = false;
    frame = 0;
    try {
      Pip.audioStart('HOLO/DND/DICE_THROW.WAV');
    } catch (error) {
      // Optional
    }
    if (animationInterval !== null) clearInterval(animationInterval);
    animationInterval = setInterval(step, 50);
  }

  function collision(first: number, second: number): void {
    const x = dice[second] - dice[first];
    const y = dice[second + 1] - dice[first + 1];
    const radius = dice[first + 3] + dice[second + 3];
    const squared = x * x + y * y;
    if (squared >= radius * radius || squared <= 0) return;
    const distance = Math.sqrt(squared);
    const normalX = x / distance;
    const normalY = y / distance;
    const overlap = (radius - distance) / 2;
    dice[first] -= normalX * overlap;
    dice[first + 1] -= normalY * overlap;
    dice[second] += normalX * overlap;
    dice[second + 1] += normalY * overlap;
    const velocity =
      (dice[second + 4] - dice[first + 4]) * normalX +
      (dice[second + 5] - dice[first + 5]) * normalY;
    if (velocity < 0) {
      const impulse = (-1.9 * velocity) / 2;
      dice[first + 4] -= impulse * normalX;
      dice[first + 5] -= impulse * normalY;
      dice[second + 4] += impulse * normalX;
      dice[second + 5] += impulse * normalY;
    }
  }

  function drawArena(): void {
    let index = 0;
    let point = 0;
    h.setColor(0).fillRect(13, 65, W - 13, H - 25);
    h.setColor(2).drawRect(14, 66, W - 14, H - 66);
    h.setColor(3).setFontMonofonto14().setFontAlign(0, 0);
    for (index = 0; index < dice.length; index += 6) {
      for (point = 0; point < polygon.length; point += 2) {
        polygonBuffer[point] = dice[index] + dice[index + 3] * polygon[point];
        polygonBuffer[point + 1] =
          dice[index + 1] + dice[index + 3] * polygon[point + 1];
      }
      h.drawPoly(polygonBuffer, true);
      h.drawString('' + dice[index + 2], dice[index], dice[index + 1]);
    }
    if (settled) {
      h.setColor(3)
        .setFontMonofonto18()
        .setFontAlign(0, -1)
        .drawString(
          'TOTAL ' +
            state.total +
            (state.mode ? '' : '   NATURAL ' + state.natural) +
            '   (' +
            (state.modifier >= 0 ? '+' : '') +
            state.modifier +
            ')',
          W / 2,
          H - 62,
        );
      h.setColor(2)
        .setFontMonofonto14()
        .drawString(state.outcome, W / 2, H - 40);
    }
  }

  function drawButtons(): void {
    let button = 0;
    let left = 0;
    const width = (W - 36) / 2;
    h.setColor(0).fillRect(0, 29, W, 61);
    for (button = 0; button < 2; button++) {
      left = 14 + button * (width + 8);
      h.setColor(selected === button ? 3 : 2);
      if (selected === button) h.fillRect(left, 30, left + width, 60);
      else h.drawRect(left, 30, left + width, 60);
      h.setColor(selected === button ? 0 : 3)
        .setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString(button ? 'ROLL' : '< BACK', left + width / 2, 45);
    }
  }

  function randomDirection(): number {
    return (Math.randInt(2001) - 1000) / 1000;
  }

  function kick(): void {
    let index = 0;
    for (index = 0; index < dice.length; index += 6) {
      dice[index + 4] += randomDirection() * 15;
      dice[index + 5] += randomDirection() * 15;
    }
  }

  function score(): void {
    let index = 0;
    let kept = state.values[0];
    let pass = false;
    const attack = state.kind === 3;
    if (state.mode) {
      state.total = state.modifier;
      for (index = 0; index < count; index++)
        state.total += state.values[index];
      state.natural = 0;
      state.outcome = state.crit ? 'CRITICAL HIT: DAMAGE DICE DOUBLED' : '';
      return;
    }
    if (count > 1)
      kept =
        state.advantage > 0
          ? Math.max(state.values[0], state.values[1])
          : Math.min(state.values[0], state.values[1]);
    state.natural = kept;
    state.total = kept + state.modifier;
    state.outcome =
      kept === 20
        ? attack
          ? 'CRITICAL HIT'
          : 'NATURAL 20'
        : kept === 1
          ? attack
            ? 'NATURAL 1: AUTOMATIC MISS'
            : 'NATURAL 1'
          : '';
    if (state.dc) {
      pass =
        attack && kept === 20
          ? true
          : attack && kept === 1
            ? false
            : state.total >= state.dc;
      state.outcome +=
        (state.outcome ? '   ' : '') +
        (attack ? 'AC ' : 'DC ') +
        state.dc +
        (attack ? (pass ? ' HIT' : ' MISS') : pass ? ' PASS' : ' FAIL');
    }
    if (attack && kept === 20) {
      state.crit = 1;
      state.outcome += '   NEXT DAMAGE X2';
    }
  }

  function settle(): void {
    let index = 0;
    let rolled = 0;
    if (animationInterval !== null) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
    settled = true;
    const columns = Math.min(count, 5);
    const lines = Math.ceil(count / 5);
    for (index = 0; index < count; index++) {
      rolled = Math.randInt(faces) + 1;
      state.values[index] = rolled;
      dice[index * 6] = 14 + ((index % columns) + 0.5) * ((W - 28) / columns);
      dice[index * 6 + 1] =
        66 + (Math.floor(index / 5) + 0.5) * ((H - 132) / lines);
      dice[index * 6 + 2] = rolled;
    }
    state.rolled = count;
    score();
    state.ready = true;
    Pip.audioStop();
    drawArena();
  }

  function spawn(): void {
    let point = 0;
    let angle = 0;
    let index = 0;
    faces = state.mode ? state.faces[state.die] : 20;
    count = state.mode
      ? state.crit
        ? state.count * 2
        : state.count
      : state.advantage
        ? 2
        : 1;
    const sides = state.mode ? (state.die === 6 ? 10 : state.die + 3) : 8;
    polygon = new Float32Array(sides * 2);
    polygonBuffer = new Float32Array(sides * 2);
    for (point = 0; point < sides; point++) {
      angle = -Math.PI / 2 + (point * 2 * Math.PI) / sides;
      polygon[point * 2] = Math.cos(angle);
      polygon[point * 2 + 1] = Math.sin(angle);
    }
    const radius = count > 10 ? 12 : count > 5 ? 16 : 22;
    dice = new Float32Array(count * 6);
    for (index = 0; index < dice.length; index += 6) {
      dice[index] = 14 + radius + Math.randInt(W - 28 - 2 * radius);
      dice[index + 1] = 66 + radius + Math.randInt(H - 132 - 2 * radius);
      dice[index + 2] = Math.randInt(faces) + 1;
      dice[index + 3] = radius;
      dice[index + 4] = randomDirection() * 15;
      dice[index + 5] = randomDirection() * 15;
    }
  }

  function step(): void {
    let index = 0;
    let speed = 0;
    let first = 0;
    let second = 0;
    let speedMaximum = 0;
    frame++;
    for (index = 0; index < dice.length; index += 6) {
      dice[index] += dice[index + 4];
      dice[index + 1] += dice[index + 5];
      dice[index + 4] *= 0.92;
      dice[index + 5] *= 0.92;
      if (dice[index] < 14 + dice[index + 3]) {
        dice[index] = 14 + dice[index + 3];
        dice[index + 4] = -dice[index + 4] * 0.9;
      } else if (dice[index] > W - 14 - dice[index + 3]) {
        dice[index] = W - 14 - dice[index + 3];
        dice[index + 4] = -dice[index + 4] * 0.9;
      }
      if (dice[index + 1] < 66 + dice[index + 3]) {
        dice[index + 1] = 66 + dice[index + 3];
        dice[index + 5] = -dice[index + 5] * 0.9;
      } else if (dice[index + 1] > H - 66 - dice[index + 3]) {
        dice[index + 1] = H - 66 - dice[index + 3];
        dice[index + 5] = -dice[index + 5] * 0.9;
      }
      speed = Math.sqrt(
        dice[index + 4] * dice[index + 4] + dice[index + 5] * dice[index + 5],
      );
      speedMaximum = Math.max(speedMaximum, speed);
      dice[index + 2] = Math.randInt(faces) + 1;
    }
    for (first = 0; first < dice.length; first += 6) {
      for (second = first + 6; second < dice.length; second += 6)
        collision(first, second);
    }
    if (holding && speedMaximum < 6) {
      for (index = 0; index < dice.length; index += 6) {
        dice[index + 4] += randomDirection() * 4;
        dice[index + 5] += randomDirection() * 4;
      }
    }
    if (!holding && (speedMaximum < 1.4 || frame > 60)) settle();
    else drawArena();
  }

  function onLeft(direction: KnobDirection): void {
    if (direction || pressWatch !== null) return;
    if (!selected) app.go('DICE_MENU.JS');
    else {
      kick();
      begin();
    }
  }

  function onPress(event: WatchEvent): void {
    if (event.state) {
      if (selected) {
        holding = true;
        kick();
        begin();
      }
    } else if (holding) holding = false;
    else if (!selected) app.go('DICE_MENU.JS');
  }

  function onRight(direction: KnobDirection): void {
    if (!direction) return;
    selected = E.clip(selected + direction, 0, 1);
    Pip.playSound('SCROLL');
    drawButtons();
  }

  function remove(): void {
    if (animationInterval !== null) clearInterval(animationInterval);
    if (initializationTimeout !== null) clearTimeout(initializationTimeout);
    if (pressWatch !== null) clearWatch(pressWatch);
    Pip.removeListener('knob1', onLeft);
    Pip.removeListener('knob2', onRight);
    Pip.audioStop();
  }

  function initialize(): void {
    initializationTimeout = null;
    E.defrag();
    spawn();
    h.clear(0)
      .setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, -1)
      .drawString(state.label, W / 2, 4);
    drawButtons();
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString('HOLD = KEEP ROLLING    R-KNOB SWITCH', W / 2, H - 6);
    Pip.onExclusive('knob1', onLeft);
    Pip.onExclusive('knob2', onRight);
    if (typeof ENC1_PRESS !== 'undefined') {
      pressWatch = setWatch(onPress, ENC1_PRESS, {
        debounce: 50,
        edge: 'both',
        repeat: true,
      });
    }
    begin();
    drawArena();
  }

  initializationTimeout = setTimeout(initialize, 0);
  return { remove: remove };
});
