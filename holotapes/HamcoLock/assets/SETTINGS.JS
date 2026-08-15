(function (cfg, save, done) {
  let screenW = h.getWidth(),
    screenH = h.getHeight();
  let labels = [
    'STARTUP',
    'SLEEP',
    'BOTH',
    'OFF',
    'SET PIN',
    'SET FACTION',
    'EXIT',
  ];
  let modes = ['startup', 'sleep', 'both', 'off'];
  let fkeys = [
    'interstate80',
    'ham',
    'legion',
    'enclave',
    'ncr',
    'ncrseal',
    'redtalon',
    'fiends',
    'vangraffs',
    'vaulttec',
    'brotherhood',
    'enclave1',
    'gunners',
    'operators',
    'kings',
    'bigmt',
    'tunnelsnakes',
    'atomcats',
    'greatkhans',
    'followers',
    'responders',
    'vipers',
    'rangers',
    'mothman',
    'whiteglove',
    'smugglers',
  ];
  let fnames = [
    'INTERSTATE 80S',
    'H.A.M.',
    "CAESAR'S LEGION",
    'ENCLAVE REMNANTS',
    'NCR',
    'NCR (SEAL)',
    'RED TALON CO.',
    'THE FIENDS',
    'VAN GRAFFS',
    'VAULT-TEC',
    'BROTHERHOOD OF STEEL',
    'ENCLAVE',
    'GUNNERS',
    'OPERATORS',
    'THE KINGS',
    'BIG MT',
    'TUNNEL SNAKES',
    'ATOM CATS',
    'GREAT KHANS',
    'FOLLOWERS OF THE APOCALYPSE',
    'RESPONDERS',
    'VIPERS',
    'RANGERS',
    'MOTHMAN CULT',
    'WHITE GLOVE SOCIETY',
    'SMUGGLERS',
  ];
  let selected = modes.indexOf(cfg.m);
  if (selected < 0) selected = 0;
  let screen = 'menu',
    digits = [0, 0, 0, 0],
    slot = 0,
    first = '',
    notice = '',
    fsel = fkeys.indexOf(cfg.f);
  if (fsel < 0) fsel = fkeys.length - 1;
  let active = true,
    leaving = false,
    noticeTimer = 0,
    keepAwake = 0;
  let oldModes,
    oldChange,
    oldLoad,
    current,
    logoKey = '',
    logoData = 0;
  function play(name) {
    Pip.playSound(name);
  }
  function shade(x1, y1, x2, y2) {
    Pip.shadeBox(x1, y1, x2, y2);
  }
  function getName() {
    /* The global `player` is a Player instance; the saved PLAYER.JSON data it
       wraps lives on player.player, so the name is player.player.name. */
    return player.player.name || 'VAULT DWELLER';
  }
  function txt(text, x, y, size, color) {
    h.setColor(color === undefined ? 3 : color).setFontAlign(0, 0);
    if (size === 28) h.setFontMonofonto28();
    else if (size === 23) h.setFontMonofonto23();
    else if (size === 18) h.setFontMonofonto18();
    else h.setFontMonofonto14();
    h.drawString(text, x, y);
  }
  function ffile(faction) {
    return (faction || 'vaulttec').toUpperCase();
  }
  function logo(faction) {
    const key = ffile(faction);
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
      h.drawImage(logoData, 172, 42);
      return;
    }
    txt(key, screenW / 2, 96, 28, 3);
  }
  function resetDigits() {
    digits = [0, 0, 0, 0];
    slot = 0;
  }
  function pinDraw() {
    txt(
      screen === 'new' ? 'INPUT NEW PASSWORD' : 'CONFIRM PASSWORD',
      screenW / 2,
      72,
      18,
      3,
    );
    txt('4-DIGIT ACCESS CODE', screenW / 2, 100, 14, 2);
    h.setFontMonofonto23();
    for (let i = 0; i < 4; i++) {
      let x = 150 + i * 60;
      if (i === slot) shade(x - 22, 132, x + 22, 174);
      else h.setColor(2).drawRect(x - 22, 132, x + 22, 174);
      h.setColor(i === slot ? 3 : 2)
        .setFontAlign(0, 0)
        .drawString(String(digits[i]), x, 153);
    }
    if (notice) txt(notice, screenW / 2, 232, 14, 3);
  }
  function menuDraw() {
    txt('LOCK SETTINGS', screenW / 2, 28, 18, 3);
    let fi = fkeys.indexOf(cfg.f);
    if (fi < 0) fi = fkeys.length - 1;
    txt('MODE: ' + cfg.m.toUpperCase(), screenW / 2, 50, 14, 2);
    txt('FACTION: ' + fnames[fi], screenW / 2, 69, 14, 2);
    for (let i = 0; i < labels.length; i++) {
      let y = 96 + i * 27;
      if (i === selected) shade(72, y - 10, 408, y + 10);
      h.setColor(i === selected ? 3 : 2)
        .setFontMonofonto16()
        .setFontAlign(-1, 0)
        .drawString(
          (i < 4 && modes[i] === cfg.m ? '[X] ' : '[ ] ') + labels[i],
          104,
          y,
        );
    }
    if (notice) txt(notice, screenW / 2, 286, 14, 3);
    txt('TURN TO NAVIGATE   //   PRESS SELECT', screenW / 2, 306, 14, 2);
  }
  function factionDraw() {
    txt('SELECT FACTION', screenW / 2, 26, 18, 3);
    logo(fkeys[fsel]);
    txt(fnames[fsel], screenW / 2, 156, 18, 3);
    txt(getName(), screenW / 2, 184, 14, 2);
    h.setColor(2).drawLine(98, 204, 382, 204);
    txt('LOCK SCREEN PREVIEW', screenW / 2, 222, 14, 2);
    txt('INPUT PASSWORD', screenW / 2, 246, 18, 3);
    txt(fsel + 1 + ' / ' + fkeys.length, screenW / 2, 296, 14, 1);
  }
  function draw() {
    if (!active) return;
    h.clear(1)
      .setColor(2)
      .drawRect(8, 8, screenW - 8, screenH - 8)
      .setColor(1)
      .drawRect(12, 12, screenW - 12, screenH - 12);
    if (screen === 'menu') menuDraw();
    else if (screen === 'faction') factionDraw();
    else pinDraw();
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
    digits = labels = modes = fkeys = fnames = 0;
    logoData = 0;
    logoKey = '';
    current = 0;
    Pip.CURRENT = { remove: function () {} };
    if (!leaving) done('REMOVED');
  }
  function leave() {
    if (!active || leaving) return;
    leaving = true;
    cleanup();
    done('OPEN');
  }
  function saveFaction() {
    let old = cfg.f;
    cfg.f = fkeys[fsel];
    if (!save(cfg)) {
      cfg.f = old;
      play('TAB');
      return show('SAVE FAILED');
    }
    screen = 'menu';
    selected = 5;
    play('SELECT');
    show('FACTION SAVED');
  }
  function choose() {
    if (selected < 4) {
      let old = cfg.m;
      cfg.m = modes[selected];
      if (save(cfg)) show('MODE SAVED: ' + cfg.m.toUpperCase());
      else {
        cfg.m = old;
        show('SAVE FAILED');
      }
      return;
    }
    if (selected === 4) {
      screen = 'new';
      first = '';
      notice = '';
      resetDigits();
      return draw();
    }
    if (selected === 5) {
      fsel = fkeys.indexOf(cfg.f);
      if (fsel < 0) fsel = fkeys.length - 1;
      screen = 'faction';
      notice = '';
      logoKey = '';
      logoData = 0;
      return draw();
    }
    leave();
  }
  function submitPin() {
    let pin = digits.join('');
    if (screen === 'new') {
      first = pin;
      screen = 'confirm';
      resetDigits();
      notice = 'RE-ENTER PASSWORD';
      return draw();
    }
    if (pin !== first) {
      screen = 'new';
      first = '';
      resetDigits();
      play('TAB');
      return show('PASSWORD MISMATCH');
    }
    let old = cfg.p;
    cfg.p = pin;
    if (!save(cfg)) {
      cfg.p = old;
      show('SAVE FAILED');
      return;
    }
    first = '';
    resetDigits();
    fsel = fkeys.indexOf(cfg.f);
    if (fsel < 0) fsel = fkeys.length - 1;
    screen = 'faction';
    notice = '';
    logoKey = '';
    logoData = 0;
    play('SELECT');
    draw();
  }
  function onKnob1(dir, longPress) {
    if (!active || longPress) return;
    if (screen === 'menu') {
      if (dir === 0) return choose();
      selected = (selected + dir + labels.length) % labels.length;
    } else if (screen === 'faction') {
      if (dir === 0) return saveFaction();
      fsel = (fsel + dir + fkeys.length) % fkeys.length;
      logoKey = '';
      logoData = 0;
    } else {
      if (dir === 0) return submitPin();
      digits[slot] = (digits[slot] + dir + 10) % 10;
    }
    notice = '';
    play('SCROLL');
    draw();
  }
  function onKnob2(dir) {
    if (!active || !dir) return;
    if (screen === 'menu')
      selected =
        (selected + (dir > 0 ? 1 : -1) + labels.length) % labels.length;
    else if (screen === 'faction') {
      fsel = (fsel + (dir > 0 ? 1 : -1) + fkeys.length) % fkeys.length;
      logoKey = '';
      logoData = 0;
    } else slot = (slot + (dir > 0 ? 1 : -1) + 4) % 4;
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
    id: 'LOCKSET',
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
