// =============================================================================
//  Name: RobCo Entertainment Terminal
//  Author(s): @CodyTolene
//  Contributor(s): @joemto20-tech
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app) {
  const MUSIC_DIR = 'MUSIC';
  const MAX_PATH = 56;

  const C_BLACK = 0;
  const C_DIM = 1;
  const C_MED = 2;
  const C_BRIGHT = 3;

  const ROW_H = 22;
  const LIST_X = 12;
  const LIST_W = 222;
  const LIST_TITLE_Y = 52;
  const LIST_START_Y = 78;
  const VISIBLE_ROWS = 9;

  const WAVE_X = 244;
  const WAVE_Y = 44;
  const WAVE_W = 210;
  const WAVE_H = 162;
  const INFO_Y = WAVE_Y + WAVE_H + 22;

  const VOL_MIN = 0;
  const VOL_MAX = 27;
  const VOL_HUD_MS = 1500;
  const KNOB_MS = 30;

  const rd = Pip.radio;

  let removed = false;
  let view = 'stations'; // 'stations' | 'songs'
  let stations = []; // [{ name , path }]
  let songs = []; // wav filenames in the open station
  let curStation = null; // { name, path } currently browsed
  let items = []; // current list rows
  let sel = 0;
  let scrollOffset = 0;
  let waveTimer = 0;
  let wave = 0;
  let currentVol = 20;
  let lastKnob = 0;
  let lastVol = 0;
  let lastTrackKey = '';
  let volHudTimer = 0;

  function backToStations() {
    view = 'stations';
    loadStations();
    sel = 0;
    scrollOffset = 0;
    rebuildItems();
    drawAll();
    sound('TAB');
  }

  function clampScroll() {
    if (sel < scrollOffset) scrollOffset = sel;
    if (sel >= scrollOffset + VISIBLE_ROWS)
      scrollOffset = sel - VISIBLE_ROWS + 1;
    if (scrollOffset < 0) scrollOffset = 0;
  }

  function drawAll() {
    h.clear(1);
    drawHeader();
    drawTitle();
    drawWaveBorder();
    drawList(false);
    drawInfo(true);
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

  function drawHeader() {
    try {
      Pip.renderHeader();
      Pip.renderFooter();
    } catch (e) {
      h.setColor(C_DIM)
        .drawLine(0, 39, app.W - 1, 39)
        .drawLine(0, app.H - 30, app.W - 1, app.H - 30);
    }
  }

  function drawInfo(flip) {
    h.setColor(C_BLACK).fillRect(WAVE_X, INFO_Y, app.W - 1, INFO_Y + 56);
    const track = playingTrackName();
    const stn = playingStationName();
    if (track) {
      h.setColor(C_BRIGHT)
        .setFont('6x8', 2)
        .setFontAlign(-1, -1)
        .drawString(
          ellipsize(songLabel(track), app.W - WAVE_X - 4),
          WAVE_X,
          INFO_Y + 2,
        );
      if (stn)
        h.setColor(C_MED)
          .setFont('6x8')
          .setFontAlign(-1, -1)
          .drawString(
            ellipsize('' + stn, app.W - WAVE_X - 4),
            WAVE_X,
            INFO_Y + 24,
          );
      if (rd.mjMode === 1)
        h.setColor(C_BRIGHT)
          .setFont('6x8')
          .setFontAlign(-1, -1)
          .drawString('(shuffle)', WAVE_X, INFO_Y + 38);
      else if (rd.mjMode === 2)
        h.setColor(C_BRIGHT)
          .setFont('6x8')
          .setFontAlign(-1, -1)
          .drawString('(play all)', WAVE_X, INFO_Y + 38);
    }
    if (flip) {
      h.flip();
      Pip.lastFlip = getTime();
    }
  }

  function drawList(flip) {
    'ram';
    h.setColor(C_BLACK).fillRect(
      LIST_X,
      LIST_START_Y,
      LIST_X + LIST_W,
      LIST_START_Y + VISIBLE_ROWS * ROW_H,
    );
    h.setFont('Monofonto14').setFontAlign(-1, -1);
    const last = Math.min(scrollOffset + VISIBLE_ROWS, items.length);
    for (let i = scrollOffset; i < last; i++) {
      const item = items[i];
      const y = LIST_START_Y + (i - scrollOffset) * ROW_H;
      const on = i === sel;
      if (on)
        h.setColor(C_DIM).fillRect(LIST_X, y, LIST_X + LIST_W, y + ROW_H - 2);
      if (
        rd.mjOn &&
        ((item.t === 'shuffle' && rd.mjMode === 1) ||
          (item.t === 'playall' && rd.mjMode === 2))
      )
        h.setColor(C_BRIGHT).fillRect(
          LIST_X + LIST_W - 5,
          y + 7,
          LIST_X + LIST_W - 2,
          y + ROW_H - 9,
        );
      let x = LIST_X + 6;
      if (isPlayingRow(item)) {
        const sq = y + Math.floor((ROW_H - 4) / 2);
        h.setColor(C_BRIGHT).fillRect(x, sq, x + 3, sq + 3);
        x += 8;
      }
      h.setColor(on ? C_BRIGHT : C_MED).drawString(
        ellipsize(item.l, LIST_X + LIST_W - x - 8),
        x,
        y + 4,
      );
    }
    if (view === 'stations' && !stations.length) drawEmptyState();
    if (flip) {
      h.flip();
      Pip.lastFlip = getTime();
    }
  }

  function drawTitle() {
    h.setColor(C_BRIGHT)
      .setFontMonofonto16()
      .setFontAlign(-1, -1)
      .drawString(app.names[2], LIST_X + 6, LIST_TITLE_Y);
    if (app.version) {
      h.setColor(C_BRIGHT)
        .setFont('6x8')
        .setFontAlign(-1, -1)
        .drawString(
          'v' + app.version,
          LIST_X + 6 + h.stringWidth(app.names[2]) + 4,
          LIST_TITLE_Y + 8,
        );
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
    if (waveTimer) {
      clearInterval(waveTimer);
      waveTimer = 0;
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
    if (volHudTimer) clearTimeout(volHudTimer);
    volHudTimer = setTimeout(function () {
      volHudTimer = 0;
      h.setColor(C_BLACK).fillRect(
        WAVE_X,
        WAVE_Y,
        WAVE_X + WAVE_W - 1,
        WAVE_Y + WAVE_H,
      );
      h.flip();
      Pip.lastFlip = getTime();
      startWave();
    }, VOL_HUD_MS);
  }

  function drawWave() {
    'ram';
    if (removed) return;
    // Follow the engine's auto-advance in the now-playing area + song highlight.
    const key = playingStationName() + '|' + playingTrackName();
    if (key !== lastTrackKey) {
      lastTrackKey = key;
      drawInfo(false);
      if (view === 'songs') drawList(false);
    }
    const x = WAVE_X;
    const y = WAVE_Y;
    const mid = y + (WAVE_H >> 1);
    if (!wave) {
      wave = new Uint16Array(60);
      for (let i = 0; i < 60; i += 2) wave[i] = x + (i * WAVE_W) / 60;
    }
    h.setClipRect(x, y, x + WAVE_W - 1, y + WAVE_H).clearRect(
      x,
      y,
      x + WAVE_W - 1,
      y + WAVE_H,
    );
    if (Pip.radioClipPlaying && Pip.getAudioWaveform) {
      try {
        Pip.getAudioWaveform(wave, y, y + WAVE_H);
      } catch (e) {}
    } else {
      let t = getTime();
      for (let i = 1; i < 60; i += 2)
        wave[i] = mid + 28 * Math.sin(t) * Math.sin(0.13 * (t += 0.6));
    }
    h.setColor(C_BRIGHT).drawPolyAA(wave);
    h.setClipRect(0, 0, app.W - 1, app.H - 1);
  }

  function drawWaveBorder() {
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
    if (!isDir(MUSIC_DIR)) {
      try {
        fs.mkdir('/' + MUSIC_DIR);
      } catch (e) {}
    }
  }

  function firstPlayable(station) {
    for (let i = 0; i < songs.length; i++) {
      if (!tooLong(station.p, songs[i])) return songs[i];
    }
    return null;
  }

  function hwRandInt(n) {
    if (typeof E !== 'undefined' && E.hwRand) return (E.hwRand() >>> 0) % n;
    return Math.randInt(n);
  }

  function installEngine() {
    if (
      rd.mjNext &&
      rd.mjHandler &&
      rd.mjWatch &&
      Pip.rcetStop &&
      (!app.persist ||
        rd.rcetPersistSupported === false ||
        (Pip._mjStart &&
          Pip._mjStop &&
          Pip._rcetSleepWrapped &&
          rd.mjTabHandler))
    )
      return;
    process.memory(true);
    E.defrag();
    eval(fs.readFileSync('HOLO/RCET/ENGINE.JS'))(app);
    process.memory(true);
  }

  function isDir(p) {
    try {
      return !!fs.statSync(p).dir;
    } catch (e) {
      try {
        return !!fs.statSync('/' + p).dir;
      } catch (e2) {
        return false;
      }
    }
  }

  function isPlayingRow(item) {
    if (!rd.mjOn) return false;
    if (item.t === 'station') return item.s.n === playingStationName();
    if (item.t === 'song')
      return (
        curStation &&
        curStation.n === playingStationName() &&
        item.name === playingTrackName()
      );
    return false;
  }

  // Read one station's wav files (on demand).
  function loadSongs(station) {
    songs = [];
    const x = readDir(station.p)
      .slice()
      .sort(function (a, b) {
        a = ('' + a).toLowerCase();
        b = ('' + b).toLowerCase();
        return a < b ? -app.sortDir : a > b ? app.sortDir : 0;
      });
    for (let i = 0; i < x.length; i++) {
      const s = '' + x[i];
      if (/\.(wav|wave)$/i.test(s)) songs.push(s);
    }
  }

  // Only folder names + a root pseudo-station. Songs are NOT read here.
  function loadStations() {
    let root = MUSIC_DIR;
    let x = readDir(root);
    if (!x.length && isDir('/' + MUSIC_DIR)) {
      root = '/' + MUSIC_DIR;
      x = readDir(root);
    }
    x = x.slice().sort();
    stations = [];
    let hasRootWav = false;
    for (let i = 0; i < x.length; i++) {
      const n = '' + x[i];
      if (n === '.' || n === '..') continue;
      if (isDir(root + '/' + n)) stations.push({ n: n, p: root + '/' + n });
      else if (/\.(wav|wave)$/i.test(n)) hasRootWav = true;
    }
    if (hasRootWav) stations.push({ n: 'MUSIC', p: root });
  }

  function onKnob1(dir, long) {
    if (removed) return;
    if (!dir && long) {
      openSettings();
      return;
    }
    if (dir) {
      const now = Date.now();
      if (now - lastKnob < KNOB_MS) return;
      lastKnob = now;
      sel += dir > 0 ? 1 : -1;
      if (sel < 0) sel = 0;
      if (sel >= items.length) sel = items.length - 1;
      clampScroll();
      drawList(true);
      sound('HIGHLIGHT');
      return;
    }
    const item = items[sel];
    if (!item) return;
    if (item.t === 'menu') {
      sound('SELECT');
      app.go(app.scenes.MENU || 'MENU.JS');
      return;
    }
    if (item.t === 'station') {
      openStation(item.s);
      return;
    }
    if (item.t === 'back') {
      backToStations();
      return;
    }
    sound('SELECT');
    if (item.t === 'shuffle') {
      play(curStation, null, 1);
    } else if (item.t === 'playall') {
      play(curStation, firstPlayable(curStation), 2);
    } else if (item.t === 'song') {
      if (isPlayingRow(item)) stopMusic();
      else play(curStation, item.name, 0);
    }
    drawList(false);
    drawInfo(true);
  }

  function onKnob2(dir) {
    if (removed || !dir) return;
    const now = Date.now();
    if (now - lastVol < KNOB_MS) return;
    lastVol = now;
    currentVol = E.clip(currentVol + (dir > 0 ? 1 : -1), VOL_MIN, VOL_MAX);
    app.currentVol = currentVol;
    rd.mjVol = currentVol;
    try {
      Pip.setVol(currentVol);
    } catch (e) {}
    drawVolHud();
  }

  function openSettings() {
    sound('TAB');
    app.go(app.scenes.SETTINGS || 'SETTINGS.JS');
  }

  function openStation(station) {
    curStation = station;
    loadSongs(station);
    view = 'songs';
    sel = 0;
    scrollOffset = 0;
    rebuildItems();
    drawAll();
    sound('TAB');
  }

  function play(station, startSong, mode) {
    if (!station) return false;
    const base = station.p;
    const tracks = [];
    for (let i = 0; i < songs.length; i++) {
      if (!tooLong(base, songs[i])) tracks.push(songs[i]);
    }
    if (!tracks.length) return false;

    let idx = 0;
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i] === startSong) {
        idx = i;
        break;
      }
    }
    if (mode === 1) {
      for (let i = tracks.length - 1; i > 0; i--) {
        const j = hwRandInt(i + 1);
        const t = tracks[i];
        tracks[i] = tracks[j];
        tracks[j] = t;
      }
      if (startSong) {
        for (let i = 0; i < tracks.length; i++) {
          if (tracks[i] === startSong) {
            const t0 = tracks[0];
            tracks[0] = tracks[i];
            tracks[i] = t0;
            break;
          }
        }
      }
      idx = 0;
    }

    rd.mjStations = [{ n: station.n, p: base + '/', t: tracks }];
    rd.mjStationIndex = 0;
    rd.mjTrackIndex = idx - 1; // mjNext advances +1
    rd.mjMode = mode;
    rd.mjOn = 1;
    rd.mojaveStation = 1;
    rd.mojaveError = 0;
    rd.mjVol = currentVol;
    installEngine();
    if (rd.mjNext) rd.mjNext();
    return true;
  }

  // The station/track currently playing (from the engine).
  function playingStationName() {
    return rd.mjOn && rd.mjStations && rd.mjStations[0]
      ? rd.mjStations[0].n
      : null;
  }

  function playingTrackName() {
    if (!rd.mjOn || !rd.mjStations || !rd.mjStations[0]) return null;
    const t = rd.mjStations[0].t;
    return t ? t[rd.mjTrackIndex || 0] : null;
  }

  function readDir(p) {
    try {
      return fs.readdir(p);
    } catch (e) {
      try {
        return fs.readdir('/' + p);
      } catch (e2) {
        return [];
      }
    }
  }

  function readVol() {
    if (typeof app.currentVol === 'number') return app.currentVol;
    try {
      if (Pip.settings && typeof Pip.settings.volume === 'number')
        return Pip.settings.volume;
    } catch (e) {}
    return 20;
  }

  function rebuildItems() {
    items = [];
    if (view === 'stations') {
      items.push({ t: 'menu', l: '< BACK TO MENU' });
      for (let i = 0; i < stations.length; i++) {
        items.push({ t: 'station', l: '> ' + stations[i].n, s: stations[i] });
      }
    } else {
      items.push({ t: 'back', l: '< BACK TO PLAYLISTS' });
      items.push({ t: 'shuffle', l: '~ SHUFFLE PLAY ALL' });
      items.push({ t: 'playall', l: '> PLAY ALL' });
      for (let i = 0; i < songs.length; i++) {
        items.push({ t: 'song', l: songLabel(songs[i]), name: songs[i] });
      }
    }
    if (sel >= items.length) sel = items.length - 1;
    if (sel < 0) sel = 0;
    clampScroll();
  }

  function remove() {
    if (removed) return;
    removed = true;
    if (waveTimer) {
      clearInterval(waveTimer);
      waveTimer = 0;
    }
    if (volHudTimer) {
      clearTimeout(volHudTimer);
      volHudTimer = 0;
    }
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
    // Persistent mode + playing: leave the engine running (survives on
    // Pip.radio). Otherwise stop and restore any overridden globals.
    if (!(app.persist && rd.rcetPersistSupported && rd.mjOn)) stopMusic();
    h.clear();
    h.flip();
  }

  function songLabel(name) {
    return ('' + name).replace(/\.(wav|wave)$/i, '');
  }

  function sound(name) {
    try {
      if (Pip.playSound) Pip.playSound(name);
    } catch (e) {}
  }

  function startWave() {
    if (!removed && !waveTimer) waveTimer = setInterval(drawWave, 50);
  }

  function stopMusic() {
    if (Pip.rcetStop) {
      try {
        Pip.rcetStop();
      } catch (e) {}
    } else {
      rd.mjOn = 0;
      Pip.radioClipPlaying = 0;
      try {
        Pip.audioStop();
      } catch (e) {}
    }
    rd.mjMode = 0;
  }

  function tooLong(base, name) {
    return ('/' + base + '/' + name).length > MAX_PATH;
  }

  currentVol = readVol();
  try {
    Pip.setVol(currentVol);
  } catch (e) {}
  app.currentVol = currentVol;

  ensureMusicDir();
  loadStations();

  // Re-entering while a station is playing: re-arm and drop into its song list.
  if (rd.mjOn) {
    installEngine();
    const pn = playingStationName();
    let found = null;
    for (let i = 0; i < stations.length; i++)
      if (stations[i].n === pn) {
        found = stations[i];
        break;
      }
    if (found) {
      curStation = found;
      loadSongs(found);
      view = 'songs';
    }
  }
  rebuildItems();

  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  drawAll();
  startWave();

  return {
    remove: remove,
  };
});
