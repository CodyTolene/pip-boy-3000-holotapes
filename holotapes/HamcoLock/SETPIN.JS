/* HAMCO LOCK - first-run PIN creation.
 *
 * Shown the first time the lock runs (SETTINGS/LOCK.JSON configured !== true).
 * The user enters a 4-digit code, confirms it, and it is saved with
 * configured:true. After that the normal auth screen (LOCK.JS) takes over and
 * this module is never shown again. Mirrors the scaffolding of SETTINGS.JS so it
 * grabs/releases the same listeners the same way.
 *
 * args: (cfg, save, done, reason)
 */
(function (cfg, save, done, reason) {
  let screenW = h.getWidth(),
    screenH = h.getHeight();
  let screen = 'new',
    digits = [0, 0, 0, 0],
    slot = 0,
    first = '',
    notice = '';
  let active = true,
    leaving = false,
    noticeTimer = 0,
    keepAwake = 0;
  let oldModes, oldChange, oldLoad, current;

  function play(name) {
    Pip.playSound(name);
  }
  function shade(x1, y1, x2, y2) {
    Pip.shadeBox(x1, y1, x2, y2);
  }
  function txt(text, x, y, size, color) {
    h.setColor(color === undefined ? 3 : color).setFontAlign(0, 0);
    if (size === 28) h.setFontMonofonto28();
    else if (size === 23) h.setFontMonofonto23();
    else if (size === 18) h.setFontMonofonto18();
    else h.setFontMonofonto14();
    h.drawString(text, x, y);
  }
  function resetDigits() {
    digits = [0, 0, 0, 0];
    slot = 0;
  }
  function draw() {
    if (!active) return;
    h.clear(1)
      .setColor(2)
      .drawRect(8, 8, screenW - 8, screenH - 8)
      .setColor(1)
      .drawRect(12, 12, screenW - 12, screenH - 12);
    txt('SET LOCK', screenW / 2, 46, 18, 3);
    txt(
      screen === 'new' ? 'CREATE ACCESS CODE' : 'CONFIRM ACCESS CODE',
      screenW / 2,
      86,
      18,
      3,
    );
    txt('SET YOUR 4-DIGIT PIN', screenW / 2, 114, 14, 2);
    h.setFontMonofonto23();
    for (let i = 0; i < 4; i++) {
      let x = 150 + i * 60;
      if (i === slot) shade(x - 22, 146, x + 22, 188);
      else h.setColor(2).drawRect(x - 22, 146, x + 22, 188);
      h.setColor(i === slot ? 3 : 2)
        .setFontAlign(0, 0)
        .drawString(String(digits[i]), x, 167);
    }
    if (notice) txt(notice, screenW / 2, 244, 14, 3);
    txt('TURN = DIGIT   //   PRESS = ENTER', screenW / 2, 300, 14, 2);
    h.flip();

    Pip.lastFlip = getTime();
  }
  function show(msg) {
    notice = msg;
    draw();
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () {
      noticeTimer = 0;
      notice = '';
      draw();
    }, 1300);
  }
  function restoreModes() {
    Pip.removeListener('mode', onMode);
    if (oldModes)
      for (let i = 0; i < oldModes.length; i++) Pip.on('mode', oldModes[i]);
    oldModes = 0;
  }
  function blockedChange() {
    if (active) return draw();
    return oldChange && oldChange.apply(Pip, arguments);
  }
  function blockedLoad() {
    if (active) return draw();
    return oldLoad && oldLoad.apply(Pip, arguments);
  }
  function cleanup() {
    if (!active) return;
    active = false;
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = 0;
    if (keepAwake) {
      clearInterval(keepAwake);
      keepAwake = 0;
    }
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
    restoreModes();
    if (Pip.changeMenu === blockedChange) Pip.changeMenu = oldChange;
    if (Pip.loadMenu === blockedLoad) Pip.loadMenu = oldLoad;
    oldChange = oldLoad = 0;
    digits = 0;
    current = 0;
    Pip.CURRENT = { remove: function () {} };
    if (!leaving) done('REMOVED');
  }
  function leave(action) {
    if (!active || leaving) return;
    leaving = true;
    cleanup();
    done(action);
  }
  function submitPin() {
    let pin = digits.join('');
    if (screen === 'new') {
      first = pin;
      screen = 'confirm';
      resetDigits();
      play('SCROLL');
      show('RE-ENTER TO CONFIRM');
      return;
    }
    if (pin !== first) {
      screen = 'new';
      first = '';
      resetDigits();
      play('TAB');
      return show('CODE MISMATCH');
    }
    cfg.p = pin;
    cfg.configured = true;
    if (!save(cfg)) return show('SAVE FAILED');
    play('SELECT');
    leave(reason === 'SETTINGS' ? 'SETTINGS' : 'OPEN');
  }
  function onKnob1(dir, longPress) {
    if (!active || longPress) return;
    if (dir === 0) return submitPin();
    digits[slot] = (digits[slot] + dir + 10) % 10;
    notice = '';
    play('SCROLL');
    draw();
  }
  function onKnob2(dir) {
    if (!active || !dir) return;
    slot = (slot + (dir > 0 ? 1 : -1) + 4) % 4;
    notice = '';
    play('SCROLL');
    draw();
  }
  function onMode() {
    if (active) {
      play('TAB');
      draw();
    }
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
    id: 'LOCKSETPIN',
    notDefault: true,
    fullscreen: true,
    remove: cleanup,
  };
  Pip.CURRENT = current;
  draw();
  keepAwake = setInterval(function () {
    Pip.kickIdleTimer();
  }, 3000);
  return { remove: cleanup };
});
