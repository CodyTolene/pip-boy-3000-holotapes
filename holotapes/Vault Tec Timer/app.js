(function () {

  const APP_ID = "VAULTTIMER";
  const MODES = { SET: "set", RUNNING: "running", DONE: "done" };
  const ALERT_TYPES = ["SOUND ONLY", "LIGHTS ONLY", "LIGHTS AND SOUND"];

  let mode = MODES.SET;
  let minutes = 5;
  let alertIndex = 0;
  let secondsRemaining = 0;
  let ticker = null;
  let alarmTicker = null;
  let flashFrame = 0;
  let removed = false;
  let leftWheelPressWatch;
  let redrawInterval;

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function draw() {
    h.clear(1);

    if (mode === MODES.SET) {
      h.setColor(3).setFontMonofonto23().setFontAlign(0, 0).drawString("VAULT-TEC TIMER", 240, 50);

      // Minutes — controlled by knob2
      h.setColor(2).setFontMonofonto16().setFontAlign(0, 0).drawString("MINUTES  (KNOB 2)", 240, 110);
      h.setColor(3).setFontMonofonto36().setFontAlign(0, 0).drawString(minutes + " MIN", 240, 150);

      // Alert type — controlled by knob1
      h.setColor(2).setFontMonofonto16().setFontAlign(0, 0).drawString("ALERT TYPE  (KNOB 1)", 240, 205);
      Pip.shadeBox(80, 218, 400, 248);
      h.setColor(3).setFontMonofonto18().setFontAlign(0, 0).drawString(ALERT_TYPES[alertIndex], 240, 233);

      h.setColor(2).setFontMonofonto16().setFontAlign(0, 0).drawString("PRESS KNOB 1 TO START", 240, 285);

    } else if (mode === MODES.RUNNING) {
      let m = Math.floor(secondsRemaining / 60);
      let s = secondsRemaining % 60;
      h.setColor(3).setFontMonofonto23().setFontAlign(0, 0).drawString("TIMER RUNNING", 240, 60);
      h.setFontMonofonto36().setFontAlign(0, 0).drawString(pad(m) + ":" + pad(s), 240, 160);
      h.setColor(2).setFontMonofonto16().setFontAlign(0, 0).drawString(ALERT_TYPES[alertIndex], 240, 230);
      h.setFontMonofonto16().setFontAlign(0, 0).drawString("PRESS KNOB 1 TO CANCEL", 240, 275);

    } else if (mode === MODES.DONE) {
      if (alertIndex !== 1) {
        h.setColor(3).setFontMonofonto23().setFontAlign(0, 0).drawString("** TIME'S UP! **", 240, 130);
        h.setColor(2).setFontMonofonto16().setFontAlign(0, 0).drawString("PRESS KNOB 1 TO RESET", 240, 210);
      }
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  function stopTicker() {
    if (ticker !== null) {
      clearInterval(ticker);
      ticker = null;
    }
  }

  function stopAlarm() {
    if (alarmTicker !== null) {
      clearInterval(alarmTicker);
      alarmTicker = null;
    }
  }

  function startAlarm() {
    flashFrame = 0;
    let soundToggle = false;
    let colors = [1, 2, 3];

    alarmTicker = setInterval(function () {
      flashFrame++;

      if (alertIndex === 1 || alertIndex === 2) {
        let col = colors[flashFrame % colors.length];
        h.reset().setColor(col).fillRect(0, 0, 479, 319);
        h.setColor(col === 3 ? 1 : 3)
          .setFontMonofonto23().setFontAlign(0, 0).drawString("** TIME'S UP! **", 240, 130);
        h.setFontMonofonto16().setFontAlign(0, 0).drawString("PRESS KNOB 1 TO RESET", 240, 210);
        h.flip();
        Pip.lastFlip = getTime();
      }

      if (alertIndex === 0 || alertIndex === 2) {
        Pip.playSound(soundToggle ? "SCROLL" : "TAB");
        soundToggle = !soundToggle;
      }

    }, 500);
  }

  function startTimer() {
    secondsRemaining = minutes * 60;
    mode = MODES.RUNNING;
    draw();
    ticker = setInterval(function () {
      secondsRemaining--;
      if (secondsRemaining <= 0) {
        stopTicker();
        mode = MODES.DONE;
        if (alertIndex !== 1) draw();
        startAlarm();
      } else {
        draw();
      }
    }, 1000);
  }

  // knob1 — cycles alert type on SET screen
  function onLeftWheel(d) {
    if (mode === MODES.SET) {
      alertIndex = (alertIndex + d + ALERT_TYPES.length) % ALERT_TYPES.length;
      Pip.playSound("SCROLL");
      draw();
    }
  }

  // knob2 — sets minutes on SET screen
  function onRightWheel(d) {
    if (mode === MODES.SET) {
      minutes = Math.max(1, Math.min(99, minutes + d));
      Pip.playSound("SCROLL");
      draw();
    }
  }

  // knob1 press — start / cancel / reset
  function onLeftWheelPress() {
    if (mode === MODES.SET) {
      startTimer();
    } else if (mode === MODES.RUNNING) {
      stopTicker();
      mode = MODES.SET;
      draw();
    } else if (mode === MODES.DONE) {
      stopAlarm();
      mode = MODES.SET;
      draw();
    }
  }

  function start() {
    h.clear();
    Pip.audioStop();

    Pip.onExclusive("knob1", onLeftWheel);
    Pip.onExclusive("knob2", onRightWheel);

    if (typeof ENC1_PRESS !== "undefined") {
      leftWheelPressWatch = setWatch(onLeftWheelPress, ENC1_PRESS, {
        repeat: true,
        edge: "rising",
        debounce: 50,
      });
    }

    redrawInterval = setInterval(draw, 1000);
    draw();
  }

  function remove() {
    if (removed) return;
    removed = true;

    if (redrawInterval) clearInterval(redrawInterval);
    stopTicker();
    stopAlarm();

    if (leftWheelPressWatch) clearWatch(leftWheelPressWatch);

    Pip.removeListener("knob1", onLeftWheel);
    Pip.removeListener("knob2", onRightWheel);

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

})
