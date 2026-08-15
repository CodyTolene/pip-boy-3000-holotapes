(function (idleService, mesmetronPath, fs, h, log, fileName) {
  let mesmetronModule, frameTimer;

  idleService.detachInputs();
  E.defrag();

  try {
    mesmetronModule = eval(fs.readFileSync(mesmetronPath + fileName))();

    if (
      !mesmetronModule ||
      typeof mesmetronModule.init !== 'function' ||
      typeof mesmetronModule.draw !== 'function'
    ) {
      throw new Error('Invalid Mesmetron module: ' + fileName);
    }

    mesmetronModule.init(0);

    /* Mesmetron modules use remove() here only to unregister their native knob
     handlers. Their renderer state remains alive while PIP-CO owns wake/exit. */
    if (typeof mesmetronModule.remove === 'function') mesmetronModule.remove();

    if (idleService.preview && idleService.claimInputs) {
      idleService.claimInputs();
    }

    h.reset().setClipRect(0, 0, 479, 319).clear();
  } catch (e) {
    log('Mesmetron ' + fileName + ' failed: ' + e);
    try {
      if (mesmetronModule && typeof mesmetronModule.remove === 'function') {
        mesmetronModule.remove();
      }
    } catch (cleanupError) {}
    mesmetronModule = undefined;
    return;
  }

  function drawFrame() {
    'ram';
    if (!idleService.active || !mesmetronModule) return;

    try {
      mesmetronModule.draw(h);
      h.flip();
      Pip.lastFlip = getTime();
    } catch (e) {
      log('Mesmetron draw failed: ' + e);
      idleService.stop(1);
    }
  }

  drawFrame();
  frameTimer = setInterval(drawFrame, 40);

  return {
    stop: function () {
      if (frameTimer) {
        clearInterval(frameTimer);
        frameTimer = undefined;
      }

      try {
        if (mesmetronModule && typeof mesmetronModule.remove === 'function') {
          mesmetronModule.remove();
        }
      } catch (e) {}

      mesmetronModule = undefined;
      h.reset().setClipRect(0, 0, 479, 319);
    },
  };
});
