// MESMETRON screensaver module: "ribbon"
// A 4-segment Lissajous tail chasing itself around the display.
//
// Module contract: init(variant) / draw(h) / remove(). This module owns its
// own knob1 (rotate + short press) and knob2 (rotate + press) input for as
// long as it's active - the launcher (app.js) only listens for a long press
// of knob1 to return to the menu. Because this module's knob1 listener has
// to coexist with the launcher's long-press-only listener on the same
// input, it registers with Pip.on rather than Pip.onExclusive. See web.js
// for the full module contract and file-wrapping convention.

(function () {
  const CX = 240,
    CY = 160;
  let variant = 0,
    tick = 0;
  let brightnessStep = 20,
    lastKnob = 0;
  const px = new Float32Array(4);
  const py = new Float32Array(4);

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
    id: 'RIBBON',
    init: function (v) {
      setup(v);
      Pip.on('knob1', onKnob1);
      Pip.on('knob2', onKnob2);
    },
    draw: function (h) {
      'ram';
      const spdMul = 1 + variant * 0.6;
      const t = (tick / 26) * spdMul;
      const freqA = 3.1 + variant * 0.4;
      const freqB = 2.3 + variant * 0.3;
      const nx = CX + 230 * Math.sin(freqA * t + Math.sin(t / 4.7));
      const ny = CY + 150 * Math.sin(freqB * t);
      h.setColor(3);
      if (tick > 10) {
        h.setColor(0);
        h.drawLineAA(px[3] | 0, py[3] | 0, px[2] | 0, py[2] | 0);
        h.setColor(3);
      }
      px[3] = px[2];
      py[3] = py[2];
      px[2] = px[1];
      py[2] = py[1];
      px[1] = px[0];
      py[1] = py[0];
      px[0] = nx;
      py[0] = ny;
      h.drawLineAA(px[0] | 0, py[0] | 0, px[1] | 0, py[1] | 0);
      tick++;
    },
    remove: function () {
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
    },
  };
});
