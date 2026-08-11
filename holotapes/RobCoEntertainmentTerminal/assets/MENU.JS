// =============================================================================
//  Name: RobCo Entertainment Terminal
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app) {
  const C_DIM = 1;
  const C_MED = 2;
  const C_BRIGHT = 3;

  const ITEMS = [
    { label: 'MUSIC', desc: 'Play WAV playlists from MUSIC/', scene: 'MUSIC' },
    { label: 'VIDEOS', desc: 'Watch AVI clips from VIDEOS/', scene: 'VIDEO' },
    { label: 'IMAGES', desc: 'View images from IMAGES/', scene: 'IMAGES' },
  ];

  const ROW_H = 42;
  const LIST_Y = 86;

  let selected = 0;
  let items = ITEMS;

  function buildItems() {
    // Append a STOP RADIO row only while background audio is held, so the user
    // has an explicit way to fully stop it.
    if (Pip.radio && Pip.radio.mjOn) {
      return ITEMS.concat([
        {
          label: 'STOP RADIO',
          desc: 'Stop background music',
          stop: true,
        },
      ]);
    }
    return ITEMS;
  }

  function draw() {
    h.clear(1);

    try {
      Pip.renderHeader();
      Pip.renderFooter();
    } catch (e) {
      h.setColor(C_DIM)
        .drawLine(0, 39, app.W - 1, 39)
        .drawLine(0, app.H - 30, app.W - 1, app.H - 30);
    }

    h.setColor(C_BRIGHT)
      .setFontMonofonto16()
      .setFontAlign(-1, -1)
      .drawString(app.names[0], 18, 52);

    const APP_VERSION = app.version;
    if (APP_VERSION) {
      const versionX = 18 + h.stringWidth(app.names[0]) + 4;
      h.setColor(C_BRIGHT)
        .setFont('6x8')
        .setFontAlign(-1, -1)
        .drawString('v' + APP_VERSION, versionX, 60);
    }

    h.setColor(C_DIM).drawLine(12, 76, app.W - 12, 76);

    for (let i = 0; i < items.length; i++) drawRow(i);

    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawRow(i) {
    const y = LIST_Y + i * ROW_H;
    const on = i === selected;

    if (on) h.setColor(C_DIM).fillRect(14, y, app.W - 14, y + ROW_H - 6);

    h.setColor(on ? C_BRIGHT : C_MED)
      .setFontMonofonto18()
      .setFontAlign(-1, -1)
      .drawString(items[i].label, 26, y + 3);

    h.setColor(on ? C_BRIGHT : C_MED)
      .setFont('6x8')
      .setFontAlign(-1, -1)
      .drawString(items[i].desc, 26, y + 24);
  }

  function move(dir) {
    selected += dir > 0 ? 1 : -1;
    if (selected < 0) selected = 0;
    if (selected >= items.length) selected = items.length - 1;
    draw();
    sound('HIGHLIGHT');
  }

  function onKnob1(dir) {
    if (dir) move(dir);
    else select();
  }

  function onKnob2() {}

  function remove() {
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
  }

  function select() {
    const it = items[selected];

    if (it.stop) {
      if (Pip.rcetStop) {
        try {
          Pip.rcetStop();
        } catch (e) {}
      }
      items = buildItems();
      if (selected >= items.length) selected = items.length - 1;
      sound('TAB');
      draw();
      return;
    }

    sound('TAB');
    // Music persists across MUSIC/IMAGES; only VIDEO (its own audio)
    // stops the background music.
    if (Pip.radio && Pip.radio.mjOn && Pip.rcetStop && it.scene === 'VIDEO') {
      try {
        Pip.rcetStop();
      } catch (e) {}
    }
    app.go(app.scenes[it.scene]);
  }

  function sound(name) {
    try {
      if (Pip.playSound) Pip.playSound(name);
    } catch (e) {}
  }

  items = buildItems();
  // Keep background audio playing if we returned here with it held.
  if (!(Pip.radio && Pip.radio.mjOn)) Pip.audioStop();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  draw();

  return {
    remove: remove,
  };
});
