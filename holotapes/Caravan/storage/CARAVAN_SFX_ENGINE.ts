/*
 * CARAVAN - CARAVAN_SFX_ENGINE.JS
 * Indexed SFX bank reader and Volume Adjustment SFX preview engine.
 * Readable source only; installed runtime remains in the matching minified file.
 */
(function (api: CaravanFileApi): CaravanSfxModule {
  const fs = api.fs,
    basePath = api.basePath,
    bankPath = basePath + 'CARAVAN_SFX.BIN',
    indexPath = basePath + 'CARAVAN_SFX.IDX',
    previewPath = basePath + 'CARAVAN_SFX_PLAY.WAV';
  let removed = 0,
    previewTimer = 0,
    previewActive = 0,
    previewDoneCallback: CaravanPreviewCallback = 0;

  // --- SFX bank/index helpers ---
  function readUint32(data: string, offset: number): number {
    return (
      (data.charCodeAt(offset) & 255) +
      ((data.charCodeAt(offset + 1) & 255) << 8) +
      ((data.charCodeAt(offset + 2) & 255) << 16) +
      (data.charCodeAt(offset + 3) & 255) * 16777216
    );
  }

  function clearPreviewTimer(): void {
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = 0;
    }
  }

  function info(clipId: number, volumeLevel: number): [number, number] {
    if (removed) throw new Error('SFX ENGINE REMOVED');
    if (clipId < 0 || clipId > 5 || volumeLevel < 1 || volumeLevel > 15)
      throw new Error('SFX INDEX RANGE');
    let indexFile: EspruinoFile = 0 as never;
    try {
      indexFile = E.openFile(indexPath, 'r');
      if (!indexFile) throw new Error('SFX INDEX OPEN');
      indexFile.seek((clipId * 16 + volumeLevel) * 8);
      const indexRow = indexFile.read(8) as string;
      if (!indexRow || indexRow.length !== 8) throw new Error('SFX INDEX READ');
      const bankOffset = readUint32(indexRow, 0);
      const clipLength = readUint32(indexRow, 4);
      if (!clipLength || clipLength < 94) throw new Error('SFX INDEX EMPTY');
      if (indexFile.close) indexFile.close();
      indexFile = 0 as never;
      return [bankOffset, clipLength];
    } catch (error) {
      try {
        if (indexFile && indexFile.close) indexFile.close();
      } catch (closeError) {}
      throw error;
    }
  }

  // --- Bank payload access ---
  function readPayload(
    clipId: number,
    volumeLevel: number,
    startBlock?: number,
    blockCount?: number,
  ): string {
    const clipInfo = info(clipId, volumeLevel);
    const firstBlock = startBlock || 0;
    const payloadLength = clipInfo[1] - 94;
    const byteCount = blockCount
      ? blockCount * 256
      : payloadLength - firstBlock * 256;
    if (firstBlock < 0) throw new Error('SFX BLOCK START');
    if (byteCount <= 0 || firstBlock * 256 + byteCount > payloadLength)
      throw new Error('SFX BLOCK RANGE');
    let bankFile: EspruinoFile = 0 as never;
    try {
      bankFile = E.openFile(bankPath, 'r');
      if (!bankFile) throw new Error('SFX BANK OPEN');
      bankFile.seek(clipInfo[0] + 94 + firstBlock * 256);
      const payloadData = bankFile.read(byteCount) as string;
      if (!payloadData || payloadData.length !== byteCount)
        throw new Error('SFX BANK READ');
      if (bankFile.close) bankFile.close();
      bankFile = 0 as never;
      return payloadData;
    } catch (error) {
      try {
        if (bankFile && bankFile.close) bankFile.close();
      } catch (closeError) {}
      throw error;
    }
  }

  // --- Preview-file construction ---
  function copyPreview(clipId: number, volumeLevel: number): [number, number] {
    const clipInfo = info(clipId, volumeLevel);
    let inputFile: EspruinoFile = 0 as never,
      outputFile: EspruinoFile = 0 as never,
      bytesRemaining = clipInfo[1];
    try {
      inputFile = E.openFile(bankPath, 'r');
      if (!inputFile) throw new Error('SFX BANK OPEN');
      outputFile = E.openFile(previewPath, 'w');
      if (!outputFile) throw new Error('SFX PREVIEW OPEN');
      inputFile.seek(clipInfo[0]);
      while (bytesRemaining > 0) {
        const chunk = inputFile.read(
          bytesRemaining > 1024 ? 1024 : bytesRemaining,
        );
        if (!chunk || !chunk.length) throw new Error('SFX PREVIEW READ');
        if (outputFile.write(chunk) !== chunk.length)
          throw new Error('SFX PREVIEW WRITE');
        bytesRemaining -= chunk.length;
      }
      if (inputFile.close) inputFile.close();
      inputFile = 0 as never;
      if (outputFile.close) outputFile.close();
      outputFile = 0 as never;
    } catch (error) {
      try {
        if (inputFile && inputFile.close) inputFile.close();
      } catch (closeError) {}
      try {
        if (outputFile && outputFile.close) outputFile.close();
      } catch (closeError) {}
      throw error;
    }
    return clipInfo;
  }

  function previewDuration(clipInfo: [number, number]): number {
    const adpcmBlocks = Math.floor((clipInfo[1] - 94) / 256);
    return Math.ceil(adpcmBlocks * 31.5625) + 120;
  }

  function finishPreview(): void {
    const doneCallback = previewDoneCallback;
    previewTimer = 0;
    previewActive = 0;
    previewDoneCallback = 0;
    if (doneCallback) doneCallback();
  }

  // --- Preview playback ---
  function startPreview(
    clipId: number,
    volumeLevel: number,
    onStart?: CaravanPreviewCallback,
    onDone?: CaravanPreviewCallback,
  ): number {
    stopPreview();
    if (removed || volumeLevel <= 0) return 0;
    try {
      const clipInfo = copyPreview(clipId, volumeLevel);
      previewDoneCallback = onDone || 0;
      Pip.audioStart(previewPath);
      previewActive = 1;
      if (onStart) onStart();
      previewTimer = setTimeout(finishPreview, previewDuration(clipInfo));
      return 1;
    } catch (error) {
      previewDoneCallback = 0;
      previewActive = 0;
      clearPreviewTimer();
      try {
        Pip.audioStop();
      } catch (stopError) {}
      return 0;
    }
  }

  // --- Preview cleanup ---
  function stopPreview(): void {
    const hadPreview = previewActive || previewTimer;
    clearPreviewTimer();
    if (hadPreview) {
      try {
        Pip.audioStop();
      } catch (error) {}
    }
    previewActive = 0;
    previewDoneCallback = 0;
  }

  function remove(): void {
    if (removed) return;
    stopPreview();
    removed = 1;
  }
  return {
    info: info,
    readPayload: readPayload,
    startPreview: startPreview,
    stopPreview: stopPreview,
    isPreviewing: function (): number {
      return previewActive ? 1 : 0;
    },
    bankPath: bankPath,
    remove: remove,
  };
});
