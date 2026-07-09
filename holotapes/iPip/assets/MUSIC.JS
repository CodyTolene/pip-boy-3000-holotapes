// =============================================================================
//  Name: iPip Media Player
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app) {
  const APP_NAME = 'iPip Media Player';

  const PAGE_SIZE = 8;
  const VISIBLE_ROWS = 10;

  const C_BLACK = 0;
  const C_DIM = 1;
  const C_MED = 2;
  const C_BRIGHT = 3;

  const ROW_H = 21;
  const LIST_X = 12;
  const LIST_W = 222;
  const LIST_TITLE_Y = 52;
  const LIST_START_Y = 76;
  const WAVE_X = 244;
  const WAVE_Y = 44;
  const WAVE_W = 210;
  const WAVE_H = 162;
  const INFO_Y = WAVE_Y + WAVE_H + 22;

  const MUSIC_DIR = 'MUSIC';
  const MAX_PATH = 56;

  const WAVEFORM_MS = 50;
  const KNOB_DEBOUNCE_MS = 30;

  const SYM = {
    random: '~ ',
    playall: '> ',
    station: '> ',
    menu: '< ',
    back: '< ',
    prev: '<< ',
    next: '>> ',
  };

  let removed = false;
  let view = 'stations'; // 'stations' | 'songs'
  let currentStation = null;
  let stations = [];
  let allSongs = [];
  let listItems = [];
  let selectedIdx = 0;
  let scrollOffset = 0;
  let songPage = 0;

  let playingPath = null;
  let playingName = null;
  let playingStation = null;
  let lastPlayedName = null;
  let isAudioPlaying = false;

  let isRandom = false;
  let randomQueue = [];
  let randomQueueIdx = 0;

  let isPlayAll = false;
  let playAllIdx = 0;
  let sortDir = app.sortDir || global.__iPipSort || 1; // 1 = A-Z, -1 = Z-A

  let suppressAudioStopped = false;

  let waveInterval = null;
  let wavePoly = null;

  let lastKnobTime = 0;
  let lastVolKnobTime = 0;
  let lastSelectTime = 0;
  const POST_SELECT_IGNORE_MS = 150;

  // Volume
  const VOL_MIN = 0;
  const VOL_MAX = 27;
  const VOL_DEFAULT = 20;
  const VOL_HUD_MS = 1500;
  let currentVol = VOL_DEFAULT;
  let volHudTimeout = null;

  // Fixed header rows in the song list, currently:
  // - SHUFFLE
  // - PLAY ALL
  // - BACK
  const SONG_HEADER_COUNT = 3;

  function buildRandomPool(stationName) {
    const base = pathJoin(MUSIC_DIR, stationName);
    return allSongs.filter(function (s) {
      return !isPathTooLong(base, s.name);
    });
  }

  function buildSongItems() {
    const items = [
      { type: 'random', label: 'SHUFFLE PLAY ALL' },
      { type: 'playall', label: 'PLAY ALL (TOP-DOWN)' },
      { type: 'back', label: 'BACK TO PLAYLISTS' },
    ];
    const start = songPage * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, allSongs.length);
    const base = pathJoin(MUSIC_DIR, currentStation);
    for (let i = start; i < end; i++) {
      const song = allSongs[i];
      items.push({
        type: 'song',
        name: song.name,
        tooLong: isPathTooLong(base, song.name),
      });
    }
    if (songPage > 0) {
      items.push({ type: 'prev', label: 'PREV PAGE' });
    }
    const maxPage = Math.floor(Math.max(0, allSongs.length - 1) / PAGE_SIZE);
    if (songPage < maxPage) {
      items.push({ type: 'next', label: 'NEXT PAGE' });
    }
    return items;
  }

  function buildStationItems() {
    const items = [{ type: 'menu', label: 'BACK TO MENU' }];
    for (let i = 0; i < stations.length; i++) {
      items.push({ type: 'station', name: stations[i] });
    }
    return items;
  }

  function clampScroll() {
    if (selectedIdx < scrollOffset) scrollOffset = selectedIdx;
    if (selectedIdx >= scrollOffset + VISIBLE_ROWS)
      scrollOffset = selectedIdx - VISIBLE_ROWS + 1;
    if (scrollOffset < 0) scrollOffset = 0;
  }

  function drawAll() {
    h.clear(1);
    drawHeader();
    drawFooter();
    drawTitleBar();
    drawWaveformBorder();
    drawNowPlaying(playingName, false);
    drawList();
    startWaveform();
  }

  function drawEmptyState() {
    const x = LIST_X + 4;
    let y = LIST_START_Y + ROW_H + 8;

    h.setColor(C_BRIGHT)
      .setFont('Monofonto16')
      .setFontAlign(-1, -1)
      .drawString('NO PLAYLISTS FOUND', x, y);
    y += 34;

    h.setColor(C_MED).setFont('Monofonto14').setFontAlign(-1, -1);
    const lines = h.wrapString(
      'Add station playlists to the MUSIC folder on the SD card. Convert ' +
        'audio at https://pip-boy.com/tools',
      LIST_W - 8,
    );
    for (let i = 0; i < lines.length; i++) {
      h.drawString(lines[i], x, y);
      y += 16;
    }
  }

  function drawFooter() {
    try {
      Pip.renderFooter();
    } catch (e) {
      h.setColor(C_DIM).drawLine(0, app.H - 30, app.W - 1, app.H - 30);
    }
  }

  function drawHeader() {
    try {
      Pip.renderHeader();
    } catch (e) {
      h.setColor(C_DIM).drawLine(0, 39, app.W - 1, 39);
    }
  }

  function drawList() {
    'ram';
    const startY = LIST_START_Y;
    const baseX = LIST_X + 4;
    const stationBase = pathJoin(MUSIC_DIR, currentStation);

    h.setColor(C_BLACK).fillRect(
      LIST_X,
      startY,
      LIST_X + LIST_W,
      startY + VISIBLE_ROWS * ROW_H,
    );

    h.setFont('Monofonto14').setFontAlign(-1, -1);

    const last = Math.min(scrollOffset + VISIBLE_ROWS, listItems.length);
    for (let absIdx = scrollOffset; absIdx < last; absIdx++) {
      const item = listItems[absIdx];
      const isSelected = absIdx === selectedIdx;
      const y = startY + (absIdx - scrollOffset) * ROW_H;

      let color;
      if (item.type === 'song' && item.tooLong) {
        color = isSelected ? C_MED : C_DIM;
      } else {
        color = isSelected ? C_BRIGHT : C_MED;
      }

      if (isSelected) {
        h.setColor(C_DIM).fillRect(LIST_X, y, LIST_X + LIST_W, y + ROW_H - 2);
      }

      if (
        (item.type === 'random' && isRandom) ||
        (item.type === 'playall' && isPlayAll)
      ) {
        h.setColor(C_BRIGHT).fillRect(
          LIST_X + LIST_W - 5,
          y + 7,
          LIST_X + LIST_W - 2,
          y + ROW_H - 9,
        );
      }

      h.setColor(color);

      if (item.type === 'song') {
        let labelX = baseX;
        if (
          !item.tooLong &&
          playingPath &&
          pathJoin(stationBase, item.name) === playingPath
        ) {
          const sqY = y + Math.floor((ROW_H - 4) / 2);
          h.setColor(C_BRIGHT).fillRect(baseX, sqY, baseX + 3, sqY + 3);
          h.setColor(color);
          labelX = baseX + 7;
        }
        h.drawString(
          ellipsize(songLabel(item.name), LIST_X + LIST_W - labelX - 8),
          labelX,
          y + 5,
        );
      } else {
        h.drawString(
          ellipsize(
            (SYM[item.type] || '') + (item.label || item.name || ''),
            LIST_X + LIST_W - baseX - 8,
          ),
          baseX,
          y + 5,
        );
      }
    }

    if (view === 'stations' && !stations.length) drawEmptyState();

    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawNowPlaying(name, isError) {
    const clearY = INFO_Y;
    h.setColor(C_BLACK).fillRect(WAVE_X, clearY, app.W - 1, clearY + 55);

    if (!name) return;

    const color = isError ? C_DIM : C_BRIGHT;
    const display = isError
      ? name
      : name.length > 19
        ? name.slice(0, 16) + '...'
        : name;

    h.setColor(color)
      .setFont('6x8', 2)
      .setFontAlign(-1, -1)
      .drawString(display, WAVE_X, clearY + 2);

    if (!isError) {
      const station = playingStation || currentStation;
      if (station) {
        h.setColor(C_MED)
          .setFont('6x8')
          .setFontAlign(-1, -1)
          .drawString(station, WAVE_X, clearY + 24);
      }
      if (isRandom) {
        h.setColor(C_BRIGHT)
          .setFont('6x8')
          .setFontAlign(-1, -1)
          .drawString('(shuffle)', WAVE_X, clearY + 38);
      } else if (isPlayAll) {
        h.setColor(C_BRIGHT)
          .setFont('6x8')
          .setFontAlign(-1, -1)
          .drawString('(play all)', WAVE_X, clearY + 38);
      }
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawTitleBar() {
    const titleX = LIST_X + 6;
    h.setColor(C_BRIGHT)
      .setFontMonofonto16()
      .setFontAlign(-1, -1)
      .drawString(APP_NAME, titleX, LIST_TITLE_Y);

    const APP_VERSION = app.version;

    if (APP_VERSION) {
      const versionX = titleX + h.stringWidth(APP_NAME) + 4;
      h.setColor(C_BRIGHT)
        .setFont('6x8')
        .setFontAlign(-1, -1)
        .drawString('v' + APP_VERSION, versionX, LIST_TITLE_Y + 8);
    }

    h.setColor(C_DIM).drawLine(
      LIST_X,
      LIST_START_Y - 2,
      LIST_X + LIST_W,
      LIST_START_Y - 2,
    );
  }

  function drawVolHud() {
    'ram';
    if (waveInterval) {
      clearInterval(waveInterval);
      waveInterval = null;
    }

    const hudY = WAVE_Y + WAVE_H - 18;
    const labelX = WAVE_X + 6;
    const barX = labelX + 46;
    const barEndX = WAVE_X + WAVE_W - 6;
    const barH = 10;

    h.setClipRect(WAVE_X, hudY - 2, WAVE_X + WAVE_W - 1, WAVE_Y + WAVE_H);
    h.setColor(C_BLACK).fillRect(
      WAVE_X,
      hudY - 2,
      WAVE_X + WAVE_W - 1,
      WAVE_Y + WAVE_H,
    );

    const filled = Math.round((currentVol / VOL_MAX) * (barEndX - barX));
    h.setColor(C_DIM).fillRect(barX, hudY, barEndX, hudY + barH);
    h.setColor(C_BRIGHT).fillRect(barX, hudY, barX + filled, hudY + barH);

    h.setColor(C_MED)
      .setFont('6x8')
      .setFontAlign(-1, -1)
      .drawString('VOL ' + currentVol, labelX, hudY + 1);

    h.setClipRect(0, 0, app.W - 1, app.H - 1);
    h.flip();
    Pip.lastFlip = getTime();

    if (volHudTimeout) clearTimeout(volHudTimeout);
    volHudTimeout = setTimeout(function () {
      volHudTimeout = null;
      h.setColor(C_BLACK).fillRect(
        WAVE_X,
        WAVE_Y,
        WAVE_X + WAVE_W - 1,
        WAVE_Y + WAVE_H,
      );
      h.flip();
      Pip.lastFlip = getTime();
      startWaveform();
    }, VOL_HUD_MS);
  }

  function drawWaveform() {
    'ram';
    if (!wavePoly) return;
    const ym = WAVE_Y + WAVE_H / 2;
    const waveBottom = WAVE_Y + WAVE_H - 10;
    h.setClipRect(WAVE_X, WAVE_Y, WAVE_X + WAVE_W - 1, waveBottom);
    h.clearRect(WAVE_X, WAVE_Y, WAVE_X + WAVE_W - 1, waveBottom);
    if (isAudioPlaying) {
      Pip.getAudioWaveform(wavePoly, WAVE_Y, waveBottom);
    } else {
      let t = getTime();
      for (let i = 1; i < 60; i += 2) {
        wavePoly[i] = ym + 45 * Math.sin(t) * Math.sin(0.13 * (t += 0.6));
      }
    }
    h.setColor(C_BRIGHT).drawPolyAA(wavePoly);
    h.setClipRect(0, 0, app.W - 1, app.H - 1);
  }

  function drawWaveformBorder() {
    const x = WAVE_X;
    const y = WAVE_Y;
    const bw = WAVE_W + 10;
    const bh = WAVE_H + 15;
    let bx = x;
    let by = y + 2;

    h.setColor(C_MED);
    h.fillRect(x + bw, y, x + bw + 2, y + bh);
    h.fillRect(x, y + bh, x + bw, y + bh + 2);

    for (let i = 5; bx < x + bw; i++) {
      bx += 5;
      const th = i % 6 === 0 ? 14 : i % 2 === 1 ? 4 : 7;
      h.fillRect(bx, y + bh, bx + 1, y + bh - th);
    }

    for (let i = 5; by < y + bh; i++) {
      by += 5;
      const tw = i % 6 === 0 ? 14 : i % 2 === 1 ? 4 : 7;
      h.fillRect(x + bw, by, x + bw - tw, by + 1);
    }
  }

  function ellipsize(text, maxPx) {
    'ram';
    if (h.stringWidth(text) <= maxPx) return text;
    const dots = '...';
    const dotsW = h.stringWidth(dots);
    let lo = 0,
      hi = text.length,
      best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (h.stringWidth(text.slice(0, mid)) + dotsW <= maxPx) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return text.slice(0, best) + dots;
  }

  function ensureMusicDir() {
    if (isDirectory(MUSIC_DIR)) return;
    try {
      fs.mkdir('/' + MUSIC_DIR);
    } catch (e) {}
  }

  function fileExists(path) {
    try {
      const st = fs.statSync('/' + path);
      return !!st && !st.dir;
    } catch (e) {
      return false;
    }
  }

  function handlePlayAllSelect() {
    if (view === 'stations') return;

    if (isPlayAll && isAudioPlaying) {
      stopSong();
      return;
    }

    if (!allSongs.length) return;

    if (isAudioPlaying) suppressAudioStopped = true;
    isAudioPlaying = false;
    Pip.radioClipPlaying = false;
    try {
      Pip.audioStop();
    } catch (e) {}
    playingPath = null;

    isRandom = false;
    randomQueue = [];
    isPlayAll = true;
    playAllIdx = songPage * PAGE_SIZE;
    if (playAllIdx >= allSongs.length) playAllIdx = 0;
    playNextPlayAll();
    drawList();
    uiSound('SELECT');
  }

  function handleRandomSelect() {
    if (view === 'stations') return;

    if (isRandom && isAudioPlaying) {
      stopSong();
      return;
    }

    if (isAudioPlaying) suppressAudioStopped = true;
    isAudioPlaying = false;
    Pip.radioClipPlaying = false;
    try {
      Pip.audioStop();
    } catch (e) {}
    playingPath = null;

    startRandom(currentStation);
    drawList();
    uiSound('SELECT');
  }

  function handleSelect() {
    if (removed) return;
    lastSelectTime = Date.now();
    const item = listItems[selectedIdx];
    if (!item) return;

    if (item.type === 'menu') {
      openMenu();
      return;
    }

    if (item.type === 'random') {
      handleRandomSelect();
      return;
    }

    if (item.type === 'playall') {
      handlePlayAllSelect();
      return;
    }

    if (item.type === 'back') {
      navigateToStations();
      return;
    }

    if (item.type === 'station') {
      navigateToSongs(item.name);
      return;
    }

    if (item.type === 'prev') {
      if (songPage > 0) {
        songPage--;
        selectedIdx = SONG_HEADER_COUNT;
        scrollOffset = 0;
        rebuildList();
        drawList();
        uiSound('TAB');
      }
      return;
    }

    if (item.type === 'next') {
      const maxPage = Math.floor(Math.max(0, allSongs.length - 1) / PAGE_SIZE);
      if (songPage < maxPage) {
        songPage++;
        selectedIdx = SONG_HEADER_COUNT;
        scrollOffset = 0;
        rebuildList();
        drawList();
        uiSound('TAB');
      }
      return;
    }

    if (item.type === 'song') {
      if (item.tooLong) {
        drawNowPlaying('FILE NAME TOO LONG', true);
        return;
      }
      handleSongSelect(item);
    }
  }

  function handleSongSelect(item) {
    const full = pathJoin(pathJoin(MUSIC_DIR, currentStation), item.name);

    if (playingPath === full) {
      stopSong();
      isRandom = false;
      return;
    }

    isRandom = false;
    isPlayAll = false;
    randomQueue = [];
    playSong(currentStation, item.name);
    uiSound('SELECT');
  }

  function hwRandInt(n) {
    if (typeof E !== 'undefined' && E.hwRand) {
      return (E.hwRand() >>> 0) % n;
    }
    return Math.randInt(n);
  }

  function initWaveform() {
    wavePoly = new Uint16Array(60);
    for (let i = 0; i < 60; i += 2) {
      wavePoly[i] = WAVE_X + 5 + ((i >> 1) * WAVE_W) / 30;
    }
  }

  function isDirectory(path) {
    try {
      const st = fs.statSync('/' + path);
      return !!st && !!st.dir;
    } catch (e) {
      return false;
    }
  }

  function isPathTooLong(base, name) {
    return ('/' + pathJoin(base, name)).length > MAX_PATH;
  }

  function loadSongs(stationName) {
    const dir = pathJoin(MUSIC_DIR, stationName);
    const entries = readDir(dir);
    allSongs = [];
    for (let i = 0; i < entries.length; i++) {
      const name = entries[i];
      if (/\.wav$/i.test(name)) {
        allSongs.push({ name: name });
      }
    }
    sortSongs();
  }

  function loadStations() {
    const entries = readDir(MUSIC_DIR);
    stations = [];
    for (let i = 0; i < entries.length; i++) {
      const name = entries[i];
      if (isDirectory(pathJoin(MUSIC_DIR, name))) {
        stations.push(name);
      }
    }
  }

  function navigateToSongs(stationName) {
    if (isAudioPlaying) suppressAudioStopped = true;
    isAudioPlaying = false;
    Pip.radioClipPlaying = false;
    try {
      Pip.audioStop();
    } catch (e) {}
    playingPath = null;
    playingName = null;
    playingStation = null;
    isRandom = false;
    isPlayAll = false;
    randomQueue = [];

    view = 'songs';
    currentStation = stationName;
    songPage = 0;
    selectedIdx = 0;
    scrollOffset = 0;
    loadSongs(stationName);
    rebuildList();
    drawAll();
    uiSound('TAB');
  }

  function navigateToStations() {
    view = 'stations';
    currentStation = null;
    allSongs = [];
    songPage = 0;
    selectedIdx = 0;
    scrollOffset = 0;
    loadStations();
    rebuildList();
    drawAll();
    uiSound('TAB');
  }

  function onAudioStopped() {
    if (suppressAudioStopped) {
      suppressAudioStopped = false;
      return;
    }
    isAudioPlaying = false;
    Pip.radioClipPlaying = false;
    playingPath = null;
    if (isRandom) {
      playNextRandom();
      return;
    }
    if (isPlayAll) {
      playNextPlayAll();
      return;
    }
    playingName = null;
    drawNowPlaying(null, false);
    drawList();
  }

  function onKnob1(dir, long) {
    if (!dir) {
      if (long) openSettings();
      else handleSelect();
      return;
    }
    const now = Date.now();
    if (now - lastKnobTime < KNOB_DEBOUNCE_MS) return;
    if (now - lastSelectTime < POST_SELECT_IGNORE_MS) return;
    lastKnobTime = now;

    selectedIdx += dir > 0 ? 1 : -1;
    if (selectedIdx < 0) selectedIdx = 0;
    if (selectedIdx >= listItems.length) selectedIdx = listItems.length - 1;
    clampScroll();
    drawList();
    uiSound('HIGHLIGHT');
  }

  function onKnob2(dir) {
    if (!dir) return;
    const now = Date.now();
    if (now - lastVolKnobTime < KNOB_DEBOUNCE_MS) return;
    lastVolKnobTime = now;

    currentVol = Math.max(
      VOL_MIN,
      Math.min(VOL_MAX, currentVol + (dir > 0 ? 1 : -1)),
    );
    try {
      Pip.setVol(currentVol);
    } catch (e) {}
    app.currentVol = currentVol;

    drawVolHud();
  }

  function openMenu() {
    if (waveInterval) {
      clearInterval(waveInterval);
      waveInterval = null;
    }
    if (volHudTimeout) {
      clearTimeout(volHudTimeout);
      volHudTimeout = null;
    }
    suppressAudioStopped = true;
    isAudioPlaying = false;
    Pip.radioClipPlaying = false;
    try {
      Pip.audioStop();
    } catch (e) {}
    uiSound('TAB');
    app.go(app.scenes.MENU || 'MENU.JS');
  }

  function openSettings() {
    if (waveInterval) {
      clearInterval(waveInterval);
      waveInterval = null;
    }
    if (volHudTimeout) {
      clearTimeout(volHudTimeout);
      volHudTimeout = null;
    }
    uiSound('TAB');
    stopSong();
    app.go(app.scenes.SETTINGS || 'SETTINGS.JS');
  }

  function pathJoin(a, b) {
    if (!a) return b;
    if (!b) return a;
    return a + '/' + b;
  }

  function playNextPlayAll() {
    if (!isPlayAll) return;
    const st = playingStation || currentStation;
    const base = pathJoin(MUSIC_DIR, st);

    // Find next song, wrap to first song if needed.
    let scanned = 0;
    while (scanned < allSongs.length) {
      if (playAllIdx >= allSongs.length) playAllIdx = 0;
      if (!isPathTooLong(base, allSongs[playAllIdx].name)) break;
      playAllIdx++;
      scanned++;
    }
    if (scanned >= allSongs.length) {
      isPlayAll = false;
      playingName = null;
      drawNowPlaying(null, false);
      drawList();
      return;
    }

    const idx = playAllIdx++;
    // Update page to follow new song if needed.
    const page = Math.floor(idx / PAGE_SIZE);
    if (page !== songPage) {
      songPage = page;
      rebuildList();
    }
    playSong(st, allSongs[idx].name);
  }

  function playNextRandom() {
    if (!isRandom || !randomQueue.length) {
      isRandom = false;
      drawNowPlaying(null, false);
      drawList();
      return;
    }
    if (randomQueueIdx >= randomQueue.length) {
      shuffle(randomQueue);
      if (randomQueue.length > 1 && randomQueue[0].name === lastPlayedName) {
        const t = randomQueue[0];
        randomQueue[0] = randomQueue[1];
        randomQueue[1] = t;
      }
      randomQueueIdx = 0;
    }
    const next = randomQueue[randomQueueIdx++];
    playSong(playingStation || currentStation, next.name);
  }

  function playSong(stationName, songName) {
    const base = pathJoin(MUSIC_DIR, stationName);
    const full = pathJoin(base, songName);

    if (isAudioPlaying) suppressAudioStopped = true;
    isAudioPlaying = false;
    Pip.radioClipPlaying = false;
    try {
      Pip.audioStop();
    } catch (e) {}

    if (!fileExists(full)) {
      drawNowPlaying('File not found', true);
      return;
    }

    try {
      Pip.audioStart(full);
    } catch (e) {
      drawNowPlaying('Play error', true);
      return;
    }

    playingPath = full;
    playingName = songLabel(songName);
    playingStation = stationName;
    lastPlayedName = songName;
    isAudioPlaying = true;
    Pip.radioClipPlaying = true;

    drawNowPlaying(playingName, false);
    drawList();
  }

  function readDir(path) {
    try {
      return fs
        .readdir('/' + path)
        .filter(function (n) {
          return n !== '.' && n !== '..';
        })
        .sort();
    } catch (e) {
      try {
        E.defrag();
        return fs
          .readdir('/' + path)
          .filter(function (n) {
            return n !== '.' && n !== '..';
          })
          .sort();
      } catch (e2) {
        return [];
      }
    }
  }

  function readSystemVolume() {
    let v = VOL_DEFAULT;
    if (typeof app.currentVol === 'number') {
      v = app.currentVol;
    } else {
      try {
        if (
          typeof Pip !== 'undefined' &&
          Pip.settings &&
          typeof Pip.settings.volume === 'number'
        ) {
          app.initialVol = Pip.settings.volume;
          v = app.initialVol;
        }
      } catch (e) {}
    }
    if (v < VOL_MIN) v = VOL_MIN;
    if (v > VOL_MAX) v = VOL_MAX;
    return v;
  }

  function rebuildList() {
    listItems = view === 'stations' ? buildStationItems() : buildSongItems();
    if (selectedIdx >= listItems.length) selectedIdx = listItems.length - 1;
    if (selectedIdx < 0) selectedIdx = 0;
    clampScroll();
  }

  function remove() {
    if (removed) return;
    removed = true;

    if (waveInterval) {
      clearInterval(waveInterval);
      waveInterval = null;
    }
    if (volHudTimeout) {
      clearTimeout(volHudTimeout);
      volHudTimeout = null;
    }
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
    Pip.removeListener('audioStopped', onAudioStopped);

    isAudioPlaying = false;
    Pip.radioClipPlaying = false;
    Pip.audioStop();

    h.clear();
    h.flip();
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = hwRandInt(i + 1);
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
  }

  function songLabel(name) {
    return name.replace(/\.wav$/i, '');
  }

  function sortSongs() {
    allSongs.sort(function (a, b) {
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      return an < bn ? -sortDir : an > bn ? sortDir : 0;
    });
  }

  function start() {
    h.clear();
    Pip.audioStop();

    currentVol = readSystemVolume();
    try {
      Pip.setVol(currentVol);
    } catch (e) {}
    app.currentVol = currentVol;

    Pip.onExclusive('knob1', onKnob1);
    Pip.onExclusive('knob2', onKnob2);

    Pip.on('audioStopped', onAudioStopped);

    initWaveform();
    ensureMusicDir();
    loadStations();
    rebuildList();
    drawAll();
  }

  function startRandom(stationName) {
    isRandom = true;
    isPlayAll = false;
    randomQueue = buildRandomPool(stationName).slice();
    if (!randomQueue.length) {
      isRandom = false;
      return;
    }
    shuffle(randomQueue);
    if (
      lastPlayedName &&
      randomQueue.length > 1 &&
      randomQueue[0].name === lastPlayedName
    ) {
      const t = randomQueue[0];
      randomQueue[0] = randomQueue[1];
      randomQueue[1] = t;
    }
    randomQueueIdx = 0;
    playSong(stationName, randomQueue[randomQueueIdx++].name);
  }

  function startWaveform() {
    if (waveInterval) return;
    waveInterval = setInterval(drawWaveform, WAVEFORM_MS);
  }

  function stopSong() {
    suppressAudioStopped = true;
    isAudioPlaying = false;
    Pip.radioClipPlaying = false;
    try {
      Pip.audioStop();
    } catch (e) {}
    playingPath = null;
    playingName = null;
    isRandom = false;
    isPlayAll = false;
    randomQueue = [];
    drawNowPlaying(null, false);
    drawList();
  }

  function uiSound(name) {
    try {
      if (Pip.playSound) Pip.playSound(name);
    } catch (e) {}
  }

  start();

  return {
    remove: remove,
  };
});
