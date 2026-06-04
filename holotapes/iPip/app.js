// =============================================================================
//  Name: iPip
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function () {
  const APP_ID = 'IPIP';
  const W = h.getWidth();
  const H = h.getHeight();

  let redrawInterval;
  let removed = false;
  let leftWheelPressWatch;

  const state = {
    lastInput: 'NONE',
    leftWheel: 0,
    rightWheel: 0,
    leftWheelPress: 0,
  };

  function mark(input) {
    state.lastInput = input;
    if (Pip.playSound) Pip.playSound('TAB');
    draw();
  }

  function draw() {
    h.clear(1);

    h.setColor(3)
      .setFontMonofonto28()
      .setFontAlign(0, 0)
      .drawString(APP_ID, W / 2, 50);

    h.setFontMonofonto18().drawString('LAST: ' + state.lastInput, W / 2, 100);

    h.setFontMonofonto16().setFontAlign(-1, -1);

    h.drawString('LEFT SCROLL WHEEL: ' + state.leftWheel, 80, 145);
    h.drawString('RIGHT SCROLL WHEEL: ' + state.rightWheel, 80, 175);
    h.drawString('LEFT WHEEL PRESS: ' + state.leftWheelPress, 80, 205);

    h.flip();
    Pip.lastFlip = getTime();
  }

  function onLeftWheel(dir) {
    state.leftWheel += dir;
    mark(dir < 0 ? 'LEFT SCROLL WHEEL UP' : 'LEFT SCROLL WHEEL DOWN');
  }

  function onRightWheel(dir) {
    state.rightWheel += dir;
    mark(dir < 0 ? 'RIGHT SCROLL WHEEL UP' : 'RIGHT SCROLL WHEEL DOWN');
  }

  function onLeftWheelPress() {
    state.leftWheelPress++;
    mark('LEFT SCROLL WHEEL PRESS');
  }

  function start() {
    h.clear();
    Pip.audioStop();

    Pip.onExclusive('knob1', onLeftWheel);
    Pip.onExclusive('knob2', onRightWheel);

    if (typeof ENC1_PRESS !== 'undefined') {
      leftWheelPressWatch = setWatch(onLeftWheelPress, ENC1_PRESS, {
        repeat: true,
        edge: 'rising',
        debounce: 50,
      });
    }

    draw();
    redrawInterval = setInterval(draw, 1000);
  }

  function remove() {
    if (removed) return;
    removed = true;

    if (redrawInterval) clearInterval(redrawInterval);
    if (leftWheelPressWatch) clearWatch(leftWheelPressWatch);

    Pip.removeListener('knob1', onLeftWheel);
    Pip.removeListener('knob2', onRightWheel);

    Pip.audioStop();
    h.clear();
    h.flip();
  }

  start();

  return {
    id: APP_ID,
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
