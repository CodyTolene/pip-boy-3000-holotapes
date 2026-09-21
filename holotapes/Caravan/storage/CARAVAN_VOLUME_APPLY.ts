/*
 * CARAVAN - CARAVAN_VOLUME_APPLY.JS
 * Temporary music-volume patcher used before game launch.
 * Readable source only; installed runtime remains in the matching minified file.
 */
(function (api: CaravanVolumeApplyApi): CaravanVolumeApplyModule {
  const fs = api.fs,
    basePath = api.basePath,
    headerStride = 2436,
    dataOffset = 94,
    blockCount = 812,
    blockAlign = 1024,
    onsetOffset = headerStride * 16,
    onsetBlock = 3,
    writesPerStep = 16,
    frameMs = 100;

  // --- Temporary full-track volume application ---
  function apply(done: (ok: number) => void): number {
    let config = '',
      target = 0,
      applied = 15,
      levelFile: EspruinoFile = 0 as never,
      musicFile: EspruinoFile = 0 as never,
      headers: string = 0 as never,
      onset: string = 0 as never,
      oldUnsync = 0,
      unsyncSet = 0,
      phase = 0,
      block = 0,
      timer = 0,
      finished = 0;
    function drawFrame(): void {
      const dots = phase === 0 ? '.' : phase === 1 ? '..' : '...';
      h.clear()
        .setColor(3)
        .setFontMonofonto16()
        .setFontAlign(0, -1)
        .drawString('RE-ADJUSTING VOLUME' + dots, 240, 146)
        .setFontAlign(-1, -1);
      h.flip();
      Pip.lastFlip = getTime();
      phase = (phase + 1) % 3;
    }
    function finish(ok: number | boolean): void {
      if (finished) return;
      finished = 1;
      if (timer) {
        clearTimeout(timer);
        timer = 0;
      }
      try {
        if (levelFile && levelFile.close) levelFile.close();
      } catch (closeError) {}
      try {
        if (musicFile && musicFile.close) musicFile.close();
      } catch (closeError) {}
      levelFile = musicFile = 0 as never;
      if (unsyncSet) {
        try {
          E.setFlags({
            unsyncFiles: oldUnsync,
          });
        } catch (flagError) {}
        unsyncSet = 0;
      }
      if (ok) {
        try {
          fs.writeFileSync(
            basePath + 'VOLUME_SOUND.CFG',
            config.substr(0, 8) +
              '0123456789ABCDEF'.charAt(target) +
              (config.length > 9 ? config.substr(9) : ''),
          );
        } catch (writeError) {
          ok = 0;
        }
      }
      headers = onset = config = 0 as never;
      if (done) done(ok ? 1 : 0);
    }
    function step(): void {
      let stepStart = getTime(),
        stepEnd;
      timer = 0;
      if (finished) return;
      drawFrame();
      stepEnd = Math.min(block + writesPerStep, blockCount);
      try {
        while (block < stepEnd) {
          musicFile.seek(dataOffset + block * blockAlign);
          if (musicFile.write(headers.substr(block * 3, 3)) !== 3)
            throw new Error('MUSIC WRITE');
          block++;
        }
        if (block < blockCount) {
          let delay = frameMs - (getTime() - stepStart) * 1000;
          if (delay < 1) delay = 1;
          timer = setTimeout(step, delay);
          return;
        }
        musicFile.seek(dataOffset + onsetBlock * blockAlign);
        if (musicFile.write(onset) !== blockAlign)
          throw new Error('MUSIC ONSET');
        finish(1);
      } catch (error) {
        finish(0);
      }
    }
    try {
      config = fs.readFileSync(basePath + 'VOLUME_SOUND.CFG') || '';
      if (config.length < 8 || config.charAt(6) !== '1') return 1;
      target = parseInt(config.charAt(7), 16);
      if (isNaN(target) || target <= 0) return 1;
      if (target > 15) target = 15;
      if (config.length >= 9) {
        applied = parseInt(config.charAt(8), 16);
        if (isNaN(applied) || applied < 1 || applied > 15) applied = 15;
      }
      if (target === applied) return 1;
      levelFile = E.openFile(basePath + 'CARAVAN_VOLUME.BIN', 'r');
      if (!levelFile) return 0;
      levelFile.seek(target * headerStride);
      headers = levelFile.read(headerStride) as string;
      levelFile.seek(onsetOffset + target * blockAlign);
      onset = levelFile.read(blockAlign) as string;
      if (levelFile.close) levelFile.close();
      levelFile = 0 as never;
      if (
        !headers ||
        headers.length !== headerStride ||
        !onset ||
        onset.length !== blockAlign
      )
        return 0;
      musicFile = E.openFile(basePath + 'LAZY_DAYZ-TIRED.WAV', 'r+');
      if (!musicFile) return 0;
      try {
        oldUnsync = E.getFlags().unsyncFiles ? 1 : 0;
        E.setFlags({
          unsyncFiles: 1,
        });
        unsyncSet = 1;
      } catch (error) {}
      step();
      return 2;
    } catch (error) {
      finish(0);
      return 0;
    }
  }
  return {
    apply: apply,
  };
});
