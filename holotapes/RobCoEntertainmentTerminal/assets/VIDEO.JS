// =============================================================================
//  Name: RobCo Entertainment Terminal
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app) {
  const C_BLACK = 0;
  const C_DIM = 1;
  const C_MED = 2;
  const C_BRIGHT = 3;

  const ROW_H = 24;
  const LIST_X = 12;
  const LIST_W = app.W - 24;
  const LIST_TITLE_Y = 52;
  const LIST_START_Y = 88;
  const VISIBLE_ROWS = 8;

  const VIDEO_DIR = 'VIDEOS';
  const MAX_PATH = 56;
  const KNOB_DEBOUNCE_MS = 30;

  const SYM = { menu: '< ', video: '> ' };

  let removed = false;
  let playing = false;
  let listItems = [];
  let videos = [];
  let selectedIdx = 0;
  let scrollOffset = 0;
  let lastKnobTime = 0;
  let holdInterval = null;

  function buildItems() {
    const items = [{ type: 'menu', label: 'BACK TO MENU' }];
    for (let i = 0; i < videos.length; i++) {
      items.push({
        type: 'video',
        name: videos[i],
        tooLong: isPathTooLong(videos[i]),
      });
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
    try {
      Pip.renderHeader();
      Pip.renderFooter();
    } catch (e) {
      h.setColor(C_DIM)
        .drawLine(0, 39, app.W - 1, 39)
        .drawLine(0, app.H - 30, app.W - 1, app.H - 30);
    }
    drawTitleBar();
    drawList();
  }

  function drawEmptyState() {
    const x = LIST_X + 4;
    let y = LIST_START_Y + ROW_H + 8;

    h.setColor(C_BRIGHT)
      .setFont('Monofonto16')
      .setFontAlign(-1, -1)
      .drawString('NO VIDEOS FOUND', x, y);
    y += 34;

    h.setColor(C_MED).setFont('Monofonto14').setFontAlign(-1, -1);
    const lines = h.wrapString(
      'Add AVI clips to the VIDEOS folder on the SD card. Convert videos at https://pip-boy.com/tools',
      LIST_W - 8,
    );
    for (let i = 0; i < lines.length; i++) {
      h.drawString(lines[i], x, y);
      y += 16;
    }
  }

  function drawList() {
    'ram';
    const baseX = LIST_X + 4;

    h.setColor(C_BLACK).fillRect(
      LIST_X,
      LIST_START_Y,
      LIST_X + LIST_W,
      LIST_START_Y + VISIBLE_ROWS * ROW_H,
    );

    h.setFont('Monofonto16').setFontAlign(-1, -1);

    const last = Math.min(scrollOffset + VISIBLE_ROWS, listItems.length);
    for (let absIdx = scrollOffset; absIdx < last; absIdx++) {
      const item = listItems[absIdx];
      const isSelected = absIdx === selectedIdx;
      const y = LIST_START_Y + (absIdx - scrollOffset) * ROW_H;

      let color;
      if (item.type === 'video' && item.tooLong) {
        color = isSelected ? C_MED : C_DIM;
      } else {
        color = isSelected ? C_BRIGHT : C_MED;
      }

      if (isSelected) {
        h.setColor(C_DIM).fillRect(LIST_X, y, LIST_X + LIST_W, y + ROW_H - 2);
      }

      h.setColor(color).drawString(
        ellipsize(
          (SYM[item.type] || '') + label(item),
          LIST_X + LIST_W - baseX - 8,
        ),
        baseX,
        y + 4,
      );
    }

    if (!videos.length) drawEmptyState();

    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawTitleBar() {
    h.setColor(C_BRIGHT)
      .setFontMonofonto16()
      .setFontAlign(-1, -1)
      .drawString(app.names[3], LIST_X + 6, LIST_TITLE_Y);

    const APP_VERSION = app.version;
    if (APP_VERSION) {
      const versionX = LIST_X + 6 + h.stringWidth(app.names[3]) + 4;
      h.setColor(C_BRIGHT)
        .setFont('6x8')
        .setFontAlign(-1, -1)
        .drawString('v' + APP_VERSION, versionX, LIST_TITLE_Y + 8);
    }

    h.setColor(C_DIM).drawLine(
      LIST_X,
      LIST_START_Y - 4,
      LIST_X + LIST_W,
      LIST_START_Y - 4,
    );
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

  function ensureVideoDir() {
    if (isDirectory(VIDEO_DIR)) return;
    try {
      fs.mkdir('/' + VIDEO_DIR);
    } catch (e) {}
  }

  function handleSelect() {
    const item = listItems[selectedIdx];
    if (!item) return;

    if (item.type === 'menu') {
      sound('TAB');
      app.go(app.scenes.MENU || 'MENU.JS');
      return;
    }

    if (item.type === 'video') {
      if (item.tooLong) return;
      startVideo(item.name);
    }
  }

  function holdVideoFrame() {
    Pip.lastFlip = getTime() + 1;
  }

  function isDirectory(path) {
    try {
      const st = fs.statSync('/' + path);
      return !!st && !!st.dir;
    } catch (e) {
      return false;
    }
  }

  function isPathTooLong(name) {
    return ('/' + VIDEO_DIR + '/' + name).length > MAX_PATH;
  }

  function label(item) {
    if (item.type === 'video') return item.name.replace(/\.avi$/i, '');
    return item.label || item.name || '';
  }

  function loadVideos() {
    videos = [];
    const entries = readDir(VIDEO_DIR);
    for (let i = 0; i < entries.length; i++) {
      const name = entries[i];
      if (name.slice(-4).toLowerCase() === '.avi') videos.push(name);
    }
  }

  function onKnob1(dir) {
    if (removed) return;

    if (playing) {
      if (!dir) stopVideo(true);
      return;
    }

    if (!dir) {
      handleSelect();
      return;
    }

    const now = Date.now();
    if (now - lastKnobTime < KNOB_DEBOUNCE_MS) return;
    lastKnobTime = now;

    selectedIdx += dir > 0 ? 1 : -1;
    if (selectedIdx < 0) selectedIdx = 0;
    if (selectedIdx >= listItems.length) selectedIdx = listItems.length - 1;
    clampScroll();
    drawList();
    sound('HIGHLIGHT');
  }

  function onKnob2() {}

  function onVideoStopped() {
    stopVideo(false);
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
      return [];
    }
  }

  function rebuildList() {
    listItems = buildItems();
    if (selectedIdx >= listItems.length) selectedIdx = listItems.length - 1;
    if (selectedIdx < 0) selectedIdx = 0;
    clampScroll();
  }

  function remove() {
    if (removed) return;
    removed = true;
    stopPlayback();
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
    Pip.audioStop();
    h.clear();
    h.flip();
  }

  function sound(name) {
    try {
      if (Pip.playSound) Pip.playSound(name);
    } catch (e) {}
  }

  function start() {
    Pip.audioStop();
    Pip.onExclusive('knob1', onKnob1);
    Pip.onExclusive('knob2', onKnob2);
    ensureVideoDir();
    loadVideos();
    rebuildList();
    drawAll();
  }

  function startVideo(name) {
    sound('TAB');
    playing = true;

    h.clear(0).flip();
    holdVideoFrame();

    Pip.on('videoStopped', onVideoStopped);
    holdInterval = setInterval(holdVideoFrame, 100);

    try {
      Pip.videoStart(VIDEO_DIR + '/' + name, { x: 0, y: 0 });
    } catch (e) {
      stopVideo(false);
    }
  }

  function stopPlayback() {
    if (holdInterval) {
      clearInterval(holdInterval);
      holdInterval = null;
    }
    Pip.lastFlip = getTime();
    Pip.removeListener('videoStopped', onVideoStopped);
    try {
      Pip.videoStop();
    } catch (e) {}
    Pip.audioStop();
  }

  function stopVideo(userPressed) {
    if (!playing) return;
    playing = false;
    stopPlayback();
    if (userPressed) sound('TAB');
    drawAll();
  }

  start();

  return {
    remove: remove,
  };
});
