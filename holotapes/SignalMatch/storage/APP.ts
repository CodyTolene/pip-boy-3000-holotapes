(function () {
  const fs = require('fs');
  const SAVE_FILE = 'HOLO/SIGNAL_MATCH/SAVE.JSON';
  // Pip-Boy art from the card's own DATA files (same ids in F3 and NV):
  // the Perception Vault Boy (eyes and ears) on the menu, Computer Whiz on
  // the signal-lost card. Read when a screen is drawn and never kept.
  const ART_PERCEPTION = 1001;
  const ART_WHIZ = 204228;

  const CENTER_X = 240;
  const CENTER_Y = 176;
  const OUTER_RING_RADIUS = 70;
  const RING_INNER_RADIUS = 52;
  const INNER_HOLE_RADIUS = 20;
  const WHEEL_POSITIONS = 16;

  // Scenes: menu, controls page, playing, signal-lost card.
  const MENU = 0;
  const HELP = 1;
  const PLAY = 2;
  const LOST = 3;

  const MENU_ROWS = ['START', 'CONTROLS'];
  const MENU_ABOUT = [
    'WATCH THE NUMBERS LIGHT UP ON THE DIAL, THEN TUNE BACK TO EACH ONE IN TURN. EVERY ROUND ADDS ONE MORE.',
    'HOW TO TURN THE DIAL, SEND A NUMBER AND LEAVE A GAME.',
  ];
  const HELP_LINES = [
    'MENU',
    'EITHER WHEEL: CHOOSE',
    'PRESS LEFT WHEEL: START OR OPEN',
    'PLAYING',
    'WATCH THE NUMBERS LIGHT UP ON THE DIAL.',
    'EITHER WHEEL: TURN THE DIAL',
    'PRESS LEFT WHEEL: SEND THE NUMBER',
    'HOLD LEFT WHEEL: BACK TO THE MENU',
  ];

  // Maps wheel position index -> digit (0-7) shown there.
  // Digits sit on every other position around the 16-position wheel.
  const positionValues: Record<number, number> = {};
  for (let digit = 0; digit < 8; digit++) {
    positionValues[2 * digit] = digit;
  }

  let scene = MENU;
  let menuSel = 0;
  let best = 0;
  let sequence: number[] = [];
  let round = 0;
  let progress = 0;
  let selectedValue = 0;
  let highlightValue = -1;
  let playing = false; // true while the player is tuning, false during playback
  let picked = 0;
  let wanted = 0;
  let newBest = false;
  let pendingTimer: number | null = null;
  let bootTimer: number | null = null;

  function load(): void {
    try {
      const j: SignalMatchSave = JSON.parse(String(fs.readFileSync(SAVE_FILE)));
      best = j.b > 0 ? j.b : 0;
    } catch (e) {
      best = 0;
    }
  }

  // A full or locked card only loses the save; it never stops the game.
  function store(): void {
    try {
      fs.writeFileSync(SAVE_FILE, JSON.stringify({ b: best }));
    } catch (e) {
      console.log('Signal Match: save failed');
    }
  }

  function readArt(cat: string, id: number): string | undefined {
    const dir = 'DATA/' + (NV ? 'NV' : 'F3') + '/' + cat;
    let f: EspruinoFile | undefined;
    let r: ArtRecord | undefined;
    let img: string | Uint8Array | undefined;
    try {
      f = E.openFile(dir + '.DAT', 'r');
      const head = new Uint32Array(E.toArrayBuffer(f.read(8) || ''));
      const ids = new Uint32Array(E.toArrayBuffer(f.read(4 * head[0]) || ''));
      const k = ids.indexOf(id);
      if (k >= 0) {
        f.seek(8 + 4 * head[0] + k * head[1]);
        const t = String(f.read(head[1]));
        r = JSON.parse(t.indexOf('\0') >= 0 ? t.slice(0, t.indexOf('\0')) : t);
      }
      f.close();
      f = undefined;
      if (!r || !r.il) return undefined;
      f = E.openFile(dir + '.IMG', 'r');
      f.seek(r.io || 0);
      img = f.read(r.il);
      f.close();
    } catch (e) {
      if (f) f.close();
      return undefined;
    }
    return typeof img === 'string' ? img : undefined;
  }

  // The Pip-Boy's own header: title on the line, info under it on the right.
  function header(info: string): void {
    const title = 'SIGNAL MATCH';
    h.clearRect(0, 0, 479, 39)
      .setColor(3)
      .setFontMonofonto18()
      .setFontAlign(-1, 0)
      .drawString(title, 57, 18);
    h.drawLine(15, 18, 47, 18).drawLine(67 + h.stringWidth(title), 18, 465, 18);
    if (info) {
      h.setFontMonofonto14().setFontAlign(1, 0).drawString(info, 461, 32);
    }
  }

  // Runs fn after ms as the one pending game timer. The id is dropped as
  // soon as the timer fires, so a later clear can never hit a timer the
  // Pip-Boy has since given the same id.
  function later(fn: () => void, ms: number): void {
    pendingTimer = setTimeout(function () {
      pendingTimer = null;
      fn();
    }, ms);
  }

  function clearPendingTimer(): void {
    if (pendingTimer !== null) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  }

  // ---- Menu -------------------------------------------------------------

  function drawMenuRows(): void {
    let i = 0;
    let y = 0;
    h.clearRect(20, 48, 230, 100).setFontMonofonto14();
    for (i = 0; i < MENU_ROWS.length; i++) {
      y = 50 + i * 24;
      if (i === menuSel) Pip.shadeBox(24, y, 214, y + 24);
      h.setColor(3)
        .setFontAlign(-1, 0)
        .drawString(MENU_ROWS[i], 46, y + 14);
    }
    const lines = h.wrapString(MENU_ABOUT[menuSel], 225);
    h.clearRect(240, 180, 470, 244).setColor(3).setFontAlign(-1, -1);
    for (i = 0; i < lines.length && i < 4; i++) {
      h.drawString(lines[i], 240, 182 + i * 16);
    }
  }

  function drawMenu(): void {
    scene = MENU;
    h.setBgColor(0).clear();
    header('');
    // The art's box is opaque: it sits alone above the text, x 298-407.
    const art = readArt('SPECIAL', ART_PERCEPTION);
    if (art) h.drawImage(art, 298, 46);
    drawMenuRows();
    Pip.renderBlock(
      240,
      248,
      225,
      'BEST',
      best + (best === 1 ? ' ROUND' : ' ROUNDS'),
    );
  }

  function drawHelp(): void {
    let i = 0;
    let y = 54;
    scene = HELP;
    h.setBgColor(0).clear();
    header('CONTROLS');
    h.setFontMonofonto14().setFontAlign(-1, 0);
    for (i = 0; i < HELP_LINES.length; i++) {
      const head = i === 0 || i === 3;
      if (head && i) y += 6;
      h.setColor(head ? 3 : 2).drawString(HELP_LINES[i], 40, y);
      y += 17;
    }
    h.setColor(3).setFontAlign(0, 0).drawString('PRESS TO GO BACK', 240, 268);
  }

  // ---- The dial ---------------------------------------------------------

  function angleForPosition(index: number): number {
    return -Math.PI / 2 + index * ((2 * Math.PI) / WHEEL_POSITIONS);
  }

  // Computes the 4-point "gear tooth" polygon for one wheel position.
  function wedgeGeometry(index: number): SignalMatchWedge {
    const angleStep = (2 * Math.PI) / WHEEL_POSITIONS;
    const angle = angleForPosition(index);
    const innerHalfAngle = 0.42 * angleStep;
    const outerHalfAngle = 0.22 * angleStep;
    const innerR = 66;
    const outerR = 84;
    return {
      angle: angle,
      outerR: outerR,
      x0: CENTER_X + innerR * Math.cos(angle - innerHalfAngle),
      y0: CENTER_Y + innerR * Math.sin(angle - innerHalfAngle),
      x1: CENTER_X + innerR * Math.cos(angle + innerHalfAngle),
      y1: CENTER_Y + innerR * Math.sin(angle + innerHalfAngle),
      x2: CENTER_X + outerR * Math.cos(angle + outerHalfAngle),
      y2: CENTER_Y + outerR * Math.sin(angle + outerHalfAngle),
      x3: CENTER_X + outerR * Math.cos(angle - outerHalfAngle),
      y3: CENTER_Y + outerR * Math.sin(angle - outerHalfAngle),
    };
  }

  // Draws the small dumbbell-shaped marker at an active (numbered) position.
  function drawPositionMarker(angle: number): void {
    const dx = 5 * -Math.sin(angle);
    const dy = 5 * Math.cos(angle);
    const x1 = CENTER_X + 18 * Math.cos(angle);
    const y1 = CENTER_Y + 18 * Math.sin(angle);
    const x2 = CENTER_X + RING_INNER_RADIUS * Math.cos(angle);
    const y2 = CENTER_Y + RING_INNER_RADIUS * Math.sin(angle);
    h.setColor(1);
    h.fillPoly([
      x1 + dx,
      y1 + dy,
      x2 + dx,
      y2 + dy,
      x2 - dx,
      y2 - dy,
      x1 - dx,
      y1 - dy,
    ]);
    h.setColor(2);
    h.fillCircle(x1, y1, 5);
    h.fillCircle(x2, y2, 5);
  }

  // Redraws only the dial (labels reach radius 96 + half a digit).
  function drawWheel(): void {
    const lit = playing ? selectedValue : highlightValue;
    h.clearRect(CENTER_X - 108, CENTER_Y - 108, CENTER_X + 108, CENTER_Y + 108);
    h.setColor(1).fillCircle(CENTER_X, CENTER_Y, OUTER_RING_RADIUS);
    h.setColor(0).fillCircle(CENTER_X, CENTER_Y, RING_INNER_RADIUS);

    for (const key in positionValues) {
      drawPositionMarker(angleForPosition(Number(key)));
    }

    for (let position = 0; position < WHEEL_POSITIONS; position++) {
      const digit = positionValues[position];
      const hasDigit = digit !== undefined;
      const isHighlighted = hasDigit && lit === digit;
      const wedge = wedgeGeometry(position);

      h.setColor(hasDigit ? (isHighlighted ? 3 : 2) : 1);
      h.fillPoly([
        wedge.x0,
        wedge.y0,
        wedge.x1,
        wedge.y1,
        wedge.x2,
        wedge.y2,
        wedge.x3,
        wedge.y3,
      ]);

      if (hasDigit) {
        const labelX = CENTER_X + 96 * Math.cos(wedge.angle);
        const labelY = CENTER_Y + 96 * Math.sin(wedge.angle);
        h.setColor(isHighlighted ? 3 : 2)
          .setFontMonofonto16()
          .setFontAlign(0, 0)
          .drawString(String(digit + 1), labelX, labelY);
      }
    }

    h.setColor(1).fillCircle(CENTER_X, CENTER_Y, INNER_HOLE_RADIUS);
    h.setColor(2).drawCircle(CENTER_X, CENTER_Y, INNER_HOLE_RADIUS);
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(0, 0)
      .drawString('101', CENTER_X, CENTER_Y);
  }

  // The line between the header and the dial: what is happening now.
  function drawStatus(text: string): void {
    h.clearRect(20, 42, 460, 62)
      .setColor(3)
      .setFontMonofonto16()
      .setFontAlign(0, 0)
      .drawString(text, 240, 52);
  }

  function drawPlay(text: string): void {
    h.setBgColor(0).clear();
    header('ROUND ' + round);
    drawStatus(text);
    drawWheel();
  }

  function turnText(): string {
    return 'YOUR TURN: ' + (progress + 1) + ' OF ' + sequence.length;
  }

  // ---- Game -------------------------------------------------------------

  function playbackStep(step: number): void {
    if (step >= sequence.length) {
      playing = true;
      progress = 0;
      selectedValue = 0;
      drawStatus(turnText());
      drawWheel();
      return;
    }
    highlightValue = sequence[step];
    Pip.playSound('SCROLL');
    drawWheel();
    later(function () {
      highlightValue = -1;
      drawWheel();
      later(function () {
        playbackStep(step + 1);
      }, 180);
    }, 450);
  }

  function startRound(): void {
    round++;
    sequence.push(Math.randInt(8));
    playing = false;
    highlightValue = -1;
    drawPlay('WATCH THE PATTERN');
    later(function () {
      playbackStep(0);
    }, 600);
  }

  function startGame(): void {
    clearPendingTimer();
    scene = PLAY;
    sequence = [];
    round = 0;
    progress = 0;
    selectedValue = 0;
    highlightValue = -1;
    startRound();
  }

  // Rounds matched = rounds finished before this one. Saved if it is a record.
  function finish(): boolean {
    const matched = round - 1;
    clearPendingTimer();
    if (matched > best) {
      best = matched;
      store();
      return true;
    }
    return false;
  }

  function drawLost(): void {
    const matched = round - 1;
    scene = LOST;
    h.setBgColor(0).clear();
    header('BEST ' + best);
    const art = readArt('PERKS', ART_WHIZ);
    // Computer Whiz (125x127) on the left, x 36-160 y 60-186; the text sits
    // in its own column to the right so nothing overlaps the opaque box.
    if (art) h.drawImage(art, 36, 60);
    h.setColor(3)
      .setFontMonofonto28()
      .setFontAlign(0, 0)
      .drawString('SIGNAL LOST', 315, 82);
    h.setFontMonofonto16()
      .drawString('YOU SENT ' + (picked + 1), 315, 120)
      .drawString('THE SIGNAL WAS ' + (wanted + 1), 315, 142)
      .drawString('ROUNDS MATCHED: ' + matched, 315, 164);
    if (newBest) h.drawString('NEW BEST!', 315, 186);
    h.setColor(2).drawString('PRESS FOR THE MENU', 240, 238);
  }

  function confirmSelection(value: number): void {
    if (value === sequence[progress]) {
      Pip.playSound('TAB');
      progress++;
      if (progress === sequence.length) {
        playing = false;
        drawStatus('CORRECT!');
        drawWheel();
        later(startRound, 800);
      } else {
        drawStatus(turnText());
      }
    } else {
      playing = false;
      picked = value;
      wanted = sequence[progress];
      newBest = finish();
      Pip.playSound('SELECT');
      drawLost();
    }
  }

  function rotateSelection(delta: number): void {
    if (scene === MENU) {
      const n = menuSel + delta;
      if (n < 0 || n >= MENU_ROWS.length) return;
      menuSel = n;
      Pip.playSound('SCROLL');
      drawMenuRows();
    } else if (scene === PLAY && playing) {
      selectedValue = (selectedValue + delta + 8) % 8;
      Pip.playSound('SCROLL');
      drawWheel();
    }
  }

  function onLeftWheel(delta: KnobDirection, held: boolean | undefined): void {
    if (delta) {
      rotateSelection(delta);
    } else if (held) {
      // A hold leaves a game; what was matched so far still counts.
      if (scene === PLAY) {
        finish();
        Pip.playSound('TAB');
        drawMenu();
      }
    } else if (scene === MENU) {
      Pip.playSound('SELECT');
      if (menuSel === 0) startGame();
      else drawHelp();
    } else if (scene === HELP || scene === LOST) {
      Pip.playSound('TAB');
      drawMenu();
    } else if (playing) {
      confirmSelection(selectedValue);
    }
  }

  function onRightWheel(delta: KnobDirection): void {
    if (delta) rotateSelection(delta);
  }

  // Your record in STATS > GENERAL, now and after a full restart (see
  // STATS_HOOK.ts). Nothing to do when the hook already ran since the last
  // restart and is listed for startup; otherwise it runs at the top level
  // (new Function) so it keeps nothing of this holotape in memory.
  function runHook(): void {
    const hook = 'HOLO/SIGNAL_MATCH/STATS_HOOK.JS';
    const st = global.RM_PATCH as Record<string, string> | undefined;
    let listed = false;
    try {
      listed =
        String(fs.readFileSync('USER/RADIOMARU_BOOT.JSON')).indexOf(hook) >= 0;
    } catch (e) {
      listed = false;
    }
    if (st && st.signalmatch === 'ok' && listed) return;
    try {
      new Function(String(fs.readFileSync(hook)))();
    } catch (e) {
      // STATS just won't show the row; the game itself still works.
    }
  }

  Pip.audioStop();
  Pip.onExclusive('knob1', onLeftWheel);
  Pip.onExclusive('knob2', onRightWheel);
  h.setBgColor(0).clear();
  header('');
  // Nothing heavy while the holotape starts: the save, the art and the STATS
  // hook load just after (Cody #130 pattern).
  bootTimer = setTimeout(function () {
    bootTimer = null;
    load();
    if (scene === MENU) drawMenu();
    runHook();
  }, 0);

  return {
    id: 'signal-match',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      if (bootTimer !== null) clearTimeout(bootTimer);
      bootTimer = null;
      clearPendingTimer();
      Pip.removeListener('knob1', onLeftWheel);
      Pip.removeListener('knob2', onRightWheel);
      Pip.audioStop();
      h.clear();
    },
  };
});
