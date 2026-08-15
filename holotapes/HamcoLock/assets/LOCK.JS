(function (cfg, reason, done) {
  let screenW = h.getWidth(),
    screenH = h.getHeight();
  let INTRO_MS = 9999,
    INTRO_LOGO_X = 378,
    INTRO_LOGO_Y = 100,
    INTRO_LOGO_SCALE = 1.5,
    LOGO_X = 240,
    LOGO_Y = 100,
    VIDEO_MS = 3400,
    SETTLE_MS = 500,
    FADE_MS = 300,
    SOUND_MS = 2800,
    SFX_VOL = 26;
  /* ---- REBOOT INTRO / LOGO TUNING ----
   LOGO POSITION is the CENTER of the logo, so ANY size logo auto-centers on the
   point -- just drop in a new .BIN and nudge these numbers (screen is 480x320):
     INTRO_LOGO_X / INTRO_LOGO_Y : logo center during the boot intro.
     INTRO_LOGO_SCALE : visual size of the BOOT logo only (1 = native file size,
                        1.5 = 50% bigger, 0.7 = smaller). Login logo is unchanged.
     LOGO_X / LOGO_Y             : logo center on the normal login screen.
   TIMING (ms):
     INTRO_MS  : minimum logo-only time before the login is allowed to appear.
     SETTLE_MS : EXTRA wait AFTER boot finishes before the login fades in.
                 >>> RAISE if the login starts too early <<<  (lower = sooner)
     FADE_MS   : how long the login brighten-in takes (dim -> full).
     VIDEO_MS  : FALLBACK video cap only -- the real length is auto-read from
                 G.AVI at runtime, so swapping in a new video "just works".
     SOUND_MS  : "ACCESS GRANTED" sound time before the video plays.
   NOTE: the ACCESS-GRANTED sound + video + reveal live in GRANT.JS, which is only
   eval-loaded after a correct PIN. That keeps waking the Pip down to eval'ing
   this small login core (the full lock + video on top of the freshly rebuilt
   watch UI was the out-of-memory crash on wake). */
  let VIDEO = 'HOLO/HAMCOLOCK/G.AVI';
  let digits = [0, 0, 0, 0],
    digitSet = [false, false, false, false],
    slot = 0,
    denied = false,
    granted = false,
    grantedFlash = false;
  let cursorOn = true,
    blinkTimer = 0,
    intro = reason === 'STARTUP',
    introTimer = 0,
    introWaits = 0,
    revealMax = 3;
  let active = true,
    leaving = false,
    redraw = 0,
    grantSoundTimer = 0,
    ledTimer = 0,
    keepAwake = 0,
    sysVol = 0,
    grantMod = 0;
  let grantSoundActive = false;
  let oldModes,
    oldChange,
    oldLoad,
    current,
    hudTimers = [];
  function play(name) {
    Pip.playSound(name);
  }
  function ledFlash(red, green, blue) {
    Pip.fadeTo([
      { pin: LED_RED, target: red },
      { pin: LED_GREEN, target: green },
      { pin: LED_BLUE, target: blue },
    ]);
    if (ledTimer) clearTimeout(ledTimer);
    ledTimer = setTimeout(ledRestore, 600);
  }
  function ledRestore() {
    ledTimer = 0;
    try {
      Pip.ledsRestore();
    } catch (e) {
      if (Pip.checkChargeStatus) Pip.checkChargeStatus(true);
    }
  }
  function sfxVolOn() {
    sysVol = Pip.settings && Pip.settings.volume;
    if (Pip.setVol) Pip.setVol(SFX_VOL);
  }
  function sfxVolOff() {
    if (Pip.setVol && sysVol != null) Pip.setVol(sysVol);
  }
  function shade(x1, y1, x2, y2) {
    Pip.shadeBox(x1, y1, x2, y2);
  }
  function getPlayerName() {
    /* The global `player` is a Player instance; the saved PLAYER.JSON data it
       wraps lives on player.player, so the name is player.player.name. */
    return player.player.name || 'VAULT DWELLER';
  }
  function factionKey() {
    return cfg && cfg.f ? cfg.f : 'vaulttec';
  }
  function txt(text, x, y, size, color) {
    h.setColor(color === undefined ? 3 : color).setFontAlign(0, 0);
    if (size === 28) h.setFontMonofonto28();
    else if (size === 23) h.setFontMonofonto23();
    else if (size === 18) h.setFontMonofonto18();
    else h.setFontMonofonto14();
    h.drawString(text, x, y);
  }
  function rc(level) {
    return level < revealMax ? level : revealMax;
  }
  function ffile(faction) {
    return (faction || 'vaulttec').toUpperCase();
  }
  let logoKey = '',
    logoData = 0;
  /* Faction .BIN files are native Pip-Boy images (header byte 2 has the 0x80
   transparent flag set), so drawImage takes the raw string directly -- no need
   to hand-parse width/height/buffer out of the header. */
  function drawLogo(faction, lx, ly, scale) {
    const key = ffile(faction);
    if (lx === undefined) lx = LOGO_X;
    if (ly === undefined) ly = LOGO_Y;
    if (key !== logoKey) {
      logoData = 0;
      logoKey = key;
      try {
        logoData = require('fs').readFileSync('HOLO/HAMCOLOCK/' + key + '.BIN');
      } catch (e) {
        logoData = 0;
      }
    }
    if (logoData) {
      const logoWidth = logoData.charCodeAt(0),
        logoHeight = logoData.charCodeAt(1);
      if (scale && scale !== 1)
        h.drawImage(logoData, lx, ly, { scale: scale, rotate: 0 });
      else h.drawImage(logoData, lx - (logoWidth >> 1), ly - (logoHeight >> 1));
      return;
    }
    txt(key, lx, ly, 28, 3);
  }
  function renderLoginBox() {
    let y1 = 191,
      y2 = 232,
      lx1 = 91,
      lx2 = 201,
      vx1 = 209,
      vx2 = 389;
    h.setColor(1).fillRect(lx1, y1, lx2, y2);
    h.setFontMonofonto18()
      .setFontAlign(0, 0)
      .setColor(rc(3))
      .drawString('LOGIN', (lx1 + lx2) / 2, (y1 + y2) / 2);
    h.setColor(1).fillRect(vx1, y1, vx2, y2);
    h.setFontMonofonto23().setFontAlign(0, 0);
    for (let i = 0; i < 4; i++) {
      let x = 232 + i * 45;
      h.setColor(rc(i === slot ? 3 : 2));
      if (digitSet[i]) h.drawString(String(digits[i]), x, 212);
      else if (i === slot && cursorOn) h.drawString('-', x, 212);
    }
  }
  function draw() {
    if (!active || granted) return;
    let faction = factionKey();
    h.clear(1);
    h.setColor(2).drawRect(8, 8, screenW - 8, screenH - 8);
    h.setColor(1).drawRect(12, 12, screenW - 12, screenH - 12);
    if (intro) {
      drawLogo(faction, INTRO_LOGO_X, INTRO_LOGO_Y, INTRO_LOGO_SCALE);
      h.flip();

      Pip.lastFlip = getTime();

      return;
    }
    let name = getPlayerName();
    drawLogo(faction);
    txt('Welcome ' + name, screenW / 2, 172, 18, rc(3));
    renderLoginBox();
    if (grantedFlash) {
      txt('ACCESS GRANTED', screenW / 2, 249, 18, 3);
    } else if (denied) {
      txt('ACCESS DENIED', screenW / 2, 249, 18, 1);
      txt('RE-ENTER PASSWORD', screenW / 2, 267, 14, 2);
    }
    h.flip();

    Pip.lastFlip = getTime();
  }
  function fadeStep(lvl) {
    if (active && !intro && !granted) {
      revealMax = lvl;
      resetRoll();
      draw();
    }
  }
  function endIntro() {
    introTimer = 0;
    if (!active) return;
    let rdy = false,
      rolling = true;

    rdy = Pip.running === true && !Pip.menuChanging;

    rolling = !!(
      Pip.blitOptions &&
      Pip.blitOptions.anim &&
      Pip.blitOptions.anim.length
    );

    if ((!rdy || rolling) && introWaits < 50) {
      introWaits++;
      introTimer = setTimeout(endIntro, 150);
      return;
    }
    introTimer = setTimeout(startReveal, SETTLE_MS);
  }
  function startReveal() {
    introTimer = 0;
    if (!active) return;
    intro = false;
    revealMax = 1;
    fadeStep(1);
    /* Chain the brighten-in steps through the single tracked introTimer handle
       so cleanup() can cancel a fade that is still in progress. */
    introTimer = setTimeout(
      function () {
        fadeStep(2);
        introTimer = setTimeout(
          function () {
            introTimer = 0;
            fadeStep(3);
          },
          (FADE_MS * 0.55) | 0,
        );
      },
      (FADE_MS * 0.45) | 0,
    );
  }
  function blinkTick() {
    if (!active || granted || intro) return;
    cursorOn = !cursorOn;
    renderLoginBox();
    Pip.blitOptions.y1 = 189;
    Pip.blitOptions.y2 = 234;
    h.flip();
    delete Pip.blitOptions.y1;
    delete Pip.blitOptions.y2;
    Pip.lastFlip = getTime();
  }
  function clearHudTimers() {
    while (hudTimers.length) {
      clearTimeout(hudTimers.pop());
    }
  }
  function restoreModes() {
    Pip.removeListener('mode', onMode);
    if (oldModes)
      for (let i = 0; i < oldModes.length; i++) Pip.on('mode', oldModes[i]);
    oldModes = 0;
  }
  function blockedChange() {
    if (active) return;
    return oldChange && oldChange.apply(Pip, arguments);
  }
  function blockedLoad() {
    if (active) return;
    return oldLoad && oldLoad.apply(Pip, arguments);
  }
  function resetRoll() {
    if (Pip.blitOptions) {
      Pip.blitOptions.anim = [];
      Pip.blitOptions.ydiff = 1;
      Pip.blitOptions.y =
        Pip.settings && typeof Pip.settings.vShift === 'number'
          ? Pip.settings.vShift
          : 0;
    }
  }
  function loadGrantMod() {
    if (grantMod) return grantMod;
    let src = 0,
      f = 0;
    try {
      src = require('fs').readFileSync('HOLO/HAMCOLOCK/GRANT.JS');
      f = eval(src);
      src = 0;
      grantMod = f({
        video: VIDEO,
        videoMs: VIDEO_MS,
        finish: function () {
          leave('OPEN');
        },
        resetRoll: resetRoll,
        clearHud: clearHudTimers,
      });
      f = 0;
    } catch (e) {
      grantMod = 0;
      src = 0;
      f = 0;
    }
    return grantMod;
  }
  function beginVideo() {
    if (!active) return;
    if (redraw) {
      clearTimeout(redraw);
      redraw = 0;
    }
    granted = true;
    let mod = grantMod || loadGrantMod();
    if (mod) mod.start();
    else
      setTimeout(function () {
        if (active && !leaving) leave('OPEN');
      }, 400);
  }
  function cleanup() {
    if (!active) return;
    active = false;
    if (redraw) clearTimeout(redraw);
    if (grantSoundTimer) clearTimeout(grantSoundTimer);
    if (blinkTimer) clearInterval(blinkTimer);
    blinkTimer = 0;
    if (keepAwake) {
      clearInterval(keepAwake);
      keepAwake = 0;
    }
    if (introTimer) {
      clearTimeout(introTimer);
      introTimer = 0;
    }
    if (ledTimer) {
      clearTimeout(ledTimer);
      ledTimer = 0;
    }

    Pip.ledsRestore();

    sfxVolOff();
    redraw = grantSoundTimer = 0;
    /* audioStop isn't present on every firmware build, so only call it if it is. */
    if (grantSoundActive && Pip.audioStop) {
      Pip.audioStop();
    }
    grantSoundActive = false;
    resetRoll();
    clearHudTimers();
    if (grantMod) {
      grantMod.abort();

      grantMod = 0;
    }
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
    restoreModes();
    if (Pip.changeMenu === blockedChange) Pip.changeMenu = oldChange;
    if (Pip.loadMenu === blockedLoad) Pip.loadMenu = oldLoad;
    oldChange = oldLoad = 0;
    digits = 0;
    digitSet = 0;
    current = 0;
    logoData = 0;
    logoKey = '';
    Pip.CURRENT = { remove: function () {} };
    if (!leaving) {
      done('REMOVED');
    }
  }
  function leave(action) {
    if (!active || leaving) return;
    leaving = true;
    cleanup();
    done(action);
  }
  function startGrantSound() {
    if (!active) return;
    grantSoundActive = true;
    sfxVolOn();
    try {
      Pip.audioStart('HOLO/HAMCOLOCK/A.WAV', { repeat: false });
    } catch (e) {
      /* WAV missing/locked: skip the sound, go straight to the video */ grantSoundActive = false;
      return beginVideo();
    }
    if (grantSoundTimer) clearTimeout(grantSoundTimer);
    grantSoundTimer = setTimeout(function () {
      grantSoundTimer = 0;
      grantSoundActive = false;
      beginVideo();
    }, SOUND_MS);
  }
  function grant() {
    ledFlash(0, 0, 1);
    if (reason === 'SETTINGS') {
      play('SELECT');
      return leave('SETTINGS');
    }
    denied = false;
    grantedFlash = true;
    draw();
    loadGrantMod();
    startGrantSound();
  }
  function resetEntry() {
    digits = [0, 0, 0, 0];
    digitSet = [false, false, false, false];
    slot = 0;
    cursorOn = true;
    grantedFlash = false;
  }
  function reject() {
    resetEntry();
    denied = true;
    ledFlash(1, 0, 0);
    sfxVolOn();
    try {
      if (typeof Pip.screenGlitch === 'function') Pip.screenGlitch();
      else play('TAB');
    } catch (e) {
      play('TAB');
    }
    setTimeout(sfxVolOff, 700);
    draw();
    if (redraw) clearTimeout(redraw);
    redraw = setTimeout(function () {
      redraw = 0;
      draw();
    }, 330);
  }
  function submit() {
    if (digits.join('') === cfg.p) grant();
    else reject();
  }
  function onKnob1(dir, longPress) {
    if (!active || granted || longPress) return;
    if (intro) return endIntro();
    if (dir === 0) {
      digitSet[slot] = true;
      if (slot < 3) {
        slot++;
        cursorOn = true;
        play('SCROLL');
        draw();
      } else {
        play('SCROLL');
        submit();
      }
      return;
    }
    digits[slot] = (digits[slot] + dir + 10) % 10;
    digitSet[slot] = true;
    cursorOn = true;
    denied = false;
    play('SCROLL');
    draw();
  }
  function onKnob2(dir) {
    if (!active || granted || !dir) return;
    if (intro) return endIntro();
    slot = (slot + (dir > 0 ? 1 : -1) + 4) % 4;
    cursorOn = true;
    denied = false;
    play('SCROLL');
    draw();
  }
  function onMode() {
    if (active && !granted && !intro) draw();
  }

  Pip.remove();

  oldModes = Pip['#onmode'] ? Pip['#onmode'].slice() : [];
  Pip.removeAllListeners('mode');
  Pip.on('mode', onMode);
  oldChange = Pip.changeMenu;
  oldLoad = Pip.loadMenu;
  Pip.changeMenu = blockedChange;
  Pip.loadMenu = blockedLoad;
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  current = {
    id: 'hamcolock',
    notDefault: true,
    fullscreen: true,
    remove: cleanup,
  };
  Pip.CURRENT = current;
  if (reason !== 'SETTINGS') {
    Pip.audioStart('HOLO/HAMCOLOCK/A.WAV', { repeat: false });
  }
  draw();
  blinkTimer = setInterval(blinkTick, 500);
  keepAwake = setInterval(function () {
    Pip.kickIdleTimer();
  }, 3000);
  if (intro) {
    introTimer = setTimeout(endIntro, INTRO_MS);
  }
  return { remove: cleanup };
});
