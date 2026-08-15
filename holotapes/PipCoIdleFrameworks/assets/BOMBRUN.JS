(function (idleService, fs, basePath, log, audioMuted) {
  let frameTimer,
    audioWatchTimer,
    logoImage,
    bombSprite,
    bombX,
    bombY,
    logoFramesRemaining = 60,
    bombReady = 0,
    movementPhase = 0,
    ownsAudio = 0;

  function resetBomb(index) {
    switch (index) {
      case 0:
        bombX[index] = 455;
        bombY[index] = -67;
        break;
      case 1:
        bombX[index] = 520;
        bombY[index] = -125;
        break;
      case 2:
        bombX[index] = 585;
        bombY[index] = -85;
        break;
      case 3:
        bombX[index] = 650;
        bombY[index] = -155;
        break;
      case 4:
        bombX[index] = 715;
        bombY[index] = -215;
        break;
      case 5:
        bombX[index] = 780;
        bombY[index] = -115;
        break;
      case 6:
        bombX[index] = 845;
        bombY[index] = -185;
        break;
      case 7:
        bombX[index] = 910;
        bombY[index] = -255;
        break;
      case 8:
        bombX[index] = 360;
        bombY[index] = -300;
        break;
      case 9:
        bombX[index] = 430;
        bombY[index] = -240;
        break;
      case 10:
        bombX[index] = 500;
        bombY[index] = -330;
        break;
      case 11:
        bombX[index] = 570;
        bombY[index] = -270;
        break;
      case 12:
        bombX[index] = 640;
        bombY[index] = -360;
        break;
      default:
        bombX[index] = 710;
        bombY[index] = -210;
    }
  }

  function startBombRenderer() {
    if (bombReady) return 1;

    logoImage = undefined;
    E.defrag();

    try {
      bombSprite = eval(fs.readFileSync(basePath + 'BOMB.JS'));
    } catch (e) {
      log('BOMB.JS load failed: ' + e);
      return 0;
    }

    bombX = new Int16Array([
      455, 390, 325, 255, 185, 520, 445, 370, 295, 610, 535, 460, 385, 690,
    ]);
    bombY = new Int16Array([
      -67, -22, 18, 62, 106, -125, -170, -215, -260, -70, -120, -170, -220,
      -130,
    ]);
    bombReady = 1;

    if (!audioMuted) {
      try {
        Pip.audioStart(basePath + 'FALLOUT.WAV', { repeat: true });
        ownsAudio = 1;
      } catch (e) {}

      audioWatchTimer = setInterval(function () {
        if (
          idleService.active &&
          ownsAudio &&
          Pip.audioIsPlaying &&
          !Pip.audioIsPlaying()
        ) {
          try {
            Pip.audioStart(basePath + 'FALLOUT.WAV', { repeat: true });
          } catch (e) {}
        }
      }, 10000);
    }

    return 1;
  }

  function drawFrame() {
    'ram';
    if (!idleService.active) return;

    h.reset().setClipRect(0, 0, 479, 319).clear(0);

    if (logoFramesRemaining > 0) {
      h.setColor(3).drawImage(
        logoImage,
        (480 - logoImage.width) >> 1,
        (320 - logoImage.height) >> 1,
      );
      logoFramesRemaining--;
      h.flip();
      Pip.lastFlip = getTime();
      return;
    }

    if (!bombReady && !startBombRenderer()) {
      idleService.stop(1);
      return;
    }

    for (let i = 0; i < 14; i++) {
      let deltaX = movementPhase ? 3 : 2,
        deltaY = 2;
      h.drawImage(bombSprite, bombX[i], bombY[i]);

      if (i === 1 || i === 5 || i === 10) {
        deltaX++;
        deltaY++;
      }

      bombX[i] -= deltaX;
      bombY[i] += deltaY;

      if (bombX[i] < -71 && bombY[i] > 320) resetBomb(i);
    }

    movementPhase = movementPhase ? 0 : 1;
    h.flip();
    Pip.lastFlip = getTime();
  }

  try {
    logoImage = {
      width: 240,
      height: 227,
      bpp: 1,
      transparent: 0,
      buffer: fs.readFileSync(basePath + 'LOGO.BIN'),
    };
  } catch (e) {
    log('LOGO.BIN load failed: ' + e);
    return;
  }

  h.reset().setClipRect(0, 0, 479, 319).clear(0);
  h.flip();
  Pip.lastFlip = getTime();

  drawFrame();
  frameTimer = setInterval(drawFrame, 83);

  return {
    stop: function () {
      if (frameTimer) {
        clearInterval(frameTimer);
        frameTimer = undefined;
      }
      if (audioWatchTimer) {
        clearInterval(audioWatchTimer);
        audioWatchTimer = undefined;
      }
      if (ownsAudio) {
        try {
          Pip.audioStop();
        } catch (e) {}
      }

      ownsAudio = 0;
      logoImage = undefined;
      bombSprite = undefined;
      bombX = undefined;
      bombY = undefined;
      h.reset().setClipRect(0, 0, 479, 319);
    },
  };
});
