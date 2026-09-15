// MESMETRON screensaver module: "vortex"
// Concentric rotating rings, pseudo-3D tunnel-flythrough effect.
//
// Owns its own knob1 (rotate + short press) and knob2 (rotate + press)
// input while active; see web.js for the full module contract
// (init/draw/remove) and file-wrapping convention.
//
// NOTE: this mode has a known erase/redraw mismatch (recomputes the previous
// frame's ring geometry from tick-1, which doesn't exactly cancel what was
// drawn). This was found and understood, but is being left in deliberately:
// the leftover trails it produces are a desired visual effect, not a bug to
// fix. Do not "fix" it.

(function () {
  const CX = 240,
    CY = 160;
  let variant = 0,
    tick = 0;
  let brightnessStep = 20,
    lastKnob = 0;

  function setup(v) {
    variant = v;
    tick = 0;
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
    id: 'VORTEX',
    init: function (v) {
      setup(v);
      Pip.on('knob1', onKnob1);
      Pip.on('knob2', onKnob2);
    },
    draw: function (h) {
      'ram';
      h.setColor(3);
      // Adjusted to produce 3, 4, and 5 sided shapes based on variant (0, 1, 2)
      const sides = 3 + variant;
      const rot = tick / 45;
      if (tick > 0) {
        h.setColor(0);
        for (let r = 30; r < 340; r += 55) {
          const rr = r + 22 * Math.sin((tick - 1) / 18 + r);
          const pr = (tick - 1) / 30 + r * 0.01;
          for (let i = 0; i < sides; i++) {
            const a0 = pr + (i * 6.283) / sides,
              a1 = pr + ((i + 1) * 6.283) / sides;
            h.drawLine(
              (CX + rr * Math.cos(a0)) | 0,
              (CY + rr * 0.75 * Math.sin(a0)) | 0,
              (CX + rr * Math.cos(a1)) | 0,
              (CY + rr * 0.75 * Math.sin(a1)) | 0,
            );
          }
        }
        h.setColor(3);
      }
      for (let r = 30; r < 340; r += 55) {
        const rr = r + 22 * Math.sin(tick / 18 + r);
        const pr = rot + r * 0.01;
        for (let i = 0; i < sides; i++) {
          const a0 = pr + (i * 6.283) / sides,
            a1 = pr + ((i + 1) * 6.283) / sides;
          h.drawLine(
            (CX + rr * Math.cos(a0)) | 0,
            (CY + rr * 0.75 * Math.sin(a0)) | 0,
            (CX + rr * Math.cos(a1)) | 0,
            (CY + rr * 0.75 * Math.sin(a1)) | 0,
          );
        }
      }
      tick++;
    },
    remove: function () {
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
    },
  };
});
