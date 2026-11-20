(function (): HolotapeApp {
  // Symbols: 0 seven, 1 atom, 2 bar, 3 bell, 4 cap, 5 cherry, 6 blank.
  // Every reel uses this 24-stop strip; the weights give roughly a 96%
  // return, so caps drain slowly, as a casino would like.
  const C = {
    SAVE: 'HOLO/ATOMIC_SLOTS/SAVE.JSON',
    STRIP: 'CRXLBCXRALCXBLRCXSLCBAXR',
    LETTERS: 'SABLCRX',
    BETS: [1, 2, 5, 10, 25],
    PAYS: [300, 100, 40, 20, 10, 15],
    NAMES: ['SEVEN', 'ATOM', 'BAR', 'BELL', 'CAP', 'CHERRY'],
    START: 200,
    X0: 72,
    RW: 104,
    GAP: 12,
    TOP: 46,
    ROW: 60,
    MID: 136,
    SPEED: 0.55,
    STOPS: [16, 24, 32],
  };

  const strip = new Uint8Array(C.STRIP.length);
  const pos = new Float32Array(3);
  const target = new Uint8Array(3);
  const stopped = new Uint8Array(3);

  // Shape outlines, relative to a symbol's center, built once at start.
  const atom = new Float32Array(96);
  const cap = new Float32Array(32);
  const bell = new Float32Array([
    -4, -20, 4, -20, 14, -6, 16, 8, 22, 13, -22, 13, -16, 8, -14, -6,
  ]);
  const o32 = new Float32Array(32);
  const o16 = new Float32Array(16);

  const MENU_ROWS = ['START', 'PAYOUTS', 'CONTROLS'];
  const MENU_ABOUT = [
    'TRY YOUR LUCK. THREE OF A KIND ON THE MIDDLE LINE PAYS, AND CHERRIES PAY ON THEIR OWN.',
    'WHAT EACH MIDDLE LINE PAYS, TIMES YOUR BET.',
    'HOW TO BET, SPIN AND COME BACK HERE.',
  ];
  const HELP_LINES = [
    'MENU',
    'EITHER WHEEL: CHOOSE',
    'PRESS LEFT WHEEL: OPEN',
    'THE MACHINE',
    'LEFT WHEEL UP / DOWN: BIGGER / SMALLER BET',
    'PRESS LEFT WHEEL: SPIN',
    'HOLD LEFT WHEEL: BACK TO THE MENU',
    'PAYOUTS',
    'PRESS LEFT WHEEL: BACK TO THE MENU',
    'OUT OF CAPS',
    'PRESS LEFT WHEEL: ' + C.START + ' NEW CAPS',
  ];

  let save: AtomicSlotsSave = { caps: C.START, bet: 0, best: 0 };

  // 0 idle, 1 spinning, 2 paytable, 3 broke, 4 menu, 5 controls.
  let phase = 4;
  let menuSel = 0;
  let frame = 0;
  let win = 0;
  let flash = 0;

  let tick!: number;
  // Art from the Pip-Boy's own data: a real bottle cap, and Vault Boy (Luck).
  let capArt: string | undefined;
  let luckArt: string | undefined;

  function build(): void {
    let i = 0;
    let k = 0;
    let a = 0;
    let c = 0;
    let s = 0;
    for (i = 0; i < strip.length; i++) {
      strip[i] = C.LETTERS.indexOf(C.STRIP[i]);
    }
    // Three tilted orbits of 16 points each.
    for (k = 0; k < 3; k++) {
      c = Math.cos(k * 1.0472);
      s = Math.sin(k * 1.0472);
      for (i = 0; i < 16; i++) {
        a = i * 0.3927;
        atom[k * 32 + i * 2] = 23 * Math.cos(a) * c - 8 * Math.sin(a) * s;
        atom[k * 32 + i * 2 + 1] = 23 * Math.cos(a) * s + 8 * Math.sin(a) * c;
      }
    }
    // A bottle cap's crimped edge: alternating outer and inner points.
    for (i = 0; i < 16; i++) {
      a = i * 0.3927;
      cap[i * 2] = (i & 1 ? 19 : 23) * Math.cos(a);
      cap[i * 2 + 1] = (i & 1 ? 19 : 23) * Math.sin(a);
    }
  }

  function load(): void {
    if (!fs.statSync(C.SAVE)) return;
    try {
      const s = JSON.parse(fs.readFileSync(C.SAVE)) as AtomicSlotsSave;
      if (s.caps >= 0) save.caps = s.caps;
      if (s.bet >= 0 && s.bet < C.BETS.length) save.bet = s.bet;
      if (s.best >= 0) save.best = s.best;
      // Never show a bet the wallet cannot cover.
      while (save.bet > 0 && C.BETS[save.bet] > save.caps) save.bet--;
    } catch (e) {
      // Corrupt save: start with a fresh wallet.
    }
  }

  function store(): void {
    try {
      fs.writeFileSync(C.SAVE, JSON.stringify(save));
    } catch (e) {
      // A full or locked card only loses the save; it never stops the game.
    }
  }

  // Reads one picture from the Pip-Boy's own game data (DATA/F3 or DATA/NV),
  // by the record id used in both games. Undefined if it is not there.
  function art(cat: string, id: number): string | undefined {
    const dir = 'DATA/' + (NV ? 'NV' : 'F3') + '/' + cat;
    let f: EspruinoFile | undefined;
    let r!: ArtRecord;
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

  // Copies n points from src (starting at float index off) into out,
  // shifted to (x, y).
  function place(
    src: Float32Array,
    off: number,
    n: number,
    x: number,
    y: number,
    out: Float32Array,
  ): Float32Array {
    let i = 0;
    for (i = 0; i < n; i++) {
      out[i * 2] = x + src[off + i * 2];
      out[i * 2 + 1] = y + src[off + i * 2 + 1];
    }
    return out;
  }

  function drawSym(id: number, x: number, y: number): void {
    if (id === 0) {
      h.setColor(3)
        .setFontMonofonto36()
        .setFontAlign(0, 0)
        .drawString('7', x, y + 2)
        .drawString('7', x + 1, y + 2);
    } else if (id === 1) {
      h.setColor(3)
        .drawPoly(place(atom, 0, 16, x, y, o32), true)
        .drawPoly(place(atom, 32, 16, x, y, o32), true)
        .drawPoly(place(atom, 64, 16, x, y, o32), true)
        .fillCircle(x, y, 5);
    } else if (id === 2) {
      h.setColor(3)
        .fillRect(x - 32, y - 13, x + 32, y + 13)
        .setColor(0)
        .setFontMonofonto18()
        .setFontAlign(0, 0)
        .drawString('BAR', x, y + 1);
    } else if (id === 3) {
      h.setColor(3)
        .fillPoly(place(bell, 0, 8, x, y, o16))
        .fillCircle(x, y + 17, 4)
        .fillRect(x - 2, y - 24, x + 2, y - 20);
    } else if (id === 4 && capArt) {
      h.drawImage(capArt, x - 28, y - 18, { scale: 0.5 });
    } else if (id === 4) {
      h.setColor(3)
        .fillPoly(place(cap, 0, 16, x, y, o32))
        .setColor(1)
        .fillCircle(x, y, 14)
        .setColor(3)
        .drawCircle(x, y, 8);
    } else if (id === 5) {
      h.setColor(2)
        .drawLine(x - 9, y + 2, x + 3, y - 20)
        .drawLine(x + 10, y + 4, x + 3, y - 20)
        .fillCircle(x + 8, y - 18, 4)
        .setColor(3)
        .fillCircle(x - 9, y + 10, 9)
        .fillCircle(x + 10, y + 12, 9);
    } else {
      h.setColor(1).drawLine(x - 12, y, x + 12, y);
    }
  }

  function drawReel(r: number): void {
    let k = 0;
    const x1 = C.X0 + r * (C.RW + C.GAP);
    const base = Math.floor(pos[r]);
    const frac = pos[r] - base;
    h.setClipRect(x1, C.TOP, x1 + C.RW - 1, C.TOP + C.ROW * 3 - 1).clearRect(
      x1,
      C.TOP,
      x1 + C.RW - 1,
      C.TOP + C.ROW * 3 - 1,
    );
    for (k = -2; k <= 2; k++) {
      drawSym(
        strip[(base + k + strip.length * 4) % strip.length],
        x1 + C.RW / 2,
        (C.MID - (k - frac) * C.ROW) | 0,
      );
    }
    h.setClipRect(0, 0, 479, 319);
  }

  // Outline around the middle row, drawn or erased to flash a win.
  function drawPayline(on: boolean): void {
    h.setColor(on ? 3 : 0)
      .drawRect(
        C.X0 - 2,
        C.MID - 31,
        C.X0 + 3 * C.RW + 2 * C.GAP + 1,
        C.MID + 31,
      )
      .drawRect(
        C.X0 - 3,
        C.MID - 32,
        C.X0 + 3 * C.RW + 2 * C.GAP + 2,
        C.MID + 32,
      );
  }

  // The Pip-Boy's own header layout (as Pip.renderHeader draws it): title on
  // the line, info underneath on the right, all inside the rounded corners of
  // the screen.
  function header(title: string, info: string): void {
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

  function drawCaps(): void {
    header('ATOMIC SLOTS', 'CAPS ' + save.caps);
    if (capArt) {
      // Beside the caps count, on the header's info line, kept above the
      // cabinet frame (the picture has no transparent colour).
      h.drawImage(capArt, 461 - h.stringWidth('CAPS ' + save.caps) - 34, 21, {
        scale: 0.25,
      });
    }
  }

  function drawStatus(): void {
    drawCaps();
    h.clearRect(0, 240, 479, 270)
      .setColor(3)
      .setFontMonofonto23()
      .setFontAlign(-1, 0)
      .drawString('BET ' + C.BETS[save.bet], C.X0, 258)
      .setFontAlign(1, 0)
      .setColor(2)
      .setFontMonofonto16()
      .drawString('BEST ' + save.best, 408, 258);
    if (win) {
      h.setColor(3)
        .setFontMonofonto23()
        .setFontAlign(0, 0)
        .drawString('WIN ' + win, 240, 258);
    }
  }

  function drawMachine(): void {
    let r = 0;
    h.setBgColor(0).clear();
    // Cabinet frame and payline arrows.
    h.setColor(2)
      .drawRect(
        C.X0 - 8,
        C.TOP - 6,
        C.X0 + 3 * C.RW + 2 * C.GAP + 7,
        C.TOP + 3 * C.ROW + 5,
      )
      .setColor(3)
      .fillPoly([C.X0 - 20, C.MID - 9, C.X0 - 11, C.MID, C.X0 - 20, C.MID + 9])
      .fillPoly([
        C.X0 + 3 * C.RW + 2 * C.GAP + 19,
        C.MID - 9,
        C.X0 + 3 * C.RW + 2 * C.GAP + 10,
        C.MID,
        C.X0 + 3 * C.RW + 2 * C.GAP + 19,
        C.MID + 9,
      ]);
    for (r = 0; r < 3; r++) drawReel(r);
    drawStatus();
  }

  // The menu list (native rows) and what the picked row is about, under
  // Luck's Vault Boy in the details panel.
  function drawMenuRows(): void {
    let i = 0;
    let y = 0;
    h.clearRect(20, 48, 230, 124).setFontMonofonto14();
    for (i = 0; i < MENU_ROWS.length; i++) {
      y = 50 + i * 24;
      if (i === menuSel) Pip.shadeBox(24, y, 214, y + 24);
      h.setColor(3)
        .setFontAlign(-1, 0)
        .drawString(MENU_ROWS[i], 46, y + 14);
    }
    const lines = h.wrapString(MENU_ABOUT[menuSel], 225);
    h.clearRect(240, 180, 470, 246).setColor(3).setFontAlign(-1, -1);
    for (i = 0; i < lines.length && i < 4; i++) {
      h.drawString(lines[i], 240, 182 + i * 16);
    }
  }

  function drawMenu(): void {
    phase = 4;
    h.setBgColor(0).clear();
    drawCaps();
    // Luck (121 px square) alone at the top of the panel, x 292-412
    // y 50-170; its box is opaque, so nothing else is drawn there.
    if (luckArt) h.drawImage(luckArt, 292, 50);
    drawMenuRows();
    Pip.renderBlock(24, 248, 190, 'BET', C.BETS[save.bet]);
    Pip.renderBlock(240, 248, 225, 'BIGGEST WIN', save.best);
  }

  function drawHelp(): void {
    let i = 0;
    let y = 54;
    phase = 5;
    h.setBgColor(0).clear();
    header('ATOMIC SLOTS', 'CONTROLS');
    h.setFontMonofonto14().setFontAlign(-1, 0);
    for (i = 0; i < HELP_LINES.length; i++) {
      const head = i === 0 || i === 3 || i === 7 || i === 9;
      if (head && i) y += 6;
      h.setColor(head ? 3 : 2).drawString(HELP_LINES[i], 40, y);
      y += 17;
    }
    h.setColor(3).setFontAlign(0, 0).drawString('PRESS TO GO BACK', 240, 268);
  }

  // One row of the payout list, in the Pip-Boy's own list layout.
  function drawPayRow(i: number, name: string, pays: number): void {
    const y = 50 + i * 24 + 14;
    h.setFontAlign(-1, 0)
      .drawString(name, 46, y)
      .setFontAlign(1, 0)
      .drawString(String(pays), 216, y);
  }

  function drawPays(): void {
    let i = 0;
    h.setBgColor(0).clear();
    drawCaps();
    h.setColor(3).setFontMonofonto14();
    for (i = 0; i < C.PAYS.length; i++) {
      drawPayRow(i, C.NAMES[i] + ' x3', C.PAYS[i]);
    }
    drawPayRow(6, 'ANY TWO CHERRIES', 3);
    drawPayRow(7, 'ANY ONE CHERRY', 1);
    // Details panel: the art is 121 px square, 103 px at this scale.
    if (luckArt) h.drawImage(luckArt, 301, 52, { scale: 0.85 });
    h.setColor(3)
      .setFontAlign(0, 0)
      .drawString('PAYS TIMES YOUR BET', 352, 172)
      .drawString('MIDDLE LINE ONLY', 352, 194);
  }

  // Out of caps: its own screen in the layout of the other games' results
  // (Vault Boy, big heading, two lines, the prompt), not a box over the reels.
  function drawBroke(): void {
    h.setBgColor(0).clear();
    header('ATOMIC SLOTS', 'CAPS 0');
    if (luckArt) {
      // Luck's Vault Boy, scaled so his visible part fits above the heading.
      h.drawImage(luckArt, 210, 34, { scale: 0.7 });
    }
    h.setColor(3)
      .setFontMonofonto28()
      .setFontAlign(0, 0)
      .drawString('OUT OF CAPS', 240, 142)
      .setColor(2)
      .setFontMonofonto16()
      .drawString('THE HOUSE ALWAYS WINS.', 240, 178)
      .drawString('BIGGEST WIN ' + save.best + ' CAPS', 240, 200)
      .setColor(3)
      .drawString('PRESS THE LEFT WHEEL FOR ' + C.START + ' CAPS', 240, 238);
  }

  // Pays the middle line and returns the multiplier.
  function score(): number {
    const a = strip[target[0]];
    const b = strip[target[1]];
    const c = strip[target[2]];
    let cherries = 0;
    if (a === b && b === c && a < 6) return C.PAYS[a];
    if (a === 5) cherries++;
    if (b === 5) cherries++;
    if (c === 5) cherries++;
    if (cherries === 2) return 3;
    if (cherries === 1) return 1;
    return 0;
  }

  function finish(): void {
    win = score() * C.BETS[save.bet];
    save.caps += win;
    if (win > save.best) save.best = win;
    // The bet shown is the bet the next spin takes: lower it now if the
    // wallet can no longer cover it (spin() would quietly do it later).
    while (save.bet > 0 && C.BETS[save.bet] > save.caps) save.bet--;
    phase = 0;
    store();
    drawStatus();
    if (win) {
      flash = 8;
      Pip.playSound('SELECT');
    } else if (save.caps <= 0) {
      phase = 3;
      drawBroke();
    }
  }

  function spin(): void {
    let r = 0;
    // Bet what the wallet allows.
    while (save.bet > 0 && C.BETS[save.bet] > save.caps) save.bet--;
    save.caps -= C.BETS[save.bet];
    win = 0;
    flash = 0;
    drawPayline(false);
    for (r = 0; r < 3; r++) {
      target[r] = Math.randInt(strip.length);
      stopped[r] = 0;
    }
    frame = 0;
    phase = 1;
    Pip.playSound('TAB');
    drawStatus();
  }

  function onFrame(): void {
    'ram';
    let r = 0;
    if (flash) {
      flash--;
      drawPayline((flash & 1) === 0);
    }
    if (phase !== 1) return;
    frame++;
    for (r = 0; r < 3; r++) {
      if (stopped[r]) continue;
      if (frame >= C.STOPS[r]) {
        pos[r] = target[r];
        stopped[r] = 1;
        Pip.playSound('SCROLL');
      } else {
        pos[r] = (pos[r] + C.SPEED) % strip.length;
      }
      drawReel(r);
    }
    if (stopped[2]) finish();
  }

  // The menu is one up-and-down list, so either wheel moves through it.
  function menuMove(dir: number): void {
    const n = menuSel + dir;
    if (n < 0 || n >= MENU_ROWS.length) return;
    menuSel = n;
    Pip.playSound('SCROLL');
    drawMenuRows();
  }

  function onKnob1(dir: KnobDirection, long?: boolean): void {
    if (phase === 1) return;
    if (phase === 4) {
      if (dir) {
        menuMove(dir);
        return;
      }
      Pip.playSound('SELECT');
      if (menuSel === 1) {
        phase = 2;
        drawPays();
      } else if (menuSel === 2) {
        drawHelp();
      } else if (save.caps <= 0) {
        phase = 3;
        drawBroke();
      } else {
        phase = 0;
        drawMachine();
      }
      return;
    }
    if (phase === 2 || phase === 5) {
      if (dir) return;
      Pip.playSound('TAB');
      drawMenu();
      return;
    }
    if (phase === 3) {
      if (dir) return;
      save.caps = C.START;
      save.bet = 0;
      store();
      phase = 0;
      Pip.playSound('TAB');
      drawMachine();
      return;
    }
    if (dir) {
      // Up (dir -1) makes the bet bigger.
      const old = save.bet;
      save.bet = E.clip(save.bet - dir, 0, C.BETS.length - 1);
      while (save.bet > 0 && C.BETS[save.bet] > save.caps) save.bet--;
      if (save.bet === old) return;
      Pip.playSound('SCROLL');
      drawStatus();
      return;
    }
    if (long) {
      flash = 0;
      Pip.playSound('TAB');
      drawMenu();
      return;
    }
    spin();
  }

  // The right wheel only moves through the menu; on the machine it is
  // claimed but unused so it cannot scroll the OS.
  function onKnob2(dir: KnobDirection): void {
    if (phase === 4 && dir) menuMove(dir);
  }

  // Deferred startup (see below).
  let bootTimer: number | undefined;

  // Init.
  build();
  load();
  pos[0] = 0;
  pos[1] = 9;
  pos[2] = 17;
  // The menu opens first; its art comes with the deferred startup below.
  drawMenu();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  tick = setInterval(onFrame, 50);

  // Art and the STATS hook load just after this function returns, once the
  // Pip-Boy has freed the ITEMS > MISC list: loading them during startup
  // can run it out of memory.
  // Your record in STATS > GENERAL, now and after a full restart (see
  // STATS_HOOK.ts). Nothing to do when the hook is already running and
  // listed for startup; otherwise it runs at the top level (new Function) so
  // it keeps nothing of this holotape in memory once it is closed.
  bootTimer = setTimeout(function (): void {
    bootTimer = undefined;
    // Same record ids in Fallout 3 and New Vegas: Bottle Cap, and Luck.
    capArt = art('MISC', 0xf);
    luckArt = art('SPECIAL', 0x3ee);
    if (phase === 4) drawMenu();
    if (phase === 0) drawMachine();
    if (phase === 3) drawBroke();
    const hook = 'HOLO/ATOMIC_SLOTS/STATS_HOOK.JS';
    const st = global.RM_PATCH as Record<string, string> | undefined;
    let listed = false;
    try {
      listed =
        String(fs.readFileSync('USER/RADIOMARU_BOOT.JSON')).indexOf(hook) >= 0;
    } catch (e) {
      listed = false;
    }
    if (st && st.slots === 'ok' && listed) return;
    try {
      new Function(String(fs.readFileSync(hook)))();
    } catch (e) {
      // STATS just won't show the row; the game itself still works.
    }
  }, 0);

  return {
    id: 'ATOMICSLOTS',
    notDefault: true,
    fullscreen: true,
    remove: function (): void {
      if (bootTimer) clearTimeout(bootTimer);
      clearInterval(tick);
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      h.setClipRect(0, 0, 479, 319);
      h.clear();
    },
  };
});
