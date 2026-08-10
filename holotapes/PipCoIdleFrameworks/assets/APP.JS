(function () {
  const fs = require('fs'),
    B = 'HOLO/FALLOUT_SCREENSAVER/',
    C = B + 'CONFIG.JSON',
    M = 'HOLO/MESMETRON/';
  let c = 0;
  function loadCfg() {
    try {
      let x = JSON.parse(fs.readFileSync(C));
      return {
        enabled: x.enabled ? 1 : 0,
        idle: 120,
        mesEnabled: x.mesEnabled ? 1 : 0,
        mesFile: x.mesFile || '',
      };
    } catch (e) {
      return { enabled: 0, idle: 120, mesEnabled: 0, mesFile: '' };
    }
  }
  function saveCfg(x) {
    try {
      fs.writeFileSync(
        C,
        JSON.stringify({
          enabled: x.enabled ? 1 : 0,
          idle: 120,
          mesEnabled: x.mesEnabled ? 1 : 0,
          mesFile: x.mesFile || '',
        }),
      );
    } catch (e) {}
  }
  function service(cfg) {
    try {
      let names = [
        '__FalloutOfficialSaverV3',
        '__FalloutOfficialSaverV5',
        '__FalloutOfficialSaverV8',
        '__FalloutOfficialSaverV9',
        '__FalloutOfficialSaverV10',
        '__FalloutOfficialSaverV12',
        '__FalloutOfficialSaverV13',
        '__FalloutOfficialSaverV14',
        '__FalloutOfficialSaverV15',
        '__FalloutOfficialSaverV16',
        '__FalloutOfficialSaverV17',
        '__FalloutOfficialSaverV18',
        '__FalloutOfficialSaverV19',
      ];
      for (let i = 0; i < names.length; i++) {
        let O = global[names[i]];
        if (!O) continue;
        if (O.tick) clearInterval(O.tick);
        if (O.loop) clearInterval(O.loop);
        if (O.introTimer) clearTimeout(O.introTimer);
        if (O.audioLoop) clearTimeout(O.audioLoop);
        if (O.audioWatch) clearInterval(O.audioWatch);
        if (O.oldExclusive) Pip.onExclusive = O.oldExclusive;
        if (O.oldSleep) Pip.goToSleep = O.oldSleep;
        if (O.oldKick) Pip.kickIdleTimer = O.oldKick;
        try {
          if (O.navMode) Pip.removeListener('mode', O.navMode);
        } catch (e) {}
        try {
          if (O.navMenu) Pip.removeListener('menuX', O.navMenu);
        } catch (e) {}
        if (O.oldOff) Pip.off = O.oldOff;
        try {
          if (O.input) {
            Pip.removeListener('knob1', O.input);
            Pip.removeListener('knob2', O.input);
          }
        } catch (e) {}
        try {
          if (O.wakeInput) {
            Pip.removeListener('knob1', O.wakeInput);
            Pip.removeListener('knob2', O.wakeInput);
          }
        } catch (e) {}
        delete global[names[i]];
      }
    } catch (e) {}
    let S = global.__FalloutOfficialSaverV19;
    if (!S) {
      S = {
        enabled: 0,
        mes: 0,
        mf: '',
        mo: undefined,
        idle: 120,
        last: getTime(),
        active: 0,
        preview: 0,
        mode: 0,
        tick: undefined,
        loop: undefined,
        introTimer: undefined,
        audioLoop: undefined,
        audioWatch: undefined,
        ownAudio: 0,
        radioMuted: 0,
        sprite: undefined,
        logo: undefined,
        x: undefined,
        y: undefined,
        logoFrames: 0,
        bombReady: 0,
        phase: 0,
        lastMX: undefined,
        lastMode: undefined,
        lastMenu: undefined,
        waking: 0,
        oldKick: undefined,
        kickWrapped: 0,
        navMode: undefined,
        navMenu: undefined,
      };
      global.__FalloutOfficialSaverV19 = S;
      S.oldKick = Pip.kickIdleTimer.bind(Pip);
      S.inSettings = function () {
        try {
          return Pip.MODE === 2 && Pip.MENUX === 0;
        } catch (e) {
          return 0;
        }
      };
      S.wrapKick = function () {
        if (S.kickWrapped || S.inSettings()) return;
        Pip.kickIdleTimer = function () {
          S.last = getTime();
          if (S.active && !S.preview && !S.waking) S.wakeIdle();
          return S.oldKick.apply(Pip, arguments);
        };
        S.kickWrapped = 1;
      };
      S.unwrapKick = function () {
        if (!S.kickWrapped) return;
        try {
          Pip.kickIdleTimer = S.oldKick;
        } catch (e) {}
        S.kickWrapped = 0;
      };
      S.navMode = function () {
        setTimeout(function () {
          if (S.inSettings()) {
            S.unwrapKick();
            S.last = getTime();
          } else {
            S.wrapKick();
            S.last = getTime();
          }
        }, 0);
      };
      S.navMenu = S.navMode;
      Pip.on('mode', S.navMode);
      Pip.on('menuX', S.navMenu);
      if (S.inSettings()) S.unwrapKick();
      else S.wrapKick();
      S.wakeIdle = function () {
        if (!S.active || S.preview || S.waking) return;
        S.waking = 1;
        S.last = getTime();
        S.unwrapKick();
        S.stop(0);
        setTimeout(function () {
          try {
            Pip.changeMenu();
          } catch (e) {
            S.waking = 0;
            if (!S.inSettings()) S.wrapKick();
            return;
          }
          let n = 0;
          function ready() {
            if (Pip.menuChanging && n < 40) {
              n++;
              setTimeout(ready, 40);
              return;
            }
            S.waking = 0;
            S.last = getTime();
            if (!S.inSettings()) S.wrapKick();
          }
          setTimeout(ready, 40);
        }, 0);
      };
      try {
        S.lastMX = Pip.MENUX;
      } catch (e) {}
      try {
        S.lastMode = Pip.MODE;
      } catch (e) {}
      try {
        S.lastMenu = Pip.CURRENT && Pip.CURRENT.id;
      } catch (e) {}
      S.radioActive = function () {
        try {
          if (Pip.radioOn) return 1;
        } catch (e) {}
        try {
          if (global.__PipRadioActive) return 1;
        } catch (e) {}
        try {
          if (Pip.audioIsPlaying && Pip.audioIsPlaying()) return 1;
        } catch (e) {}
        try {
          if (Pip.streamPlaying) {
            var q = Pip.streamPlaying();
            if (q === 'audio' || q === 'both') return 1;
          }
        } catch (e) {}
        return 0;
      };
      S.stop = function (redraw) {
        if (S.loop) {
          clearInterval(S.loop);
          S.loop = undefined;
        }
        if (S.introTimer) {
          clearTimeout(S.introTimer);
          S.introTimer = undefined;
        }
        if (S.audioLoop) {
          clearTimeout(S.audioLoop);
          S.audioLoop = undefined;
        }
        if (S.audioWatch) {
          clearInterval(S.audioWatch);
          S.audioWatch = undefined;
        }
        let wm = S.mode === 3;
        if (S.mo) {
          try {
            if (S.mo.remove) S.mo.remove();
          } catch (e) {}
          S.mo = undefined;
        }
        if (!S.active) return;
        S.active = 0;
        S.preview = 0;
        try {
          Pip.videoStop();
        } catch (e) {}
        if (S.ownAudio && !S.radioMuted) {
          try {
            Pip.audioStop();
          } catch (e) {}
        }
        S.ownAudio = 0;
        S.radioMuted = 0;
        S.mode = 0;
        S.logo = undefined;
        S.sprite = undefined;
        S.x = undefined;
        S.y = undefined;
        S.bombReady = 0;
        try {
          delete Pip.blitOptions.disable;
        } catch (e) {}
        try {
          h.reset();
          h.setClipRect(0, 0, 479, 319);
        } catch (e) {}
        if (redraw) {
          setTimeout(function () {
            try {
              h.flip();
              Pip.lastFlip = getTime();
            } catch (e) {}
          }, 60);
        }
        S.last = getTime();
        if (wm) {
          try {
            process.memory(true);
          } catch (e) {}
          try {
            E.defrag();
          } catch (e) {}
        }
      };
      S.play = function (isPreview) {
        if (S.active) return;
        if (!isPreview && !S.enabled) return;
        S.radioMuted = S.radioActive() ? 1 : 0;
        S.ownAudio = 0;
        S.preview = isPreview ? 1 : 0;
        S.active = 1;
        S.mode = 2;
        try {
          Pip.videoStop();
        } catch (e) {}
        try {
          E.defrag();
        } catch (e) {}
        try {
          S.logo = {
            width: 240,
            height: 227,
            bpp: 1,
            transparent: 0,
            buffer: fs.readFileSync(B + 'LOGO.BIN'),
          };
        } catch (e) {
          S.active = 0;
          S.mode = 0;
          return;
        }
        S.x = undefined;
        S.y = undefined;
        S.sprite = undefined;
        S.logoFrames = 60;
        S.bombReady = 0;
        S.phase = 0;
        function startBombPhase() {
          if (S.bombReady) return 1;
          S.logo = undefined;
          try {
            E.defrag();
          } catch (e) {}
          try {
            S.sprite = eval(fs.readFileSync(B + 'BOMB.JS'));
          } catch (e) {
            S.active = 0;
            S.mode = 0;
            return 0;
          }
          S.x = new Int16Array([
            455, 390, 325, 255, 185, 520, 445, 370, 295, 610, 535, 460, 385,
            690,
          ]);
          S.y = new Int16Array([
            -67, -22, 18, 62, 106, -125, -170, -215, -260, -70, -120, -170,
            -220, -130,
          ]);
          S.bombReady = 1;
          if (!S.radioMuted) {
            try {
              Pip.audioStart(B + 'FALLOUT.WAV', { repeat: true });
              S.ownAudio = 1;
            } catch (e) {
              S.ownAudio = 0;
            }
            S.audioWatch = setInterval(function () {
              if (!S.active || S.radioMuted || !S.ownAudio) return;
              try {
                if (Pip.audioIsPlaying && !Pip.audioIsPlaying())
                  Pip.audioStart(B + 'FALLOUT.WAV', { repeat: true });
              } catch (e) {}
            }, 10000);
          }
          return 1;
        }
        function resetBomb(i) {
          switch (i) {
            case 0:
              S.x[i] = 455;
              S.y[i] = -67;
              break;
            case 1:
              S.x[i] = 520;
              S.y[i] = -125;
              break;
            case 2:
              S.x[i] = 585;
              S.y[i] = -85;
              break;
            case 3:
              S.x[i] = 650;
              S.y[i] = -155;
              break;
            case 4:
              S.x[i] = 715;
              S.y[i] = -215;
              break;
            case 5:
              S.x[i] = 780;
              S.y[i] = -115;
              break;
            case 6:
              S.x[i] = 845;
              S.y[i] = -185;
              break;
            case 7:
              S.x[i] = 910;
              S.y[i] = -255;
              break;
            case 8:
              S.x[i] = 360;
              S.y[i] = -300;
              break;
            case 9:
              S.x[i] = 430;
              S.y[i] = -240;
              break;
            case 10:
              S.x[i] = 500;
              S.y[i] = -330;
              break;
            case 11:
              S.x[i] = 570;
              S.y[i] = -270;
              break;
            case 12:
              S.x[i] = 640;
              S.y[i] = -360;
              break;
            default:
              S.x[i] = 710;
              S.y[i] = -210;
          }
        }
        function frame() {
          'ram';
          if (!S.active || S.mode !== 2) return;
          h.clear(0);
          if (S.logoFrames > 0) {
            try {
              h.setColor(3);
            } catch (e) {}
            h.drawImage(
              S.logo,
              (480 - S.logo.width) >> 1,
              (320 - S.logo.height) >> 1,
            );
            S.logoFrames--;
            h.flip();
            Pip.lastFlip = getTime();
            return;
          }
          if (!S.bombReady && !startBombPhase()) return;
          for (var i = 0; i < 14; i++) {
            var dx = S.phase ? 3 : 2,
              dy = 2;
            h.drawImage(S.sprite, S.x[i], S.y[i]);
            if (i === 1 || i === 5 || i === 10) {
              dx += 1;
              dy += 1;
            }
            S.x[i] -= dx;
            S.y[i] += dy;
            if (S.x[i] < -71 && S.y[i] > 320) resetBomb(i);
          }
          S.phase = S.phase ? 0 : 1;
          h.flip();
          Pip.lastFlip = getTime();
        }
        frame();
        S.loop = setInterval(frame, 83);
      };
      S.playMes = function () {
        if (S.active || !S.mes || !S.mf) return;
        try {
          let q = eval(fs.readFileSync(B + 'MESIDLE.JS'));
          q(S, M, fs, h);
        } catch (e) {
          S.active = 0;
          S.mode = 0;
          S.mo = undefined;
          S.last = getTime();
          try {
            process.memory(true);
          } catch (x) {}
        }
      };
      S.tick = setInterval(function () {
        try {
          if (Pip.sleeping) {
            if (S.active) S.stop(0);
            return;
          }
        } catch (e) {}
        try {
          if (Pip.menuChanging) return;
        } catch (e) {}
        if (S.inSettings()) {
          S.unwrapKick();
          S.last = getTime();
          return;
        } else S.wrapKick();
        try {
          let mx = Pip.MENUX,
            mo = Pip.MODE,
            mi = Pip.CURRENT && Pip.CURRENT.id;
          if (mx !== S.lastMX || mo !== S.lastMode || mi !== S.lastMenu) {
            S.lastMX = mx;
            S.lastMode = mo;
            S.lastMenu = mi;
            S.last = getTime();
            if (S.active) S.stop(1);
            return;
          }
        } catch (e) {}
        if (!S.active && getTime() - S.last >= S.idle) {
          if (S.enabled) S.play(0);
          else if (S.mes) S.playMes();
        }
      }, 1000);
    }
    S.enabled = cfg.enabled ? 1 : 0;
    S.mes = cfg.mesEnabled ? 1 : 0;
    S.mf = cfg.mesFile || '';
    S.idle = 120;
    S.last = getTime();
    if (!S.enabled && !S.mes && S.active && !S.preview) S.stop(1);
    return S;
  }
  let cfg = loadCfg(),
    S = service(cfg),
    page = 0,
    mainSel = 0,
    mainScroll = 0,
    sub = -1,
    mesSel = 0,
    dirty = 0;
  let titleImg = {
    width: 176,
    height: 98,
    bpp: 1,
    transparent: 0,
    buffer: fs.readFileSync(B + 'TITLE.BIN'),
  };
  let mn = [],
    mf = [];
  (function () {
    let raw = '',
      re,
      m;
    try {
      raw = fs.readFileSync(M + 'TITLE.JS');
    } catch (e) {
      try {
        raw = fs.readFileSync(M + 'title.js');
      } catch (e2) {
        return;
      }
    }
    try {
      re = /name\s*:\s*["']([^"']+)["']\s*,\s*file\s*:\s*["']([^"']+)["']/g;
      while ((m = re.exec(raw))) {
        let f = String(m[2]),
          q = f.toLowerCase();
        if (
          q === 'app.js' ||
          q === 'title.js' ||
          q === 'app.min.js' ||
          q === 'title.min.js'
        )
          continue;
        mn.push(String(m[1]));
        mf.push(f);
      }
    } catch (e) {}
    raw = undefined;
    re = undefined;
    m = undefined;
    try {
      process.memory(true);
    } catch (e) {}
  })();
  if (cfg.mesEnabled && cfg.mesFile) {
    for (let si = 0; si < mf.length; si++) {
      if (mf[si] === cfg.mesFile) {
        mesSel = si + 1;
        break;
      }
    }
  }
  function header() {
    h.clear().setColor(3);
    h.drawImage(titleImg, (480 - 176) >> 1, 6);
  }
  function txt(y, label) {
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(-1, -1)
      .drawString(label, 38, y);
  }
  function row(y, label, sel) {
    if (sel) Pip.shadeBox(24, y - 4, 456, y + 22);
    txt(y, label);
  }
  function count() {
    return mn.length + 2;
  }
  function label(i) {
    if (i === 0) return 'PIP-BOY 3000';
    if (i === mn.length + 1) return '< Back';
    return mn[i - 1];
  }
  function scroller() {
    if (!mn.length || count() <= 5) return;
    let x = 18,
      top = 143,
      bottom = 284,
      tt = 153,
      tb = 274,
      max = Math.max(1, count() - 5);
    h.setColor(3);
    h.drawLine(x - 5, top + 5, x, top).drawLine(x, top, x + 5, top + 5);
    h.drawLine(x - 5, bottom - 5, x, bottom).drawLine(
      x,
      bottom,
      x + 5,
      bottom - 5,
    );
    h.drawLine(x, tt, x, tb);
    let th = Math.max(18, Math.floor(((tb - tt + 1) * 5) / count()));
    let ty = tt + Math.floor(((tb - tt + 1 - th) * mainScroll) / max);
    h.fillRect(x - 2, ty, x + 2, ty + th - 1);
  }
  function draw() {
    header();
    if (page === 0) {
      txt(112, 'Screensaver Idle Animations:');
      if (mainSel < mainScroll) mainScroll = mainSel;
      if (mainSel >= mainScroll + 5) mainScroll = mainSel - 4;
      let ms = Math.max(0, count() - 5);
      if (mainScroll > ms) mainScroll = ms;
      if (mainScroll < 0) mainScroll = 0;
      for (let i = 0; i < 5 && mainScroll + i < count(); i++) {
        let n = mainScroll + i;
        row(142 + i * 30, label(n), n === mainSel);
      }
      scroller();
      return;
    }
    if (sub === 0) {
      row(
        126,
        'PIP-BOY 3000 Idle: ' + (cfg.enabled ? 'ENABLED' : 'DISABLED'),
        c === 0,
      );
      row(166, 'Preview Screensaver', c === 1);
      row(206, '< Back', c === 2);
      txt(246, 'Idle Time: 2 Minutes');
    } else {
      let on = mesSel === sub;
      if (c === 0) Pip.shadeBox(24, 114, 456, 140);
      h.setColor(3).setFontMonofonto16().setFontAlign(-1, -1);
      h.drawString(mn[sub - 1], 38, 118);
      let nx = 38 + h.stringWidth(mn[sub - 1]);
      h.drawString(' Idle: ', nx, 118);
      h.drawString(
        on ? 'ENABLED' : 'DISABLED',
        nx + h.stringWidth(' Idle: '),
        118,
      );
      row(158, '< Back', c === 1);
      txt(198, 'Idle Time: 2 Minutes');
    }
  }
  function knob(d) {
    if (S.active && S.preview) {
      S.last = getTime();
      S.stop(0);
      page = 1;
      sub = 0;
      c = 1;
      draw();
      return;
    }
    if (S.active) {
      S.last = getTime();
      draw();
      return;
    }
    S.last = getTime();
    if (page === 0) {
      if (d) {
        mainSel += d > 0 ? 1 : -1;
        if (mainSel < 0) mainSel = count() - 1;
        if (mainSel >= count()) mainSel = 0;
        try {
          Pip.playSound('SCROLL');
        } catch (e) {}
        draw();
        return;
      }
      try {
        Pip.playSound('SELECT');
      } catch (e) {}
      if (mainSel === count() - 1) {
        try {
          Pip.changeMenu('MISC.JS');
        } catch (e) {}
        return;
      }
      sub = mainSel;
      page = 1;
      c = 0;
      draw();
      return;
    }
    if (sub === 0) {
      if (d) {
        c += d > 0 ? 1 : -1;
        if (c < 0) c = 2;
        if (c > 2) c = 0;
        try {
          Pip.playSound('SCROLL');
        } catch (e) {}
        draw();
        return;
      }
      if (c !== 1) {
        try {
          Pip.playSound('SELECT');
        } catch (e) {}
      }
      if (c === 0) {
        cfg.enabled = cfg.enabled ? 0 : 1;
        if (cfg.enabled) mesSel = 0;
        dirty = 1;
        S.enabled = cfg.enabled;
        S.mes = 0;
        S.mf = '';
        S.last = getTime();
        if (!S.enabled && S.active) S.stop(1);
        draw();
        return;
      }
      if (c === 1) {
        S.last = getTime();
        setTimeout(function () {
          if (!S.active) S.play(1);
        }, 180);
        return;
      }
      page = 0;
      sub = -1;
      c = 0;
      draw();
      return;
    }
    if (d) {
      c += d > 0 ? 1 : -1;
      if (c < 0) c = 1;
      if (c > 1) c = 0;
      try {
        Pip.playSound('SCROLL');
      } catch (e) {}
      draw();
      return;
    }
    try {
      Pip.playSound('SELECT');
    } catch (e) {}
    if (c === 0) {
      if (mesSel === sub) {
        mesSel = 0;
        S.mes = 0;
        S.mf = '';
      } else {
        mesSel = sub;
        cfg.enabled = 0;
        S.enabled = 0;
        S.mes = 1;
        S.mf = mf[sub - 1];
        if (S.active) S.stop(1);
      }
      dirty = 1;
      S.last = getTime();
      try {
        process.memory(true);
      } catch (e) {}
      draw();
      return;
    }
    page = 0;
    sub = -1;
    c = 0;
    draw();
  }
  Pip.onExclusive('knob1', knob);
  draw();
  return {
    id: 'FALLOUTSCREENSAVER',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      try {
        Pip.removeListener('knob1', knob);
      } catch (e) {}
      if (dirty) {
        cfg.mesEnabled = mesSel ? 1 : 0;
        cfg.mesFile = mesSel ? mf[mesSel - 1] : '';
        S.mes = cfg.mesEnabled;
        S.mf = cfg.mesFile;
        saveCfg(cfg);
        dirty = 0;
      }
      titleImg = undefined;
      mn = undefined;
      mf = undefined;
      try {
        h.clear();
      } catch (e) {}
    },
  };
});
