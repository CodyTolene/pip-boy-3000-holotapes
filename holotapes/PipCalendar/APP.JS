(function () {
  const APP_ID = 'pipcalendar';
  const W = h.getWidth();
  const H = h.getHeight();
  const dateImage = fs.readFileSync('HOLO/PIPCALENDAR/DAYS.IMG');
  const robco = fs.readFileSync('HOLO/PIPCALENDAR/ROBCO.IMG');

  let redrawInterval;
  let calTimer;
  let dateTimer;
  let keyboardTimer;
  let errorTimer;

  let removed = false;
  let leftWheelPressWatch;

  let selectedDate = { year: '', month: '', day: '' };
  let daysInMonth;
  let startingDate;

  let notes = [];

  let monthObject;
  let keyboardInstance;

  let mode = 0;
  let selectedNote = 0;
  let deleteNoteCounter = 0;

  let frameMode = true;
  let keyboardActive = false;

  const notesAmount = 5;
  const maxNotesAmount = 10;

  const calendarPos = { x: 212, y: 45, w: 472, h: 305 };
  const months = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ];

  //the functions for each mode for the left wheel
  const leftWheelFunctions = {
    0: (dir) => {
      dateDraw(0);
      selectedDate.day += dir * 7;
      if (selectedDate.day < 1) {
        selectedDate.day = 35 - Math.abs(selectedDate.day);
        if (selectedDate.day > daysInMonth) selectedDate.day -= 7;
      } else if (selectedDate.day > daysInMonth) {
        ((selectedDate.day = 0 + (selectedDate.day % 7)), 1);
        if (selectedDate.day == 0) selectedDate.day = 7;
      }
      frameMode = 1;
      dateDraw(frameMode);
      Pip.playSound('SCROLL');

      if (dateTimer) clearTimeout(dateTimer);
      dateTimer = setTimeout(() => {
        notes = [];
        if (monthObject.hasOwnProperty(selectedDate.day)) readDay();
        noteTextDraw();
        clearTimeout(dateTimer);
      }, 350);
    },
    1: (dir) => {
      if (dir === 1) {
        mode = 3;
        frameReset();
        Pip.playSound('SCROLL');
      }
    },
    2: (dir) => {
      selectedDate.year = Math.max(1, (selectedDate.year -= dir));

      if (calTimer) clearTimeout(calTimer);
      calTimer = setTimeout(() => {
        notes = [];
        readNotesFile();
        noteTextDraw();
        getCalDates();
      }, 500);
      textDraw(frameMode);
      Pip.playSound('SCROLL');
    },
    3: (dir) => {
      if (dir < 0 && selectedNote === 0) {
        mode = 1;
      } else {
        selectedNote = Math.min(maxNotesAmount - 1, (selectedNote += dir));

        if (dir > 0 && selectedNote % notesAmount === 0) noteTextDraw();
        else if (dir < 0 && selectedNote % notesAmount === notesAmount - 1)
          noteTextDraw();
      }
      deleteNoteCounter = 0;
      frameReset();
      Pip.playSound('SCROLL');
    },
  };

  //the functions for each mode for the right wheel
  const rightWheelFunctions = {
    0: (dir) => {
      dateDraw(0);
      selectedDate.day += dir;
      if (selectedDate.day < 1) selectedDate.day = daysInMonth;
      else if (selectedDate.day > daysInMonth) selectedDate.day = 1;
      frameMode = 1;
      dateDraw(frameMode);
      Pip.playSound('SCROLL');

      if (dateTimer) clearTimeout(dateTimer);
      dateTimer = setTimeout(() => {
        notes = [];
        if (monthObject.hasOwnProperty(selectedDate.day)) readDay();
        noteTextDraw();
        clearTimeout(dateTimer);
      }, 350);
    },
    1: (dir) => {
      deleteNoteCounter++;
      if (deleteNoteCounter === 10) {
        notes = {};
        writeNotesFile();
        frameReset();
        noteTextDraw();
        Pip.playSound('TAB');
        deleteNoteCounter = 0;
      } else Pip.playSound('SCROLL');
    },
    2: (dir) => {
      selectedDate.month += dir;
      if (selectedDate.month > 11) selectedDate.month = 0;
      else if (selectedDate.month < 0) selectedDate.month = 11;

      if (calTimer) clearTimeout(calTimer);
      calTimer = setTimeout(() => {
        notes = [];
        readNotesFile();
        noteTextDraw();
        getCalDates();
      }, 500);
      textDraw(frameMode);
      Pip.playSound('SCROLL');
    },
    3: (dir) => {
      deleteNoteCounter++;
      if (deleteNoteCounter === 5) {
        if (notes[selectedNote]) {
          notes.splice(selectedNote, 1);
          writeNotesFile();
          calDraw();
          noteTextDraw();
        }
        Pip.playSound('TAB');
        deleteNoteCounter = 0;
      } else Pip.playSound('SCROLL');
    },
  };

  function getNotePos(x) {
    return { x: 13, y: 11 + 56 * (x % notesAmount) };
  }

  function readDay() {
    for (let i = 0; i < maxNotesAmount; i++)
      notes[i] = monthObject[selectedDate.day][i];
  }

  function readNotesFile(readNotes) {
    let notesObject;
    if (readNotes) notesObject = readNotes;
    else {
      try {
        notesObject = JSON.parse(
          fs.readFileSync('HOLO/PIPCALENDAR/NOTES.json'),
        );
      } catch (e) {
        fs.writeFileSync('HOLO/PIPCALENDAR/NOTES.json', '{}');
        notesObject = JSON.parse(
          fs.readFileSync('HOLO/PIPCALENDAR/NOTES.json'),
        );
      }
    }
    monthObject = null;

    if (notesObject.hasOwnProperty(selectedDate.year)) {
      if (notesObject[selectedDate.year].hasOwnProperty(selectedDate.month)) {
        monthObject = notesObject[selectedDate.year][selectedDate.month];
        if (monthObject.hasOwnProperty(selectedDate.day)) readDay();
      }
    }
  }

  //For writing to the notes.json file.
  function writeNotesFile() {
    let notesObject = JSON.parse(
      fs.readFileSync('HOLO/PIPCALENDAR/NOTES.json'),
    );

    let year;
    let month;
    let day = {};

    if (!notesObject[selectedDate.year]) year = {};
    else year = notesObject[selectedDate.year];

    if (!year[selectedDate.month]) month = {};
    else month = year[selectedDate.month];

    for (let i = 0; i < notes.length; i++) {
      if (notes[i]) day[i] = notes[i];
    }

    // checks for any unused dates and clears them.
    if (Object.keys(day).length !== 0) month[selectedDate.day] = day;
    else if (month[selectedDate.day]) delete month[selectedDate.day];

    if (Object.keys(month).length !== 0) year[selectedDate.month] = month;
    else if (year[selectedDate.month]) delete year[selectedDate.month];

    if (Object.keys(year).length !== 0) notesObject[selectedDate.year] = year;
    else if (notesObject[selectedDate.year])
      delete notesObject[selectedDate.year];

    fs.writeFileSync(
      'HOLO/PIPCALENDAR/NOTES.json',
      JSON.stringify(notesObject),
    );
    readNotesFile(notesObject);
  }

  //handles the note writing
  function writeNote() {
    if (redrawInterval) clearInterval(redrawInterval);
    keyboardActive = true;
    Pip.removeListener('knob1', onLeftWheel);
    Pip.removeListener('knob2', onRightWheel);

    keyboardTimer = setTimeout(() => {
      const file = fs.statSync('HOLO/PIPCALENDAR/NOTES.json');
      if (file.size <= 3500) {
        keyboardInstance = Pip.createKeyboard(
          '',
          'NOTE ' + (selectedNote + 1),
          (c) => {
            keyboardInstance.remove();
            if (c !== '') {
              notes[selectedNote] = c;
              writeNotesFile();
            }
            h.clear();
            firstdraw();
            calDraw();
            noteTextDraw();
            redrawInterval = setInterval(frameDraw, 500);
            Pip.onExclusive('knob1', onLeftWheel);
            Pip.onExclusive('knob2', onRightWheel);
            keyboardActive = false;
            clearTimeout(keyboardTimer);
          },
        );
      }

      //if file size is too large
      else {
        h.clear();
        h.setFontMonofonto18()
          .setFontAlign(-1, -1)
          .drawString('File size too large. Please delete past data.', 20, 20);

        errorTimer = setTimeout(() => {
          h.clear();
          firstdraw();
          calDraw();
          noteTextDraw();
          redrawInterval = setInterval(frameDraw, 500);
          Pip.onExclusive('knob1', onLeftWheel);
          Pip.onExclusive('knob2', onRightWheel);
          keyboardActive = false;
          clearTimeout(keyboardTimer);
          clearTimeout(errorTimer);
        }, 3000);
      }
    }, 250);
  }

  //draws the blinking lines for when in note mode
  function noteLinesDraw(c) {
    if (c)
      h.fillRect(10, 0, 12, 320).fillRect(
        calendarPos.x - 6,
        0,
        calendarPos.x - 4,
        320,
      );
    else
      h.clearRect(10, 0, 12, 320).clearRect(
        calendarPos.x - 6,
        0,
        calendarPos.x - 4,
        320,
      );
  }

  //draws the small blinking lines for the note selection
  function noteSelectionDraw(c, i) {
    const pos = getNotePos(i);
    if (c)
      h.fillRect(pos.x + 2, pos.y + 4, pos.x + 4, pos.y + 50).fillRect(
        pos.x + 188,
        pos.y + 4,
        pos.x + 190,
        pos.y + 50,
      );
    else
      h.clearRect(pos.x + 2, pos.y + 4, pos.x + 4, pos.y + 50).clearRect(
        pos.x + 188,
        pos.y + 4,
        pos.x + 190,
        pos.y + 50,
      );
  }

  //draws the text for every note
  function noteTextDraw() {
    for (i = 0; i < notesAmount; i++) {
      const pos = getNotePos(i);
      h.clearRect(pos.x + 5, pos.y + 4, 200, pos.y + 46);

      if (
        notes[Math.floor(selectedNote / notesAmount) * notesAmount + i] != null
      ) {
        const wrapped = h
          .setFontMonofonto18()
          .wrapString(
            notes[Math.floor(selectedNote / notesAmount) * notesAmount + i],
            180,
          );
        for (let x = 0; x < wrapped.length; x++)
          h.setColor(3)
            .setFontAlign(-1, -1)
            .drawString(wrapped[x], pos.x + 6, pos.y + 4 + 20 * x);
      }
    }
  }

  function firstdraw() {
    h.drawImage(dateImage, calendarPos.x + 3, calendarPos.y + 32, 0);
    h.drawImage(robco, 93, 293, 0);
    h.drawRect(
      calendarPos.x + 2,
      calendarPos.y + 2,
      calendarPos.w - 2,
      calendarPos.h - 2,
    );
    h.drawRect(
      calendarPos.x + 1,
      calendarPos.y + 1,
      calendarPos.w - 1,
      calendarPos.h - 1,
    );
    h.drawRect(calendarPos.x, calendarPos.y, calendarPos.w, calendarPos.h);
    noteLinesDraw(1);

    //draws calendar date lines
    for (let vLine = 0; vLine < 6; vLine++)
      h.fillRect(
        calendarPos.x + 36 + 37 * vLine,
        calendarPos.y + 46,
        calendarPos.x + 39 + 37 * vLine,
        calendarPos.y + 221,
      );
    for (let hLine = 0; hLine < 5; hLine++)
      h.fillRect(
        calendarPos.x + 3,
        calendarPos.y + 78 + 36 * hLine,
        calendarPos.x + 257,
        calendarPos.y + 81 + 36 * hLine,
      );
    h.fillRect(
      calendarPos.x + 36,
      calendarPos.y + 226,
      calendarPos.x + 39,
      calendarPos.y + 257,
    ).fillRect(
      calendarPos.x + 73,
      calendarPos.y + 226,
      calendarPos.x + 76,
      calendarPos.y + 257,
    );
    /////////////////////////

    //draws note lines
    for (let i = 0; i < notesAmount; i++) {
      const notePos = getNotePos(i);
      h.fillRect(notePos.x, notePos.y, notePos.x + 192, notePos.y + 1).fillRect(
        notePos.x,
        notePos.y + 53,
        notePos.x + 192,
        notePos.y + 54,
      );
    }

    h.setFontMonofonto14().setFontAlign(-1, -1).drawString(1, 15, 291);

    textDraw(1);
    frameDraw(0);

    noteTextDraw();
  }

  //draws a given calendar date
  function dateDraw(c, date) {
    'ram';
    if (!date) date = selectedDate.day;
    const drawposition = {
      x: calendarPos.x + 3 + 37 * ((startingDate + date - 1) % 7),
      y: calendarPos.y + 46 + 36 * Math.floor((startingDate + date - 1) / 7),
    };
    if (c) {
      h.fillRect(
        drawposition.x,
        drawposition.y,
        drawposition.x + 32,
        drawposition.y + 31,
      );
      h.setColor(0)
        .setFontAlign(-1, -1)
        .setFontMonofonto14()
        .drawString(date, drawposition.x + 1, drawposition.y + 1);
      if (monthObject.hasOwnProperty(date))
        h.fillRect(
          drawposition.x + 26,
          drawposition.y + 1,
          drawposition.x + 30,
          drawposition.y + 30,
        );
      h.setColor(3);
    } else {
      h.clearRect(
        drawposition.x,
        drawposition.y,
        drawposition.x + 32,
        drawposition.y + 31,
      );
      h.setColor(3)
        .setFontAlign(-1, -1)
        .setFontMonofonto14()
        .drawString(date, drawposition.x + 1, drawposition.y + 1);
      if (monthObject.hasOwnProperty(date))
        h.fillRect(
          drawposition.x + 26,
          drawposition.y + 1,
          drawposition.x + 30,
          drawposition.y + 30,
        );
    }
  }

  //redraws every calendar date
  function calDraw() {
    const drawposition = { x: calendarPos.x + 4, y: calendarPos.y + 47 };
    for (let u = 0; u < 37; u++) {
      h.clearRect(
        drawposition.x - 1 + 37 * (u % 7),
        drawposition.y - 1 + 36 * Math.floor(u / 7),
        drawposition.x - 1 + 37 * (u % 7) + 32,
        drawposition.y - 1 + 36 * Math.floor(u / 7) + 31,
      );
    }

    for (let i = 0; i <= daysInMonth; i++) dateDraw(0, i);

    dateDraw(1);
  }

  //draws month and year text
  function textDraw(c) {
    h.clearRect(211, 1, 471, 43);
    h.clearRect(251, 50, 431, 75);

    if (!c) {
      h.setFontMonofonto28()
        .setFontAlign(0, 0)
        .drawString(
          '< ' + selectedDate.year + ' >',
          calendarPos.x + (calendarPos.w - calendarPos.x) / 2,
          calendarPos.y - 19,
        );
      h.setFontMonofonto23()
        .setFontAlign(0, 0)
        .drawString(
          '< ' + months[selectedDate.month] + ' >',
          calendarPos.x + (calendarPos.w - calendarPos.x) / 2,
          calendarPos.y + 19,
        );
    } else {
      h.setFontMonofonto28()
        .setFontAlign(0, 0)
        .drawString(
          selectedDate.year,
          calendarPos.x + (calendarPos.w - calendarPos.x) / 2,
          calendarPos.y - 19,
        );
      h.setFontMonofonto23()
        .setFontAlign(0, 0)
        .drawString(
          months[selectedDate.month],
          calendarPos.x + (calendarPos.w - calendarPos.x) / 2,
          calendarPos.y + 19,
        );
    }
  }

  //resets the image when switching modes
  function frameReset() {
    dateDraw(1);
    textDraw(1);
    h.drawLine(10, 0, 10, 320);
    noteLinesDraw(1);
    for (let i = 0; i < maxNotesAmount; i++) noteSelectionDraw(0, i);

    frameMode = false;
    if (mode === 0) dateDraw(frameMode);
    else if (mode === 2) textDraw(frameMode);
    else if (mode === 1) noteLinesDraw(0);
    else {
      const notePos = getNotePos(selectedNote);
      noteSelectionDraw(1, selectedNote);
      h.clearRect(15, 291, 45, 320)
        .setFontMonofonto14()
        .setFontAlign(-1, -1)
        .drawString(
          Math.floor((selectedNote + notesAmount) / notesAmount),
          15,
          291,
        );
    }

    changeInterval(redrawInterval, 500);
  }

  //frame draw called every half-second
  function frameDraw() {
    h.clearRect(289, 272, 467, 301);
    const d = new Date();
    h.setFontMonofonto18()
      .setFontAlign(0, 0)
      .drawString(
        d.getDate() +
          '/' +
          (d.getMonth() + 1) +
          '/' +
          d.getFullYear() +
          ' | ' +
          d.getHours() +
          ':' +
          (d.getMinutes() < 10 ? '0' : '') +
          d.getMinutes(),
        calendarPos.x + 167,
        calendarPos.y + 242,
      );

    if (mode === 0) dateDraw(frameMode);
    else if (mode === 1) {
      if (frameMode)
        h.fillRect(10, 0, 12, 320)
          .fillRect(calendarPos.x - 6, 0, calendarPos.x - 4, 320)
          .setColor(3);
      else
        h.setColor(0)
          .fillRect(10, 0, 12, 320)
          .fillRect(calendarPos.x - 6, 0, calendarPos.x - 4, 320)
          .setColor(3);
    } else if (mode === 2) textDraw(frameMode);
    else noteSelectionDraw(frameMode, selectedNote);
    frameMode = !frameMode;
  }

  //gets the proper calendar dates for the month
  function getCalDates() {
    switch (selectedDate.month) {
      case 0:
        daysInMonth = 31;
        break;
      case 1:
        if (
          selectedDate.year % 4 === 0 &&
          (selectedDate.year % 100 !== 0 || selectedDate.year % 400 === 0)
        )
          daysInMonth = 29;
        else daysInMonth = 28;
        break;
      case 2:
        daysInMonth = 31;
        break;
      case 3:
        daysInMonth = 30;
        break;
      case 4:
        daysInMonth = 31;
        break;
      case 5:
        daysInMonth = 30;
        break;
      case 6:
        daysInMonth = 31;
        break;
      case 7:
        daysInMonth = 31;
        break;
      case 8:
        daysInMonth = 30;
        break;
      case 9:
        daysInMonth = 31;
        break;
      case 10:
        daysInMonth = 30;
        break;
      case 11:
        daysInMonth = 31;
        break;
    }

    const m = selectedDate.month + 1;
    const K = selectedDate.year % 100; // Year of the century
    const J = Math.floor(selectedDate.year / 100); // Zero-based century

    // 2. Apply Zeller's Congruence formula
    const h =
      1 +
      Math.floor((13 * (m + 1)) / 5) +
      K +
      Math.floor(K / 4) +
      Math.floor(J / 4) -
      2 * J;
    //credit: Google AI.

    startingDate = (((h % 7) + 7) % 7) - 1;
    if (startingDate < 0) startingDate = 6;

    if (selectedDate.day > daysInMonth) {
      selectedDate.day = 1;
    }

    calDraw();
  }

  function onLeftWheel(dir) {
    if (dir !== 0) leftWheelFunctions[mode](dir);
  }

  function onRightWheel(dir) {
    if (dir !== 0) rightWheelFunctions[mode](dir);
  }

  function onLeftWheelPress() {
    if (!keyboardActive) {
      if (mode < 3) {
        mode++;
        if (mode === 3) mode = 0;
        frameReset();
        deleteNoteCounter = 0;
      } else writeNote();
      Pip.playSound('SELECT');
    }
  }

  function start() {
    h.clear();
    Pip.audioStop();

    const d = new Date();
    selectedDate.year = d.getFullYear();
    selectedDate.month = d.getMonth();
    selectedDate.day = d.getDate();

    readNotesFile();

    Pip.onExclusive('knob1', onLeftWheel);
    Pip.onExclusive('knob2', onRightWheel);

    if (typeof ENC1_PRESS !== 'undefined') {
      leftWheelPressWatch = setWatch(onLeftWheelPress, ENC1_PRESS, {
        repeat: true,
        edge: 'rising',
        debounce: 50,
      });
    }

    firstdraw();
    getCalDates();
    redrawInterval = setInterval(frameDraw, 500);
  }

  start();

  return {
    id: APP_ID,
    notDefault: true,
    fullscreen: true,

    remove: function () {
      if (removed) return;
      removed = true;

      if (redrawInterval) clearInterval(redrawInterval);
      if (calTimer) clearTimeout(calTimer);
      if (dateTimer) clearTimeout(dateTimer);
      if (keyboardTimer) clearTimeout(keyboardTimer);
      if (errorTimer) clearTimeout(errorTimer);
      if (leftWheelPressWatch) clearWatch(leftWheelPressWatch);
      if (keyboardInstance) keyboardInstance.remove();

      Pip.removeListener('knob1', onLeftWheel);
      Pip.removeListener('knob2', onRightWheel);

      Pip.audioStop();
      h.clear();
      h.flip();
    },
  };
});
