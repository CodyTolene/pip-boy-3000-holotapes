(function (idleService, mesmetronPath, fs, ignoreError, fileName) {
  let sourceCode = 0,
    mesmetronFactory = 0,
    mesmetronModule,
    frameTimer = 0;

  function removeMesmetron() {
    if (frameTimer) {
      clearInterval(frameTimer);
      frameTimer = 0;
    }
    if (mesmetronModule && typeof mesmetronModule.remove === 'function') {
      try {
        mesmetronModule.remove();
      } catch (error) {
        ignoreError('Mesmetron cleanup failed: ' + error);
      }
    }
    mesmetronModule = undefined;
    h.reset().setClipRect(0, 0, 479, 319);
    process.memory(true);
    E.defrag();
  }

  function drawFrame() {
    'ram';
    if (!idleService.active || !mesmetronModule) return;
    try {
      mesmetronModule.draw(h);
      h.flip();
      Pip.lastFlip = getTime();
    } catch (error) {
      ignoreError('Mesmetron draw failed: ' + error);
      idleService.stop(1);
    }
  }

  process.memory(true);
  E.defrag();
  try {
    sourceCode = fs.readFileSync(mesmetronPath + fileName);
    mesmetronFactory = eval(sourceCode);
    sourceCode = 0;
    mesmetronModule = mesmetronFactory();
    mesmetronFactory = 0;
    if (
      !mesmetronModule ||
      typeof mesmetronModule.init !== 'function' ||
      typeof mesmetronModule.draw !== 'function'
    ) {
      throw new Error('Invalid Mesmetron module: ' + fileName);
    }
    mesmetronModule.init(0);
    if (typeof mesmetronModule.remove === 'function') mesmetronModule.remove();
    if (idleService.preview && idleService.claimInputs)
      idleService.claimInputs();
    h.reset().setClipRect(0, 0, 479, 319).clear();
  } catch (error) {
    sourceCode = mesmetronFactory = 0;
    ignoreError('Mesmetron ' + fileName + ' failed: ' + error);
    removeMesmetron();
    return;
  }

  drawFrame();
  frameTimer = setInterval(drawFrame, 40);
  return { stop: removeMesmetron };
});
