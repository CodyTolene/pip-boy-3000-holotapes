(function (app: DiceRollerApp): DiceRollerScene {
  let animationInterval: number | null = null;
  let initializationTimeout: number | null = null;
  let pressWatch: number | null = null;
  let dice!: DiceRollerBuffer;
  let polygon!: Float32Array;
  let polygonBuffer!: Float32Array;
  let frame = 0;
  let holding = false;
  let selected = 1;
  let settled = false;

  function begin(): void {
    settled = false;
    app.ready = false;
    frame = 0;
    try {
      Pip.audioStart('HOLO/DICE_ROLLER/DICE_THROW.WAV');
    } catch (error) {
      // sound is optional
    }
    if (animationInterval !== null) {
      clearInterval(animationInterval);
    }
    animationInterval = setInterval(step, 50);
  }

  function collision(first: number, second: number): void {
    const x = dice[second] - dice[first];
    const y = dice[second + 1] - dice[first + 1];
    const radius = dice[first + 3] + dice[second + 3];
    const squared = x * x + y * y;
    if (squared >= radius * radius || squared <= 0) {
      return;
    }
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
    h.setColor(0).fillRect(13, 65, app.W - 13, app.H - 25);
    h.setColor(2).drawRect(14, 66, app.W - 14, app.H - 66);
    h.setColor(3).setFontMonofonto14().setFontAlign(0, 0);
    for (index = 0; index < dice.length; index += 6) {
      if (app.faces[app.type] === 2) {
        h.drawCircle(dice[index], dice[index + 1], dice[index + 3]);
      } else {
        for (point = 0; point < polygon.length; point += 2) {
          polygonBuffer[point] = dice[index] + dice[index + 3] * polygon[point];
          polygonBuffer[point + 1] =
            dice[index + 1] + dice[index + 3] * polygon[point + 1];
        }
        h.drawPoly(polygonBuffer, true);
      }
      h.drawString('' + dice[index + 2], dice[index], dice[index + 1]);
    }
    if (settled) {
      h.setColor(3)
        .setFontMonofonto18()
        .setFontAlign(0, -1)
        .drawString(
          'TOTAL ' +
            app.total +
            '   (SUM ' +
            (app.modifier >= 0 ? '+' : '') +
            app.modifier +
            ')',
          app.W / 2,
          app.H - 62,
        );
      h.setColor(2)
        .setFontMonofonto14()
        .drawString(
          (app.target
            ? app.total >= app.target
              ? 'TARGET MET'
              : 'TARGET MISSED'
            : 'TARGET OFF') +
            '   ' +
            (app.critical ? 'CRITICALS ' + app.criticals : 'CRITICALS OFF'),
          app.W / 2,
          app.H - 40,
        );
    }
  }

  function drawButtons(): void {
    let button = 0;
    let left = 0;
    const width = (app.W - 36) / 2;
    h.setColor(0).fillRect(0, 29, app.W, 61);
    for (button = 0; button < 2; button++) {
      left = 14 + button * (width + 8);
      h.setColor(selected === button ? 3 : 2);
      if (selected === button) {
        h.fillRect(left, 30, left + width, 60);
      } else {
        h.drawRect(left, 30, left + width, 60);
      }
      h.setColor(selected === button ? 0 : 3)
        .setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString(button ? 'ROLL' : '< BACK', left + width / 2, 45);
    }
  }

  function kick(): void {
    for (let index = 0; index < dice.length; index += 6) {
      dice[index + 4] += randomDirection() * 15;
      dice[index + 5] += randomDirection() * 15;
    }
  }

  function onLeft(direction: KnobDirection): void {
    if (direction || pressWatch !== null) {
      return;
    }
    if (!selected) {
      app.go('DICE_MENU.JS');
    } else {
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
    } else if (holding) {
      holding = false;
    } else if (!selected) {
      app.go('DICE_MENU.JS');
    }
  }

  function onRight(direction: KnobDirection): void {
    if (!direction) {
      return;
    }
    selected = E.clip(selected + direction, 0, 1);
    Pip.playSound('SCROLL');
    drawButtons();
  }

  function randomDirection(): number {
    return (Math.randInt(2001) - 1000) / 1000;
  }

  function remove(): void {
    if (animationInterval !== null) {
      clearInterval(animationInterval);
    }
    if (initializationTimeout !== null) {
      clearTimeout(initializationTimeout);
    }
    if (pressWatch !== null) {
      clearWatch(pressWatch);
    }
    Pip.removeListener('knob1', onLeft);
    Pip.removeListener('knob2', onRight);
    Pip.audioStop();
  }

  function settle(): void {
    if (animationInterval !== null) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
    settled = true;
    app.total = app.modifier;
    app.criticals = 0;
    const maximum = app.faces[app.type];
    const columns = Math.min(app.count, 5);
    for (let index = 0; index < app.count; index++) {
      const rolled = Math.randInt(maximum) + 1;
      app.values[index] = rolled;
      app.total += rolled;
      if (app.critical && rolled >= app.critical) {
        app.criticals++;
      }
      dice[index * 6] =
        14 + ((index % columns) + 0.5) * ((app.W - 28) / columns);
      dice[index * 6 + 1] = app.count <= 5 ? 160 : index < 5 ? 120 : 200;
      dice[index * 6 + 2] = rolled;
    }
    app.ready = true;
    Pip.audioStop();
    drawArena();
  }

  function spawn(): void {
    let point = 0;
    let angle = 0;
    let index = 0;
    const sides = app.type === 7 ? 10 : app.type + 2;
    polygon = new Float32Array(sides * 2);
    polygonBuffer = new Float32Array(sides * 2);
    for (point = 0; point < sides; point++) {
      angle = -Math.PI / 2 + (point * 2 * Math.PI) / sides;
      polygon[point * 2] = Math.cos(angle);
      polygon[point * 2 + 1] = Math.sin(angle);
    }
    const radius = app.count > 5 ? 16 : 22;
    dice = new Float32Array(app.count * 6);
    for (index = 0; index < dice.length; index += 6) {
      dice[index] = 14 + radius + Math.randInt(app.W - 28 - 2 * radius);
      dice[index + 1] = 66 + radius + Math.randInt(app.H - 132 - 2 * radius);
      dice[index + 2] = Math.randInt(app.faces[app.type]) + 1;
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
    frame++;
    let speedMaximum = 0;
    const maximum = app.faces[app.type];
    for (index = 0; index < dice.length; index += 6) {
      dice[index] += dice[index + 4];
      dice[index + 1] += dice[index + 5];
      dice[index + 4] *= 0.92;
      dice[index + 5] *= 0.92;
      if (dice[index] < 14 + dice[index + 3]) {
        dice[index] = 14 + dice[index + 3];
        dice[index + 4] = -dice[index + 4] * 0.9;
      } else if (dice[index] > app.W - 14 - dice[index + 3]) {
        dice[index] = app.W - 14 - dice[index + 3];
        dice[index + 4] = -dice[index + 4] * 0.9;
      }
      if (dice[index + 1] < 66 + dice[index + 3]) {
        dice[index + 1] = 66 + dice[index + 3];
        dice[index + 5] = -dice[index + 5] * 0.9;
      } else if (dice[index + 1] > app.H - 66 - dice[index + 3]) {
        dice[index + 1] = app.H - 66 - dice[index + 3];
        dice[index + 5] = -dice[index + 5] * 0.9;
      }
      speed = Math.sqrt(
        dice[index + 4] * dice[index + 4] + dice[index + 5] * dice[index + 5],
      );
      speedMaximum = Math.max(speedMaximum, speed);
      dice[index + 2] = Math.randInt(maximum) + 1;
    }
    for (first = 0; first < dice.length; first += 6) {
      for (second = first + 6; second < dice.length; second += 6) {
        collision(first, second);
      }
    }
    if (holding && speedMaximum < 6) {
      for (index = 0; index < dice.length; index += 6) {
        dice[index + 4] += randomDirection() * 4;
        dice[index + 5] += randomDirection() * 4;
      }
    }
    if (!holding && (speedMaximum < 1.4 || frame > 60)) {
      settle();
    } else {
      drawArena();
    }
  }

  function initialize(): void {
    initializationTimeout = null;
    E.defrag();
    spawn();
    h.clear(0)
      .setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, -1)
      .drawString(app.count + 'D' + app.faces[app.type], app.W / 2, 4);
    drawButtons();
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString('HOLD = KEEP ROLLING    R-KNOB SWITCH', app.W / 2, app.H - 6);
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
