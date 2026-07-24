// =============================================================================
//  Name: Piptris
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app) {
  // Config
  const C = {
    imageMap: 'HOLO/PIPTRIS/INTRO.RAW',
    message: 'SYSTEM ARMED',
    messageY: 160,
    subMessage: 'LEFT KNOB TO DETONATE',
    subMessageY: 184,
    rowBytes: 120, // 480 pixels @ 2bpp
    // We'll keep track of the area in the buffer that should be
    // cached and restored to give the blinking effect later.
    messageAreaHeight: 50, // covers both message lines
    messageAreaY: 145, // messageY - 15
  };

  let blinkInterval,
    messageBackground,
    messageVisible = true;

  function blinkMessage() {
    messageVisible = !messageVisible;
    if (messageVisible) {
      drawMessage();
    } else if (messageBackground) {
      // Replace with cached `INTRO.RAW`
      new Uint8Array(h.buffer).set(
        messageBackground,
        C.messageAreaY * C.rowBytes,
      );
    }
    Pip.blitOptions.y1 = C.messageAreaY;
    Pip.blitOptions.y2 = C.messageAreaY + C.messageAreaHeight - 1;
    h.flip();
    Pip.lastFlip = getTime();
    delete Pip.blitOptions.y1;
    delete Pip.blitOptions.y2;
  }

  function drawMessage() {
    h.setFontMonofonto16().setFontAlign(0, 0).setColor(0);

    for (let dx = -1; dx < 2; dx++) {
      for (let dy = -1; dy < 2; dy++) {
        if (dx || dy) h.drawString(C.message, app.W / 2 + dx, C.messageY + dy);
      }
    }

    h.setColor(3).drawString(C.message, app.W / 2, C.messageY);

    // Sub message, smaller and dimmer
    h.setFontMonofonto14().setColor(0);

    for (let dx = -1; dx < 2; dx++) {
      for (let dy = -1; dy < 2; dy++) {
        if (dx || dy) {
          h.drawString(C.subMessage, app.W / 2 + dx, C.subMessageY + dy);
        }
      }
    }

    h.setColor(2).drawString(C.subMessage, app.W / 2, C.subMessageY);
  }

  function cacheMessageBackground() {
    const messageAreaStart = C.messageAreaY * C.rowBytes;
    // Cache `INTRO.RAW` pixels behind the message
    messageBackground = new Uint8Array(C.messageAreaHeight * C.rowBytes);
    messageBackground.set(
      new Uint8Array(h.buffer).subarray(
        messageAreaStart,
        messageAreaStart + messageBackground.length,
      ),
    );
  }

  function draw() {
    // Prevent flipping while drawing `INTRO.RAW`
    Pip.lastFlip = getTime();

    // Stream `INTRO.RAW` from SD card into buffer
    const file = E.openFile(C.imageMap, 'r');
    Pip.blitFile(h, file, {
      width: 480,
      height: 320,
      dstx: 0,
      dsty: 0,
      x: 0,
      y: 0,
      srcWidth: 480,
      srcHeight: 320,
    });
    h.flip();
    file.close();

    cacheMessageBackground();
    drawMessage();
    h.flip();
  }

  function onLeftScrollWheel(direction) {
    if (direction) return;

    app.go(app.scenes.MENU);
  }

  function onRightScrollWheel() {}

  function remove() {
    if (blinkInterval) clearInterval(blinkInterval);

    Pip.removeListener('knob1', onLeftScrollWheel);
    Pip.removeListener('knob2', onRightScrollWheel);
    delete Pip.blitOptions.y1;
    delete Pip.blitOptions.y2;

    blinkInterval = messageBackground = messageVisible = undefined;
  }

  app.loadData();
  draw();
  blinkInterval = setInterval(blinkMessage, 850);
  Pip.onExclusive('knob1', onLeftScrollWheel);
  Pip.onExclusive('knob2', onRightScrollWheel);

  return { remove: remove };
});
