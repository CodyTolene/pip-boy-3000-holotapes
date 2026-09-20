// =============================================================================
//  Name: Piptris
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app: PiptrisApp) {
  // Config
  const C = {
    debug: false,
    colors: [0, 1, 2, 3], // black, low, mid, high
    blockSize: 15,
    startSpeed: 800,
    fastSpeed: 80,
    linesPerLevel: 10,
    minimumSpeed: 100,
    nukePoints: 10,
    nukeRadius: 2,
    speedStep: 50,
  };

  // Play area
  const P = {
    height: 20,
    width: 10,
    blocks: new Uint8Array(10 * 20),
    x: app.W / 2 - 5 * C.blockSize,
    y: app.H / 2 - 10 * C.blockSize,
  };

  // Shapes
  // prettier-ignore
  const S = [
    [[1, 1, 1, 1]], // I
    [[1, 1, 1, 1]], // I (extra)
    [[1, 1, 0], [0, 1, 1]], // Z
    [[0, 1, 1], [1, 1, 0]], // S
    [[1, 0, 0], [1, 1, 1]], // J
    [[0, 0, 1], [1, 1, 1]], // L
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 1], [1, 1]], // O
    [[2]], // Nuke
  ];

  let blockCurrent!: { shape: number[][]; x: number; y: number },
    blockDropSpeed = C.startSpeed,
    blockImage: GraphicsImageObject | undefined,
    blockNext!: { shape: number[][]; x: number; y: number },
    clickWatch: number | undefined,
    currentInterval = C.startSpeed,
    debugPieceCount = 0,
    difficultyLevel = 0,
    fastDrop = false,
    gameOverTimeout: number | undefined,
    isAnimating = false,
    isGameOver = false,
    linesCleared = 0,
    mainLoopInterval: number | undefined,
    nukeImage: GraphicsImageObject | undefined,
    nukeTimer: number | undefined,
    renderedBlocks!: Uint8Array,
    score = 0;

  function animateExplosion(
    pixelX: number,
    pixelY: number,
    centerX: number,
    centerY: number,
    frame: number,
  ): void {
    Pip.lastFlip = getTime();
    drawExplosionFrame(pixelX, pixelY, frame);
    h.flip();

    if (frame < 4) {
      nukeTimer = setTimeout(function () {
        animateExplosion(pixelX, pixelY, centerX, centerY, frame + 1);
      }, 60);
    } else {
      nukeTimer = setTimeout(function () {
        Pip.lastFlip = getTime();
        repaintRegion(centerX, centerY, C.nukeRadius + 1);
        h.flip();
        nukeTimer = setTimeout(animateGravity, 80);
      }, 60);
    }
  }

  function animateGravity(): void {
    const moved = stepGravity();

    Pip.lastFlip = getTime();
    syncSettledBlocks();
    h.flip();

    if (moved) {
      nukeTimer = setTimeout(animateGravity, 55);
    } else {
      finishNukeSettle();
    }
  }

  function collides(piece: {
    shape: number[][];
    x: number;
    y: number;
  }): boolean {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (!piece.shape[y][x]) continue;

        let fieldX = piece.x + x;
        let fieldY = piece.y + y;

        if (
          fieldX < 0 ||
          fieldX >= P.width ||
          fieldY >= P.height ||
          (fieldY >= 0 && P.blocks[fieldY * P.width + fieldX])
        ) {
          return true;
        }
      }
    }

    return false;
  }

  function drawBlock(x: number, y: number, forceValue: number): void {
    const blockValue =
      typeof forceValue !== 'undefined'
        ? forceValue
        : P.blocks[y * P.width + x];
    const drawX = P.x + x * C.blockSize;
    const drawY = P.y + y * C.blockSize;

    if (blockValue === 2) {
      try {
        if (nukeImage)
          h.setColor(C.colors[3]).drawImage(nukeImage, drawX, drawY);
      } catch (e) {}
    } else if (blockValue) {
      if (blockImage)
        h.setColor(C.colors[3]).drawImage(blockImage, drawX, drawY);
    }
  }

  function drawCurrentPiece(): void {
    h.setClipRect(P.x, P.y, P.x + 149, P.y + 299);

    for (let y = 0; y < blockCurrent.shape.length; y++) {
      for (let x = 0; x < blockCurrent.shape[y].length; x++) {
        if (!blockCurrent.shape[y][x]) continue;

        drawBlock(
          blockCurrent.x + x,
          blockCurrent.y + y,
          blockCurrent.shape[y][x],
        );
      }
    }

    h.setClipRect(0, 0, app.W - 1, app.H - 1);
  }

  function drawExplosionFrame(
    pixelX: number,
    pixelY: number,
    frame: number,
  ): void {
    h.setClipRect(P.x, P.y, P.x + 149, P.y + 299);

    if (frame === 0) {
      h.setColor(3).fillCircle(pixelX, pixelY, 11);
    } else {
      const outer = 6 + frame * 6;
      const inner = outer - 6;

      h.setColor(frame % 2 ? 2 : 3).fillCircle(pixelX, pixelY, outer);
      h.setColor(0).fillCircle(pixelX, pixelY, inner);
    }

    h.setClipRect(0, 0, app.W - 1, app.H - 1);
  }

  function drawGame(): void {
    syncSettledBlocks();
    drawHud();
    drawCurrentPiece();
  }

  function drawHud(): void {
    h.setColor(C.colors[0])
      .fillRect(50, 182, 116, 207)
      .fillRect(50, 264, 115, 291)
      .fillRect(354, 264, 440, 290)
      .fillRect(363, 55, 429, 121)
      .setColor(C.colors[3])
      .setFont('6x8', 2)
      .setFontAlign(0, 0)
      .drawString(difficultyLevel.toString(), 83, 196)
      .drawString(linesCleared.toString(), 83, 278)
      .drawString(score.toString(), 397, 278);

    const previewShape = blockNext.shape;
    const previewX = 396 - (previewShape[0].length * C.blockSize) / 2;
    const previewY = 88 - (previewShape.length * C.blockSize) / 2;

    for (let previewRow = 0; previewRow < previewShape.length; previewRow++) {
      for (
        let previewColumn = 0;
        previewColumn < previewShape[previewRow].length;
        previewColumn++
      ) {
        if (!previewShape[previewRow][previewColumn]) continue;

        if (previewShape[previewRow][previewColumn] === 2) {
          if (nukeImage)
            h.setColor(C.colors[3]).drawImage(
              nukeImage,
              previewX + previewColumn * C.blockSize,
              previewY + previewRow * C.blockSize,
            );
        } else if (blockImage) {
          h.setColor(C.colors[3]).drawImage(
            blockImage,
            previewX + previewColumn * C.blockSize,
            previewY + previewRow * C.blockSize,
          );
        }
      }
    }

    if (previewShape[0][0] === 2) {
      h.setColor(C.colors[3])
        .setFont('6x8', 1)
        .setFontAlign(0, 0)
        .drawString('NUKE!', 396, 110);
    }
  }

  function drawPlayArea(): void {
    let gridLine!: number;

    h.setColor(C.colors[0])
      .fillRect(P.x, P.y, P.x + 149, P.y + 299)
      .setColor(C.colors[1]);

    for (gridLine = 1; gridLine < P.width; gridLine++) {
      h.drawLine(
        P.x + gridLine * C.blockSize,
        P.y,
        P.x + gridLine * C.blockSize,
        P.y + 299,
      );
    }

    for (gridLine = 1; gridLine < P.height; gridLine++) {
      h.drawLine(
        P.x,
        P.y + gridLine * C.blockSize,
        P.x + 149,
        P.y + gridLine * C.blockSize,
      );
    }
  }

  function drawVersion(): void {
    h.setColor(C.colors[0])
      .fillRect(28, 70, 138, 87)
      .setColor(C.colors[2])
      .setFont('6x8', 2)
      .setFontAlign(0, 0)
      .drawString('v' + app.version, 83, 80);
  }

  function dropPiece(): void {
    'ram';

    if (!blockCurrent || isGameOver || isAnimating) return;

    eraseCurrentPiece();
    blockCurrent.y++;

    if (collides(blockCurrent)) {
      blockCurrent.y--;
      if (app.soundEffects) Pip.playSound('SELECT');

      if (blockCurrent.shape[0][0] === 2) {
        // Nuke dropped
        app.playNukeSound();
        startNukeExplosion(blockCurrent.x, blockCurrent.y);
        return;
      }

      for (let pieceRow = 0; pieceRow < blockCurrent.shape.length; pieceRow++) {
        for (
          let pieceColumn = 0;
          pieceColumn < blockCurrent.shape[pieceRow].length;
          pieceColumn++
        ) {
          if (!blockCurrent.shape[pieceRow][pieceColumn]) continue;

          const fieldX = blockCurrent.x + pieceColumn;
          const fieldY = blockCurrent.y + pieceRow;

          if (!isFinite(fieldX) || !isFinite(fieldY)) continue;

          P.blocks[fieldY * P.width + fieldX] = 1;
        }
      }

      resolveLines();

      spawnPiece();
      drawGame();
    } else {
      drawCurrentPiece();
    }

    if (isGameOver) return;

    const desiredInterval = fastDrop ? C.fastSpeed : blockDropSpeed;

    if (currentInterval !== desiredInterval) {
      if (mainLoopInterval) clearInterval(mainLoopInterval);

      mainLoopInterval = setInterval(dropPiece, desiredInterval, h);
      currentInterval = desiredInterval;
    }
  }

  function eraseCurrentPiece(): void {
    for (let y = 0; y < blockCurrent.shape.length; y++) {
      for (let x = 0; x < blockCurrent.shape[y].length; x++) {
        if (blockCurrent.shape[y][x]) {
          eraseGridCell(blockCurrent.x + x, blockCurrent.y + y);
        }
      }
    }
  }

  function eraseGridCell(x: number, y: number): void {
    const drawX = P.x + x * C.blockSize;
    const drawY = P.y + y * C.blockSize;

    if (drawY + C.blockSize <= P.y || drawY > P.y + 299) return;

    h.setColor(C.colors[0]).fillRect(
      drawX,
      Math.max(drawY, P.y),
      drawX + C.blockSize - 1,
      Math.min(drawY + C.blockSize - 1, P.y + 299),
    );

    if (x > 0) {
      h.setColor(C.colors[1]).drawLine(
        drawX,
        Math.max(drawY, P.y),
        drawX,
        Math.min(drawY + C.blockSize - 1, P.y + 299),
      );
    }

    if (y > 0) {
      h.setColor(C.colors[1]).drawLine(
        drawX,
        drawY,
        drawX + C.blockSize - 1,
        drawY,
      );
    }
  }

  function finishNukeSettle(): void {
    nukeTimer = undefined;
    isAnimating = false;

    resolveLines();
    spawnPiece();

    Pip.lastFlip = getTime();
    drawGame();
    h.flip();

    if (!isGameOver) {
      // Resume normal speed
      fastDrop = false;
      currentInterval = blockDropSpeed;
      mainLoopInterval = setInterval(dropPiece, blockDropSpeed, h);
    }
  }

  function getRandomPiece(allowNuke?: boolean): {
    shape: number[][];
    x: number;
    y: number;
  } {
    if (typeof allowNuke === 'undefined') allowNuke = true;

    // Debug: force a nuke every 10th piece for testing.
    if (C.debug && ++debugPieceCount % 10 === 0) {
      const nuke = S[S.length - 1];
      return { shape: nuke, x: Math.floor((10 - nuke[0].length) / 2), y: 0 };
    }

    let shape!: number[][];

    while (true) {
      shape = S[Math.randInt(S.length)];

      if (shape[0][0] === 2) {
        if (!allowNuke || !Math.randInt(2)) continue;
      }

      break;
    }

    return {
      shape: shape,
      x: Math.floor((10 - shape[0].length) / 2),
      y: 0,
    };
  }

  function handleLeftKnob(direction: KnobDirection): void {
    if (!direction || isGameOver || isAnimating) return;

    const oldShape = blockCurrent.shape;
    const oldX = blockCurrent.x;
    const oldY = blockCurrent.y;

    eraseCurrentPiece();

    const newShape: number[][] = [];

    for (
      let rotateColumn = 0;
      rotateColumn < oldShape[0].length;
      rotateColumn++
    ) {
      let rotatedRow: number[] = [];

      for (let rotateRow = 0; rotateRow < oldShape.length; rotateRow++) {
        rotatedRow.push(
          direction > 0
            ? oldShape[rotateRow][oldShape[0].length - 1 - rotateColumn]
            : oldShape[oldShape.length - 1 - rotateRow][rotateColumn],
        );
      }

      newShape.push(rotatedRow);
    }

    blockCurrent.shape = newShape;

    if (oldShape.length === 1 && oldShape[0].length === 4) {
      blockCurrent.x++;
      blockCurrent.y--;
    } else if (oldShape.length === 4 && oldShape[0].length === 1) {
      blockCurrent.x--;
      blockCurrent.y++;
    }

    if (collides(blockCurrent)) {
      blockCurrent.shape = oldShape;
      blockCurrent.x = oldX;
      blockCurrent.y = oldY;
    } else {
      if (app.soundEffects) Pip.playSound('SCROLL');
    }

    drawCurrentPiece();
  }

  function handleRightKnob(direction: KnobDirection): void {
    if (!direction || isGameOver || isAnimating) return;

    direction = direction > 0 ? 1 : -1;
    const oldX = blockCurrent.x;

    eraseCurrentPiece();
    blockCurrent.x += direction;

    if (collides(blockCurrent)) {
      blockCurrent.x = oldX;
    } else {
      if (app.soundEffects) Pip.playSound('SCROLL');
    }

    drawCurrentPiece();
  }

  function loadImage(path: string): GraphicsImageObject | undefined {
    try {
      let data = JSON.parse(fs.readFileSync(path));

      return {
        bpp: data.bpp,
        buffer: E.toArrayBuffer(atob(data.buffer)),
        height: data.height,
        transparent: data.transparent,
        width: data.width,
      };
    } catch (e) {
      return;
    }
  }

  function repaintRegion(
    centerX: number,
    centerY: number,
    cellRadius: number,
  ): void {
    for (let y = centerY - cellRadius; y <= centerY + cellRadius; y++) {
      if (y < 0 || y >= P.height) continue;

      for (let x = centerX - cellRadius; x <= centerX + cellRadius; x++) {
        if (x < 0 || x >= P.width) continue;

        const idx = y * P.width + x;
        const value = P.blocks[idx];

        eraseGridCell(x, y);
        if (value) drawBlock(x, y, value);
        renderedBlocks[idx] = value;
      }
    }
  }

  function resolveLines(): void {
    let linesRemoved = 0;
    let clearPasses = 0;

    while (clearPasses++ < P.height) {
      let anyCleared = false;

      for (let clearRow = 19; clearRow >= 0; clearRow--) {
        let full = true;

        for (let clearColumn = 0; clearColumn < P.width; clearColumn++) {
          if (!P.blocks[clearRow * P.width + clearColumn]) {
            full = false;
            break;
          }
        }

        if (full) {
          for (let targetRow = clearRow; targetRow > 0; targetRow--) {
            for (let shiftColumn = 0; shiftColumn < P.width; shiftColumn++) {
              P.blocks[targetRow * P.width + shiftColumn] =
                P.blocks[(targetRow - 1) * P.width + shiftColumn];
            }
          }

          for (let topColumn = 0; topColumn < P.width; topColumn++) {
            P.blocks[topColumn] = 0;
          }

          linesRemoved++;
          linesCleared++;

          if (!(linesCleared % C.linesPerLevel)) {
            difficultyLevel++;
            blockDropSpeed = Math.max(
              C.startSpeed - difficultyLevel * C.speedStep,
              C.minimumSpeed,
            );
          }

          anyCleared = true;
          break;
        }
      }

      if (!anyCleared) break;
    }

    switch (linesRemoved) {
      case 1:
        score += 100;
        break;
      case 2:
        score += 300;
        break;
      case 3:
        score += 500;
        break;
      case 4:
        score += 800;
        break;
    }
  }

  function spawnPiece(): void {
    if (!blockNext) blockNext = getRandomPiece();

    blockCurrent = blockNext;
    blockNext = getRandomPiece();

    if (collides(blockCurrent)) {
      isGameOver = true;
      app.recordScore(score);

      if (mainLoopInterval) {
        clearInterval(mainLoopInterval);
        mainLoopInterval = undefined;
      }

      gameOverTimeout = setTimeout(function () {
        gameOverTimeout = undefined;
        app.go(app.scenes.GAME_OVER, {
          level: difficultyLevel,
          lines: linesCleared,
          score: score,
        });
      }, 50);
    }
  }

  function startNukeExplosion(centerX: number, centerY: number): void {
    isAnimating = true;

    if (mainLoopInterval) {
      clearInterval(mainLoopInterval);
      mainLoopInterval = undefined;
    }

    P.blocks[centerY * P.width + centerX] = 0;

    let destroyed = 0;

    for (let r = -C.nukeRadius; r <= C.nukeRadius; r++) {
      for (let c = -C.nukeRadius; c <= C.nukeRadius; c++) {
        const x = centerX + c;
        const y = centerY + r;

        if (
          x >= 0 &&
          x < P.width &&
          y >= 0 &&
          y < P.height &&
          P.blocks[y * P.width + x]
        ) {
          P.blocks[y * P.width + x] = 0;
          destroyed++;
        }
      }
    }

    score += destroyed * C.nukePoints;

    const pixelX = P.x + centerX * C.blockSize + (C.blockSize >> 1);
    const pixelY = P.y + centerY * C.blockSize + (C.blockSize >> 1);

    animateExplosion(pixelX, pixelY, centerX, centerY, 0);
  }

  function stepGravity(): boolean {
    let moved = false;

    for (let row = P.height - 2; row >= 0; row--) {
      for (let col = 0; col < P.width; col++) {
        const idx = row * P.width + col;

        if (P.blocks[idx] && !P.blocks[idx + P.width]) {
          P.blocks[idx + P.width] = P.blocks[idx];
          P.blocks[idx] = 0;
          moved = true;
        }
      }
    }

    return moved;
  }

  function syncSettledBlocks(): void {
    for (let fieldRow = 0; fieldRow < P.height; fieldRow++) {
      for (let fieldColumn = 0; fieldColumn < P.width; fieldColumn++) {
        let fieldIndex = fieldRow * P.width + fieldColumn;
        let blockValue = P.blocks[fieldIndex];

        if (renderedBlocks[fieldIndex] === blockValue) continue;

        eraseGridCell(fieldColumn, fieldRow);
        if (blockValue) drawBlock(fieldColumn, fieldRow, blockValue);
        renderedBlocks[fieldIndex] = blockValue;
      }
    }
  }

  blockImage = loadImage('HOLO/PIPTRIS/BLOCK.JSON');
  nukeImage = loadImage('HOLO/PIPTRIS/NUKE.JSON');
  renderedBlocks = new Uint8Array(200);
  blockNext = getRandomPiece(false);
  app.applyDisplay();
  drawPlayArea();
  spawnPiece();
  drawGame();
  drawVersion();
  h.flip();

  Pip.onExclusive('knob1', handleLeftKnob);
  Pip.onExclusive('knob2', handleRightKnob);
  clickWatch = setWatch(
    function (event) {
      if (isGameOver) return;

      fastDrop = event.state;

      if (isAnimating) return;

      const desiredInterval = fastDrop ? C.fastSpeed : blockDropSpeed;

      if (currentInterval !== desiredInterval) {
        if (mainLoopInterval) clearInterval(mainLoopInterval);

        mainLoopInterval = setInterval(dropPiece, desiredInterval, h);
        currentInterval = desiredInterval;
      }
    },
    ENC1_PRESS,
    {
      repeat: true,
      edge: 'both',
    },
  );

  app.startMusic();

  if (!isGameOver) {
    mainLoopInterval = setInterval(dropPiece, blockDropSpeed, h);
  }

  return {
    remove: function () {
      if (mainLoopInterval) clearInterval(mainLoopInterval);
      if (gameOverTimeout) clearTimeout(gameOverTimeout);
      if (nukeTimer) clearTimeout(nukeTimer);
      if (clickWatch) clearWatch(clickWatch);

      Pip.removeListener('knob1', handleLeftKnob);
      Pip.removeListener('knob2', handleRightKnob);

      isAnimating = nukeTimer = undefined as never;
      mainLoopInterval = gameOverTimeout = clickWatch = undefined;
      blockCurrent = blockImage = blockNext = undefined as never;
      nukeImage = renderedBlocks = undefined as never;
      blockDropSpeed = currentInterval = difficultyLevel = undefined as never;
      fastDrop = isGameOver = linesCleared = undefined as never;
      score = undefined as never;
    },
  };
});
