(function (): HolotapeApp {
  // Layout and tuning. Surface mode is a round "bullseye" vial for the
  // Pip-Boy lying flat; edge mode is a tube vial, like the one in a real
  // spirit level, for the Pip-Boy standing on its long edge.
  const C = {
    CAL: 'HOLO/BUBBLE_LEVEL/CAL.JSON',
    RANGES: [1, 2, 5, 10, 20, 45],
    // Round vial: centre, glass radius, liquid radius, bubble radius.
    CX: 150,
    CY: 168,
    R: 112,
    LR: 106,
    BR: 15,
    // Tube vial: the glass, the liquid inside its two clear end caps, and
    // the bubble's half length.
    VX1: 18,
    VX2: 282,
    VY1: 128,
    VY2: 206,
    LX1: 34,
    LX2: 266,
    LY1: 132,
    LY2: 202,
    VW: 34,
    PX: 312,
    VALX: 462,
    ALPHA: 0.25,
    LEVEL_IN: 0.3,
    LEVEL_OUT: 0.5,
    RAD: 57.29578,
  };
  const TABS = ['SURFACE', 'EDGE', 'CONTROLS'];
  const HELP_LINES = [
    'SURFACE AND EDGE',
    'LEFT WHEEL UP / DOWN: WIDER / NARROWER RANGE',
    'PRESS LEFT WHEEL: FREEZE / RELEASE THE READING',
    'HOLD LEFT WHEEL: ZERO THE LEVEL WHERE IT SITS',
    'RIGHT WHEEL: SURFACE, EDGE OR CONTROLS',
    'CONTROLS',
    'RIGHT WHEEL OR A PRESS: BACK TO THE LEVEL',
  ];

  // Filtered accelerometer reading.
  let fx = 0;
  let fy = 0;
  let fz = 0;
  let primed = false;

  // Calibrated angles in degrees, and the raw ones used for zeroing.
  let rawX = 0;
  let rawY = 0;
  let angX = 0;
  let angY = 0;

  // 0 = surface (round vial), 1 = edge (tube vial), 2 = controls page.
  let mode = 0;
  // The level shown before the controls page, to go back to.
  let lastMode = 0;
  let cal: BubbleLevelCal = { z: [0, 0, 0, 0], r: 3 };
  let frozen = false;
  let level = false;
  let flash = '';

  // Last drawn state, so each frame only repaints what changed.
  let bx = -1;
  let by = -1;
  let lastX = '';
  let lastY = '';
  let lastStatus = '';

  let tick!: number;
  let flashTimer: number | undefined;
  let zeroTimer: number | undefined;
  let saveTimer: number | undefined;

  function loadCal(): void {
    if (!fs.statSync(C.CAL)) return;
    try {
      const saved = JSON.parse(fs.readFileSync(C.CAL)) as BubbleLevelCal;
      if (saved.z && saved.z.length === 4) cal.z = saved.z;
      if (saved.r >= 0 && saved.r < C.RANGES.length) cal.r = saved.r;
    } catch (e) {
      // A corrupt file just means starting uncalibrated.
    }
  }

  function saveCal(): void {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = undefined;
    try {
      fs.writeFileSync(C.CAL, JSON.stringify(cal));
    } catch (e) {
      // Not being able to save only loses the setting for next time.
    }
  }

  // Turning through the ranges saves once the wheel stops, not on every click.
  function saveSoon(): void {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function (): void {
      // This timer has fired: forget its id before saveCal() would clear it
      // (the Pip-Boy reuses timer ids, so that could stop another timer).
      saveTimer = undefined;
      saveCal();
    }, 1000);
  }

  // Formats an angle as "+1.2" with the sign always shown. Rounds first so
  // a hair under zero reads +0.0 rather than flickering to -0.0.
  function fmt(a: number): string {
    const r = Math.round(a * 10) / 10;
    return (r < 0 ? '-' : '+') + Math.abs(r).toFixed(1);
  }

  // The glass of the vial, drawn once per screen; the liquid, the bubble and
  // the rings printed on the glass are redrawn whenever the bubble moves.
  function drawGlass(): void {
    if (mode === 0) {
      h.setColor(3)
        .drawCircle(C.CX, C.CY, C.R)
        .setColor(2)
        .drawCircle(C.CX, C.CY, C.R - 1)
        .setColor(1)
        .drawCircle(C.CX, C.CY, C.R - 3);
      return;
    }
    // A tube with bevelled ends and a clear glass cap at each end.
    h.setColor(3)
      .drawPoly(
        [
          C.VX1 + 4,
          C.VY1,
          C.VX2 - 4,
          C.VY1,
          C.VX2,
          C.VY1 + 4,
          C.VX2,
          C.VY2 - 4,
          C.VX2 - 4,
          C.VY2,
          C.VX1 + 4,
          C.VY2,
          C.VX1,
          C.VY2 - 4,
          C.VX1,
          C.VY1 + 4,
        ],
        true,
      )
      .setColor(2)
      .drawLine(C.LX1 - 1, C.VY1 + 1, C.LX1 - 1, C.VY2 - 1)
      .drawLine(C.LX2 + 1, C.VY1 + 1, C.LX2 + 1, C.VY2 - 1)
      .setColor(1)
      .drawLine(C.VX1 + 5, C.VY1 + 2, C.LX1 - 4, C.VY1 + 2)
      .drawLine(C.LX2 + 4, C.VY1 + 2, C.VX2 - 5, C.VY1 + 2)
      .drawLine(C.VX1 + 4, C.VY1 + 8, C.VX1 + 4, C.VY2 - 8)
      .drawLine(C.LX2 + 5, C.VY1 + 8, C.LX2 + 5, C.VY2 - 8);
  }

  // The round vial seen from above: liquid a little darker towards the rim,
  // a glint of light on the glass, the bubble, and two rings. The bubble
  // fits the inner ring exactly when the surface is level.
  function drawRound(): void {
    h.setColor(1)
      .fillCircle(C.CX, C.CY, C.LR)
      .setColor(2)
      .fillCircle(C.CX - 3, C.CY - 3, C.LR - 6)
      .setColor(3)
      .fillCircle(C.CX - 44, C.CY - 44, 28)
      .setColor(2)
      .fillCircle(C.CX - 40, C.CY - 40, 28);
    h.setColor(3)
      .fillCircle(bx, by, C.BR)
      .setColor(2)
      .fillCircle(bx + 2, by + 3, C.BR - 4)
      .setColor(3)
      .fillCircle(bx, by + 1, C.BR - 4)
      .setColor(1)
      .drawCircle(bx, by, C.BR);
    h.setColor(0)
      .drawCircle(C.CX, C.CY, C.BR + 4)
      .drawCircle(C.CX, C.CY, C.BR + 5)
      .drawCircle(C.CX, C.CY, 60)
      .drawCircle(C.CX, C.CY, 61);
  }

  // The tube seen from the side: liquid with a bright reflection along the
  // top and shade along the bottom, the bubble floating near the top, and
  // two pairs of rings on the glass. The bubble sits between the inner rings
  // when the edge is level.
  function drawTube(): void {
    let i = 0;
    let x = 0;
    const y1 = C.LY1 + 6;
    const y2 = C.LY1 + 40;
    h.setColor(2)
      .fillRect(C.LX1, C.LY1, C.LX2, C.LY2)
      .setColor(3)
      .fillRect(C.LX1, C.LY1 + 3, C.LX2, C.LY1 + 4)
      .setColor(1)
      .fillRect(C.LX1, C.LY2 - 6, C.LX2, C.LY2);
    h.setColor(3)
      .fillEllipse(bx - C.VW, y1, bx + C.VW, y2)
      .setColor(2)
      .fillEllipse(bx - C.VW + 8, y1 + 10, bx + C.VW - 8, y2 - 3)
      .setColor(3)
      .fillEllipse(bx - C.VW + 8, y1 + 5, bx + C.VW - 8, y2 - 7)
      .setColor(1)
      .drawEllipse(bx - C.VW, y1, bx + C.VW, y2);
    h.setColor(0);
    for (i = 0; i < 4; i++) {
      x = C.CX + (i & 1 ? 1 : -1) * (C.VW + (i < 2 ? 4 : 12));
      h.fillRect(x - 1, C.VY1 + 1, x, C.VY2 - 1);
    }
  }

  // Draws a right-aligned readout with a hand-drawn degree mark, since the
  // device fonts may not carry the degree glyph.
  function drawValue(text: string, y: number): void {
    h.clearRect(C.PX, y, 479, y + 38)
      .setColor(3)
      .setFontMonofonto36()
      .setFontAlign(1, -1)
      .drawString(text, C.VALX - 8, y)
      .drawCircle(C.VALX - 3, y + 6, 3);
  }

  function drawStatus(text: string): void {
    const on = text === 'LEVEL';
    h.setColor(on ? 3 : 0)
      .fillRect(C.PX, 162, 470, 192)
      .setColor(on ? 0 : 2)
      .drawRect(C.PX, 162, 470, 192)
      .setColor(on ? 0 : 3)
      .setFontMonofonto23()
      .setFontAlign(0, 0)
      .drawString(text, (C.PX + 470) / 2, 178);
  }

  function drawRange(): void {
    h.clearRect(C.PX - 2, 204, 479, 228);
    Pip.renderBlock(C.PX - 2, 204, 158, 'RANGE', '+/-' + C.RANGES[cal.r]);
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

  // SURFACE, EDGE and CONTROLS under the title, like the Pip-Boy's own
  // sub-tabs: the one shown is bright, the others dim.
  function drawTabs(): void {
    let i = 0;
    let x = 461;
    h.setFontMonofonto14().setFontAlign(1, 0);
    for (i = TABS.length - 1; i >= 0; i--) {
      h.setColor(i === mode ? 3 : 1).drawString(TABS[i], x, 32);
      x -= h.stringWidth(TABS[i]) + 16;
    }
  }

  function drawScreen(): void {
    let i = 0;
    let y = 54;
    h.setBgColor(0).clear();
    header('BUBBLE LEVEL', '');
    drawTabs();
    bx = -1;
    lastX = '';
    lastY = '';
    lastStatus = '';
    if (mode === 2) {
      h.setFontMonofonto14().setFontAlign(-1, 0);
      for (i = 0; i < HELP_LINES.length; i++) {
        const head = i === 0 || i === 5;
        if (head && i) y += 6;
        h.setColor(head ? 3 : 2).drawString(HELP_LINES[i], 40, y);
        y += 17;
      }
      h.setColor(3).setFontAlign(0, 0).drawString('PRESS TO GO BACK', 240, 268);
      return;
    }
    h.setColor(2)
      .drawLine(C.PX - 10, 44, C.PX - 10, 290)
      .setFontMonofonto16()
      .setFontAlign(-1, -1)
      .drawString(mode === 0 ? 'X TILT' : 'ANGLE', C.PX, 42);
    if (mode === 0) h.drawString('Y TILT', C.PX, 100);
    else
      h.setFontAlign(0, -1).drawString(
        'STAND PIP-BOY\nON ITS EDGE',
        C.CX,
        C.VY2 + 24,
      );
    if (!Pip.accel) {
      h.setColor(3)
        .setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString('NO ACCELEROMETER\nON THIS PIP-BOY', C.CX, C.CY);
    } else drawGlass();
    drawRange();
  }

  function setFlash(text: string, ms: number): void {
    flash = text;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(function (): void {
      flashTimer = undefined;
      flash = '';
    }, ms);
  }

  function cancelZero(): void {
    if (!zeroTimer) return;
    clearTimeout(zeroTimer);
    zeroTimer = undefined;
    setFlash('', 1);
  }

  function onFrame(): void {
    'ram';
    let nx = 0;
    let ny = 0;
    let m = 0;
    let s = '';
    const span = C.RANGES[cal.r];

    if (!Pip.accel || mode === 2) return;

    if (!frozen) {
      const a = Pip.accel.read();
      if (!primed) {
        fx = a[0];
        fy = a[1];
        fz = a[2];
        primed = true;
      } else {
        fx += (a[0] - fx) * C.ALPHA;
        fy += (a[1] - fy) * C.ALPHA;
        fz += (a[2] - fz) * C.ALPHA;
      }
      rawX = Math.atan2(fx, Math.sqrt(fy * fy + fz * fz)) * C.RAD;
      rawY = Math.atan2(fy, Math.sqrt(fx * fx + fz * fz)) * C.RAD;
      angX = rawX - cal.z[mode * 2];
      angY = rawY - cal.z[mode * 2 + 1];

      m = Math.abs(angX);
      if (mode === 0 && Math.abs(angY) > m) m = Math.abs(angY);
      if (!level && !zeroTimer && m < C.LEVEL_IN) {
        level = true;
        Pip.playSound('SELECT');
      } else if (level && m > C.LEVEL_OUT) {
        level = false;
      }
    }

    // The bubble floats to the high side, opposite to where a ball would roll.
    if (mode === 0) {
      nx = angX / span;
      ny = -angY / span;
      m = Math.sqrt(nx * nx + ny * ny);
      if (m > 1) {
        nx /= m;
        ny /= m;
      }
      nx = (C.CX + nx * (C.LR - C.BR - 8)) | 0;
      ny = (C.CY + ny * (C.LR - C.BR - 8)) | 0;
    } else {
      nx =
        (C.CX + E.clip(angX / span, -1, 1) * ((C.LX2 - C.LX1) / 2 - C.VW - 2)) |
        0;
      ny = C.CY;
    }

    if (nx !== bx || ny !== by) {
      bx = nx;
      by = ny;
      if (mode === 0) drawRound();
      else drawTube();
    }

    s = fmt(angX);
    if (s !== lastX) {
      lastX = s;
      drawValue(s, 58);
    }
    if (mode === 0) {
      s = fmt(angY);
      if (s !== lastY) {
        lastY = s;
        drawValue(s, 118);
      }
    }

    s = flash || (frozen ? 'HOLD' : level ? 'LEVEL' : 'TILTED');
    if (s !== lastStatus) {
      lastStatus = s;
      drawStatus(s);
    }
  }

  function onKnob1(dir: KnobDirection, long?: boolean): void {
    // On the controls page any press goes back to the level.
    if (mode === 2) {
      if (!dir) showMode(lastMode);
      return;
    }
    if (dir) {
      // Up on the wheel (dir -1) widens the range.
      const r = E.clip(cal.r - dir, 0, C.RANGES.length - 1);
      if (r === cal.r) return;
      cal.r = r;
      Pip.playSound('SCROLL');
      saveSoon();
      drawRange();
      return;
    }
    if (!long) {
      if (zeroTimer) return;
      frozen = !frozen;
      Pip.playSound('SELECT');
      return;
    }
    // Zeroing needs the live angle, so it releases a freeze and restarts the
    // filter from a fresh reading. It waits half a second so the bump of
    // holding the wheel has settled before the angle is taken.
    if (zeroTimer) return;
    frozen = false;
    primed = false;
    level = false;
    setFlash('ZEROING', 2000);
    zeroTimer = setTimeout(function (): void {
      zeroTimer = undefined;
      cal.z[mode * 2] = rawX;
      cal.z[mode * 2 + 1] = rawY;
      level = false;
      Pip.playSound('TAB');
      setFlash('ZEROED', 1200);
      saveCal();
    }, 500);
  }

  function showMode(m: number): void {
    cancelZero();
    if (m < 2) lastMode = m;
    mode = m;
    // A held reading belongs to the other mode, so switching releases it.
    frozen = false;
    level = false;
    Pip.playSound('TAB');
    drawScreen();
  }

  // The right wheel moves along the tabs: SURFACE, EDGE, CONTROLS.
  function onKnob2(dir: KnobDirection): void {
    if (!dir) return;
    const m = E.clip(mode + dir, 0, TABS.length - 1);
    if (m !== mode) showMode(m);
  }

  // Init.
  loadCal();
  drawScreen();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  tick = setInterval(onFrame, 40);

  return {
    id: 'BUBBLELEVEL',
    notDefault: true,
    fullscreen: true,
    remove: function (): void {
      clearInterval(tick);
      if (flashTimer) clearTimeout(flashTimer);
      if (zeroTimer) clearTimeout(zeroTimer);
      if (saveTimer) saveCal();
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      h.clear();
    },
  };
});
