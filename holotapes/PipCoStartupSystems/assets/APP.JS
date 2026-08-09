(function () {
  const fs = require('fs'),
    B = 'HOLO/STARTUP_ANIMATIONS/',
    S = B + 'SELECT.JSON';
  let c = 0,
    s = 0,
    t,
    page = 0;
  const TI = eval(fs.readFileSync(B + 'TITLE_IMG.JS'));

  /* startup ids:
     -1 Default Bootup
      0 Mister Handy
      1 Vault Girl
      2 Deathclaw Vault Experiment
      3 YES MAN
      4 The Enclave
     5 The Brotherhood of Steel
  */

  function customHookAlive() {
    return (
      global.__startupAnimationsHoloLiveV5 ||
      global.__startupAnimationsHoloLiveV6 ||
      global.__startupAnimationsHoloLiveV7 ||
      global.__startupAnimationsHoloLiveV8 ||
      global.__startupAnimationsHoloLiveV9 ||
      global.__startupAnimationsHoloLiveV12 ||
      global.__startupAnimationsHoloLiveV14 ||
      global.__SA16 ||
      global.__SA17 ||
      global.__SA18 ||
      global.__SA22
    );
  }

  if (!customHookAlive()) {
    try {
      if (!Pip.__SA22CleanBoot)
        Pip.__SA22CleanBoot = Pip.bootAnimation.bind(Pip);
      if (!Pip.__SA22CleanAudio)
        Pip.__SA22CleanAudio = Pip.audioStart.bind(Pip);
    } catch (e) {}
  }

  function ex(p) {
    let f;
    try {
      f = E.openFile(p, 'r');
      if (!f) return 0;
      f.close();
      return 1;
    } catch (e) {
      try {
        if (f) f.close();
      } catch (x) {}
      return 0;
    }
  }

  function sel() {
    try {
      let n = JSON.parse(fs.readFileSync(S)).startup | 0;
      return n >= -2 && n < 6 ? n : -2;
    } catch (e) {
      return -2;
    }
  }

  function vf(n) {
    return (
      B +
      (n === 0
        ? 'MISTER.AVI'
        : n === 1
          ? 'VAULTGIRL.AVI'
          : n === 2
            ? 'DEATHCLAW.AVI'
            : n === 3
              ? 'YESMAN.AVI'
              : n === 4
                ? 'ENCLAVE.AVI'
                : 'BOS.AVI')
    );
  }
  function af(n) {
    return (
      B +
      (n === 0
        ? 'MISTER.WAV'
        : n === 1
          ? 'VAULTGIRL.WAV'
          : n === 2
            ? 'DEATHCLAW.WAV'
            : n === 3
              ? 'YES MAN.WAV'
              : n === 4
                ? 'THE ENCLAVE.WAV'
                : 'BOS.WAV')
    );
  }
  function fm(n) {
    return n === 0 ? 5930 : n === 3 ? 4597 : n === 4 || n === 5 ? 5263 : 3180;
  }
  function hm(n) {
    return n === 0 ? 9445 : n === 3 ? 8112 : n === 4 || n === 5 ? 8778 : 6695;
  }

  function valid(n) {
    return (
      n >= 0 && n < 6 && ex(B + 'APP.JS') && ex(S) && ex(vf(n)) && ex(af(n))
    );
  }

  function stockBoot() {
    let m = process.memory(false);
    h.clear();
    return Pip.typeText(
      '\n\n§§§*************** PIP-OS(R) V5.0.1.4 ***************\n\n' +
        'COPYRIGHT 2068 ROBCO(R) §\n' +
        'LOADER V' +
        VERSION +
        '\n' +
        'EXEC VERSION ' +
        process.env.VERSION +
        ' §\n' +
        ((m.total * m.blocksize) / 1e3).toFixed(0) +
        'K RAM SYSTEM\n' +
        m.free * m.blocksize +
        ' BYTES FREE\n' +
        'NO HOLOTAPE FOUND §\n' +
        'LOAD ROM(1): DEITRIX 2040... COMPLETE §\n' +
        '\n\n\n\n\n\n\n\n\n\n\n\n\n',
      40,
      0,
      400,
      240,
    );
  }

  function originalAudio() {
    return (
      Pip.__SA22CleanAudio ||
      Pip.__startupAnimationsOriginalAudioStartV5 ||
      Pip.__startupAnimationsOriginalAudioStartV6 ||
      Pip.__startupAnimationsOriginalAudioStartV7 ||
      Pip.__startupAnimationsOriginalAudioStartV8 ||
      Pip.__startupAnimationsStockAudioStartV9 ||
      Pip.__startupAnimationsStockAudioStartV12 ||
      Pip.__startupAnimationsStockAudioV14 ||
      Pip.audioStart.bind(Pip)
    );
  }

  function originalBoot() {
    return Pip.__SA22CleanBoot || stockBoot;
  }

  function clearFlags() {
    try {
      delete global.__startupAnimationsHoloLiveV5;
    } catch (e) {}
    try {
      delete global.__startupAnimationsHoloLiveV6;
    } catch (e) {}
    try {
      delete global.__startupAnimationsHoloLiveV7;
    } catch (e) {}
    try {
      delete global.__startupAnimationsHoloLiveV8;
    } catch (e) {}
    try {
      delete global.__startupAnimationsHoloLiveV9;
    } catch (e) {}
    try {
      delete global.__startupAnimationsHoloLiveV12;
    } catch (e) {}
    try {
      delete global.__startupAnimationsHoloLiveV14;
    } catch (e) {}
    try {
      delete global.__SA16;
    } catch (e) {}
    try {
      delete global.__SA17;
    } catch (e) {}
    try {
      delete global.__SA18;
    } catch (e) {}
    try {
      delete global.__SA22;
    } catch (e) {}
    try {
      delete global.__SA18CRT;
    } catch (e) {}
    try {
      delete global.__SA16C;
    } catch (e) {}
    try {
      delete global.__startupAnimationsSuppressCRT12;
    } catch (e) {}
    try {
      delete global.__startupAnimationsSuppressCRT14;
    } catch (e) {}
  }

  function restore() {
    let q = originalAudio(),
      b = originalBoot();
    if (t) {
      clearTimeout(t);
      t = undefined;
    }
    try {
      Pip.videoStop();
    } catch (e) {}
    try {
      Pip.audioStop();
    } catch (e) {}
    clearFlags();
    if (q) Pip.audioStart = q;
    Pip.bootAnimation = b;
  }

  function hook() {
    clearFlags();

    let q = originalAudio();
    Pip.__SA18A = q;
    global.__SA22 = 1;
    global.__SA18CRT = 0;

    Pip.audioStart = function (p) {
      let n = sel();

      if (!valid(n)) {
        restore();
        return q.apply(Pip, arguments);
      }

      if (global.__SA18CRT && p === 'SOUND/FX/CRT_ON2.WAV') {
        global.__SA18CRT = 0;
        return;
      }

      return q.apply(Pip, arguments);
    };

    Pip.bootAnimation = function () {
      let n = sel();

      if (!valid(n)) {
        restore();
        return stockBoot();
      }

      return new Promise(function (done) {
        let a,
          b,
          d,
          e,
          x = 0;

        function end() {
          if (x) return;
          x = 1;
          if (a) clearTimeout(a);
          if (b) clearTimeout(b);
          if (d) clearTimeout(d);
          if (e) clearTimeout(e);

          /* Stop video and restore normal graphics state BEFORE handing
             control back to FW.JS. Do not clear/flip and do not force a
             second mode redraw. */
          try {
            Pip.videoStop();
          } catch (e) {}
          try {
            h.reset();
          } catch (e) {}
          try {
            h.setClipRect(0, 0, 479, 319);
          } catch (e) {}
          try {
            delete Pip.blitOptions.disable;
          } catch (e) {}

          global.__SA18CRT = 1;

          /* Let video shutdown settle. FW.JS then performs the single normal
             menu redraw after this Promise resolves. */
          setTimeout(done, 160);
        }

        function play() {
          if (x) return;

          if (!valid(n)) {
            x = 1;
            restore();
            try {
              stockBoot().then(done);
            } catch (e) {
              done();
            }
            return;
          }

          try {
            Pip.videoStop();
          } catch (e) {}
          try {
            Pip.audioStop();
          } catch (e) {}
          try {
            h.clear();
            h.flip();
          } catch (e) {}
          try {
            E.defrag();
          } catch (e) {}

          try {
            Pip.videoStart(vf(n), { x: 0, y: 0 });
          } catch (e) {
            restore();
            x = 1;
            try {
              stockBoot().then(done);
            } catch (z) {
              done();
            }
            return;
          }

          /* Reliability fix:
             Give the AVI decoder a short head start before starting audio.
             This reduces intermittent audio-only / black-screen boots on
             larger animations such as Vault Girl and Deathclaw. */
          e = setTimeout(function () {
            e = undefined;
            if (x) return;
            try {
              Pip.audioStart(af(n));
            } catch (z) {}
          }, 180);

          /* Keep the original playback window plus the same audio delay so
             the WAV is not cut short by cleanup. */
          b = setTimeout(end, fm(n) + 180);
        }

        try {
          a = setTimeout(play, 1895);
          d = setTimeout(end, hm(n));
        } catch (e) {
          restore();
          try {
            stockBoot().then(done);
          } catch (z) {
            done();
          }
        }
      });
    };
  }

  function reg() {
    try {
      fs.writeFileSync(
        'APPINFO/STARTUP_ANIMATIONS.info',
        '{"id":"startup-animations","name":"PIP-CO Startup Systems","version":"4.1.2","src":"HOLO/STARTUP_ANIMATIONS/APP.JS","icon":"APPINFO/HOLO.IMG"}',
      );
    } catch (e) {}
  }

  function header() {
    h.clear().setColor(3).setFontMonofonto23().setFontAlign(0, -1);
    h.drawString('PIP-CO', 240, 6);
    h.drawImage(TI.title, 131, 30);
    h.drawLine(24, 70, 456, 70).setFontMonofonto16();
  }

  function row(y, label, isActive) {
    if (c === arguments[3]) Pip.shadeBox(24, y - 4, 456, y + 22);
    h.setColor(3).setFontAlign(-1, -1).drawString(label, 38, y);
    if (isActive) h.setFontAlign(1, -1).drawString('ACTIVE', 442, y);
  }

  /* Build menus only from startup packs that really exist.
     A startup is installed only when BOTH its AVI and WAV are present. */
  function installed(n) {
    return valid(n);
  }

  function specialEntries() {
    let a = [];
    if (installed(0)) a.push(['Mister Handy', 0]);
    if (installed(1)) a.push(['Vault Girl', 1]);
    if (installed(2)) a.push(['Deathclaw Vault Experiment', 2]);
    return a;
  }

  function factionEntries() {
    let a = [];
    if (installed(4)) a.push(['The Enclave', 4]);
    if (installed(5)) a.push(['The Brotherhood of Steel', 5]);
    return a;
  }

  function npcEntries() {
    let a = [];
    if (installed(3)) a.push(['YES MAN', 3]);
    return a;
  }

  function mainEntries() {
    let a = [['Default Bootup', -1, 0]];
    if (specialEntries().length) a.push(['Special Bootups', -10, 1]);
    if (factionEntries().length) a.push(['Faction Bootups', -11, 2]);
    if (npcEntries().length) a.push(['NPC Bootups', -12, 3]);
    a.push(['< Back', -99, -1]);
    return a;
  }

  function pageEntries() {
    if (page === 1) return specialEntries();
    if (page === 2) return factionEntries();
    if (page === 3) return npcEntries();
    return mainEntries();
  }

  function draw() {
    let y = 80,
      n,
      a = pageEntries();
    header();

    if (page === 0) {
      for (n = 0; n < a.length; n++) {
        if (c === n) Pip.shadeBox(24, y - 4, 456, y + 22);
        h.setColor(3).setFontAlign(-1, -1).drawString(a[n][0], 38, y);
        if (a[n][1] === -1 && s === -1)
          h.setFontAlign(1, -1).drawString('ACTIVE', 442, y);
        y += 36;
      }
    } else {
      for (n = 0; n < a.length; n++) {
        if (c === n) Pip.shadeBox(24, y - 4, 456, y + 22);
        h.setColor(3).setFontAlign(-1, -1).drawString(a[n][0], 38, y);
        if (s === a[n][1]) h.setFontAlign(1, -1).drawString('ACTIVE', 442, y);
        y += 36;
      }

      /* Every submenu always gets its own Back row. */
      if (c === a.length) Pip.shadeBox(24, y - 4, 456, y + 22);
      h.setColor(3).setFontAlign(-1, -1).drawString('< Back', 38, y);
    }
  }

  function maxRow() {
    let a = pageEntries();
    return page === 0 ? a.length - 1 : a.length;
  }

  function activateStartup(id) {
    try {
      fs.writeFileSync(S, '{"startup":' + id + '}');
      s = id;
    } catch (e) {}
    if (t) clearTimeout(t);
    t = setTimeout(function () {
      t = undefined;
      try {
        E.defrag();
      } catch (e) {}
      hook();
    }, 0);
    draw();
  }

  function knob(d) {
    if (d) {
      c += d > 0 ? 1 : -1;
      let m = maxRow();
      if (c < 0) c = m;
      if (c > m) c = 0;
      try {
        Pip.playSound('SCROLL');
      } catch (e) {}
      draw();
      return;
    }

    try {
      Pip.playSound('SELECT');
    } catch (e) {}

    if (page === 0) {
      let a = mainEntries(),
        e = a[c];

      if (e[1] === -99) {
        try {
          Pip.changeMenu('MISC.JS');
        } catch (x) {}
        return;
      }

      if (e[1] === -1) {
        try {
          fs.writeFileSync(S, '{"startup":-1}');
        } catch (x) {}
        s = -1;
        restore();
        try {
          E.defrag();
        } catch (x) {}
        draw();
        return;
      }

      page = e[2];
      c = 0;
      draw();
      return;
    }

    let a = pageEntries();

    if (c === a.length) {
      let old = page;
      page = 0;
      c = 0;
      let m = mainEntries(),
        i;
      for (i = 0; i < m.length; i++)
        if (m[i][2] === old) {
          c = i;
          break;
        }
      draw();
      return;
    }

    if (c < a.length) activateStartup(a[c][1]);
  }

  s = sel();

  /* If a previously selected optional pack is no longer installed,
     clear the stale selection and safely return to Default Bootup. */
  if (s >= 0 && !valid(s)) {
    try {
      fs.writeFileSync(S, '{"startup":-1}');
    } catch (e) {}
    s = -1;
  }
  if (s === -2) s = -1;

  c = 0;
  reg();

  Pip.onExclusive('knob1', knob);
  draw();

  if (s < 0) {
    restore();
  } else {
    t = setTimeout(function () {
      t = undefined;
      try {
        E.defrag();
      } catch (e) {}
      hook();
    }, 0);
  }

  return {
    id: 'STARTUPANIMATIONS',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      if (t) clearTimeout(t);
      Pip.removeListener('knob1', knob);
      try {
        Pip.audioStop();
      } catch (e) {}
      h.clear();
    },
  };
});
