(function (): HolotapeApp {
  // Layout and tuning. Surface mode is a bullseye for the Pip-Boy lying flat;
  // edge mode is a single vial for the Pip-Boy standing on its long edge.
  const C = {
    CAL: 'HOLO/BUBBLE_LEVEL/CAL.JSON',
    RANGES: [1, 2, 5, 10, 20, 45],
    CX: 150,
    CY: 167,
    R: 115,
    BR: 13,
    VX1: 30,
    VX2: 270,
    VY1: 145,
    VY2: 189,
    VW: 20,
    PX: 312,
    VALX: 462,
    ALPHA: 0.25,
    LEVEL_IN: 0.3,
    LEVEL_OUT: 0.5,
    RAD: 57.29578,
  };

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

  // 0 = surface (bullseye), 1 = edge (vial).
  let mode = 0;
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
    fs.writeFileSync(C.CAL, JSON.stringify(cal));
  }

  // Formats an angle as "+1.2" with the sign always shown.
  function fmt(a: number): string {
    return (a < 0 ? '-' : '+') + Math.abs(a).toFixed(1);
  }

  function drawGauge(): void {
    let i = 0;
    let x = 0;
    if (mode === 0) {
      h.setColor(1)
        .drawLine(C.CX - C.R, C.CY, C.CX + C.R, C.CY)
        .drawLine(C.CX, C.CY - C.R, C.CX, C.CY + C.R)
        .setColor(2)
        .drawCircle(C.CX, C.CY, C.R)
        .drawCircle(C.CX, C.CY, C.R - 1)
        .drawCircle(C.CX, C.CY, 77)
        .drawCircle(C.CX, C.CY, 40)
        .setColor(3)
        .drawCircle(C.CX, C.CY, C.BR + 3);
    } else {
      h.setColor(2)
        .drawRect(C.VX1, C.VY1, C.VX2, C.VY2)
        .drawRect(C.VX1 + 1, C.VY1 + 1, C.VX2 - 1, C.VY2 - 1);
      // Scale ticks at fifths of the full range, either side of center.
      for (i = 1; i < 5; i++) {
        x = (((C.VX2 - C.VX1) / 2 - C.VW - 4) * i) / 5;
        h.setColor(1)
          .drawLine(
            C.CX - C.VW - 2 - x,
            C.VY1 + 3,
            C.CX - C.VW - 2 - x,
            C.VY1 + 8,
          )
          .drawLine(
            C.CX + C.VW + 2 + x,
            C.VY1 + 3,
            C.CX + C.VW + 2 + x,
            C.VY1 + 8,
          )
          .drawLine(
            C.CX - C.VW - 2 - x,
            C.VY2 - 8,
            C.CX - C.VW - 2 - x,
            C.VY2 - 3,
          )
          .drawLine(
            C.CX + C.VW + 2 + x,
            C.VY2 - 8,
            C.CX + C.VW + 2 + x,
            C.VY2 - 3,
          );
      }
      h.setColor(3)
        .drawLine(C.CX - C.VW - 3, C.VY1 + 2, C.CX - C.VW - 3, C.VY2 - 2)
        .drawLine(C.CX + C.VW + 3, C.VY1 + 2, C.CX + C.VW + 3, C.VY2 - 2);
    }
  }

  function drawBubble(): void {
    if (mode === 0) {
      h.setColor(3)
        .fillCircle(bx, by, C.BR)
        .setColor(level ? 3 : 1)
        .fillCircle(bx - 4, by - 4, 4);
    } else {
      h.setColor(3)
        .fillEllipse(bx - C.VW, C.VY1 + 6, bx + C.VW, C.VY2 - 6)
        .setColor(level ? 3 : 1)
        .fillEllipse(bx - 10, C.VY1 + 10, bx + 2, C.VY1 + 16);
    }
  }

  function eraseBubble(): void {
    if (bx < 0) return;
    h.setColor(0);
    if (mode === 0) h.fillCircle(bx, by, C.BR + 1);
    else h.fillRect(bx - C.VW - 1, C.VY1 + 2, bx + C.VW + 1, C.VY2 - 2);
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
    h.clearRect(C.PX, 198, 479, 216)
      .setColor(2)
      .setFontMonofonto16()
      .setFontAlign(-1, -1)
      .drawString('RANGE +/-' + C.RANGES[cal.r], C.PX, 200);
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

  function drawScreen(): void {
    h.setBgColor(0).clear();
    header('BUBBLE LEVEL', mode === 0 ? 'SURFACE' : 'EDGE');
    h.setColor(2)
      .drawLine(C.PX - 10, 36, C.PX - 10, 316)
      .setFontMonofonto16()
      .setFontAlign(-1, -1)
      .drawString(mode === 0 ? 'X TILT' : 'ANGLE', C.PX, 40);
    if (mode === 0) h.drawString('Y TILT', C.PX, 100);
    else
      h.setFontAlign(0, -1).drawString(
        'STAND PIP-BOY\nON ITS EDGE',
        C.CX,
        C.VY2 + 24,
      );
    h.setColor(2)
      .setFontAlign(-1, -1)
      .setFontMonofonto14()
      .drawString(
        'L TURN   RANGE\nL PRESS  FREEZE\nL HOLD   ZERO\nR TURN   MODE',
        C.PX,
        232,
      );
    if (!Pip.accel) {
      h.setColor(3)
        .setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString('NO ACCELEROMETER\nON THIS PIP-BOY', C.CX, C.CY);
    }
    drawGauge();
    drawRange();
    bx = -1;
    lastX = '';
    lastY = '';
    lastStatus = '';
  }

  function setFlash(text: string): void {
    flash = text;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(function (): void {
      flashTimer = undefined;
      flash = '';
    }, 1200);
  }

  function onFrame(): void {
    'ram';
    let nx = 0;
    let ny = 0;
    let m = 0;
    let s = '';
    const span = C.RANGES[cal.r];

    if (!Pip.accel) return;

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
      if (!level && m < C.LEVEL_IN) {
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
      nx = (C.CX + nx * (C.R - C.BR - 3)) | 0;
      ny = (C.CY + ny * (C.R - C.BR - 3)) | 0;
    } else {
      nx =
        (C.CX + E.clip(angX / span, -1, 1) * ((C.VX2 - C.VX1) / 2 - C.VW - 4)) |
        0;
      ny = C.CY;
    }

    if (nx !== bx || ny !== by) {
      eraseBubble();
      drawGauge();
      bx = nx;
      by = ny;
      drawBubble();
    }

    s = fmt(angX);
    if (s !== lastX) {
      lastX = s;
      drawValue(s, 56);
    }
    if (mode === 0) {
      s = fmt(angY);
      if (s !== lastY) {
        lastY = s;
        drawValue(s, 116);
      }
    }

    s = flash || (frozen ? 'HOLD' : level ? 'LEVEL' : 'TILTED');
    if (s !== lastStatus) {
      lastStatus = s;
      drawStatus(s);
    }
  }

  function onKnob1(dir: KnobDirection, long?: boolean): void {
    if (dir) {
      cal.r = E.clip(cal.r + dir, 0, C.RANGES.length - 1);
      Pip.playSound('SCROLL');
      saveCal();
      drawRange();
      return;
    }
    if (!long) {
      frozen = !frozen;
      Pip.playSound('SELECT');
      return;
    }
    // Zeroing reads the live angle, so it also releases a freeze.
    frozen = false;
    cal.z[mode * 2] = rawX;
    cal.z[mode * 2 + 1] = rawY;
    level = false;
    Pip.playSound('TAB');
    setFlash('ZEROED');
    saveCal();
  }

  function onKnob2(dir: KnobDirection): void {
    if (!dir) return;
    mode = mode ? 0 : 1;
    level = false;
    Pip.playSound('TAB');
    drawScreen();
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
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      h.clear();
    },
  };
});
