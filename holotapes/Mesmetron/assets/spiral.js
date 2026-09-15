// MESMETRON screensaver module: "spiral"

// Knob2 selects the pattern (3 variants):
//   0 - two wires, spiraling outward from center, opposite each other.
//   1 - three wires, spiraling outward from center, 120 degrees apart.
//   2 - four wires: two spiraling outward from center (opposite each
//       other), and two more spiraling inward from the display's edge
//       (also opposite each other, wound the other direction).
//
// Owns its own knob1 (rotate + short press) and knob2 (rotate + press)
// input while active; see web.js for the full module contract
// (init/draw/remove) and file-wrapping convention.

(function () {
  const CX = 240,
    CY = 160;
  const MAXR = 289;
  const REV = 5; // revolutions per wire
  const B = MAXR / (REV * 6.283); // spiral tightness derived from the revolution count
  const RSTEP = 0.5 * 2.5; // radius covered per tick
  const N = Math.ceil(MAXR / RSTEP); // ticks needed for one wire to cover its full reach
  const MICRO = 2; // ticks grown per frame
  const R0 = 25;
  const EXTRA = 0.0628;
  const CORE_OFF = 3;
  const BORDER_WIDTH = 3;
  const BORDER_START = CORE_OFF + 1;
  const BORDER_END = CORE_OFF + BORDER_WIDTH;
  const ANGLE_BITS = 7; // resolution of the bisecting sequence (128 possible angles)
  const SPAWN_AT_REMAINING = 0;
  const SPAWN_TICK = N - MICRO;
  const CHIRAL_FLIP = 69; // spirals per direction before inverting

  let mode = 0,
    passIdx = 0;
  let latest = null; // most recently spawned generation - checked each frame
  // to see if it's crossed SPAWN_TICK yet
  let gens = []; // active generations - each an independent in-progress spiral
  let brightnessStep = 20,
    lastKnob = 0;

  function bisectAngle(n) {
    let rev = 0,
      v = n;
    for (let i = 0; i < ANGLE_BITS; i++) {
      rev = (rev << 1) | (v & 1);
      v >>= 1;
    }
    return (rev / (1 << ANGLE_BITS)) * 6.283;
  }

  function slotCount() {
    return mode === 0 ? 2 : mode === 1 ? 3 : 4;
  }

  function point(t, angOff, chirality, phase) {
    'jit'; // outward: r grows from 0 to MAXR
    const r = t * RSTEP;
    const curl = EXTRA * R0 * (1 - Math.exp(-r / R0));
    const a = chirality * (r / B + curl) + angOff + phase;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  }

  function pointIn(t, angOff, chirality, phase) {
    'jit'; // inward: r shrinks from MAXR to 0
    let r = MAXR - t * RSTEP;
    if (r < 0) r = 0;
    const curl = EXTRA * R0 * (1 - Math.exp(-r / R0));
    const a = chirality * (r / B + curl) + angOff + phase;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  }

  let setColor, drawLine;

  function stroke(gen, slot, x, y) {
    if (gen.started[slot]) {
      const ox = gen.px[slot],
        oy = gen.py[slot];
      const dx = x - ox,
        dy = y - oy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len,
        ny = dx / len;
      // fill: one line per integer offset from -CORE_OFF to +CORE_OFF, so the
      // band is solid with no gap
      setColor(3);
      for (let o = -CORE_OFF; o <= CORE_OFF; o++) {
        drawLine(
          (ox + nx * o) | 0,
          (oy + ny * o) | 0,
          (x + nx * o) | 0,
          (y + ny * o) | 0,
        );
      }
      // black border drawn around the fill
      setColor(0);
      for (let o = BORDER_START; o <= BORDER_END; o++) {
        drawLine(
          (ox + nx * o) | 0,
          (oy + ny * o) | 0,
          (x + nx * o) | 0,
          (y + ny * o) | 0,
        );
        drawLine(
          (ox - nx * o) | 0,
          (oy - ny * o) | 0,
          (x - nx * o) | 0,
          (y - ny * o) | 0,
        );
      }
    }
    gen.px[slot] = x;
    gen.py[slot] = y;
    gen.started[slot] = true;
  }

  function grow(gen, slot, t, angOff, chirality) {
    const p = point(t, angOff, chirality, gen.phase);
    stroke(gen, slot, p[0], p[1]);
  }

  function growIn(gen, slot, t, angOff, chirality) {
    const p = pointIn(t, angOff, chirality, gen.phase);
    stroke(gen, slot, p[0], p[1]);
  }

  // Draws up to MICRO ticks for one generation. Returns false once that
  // generation has reached full reach (caller drops it from gens[]).
  function drawGen(gen) {
    for (let i = 0; i < MICRO; i++) {
      const t = gen.tick + i;
      if (t > N) continue;
      if (mode === 0) {
        grow(gen, 0, t, 0, gen.ch);
        grow(gen, 1, t, 3.1416, gen.ch);
      } else if (mode === 1) {
        grow(gen, 0, t, 0, gen.ch);
        grow(gen, 1, t, 2.0944, gen.ch);
        grow(gen, 2, t, 4.1888, gen.ch);
      } else {
        grow(gen, 0, t, 0, gen.ch);
        grow(gen, 1, t, 3.1416, gen.ch);
        growIn(gen, 2, t, 0, -gen.ch);
        growIn(gen, 3, t, 3.1416, -gen.ch);
      }
    }
    gen.tick += MICRO;
    return gen.tick <= N;
  }

  function spawnGen() {
    const phase = bisectAngle(mode === 1 ? passIdx : passIdx * 2);
    const n = slotCount();
    const dir = Math.floor(passIdx / CHIRAL_FLIP) % 2 === 0 ? 1 : -1;
    const gen = {
      tick: 0,
      phase: phase,
      ch: dir,
      started: new Array(n).fill(false),
      px: new Array(n).fill(0),
      py: new Array(n).fill(0),
    };
    gens.push(gen);
    latest = gen;
    passIdx++;
  }

  function paint() {
    if (latest && latest.tick >= SPAWN_TICK) spawnGen();
    for (let g = gens.length - 1; g >= 0; g--) {
      if (!drawGen(gens[g])) gens.splice(g, 1);
    }
  }

  function setup(variant) {
    mode = variant;
    passIdx = 0;
    gens = [];
    latest = null;
    spawnGen();
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
      mode = (mode + dir + 3) % 3;
      h.clear();
      setup(mode);
      Pip.playSound('HIGHLIGHT');
    } else {
      h.clear();
      Pip.playSound('SELECT');
    }
  }

  return {
    id: 'SPIRAL',
    init: function (variant) {
      setup(variant);
      Pip.on('knob1', onKnob1);
      Pip.on('knob2', onKnob2);
    },
    draw: function (h) {
      'ram';
      if (!setColor) {
        setColor = h.setColor.bind(h);
        drawLine = h.drawLine.bind(h);
      }
      paint();
    },
    remove: function () {
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
    },
  };
});
