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

  let save: AtomicSlotsSave = { caps: C.START, bet: 0, best: 0 };

  // 0 idle, 1 spinning, 2 paytable, 3 broke.
  let phase = 0;
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
    } catch (e) {
      // Corrupt save: start with a fresh wallet.
    }
  }

  function store(): void {
    fs.writeFileSync(C.SAVE, JSON.stringify(save));
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

  function drawStatus(): void {
    header('ATOMIC SLOTS', 'CAPS ' + save.caps);
    if (capArt) {
      // Beside the caps count, on the header's info line.
      h.drawImage(capArt, 461 - h.stringWidth('CAPS ' + save.caps) - 40, 22, {
        scale: 0.3,
      });
    }
    h.clearRect(0, 240, 479, 276)
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
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, -1)
      .drawString('L TURN: BET    L PRESS: SPIN    L HOLD: PAYOUTS', 240, 290);
  }

  function drawPays(): void {
    let i = 0;
    h.setBgColor(0).clear();
    drawStatus();
    h.clearRect(0, 240, 479, 276)
      .setColor(3)
      .setFontMonofonto18()
      .setFontAlign(0, -1)
      .drawString('PAYOUTS (TIMES YOUR BET, MIDDLE LINE)', 240, 44);
    for (i = 0; i < C.PAYS.length; i++) {
      h.setColor(3)
        .setFontMonofonto16()
        .setFontAlign(-1, -1)
        .drawString(C.NAMES[i] + ' x3', 120, 76 + i * 26)
        .setFontAlign(1, -1)
        .drawString(String(C.PAYS[i]), 360, 76 + i * 26);
    }
    h.setFontAlign(-1, -1)
      .drawString('ANY TWO CHERRIES', 120, 76 + 6 * 26)
      .drawString('ANY ONE CHERRY', 120, 76 + 7 * 26)
      .setFontAlign(1, -1)
      .drawString('3', 360, 76 + 6 * 26)
      .drawString('1', 360, 76 + 7 * 26)
      .setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, -1)
      .drawString('PRESS LEFT WHEEL TO RETURN', 240, 292);
    if (luckArt) h.drawImage(luckArt, 372, 96, { scale: 0.85 });
  }

  function drawBroke(): void {
    h.setColor(0)
      .fillRect(110, 96, 370, 176)
      .setColor(3)
      .drawRect(110, 96, 370, 176)
      .drawRect(112, 98, 368, 174)
      .setFontMonofonto23()
      .setFontAlign(0, 0)
      .drawString('OUT OF CAPS', 240, 122)
      .setColor(2)
      .setFontMonofonto14()
      .drawString('THE HOUSE ALWAYS WINS.', 240, 146)
      .drawString('PRESS FOR ' + C.START + ' MORE CAPS', 240, 162);
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

  function onKnob1(dir: KnobDirection, long?: boolean): void {
    if (phase === 1) return;
    if (phase === 2) {
      if (dir) return;
      phase = 0;
      Pip.playSound('TAB');
      drawMachine();
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
      save.bet = E.clip(save.bet + dir, 0, C.BETS.length - 1);
      while (save.bet > 0 && C.BETS[save.bet] > save.caps) save.bet--;
      Pip.playSound('SCROLL');
      drawStatus();
      return;
    }
    if (long) {
      phase = 2;
      flash = 0;
      Pip.playSound('TAB');
      drawPays();
      return;
    }
    spin();
  }

  // The right wheel is claimed but unused so it cannot scroll the OS.
  function onKnob2(): void {
    // Intentionally empty.
  }

  // Init.
  build();
  load();
  // Same record ids in Fallout 3 and New Vegas: Bottle Cap, and Luck.
  capArt = art('MISC', 0xf);
  luckArt = art('SPECIAL', 0x3ee);
  pos[0] = 0;
  pos[1] = 9;
  pos[2] = 17;
  drawMachine();
  if (save.caps <= 0) {
    phase = 3;
    drawBroke();
  }
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  tick = setInterval(onFrame, 50);

  return {
    id: 'atomic-slots',
    notDefault: true,
    fullscreen: true,
    remove: function (): void {
      clearInterval(tick);
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      h.setClipRect(0, 0, 479, 319);
      h.clear();
    },
  };
});
