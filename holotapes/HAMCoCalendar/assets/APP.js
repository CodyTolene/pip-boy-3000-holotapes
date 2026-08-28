(function () {
  const W = h.getWidth(),
    H = h.getHeight();
  const fs = require('fs');
  const STORAGE_DIR = 'HOLO/CALENDAR';
  const FILE_PATH = 'HOLO/CALENDAR/TASKS.JSON';

  const deviceDate = new Date();
  let dYear = deviceDate.getFullYear();
  let dMonth = deviceDate.getMonth();
  let dDay = deviceDate.getDate();

  let viewStartMonth = (dMonth - 2 + 12) % 12;

  let tasks = {};
  let view = 'CALENDAR';
  let isTyping = false;
  let listScroller = null;
  let activeOverlay = null; // Tracks open keyboards/pickers for clean exits

  const monthFiles = [
    'jan.IMG',
    'feb.IMG',
    'mar.IMG',
    'april.IMG',
    'may.IMG',
    'june.IMG',
    'july.IMG',
    'aug.IMG',
    'sep.IMG',
    'oct.IMG',
    'nov.IMG',
    'dec.IMG',
  ];

  function initStorage() {
    if (fs.statSync('HOLO') === undefined) fs.mkdir('HOLO');
    if (fs.statSync(STORAGE_DIR) === undefined) fs.mkdir(STORAGE_DIR);
    if (fs.statSync(FILE_PATH) !== undefined) {
      try {
        tasks = JSON.parse(fs.readFileSync(FILE_PATH));
      } catch (e) {}
    }
  }

  function saveData() {
    fs.writeFileSync(FILE_PATH, JSON.stringify(tasks));
  }
  function getSelectedKey() {
    return dYear + '-' + dMonth + '-' + dDay;
  }

  function ensureVisible() {
    let dist = (dMonth - viewStartMonth + 12) % 12;
    if (dist > 4) {
      if (dist >= 6) {
        viewStartMonth = (dMonth - 4 + 12) % 12;
      } else {
        viewStartMonth = dMonth;
      }
    }
  }

  function openEditor() {
    let key = getSelectedKey();
    let startText = tasks[key] || '';

    // Track the keyboard overlay so we can kill it if the app closes unexpectedly[cite: 1, 2]
    activeOverlay = Pip.createKeyboard(
      startText,
      'ADD TASK OR NOTE',
      function (text) {
        activeOverlay.remove();
        activeOverlay = null;
        if (text.trim() === '') delete tasks[key];
        else tasks[key] = text;

        saveData();
        Pip.onExclusive('knob1', onKnob1);
        Pip.onExclusive('knob2', onKnob2);
        draw();
      },
    );
  }

  function openNotesList() {
    let listItems = Object.keys(tasks).map(function (key) {
      return { txt: tasks[key], rtxt: key };
    });

    if (listItems.length === 0) {
      listItems.push({ txt: 'No notes found in database.', rtxt: '' });
    }

    h.clearRect(0, 40, W, 285);

    listScroller = Pip.createScroller({
      items: listItems,
      width: 380,
      onClick: function (index) {
        Pip.playSound('SELECT');
        listScroller.remove();
        listScroller = null;
        Pip.onExclusive('knob1', onKnob1);
        Pip.onExclusive('knob2', onKnob2);
        draw();
      },
    });
  }

  function openDatePicker() {
    let jumpDate = new Date(dYear, dMonth, dDay);

    // Track the picker overlay so it doesn't leak memory[cite: 1, 2]
    activeOverlay = Pip.createDateTimePicker(
      jumpDate,
      true,
      'JUMP TO DATE',
      function (newDate) {
        activeOverlay.remove();
        activeOverlay = null;
        dYear = newDate.getFullYear();
        dMonth = newDate.getMonth();
        dDay = newDate.getDate();

        ensureVisible();
        Pip.onExclusive('knob1', onKnob1);
        Pip.onExclusive('knob2', onKnob2);
        draw();
      },
    );
  }

  function draw() {
    if (activeOverlay || listScroller) return;

    h.setColor(3).setFontMonofonto16().setFontAlign(0, -1);
    h.clearRect(0, 40, W, 285);

    if (view === 'CALENDAR') {
      h.drawString('HAMCo OFFICIAL CALENDAR - ' + dYear, W / 2, 45);
      h.drawLine(0, 65, W, 65);

      const spacing = 86;
      const startX = W / 2 - spacing * 2;

      for (let i = 0; i < 5; i++) {
        let targetMonth = (viewStartMonth + i) % 12;
        let xPos = startX + i * spacing;

        try {
          let imgData = fs.readFileSync(
            STORAGE_DIR + '/' + monthFiles[targetMonth],
          );
          h.setColor(targetMonth === dMonth ? 3 : 1);
          h.drawImage(imgData, xPos, 70);
        } catch (e) {}
      }

      const daysInMonth = new Date(dYear, dMonth + 1, 0).getDate();
      const startDay = new Date(dYear, dMonth, 1).getDay();
      const colW = 55,
        rowH = 23,
        startXGrid = 75,
        startYGrid = 145;
      let dayCount = 1;

      h.setFontAlign(0, 0);
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 && c < startDay) continue;
          if (dayCount > daysInMonth) break;

          let x = startXGrid + c * colW;
          let y = startYGrid + r * rowH + 8;
          let key = dYear + '-' + dMonth + '-' + dayCount;
          let hasTask = !!tasks[key];

          if (dayCount === dDay) {
            h.setColor(3);
            h.drawRect(x - 22, y - 11, x + 22, y + 11);
          }
          if (hasTask) {
            h.setColor(3);
            h.fillRect(x + 14, y - 10, x + 18, y - 6);
          }
          h.setColor(hasTask || dayCount === dDay ? 3 : 1);
          h.drawString(dayCount.toString(), x, y);
          dayCount++;
        }
      }
    } else if (view === 'LOGS') {
      h.drawString(
        'LOGS: ' + (dMonth + 1) + '/' + dDay + '/' + dYear,
        W / 2,
        45,
      );
      h.setFontAlign(1, -1).drawString('Scroll Knob 2: Back', W - 10, 45);
      h.drawLine(0, 65, W, 65);

      h.setFontAlign(-1, -1);
      let currentKey = getSelectedKey();
      let taskText =
        tasks[currentKey] || 'No logs entry found. Press Knob 1 to add.';

      if (!isTyping) {
        isTyping = true;
        // The typewriter effect is initialized here[cite: 9]
        Pip.typeText(taskText, 20, 75, W - 40, 200, 'Monofonto16').then(
          function () {
            isTyping = false;
          },
        );
      }
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  // Explicitly named function so the OS can safely detach it[cite: 1, 2]
  function onKnob1(dir, long) {
    if (isTyping || activeOverlay || listScroller) return;

    if (view === 'CALENDAR') {
      if (dir === 1) {
        dDay++;
        let maxD = new Date(dYear, dMonth + 1, 0).getDate();
        if (dDay > maxD) {
          dDay = 1;
          dMonth++;
          if (dMonth > 11) {
            dMonth = 0;
            dYear++;
          }
          ensureVisible();
        }
        Pip.playSound('SCROLL');
        draw();
      } else if (dir === -1) {
        dDay--;
        if (dDay < 1) {
          dMonth--;
          if (dMonth < 0) {
            dMonth = 11;
            dYear--;
          }
          dDay = new Date(dYear, dMonth + 1, 0).getDate();
          ensureVisible();
        }
        Pip.playSound('SCROLL');
        draw();
      } else if (dir === 0) {
        Pip.playSound('SELECT');
        if (long) openNotesList();
        else {
          view = 'LOGS';
          draw();
        }
      }
    } else if (view === 'LOGS') {
      if (dir === 0) {
        Pip.playSound('SELECT');
        if (long) {
          view = 'CALENDAR';
          isTyping = false;
          draw();
        } else openEditor();
      }
    }
  }

  // Explicitly named function so the OS can safely detach it[cite: 1, 2]
  function onKnob2(dir) {
    if (isTyping || activeOverlay || listScroller) return;

    if (view === 'CALENDAR') {
      if (dir === 1) {
        dMonth++;
        if (dMonth > 11) {
          dMonth = 0;
          dYear++;
        }
        dDay = 1;
        ensureVisible();
        Pip.playSound('SCROLL');
        draw();
      } else if (dir === -1) {
        dMonth--;
        if (dMonth < 0) {
          dMonth = 11;
          dYear--;
        }
        dDay = 1;
        ensureVisible();
        Pip.playSound('SCROLL');
        draw();
      }
    } else if (view === 'LOGS') {
      if (dir !== 0) {
        Pip.playSound('TAB');
        view = 'CALENDAR';
        isTyping = false;
        draw();
      }
    }
  }

  initStorage();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);

  if (Pip.renderHeader) Pip.renderHeader();
  if (Pip.renderFooter) Pip.renderFooter();
  draw();

  return {
    id: 'hamcocalendar',
    remove: function () {
      // CLEAR ALL OVERLAYS: Prevents keyboard/scroller memory leaks[cite: 1, 2]
      if (listScroller) listScroller.remove();
      if (activeOverlay) activeOverlay.remove();

      // CLEAR ALL LISTENERS: Detaches the exact hardware functions[cite: 1, 2]
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);

      // KILL TYPEWRITER TIMEOUT: Stops the text effect from bleeding over the OS[cite: 4]
      if (Pip.timers && Pip.timers.typeText) {
        clearTimeout(Pip.timers.typeText);
      }

      tasks = null;
      h.clear();
    },
  };
});
