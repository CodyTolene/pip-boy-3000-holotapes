(function () {
  // MESMETRON launcher.
  //
  // Each screensaver lives in its own file (web.js, ribbon.js, warp.js,
  // vortex.js, bouncer.js, matrix.js, etc.) plus a menu screen (TITLE.JS).
  // This file loads them from disk on demand via eval(require("fs").readFileSync),
  // the documented pattern for external code files - there's no ES module
  // import/export in this environment. Only the currently active
  // screensaver's code is ever resident in memory; switching modes drops the
  // old one and loads the new one fresh.
  //
  // Input ownership: this launcher only listens for a LONG press of knob1,
  // which always returns to the title/menu. Every other knob1/knob2
  // interaction (short press, rotation) is registered and handled by the
  // active screensaver module itself (see its init()/remove()), so each
  // module stays fully self-contained and can be reused by other holotapes
  // without this launcher dictating its controls. Because this launcher's
  // knob1 listener has to coexist alongside each module's own knob1
  // listener, it's registered with Pip.on rather than Pip.onExclusive - see
  // agents2.md 3.6 ("Use Pip.on only when you need multiple handlers on the
  // same input").
  //
  // Menu audio: wild.wav loops for as long as we're sitting on the title
  // screen (both on initial boot and whenever a long knob1 press backs out
  // of a screensaver), and is stopped the instant a screensaver is launched
  // so it never plays underneath one.
  const BASE_PATH = 'HOLO/MESMETRON/';
  const FRAME_MS = 40;

  // Save the original scan effect state to properly restore it on exit
  const originalNoScan = Pip.blitOptions.noScanEffect;

  // Attempt to disable just the scanline effect globally for this app
  Pip.blitOptions.noScanEffect = true;

  let mode = 0;
  let inMenu = 1,
    menuDirty = 1;
  let currentModule = null,
    titleModule = null;

  function loadModule(filename) {
    return eval(require('fs').readFileSync(BASE_PATH + filename))();
  }

  Pip.setBrightness(1.0);

  function menuInput(dir) {
    if (dir) {
      titleModule.move(dir);
      menuDirty = 1;
      Pip.playSound('SCROLL');
    } else {
      const idx = titleModule.getSelected();
      try {
        const mod = loadModule(titleModule.items[idx].file);
        Pip.audioStop();
        mod.init(0);
        mode = idx;
        currentModule = mod;
        inMenu = 0;
        h.clear();
        Pip.playSound('SELECT');
      } catch (err) {
        Pip.errorBox(err);
        menuDirty = 1;
      }
    }
  }

  function onKnob1(dir, long) {
    'ram';
    if (inMenu) {
      menuInput(dir);
      return;
    }
    if (dir === 0 && long) {
      currentModule.remove();
      currentModule = null;
      inMenu = 1;
      menuDirty = 1;
      titleModule.repaint();
      Pip.audioStart(BASE_PATH + 'wild.wav', { repeat: true });
      Pip.playSound('TAB');
    }
    // Any other knob1 event while a screensaver is active (short press,
    // rotation) belongs to that module's own listener, not this launcher.
  }

  function onKnob2(dir) {
    'ram';
    if (inMenu) {
      menuInput(dir);
    }
    // knob2 is entirely owned by the active screensaver module once one is
    // loaded - this launcher no longer reacts to it at all.
  }

  function onFrame() {
    'ram';
    if (inMenu) {
      if (menuDirty) {
        titleModule.draw(h);
        h.flip();
        Pip.lastFlip = getTime();
        menuDirty = 0;
      }
      return;
    }
    currentModule.draw(h);
    h.flip();
    Pip.lastFlip = getTime();
  }

  Pip.on('knob1', onKnob1);
  Pip.on('knob2', onKnob2);
  h.clear();
  titleModule = loadModule('TITLE.JS');
  titleModule.init(0);
  Pip.audioStart(BASE_PATH + 'wild.wav', { repeat: true });
  const frameInterval = setInterval(onFrame, FRAME_MS);

  return {
    id: 'MESMETRON',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      clearInterval(frameInterval);
      if (currentModule) currentModule.remove();
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      Pip.setBrightness(1.0);
      Pip.audioStop();
      h.clear();

      // Restore OS screen effects
      if (originalNoScan !== undefined) {
        Pip.blitOptions.noScanEffect = originalNoScan;
      } else {
        delete Pip.blitOptions.noScanEffect;
      }
    },
  };
});
