// =============================================================================
//  Name: Magic 8 Ball+
//  Author: Theeohn Megistus
//  License: MIT
//  Repository: https://www.github.com/Theeohn/Magic-8-Ball-3000a
// =============================================================================
(function() {
  const C = {
    // Shared and Classic Answers
    ANSWERS: [
      "Yes",
      "YES",
      "It is certain",
      "It is decidedly so",
      "Without a doubt",
      "Yes, definitely",
      "You may rely on it",
      "As I see it, yes",
      "Most likely",
      "Outlook good",
      "Signs point to yes",
      "For sure",
      "Absolutely",
      "100% yes",
      "Reply hazy, try again",
      "Ask again later",
      "Better not tell you now",
      "Cannot predict now",
      "Maybe",
      "Possibly",
      "Concentrate and ask again",
      "Don't count on it",
      "No",
      "NO",
      "Don't",
      "Doutful",
      "You should reconsider",
      "Very doubtful",
      "My reply is no",
      "My sources say no",
      "Outlook not so good",
      "Absolutely not"
    ],

    // Plus Exclusive Secrets
    SECRETS: [
      "You sure ask a lot of questions",
      "Well, it's possible",
      "Be more realistic",
      "Come again, this time in my ear?",
      "Get good",
      "Maybe?",
      "Tooootally",
      "Very improbable",
      "404: Answer not found",
      "Well yes, but actually no",
      "Well no, but actually yes"
    ],

    GAPS: [60, 70, 90, 120, 160, 210, 270],

    ACCEL_POLL_MS: 80,
    SHAKE_DELTA: 0.70,
    HARD_SHAKE_DELTA: 1.70,
    REQUIRED_HITS: 1,
    HIT_WINDOW_MS: 90,
    SHAKE_COOLDOWN_MS: 100
  };

  let mode = 0; // 0 = Title, 1 = Classic, 2 = Plus
  let titleSelection = 0; // 0 = Classic, 1 = Plus
  let shaking = 0;
  let step = 0;
  let timer;
  let accelTimer;
  let idx = 0;
  let cache = [];
  let shakeCount = 0;

  let haveAccelSample = false;
  let lastX = 0;
  let lastY = 0;
  let lastZ = 0;
  let shakeHits = 0;
  let hitWindowStarted = 0;
  let ignoreMotionUntil = 0;

  function drawTitleBg() { "ram";

    let file = E.openFile('HOLO/MAGIC_8_BALL+/TITLE.BIN', 'r');
    let target = new Uint8Array(h.buffer);
    let offset = target.length;
    let chunk = file.read(256);

    while (chunk) {
      offset -= chunk.length;
      target.set(chunk, offset);
      chunk = file.read(256);
    }
    file.close();
  }

  function drawTitle() { "ram";
    // Classic Box
    h.setColor(0).fillRect(270, 208, 390, 248);
    h.setColor(titleSelection === 0 ? 3 : 2).drawRect(270, 208, 390, 248);
    if (titleSelection === 0) h.fillRect(270, 208, 390, 248);
    
    h.setColor(titleSelection === 0 ? 0 : 3).setFontMonofonto23().setFontAlign(0, 0);
    h.drawString("Classic", 330, 228);

    // Plus Box
    h.setColor(0).fillRect(270, 257, 390, 297);
    h.setColor(titleSelection === 1 ? 3 : 2).drawRect(270, 257, 390, 297);
    if (titleSelection === 1) h.fillRect(270, 257, 390, 297);
    
    h.setColor(titleSelection === 1 ? 0 : 3).setFontMonofonto23().setFontAlign(0, 0);
    h.drawString("Plus", 330, 277);

    Pip.blitOptions.y1 = 208;
    Pip.blitOptions.y2 = 297;
    h.flip();
    Pip.lastFlip = getTime();
    delete Pip.blitOptions.y1;
    delete Pip.blitOptions.y2;
  }

  function getLines(i) {
    if (cache[i]) return cache[i];

    const text = (mode === 2 && i >= C.ANSWERS.length)
      ? C.SECRETS[i - C.ANSWERS.length]
      : C.ANSWERS[i];

    cache[i] = h.setFontMonofonto28().wrapString(text, 154);
    return cache[i];
  }

  function drawBall(jx, jy, i) { "ram";
    h.clearRect(0, 0, 480, 320);
    h.setColor(2).fillCircle(240 + jx, 160 + jy, 156);
    h.setColor(3).drawCircle(240 + jx, 160 + jy, 156);
    h.setColor(0).fillCircle(240 + jx, 160 + jy, 111);
    h.setColor(3).drawCircle(240 + jx, 160 + jy, 111);

    if (i >= 0) {
      const lines = getLines(i);
      const n = lines.length;
      const y0 = 160 + jy - (n - 1) * 16;

      h.setClipRect(160 + jx, 80 + jy, 320 + jx, 240 + jy);
      h.setColor(3).setFontMonofonto28().setFontAlign(0, 0);

      for (let k = 0; k < n; k++) {
        h.drawString(lines[k], 240 + jx, y0 + k * 32);
      }

      h.setClipRect(0, 0, 480, 320);
    }

    // Adapt font styling based on mode selection
    if (mode === 1) {
      h.setColor(3).setFontMonofonto23().setFontAlign(-1, -1);
      h.drawString("Magic", 20, 18);
      h.drawString("8 Ball", 20, 45);
    } else {
      h.setColor(3).setFontMonofonto23().setFontAlign(-1, -1);
      h.drawString("Magic", 20, 18);
      h.drawString("8 Ball+", 20, 45);
    }

    h.setColor(2).setFontMonofonto14().setFontAlign(-1, -1);
    h.drawString("by Theeohn", 20, 73);

    h.setColor(2).setFontMonofonto14().setFontAlign(1, 1);
    h.drawString("Shake Pip-Boy", 461, 279);
    h.drawString("or use a wheel!", 461, 295);

    h.flip();
    Pip.lastFlip = getTime();
  }

  function finish() {
    shaking = 0;
    ignoreMotionUntil = getTime() * 1000 + C.SHAKE_COOLDOWN_MS;
    haveAccelSample = false;
    shakeHits = 0;
    hitWindowStarted = 0;

    if (mode === 2) {
      shakeCount++;
      if (shakeCount % 12 === 0) {
        idx = C.ANSWERS.length + Math.randInt(C.SECRETS.length);
      } else {
        idx = Math.randInt(C.ANSWERS.length);
      }
    } else {
      idx = Math.randInt(20); // First 20 are classic answers
    }

    drawBall(0, 0, idx);
  }

  function clickStep() { "ram";
    Pip.playSound("SCROLL");
    drawBall(Math.randInt(11) - 5, Math.randInt(11) - 5, -1);
    step++;

    if (step < 8) {
      timer = setTimeout(clickStep, C.GAPS[step - 1]);
    } else {
      timer = undefined;
      finish();
    }
  }

  function shake() {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }

    shaking = 1;
    step = 0;
    shakeHits = 0;
    hitWindowStarted = 0;

    if (Pip.kickIdleTimer) Pip.kickIdleTimer();
    clickStep();
  }

  function pollAccelerometer() { "ram";
    if (!Pip.accel || !Pip.accel.read) return;

    const now = getTime() * 1000;
    if (now < ignoreMotionUntil) return;

    const sample = Pip.accel.read();
    if (!sample || sample.length < 3) return;

    const x = sample[0];
    const y = sample[1];
    const z = sample[2];

    if (!haveAccelSample) {
      lastX = x;
      lastY = y;
      lastZ = z;
      haveAccelSample = true;
      return;
    }

    const delta = Math.abs(x - lastX) +
                  Math.abs(y - lastY) +
                  Math.abs(z - lastZ);

    lastX = x;
    lastY = y;
    lastZ = z;

    if (delta >= C.HARD_SHAKE_DELTA) {
      shake();
      return;
    }

    if (delta < C.SHAKE_DELTA) {
      if (hitWindowStarted && now - hitWindowStarted > C.HIT_WINDOW_MS) {
        shakeHits = 0;
        hitWindowStarted = 0;
      }
      return;
    }

    if (!hitWindowStarted || now - hitWindowStarted > C.HIT_WINDOW_MS) {
      hitWindowStarted = now;
      shakeHits = 1;
    } else {
      shakeHits++;
    }

    if (shakeHits >= C.REQUIRED_HITS) shake();
  }

  function onKnob1(dir) {
    if (mode === 0) {
      if (dir) {
        titleSelection = titleSelection === 0 ? 1 : 0;
        Pip.playSound("SCROLL");
        drawTitle();
      } else {
        Pip.playSound("TAB");
        mode = titleSelection === 0 ? 1 : 2;
        idx = mode === 1 ? Math.randInt(20) : Math.randInt(C.ANSWERS.length);
        
        if (Pip.accel && Pip.accel.read) {
          accelTimer = setInterval(pollAccelerometer, C.ACCEL_POLL_MS);
        }
        
        drawBall(0, 0, idx);
      }
    } else {
      if (dir === 0 || dir) shake();
    }
  }

  function onKnob2(dir) {
    if (mode === 0) {
      onKnob1(dir);
    } else if (dir) {
      shake();
    }
  }

  // Initialize
  Pip.onExclusive("knob1", onKnob1);
  Pip.onExclusive("knob2", onKnob2);
  
  setTimeout(() => {
    E.defrag();
    drawTitleBg();
    drawTitle();
  }, 0);

  return {
    id: "MAGIC8BALL+",
    notDefault: true,
    fullscreen: true,

    remove: function() {
      if (timer) clearTimeout(timer);
      if (accelTimer) clearInterval(accelTimer);

      timer = undefined;
      accelTimer = undefined;

      Pip.removeListener("knob1", onKnob1);
      Pip.removeListener("knob2", onKnob2);
      Pip.audioStop();
      h.clear();
    }
  };
});