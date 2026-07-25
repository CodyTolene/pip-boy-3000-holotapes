(function () {
  'use strict';

  var ROOT = 'HOLO/LEDCOLOR';
  var STATE_FILE = ROOT + '/LED.JSON';
  var W = 480;
  var H = 320;
  var removed = false;
  var screen = 'main';
  var selected = 0;
  var testTimer = null;
  var testTimeout = null;

  var COLORS = [
    { name: 'DEFAULT', rgb: [1, 0.5, 0], note: 'PIP-OS CONTROL' },
    { name: 'RED', rgb: [1, 0, 0], note: 'SOLID RED' },
    { name: 'GREEN', rgb: [0, 1, 0], note: 'SOLID GREEN' },
    { name: 'BLUE', rgb: [0, 0, 1], note: 'SOLID BLUE' },
    { name: 'CYAN', rgb: [0, 1, 1], note: 'GREEN + BLUE' },
    { name: 'PURPLE', rgb: [0.65, 0, 1], note: 'RED + BLUE' },
    { name: 'AMBER', rgb: [1, 0.34, 0], note: 'WARM AMBER' },
    { name: 'WHITE', rgb: [1, 1, 1], note: 'ALL CHANNELS' },
    { name: 'OFF', rgb: [0, 0, 0], note: 'RADIATION LED OFF' },
  ];

  var DOWN_NAMES = ['DEFAULT / CHARGE', 'FORCED ON', 'FORCED OFF'];

  function pinSame(a, b) {
    try {
      return a && b && a.toString() === b.toString();
    } catch (e) {
      return a === b;
    }
  }

  function copySpec(s) {
    var o = {};
    var k;
    for (k in s) o[k] = s[k];
    return o;
  }

  function loadState() {
    try {
      var d = JSON.parse(fs.readFileSync(STATE_FILE));
      return {
        color: Math.max(0, Math.min(COLORS.length - 1, d.color | 0)),
        level: Math.max(0.1, Math.min(1, Number(d.level) || 1)),
        down: Math.max(0, Math.min(2, d.down | 0)),
      };
    } catch (e) {
      return { color: 0, level: 1, down: 0 };
    }
  }

  function saveState(s) {
    try {
      fs.writeFileSync(
        STATE_FILE,
        JSON.stringify({
          color: s.color,
          level: s.level,
          down: s.down,
        }),
      );
    } catch (e) {}
  }

  function makeService() {
    var state = loadState();
    var originalFadeTo = Pip.fadeTo;

    var svc = {
      version: 1,
      state: state,
      originalFadeTo: originalFadeTo,
      active: true,

      brightness: function () {
        var b = 1;
        try {
          if (Pip.settings && typeof Pip.settings.brightness === 'number')
            b = Pip.settings.brightness;
          else if (typeof Pip.brightness === 'number') b = Pip.brightness;
        } catch (e) {}
        if (b < 0) b = 0;
        if (b > 1) b = 1;
        return b;
      },

      transform: function (input) {
        var specs = input instanceof Array ? input : [input];
        var out = [];
        var rad = [];
        var radTouched = false;
        var downTouched = false;
        var maxTarget = 0;
        var i, s, t;

        for (i = 0; i < specs.length; i++) {
          s = copySpec(specs[i]);
          if (
            pinSame(s.pin, LED_RED) ||
            pinSame(s.pin, LED_GREEN) ||
            pinSame(s.pin, LED_BLUE)
          ) {
            radTouched = true;
            t = Number(s.target);
            if (!isNaN(t) && t > maxTarget) maxTarget = t;
          } else if (pinSame(s.pin, LED_DOWNFIRE)) {
            downTouched = true;
            if (this.state.down === 0) out.push(s);
          } else {
            out.push(s);
          }
        }

        if (radTouched) {
          if (this.state.color === 0) {
            for (i = 0; i < specs.length; i++) {
              s = copySpec(specs[i]);
              if (
                pinSame(s.pin, LED_RED) ||
                pinSame(s.pin, LED_GREEN) ||
                pinSame(s.pin, LED_BLUE)
              )
                out.push(s);
            }
          } else {
            rad = COLORS[this.state.color].rgb;
            t = maxTarget * this.state.level;
            out.push({ pin: LED_RED, target: t * rad[0], stepFactor: 1.1 });
            out.push({ pin: LED_GREEN, target: t * rad[1], stepFactor: 1.1 });
            out.push({ pin: LED_BLUE, target: t * rad[2], stepFactor: 1.1 });
          }
        }

        if (downTouched && this.state.down !== 0) {
          out.push({
            pin: LED_DOWNFIRE,
            target: this.state.down === 1 ? this.brightness() : 0,
            stepFactor: 1.1,
          });
        }

        return input instanceof Array ? out : out.length === 1 ? out[0] : out;
      },

      applyNow: function () {
        var b = this.brightness() * this.state.level;
        var c = COLORS[this.state.color].rgb;
        if (this.state.color === 0) {
          try {
            Pip.setBrightness(this.brightness());
          } catch (e0) {}
        } else {
          try {
            this.originalFadeTo([
              { pin: LED_RED, target: b * c[0], stepFactor: 1.1 },
              { pin: LED_GREEN, target: b * c[1], stepFactor: 1.1 },
              { pin: LED_BLUE, target: b * c[2], stepFactor: 1.1 },
            ]);
          } catch (e1) {}
        }
        if (this.state.down === 1) {
          try {
            this.originalFadeTo({
              pin: LED_DOWNFIRE,
              target: this.brightness(),
              stepFactor: 1.1,
            });
          } catch (e2) {}
        } else if (this.state.down === 2) {
          try {
            this.originalFadeTo({
              pin: LED_DOWNFIRE,
              target: 0,
              stepFactor: 1.1,
            });
          } catch (e3) {}
        } else {
          try {
            if (Pip.checkChargeStatus) Pip.checkChargeStatus(true);
          } catch (e4) {}
        }
      },

      save: function () {
        saveState(this.state);
      },

      resetAndUninstall: function () {
        this.state.color = 0;
        this.state.level = 1;
        this.state.down = 0;
        this.save();
        if (Pip.fadeTo === this.patchedFadeTo) Pip.fadeTo = this.originalFadeTo;
        this.active = false;
        try {
          Pip.setBrightness(this.brightness());
        } catch (e0) {}
        try {
          if (Pip.checkChargeStatus) Pip.checkChargeStatus(true);
        } catch (e1) {}
        try {
          delete global.HAM_LED_SERVICE;
        } catch (e2) {
          global.HAM_LED_SERVICE = undefined;
        }
      },
    };

    svc.patchedFadeTo = function (specs) {
      if (!svc.active || (svc.state.color === 0 && svc.state.down === 0))
        return svc.originalFadeTo(specs);
      return svc.originalFadeTo(svc.transform(specs));
    };

    Pip.fadeTo = svc.patchedFadeTo;
    global.HAM_LED_SERVICE = svc;
    svc.applyNow();
    return svc;
  }

  var service;
  if (
    global.HAM_LED_SERVICE &&
    global.HAM_LED_SERVICE.version === 1 &&
    global.HAM_LED_SERVICE.active
  ) {
    service = global.HAM_LED_SERVICE;
  } else {
    service = makeService();
  }

  function sound(name) {
    try {
      Pip.playSound(name);
    } catch (e) {
      try {
        Pip.audioStartVar(Pip.audioBuiltin(name));
      } catch (e2) {}
    }
  }

  function font(size) {
    try {
      if (size >= 23) h.setFontMonofonto23();
      else if (size >= 18) h.setFontMonofonto18();
      else if (size >= 16) h.setFontMonofonto16();
      else h.setFont('6x8', 2);
    } catch (e) {
      h.setFont('6x8', 2);
    }
    return h;
  }

  function clearScreen() {
    h.clear(1).setColor(3).setBgColor(0);
  }

  function drawHeader(title, sub) {
    clearScreen();
    font(23)
      .setFontAlign(0, -1)
      .drawString(title, W / 2, 10);
    h.drawLine(20, 40, W - 20, 40);
    font(16)
      .setFontAlign(0, -1)
      .drawString(sub, W / 2, 47);
  }

  function drawFooter(text) {
    h.drawLine(12, H - 31, W - 12, H - 31);
    font(16)
      .setFontAlign(0, -1)
      .drawString(text, W / 2, H - 24);
  }

  function mainItems() {
    var a = [];
    var i;
    for (i = 0; i < COLORS.length; i++) a.push(COLORS[i].name);
    a.push('BRIGHTNESS');
    a.push('DOWNLIGHT');
    a.push('TEST OTHER LEDS');
    a.push('RESET DEFAULT + EXIT');
    a.push('EXIT / KEEP COLOR');
    return a;
  }

  function drawMain() {
    var items = mainItems();
    var rows = 8;
    var start = selected - 3;
    var i, idx, y, label, active;
    if (start < 0) start = 0;
    if (start > items.length - rows) start = Math.max(0, items.length - rows);

    drawHeader('HAMCo LED CONTROL', 'RADIATION LIGHT COLOR');
    for (i = 0; i < rows && start + i < items.length; i++) {
      idx = start + i;
      y = 72 + i * 25;
      active = idx === selected;
      if (active)
        h.setColor(3)
          .fillRect(20, y - 2, W - 20, y + 20)
          .setColor(0);
      else h.setColor(3);
      label = items[idx];
      font(18).setFontAlign(-1, -1).drawString(label, 34, y);

      if (idx < COLORS.length && idx === service.state.color) {
        font(16)
          .setFontAlign(1, -1)
          .drawString('ACTIVE', W - 32, y + 1);
      } else if (idx === COLORS.length) {
        font(16)
          .setFontAlign(1, -1)
          .drawString(
            Math.round(service.state.level * 100) + '%',
            W - 32,
            y + 1,
          );
      } else if (idx === COLORS.length + 1) {
        font(16)
          .setFontAlign(1, -1)
          .drawString(DOWN_NAMES[service.state.down], W - 32, y + 1);
      }
      h.setColor(3).setBgColor(0);
    }

    font(16)
      .setFontAlign(-1, -1)
      .drawString('COLOR: ' + COLORS[service.state.color].note, 22, H - 52);
    drawFooter('EITHER KNOB MOVE  |  LEFT PRESS SELECT');
    h.flip();
  }

  var TESTS = [
    {
      name: 'RADIATION RED',
      pin: function () {
        return LED_RED;
      },
    },
    {
      name: 'RADIATION GREEN',
      pin: function () {
        return LED_GREEN;
      },
    },
    {
      name: 'RADIATION BLUE',
      pin: function () {
        return LED_BLUE;
      },
    },
    {
      name: 'STATS BUTTON LED',
      pin: function () {
        return LED_STATS;
      },
    },
    {
      name: 'ITEMS BUTTON LED',
      pin: function () {
        return LED_ITEMS;
      },
    },
    {
      name: 'DATA BUTTON LED',
      pin: function () {
        return LED_DATA;
      },
    },
    {
      name: 'TORCH LED',
      pin: function () {
        return LED_TORCH;
      },
    },
    {
      name: 'DOWNLIGHT (FIXED COLOR)',
      pin: function () {
        return LED_DOWNFIRE;
      },
    },
    { name: 'RUN ALL', all: true },
    { name: '< BACK', back: true },
  ];

  function drawTests() {
    var rows = 8;
    var start = selected - 3;
    var i, idx, y, active;
    if (start < 0) start = 0;
    if (start > TESTS.length - rows) start = Math.max(0, TESTS.length - rows);
    drawHeader('LED HARDWARE TEST', 'TEMPORARY - NORMAL STATE RESTORES');
    for (i = 0; i < rows && start + i < TESTS.length; i++) {
      idx = start + i;
      y = 72 + i * 25;
      active = idx === selected;
      if (active)
        h.setColor(3)
          .fillRect(20, y - 2, W - 20, y + 20)
          .setColor(0);
      else h.setColor(3);
      font(18).setFontAlign(-1, -1).drawString(TESTS[idx].name, 34, y);
      h.setColor(3).setBgColor(0);
    }
    font(16)
      .setFontAlign(-1, -1)
      .drawString('DOWNLIGHT IS SINGLE-COLOR HARDWARE', 22, H - 52);
    drawFooter('EITHER KNOB MOVE  |  LEFT PRESS TEST');
    h.flip();
  }

  function allTestPins() {
    return [
      LED_RED,
      LED_GREEN,
      LED_BLUE,
      LED_STATS,
      LED_ITEMS,
      LED_DATA,
      LED_TORCH,
      LED_DOWNFIRE,
    ];
  }

  function stopTests() {
    if (testTimer) {
      try {
        clearInterval(testTimer);
      } catch (e0) {}
      testTimer = null;
    }
    if (testTimeout) {
      try {
        clearTimeout(testTimeout);
      } catch (e1) {}
      testTimeout = null;
    }
    var pins = allTestPins();
    var i;
    for (i = 0; i < pins.length; i++) {
      try {
        pins[i].write(0);
      } catch (e2) {}
    }
    try {
      Pip.setBrightness(service.brightness());
    } catch (e3) {
      service.applyNow();
    }
    try {
      Pip.setTorch(!!Pip.torchOn);
    } catch (e4) {}
    if (service.state.down === 0) {
      try {
        if (Pip.checkChargeStatus) Pip.checkChargeStatus(true);
      } catch (e5) {}
    } else service.applyNow();
  }

  function testOne(pin) {
    stopTests();
    try {
      pin.write(1);
    } catch (e) {}
    testTimeout = setTimeout(function () {
      testTimeout = null;
      stopTests();
      if (!removed) drawTests();
    }, 900);
  }

  function runAll() {
    stopTests();
    var pins = allTestPins();
    var n = 0;
    testTimer = setInterval(function () {
      var i;
      for (i = 0; i < pins.length; i++) {
        try {
          pins[i].write(i === n ? 1 : 0);
        } catch (e) {}
      }
      n++;
      if (n >= pins.length) {
        clearInterval(testTimer);
        testTimer = null;
        testTimeout = setTimeout(function () {
          testTimeout = null;
          stopTests();
          if (!removed) drawTests();
        }, 500);
      }
    }, 500);
  }

  function exitApp() {
    if (removed) return;
    remove();
    try {
      if (Pip.CURRENT) Pip.CURRENT.fullscreen = false;
    } catch (e0) {}
    try {
      if (Pip.stopTimers) Pip.stopTimers();
    } catch (e1) {}
    try {
      if (Pip.startTimers) Pip.startTimers();
    } catch (e2) {}
    try {
      if (Pip.setWatches) Pip.setWatches();
    } catch (e3) {}
    try {
      if (Pip.emit) Pip.emit('mode', 1);
    } catch (e4) {}
    try {
      if (Pip.changeMenu) Pip.changeMenu();
    } catch (e5) {}
  }

  function selectMain() {
    var colorCount = COLORS.length;
    if (selected < colorCount) {
      service.state.color = selected;
      service.save();
      service.applyNow();
      sound('OK');
      drawMain();
      return;
    }
    if (selected === colorCount) {
      service.state.level += 0.25;
      if (service.state.level > 1.01) service.state.level = 0.25;
      service.save();
      service.applyNow();
      sound('OK2');
      drawMain();
      return;
    }
    if (selected === colorCount + 1) {
      service.state.down = (service.state.down + 1) % 3;
      service.save();
      service.applyNow();
      sound('OK2');
      drawMain();
      return;
    }
    if (selected === colorCount + 2) {
      screen = 'tests';
      selected = 0;
      sound('OK');
      drawTests();
      return;
    }
    if (selected === colorCount + 3) {
      sound('OK');
      service.resetAndUninstall();
      exitApp();
      return;
    }
    if (selected === colorCount + 4) {
      sound('OK');
      service.save();
      service.applyNow();
      exitApp();
    }
  }

  function selectTest() {
    var t = TESTS[selected];
    if (t.back) {
      stopTests();
      screen = 'main';
      selected = 0;
      drawMain();
    } else if (t.all) {
      sound('OK');
      runAll();
    } else {
      sound('CLICK');
      testOne(t.pin());
    }
  }

  function moveSelection(dir) {
    var len = screen === 'main' ? mainItems().length : TESTS.length;
    selected = (selected + (dir > 0 ? 1 : -1) + len) % len;
    sound('NEXT');
    if (screen === 'main') drawMain();
    else drawTests();
  }

  function onKnob2(dir) {
    if (!dir || removed) return;
    moveSelection(dir);
  }

  function onKnob1(dir) {
    if (removed) return;
    if (dir !== 0) {
      moveSelection(dir);
      return;
    }
    if (screen === 'main') selectMain();
    else selectTest();
  }

  function remove() {
    // Cleanup must be repeatable. Some Pip-Boy firmware builds cache the app
    // object and reuse it on the next launch. Never leave this instance locked
    // in a permanently removed state.
    removed = true;
    stopTests();
    try {
      Pip.removeListener('knob1', onKnob1);
    } catch (e0) {}
    try {
      Pip.removeListener('knob2', onKnob2);
    } catch (e1) {}
    try {
      h.setClipRect(0, 0, W - 1, H - 1);
    } catch (e2) {}
    service.save();
    service.applyNow();
    screen = 'main';
    selected = service.state.color;
    removed = false;
  }

  // Always restore a full drawable screen before the first frame.
  try {
    h.setClipRect(0, 0, W - 1, H - 1);
  } catch (eClip) {}
  try {
    h.setColor(3).setBgColor(0);
  } catch (eColor) {}

  try {
    Pip.onExclusive('knob1', onKnob1);
  } catch (e0) {
    try {
      Pip.on('knob1', onKnob1);
    } catch (e1) {}
  }
  try {
    Pip.onExclusive('knob2', onKnob2);
  } catch (e2) {
    try {
      Pip.on('knob2', onKnob2);
    } catch (e3) {}
  }

  drawMain();

  return {
    id: 'ledcolor',
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
