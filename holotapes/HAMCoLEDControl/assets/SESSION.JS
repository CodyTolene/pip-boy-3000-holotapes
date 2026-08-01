(function() {
  'use strict';

  function clamp(v) {
    v = Number(v);
    if (isNaN(v) || v < 0) return 0;
    if (v > 1) return 1;
    return v;
  }

  function pinSame(a, b) {
    try {
      return a && b && a.toString() === b.toString();
    } catch (e) {
      return a === b;
    }
  }

  function bright() {
    var b = 1;
    try {
      if (typeof Pip.brightness === 'number') b = Pip.brightness;
    } catch (e) {}
    return clamp(b);
  }

  function install() {
    var svc = {};
    svc.fx = 0;
    svc.pal = 0;
    svc.spd = 1;
    svc.level = 1;
    svc.step = 0;
    svc.timer = 0;
    svc.active = true;
    svc.original = Pip.fadeTo;

    svc.stop = function() {
      if (svc.timer) {
        clearInterval(svc.timer);
        svc.timer = 0;
      }
    };

    svc.raw = function(v) {
      try {
        svc.original(v);
      } catch (e) {}
    };

    svc.out = function(r, g, b, i) {
      var v = bright() * svc.level * clamp(i);
      svc.raw([{ pin: LED_RED, target: r * v }, { pin: LED_GREEN, target: g * v }, { pin: LED_BLUE, target: b * v }]);
    };

    svc.paint = function(i, p, a) {
      var q;
      if (svc.pal === 0) svc.out(1, 0.5, 0, i);
      else if (svc.pal === 1) svc.out(1, 0, 0, i);
      else if (svc.pal === 2) svc.out(0.1, 1, 0.05, i);
      else if (svc.pal === 3) svc.out(0, 0.25, 1, i);
      else if (svc.pal === 4) svc.out(0, 1, 1, i);
      else if (svc.pal === 5) svc.out(0.65, 0, 1, i);
      else if (svc.pal === 6) svc.out(1, 1, 1, i);
      else if (svc.pal === 7) svc.out(1, 0.75, 0.45, i);
      else if (svc.pal === 8) svc.out(a ? 0 : 1, 0, a ? 1 : 0, i);
      else if (svc.pal === 9) svc.out(1, a ? 0.34 : 0, 0, i);
      else if (svc.pal === 10) {
        q = p % 24;
        if (q > 12) q = 24 - q;
        svc.out(0.1 + q / 14, 1 - q / 28, 0.04, i);
      } else {
        q = p % 7;
        if (q === 0) svc.out(1, 0, 0, i);
        else if (q === 1) svc.out(1, 0.35, 0, i);
        else if (q === 2) svc.out(0, 1, 0, i);
        else if (q === 3) svc.out(0, 1, 1, i);
        else if (q === 4) svc.out(0, 0, 1, i);
        else if (q === 5) svc.out(0.65, 0, 1, i);
        else svc.out(1, 0, 0.35, i);
      }
    };

    svc.restoreColor = function() {
      var v = bright();
      svc.raw([{ pin: LED_RED, target: v }, { pin: LED_GREEN, target: v * 0.5 }, { pin: LED_BLUE, target: 0 }]);
    };

    svc.frame = function() {
      var q;
      if (!svc.active) return;
      if (svc.fx === 0) svc.paint(1, svc.step, 0);
      else if (svc.fx === 1) {
        q = svc.step % 40;
        if (q > 20) q = 40 - q;
        svc.paint(0.12 + q / 23, svc.step, 0);
      } else if (svc.fx === 2) {
        q = svc.step % 18;
        svc.paint(q < 2 || q > 4 && q < 7 ? 1 : 0.08, svc.step, q > 4);
      } else if (svc.fx === 3) {
        q = svc.step % 24;
        if (q > 12) q = 24 - q;
        svc.paint(0.18 + q / 14, svc.step, svc.step % 24 > 12);
      } else if (svc.fx === 4) {
        q = (svc.step * 17) % 31;
        svc.paint(q < 4 ? 1 : 0.06, svc.step * 3, q < 2);
      } else if (svc.fx === 5) {
        q = svc.step % 28;
        svc.paint(q < 8 ? q / 8 : q < 11 ? 1 : q < 17 ? 0.35 + ((q * 3) % 5) / 10 : 0.7, svc.step, q % 2);
      } else if (svc.fx === 6) {
        q = svc.step % 10;
        svc.paint(q < 4 ? 1 : 0.1, svc.step, q % 2);
      } else if (svc.fx === 7) {
        q = svc.step % 36;
        if (q < 12) svc.out(0.1, 1, 0.05, 0.35 + q / 16);
        else if (q < 24) svc.out(1, 0.45, 0, 0.45 + (q - 12) / 18);
        else svc.out(1, 0, 0, 0.55 + (q - 24) / 24);
      } else if (svc.fx === 8) {
        q = svc.step % 22;
        svc.paint(q < 2 || q > 4 && q < 7 || q > 9 && q < 16 ? 1 : 0.08, svc.step, q > 9);
      } else if (svc.fx === 9) {
        q = (svc.step * 13) % 19;
        svc.paint(q < 3 ? 0 : 0.12 + q / 90, svc.step, q > 10);
      } else if (svc.fx === 10) {
        q = svc.step % 24;
        if (q < 2) svc.out(1, 1, 1, 1);
        else svc.paint(0.2 + (24 - q) / 26, svc.step, 0);
      } else if (svc.fx === 11) {
        q = svc.step % 30;
        if (q > 15) q = 30 - q;
        svc.paint(0.2 + q / 16, svc.step, svc.step % 30 > 15);
      } else {
        q = svc.step % 60;
        if (q > 30) q = 60 - q;
        svc.paint(0.28 + q / 120, svc.step, 0);
      }
      svc.step++;
    };

    svc.interval = function() {
      var d = 180;
      if (svc.fx === 1) d = 85;
      else if (svc.fx === 2) d = 95;
      else if (svc.fx === 4) d = 120;
      else if (svc.fx === 6) d = 180;
      else if (svc.fx === 10) d = 80;
      else if (svc.fx === 12) d = 160;
      if (svc.spd === 0) d *= 2;
      else if (svc.spd === 2) d = Math.max(45, (d / 2) | 0);
      return d;
    };

    svc.offFade = function(specs) {
      var a = specs instanceof Array ? specs : [specs];
      var hit = 0;
      var max = 0;
      var i, s, t;
      for (i = 0; i < a.length; i++) {
        s = a[i] || {};
        if (pinSame(s.pin, LED_RED) || pinSame(s.pin, LED_GREEN) || pinSame(s.pin, LED_BLUE) || pinSame(s.pin, LED_DOWNFIRE)) {
          hit = 1;
          t = Number(s.target);
          if (!isNaN(t) && t > max) max = t;
        }
      }
      return hit && max <= 0.01;
    };

    svc.remove = function(passive) {
      svc.stop();
      svc.active = false;
      try {
        if (Pip.fadeTo === svc.patched) Pip.fadeTo = svc.original;
      } catch (e0) {}
      try {
        global.HAM_LED_SESSION = undefined;
      } catch (e1) {}
      if (!passive) {
        try {
          if (Pip.setBrightness && typeof Pip.brightness === 'number') Pip.setBrightness(Pip.brightness);
        } catch (e2) {}
        try {
          if (Pip.checkChargeStatus) Pip.checkChargeStatus(true);
        } catch (e3) {}
        svc.restoreColor();
      }
    };

    svc.patched = function(specs) {
      if (svc.offFade(specs)) {
        svc.remove(true);
        return svc.original(specs);
      }
      return svc.original(specs);
    };

    svc.start = function(f, p, s, l) {
      svc.stop();
      svc.fx = Math.max(0, Math.min(12, f | 0));
      svc.pal = Math.max(0, Math.min(11, p | 0));
      svc.spd = Math.max(0, Math.min(2, s | 0));
      svc.level = Math.max(0.25, Math.min(1, Number(l) || 1));
      svc.step = 0;
      svc.active = true;
      try {
        if (Pip.fadeTo !== svc.patched) Pip.fadeTo = svc.patched;
      } catch (e) {}
      svc.frame();
      if (svc.fx !== 0) svc.timer = setInterval(svc.frame, svc.interval());
      global.HAM_LED_SESSION = svc;
      return svc;
    };

    return svc;
  }

  return function(f, p, s, l) {
    var svc = 0;
    try {
      if (global.HAM_LED_SESSION && global.HAM_LED_SESSION.start) svc = global.HAM_LED_SESSION;
    } catch (e0) {}
    if (!svc) svc = install();
    return svc.start(f, p, s, l);
  };
});