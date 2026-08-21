(function () {
  'use strict';
  var fs = require('fs'),
    FILE = 'HOLO/LEDCOLOR/LED.JSON',
    dead = false,
    done = false,
    sel = 0,
    S = 0,
    hadSession = false;
  var FX =
    'SOLID|SLOW FADE|POLICE LIGHTS|DUAL COLORS|BREATHE|DOUBLE PULSE|SCANNER|GEIGER TICKS|POWER SURGE|WARNING BEACON|MELTDOWN|SIGNAL LOCK|LOW POWER|OVERCHARGE|SIREN FADE|IDLE GLOW|CANDLE FLICKER|RAD STORM|EMERGENCY STROBE|HEARTBEAT|VAULT BREACH|NUKA FLICKER'.split(
      '|',
    );
  var COL =
    'AMBER|RED|TOXIC|VAULT BLUE|CYAN|PURPLE|WHITE|WARM WHITE|GREEN|ORANGE|PINK|ICE BLUE|YELLOW'.split(
      '|',
    );
  var SPD = 'SLOW|MED|FAST'.split('|');
  function def() {
    return { enabled: 0, fx: 1, ca: 0, cb: 3, spd: 1, level: 1 };
  }
  function clone(d) {
    d = d || def();
    return {
      enabled: d.enabled ? 1 : 0,
      fx: d.fx | 0,
      ca: d.ca | 0,
      cb: d.cb | 0,
      spd: d.spd | 0,
      level: Number(d.level) || 1,
    };
  }
  function read() {
    try {
      return clone(JSON.parse(fs.readFileSync(FILE)));
    } catch (e) {
      return def();
    }
  }
  function write(d) {
    try {
      fs.writeFileSync(FILE, JSON.stringify(d));
      return true;
    } catch (e) {
      return false;
    }
  }
  function start(d) {
    var f;
    try {
      f = eval(fs.readFileSync('HOLO/LEDCOLOR/SESSION.JS'));
      return f(d);
    } catch (e) {
      return 0;
    }
  }
  var old = global.HAM_LED_SESSION;
  if (old && old.v === 9 && old.state) {
    hadSession = !!old.state.enabled;
  } else old = 0;
  var saved = old ? clone(old.state) : read(),
    s = clone(saved);
  s.enabled = 1;
  S = old || start(s);
  if (S && old) S.apply(s);
  function one() {
    var f = s.fx;
    return (
      f === 0 ||
      f === 4 ||
      f === 5 ||
      f === 6 ||
      f === 7 ||
      f === 8 ||
      f === 11 ||
      f === 13 ||
      f === 15 ||
      f === 16 ||
      f === 17 ||
      f === 18 ||
      f === 19 ||
      f === 21
    );
  }
  function rows() {
    var a = ['fx'];
    if (s.fx === 3) a.push('ca', 'cb');
    else if (one()) a.push('ca');
    if (s.fx !== 0) a.push('spd');
    a.push('level', 'keep', 'restore', 'exit');
    return a;
  }
  function name(k) {
    return k === 'fx'
      ? 'EFFECT'
      : k === 'ca'
        ? s.fx === 3
          ? 'COLOR A'
          : 'COLOR'
        : k === 'cb'
          ? 'COLOR B'
          : k === 'spd'
            ? 'EFFECT SPEED'
            : k === 'level'
              ? 'BRIGHTNESS'
              : k === 'keep'
                ? 'KEEP EFFECT + EXIT'
                : k === 'restore'
                  ? 'EXIT + RESTORE PIP-OS'
                  : 'CANCEL CHANGES + EXIT';
  }
  function val(k) {
    return k === 'fx'
      ? FX[s.fx]
      : k === 'ca'
        ? COL[s.ca]
        : k === 'cb'
          ? COL[s.cb]
          : k === 'spd'
            ? SPD[s.spd]
            : k === 'level'
              ? Math.round(s.level * 100) + '%'
              : '';
  }
  function font(n) {
    try {
      n > 18 ? h.setFontMonofonto23() : h.setFontMonofonto16();
    } catch (e) {
      h.setFont('6x8', 2);
    }
    return h;
  }
  function draw() {
    var a = rows(),
      i,
      y,
      v;
    if (sel >= a.length) sel = a.length - 1;
    try {
      h.clear(1).setColor(3).setBgColor(0);
      font(23).setFontAlign(0, -1).drawString('HAMCo LIGHT CONTROL', 240, 5);
      h.drawLine(14, 34, 466, 34);
      for (i = 0; i < a.length; i++) {
        y = 42 + 27 * i;
        if (i === sel) h.fillRect(16, y - 2, 464, y + 20).setColor(0);
        font(16).setFontAlign(-1, -1).drawString(name(a[i]), 25, y);
        v = val(a[i]);
        if (v) h.setFontAlign(1, -1).drawString(v, 455, y);
        h.setColor(3).setBgColor(0);
      }
      h.drawLine(12, 286, 468, 286);
      font(16)
        .setFontAlign(0, -1)
        .drawString('LEFT TURN MOVE  LEFT PRESS SELECT', 240, 289);
      h.drawString('RIGHT TURN CHANGE', 240, 305);
      h.flip();
      Pip.lastFlip = getTime();
    } catch (e) {}
  }
  function sound(n) {
    try {
      Pip.playSound(n);
    } catch (e) {}
  }
  function preview() {
    s.enabled = 1;
    try {
      if (S && S.apply) S.apply(s);
    } catch (e) {}
  }
  function move(v) {
    var a;
    if (dead || !v) return;
    a = rows();
    sel = (sel + (v > 0 ? 1 : -1) + a.length) % a.length;
    sound('NEXT');
    draw();
  }
  function adjust(v) {
    var d = v < 0 ? -1 : 1,
      k = rows()[sel];
    if (k === 'fx') {
      s.fx = (s.fx + d + FX.length) % FX.length;
      sel = 0;
    } else if (k === 'ca') s.ca = (s.ca + d + COL.length) % COL.length;
    else if (k === 'cb') s.cb = (s.cb + d + COL.length) % COL.length;
    else if (k === 'spd') s.spd = (s.spd + d + 3) % 3;
    else if (k === 'level') {
      s.level += d * 0.25;
      if (s.level > 1) s.level = 0.25;
      else if (s.level < 0.25) s.level = 1;
    } else return false;
    preview();
    sound('OK');
    draw();
    return true;
  }
  function rollback() {
    if (!S) return;
    if (hadSession) {
      saved.enabled = 1;
      S.apply(saved);
    } else S.restoreNative(true);
  }
  function close(change) {
    var mode;
    if (dead) return;
    dead = true;
    try {
      Pip.removeListener('knob1', knob1);
    } catch (e) {}
    try {
      Pip.removeListener('knob2', knob2);
    } catch (e) {}
    try {
      Pip.audioStop();
    } catch (e) {}
    try {
      if (Pip.CURRENT) Pip.CURRENT.fullscreen = false;
    } catch (e) {}
    try {
      h.clear();
    } catch (e) {}
    try {
      if (Pip.setWatches) Pip.setWatches();
    } catch (e) {}
    try {
      if (typeof E !== 'undefined' && E.gc) E.gc();
    } catch (e) {}
    if (change) {
      mode = typeof Pip.MODE === 'number' ? Pip.MODE : 1;
      try {
        if (Pip.emit) Pip.emit('mode', mode, true);
        else Pip.changeMenu();
      } catch (e) {
        try {
          Pip.changeMenu();
        } catch (x) {}
      }
    }
  }
  function action() {
    var k = rows()[sel];
    if (k === 'keep') {
      s.enabled = 1;
      if (write(s)) {
        saved = clone(s);
        hadSession = true;
        done = true;
        preview();
        sound('OK');
        close(true);
      } else sound('ERROR');
    } else if (k === 'restore') {
      s = def();
      write(s);
      done = true;
      sound('OK');
      try {
        if (S) S.restoreNative(true);
      } catch (e) {}
      close(true);
    } else if (k === 'exit') {
      done = true;
      rollback();
      sound('OK');
      close(true);
    } else adjust(1);
  }
  function knob1(v) {
    if (dead) return;
    if (v) move(v);
    else action();
  }
  function knob2(v) {
    if (dead || !v) return;
    adjust(v);
  }
  try {
    Pip.onExclusive('knob1', knob1);
  } catch (e) {
    try {
      Pip.on('knob1', knob1);
    } catch (x) {}
  }
  try {
    Pip.onExclusive('knob2', knob2);
  } catch (e) {
    try {
      Pip.on('knob2', knob2);
    } catch (x) {}
  }
  if (!S) {
    try {
      Pip.playSound('ERROR');
    } catch (e) {}
  }
  draw();
  return {
    id: 'LEDCOLOR',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      if (dead) return;
      if (!done) rollback();
      close(false);
    },
  };
});
