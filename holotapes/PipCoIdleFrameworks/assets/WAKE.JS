(function() {
  const fs = require("fs"),
    basePath = "HOLO/FALLOUT_SCREENSAVER/";

  if (!global.__PipCoIdleSessionV120) {
    try {
      fs.writeFileSync(basePath + "CONFIG.JSON", '{"enabled":0,"mesEnabled":0,"mesFile":""}');
    } catch (error) {
      // Cold-session safety still disables the framework in memory.
    }
    global.__PipCoIdleSessionV120 = 1;
    return 0;
  }

  let idleTimer = 0,
    active = 1,
    listenerMask = 0,
    existingWake = global.__PipCoIdleWake;

  function ignoreError(message) {}

  function loadIdleMode() {
    try {
      let savedConfig = JSON.parse(fs.readFileSync(basePath + "CONFIG.JSON"));
      if (savedConfig.enabled) return 1;
      if (savedConfig.mesEnabled && savedConfig.mesFile) {
        if (savedConfig.mesFile === "@PIPQUARIUM") return 2;
        return 1;
      }
    } catch (error) {
      return 0;
    }
    return 0;
  }

  function detachActivityListeners() {
    if (listenerMask & 1) {
      Pip.removeListener("mode", onActivity);
      listenerMask &= ~1;
    }
    if (listenerMask & 2) {
      Pip.removeListener("menuX", onActivity);
      listenerMask &= ~2;
    }
  }

  function attachActivityListeners() {
    detachActivityListeners();
    Pip.on("mode", onActivity);
    listenerMask |= 1;
    try {
      Pip.on("menuX", onActivity);
      listenerMask |= 2;
    } catch (error) {
      detachActivityListeners();
      throw error;
    }
  }

  function scheduleIdleCheck() {
    if (!active) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(onIdleTimeout, 120000);
  }

  function onActivity() {
    scheduleIdleCheck();
  }

  function shouldDeferIdle() {
    try {
      if (Pip.sleeping || Pip.menuChanging) return 1;
      if (Pip.CURRENT && Pip.CURRENT.notDefault) return 1;
      if (Pip.MODE === 2 && Pip.MENUX === 0) return 1;
    } catch (error) {
      return 1;
    }
    return 0;
  }

  function destroyWake() {
    if (!active) return;
    active = 0;
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = 0;
    }
    detachActivityListeners();
    if (global.__PipCoIdleWake === wakeApi) global.__PipCoIdleWake = undefined;
    process.memory(true);
  }

  function onIdleTimeout() {
    let idleMode;
    idleTimer = 0;
    if (!active) return;
    idleMode = loadIdleMode();
    if (!idleMode) {
      destroyWake();
      return;
    }
    if (shouldDeferIdle()) {
      scheduleIdleCheck();
      return;
    }

    detachActivityListeners();
    try {
      if (typeof Pip.loadHolotape !== "function") {
        throw new Error("Pip.loadHolotape unavailable");
      }
      E.defrag();
      if (idleMode === 2) {
        fs.writeFileSync(basePath + "PIPQMODE.CFG", "0");
        Pip.loadHolotape(basePath + "PIPQRUN.JS");
      } else {
        Pip.loadHolotape(basePath + "IDLE.JS");
      }
    } catch (error) {
      ignoreError("runner load failed: " + error);
      if (active) {
        try {
          attachActivityListeners();
          scheduleIdleCheck();
        } catch (attachError) {
          ignoreError("wake listener restore failed: " + attachError);
          destroyWake();
        }
      }
    }
  }

  if (existingWake && existingWake.destroy) {
    try {
      existingWake.destroy();
    } catch (error) {
      ignoreError("existing wake cleanup failed: " + error);
    }
  }
  existingWake = undefined;

  const wakeApi = {
    version: "1.2.0",
    destroy: destroyWake,
    touch: onActivity
  };
  global.__PipCoIdleWake = wakeApi;

  if (!loadIdleMode()) {
    destroyWake();
    return 0;
  }

  try {
    attachActivityListeners();
  } catch (error) {
    ignoreError("wake listener attach failed: " + error);
    destroyWake();
    return 0;
  }
  scheduleIdleCheck();
  return wakeApi;
});
