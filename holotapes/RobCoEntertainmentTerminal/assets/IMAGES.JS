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

  const IMAGE_DIR = 'IMAGES';
  const MAX_PATH = 56;
  const KNOB_DEBOUNCE_MS = 30;

  const SYM = { menu: '< ', image: '> ' };

  let removed = false;
  let viewing = false;
  let listItems = [];
  let images = [];
  let selectedIdx = 0;
  let scrollOffset = 0;
  let lastKnobTime = 0;

  function buildItems() {
    const items = [{ type: 'menu', label: 'BACK TO MENU' }];
    for (let i = 0; i < images.length; i++) {
      items.push({
        type: 'image',
        name: images[i],
        tooLong: isPathTooLong(images[i]),
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

  function closeImage() {
    if (!viewing) return;
    viewing = false;
    sound('TAB');
    app.gc();
    drawAll();
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

  function drawBinImage(path) {
    const file = E.openFile(path, 'r');
    const target = new Uint8Array(h.buffer);
    let offset = target.length;
    let chunk = file.read(256);
    while (chunk) {
      offset -= chunk.length;
      target.set(chunk, offset);
      chunk = file.read(256);
    }
    file.close();
    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawEmptyState() {
    const x = LIST_X + 4;
    let y = LIST_START_Y + ROW_H + 8;

    h.setColor(C_BRIGHT)
      .setFont('Monofonto16')
      .setFontAlign(-1, -1)
      .drawString('NO IMAGES FOUND', x, y);
    y += 34;

    h.setColor(C_MED).setFont('Monofonto14').setFontAlign(-1, -1);
    const lines = h.wrapString(
      'Add .JSON, .JS (1/2 bpp), or full-screen .BIN images to the IMAGES ' +
        'folder on the SD card. Keep image files under 30 KB or load will ' +
        'fail. Convert images at https://pip-boy.com/tools',
      LIST_W - 8,
    );
    for (let i = 0; i < lines.length; i++) {
      h.drawString(lines[i], x, y);
      y += 16;
    }
  }

  function drawError(name) {
    h.clear(0);
    h.setColor(C_BRIGHT)
      .setFontMonofonto23()
      .setFontAlign(0, 0)
      .drawString('UNABLE TO LOAD IMAGE', app.W / 2, app.H / 2 - 12);
    h.setColor(C_MED)
      .setFontMonofonto14()
      .setFontAlign(0, 0)
      .drawString(name, app.W / 2, app.H / 2 + 18);
    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawJsImage(path) {
    const image = eval(fs.readFileSync(path));
    const bpp = image.charCodeAt(2) & 0x1f;
    if (bpp !== 1 && bpp !== 2) {
      drawError('NEEDS 1 OR 2 BPP');
      return;
    }

    h.clear(0);
    h.drawImage(
      image,
      Math.round((app.W - image.charCodeAt(0)) / 2),
      Math.round((app.H - image.charCodeAt(1)) / 2),
    );
    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawJsonImage(path) {
    const data = JSON.parse(fs.readFileSync(path));
    const image = {
      bpp: data.bpp,
      buffer: E.toArrayBuffer(atob(data.buffer)),
      height: data.height,
      width: data.width,
    };
    if (data.transparent >= 0) {
      image.transparent = data.transparent;
    }
    if (data.palette) {
      image.palette = new Uint16Array(data.palette.length);
      for (let i = 0; i < data.palette.length; i++) {
        const c = data.palette[i] / 255;
        image.palette[i] = h.toColor(c, c, c);
      }
    }

    h.clear(0);
    h.drawImage(
      image,
      Math.round((app.W - data.width) / 2),
      Math.round((app.H - data.height) / 2),
    );
    h.flip();
    Pip.lastFlip = getTime();
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
      if (item.type === 'image' && item.tooLong) {
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

    if (!images.length) drawEmptyState();

    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawTitleBar() {
    h.setColor(C_BRIGHT)
      .setFontMonofonto16()
      .setFontAlign(-1, -1)
      .drawString(app.names[1], LIST_X + 6, LIST_TITLE_Y);

    const APP_VERSION = app.version;
    if (APP_VERSION) {
      const versionX = LIST_X + 6 + h.stringWidth(app.names[1]) + 4;
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

  function ensureImageDir() {
    if (isDirectory(IMAGE_DIR)) return;
    try {
      fs.mkdir('/' + IMAGE_DIR);
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

    if (item.type === 'image') {
      if (item.tooLong) return;
      openImage(item.name);
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

  function isPathTooLong(name) {
    return ('/' + IMAGE_DIR + '/' + name).length > MAX_PATH;
  }

  function label(item) {
    if (item.type === 'image') return item.name;
    return item.label || item.name || '';
  }

  function loadImages() {
    images = [];
    const entries = readDir(IMAGE_DIR);
    for (let i = 0; i < entries.length; i++) {
      const name = entries[i];
      const lower = name.toLowerCase();
      if (
        lower.slice(-3) === '.js' ||
        lower.slice(-5) === '.json' ||
        lower.slice(-4) === '.bin'
      )
        images.push(name);
    }
  }

  function onKnob1(dir) {
    if (removed) return;

    if (viewing) {
      if (!dir) closeImage();
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

  function openImage(name) {
    sound('TAB');
    viewing = true;
    const path = IMAGE_DIR + '/' + name;
    const lower = name.toLowerCase();
    app.gc();
    try {
      if (lower.slice(-4) === '.bin') {
        drawBinImage(path);
      } else if (lower.slice(-5) === '.json') {
        drawJsonImage(path);
      } else {
        drawJsImage(path);
      }
    } catch (e) {
      drawError(label({ type: 'image', name: name }));
    }
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
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
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
    ensureImageDir();
    loadImages();
    rebuildList();
    drawAll();
  }

  start();

  return {
    remove: remove,
  };
});
