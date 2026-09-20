(function () {
  const W = h.getWidth(),
    H = h.getHeight();
  const BUBBLE_LEN = 297,
    BUBBLE_FRAMES = 27;
  const SEAHORSE_HOP = 5,
    SEAHORSE_RISE = 16,
    SEAHORSE_TICKS = 4;

  // Seahorse path, as flat (dx, dy) pairs: rise, small loop, sink, step left.
  // Espruino stores arrays as linked lists, so 38 little [dx, dy] arrays cost
  // well over a hundred variable blocks; this flat one costs a handful.
  const MOVES = new Int8Array((SEAHORSE_RISE * 2 + 6) * 2);
  for (let i = 0; i < SEAHORSE_RISE; i++) {
    MOVES[i * 2 + 1] = -1;
    MOVES[(SEAHORSE_RISE + 5 + i) * 2 + 1] = 1;
  }
  MOVES.set([1, 0, 0, 1, -1, 0, 0, -1, 1, 0], SEAHORSE_RISE * 2);
  MOVES[(SEAHORSE_RISE * 2 + 5) * 2] = -1;

  let coralA!: string, coralB!: string, bubbleFile!: EspruinoFile;
  let fishes: PipquariumFish[] = [];
  let bubbleVents: Array<{
    x: number;
    y: number;
    frame: number;
    anim: number;
  }> = [];
  let seahorse!: PipquariumSeahorse;
  let frameInterval!: number;

  function drawSeek(
    file: EspruinoFile | undefined,
    frameLen: number,
    idx: number,
    x: number | undefined,
    y: number | undefined,
  ): void {
    if (!file) return;
    file.seek(idx * frameLen);
    let frame = file.read(frameLen);
    if (frame !== undefined) h.drawImage(frame, x, y);
  }

  function openDir(f: PipquariumFish): void {
    if (f.file) f.file.close();
    f.file = E.openFile(f.dir > 0 ? f.pathR : f.pathL, 'r');
  }

  function spawnY(vdir: number, ht: number): number {
    const half = H / 2;
    if (vdir < 0) return half + Math.randInt(half - 10 - ht);
    if (vdir > 0) return 10 + Math.randInt(half - 10 - ht);
    return 10 + Math.randInt(H - 20 - ht);
  }

  function makeFish(
    pathL: string,
    pathR: string,
    frameLen: number,
    frameCount: number,
    w: number,
    ht: number,
    minSpd: number,
    maxSpd: number,
    animEvery: number,
    vdir: number,
  ): PipquariumFish {
    const dir = Math.randInt(2) ? 1 : -1;
    const f: PipquariumFish = {
      pathL: pathL,
      pathR: pathR,
      frameLen: frameLen,
      frameCount: frameCount,
      w: w,
      h: ht,
      minSpd: minSpd,
      maxSpd: maxSpd,
      animEvery: animEvery,
      vdir: vdir,
      dir: dir,
      x: dir > 0 ? -w : W,
      y: spawnY(vdir, ht),
      spd: minSpd + Math.randInt(maxSpd - minSpd + 1),
      frame: 0,
      anim: 0,
      file: undefined,
    };
    openDir(f);
    return f;
  }

  function respawnFish(f: PipquariumFish): void {
    const newDir = Math.randInt(2) ? 1 : -1;
    if (newDir !== f.dir) {
      f.dir = newDir;
      openDir(f);
    }
    f.x = f.dir > 0 ? -f.w : W;
    f.y = spawnY(f.vdir, f.h);
    f.spd = f.minSpd + Math.randInt(f.maxSpd - f.minSpd + 1);
  }

  function stepSeahorse(): void {
    if (seahorse.phase < 0) {
      seahorse.waitTimer--;
      if (seahorse.waitTimer <= 0) {
        seahorse.phase = 0;
        seahorse.stepTicks = 0;
      }
      return;
    }
    const p = seahorse.phase * 2;
    const step =
      seahorse.stepTicks === SEAHORSE_TICKS - 1
        ? SEAHORSE_HOP - (SEAHORSE_TICKS - 1)
        : 1;
    seahorse.x += MOVES[p] * step;
    seahorse.y += MOVES[p + 1] * step;
    seahorse.stepTicks++;
    if (seahorse.stepTicks >= SEAHORSE_TICKS) {
      seahorse.stepTicks = 0;
      seahorse.phase++;
      if (seahorse.phase >= MOVES.length >> 1) {
        seahorse.phase = -1;
        seahorse.x = seahorse.homeX;
        seahorse.y = seahorse.homeY + SEAHORSE_HOP * SEAHORSE_RISE;
        seahorse.waitTimer = 50 + Math.randInt(200);
      }
    }
  }

  function onFrame(): void {
    'ram';
    h.clear(0);

    stepSeahorse();
    seahorse.anim++;
    if (seahorse.anim >= 2) {
      seahorse.anim = 0;
      seahorse.frame = (seahorse.frame + 1) % seahorse.frameCount;
    }
    drawSeek(
      seahorse.file,
      seahorse.frameLen,
      seahorse.frame,
      seahorse.x,
      seahorse.y,
    );

    h.drawImage(coralA, W - 228, H - 180);
    h.drawImage(coralB, 0, H - 218);

    for (let i = 0; i < fishes.length; i++) {
      const f = fishes[i];
      if (!f) continue;
      f.x += f.dir * f.spd;
      f.y = E.clip(f.y + f.vdir, 10, H - 20 - f.h);
      if ((f.dir > 0 && f.x > W) || (f.dir < 0 && f.x + f.w < 0))
        respawnFish(f);
      f.anim++;
      if (f.anim >= f.animEvery) {
        f.anim = 0;
        f.frame = (f.frame + 1) % f.frameCount;
      }
      drawSeek(f.file, f.frameLen, f.frame, f.x, f.y);
    }

    for (let i = 0; i < bubbleVents.length; i++) {
      const v = bubbleVents[i];
      v.anim++;
      if (v.anim >= 2) {
        v.anim = 0;
        v.frame = (v.frame + 1) % BUBBLE_FRAMES;
      }
      drawSeek(bubbleFile, BUBBLE_LEN, v.frame, v.x, v.y);
    }
  }

  h.clear(0);
  //Pip.audioStart("HOLO/PIPQUARIUM/AMBIENT.WAV", { repeat: true });

  setTimeout(function () {
    E.defrag();
    coralA = fs.readFileSync('HOLO/PIPQUARIUM/CORAL_A.IMG');
    coralB = fs.readFileSync('HOLO/PIPQUARIUM/CORAL_B.IMG');
    bubbleFile = E.openFile('HOLO/PIPQUARIUM/BUBBLE.IMG', 'r');

    fishes.push(
      makeFish(
        'HOLO/PIPQUARIUM/FISHA_R.IMG',
        'HOLO/PIPQUARIUM/FISHA_L.IMG',
        1083,
        10,
        83,
        52,
        4,
        6,
        1,
        1,
      ),
    );
    fishes.push(
      makeFish(
        'HOLO/PIPQUARIUM/FISHB_R.IMG',
        'HOLO/PIPQUARIUM/FISHB_L.IMG',
        928,
        6,
        77,
        48,
        4,
        7,
        1,
        -1,
      ),
    );
    fishes.push(
      makeFish(
        'HOLO/PIPQUARIUM/TRIG_R.IMG',
        'HOLO/PIPQUARIUM/TRIG_L.IMG',
        1829,
        6,
        100,
        73,
        2,
        4,
        1,
        1,
      ),
    );
    fishes.push(
      makeFish(
        'HOLO/PIPQUARIUM/RAY_L.IMG',
        'HOLO/PIPQUARIUM/RAY_R.IMG',
        2036,
        10,
        127,
        64,
        4,
        6,
        1,
        0,
      ),
    );

    seahorse = {
      file: E.openFile('HOLO/PIPQUARIUM/SEAHORSE.IMG', 'r'),
      frameLen: 785,
      frameCount: 3,
      homeX: 300,
      homeY: 200,
      x: 300,
      y: 200 + SEAHORSE_HOP * SEAHORSE_RISE,
      phase: -1,
      stepTicks: 0,
      waitTimer: /*30 + Math.randInt(150)*/ 10,
      frame: 0,
      anim: 0,
    };

    bubbleVents.push({ x: 40, y: 60, frame: 0, anim: 0 });
    bubbleVents.push({ x: 110, y: 180, frame: 7, anim: 0 });
    bubbleVents.push({ x: 160, y: 200, frame: 14, anim: 0 });
    bubbleVents.push({ x: 430, y: 130, frame: 21, anim: 0 });

    frameInterval = setInterval(onFrame, 100);
  }, 0);

  return {
    id: 'pipquarium',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      if (frameInterval) clearInterval(frameInterval);
      for (let i = 0; i < fishes.length; i++) {
        let fish = fishes[i];
        if (fish && fish.file) fish.file.close();
      }
      if (seahorse && seahorse.file) seahorse.file.close();
      if (bubbleFile) bubbleFile.close();
      Pip.audioStop();
      h.clear();
    },
  };
});
