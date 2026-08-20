// =============================================================================
//  Name: Vault-Tec Timer, Timer
//  Authors: @trekker87, @Theeohn
//  License: MIT
//  Repository: https://github.com/Theeohn/Vault-Tec-Timer-3000a
// =============================================================================

(function (goTo) {
  const C = {
    MODES: { SET: 0, RUNNING: 1, PAUSED: 2, DONE: 3 },
    ALERT_TYPES: ['SOUND', 'LED'],
    SOUND_DIR: 'SOUND/ALARM',
    DEFAULT_SOUND: 'Klaxon.wav',
    FIELD_X: [152, 240, 328], // same coordinates as stopwatch.js's time fields
    FIELD_Y: 146, // centered between the TIMER title and the MENU/START row
    FIELD_LABELS: ['h', 'm', 's'], // lowercase, matching stopwatch.js
    FIELD_BOX_HALF: 20, // field highlight box half-height

    // MENU/START share one row directly above the ALERT bar, side by side -
    // MENU keeps its normal size, START is enlarged (bigger text, taller box)
    ROW_Y1: 224,
    ROW_Y2: 258,
    MENU_W: 50,
    START_W: 90,
    PAIR_GAP: 12, // gap between the MENU and START boxes

    ALERT_Y1: 265,
    ALERT_Y2: 289,
  };

  let fs = require('fs');
  let mode = C.MODES.SET;
  let time = [0, 0, 0]; // hours, minutes, seconds
  let alertType = 0; // 0 = SOUND, 1 = LED
  let soundFiles = [];
  let soundIdx = 0;
  let browsingSound = false; // true while knob1 or knob2 is scrolling soundFiles instead of navigating
  // Unified position for knob1 in SET mode: 0=hour, 1=minute, 2=second,
  // 3=MENU, 4=START, 5=ALERT.
  let pos = 4; // starts on START
  let lastPair = 4; // remembers whether MENU(3) or START(4) was last active
  let lastTop = 1; // remembers whether Hours(0), Minutes(1), or Seconds(2) was last active
  let editing = false;
  let secondsRemaining = 0;
  let ticker, alarmTicker, flashFrame = 0, redrawInterval;
  let runRow = 0; // RUNNING: 0 = cancel, 1 = menu | PAUSED: 0 = resume, 1 = cancel, 2 = menu
  let alertW; // computed once at load - half-width of the ALERT button
  let menuCx, startCx; // computed once at load - centers of the MENU/START pair

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function readSoundDir() {
    const dirs = [C.SOUND_DIR, 'SOUND/ALARM'];
    for (let d = 0; d < dirs.length; d++) {
      try {
        const files = fs
          .readdir('/' + dirs[d])
          .filter(function (n) {
            return n !== '.' && n !== '..' && n.length > 4 && n.slice(-4).toLowerCase() === '.wav';
          })
          .sort();
        if (files.length > 0) {
          C.SOUND_DIR = dirs[d];
          return files;
        }
      } catch (e) {}
    }
    try {
      E.defrag();
      return fs
        .readdir('/' + C.SOUND_DIR)
        .filter(function (n) {
          return n !== '.' && n !== '..' && n.length > 4 && n.slice(-4).toLowerCase() === '.wav';
        })
        .sort();
    } catch (e2) {
      return [];
    }
  }

  function loadSoundFiles() {
    soundFiles = readSoundDir();
    if (!soundFiles.length) {
      soundFiles = [C.DEFAULT_SOUND];
    }
    soundIdx = -1;
    for (let i = 0; i < soundFiles.length; i++) {
      if (soundFiles[i].toLowerCase().indexOf('klaxon') !== -1) {
        soundIdx = i;
        break;
      }
    }
    if (soundIdx === -1) {
      soundIdx = soundFiles.indexOf(C.DEFAULT_SOUND);
    }
    if (soundIdx === -1) soundIdx = 0;
  }

  function alertLabel() {
    if (alertType === 1) return '<  ALERT TYPE: LED FLASH  >';
    const name = soundFiles[soundIdx] || C.DEFAULT_SOUND;
    const dot = name.lastIndexOf('.');
    const stripped = dot !== -1 ? name.slice(0, dot) : name;
    return '<  ALERT TYPE: ' + stripped.toUpperCase() + '  >';
  }

  function layoutAlertWidth() {
    const label = alertLabel();
    alertW = h.setFontMonofonto18().stringWidth(label) / 2 + 16;
  }

  function layoutButtonPair() {
    const totalSpan = C.MENU_W * 2 + C.PAIR_GAP + C.START_W * 2;
    const leftEdge = 240 - totalSpan / 2;
    menuCx = leftEdge + C.MENU_W;
    startCx = leftEdge + C.MENU_W * 2 + C.PAIR_GAP + C.START_W;
  }

  function drawButton(cx, y1, y2, w, label, font, focused, enabled) {
    h.setColor(2).drawRect(cx - w, y1, cx + w, y2);
    if (enabled && focused) {
      h.setColor(3);
      for (let o = 1; o <= 3; o++) h.drawRect(cx - w - o, y1 - o, cx + w + o, y2 + o);
    }
    h.setColor(enabled ? 3 : 2);
    if (font === 28) h.setFontMonofonto28(); else h.setFontMonofonto18();
    h.setFontAlign(0, 0).drawString(label, cx, (y1 + y2) / 2);
  }

  const NUM_FONT_SIZE = 36, LETTER_FONT_SIZE = 28;
  const LETTER_Y_OFFSET = (NUM_FONT_SIZE - LETTER_FONT_SIZE) / 2;

  function drawField(x, y, numStr, letterStr) {
    const numW = h.setFontMonofonto36().stringWidth(numStr);
    const letterW = h.setFontMonofonto28().stringWidth(letterStr);
    const startX = x - (numW + letterW) / 2;
    h.setColor(3).setFontMonofonto36().setFontAlign(-1, 0).drawString(numStr, startX, y);
    h.setColor(3).setFontMonofonto28().setFontAlign(-1, 0)
      .drawString(letterStr, startX + numW, y + LETTER_Y_OFFSET);
  }

  function drawSet() {
    layoutAlertWidth();
    h.setColor(3).setFontMonofonto36().setFontAlign(0, 0).drawString('TIMER', 240, 47);

    for (let i = 0; i < 3; i++) {
      if (pos === i) {
        const by = C.FIELD_Y;
        if (editing) {
          Pip.shadeBox(C.FIELD_X[i] - 45, by - C.FIELD_BOX_HALF, C.FIELD_X[i] + 45, by + C.FIELD_BOX_HALF);
        } else {
          h.setColor(3);
          for (let o = 0; o < 3; o++) {
            h.drawRect(C.FIELD_X[i] - 45 - o, by - C.FIELD_BOX_HALF - o, C.FIELD_X[i] + 45 + o, by + C.FIELD_BOX_HALF + o);
          }
        }
      }
      drawField(C.FIELD_X[i], C.FIELD_Y, pad(time[i]), C.FIELD_LABELS[i]);
    }

    drawButton(menuCx, C.ROW_Y1, C.ROW_Y2, C.MENU_W, 'MENU', 18, pos === 3, true);
    drawButton(startCx, C.ROW_Y1, C.ROW_Y2, C.START_W, 'START', 28, pos === 4, true);

    if (browsingSound) {
      h.setColor(2).fillRect(240 - alertW, C.ALERT_Y1, 240 + alertW, C.ALERT_Y2);
      if (pos === 5) {
        h.setColor(3);
        for (let o = 1; o <= 3; o++) {
          h.drawRect(240 - alertW - o, C.ALERT_Y1 - o, 240 + alertW + o, C.ALERT_Y2 + o);
        }
      }
      h.setColor(0).setFontMonofonto18().setFontAlign(0, 0)
        .drawString(alertLabel(), 240, (C.ALERT_Y1 + C.ALERT_Y2) / 2);
    } else {
      drawButton(240, C.ALERT_Y1, C.ALERT_Y2, alertW, alertLabel(), 18, pos === 5, true);
    }

    if (pos === 5) {
      if (alertType === 0) {
        h.setColor(2).setFontMonofonto14().setFontAlign(0, 0)
          .drawString(
            browsingSound ? 'Press left wheel to confirm changes' : 'Press left wheel to change sound, turn right wheel to use LED',
            240, C.ALERT_Y2 + 18
          );
      } else {
        h.setColor(2).setFontMonofonto14().setFontAlign(0, 0)
          .drawString('Turn right wheel to use alarms', 240, C.ALERT_Y2 + 18);
      }
    }
  } 

  function drawRunning() {
    const hrs = Math.floor(secondsRemaining / 3600);
    const mins = Math.floor((secondsRemaining % 3600) / 60);
    const secs = secondsRemaining % 60;
    h.setColor(3).setFontMonofonto23().setFontAlign(0, 0).drawString('TIMER RUNNING', 240, 55);
    h.setFontMonofonto36().setFontAlign(0, 0)
      .drawString(pad(hrs) + ':' + pad(mins) + ':' + pad(secs), 240, 150);
    h.setColor(2).setFontMonofonto16().setFontAlign(0, 0).drawString(alertLabel(), 240, 200);

    h.setColor(2).drawRect(120, 230, 240, 254);
    if (runRow === 0) {
      h.setColor(3);
      for (let o = 1; o <= 3; o++) h.drawRect(120 - o, 230 - o, 240 + o, 254 + o);
    }
    h.setColor(3).setFontMonofonto18().setFontAlign(0, 0).drawString('CANCEL', 180, 242);

    h.setColor(2).drawRect(260, 230, 380, 254);
    if (runRow === 1) {
      h.setColor(3);
      for (let o = 1; o <= 3; o++) h.drawRect(260 - o, 230 - o, 380 + o, 254 + o);
    }
    h.setColor(3).setFontMonofonto18().setFontAlign(0, 0).drawString('MENU', 320, 242);
  }

  function drawPaused() {
    const hrs = Math.floor(secondsRemaining / 3600);
    const mins = Math.floor((secondsRemaining % 3600) / 60);
    const secs = secondsRemaining % 60;
    h.setColor(3).setFontMonofonto23().setFontAlign(0, 0).drawString('TIMER PAUSED', 240, 50);
    h.setFontMonofonto36().setFontAlign(0, 0)
      .drawString(pad(hrs) + ':' + pad(mins) + ':' + pad(secs), 240, 130);

    const labels = ['RESUME', 'CANCEL', 'MENU'];
    const y1 = 200, y2 = 224;
    for (let i = 0; i < 3; i++) {
      const cx = 130 + i * 110;
      h.setColor(2).drawRect(cx - 48, y1, cx + 48, y2);
      if (runRow === i) {
        h.setColor(3);
        for (let o = 1; o <= 3; o++) h.drawRect(cx - 48 - o, y1 - o, cx + 48 + o, y2 + o);
      }
      h.setColor(3).setFontMonofonto16().setFontAlign(0, 0).drawString(labels[i], cx, (y1 + y2) / 2);
    }
  }

  function drawDone() {
    h.setColor(3).setFontMonofonto36().setFontAlign(0, 0).drawString("** TIME'S UP! **", 240, 124);
    h.setColor(2).setFontMonofonto28().setFontAlign(0, 0).drawString('PRESS LEFT WHEEL TO STOP', 240, 214);
  }

  function draw() {  "ram";
    h.clear(1);
    if (mode === C.MODES.SET) drawSet();
    else if (mode === C.MODES.RUNNING) drawRunning();
    else if (mode === C.MODES.PAUSED) drawPaused();
    else drawDone();
    h.flip();
    Pip.lastFlip = getTime();
  }

  function stopTicker() {
    if (ticker) clearInterval(ticker);
  }

  function stopAlarm() {
    if (alarmTicker) clearInterval(alarmTicker);
    if (alertType === 1) {
      try { Pip.setTorch(false); } catch (e) { Pip.log('setTorch failed: ' + e); }
    } else {
      Pip.audioStop();
    }
  }

  // LED: runs on a 500ms tick so the torch completes one full on/off cycle
  // every second. SOUND: plays the selected .wav file from SOUND_DIR on a
  // loop until dismissed.
  function startAlarm() {
    if (alertType === 1) {
      flashFrame = 0;
      let ledOn = true;
      alarmTicker = setInterval(function () {
        flashFrame++;
        try {
          Pip.setTorch(ledOn);
        } catch (e) {
          Pip.log('setTorch failed: ' + e);
        }
        ledOn = !ledOn;
      }, 500);
      return;
    }

    const name = soundFiles[soundIdx] || C.DEFAULT_SOUND;
    try {
      Pip.audioStart(C.SOUND_DIR + '/' + name, { repeat: true });
    } catch (e) {
      Pip.log('audioStart failed: ' + e);
    }
  }

  function runTicker() {
    mode = C.MODES.RUNNING;
    runRow = 0;
    draw();
    ticker = setInterval(function () {
      secondsRemaining--;
      if (secondsRemaining <= 0) {
        stopTicker();
        mode = C.MODES.DONE;
        draw();
        startAlarm();
      } else {
        draw();
      }
    }, 1000);
  }

  function startTimer() {
    secondsRemaining = time[0] * 3600 + time[1] * 60 + time[2];
    if (secondsRemaining <= 0) return;
    runTicker();
  }

  function resumeTimer() {
    runTicker();
  }

  // Leaves for the title menu. If a countdown is in progress it is paused
  // (ticker stopped, secondsRemaining preserved) rather than cancelled, so
  // selecting TIMER again from the menu can resume it. A brief notice is
  // shown for one frame before navigating away.
  function goToMenuFromRunning() {
    stopTicker();
    mode = C.MODES.PAUSED;
    runRow = 0;
    h.clear(1);
    h.setColor(3).setFontMonofonto23().setFontAlign(0, 0).drawString('TIMER PAUSED', 240, 150);
    h.flip();
    Pip.lastFlip = getTime();
    goTo('HOLO/VAULT_TEC_TIMER/TITLE.JS');
  }

  // knob1 press — behavior depends on mode/pos
  function onPress() {
    if (mode === C.MODES.SET) {
      if (pos <= 2) {
        editing = !editing;
        Pip.playSound('TAB');
        draw();
      } else if (pos === 3) {
        Pip.playSound('TAB');
        goTo('HOLO/VAULT_TEC_TIMER/TITLE.JS');
      } else if (pos === 4) {
        startTimer();
      } else if (pos === 5 && alertType === 0) {
        browsingSound = !browsingSound;
        Pip.playSound('TAB');
        draw();
      }
    } else if (mode === C.MODES.RUNNING) {
      if (runRow === 0) {
        stopTicker();
        mode = C.MODES.SET;
        draw();
      } else {
        Pip.playSound('TAB');
        goToMenuFromRunning();
      }
    } else if (mode === C.MODES.PAUSED) {
      if (runRow === 0) {
        Pip.playSound('TAB');
        resumeTimer();
      } else if (runRow === 1) {
        mode = C.MODES.SET;
        draw();
      } else {
        Pip.playSound('TAB');
        goTo('HOLO/VAULT_TEC_TIMER/TITLE.JS');
      }
    } else if (mode === C.MODES.DONE) {
      stopAlarm();
      mode = C.MODES.SET;
      draw();
    }
  }

  // Adjusts the currently-locked time field by -dir (so rotating "down",
  // dir=+1, decreases the value and "up", dir=-1, increases it). If the
  // adjustment would go out of the field's range, editing is exited
  // instead and the caller should continue on to normal navigation.
  function adjustFieldOrExit(dir) {
    const max = pos === 0 ? 99 : 59;
    const next = time[pos] - dir;
    if (next < 0 || next > max) {
      editing = false;
      return false;
    }
    time[pos] = next;
    return true;
  }

  // Moves pos vertically across rows:
  // Row 0: time fields [0: Hours, 1: Minutes, 2: Seconds]
  // Row 1: [3: MENU, 4: START]
  // Row 2: [5: ALERT]
  function moveVertical(dir) {
    if (pos <= 2) {
      lastTop = pos;
      if (dir > 0) {
        if (pos === 0) {
          pos = 3; // Hours -> MENU
          lastPair = 3;
        } else if (pos === 2) {
          pos = 4; // Seconds -> START
          lastPair = 4;
        } else {
          pos = lastPair; // Minutes -> last active of MENU or START
        }
      }
    } else if (pos === 3 || pos === 4) {
      lastPair = pos;
      if (dir > 0) {
        pos = 5; // MENU/START -> ALERT
      } else {
        if (lastTop === 1) {
          pos = 1; // back to Minutes if last came from there
        } else if (pos === 3) {
          pos = 0; // MENU -> Hours
        } else {
          pos = 2; // START -> Seconds
        }
      }
    } else if (pos === 5) {
      if (dir < 0) {
        pos = lastPair; // ALERT -> last active of MENU/START
      }
    }
  }

  // knob1 rotate — in SET mode: adjusts the locked field's value while
  // editing (auto-exiting and continuing to navigate once out of range);
  // otherwise moves vertically across rows.
  function onKnob1(dir) {
    if (dir) {
      if (mode === C.MODES.SET) {
        let changed = false;
        if (browsingSound) {
          const prev = soundIdx;
          soundIdx = (soundIdx + dir + soundFiles.length) % soundFiles.length;
          changed = soundIdx !== prev;
        } else if (editing) {
          if (pos <= 2) {
            if (adjustFieldOrExit(dir)) {
              changed = true;
            } else {
              const prev = pos;
              moveVertical(dir);
              changed = pos !== prev;
            }
          }
        } else {
          const prev = pos;
          moveVertical(dir);
          changed = pos !== prev;
        }
        if (changed) Pip.playSound('SCROLL');
        draw();
      } else if (mode === C.MODES.RUNNING) {
        const prev = runRow;
        runRow = E.clip(runRow + dir, 0, 1);
        if (runRow !== prev) Pip.playSound('SCROLL');
        draw();
      } else if (mode === C.MODES.PAUSED) {
        const prev = runRow;
        runRow = E.clip(runRow + dir, 0, 2);
        if (runRow !== prev) Pip.playSound('SCROLL');
        draw();
      }
    } else {
      onPress();
    }
  }

  // Handles knob2's horizontal navigation once not editing: cycles the
  // three time fields, toggles MENU/START, or cycles the alert type.
  function horizontalNav(dir) {
    if (browsingSound) return false;
    if (pos <= 2) {
      const prev = pos;
      pos = (pos + dir + 3) % 3;
      lastTop = pos;
      return pos !== prev;
    } else if (pos === 3 || pos === 4) {
      pos = pos === 3 ? 4 : 3;
      lastPair = pos;
      return true;
    } else if (pos === 5) {
      const prev = alertType;
      alertType = (alertType + dir + C.ALERT_TYPES.length) % C.ALERT_TYPES.length;
      return alertType !== prev;
    }
    return false;
  }

  // knob2 rotate — in SET mode: adjusts values or sound selection while editing/browsing;
  // otherwise cycles between time fields, MENU/START, or alert type.
  function onKnob2(dir) {
    if (mode === C.MODES.RUNNING) {
      const prev = runRow;
      runRow = E.clip(runRow + dir, 0, 1);
      if (runRow !== prev) Pip.playSound('SCROLL');
      draw();
      return;
    }
    if (mode !== C.MODES.SET) return;

    let changed = false;
    if (browsingSound) {
      const prev = soundIdx;
      soundIdx = (soundIdx + dir + soundFiles.length) % soundFiles.length;
      changed = soundIdx !== prev;
    } else if (editing) {
      if (pos <= 2) {
        if (adjustFieldOrExit(dir)) {
          changed = true;
        } else {
          changed = horizontalNav(dir);
        }
      }
    } else {
      changed = horizontalNav(dir);
    }
    if (changed) Pip.playSound('SCROLL');
    draw();
  }

  Pip.audioStop();
  loadSoundFiles();
  layoutButtonPair();
  layoutAlertWidth();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  redrawInterval = setInterval(draw, 1000);
  draw();

  return {
    id: "TIMER",
    remove: function () {
      clearInterval(redrawInterval);
      stopTicker();
      stopAlarm();
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      Pip.audioStop();
      h.clear();
    },
  };
});