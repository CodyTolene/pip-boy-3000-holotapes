(function () {
  // --- VIDEO PLAYLIST ---
  const videoList = [
    // --- ADD VIDEOS HERE ---
  ];

  let redrawInterval;
  let removed = false;

  const VISIBLE_COUNT = 7;

  const state = {
    phase: 'WAITING', // "WAITING" or "LIST"
    selectedIndex: 0,
    windowStart: 0,
  };

  function mark() {
    if (Pip.playSound) Pip.playSound('TAB');
    draw();
  }

  function draw() {
    h.clear(1);

    h.setColor(3).setFontMonofonto28().setFontAlign(0, 0);
    h.drawString('PipVideoController', 240, 30);

    h.drawLine(0, 50, 480, 50);

    if (state.phase === 'WAITING') {
      h.setFontMonofonto18().setFontAlign(0, 0);
      h.drawString('SYSTEM READY', 240, 110);
      h.drawString('PRESS SELECT TO SYNC', 240, 140);
    } else if (state.phase === 'LIST') {
      h.setFontMonofonto18().setFontAlign(-1, -1);

      if (state.windowStart > 0) {
        h.drawString('▲ More Videos Above', 40, 60);
      }

      for (let i = 0; i < VISIBLE_COUNT; i++) {
        let itemIndex = state.windowStart + i;
        if (itemIndex >= videoList.length) break;

        let v = videoList[itemIndex];

        let y = state.windowStart > 0 ? 85 + i * 26 : 70 + i * 26;

        if (itemIndex === state.selectedIndex) {
          h.drawString('> [ ' + v.name + ' ]', 25, y);
        } else {
          h.drawString('  ' + v.name, 25, y);
        }
      }

      if (state.windowStart + VISIBLE_COUNT < videoList.length) {
        h.drawString('▼ More Videos Below', 40, 270);
      }
    }
  }

  function onLeftWheel(dir) {
    if (dir === 0) {
      if (state.phase === 'WAITING') {
        USB.print('START_SELECT\n');
        state.phase = 'LIST';
        mark();
      } else if (state.phase === 'LIST') {
        let path = videoList[state.selectedIndex].path;
        USB.print('PLAY:' + path + '\n');

        h.clear(1);
        h.setColor(3).setFontMonofonto18().setFontAlign(0, 0);
        h.drawString('PLAYING...', 240, 136);
        h.flip();

        setTimeout(function () {
          draw();
        }, 1500);
      }
    } else if (state.phase === 'LIST') {
      if (dir < 0 && state.selectedIndex > 0) {
        state.selectedIndex--;

        if (state.selectedIndex < state.windowStart) {
          state.windowStart = state.selectedIndex;
        }
        mark();
      } else if (dir > 0 && state.selectedIndex < videoList.length - 1) {
        state.selectedIndex++;

        if (state.selectedIndex >= state.windowStart + VISIBLE_COUNT) {
          state.windowStart = state.selectedIndex - VISIBLE_COUNT + 1;
        }
        mark();
      }
    }
  }

  Pip.onExclusive('knob1', onLeftWheel);

  draw();
  redrawInterval = setInterval(draw, 1000);

  return {
    id: 'PIPVIDEOCONTROLLER',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      if (removed) return;
      removed = true;

      if (redrawInterval) clearInterval(redrawInterval);
      Pip.removeListener('knob1', onLeftWheel);
    },
  };
});
