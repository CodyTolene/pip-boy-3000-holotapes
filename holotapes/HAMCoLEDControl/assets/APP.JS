(function () {
  'use strict';

  var dead = false;
  var sel = 0;
  var fx = 1;
  var pal = 0;
  var spd = 1;
  var level = 1;
  var timer = 0;
  var step = 0;
  var preview = false;
  var kept = false;
  var FX =
    'SOLID|BREATHE|DOUBLE PULSE|SCANNER|GEIGER TICKS|POWER SURGE|WARNING BEACON|MELTDOWN|SIGNAL LOCK|LOW POWER|OVERCHARGE|SIREN FADE|IDLE GLOW'.split(
      '|',
    );
  var PAL =
    'AMBER|RED|TOXIC|VAULT BLUE|CYAN|PURPLE|WHITE|WARM WHITE|POLICE|WARNING|RAD MIX|RAINBOW'.split(
      '|',
    );
  var SPD = 'SLOW|MED|FAST'.split('|');
  var MENU =
    'EFFECT|COLOR|SPEED|BRIGHTNESS|KEEP EFFECT + EXIT|RESTORE PIP-OS + EXIT|EXIT RESTORE'.split(
      '|',
    );

  function clamp(v) {
    v = Number(v);
    if (isNaN(v) || v < 0) return 0;
    if (v > 1) return 1;
    return v;
  }

  function baseBright() {
    var b = 1;
    try {
      if (typeof Pip.brightness === 'number') b = Pip.brightness;
    } catch (e) {}
    return clamp(b);
  }

  function bright() {
    return baseBright() * level;
  }

  function out(r, g, b, i) {
    var v = bright() * clamp(i);
    try {
      Pip.fadeTo([
        { pin: LED_RED, target: r * v },
        { pin: LED_GREEN, target: g * v },
        { pin: LED_BLUE, target: b * v },
      ]);
    } catch (e) {}
  }

  function paint(i, p, a) {
    var q;
    if (pal === 0) out(1, 0.5, 0, i);
    else if (pal === 1) out(1, 0, 0, i);
    else if (pal === 2) out(0.1, 1, 0.05, i);
    else if (pal === 3) out(0, 0.25, 1, i);
    else if (pal === 4) out(0, 1, 1, i);
    else if (pal === 5) out(0.65, 0, 1, i);
    else if (pal === 6) out(1, 1, 1, i);
    else if (pal === 7) out(1, 0.75, 0.45, i);
    else if (pal === 8) {
      if (a) out(0, 0, 1, i);
      else out(1, 0, 0, i);
    } else if (pal === 9) {
      if (a) out(1, 0.34, 0, i);
      else out(1, 0, 0, i);
    } else if (pal === 10) {
      q = p % 24;
      if (q > 12) q = 24 - q;
      out(0.1 + q / 14, 1 - q / 28, 0.04, i);
    } else {
      q = p % 7;
      if (q === 0) out(1, 0, 0, i);
      else if (q === 1) out(1, 0.35, 0, i);
      else if (q === 2) out(0, 1, 0, i);
      else if (q === 3) out(0, 1, 1, i);
      else if (q === 4) out(0, 0, 1, i);
      else if (q === 5) out(0.65, 0, 1, i);
      else out(1, 0, 0.35, i);
    }
  }

  function restoreColor() {
    var v = baseBright();
    try {
      Pip.fadeTo([
        { pin: LED_RED, target: v },
        { pin: LED_GREEN, target: v * 0.5 },
        { pin: LED_BLUE, target: 0 },
      ]);
    } catch (e) {}
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = 0;
    }
  }

  function stopSessionOnly() {
    try {
      if (global.HAM_LED_SESSION && global.HAM_LED_SESSION.stop)
        global.HAM_LED_SESSION.stop();
    } catch (e) {}
  }

  function restore() {
    stop();
    try {
      if (global.HAM_LED_SESSION && global.HAM_LED_SESSION.remove) {
        global.HAM_LED_SESSION.remove(false);
        return;
      }
    } catch (e0) {}
    try {
      if (Pip.setBrightness && typeof Pip.brightness === 'number')
        Pip.setBrightness(Pip.brightness);
    } catch (e1) {}
    try {
      if (Pip.checkChargeStatus) Pip.checkChargeStatus(true);
    } catch (e2) {}
    restoreColor();
  }

  function frame() {
    var q;
    if (dead) return;
    if (fx === 0) paint(1, step, 0);
    else if (fx === 1) {
      q = step % 40;
      if (q > 20) q = 40 - q;
      paint(0.12 + q / 23, step, 0);
    } else if (fx === 2) {
      q = step % 18;
      paint(q < 2 || (q > 4 && q < 7) ? 1 : 0.08, step, q > 4);
    } else if (fx === 3) {
      q = step % 24;
      if (q > 12) q = 24 - q;
      paint(0.18 + q / 14, step, step % 24 > 12);
    } else if (fx === 4) {
      q = (step * 17) % 31;
      paint(q < 4 ? 1 : 0.06, step * 3, q < 2);
    } else if (fx === 5) {
      q = step % 28;
      paint(
        q < 8 ? q / 8 : q < 11 ? 1 : q < 17 ? 0.35 + ((q * 3) % 5) / 10 : 0.7,
        step,
        q % 2,
      );
    } else if (fx === 6) {
      q = step % 10;
      paint(q < 4 ? 1 : 0.1, step, q % 2);
    } else if (fx === 7) {
      q = step % 36;
      if (q < 12) out(0.1, 1, 0.05, 0.35 + q / 16);
      else if (q < 24) out(1, 0.45, 0, 0.45 + (q - 12) / 18);
      else out(1, 0, 0, 0.55 + (q - 24) / 24);
    } else if (fx === 8) {
      q = step % 22;
      paint(
        q < 2 || (q > 4 && q < 7) || (q > 9 && q < 16) ? 1 : 0.08,
        step,
        q > 9,
      );
    } else if (fx === 9) {
      q = (step * 13) % 19;
      paint(q < 3 ? 0 : 0.12 + q / 90, step, q > 10);
    } else if (fx === 10) {
      q = step % 24;
      if (q < 2) out(1, 1, 1, 1);
      else paint(0.2 + (24 - q) / 26, step, 0);
    } else if (fx === 11) {
      q = step % 30;
      if (q > 15) q = 30 - q;
      paint(0.2 + q / 16, step, step % 30 > 15);
    } else {
      q = step % 60;
      if (q > 30) q = 60 - q;
      paint(0.28 + q / 120, step, 0);
    }
    step++;
  }

  function interval() {
    var d = 180;
    if (fx === 1) d = 85;
    else if (fx === 2) d = 95;
    else if (fx === 4) d = 120;
    else if (fx === 6) d = 180;
    else if (fx === 10) d = 80;
    else if (fx === 12) d = 160;
    if (spd === 0) d *= 2;
    else if (spd === 2) d = Math.max(45, (d / 2) | 0);
    return d;
  }

  function apply() {
    preview = true;
    stopSessionOnly();
    stop();
    step = 0;
    frame();
    if (fx !== 0) timer = setInterval(frame, interval());
  }

  function font(n) {
    try {
      if (n > 18) h.setFontMonofonto23();
      else h.setFontMonofonto16();
    } catch (e) {
      h.setFont('6x8', 2);
    }
    return h;
  }

  function value(n) {
    if (n === 0) return FX[fx];
    if (n === 1) return PAL[pal];
    if (n === 2) return SPD[spd];
    if (n === 3) return Math.round(level * 100) + '%';
    return '';
  }

  function draw() {
    var i, y, v;
    h.clear(1).setColor(3).setBgColor(0);
    font(23).setFontAlign(0, -1).drawString('HAMCo LIGHT SESSION', 240, 10);
    h.drawLine(16, 40, 464, 40);
    for (i = 0; i < MENU.length; i++) {
      y = 58 + i * 32;
      if (i === sel) h.fillRect(18, y - 3, 462, y + 22).setColor(0);
      font(16).setFontAlign(-1, -1).drawString(MENU[i], 30, y);
      v = value(i);
      if (v) h.setFontAlign(1, -1).drawString(v, 452, y);
      h.setColor(3).setBgColor(0);
    }
    h.drawLine(12, 290, 468, 290);
    font(16)
      .setFontAlign(0, -1)
      .drawString('KEEP IS SESSION-ONLY; REBOOT CLEARS IT', 240, 297);
    try {
      h.flip();
      Pip.lastFlip = getTime();
    } catch (e) {}
  }

  function sound(n) {
    try {
      Pip.playSound(n);
    } catch (e) {}
  }

  function move(d) {
    if (dead || !d) return;
    sel = (sel + (d > 0 ? 1 : -1) + MENU.length) % MENU.length;
    sound('NEXT');
    draw();
  }

  function close(goMenu) {
    dead = true;
    stop();
    try {
      Pip.removeListener('knob1', choose);
    } catch (e0) {}
    try {
      Pip.removeListener('knob2', move);
    } catch (e1) {}
    try {
      Pip.audioStop();
    } catch (e2) {}
    try {
      h.clear();
    } catch (e3) {}
    try {
      if (typeof E !== 'undefined' && E.gc) E.gc();
    } catch (e4) {}
    try {
      if (typeof E !== 'undefined' && E.defrag) E.defrag();
    } catch (e5) {}
    if (goMenu) {
      try {
        Pip.changeMenu();
      } catch (e6) {}
    }
  }

  function keep() {
    var start;
    kept = true;
    stop();
    try {
      start = eval(require('fs').readFileSync('HOLO/LEDCOLOR/SESSION.JS'));
      start()(fx, pal, spd, level);
    } catch (e) {}
    close(true);
  }

  function choose(d) {
    if (dead || d !== 0) return;
    if (sel === 0) fx = (fx + 1) % FX.length;
    else if (sel === 1) pal = (pal + 1) % PAL.length;
    else if (sel === 2) spd = (spd + 1) % 3;
    else if (sel === 3) {
      level += 0.25;
      if (level > 1) level = 0.25;
    } else if (sel === 4) {
      sound('OK');
      return keep();
    } else {
      restore();
      sound('OK');
      return close(true);
    }
    apply();
    sound('OK');
    draw();
  }

  try {
    if (global.HAM_LED_SESSION) {
      fx = global.HAM_LED_SESSION.fx || fx;
      pal = global.HAM_LED_SESSION.pal || pal;
      spd = global.HAM_LED_SESSION.spd || spd;
      level = global.HAM_LED_SESSION.level || level;
    }
  } catch (e0) {}
  try {
    Pip.onExclusive('knob1', choose);
  } catch (e1) {
    try {
      Pip.on('knob1', choose);
    } catch (e2) {}
  }
  try {
    Pip.onExclusive('knob2', move);
  } catch (e3) {
    try {
      Pip.on('knob2', move);
    } catch (e4) {}
  }
  draw();

  return {
    id: 'LEDCOLOR',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      if (!kept && preview) restore();
      close(false);
    },
  };
});
