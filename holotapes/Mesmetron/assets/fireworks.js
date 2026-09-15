// MESMETRON screensaver module: "fireworks"
// Simulates celebratory fireworks mortars with parabolic arcs, randomized
// launch timings, and particle explosions constrained within safe display bounds.
//
// Owns its own knob1 (rotate + short press) and knob2 (rotate + press)
// input while active; see web.js for the full module contract
// (init/draw/remove) and file-wrapping convention.

(function () {
  const W = 480;
  const H = 320;
  const MAX_SHELLS = 5; // Absolute maximum for memory pre-allocation
  const MAX_PARTICLES = 50;
  const G = 0.3; // Gravity constant

  let shells = [];
  let particles = [];
  let spawnTimer = 0;
  let activeMax = 3; // Dynamically set by knob2 variant
  let variant = 0;
  let brightnessStep = 20,
    lastKnob = 0;

  function setup(v) {
    // variant is 0, 1, or 2 from knob2 rotation.
    // Map this to 3, 4, or 5 maximum active shells.
    variant = v;
    activeMax = 3 + v;

    // Pre-allocate up to absolute MAX_SHELLS to prevent memory fragmentation on the Espruino
    shells = [];
    for (let i = 0; i < MAX_SHELLS; i++) {
      shells.push({ active: 0, x: 0, y: 0, vx: 0, vy: 0, targetY: 0 });
    }

    particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particles.push({
        active: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        age: 0,
        life: 0,
        type: 0,
      });
    }

    // Quick initial spawn
    spawnTimer = Math.randInt(10);
  }

  function spawnShell() {
    'ram';
    for (let i = 0; i < activeMax; i++) {
      let s = shells[i];
      if (!s.active) {
        // Launch from a random spot near the bottom center
        s.x = 140 + Math.randInt(200);
        s.y = H;

        // Target Y area: 40px from top, 165px from bottom (320 - 165 = 155 max Y)
        // Range = 155 - 40 = 115
        let ty = 40 + Math.randInt(115);

        // Calculate physics to perfectly reach `ty` at the apex of the arc
        let dy = s.y - ty;
        s.vy = -Math.sqrt(2 * G * dy);

        // Restrict horizontal target to a 50-degree cone (25 degrees each side)
        // Max horizontal drift at apex to stay within 25 degrees is ~0.932 * dy
        let maxDx = (dy * 932) / 1000;
        let minTx = s.x - maxDx;
        if (minTx < 40) minTx = 40;
        let maxTx = s.x + maxDx;
        if (maxTx > 440) maxTx = 440;

        let tx = minTx + Math.randInt(maxTx - minTx + 1);

        // Time to reach the apex (vy = 0)
        let t = -s.vy / G;

        // Horizontal velocity required to reach tx in t frames
        s.vx = (tx - s.x) / t;
        s.targetY = ty;
        s.active = 1;
        break;
      }
    }
  }

  function explode(x, y) {
    'ram';
    let count = 10 + Math.randInt(6);

    // 7 possible outcomes (0-6). 5 and 6 map to streamer, giving it a 2x chance.
    let roll = Math.randInt(7);
    let explosionType = roll === 6 ? 5 : roll;

    for (let i = 0; i < MAX_PARTICLES && count > 0; i++) {
      let p = particles[i];
      if (!p.active) {
        p.active = 1;
        p.x = x;
        p.y = y;

        // Blast outward in a full circle
        let angle = (Math.randInt(360) * 3.14159) / 180;

        // Streamers (type 5) get a slightly faster initial burst for longer tails
        let speedMult = explosionType === 5 ? 2.5 : 1.5;
        let speed = speedMult + Math.randInt(30) / 10;

        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.age = 0;
        p.life = 15 + Math.randInt(20);
        p.type = explosionType;
        count--;
      }
    }
  }

  function draw(h) {
    'ram';
    h.clear();

    // Random timing logic for mortar shots
    if (spawnTimer > 0) {
      spawnTimer--;
    } else {
      spawnShell();
      // Drastically reduced spawn delay for a faster launch rate
      spawnTimer = 4 + Math.randInt(12);
    }

    // Process and render ascending shells constrained by activeMax
    for (let i = 0; i < activeMax; i++) {
      let s = shells[i];
      if (s.active) {
        let oldX = s.x;
        let oldY = s.y;

        s.x += s.vx;
        s.vy += G;
        s.y += s.vy;

        // Draw the glowing ascent trail - reduced to 2px thickness
        h.setColor(3);
        h.drawLine(oldX, oldY, s.x, s.y);
        h.drawLine(oldX + 1, oldY, s.x + 1, s.y);

        // Detonate if it crests its parabola or hits the target Y bound
        if (s.vy >= 0 || s.y <= s.targetY) {
          s.active = 0;
          explode(s.x, s.y);
        }
      }
    }

    // Process and render particle detritus
    for (let i = 0; i < MAX_PARTICLES; i++) {
      let p = particles[i];
      if (p.active) {
        let oldX = p.x;
        let oldY = p.y;

        p.x += p.vx;
        p.vy += G * 0.4; // Particles float down slightly slower
        p.y += p.vy;
        p.age++;

        if (p.age >= p.life) {
          p.active = 0;
        } else {
          let c = 0;

          if (p.type === 0) {
            c = 1; // Solid Amber/On
          } else if (p.type === 1) {
            c = 2; // Solid Dim
          } else if (p.type === 2) {
            c = 3; // Solid Bright
          } else if (p.type === 3) {
            // Strobing Bright to Off at end of life
            c = 3;
            let dying = p.life - p.age < 8;
            if (dying && Math.randInt(2) === 0) {
              c = 0;
            }
          } else if (p.type === 4 || p.type === 5) {
            // Fading Bright -> Dim -> Amber over lifespan
            let lifeRatio = p.age / p.life;
            if (lifeRatio < 0.33) {
              c = 3;
            } else if (lifeRatio < 0.66) {
              c = 2;
            } else {
              c = 1;
            }
          }

          // Only draw if the color is not completely transparent/background
          if (c !== 0) {
            h.setColor(c);

            if (p.type === 5) {
              // Streamers: Draw as lines mapping previous position to current position
              h.drawLine(oldX - p.vx * 1.5, oldY - p.vy * 1.5, p.x, p.y);
            } else {
              // Default: Draw as 2x2 chunks
              h.fillRect(p.x, p.y, p.x + 1, p.y + 1);
            }
          }
        }
      }
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
    id: 'FIREWORKS',
    init: function (v) {
      setup(v);
      Pip.on('knob1', onKnob1);
      Pip.on('knob2', onKnob2);
    },
    draw: draw,
    remove: function () {
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
    },
  };
});
