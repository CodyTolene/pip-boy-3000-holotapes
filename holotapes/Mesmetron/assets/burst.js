// MESMETRON screensaver module: "burst"
//
// Owns its own knob1 (rotate + short press) and knob2 (rotate + press)
// input while active; see web.js for the full module contract
// (init/draw/remove) and file-wrapping convention.

(function () {
  const N = 12,
    CX = 240,
    CY = 160;
  let variant = 0,
    tick = 0;
  let brightnessStep = 20,
    lastKnob = 0;
  const ang = new Float32Array(N);
  const spd = new Float32Array(N);
  const px = new Float32Array(N);
  const py = new Float32Array(N);

  function drawSpokes(h, x, y) {
    'ram';
    const dx = x - CX,
      dy = y - CY;
    h.drawLine(CX, CY, CX + dx, CY + dy);
    h.drawLine(CX, CY, CX - dx, CY + dy);
    h.drawLine(CX, CY, CX + dx, CY - dy);
    h.drawLine(CX, CY, CX - dx, CY - dy);
  }

  function setup(v) {
    variant = v;
    tick = 0;
    for (let i = 0; i < N; i++) {
      ang[i] = Math.randInt(628) / 100;
      spd[i] = ((Math.randInt(20) + 10) / 1000) * (i % 2 ? 1 : -1);
    }
  }

  function onKnob1(dir, long) {
    'ram';
    if (dir) {
      const now = getTime();
      if (now - lastKnob < 0.03) return;
      lastKnob = now;
      brightnessStep = E.clip(brightnessStep + (dir > 0 ? -1 : 1), 1, 20);
      Pip.setBrightness(brightnessStep / 20.0);
      if (Pip.playSound) Pip.playSound('HIGHLIGHT');
    }
    // dir === 0 && !long -> short press, reserved for this module. A long
    // press is handled by the launcher, which returns to the menu.
  }

  function onKnob2(dir) {
    'ram';
    if (dir) {
      variant = (variant + dir + 3) % 3;
      h.clear();
      setup(variant);
      Pip.playSound('HIGHLIGHT');
    } else {
      h.clear();
      Pip.playSound('SELECT');
    }
  }

  return {
    id: 'BURST',
    init: function (v) {
      setup(v);
      Pip.on('knob1', onKnob1);
      Pip.on('knob2', onKnob2);
    },
    draw: function (h) {
      'ram';
      h.setColor(3);
      if (tick > 0) {
        h.setColor(0);
        for (let i = 0; i < N; i++) drawSpokes(h, px[i] | 0, py[i] | 0);
        h.setColor(3);
      }

      const r = 50 + 200 * Math.abs(Math.sin(tick / (40 - variant * 6)));

      for (let i = 0; i < N; i++) {
        ang[i] += spd[i] * (1 + variant * 0.7);
        px[i] = CX + r * Math.cos(ang[i] * (1 + (i % 3) * 0.2));
        py[i] = CY + r * Math.sin(ang[i] * (1 + (i % 2) * 0.3)); // Removed the 0.7 vertical squash factor
      }

      for (let i = 0; i < N; i++) drawSpokes(h, px[i] | 0, py[i] | 0);
      tick++;
    },
    remove: function () {
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
    },
  };
});
