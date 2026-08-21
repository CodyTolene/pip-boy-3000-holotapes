(function () {
  const fs = require('fs'),
    B = 'HOLO/STARTUP_ANIMATIONS/',
    S = B + 'SELECT.JSON';
  function ex(p) {
    try {
      return !!fs.statSync(p);
    } catch (e) {
      return false;
    }
  }

  const STARTUPS = [
    {
      file: 'MISTER.AVI',
      label: 'Mister Handy',
      cat: 'special',
      fade: 6250,
      hard: 15000,
      eventEnd: 1,
    },
    {
      file: 'VAULTGIRL.AVI',
      label: 'Vault Girl',
      cat: 'special',
      fade: 3500,
      hard: 12000,
      eventEnd: 1,
    },
    {
      file: 'DEATHCLAW.AVI',
      label: 'Deathclaw Vault Experiment',
      cat: 'special',
      fade: 3500,
      hard: 13000,
      eventEnd: 1,
    },
    {
      file: 'YESMAN.AVI',
      label: 'YES MAN',
      cat: 'npc',
      fade: 4917,
      hard: 16000,
      eventEnd: 1,
    },
    {
      file: 'ENCLAVE.AVI',
      label: 'The Enclave',
      cat: 'faction',
      fade: 5500,
      hard: 9015,
    },
    {
      file: 'BOS.AVI',
      label: 'The Brotherhood of Steel',
      cat: 'faction',
      fade: 5500,
      hard: 9015,
    },
    {
      file: 'MOTHMAN.AVI',
      label: 'Mothman',
      cat: 'faction',
      fade: 5500,
      hard: 9015,
    },
    {
      file: 'MINUTEMEN.AVI',
      label: 'The Minutemen',
      cat: 'faction',
      fade: 5500,
      hard: 16500,
      eventEnd: 1,
    },
    {
      file: 'ENCLAVE_PIPBOY.AVI',
      label: 'Enclave PIP-BOY',
      cat: 'special',
      fade: 26000,
      hard: 30500,
    },
    {
      file: 'MRHOUSE.AVI',
      label: 'Mr. House',
      cat: 'npc',
      fade: 7667,
      hard: 11182,
    },
    {
      file: 'CLASSIC_MRHOUSE.AVI',
      label: 'Classic Mr. House',
      cat: 'npc',
      fade: 5250,
      hard: 13000,
      eventEnd: 1,
    },
    {
      file: 'CLASSIC_MRHOUSE_ANIMATED.AVI',
      label: 'Classic Mr. House Animated',
      cat: 'npc',
      fade: 6083,
      hard: 15000,
      eventEnd: 1,
    },
    {
      file: 'CLASSIC_MRHOUSE_FULLY_ANIMATED.AVI',
      label: 'Classic Mr. House Fully Animated',
      cat: 'npc',
      fade: 6000,
      hard: 15000,
      eventEnd: 1,
    },
    {
      file: 'DOGMEAT.AVI',
      label: 'Dogmeat',
      cat: 'npc',
      fade: 4167,
      hard: 13000,
      eventEnd: 1,
    },
  ];
  const CAT_SPECIAL = [0, 1, 2, 8],
    CAT_FACTION = [4, 5, 7, 6],
    CAT_NPC = [3, 9, 10, 11, 12, 13];

  /* Persistent startup runtime.
     This is deliberately created in global scope so Pip.bootAnimation/Pip.audioStart
     retain only the small startup service after the holotape UI closes. Keeping the
     menu/scroller/title closure alive caused CALLBACK/LOW_MEMORY/MEMORY failures on
     repeated boot cycles during Pip-Boy OS 1.1.6 hardware testing. */
  const installRuntime = Function(
    'return function(){\n' +
      "var fs=require('fs'),B='HOLO/STARTUP_ANIMATIONS/',S=B+'SELECT.JSON';" +
      "var F=['MISTER.AVI','VAULTGIRL.AVI','DEATHCLAW.AVI','YESMAN.AVI','ENCLAVE.AVI','BOS.AVI','MOTHMAN.AVI','MINUTEMEN.AVI','ENCLAVE_PIPBOY.AVI','MRHOUSE.AVI','CLASSIC_MRHOUSE.AVI','CLASSIC_MRHOUSE_ANIMATED.AVI','CLASSIC_MRHOUSE_FULLY_ANIMATED.AVI','DOGMEAT.AVI'];" +
      'var FA=[6250,3500,3500,4917,5500,5500,5500,5500,26000,7667,5250,6083,6000,4167];' +
      'var HA=[15000,12000,13000,16000,9015,9015,9015,16500,30500,11182,13000,15000,15000,13000];' +
      'var EV=[1,1,1,1,0,0,0,1,0,0,1,1,1,1],ownV=0,ownA=0,crt=0;' +
      'function sel(){try{var n=JSON.parse(fs.readFileSync(S)).startup|0;return n>=-2&&n<F.length?n:-2}catch(e){return -2}}' +
      'function ok(n){try{return n>=0&&n<F.length&&!!fs.statSync(B+F[n])}catch(e){return false}}' +
      "if(!Pip.__PIPCOStockBoot){if(typeof Pip.__SA22CleanBoot==='function')Pip.__PIPCOStockBoot=Pip.__SA22CleanBoot;else if(typeof Pip.bootAnimation==='function'&&!Pip.bootAnimation.__pipcoRT)Pip.__PIPCOStockBoot=Pip.bootAnimation.bind(Pip)}" +
      "if(!Pip.__PIPCOStockAudio){if(typeof Pip.__SA22CleanAudio==='function')Pip.__PIPCOStockAudio=Pip.__SA22CleanAudio;else if(typeof Pip.audioStart==='function'&&!Pip.audioStart.__pipcoRT)Pip.__PIPCOStockAudio=Pip.audioStart.bind(Pip)}" +
      'var sb=Pip.__PIPCOStockBoot,sa=Pip.__PIPCOStockAudio;' +
      'function restore(){try{if(ownV)Pip.videoStop()}catch(e){}try{if(ownA)Pip.audioStop()}catch(e){}ownV=ownA=0;try{delete global.__PIPCO_CRT}catch(e){}if(sa)Pip.audioStart=sa;if(sb)Pip.bootAnimation=sb;try{delete global.__PIPCO_RT}catch(e){}}' +
      "function finish(done){try{var p=sb?sb.call(Pip):0;if(p&&typeof p.then==='function')p.then(done);else done()}catch(e){done()}}" +
      "function ah(p){var n=sel();if(!ok(n)){restore();return sa?sa.apply(Pip,arguments):undefined}if((crt||global.__PIPCO_CRT)&&p==='SOUND/FX/CRT_ON2.WAV'){crt=0;global.__PIPCO_CRT=0;return}return sa?sa.apply(Pip,arguments):undefined}" +
      'function bh(){var n=sel();if(!ok(n)){restore();try{return sb?sb.call(Pip):Promise.resolve()}catch(e){return Promise.resolve()}}return new Promise(function(done){var a,b,d,vs,x=0;' +
      "function end(r,nat){if(x)return;x=1;if(a)clearTimeout(a);if(b)clearTimeout(b);if(d)clearTimeout(d);if(vs){try{Pip.removeListener('videoStopped',vs)}catch(e){}vs=undefined}if(!nat){try{if(ownV)Pip.videoStop()}catch(e){}try{if(ownA)Pip.audioStop()}catch(e){}}ownV=ownA=0;try{h.reset()}catch(e){}try{h.setClipRect(0,0,479,319)}catch(e){}try{delete Pip.blitOptions.disable}catch(e){}crt=1;global.__PIPCO_CRT=1;setTimeout(done,160)}" +
      "function play(){if(x)return;if(!ok(n)){x=1;restore();finish(done,'invalid');return}try{Pip.videoStop()}catch(e){}try{Pip.audioStop()}catch(e){}try{h.clear();h.flip()}catch(e){}try{Pip.videoStart(B+F[n],{x:0,y:0});ownV=1;ownA=1;d=setTimeout(function(){end('hard-failsafe',0)},HA[n])}catch(e){restore();x=1;finish(done);return}" +
      "if(EV[n]){vs=function(){if(!x)end('videoStopped',1)};try{Pip.on('videoStopped',vs)}catch(e){vs=undefined;b=setTimeout(function(){end('fade-fallback',0)},FA[n]+500)}}else b=setTimeout(function(){end('fade',0)},FA[n]+(n===8?420:180))}" +
      'try{a=setTimeout(play,1895)}catch(e){restore();finish(done)}})}' +
      'ah.__pipcoRT=1;bh.__pipcoRT=1;ah.__pipcoOriginal=sa;bh.__pipcoOriginal=sb;' +
      'if(sa)Pip.audioStart=ah;Pip.bootAnimation=bh;global.__PIPCO_RT={restore:restore};' +
      '}',
  )();

  function restoreRuntime() {
    try {
      if (global.__PIPCO_RT && typeof global.__PIPCO_RT.restore === 'function')
        global.__PIPCO_RT.restore();
    } catch (e) {}
  }
  function scheduleRuntime() {
    try {
      if (global.__PIPCO_UI_TIMER) clearTimeout(global.__PIPCO_UI_TIMER);
    } catch (e) {}
    global.__PIPCO_UI_TIMER = setTimeout(function () {
      try {
        delete global.__PIPCO_UI_TIMER;
        installRuntime();
      } catch (e) {}
    }, 0);
  }

  function sel() {
    try {
      let n = JSON.parse(fs.readFileSync(S)).startup | 0;
      return n >= -2 && n < STARTUPS.length ? n : -2;
    } catch (e) {
      return -2;
    }
  }
  function saveSel(n) {
    try {
      fs.writeFileSync(S, '{"startup":' + n + '}');
      return 1;
    } catch (e) {
      return 0;
    }
  }
  function valid(n) {
    return n >= 0 && n < STARTUPS.length && ex(B + STARTUPS[n].file);
  }

  let c = 0,
    s = 0,
    page = 0,
    npcScroll = 0,
    ic = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let TI = {
    title: {
      width: 176,
      height: 98,
      bpp: 1,
      transparent: 0,
      buffer: fs.readFileSync(B + 'TITLE.BIN'),
    },
  };

  function header() {
    h.clear().setColor(3).setFontMonofonto16().setFontAlign(0, -1);
    h.drawImage(TI.title, (480 - TI.title.width) >> 1, 6);
  }
  function scanInstalled() {
    for (let n = 0; n < STARTUPS.length; n++) ic[n] = valid(n) ? 1 : 0;
  }
  function installed(n) {
    return n >= 0 && n < STARTUPS.length && ic[n];
  }
  function entriesFor(ids) {
    let a = [];
    for (let i = 0; i < ids.length; i++)
      if (installed(ids[i])) a.push([STARTUPS[ids[i]].label, ids[i]]);
    return a;
  }
  function specialEntries() {
    return entriesFor(CAT_SPECIAL);
  }
  function factionEntries() {
    return entriesFor(CAT_FACTION);
  }
  function npcEntries() {
    return entriesFor(CAT_NPC);
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
  function drawNpcScroller(total) {
    if (total <= 5) return;
    let top = 108,
      bottom = 276,
      tt = 118,
      tb = 266,
      max = Math.max(1, total - 5);
    h.setColor(3)
      .drawLine(13, top + 5, 18, top)
      .drawLine(18, top, 23, top + 5)
      .drawLine(13, bottom - 5, 18, bottom)
      .drawLine(18, bottom, 23, bottom - 5)
      .drawLine(18, tt, 18, tb);
    let ht = Math.max(18, Math.floor(((tb - tt + 1) * 5) / total)),
      y = tt + Math.floor(((tb - tt + 1 - ht) * npcScroll) / max);
    h.fillRect(16, y, 20, y + ht - 1);
  }
  function draw() {
    let y = 112,
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
      return;
    }
    if (page === 3) {
      let total = a.length + 1;
      if (c < npcScroll) npcScroll = c;
      if (c >= npcScroll + 5) npcScroll = c - 4;
      npcScroll = E.clip(npcScroll, 0, Math.max(0, total - 5));
      for (n = 0; n < 5 && npcScroll + n < total; n++) {
        let row = npcScroll + n;
        if (c === row) Pip.shadeBox(24, y - 4, 456, y + 22);
        h.setColor(3).setFontAlign(-1, -1);
        if (row < a.length) {
          h.drawString(a[row][0], 38, y);
          if (s === a[row][1])
            h.setFontAlign(1, -1).drawString('ACTIVE', 442, y);
        } else h.drawString('< Back', 38, y);
        y += 36;
      }
      drawNpcScroller(total);
      return;
    }
    for (n = 0; n < a.length; n++) {
      if (c === n) Pip.shadeBox(24, y - 4, 456, y + 22);
      h.setColor(3).setFontAlign(-1, -1).drawString(a[n][0], 38, y);
      if (s === a[n][1]) h.setFontAlign(1, -1).drawString('ACTIVE', 442, y);
      y += 36;
    }
    if (c === a.length) Pip.shadeBox(24, y - 4, 456, y + 22);
    h.setColor(3).setFontAlign(-1, -1).drawString('< Back', 38, y);
  }
  function maxRow() {
    let a = pageEntries();
    return page === 0 ? a.length - 1 : a.length;
  }
  function activateStartup(id) {
    if (!saveSel(id)) return;
    s = id;
    scheduleRuntime();
    draw();
  }
  function knob(d) {
    if (d) {
      c += d > 0 ? 1 : -1;
      let m = maxRow();
      if (c < 0) c = m;
      if (c > m) c = 0;
      Pip.playSound('SCROLL');
      draw();
      return;
    }
    Pip.playSound('SELECT');
    if (page === 0) {
      let a = mainEntries(),
        e = a[c];
      if (e[1] === -99) {
        Pip.changeMenu('MISC.JS');
        return;
      }
      if (e[1] === -1) {
        if (!saveSel(-1)) return;
        s = -1;
        restoreRuntime();
        draw();
        return;
      }
      page = e[2];
      c = 0;
      if (page === 3) npcScroll = 0;
      draw();
      return;
    }
    let a = pageEntries();
    if (c === a.length) {
      let old = page;
      page = 0;
      c = 0;
      if (old === 3) npcScroll = 0;
      let m = mainEntries();
      for (let i = 0; i < m.length; i++)
        if (m[i][2] === old) {
          c = i;
          break;
        }
      draw();
      return;
    }
    if (c < a.length) activateStartup(a[c][1]);
  }

  try {
    s = sel();
    scanInstalled();
    if (s >= 0 && !valid(s)) {
      saveSel(-1);
      s = -1;
    }
    if (s === -2) s = -1;
    c = 0;
    global.__PIPCO_UI_KNOB = knob;
    Pip.onExclusive('knob1', knob);
    draw();
    if (s < 0) restoreRuntime();
    else scheduleRuntime();
  } catch (e) {}

  /* Standalone/global-scope remove: does not retain the menu closure after exit. */
  const removeStandalone = Function(
    "return function(){try{if(global.__PIPCO_UI_TIMER){clearTimeout(global.__PIPCO_UI_TIMER);delete global.__PIPCO_UI_TIMER}}catch(e){}try{if(global.__PIPCO_UI_KNOB)Pip.removeListener('knob1',global.__PIPCO_UI_KNOB)}catch(e){}try{delete global.__PIPCO_UI_KNOB}catch(e){}try{h.clear()}catch(e){}try{E.defrag()}catch(e){}}",
  )();
  return {
    id: 'STARTUPANIMATIONS',
    notDefault: true,
    fullscreen: true,
    remove: removeStandalone,
  };
});
