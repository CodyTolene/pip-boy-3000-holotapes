(function () {
  const fs = require('fs'),
    basePath = 'HOLO/STARTUP_ANIMATIONS/',
    selectionPath = basePath + 'SELECT.JSON';

  if (!global.__PipCoStartupSessionV214) {
    try {
      fs.writeFileSync(selectionPath, '{"startup":-1}');
    } catch (error) {
      // Cold-session safety still falls back to stock if the SD write fails.
    }
    global.__PipCoStartupSessionV214 = 1;
    return 0;
  }
  if (global.__PipCoStartupRuntimeV210 || global.__PipCoStartupWakeV210)
    return 0;

  let retryTimer = 0,
    cancelled = 0;

  function cancelWake(): void {
    if (cancelled) return;
    cancelled = 1;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = 0;
    }
    if (global.__PipCoStartupWakeV210 === wakeApi) {
      global.__PipCoStartupWakeV210 = undefined;
    }
  }

  function loadRuntime(): void {
    let sourceCode: string | 0 = 0,
      runtimeFactory: (() => void) | 0 = 0;
    if (cancelled) return;
    try {
      if (Pip.CURRENT && Pip.CURRENT.notDefault) {
        retryTimer = setTimeout(loadRuntime, 800);
        return;
      }
    } catch (error) {
      retryTimer = setTimeout(loadRuntime, 800);
      return;
    }

    try {
      process.memory(true);
      E.defrag();
      sourceCode = fs.readFileSync(basePath + 'STARTUP_RUNTIME.JS');
      runtimeFactory = eval(sourceCode) as () => void;
      sourceCode = 0;
      runtimeFactory();
      runtimeFactory = 0;
      process.memory(true);
    } catch (error) {
      sourceCode = runtimeFactory = 0;
    }
    cancelWake();
  }

  const wakeApi = { cancel: cancelWake };
  global.__PipCoStartupWakeV210 = wakeApi;
  retryTimer = setTimeout(loadRuntime, 800);
  return wakeApi;
});
