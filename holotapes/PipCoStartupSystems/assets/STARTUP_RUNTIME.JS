(function () {
  if (global.__PipCoStartupRuntimeV130) return;
  const fs = require('fs'),
    B = 'HOLO/STARTUP_ANIMATIONS/',
    S = B + 'SELECT.JSON';
  if (!global.__PipCoStartupSessionV130) {
    try {
      fs.writeFileSync(S, '{"startup":-1}');
    } catch (e) {}
    global.__PipCoStartupSessionV130 = 1;
    return;
  }
  const F = [
    'MISTER.AVI',
    'VAULTGIRL.AVI',
    'DEATHCLAW.AVI',
    'YESMAN.AVI',
    'ENCLAVE.AVI',
    'BOS.AVI',
    'MOTHMAN.AVI',
    'MINUTEMEN.AVI',
    'ENCLAVE_PIPBOY.AVI',
    'MRHOUSE.AVI',
    'CLASSIC_MRHOUSE.AVI',
    'CLASSIC_MRHOUSE_ANIMATED.AVI',
    'CLASSIC_MRHOUSE_FULLY_ANIMATED.AVI',
    'DOGMEAT.AVI',
  ];
  const D = [
      6250, 3500, 3500, 4917, 5500, 5500, 5500, 5500, 26000, 7667, 5250, 6083,
      6000, 4167,
    ],
    H = [
      15000, 12000, 13000, 16000, 9015, 9015, 9015, 16500, 30500, 11182, 13000,
      15000, 15000, 13000,
    ],
    V = [1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1];
  let sb =
      typeof Pip.__PIPCOStockBoot === 'function'
        ? Pip.__PIPCOStockBoot
        : typeof Pip.bootAnimation === 'function'
          ? Pip.bootAnimation.bind(Pip)
          : undefined,
    sa =
      typeof Pip.__PIPCOStockAudio === 'function'
        ? Pip.__PIPCOStockAudio
        : typeof Pip.audioStart === 'function'
          ? Pip.audioStart.bind(Pip)
          : undefined,
    ov = 0,
    oa = 0,
    crt = 0;
  Pip.__PIPCOStockBoot = sb;
  Pip.__PIPCOStockAudio = sa;
  function file(n) {
    if (n < 14) return F[n];
    if (n === 14) return 'Custom_Bootup.AVI';
    if (n > 14 && n < 19) return 'Custom_Bootup_' + (n - 13) + '.AVI';
    return '';
  }
  function sel() {
    try {
      let n = JSON.parse(fs.readFileSync(S)).startup | 0;
      return n >= -1 && n < 19 ? n : -1;
    } catch (e) {
      return -1;
    }
  }
  function ok(n) {
    let f = file(n);
    if (n < 0 || !f) return 0;
    try {
      return fs.statSync(B + f) ? 1 : 0;
    } catch (e) {
      return 0;
    }
  }
  function restore() {
    try {
      if (ov) Pip.videoStop();
    } catch (e) {}
    try {
      if (oa) Pip.audioStop();
    } catch (e) {}
    ov = oa = 0;
    try {
      delete global.__PIPCO_CRT;
    } catch (e) {}
    if (sa) Pip.audioStart = sa;
    if (sb) Pip.bootAnimation = sb;
    try {
      delete global.__PipCoStartupRuntimeV130;
    } catch (e) {}
  }
  function ah(path) {
    let n = sel();
    if (!ok(n)) return sa ? sa.apply(Pip, arguments) : undefined;
    if ((crt || global.__PIPCO_CRT) && path === 'SOUND/FX/CRT_ON2.WAV') {
      crt = 0;
      global.__PIPCO_CRT = 0;
      return;
    }
    return sa ? sa.apply(Pip, arguments) : undefined;
  }
  function stock(done) {
    try {
      let q = sb ? sb.call(Pip) : undefined;
      if (q && typeof q.then === 'function') q.then(done);
      else done();
    } catch (e) {
      done();
    }
  }
  function bh() {
    let n = sel();
    if (!ok(n)) return sb ? sb.call(Pip) : Promise.resolve();
    return new Promise(function (done) {
      let t1,
        t2,
        t3,
        sl,
        fin = 0;
      function end(nat) {
        if (fin) return;
        fin = 1;
        if (t1) clearTimeout(t1);
        if (t2) clearTimeout(t2);
        if (t3) clearTimeout(t3);
        if (sl)
          try {
            Pip.removeListener('videoStopped', sl);
          } catch (e) {}
        if (!nat) {
          try {
            if (ov) Pip.videoStop();
          } catch (e) {}
          try {
            if (oa) Pip.audioStop();
          } catch (e) {}
        }
        ov = oa = 0;
        try {
          h.reset().setClipRect(0, 0, 479, 319);
        } catch (e) {}
        try {
          delete Pip.blitOptions.disable;
        } catch (e) {}
        crt = 1;
        global.__PIPCO_CRT = 1;
        setTimeout(done, 0);
      }
      function play() {
        if (fin) return;
        if (!ok(n)) {
          fin = 1;
          stock(done);
          return;
        }
        try {
          Pip.videoStop();
          Pip.audioStop();
        } catch (e) {}
        try {
          h.clear();
          h.flip();
        } catch (e) {}
        try {
          Pip.videoStart(B + file(n), {
            x: 0,
            y: 0,
          });
          ov = oa = 1;
          t2 = setTimeout(
            function () {
              end(0);
            },
            n < 14 ? H[n] : 120000,
          );
        } catch (e) {
          fin = 1;
          stock(done);
          return;
        }
        if (n < 14 ? V[n] : 1) {
          sl = function () {
            end(1);
          };
          try {
            Pip.on('videoStopped', sl);
          } catch (e) {
            sl = undefined;
            t3 = setTimeout(
              function () {
                end(0);
              },
              (n < 14 ? D[n] : 30000) + 500,
            );
          }
        } else
          t3 = setTimeout(
            function () {
              end(0);
            },
            D[n] + (n === 8 ? 420 : 180),
          );
      }
      t1 = setTimeout(play, 1895);
    });
  }
  ah.__pipcoRT = 1;
  bh.__pipcoRT = 1;
  ah.__pipcoOriginal = sa;
  bh.__pipcoOriginal = sb;
  if (sa) Pip.audioStart = ah;
  Pip.bootAnimation = bh;
  global.__PipCoStartupRuntimeV130 = {
    restore: restore,
  };
})();
