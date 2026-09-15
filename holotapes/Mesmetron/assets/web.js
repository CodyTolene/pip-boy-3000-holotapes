// MESMETRON screensaver module: "web"
// A rotating cross-linked lattice of nodes tracing pulsing elliptical orbits.
//
// Module contract: every MESMETRON screensaver module is a function
// expression (not invoked - the launcher's loadModule() applies the
// trailing "()") that returns { id, init(variant), draw(h), remove() }:
//   - id       uppercase string identifying the module.
//   - init(v)  called once when the launcher loads this module. Resets all
//              state for variant `v` and registers this module's OWN knob1
//              and knob2 listeners.
//   - draw(h)  called once per frame by the launcher's frame timer.
//   - remove() unregisters whatever this module registered in init() (its
//              knob listeners, primarily). Called by the launcher right
//              before it drops this module and returns to the menu.
//
// Input ownership: while a module is active, the launcher (app.js) only
// listens for a LONG press of knob1 (which always returns to the menu).
// Every other knob1 interaction (rotate, short press) and all of knob2
// (rotate, press) belongs to the module itself, so each module stays fully
// self-contained and reusable by other holotapes without the launcher
// dictating its controls. Because a module's own knob1 listener has to
// coexist with the launcher's long-press-only listener on the same input,
// both register with Pip.on rather than Pip.onExclusive (see agents2.md 3.6,
// "Use Pip.on only when you need multiple handlers on the same input").

(function () {
  const N = 14,
    CX = 240,
    CY = 160;
  let variant = 0,
    lastVariant = 0,
    tick = 0;
  let brightnessStep = 20,
    lastKnob = 0;
  const ang = new Float32Array(N);
  const spd = new Float32Array(N);
  const px = new Float32Array(N);
  const py = new Float32Array(N);

  // Link offsets for variants 0, 1, and 2
  const LINKS = new Int8Array([3, 7, 5]);

  function setup(v) {
    variant = v;
    lastVariant = v;
    tick = 0;
    for (let i = 0; i < N; i++) {
      ang[i] = Math.randInt(628) / 100;
      spd[i] = ((Math.randInt(30) + 15) / 1000) * (i % 2 ? 1 : -1);
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
    id: 'WEB',
    init: function (v) {
      setup(v);
      Pip.on('knob1', onKnob1);
      Pip.on('knob2', onKnob2);
    },
    draw: function (h) {
      'ram';
      const oldLink = LINKS[lastVariant];
      const newLink = LINKS[variant];

      h.setColor(3);
      if (tick > 0) {
        // Erase the old lines using the link configuration from the LAST frame
        h.setColor(0);
        for (let i = 0; i < N; i++) {
          h.drawLine(
            px[i] | 0,
            py[i] | 0,
            px[(i + oldLink) % N] | 0,
            py[(i + oldLink) % N] | 0,
          );
        }
        h.setColor(3);
      }

      const rx = 100 + 130 * Math.abs(Math.sin(tick / 41));
      const ry = 70 + 90 * Math.abs(Math.sin(tick / 53 + 1));

      for (let i = 0; i < N; i++) {
        // Orbit speed is now locked to the lowest default value
        ang[i] += spd[i];

        if (variant === 0) {
          // V0: Chaotic atomic orbits
          px[i] = CX + rx * Math.cos(ang[i] * (1 + (i % 3) * 0.25));
          py[i] = CY + ry * Math.sin(ang[i] * (1 + (i % 4) * 0.18));
        } else if (variant === 1) {
          // V1: 3D twisting helix / data column
          px[i] = CX + rx * Math.cos(ang[i]);
          py[i] = CY + ry * Math.sin(ang[i] * 3);
        } else {
          // V2: Complex starburst / geometric reticle
          px[i] =
            CX + rx * 0.8 * (Math.cos(ang[i]) + Math.cos(ang[i] * 4) * 0.4);
          py[i] =
            CY + ry * 0.8 * (Math.sin(ang[i]) + Math.sin(ang[i] * 4) * 0.4);
        }
      }

      // Draw new lines using the current link configuration
      for (let i = 0; i < N; i++) {
        h.drawLine(
          px[i] | 0,
          py[i] | 0,
          px[(i + newLink) % N] | 0,
          py[(i + newLink) % N] | 0,
        );
      }

      lastVariant = variant;
      tick++;
    },
    remove: function () {
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
    },
  };
});
