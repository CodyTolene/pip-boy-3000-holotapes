/* HAMCO LOCK - shared service factory.
 *
 * Eval this file and CALL the result to get installService():
 *     let installService = eval(fs.readFileSync('HOLO/HAMCOLOCK/SERVICE.JS'))();
 *     let svc = installService();          // arms the lock, returns the service
 *
 * installService() is idempotent: if global.HAMCO_LOCK_SERVICE already exists it
 * returns it without re-wrapping Pip.wakeUp. APP.JS evals this single copy of the
 * lock logic.
 *
 * First-run behaviour: if HOLO/HAMCOLOCK/LOCK.JSON has configured !== true, the
 * lock routes to HOLO/HAMCOLOCK/SETPIN.JS (CREATE ACCESS CODE) instead of the auth
 * screen, so the user sets their own PIN on first use. The old 4769 default is
 * never accepted.
 *
 * Single-folder layout: every file (JS, G.AVI, A.WAV, faction *.BIN, LOCK.JSON)
 * lives together in HOLO/HAMCOLOCK/ on the card. Only APPINFO/HAMCOLOCK.info sits
 * outside it.
 */
(function () {
  let fs = require('fs');

  let CFG = 'HOLO/HAMCOLOCK/LOCK.JSON';
  let LOCK = 'HOLO/HAMCOLOCK/LOCK.JS';
  let SET = 'HOLO/HAMCOLOCK/SETTINGS.JS';
  let SETPIN = 'HOLO/HAMCOLOCK/SETPIN.JS';

  function installService() {
    if (global.HAMCO_LOCK_SERVICE) return global.HAMCO_LOCK_SERVICE;

    let active = 0,
      pending = '',
      poll = 0,
      stable = 0,
      forcedWake = false,
      dead = false,
      originalWake = Pip.wakeUp,
      originalBoot = Pip.bootAnimation,
      bootSeen = false,
      bootClear = 0,
      pristineChange = Pip.changeMenu,
      pristineLoad = Pip.loadMenu;

    function validPin(pin) {
      if (typeof pin !== 'string' || pin.length !== 4) return false;
      for (let i = 0; i < 4; i++) {
        let code = pin.charCodeAt(i);
        if (code < 48 || code > 57) return false;
      }
      return true;
    }

    function validFaction(f) {
      return (
        'interstate80 ham legion enclave ncr ncrseal redtalon fiends vangraffs vaulttec brotherhood enclave1 gunners operators kings bigmt tunnelsnakes atomcats greatkhans followers responders vipers rangers mothman whiteglove smugglers'
          .split(' ')
          .indexOf(f) >= 0
      );
    }

    function loadConfig() {
      let cfg = { m: 'startup', p: '4769', f: 'vaulttec', configured: false };
      try {
        let saved = JSON.parse(fs.readFileSync(CFG)),
          mode = saved && (saved.m || saved.mode),
          pin = saved && (saved.p || saved.pin),
          faction = saved && (saved.f || saved.faction);
        if (
          mode === 'startup' ||
          mode === 'sleep' ||
          mode === 'both' ||
          mode === 'off'
        )
          cfg.m = mode;
        if (validPin(pin)) cfg.p = pin;
        if (validFaction(faction)) cfg.f = faction;
        if (saved && saved.configured === true) cfg.configured = true;
      } catch (e) {}
      return cfg;
    }

    function saveConfig(cfg) {
      try {
        fs.writeFileSync(CFG, JSON.stringify(cfg));
        return true;
      } catch (e) {
        return false;
      }
    }

    function collect() {
      /* This firmware exposes no gc(); Espruino reclaims automatically. Kept as a
         single call site so memory handling stays in one place. */
    }

    function openNormal(restartTimers) {
      setTimeout(function () {
        try {
          Pip.changeMenu();
        } catch (e) {
          try {
            Pip.emit('mode', Pip.MODE, true);
          } catch (e2) {}
        }
        if (restartTimers)
          try {
            if (Pip.startTimers) Pip.startTimers();
          } catch (e3) {}
        collect();
      }, 0);
    }

    function moduleDone(action) {
      active = 0;
      collect();
      /* No E.defrag() here: it can stall for 100s of ms and would delay the
         normal screen right after an unlock. loadModule() already defrags before
         the next module loads, which is when compaction actually matters. */
      if (dead) return;
      if (action === 'SETTINGS') return openSettings();
      if (action === 'OPENV') return openNormal(true);
      if (action === 'OPEN') return openNormal(false);
      if (
        action === 'REMOVED' &&
        (Pip.sleeping === true || typeof Pip.sleeping === 'string')
      )
        forcedWake = true;
    }

    function loadModule(path, args) {
      if (active || dead) return;
      /* Drop any menu patch a prior CRASHED module left installed, so its whole
         closure becomes unreferenced and can be reclaimed below instead of
         accumulating across crashes. */
      try {
        if (pristineChange && Pip.changeMenu !== pristineChange)
          Pip.changeMenu = pristineChange;
      } catch (epc) {}
      try {
        if (pristineLoad && Pip.loadMenu !== pristineLoad)
          Pip.loadMenu = pristineLoad;
      } catch (epl) {}
      /* Recover the display if a crashed module left video/blit state behind
         (symptom: black screen when the next lock screen loads). */
      try {
        if (Pip.videoStop) Pip.videoStop();
      } catch (ev) {}
      try {
        if (Pip.blitOptions) {
          Pip.blitOptions.anim = [];
          delete Pip.blitOptions.disable;
        }
      } catch (ebo) {}
      /* Free the OUTGOING app/UI *before* the eval, not after. On wake the
         firmware fully rebuilds the normal watch UI, then we eval the ~13KB lock
         on top of it -- that combined peak was the LOW_MEMORY/MEMORY crash (a
         hard watchdog reboot, so no JS catch can recover it). The lock module
         calls Pip.remove() itself, but only after it has loaded; doing it here
         first hands the eval the maximum contiguous RAM. */
      try {
        if (Pip.remove) Pip.remove();
      } catch (erm) {}
      /* Defrag before eval-loading a module: a prior crash can leave RAM
         fragmented, which shows up as a "memory error" here (e.g. re-entering
         set-PIN). gc()+E.defrag() reclaim and compact free space first. */
      try {
        if (typeof E !== 'undefined' && E.defrag) E.defrag();
      } catch (edf) {}
      let source = 0,
        factory = 0;
      try {
        source = fs.readFileSync(path);
        factory = eval(source);
        source = 0;
        active = factory.apply(null, args);
        factory = 0;
        collect();
      } catch (e) {
        active = 0;
        source = factory = 0;
        /* A failed or partial load (e.g. an out-of-memory part way through the
           eval) can leave the menu functions patched, the knobs grabbed
           exclusively and the screen blanked -- the symptom is a black, frozen
           Pip-Boy that needs a force reboot. Undo all of that here so the normal
           UI comes back on its own instead of the user being stuck. */
        try {
          if (pristineChange && Pip.changeMenu !== pristineChange)
            Pip.changeMenu = pristineChange;
        } catch (er1) {}
        try {
          if (pristineLoad && Pip.loadMenu !== pristineLoad)
            Pip.loadMenu = pristineLoad;
        } catch (er2) {}
        try {
          if (Pip.videoStop) Pip.videoStop();
        } catch (er3) {}
        try {
          if (Pip.blitOptions) {
            Pip.blitOptions.anim = [];
            delete Pip.blitOptions.disable;
          }
        } catch (er4) {}
        /* Drop any exclusive knob grab the dead module left behind; changeMenu
           (via openNormal) re-binds the menu's own handlers below. */
        try {
          Pip.removeAllListeners('knob1');
          Pip.removeAllListeners('knob2');
        } catch (er5) {}
        collect();
        try {
          if (typeof E !== 'undefined' && E.defrag) E.defrag();
        } catch (er6) {}
        openNormal(true);
      }
    }

    function startLock(reason) {
      let cfg = loadConfig();
      /* First run: force PIN creation instead of the auth / default password. */
      if (!cfg.configured) {
        loadModule(SETPIN, [cfg, saveConfig, moduleDone, reason]);
        return;
      }
      loadModule(LOCK, [cfg, reason, moduleDone]);
    }

    function openSettings() {
      let cfg = loadConfig();
      loadModule(SET, [cfg, saveConfig, moduleDone]);
    }

    function ready() {
      try {
        return (
          Pip.running === true && Pip.sleeping === false && !Pip.menuChanging
        );
      } catch (e) {
        return false;
      }
    }

    function stopWait() {
      if (poll) clearInterval(poll);
      if (stable) clearTimeout(stable);
      poll = stable = 0;
    }

    function check() {
      if (!pending || active || dead) return stopWait();
      if (!ready()) {
        if (stable) clearTimeout(stable);
        stable = 0;
        return;
      }
      if (stable) return;
      stable = setTimeout(function () {
        stable = 0;
        if (!pending || active || dead) return stopWait();
        if (!ready()) return;
        let reason = pending;
        pending = '';
        stopWait();
        startLock(reason);
      }, 180);
    }

    function request(reason) {
      if (active || dead) return;
      /* Holding POWER to turn on fires a wake DURING the cold boot. Don't let
         that wake downgrade a pending boot lock (STARTUP) to a plain WAKE --
         that was dropping the 8s logo intro on reboot. STARTUP always wins. */
      if (pending === 'STARTUP' && reason === 'WAKE') return;
      pending = reason;
      if (!poll) poll = setInterval(check, 120);
      check();
      setTimeout(function () {
        if (pending && !active && !dead) {
          let reason = pending;
          pending = '';
          stopWait();
          startLock(reason);
        }
      }, 1800);
    }

    function bootWrapper() {
      /* Pip.bootAnimation() runs ONLY during a real startup (the long-press boot
         wake and a cold boot), never on a quick sleep wake -- that makes it a
         reliable "this is a startup" signal. Flag it so wakeWrapper can tell a
         startup from a sleep wake. The timer clears the flag if a bootAnimation
         ever fires without a following wakeUp (e.g. a true cold boot) so it
         can't leak into the next sleep wake. */
      bootSeen = true;
      if (bootClear) clearTimeout(bootClear);
      bootClear = setTimeout(function () {
        bootSeen = false;
        bootClear = 0;
      }, 4000);
      return originalBoot ? originalBoot.apply(Pip, arguments) : undefined;
    }

    function wakeWrapper() {
      /* Run the real wake first; on a startup wake it calls Pip.bootAnimation()
         (our bootWrapper), which sets bootSeen. So AFTER originalWake, bootSeen
         tells a startup apart from a quick sleep wake. Mode then means:
           startup -> lock ONLY on the startup wake (with the logo intro)
           sleep   -> lock ONLY on the quick sleep wake (straight to the login)
           both    -> lock on either (the logo intro only on the startup wake). */
      let result = originalWake.apply(Pip, arguments);
      let isStartup = bootSeen;
      bootSeen = false;
      if (bootClear) {
        clearTimeout(bootClear);
        bootClear = 0;
      }
      let cfg = loadConfig();
      let lock = false,
        withIntro = false;
      if (cfg.m === 'both') {
        lock = true;
        withIntro = isStartup;
      } else if (cfg.m === 'startup') {
        lock = isStartup;
        withIntro = true;
      } else if (cfg.m === 'sleep') {
        lock = !isStartup;
        withIntro = false;
      }
      if (forcedWake) {
        lock = true;
        withIntro = false;
        forcedWake = false;
      }
      if (lock) request(withIntro ? 'STARTUP' : 'WAKE');
      return result;
    }

    function onLongPress(button) {
      if (button !== 'DATA' || active || dead || Pip.sleeping !== false) return;
      try {
        if (typeof BTN_STATS !== 'undefined' && BTN_STATS.read()) return;
      } catch (e) {}
      startLock('SETTINGS');
    }

    function removeService() {
      dead = true;
      pending = '';
      stopWait();
      try {
        Pip.removeListener('longPress', onLongPress);
      } catch (e) {}
      if (Pip.wakeUp === wakeWrapper) Pip.wakeUp = originalWake;
      if (Pip.bootAnimation === bootWrapper) Pip.bootAnimation = originalBoot;
      if (bootClear) {
        clearTimeout(bootClear);
        bootClear = 0;
      }
      if (active && active.remove) active.remove();
      active = 0;
      try {
        delete global.HAMCO_LOCK_SERVICE;
      } catch (e) {
        global.HAMCO_LOCK_SERVICE = undefined;
      }
      collect();
    }

    function closeUI() {
      if (active && active.remove) {
        try {
          active.remove();
        } catch (e) {}
      }
      active = 0;
      collect();
    }

    Pip.wakeUp = wakeWrapper;
    if (typeof originalBoot === 'function') Pip.bootAnimation = bootWrapper;
    Pip.on('longPress', onLongPress);

    global.HAMCO_LOCK_SERVICE = {
      remove: removeService,
      lock: function () {
        request('WAKE');
      },
      settings: function () {
        if (active) return;
        /* If a lock is already configured, the SET LOCK tape goes straight to
           the settings menu. Only a fresh card routes to CREATE ACCESS CODE. */
        if (loadConfig().configured) openSettings();
        else startLock('SETTINGS');
      },
      /* NOTE: the holotape never calls this. It already tells startup from sleep
         on WAKE via the Pip.bootAnimation hook (bootWrapper) -- hold-power->boot
         reads as startup, a quick press reads as sleep -- so both modes work
         while the tape's RAM patch is live. This method is ONLY for a true cold
         power-on (RAM patch gone, no Pip.wakeUp fires), where an optional
         cold-boot loader must trigger the lock. It locks now if mode is
         startup/both, or routes a fresh card to CREATE ACCESS CODE. */
      startup: function () {
        if (active) return;
        let cfg = loadConfig();
        if (!cfg.configured || cfg.m === 'startup' || cfg.m === 'both')
          request('STARTUP');
      },
      closeUI: closeUI,
      isBusy: function () {
        return !!active;
      },
      mode: function () {
        return loadConfig().m;
      },
    };

    return global.HAMCO_LOCK_SERVICE;
  }

  return installService;
});
