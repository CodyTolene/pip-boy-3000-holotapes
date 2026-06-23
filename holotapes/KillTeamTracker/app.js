// =============================================================================
//  Name: 3-Stat Table Tracker
//  Author: Custom Build for Pip-Boy Environment
// =============================================================================

(function () {
  const C = {
    APP_NAME: 'Kill Team Tracker',
    APP_VERSION: '1.0.0',
    KNOB_DEBOUNCE: 10,
    SHOW_MENU_BOUNDARIES: true,
  };

  const MENU_MAIN_OPTIONS = ['Start Tracking', 'Help', 'Exit'];
  const MENU_INGAME_OPTIONS = ['Resume', 'Reset Stats', 'Exit Tracker'];
  const HELP_TEXT =
    'Controls:\n  Knob 1 Scroll: Cycle Stats\n  Knob 2 Scroll: Change Value\n  Knob 1 Click: Menu';

  let menuDisplayed = 'main';
  let menuIndexSelected = 0;
  let inGame = false;

  // Updated to 3 custom game values
  const DEFAULT_STATS = [
    { name: 'Turning Point', defaultVal: 1, min: 1, max: 4 },
    { name: 'Command Points', defaultVal: 3, min: 0, max: 99 },
    { name: 'Victory Points', defaultVal: 0, min: 0, max: 99 },
  ];
  let currentStats = [];
  let activeStatIndex = 0;

  // Screen layout definitions
  const W = h.getWidth();
  const H = h.getHeight();

  const SCREEN_XY = { x1: 60, y1: 40, x2: W - 60, y2: H - 20 };
  const TITLE_XY = {
    x1: SCREEN_XY.x1,
    y1: 10,
    x2: SCREEN_XY.x2,
    y2: SCREEN_XY.y2,
  };
  const MENU_HEADER_XY = {
    x1: SCREEN_XY.x1 + 10,
    y1: SCREEN_XY.y1 + 10,
    x2: SCREEN_XY.x2 - 10,
    y2: SCREEN_XY.y1 + 35,
  };
  const MENU_XY = {
    x1: MENU_HEADER_XY.x1,
    y1: MENU_HEADER_XY.y2 + 5,
    x2: MENU_HEADER_XY.x2,
    y2: SCREEN_XY.y2 - 20,
  };

  // Calculate 2/3 and 1/3 vertical splits for the layout
  const TOTAL_TRACKER_HEIGHT = SCREEN_XY.y2 - SCREEN_XY.y1;
  const TWO_THIRDS_HEIGHT = Math.floor((TOTAL_TRACKER_HEIGHT / 3) * 2);

  const ACTIVE_XY = {
    x1: SCREEN_XY.x1,
    y1: SCREEN_XY.y1,
    x2: SCREEN_XY.x2,
    y2: SCREEN_XY.y1 + TWO_THIRDS_HEIGHT,
  };
  const TABLE_XY = {
    x1: SCREEN_XY.x1,
    y1: ACTIVE_XY.y2,
    x2: SCREEN_XY.x2,
    y2: SCREEN_XY.y2,
  };

  // Runtime state
  let lastLeftKnobTime = 0;
  let originalIdleTimeout = Pip.settings.idleTimeout;

  function clearScreenArea(area) {
    h.clearRect(area.x1, area.y1, area.x2, area.y2);
  }

  function drawBoundaries(area) {
    h.drawRect(area.x1, area.y1, area.x2, area.y2);
  }

  function drawMenuBoundaries() {
    if (C.SHOW_MENU_BOUNDARIES === false) return;
    drawBoundaries(SCREEN_XY);
    drawBoundaries(MENU_HEADER_XY);
    drawBoundaries(MENU_XY);
  }

  function drawAppTitleAndVersion() {
    const appName = C.APP_NAME.toUpperCase();
    const appVersion = 'v' + C.APP_VERSION;
    const padding = 70;
    const titleWidth = h.stringWidth(appName);

    h.setFontAlign(-1, -1, 0)
      .setFontMonofonto23()
      .drawString(appName, TITLE_XY.x1, TITLE_XY.y1);

    h.setFontAlign(-1, -1, 0)
      .setFont('4x6', 2)
      .drawString(
        appVersion,
        TITLE_XY.x1 + titleWidth + padding,
        TITLE_XY.y1 + 14,
      );
  }

  function drawMenuHeader(text) {
    clearScreenArea(MENU_HEADER_XY);
    const padding = 5;
    h.setFontAlign(-1, -1, 0)
      .setFontMonofonto16()
      .drawString(
        text.toUpperCase(),
        MENU_HEADER_XY.x1 + padding,
        MENU_HEADER_XY.y1 + padding,
      );
  }

  function drawMenu(menuOptions) {
    clearScreenArea(MENU_XY);
    h.setFontMonofonto16().setFontAlign(-1, -1, 0);

    const padding = 5;
    const rowHeight = 25;

    menuOptions.forEach((option, index) => {
      const y = MENU_XY.y1 + index * rowHeight + padding;
      const y2 = y + rowHeight;
      h.drawString(option, MENU_XY.x1 + padding, y);

      if (index === menuIndexSelected) {
        Pip.shadeBox(MENU_XY.x1, y - padding, MENU_XY.x2, y2 - padding);
      }
    });

    drawMenuBoundaries();
  }

  function drawMenuHelp() {
    menuIndexSelected = 0;
    drawMenuHeader('Help');
    clearScreenArea(MENU_XY);
    h.setFontMonofonto16().setFontAlign(-1, -1, 0);

    const padding = 5;
    const rowHeight = 20;

    const helpTextLines = HELP_TEXT.split('\n');
    helpTextLines.forEach((line, index) => {
      const y = MENU_XY.y1 + index * rowHeight + padding;
      h.drawString(line, MENU_XY.x1 + padding, y);
    });

    const backY = MENU_XY.y2 - rowHeight - padding;
    h.drawString('Back', MENU_XY.x1 + padding, backY);
    Pip.shadeBox(MENU_XY.x1, backY - padding, MENU_XY.x2, backY + rowHeight);

    drawMenuBoundaries();
  }

  function drawTrackerBoard() {
    clearScreenArea(SCREEN_XY);

    // 1. Draw Active Stat (Top 2/3rds)
    const activeStat = currentStats[activeStatIndex];
    h.setFontMonofonto28().setFontAlign(0, 0, 0); // Center text alignment
    const activeX = (ACTIVE_XY.x1 + ACTIVE_XY.x2) / 2;
    const activeY = (ACTIVE_XY.y1 + ACTIVE_XY.y2) / 2;

    const activeText = `< ${activeStat.name}: ${activeStat.value} >`;
    h.drawString(activeText, activeX, activeY);
    Pip.shadeBox(ACTIVE_XY.x1, ACTIVE_XY.y1, ACTIVE_XY.x2, ACTIVE_XY.y2);

    // 2. Draw Table Rows for Inactive Stats (Bottom 1/3rd)
    h.setFontMonofonto16().setFontAlign(-1, -1, 0);
    const tableHeight = TABLE_XY.y2 - TABLE_XY.y1;
    const rowHeight = Math.floor(tableHeight / 2);
    const textPaddingX = 15;
    const textPaddingY = 4;

    let rowIndex = 0;
    for (let i = 0; i < currentStats.length; i++) {
      if (i === activeStatIndex) continue; // Skip rendering the active one in the table

      const stat = currentStats[i];
      const rowY1 = TABLE_XY.y1 + rowIndex * rowHeight;

      // Print stat name on the left, value on the right
      h.drawString(stat.name, TABLE_XY.x1 + textPaddingX, rowY1 + textPaddingY);

      // Right align the values manually relative to screen width boundaries
      const totalString = '' + stat.value;
      const strWidth = h.stringWidth(totalString);
      h.drawString(
        totalString,
        TABLE_XY.x2 - textPaddingX - strWidth,
        rowY1 + textPaddingY,
      );

      rowIndex++;
    }

    if (C.SHOW_MENU_BOUNDARIES) {
      drawBoundaries(SCREEN_XY);
      drawBoundaries(ACTIVE_XY);
      // Draw the horizontal line separating the two table rows
      h.drawLine(
        TABLE_XY.x1,
        TABLE_XY.y1 + rowHeight,
        TABLE_XY.x2,
        TABLE_XY.y1 + rowHeight,
      );
    }
  }

  function menuLoad(menuOptions, menuHeader) {
    menuIndexSelected = 0;
    drawMenuHeader(menuHeader);
    drawMenu(menuOptions);
  }

  function menuScroll(dir) {
    const prevIndex = menuIndexSelected;
    let maxLen = 0;

    switch (menuDisplayed) {
      case 'main':
        maxLen = MENU_MAIN_OPTIONS.length - 1;
        break;
      case 'inGameOptions':
        maxLen = MENU_INGAME_OPTIONS.length - 1;
        break;
    }

    menuIndexSelected = E.clip(menuIndexSelected + dir, 0, maxLen);

    if (menuDisplayed === 'main') drawMenu(MENU_MAIN_OPTIONS);
    if (menuDisplayed === 'inGameOptions') drawMenu(MENU_INGAME_OPTIONS);

    if (prevIndex !== menuIndexSelected) {
      Pip.playSound('SCROLL');
    }
  }

  function statScroll(dir) {
    if (!inGame || menuDisplayed !== '') return;
    const prevIndex = activeStatIndex;
    activeStatIndex = E.clip(activeStatIndex + dir, 0, currentStats.length - 1);

    if (prevIndex !== activeStatIndex) {
      Pip.playSound('SCROLL');
      drawTrackerBoard();
    }
  }

  function initializeStats() {
    currentStats = [];

    for (let i = 0; i < DEFAULT_STATS.length; i++) {
      let stat = DEFAULT_STATS[i];
      currentStats.push({
        name: stat.name,
        min: stat.min,
        max: stat.max,
        value: stat.defaultVal,
      });
    }

    activeStatIndex = 0;
  }

  function gameStart() {
    inGame = true;
    menuDisplayed = '';
    initializeStats();
    drawTrackerBoard();
  }

  function exitApp() {
    Pip.changeMenu();
  }

  function handleLeftKnob(dir, long) {
    if (dir !== 0) {
      let now = Date.now();
      if (now - lastLeftKnobTime < C.KNOB_DEBOUNCE) return;
      lastLeftKnobTime = now;
    }

    if (dir !== 0 && menuDisplayed !== '') {
      return menuScroll(dir);
    } else if (dir !== 0 && inGame && menuDisplayed === '') {
      return statScroll(dir);
    } else if (dir === 0) {
      Pip.playSound('SCROLL');

      if (!inGame) {
        if (menuDisplayed === 'main') {
          if (menuIndexSelected === 0) gameStart();
          else if (menuIndexSelected === 1) {
            menuDisplayed = 'help';
            drawMenuHelp();
          } else if (menuIndexSelected === 2) exitApp();
        } else if (menuDisplayed === 'help') {
          menuDisplayed = 'main';
          menuLoad(MENU_MAIN_OPTIONS, 'Main Menu');
        }
      } else {
        if (menuDisplayed === '') {
          menuDisplayed = 'inGameOptions';
          menuLoad(MENU_INGAME_OPTIONS, 'Options');
        } else if (menuDisplayed === 'inGameOptions') {
          if (menuIndexSelected === 0) {
            menuDisplayed = '';
            drawTrackerBoard();
          } else if (menuIndexSelected === 1) {
            initializeStats();
            menuDisplayed = '';
            drawTrackerBoard();
          } else if (menuIndexSelected === 2) {
            inGame = false;
            menuDisplayed = 'main';
            menuLoad(MENU_MAIN_OPTIONS, 'Main Menu');
          }
        }
      }
    }
  }

  function handleRightKnob(dir) {
    if (inGame && menuDisplayed === '' && dir !== 0) {
      let stat = currentStats[activeStatIndex];
      let prevValue = stat.value;
      stat.value = E.clip(stat.value + dir, stat.min, stat.max);

      if (prevValue !== stat.value) {
        Pip.playSound('SCROLL');
        drawTrackerBoard();
      }
    }
  }

  originalIdleTimeout = Pip.settings.idleTimeout;
  Pip.settings.idleTimeout = 0;

  h.clear(1).flip();

  Pip.onExclusive('knob1', handleLeftKnob);
  Pip.onExclusive('knob2', handleRightKnob);

  menuLoad(MENU_MAIN_OPTIONS, 'Main Menu');
  drawAppTitleAndVersion();
  drawMenuBoundaries();

  return {
    id: 'killteamtracker',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      Pip.removeListener('knob1', handleLeftKnob);
      Pip.removeListener('knob2', handleRightKnob);
      Pip.settings.idleTimeout = originalIdleTimeout;
    },
  };
})();
