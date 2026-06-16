(function () {
  // General
  const C = {
    APP_NAME: 'MTG Life Counter',
    APP_VERSION: '1.0.0',
    PLAYER_COUNT_MIN: 1,
    PLAYER_COUNT_MAX: 4,
    GAME_STANDARD_HP: 20,
    GAME_COMMANDER_HP: 40,
    KNOB_DEBOUNCE: 10,
    SHOW_MENU_BOUNDRIES: true,
  };

  // Menu variables
  const MENU_MAIN_OPTIONS = ['New Game', 'Help', 'Exit'];
  const MENU_GAME_NEW_OPTIONS = [
    'Player Count',
    'Standard (20HP)',
    'Commander (40HP & 21HP)',
    'Back',
  ];
  const MENU_INGAME_OPTIONS = [
    'Reset Current Game',
    'New Game',
    'Exit ' + C.APP_NAME,
  ];
  const HELP_TEXT =
    'Need help with Controls?!\n  Check the readme on GitHub.\n  Report bugs on GitHub.';

  let menuDisplayed = 'main';
  let menuIndexSelected = 0;

  // Game variables
  let playerCount = 1;
  let gameType = 'standard';
  let inGame = false;
  let PLAYERS = [];
  let playerIndexSelected = 0;

  // Screen
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
  const TOP_HALF_XY = {
    x1: SCREEN_XY.x1,
    y1: SCREEN_XY.y1,
    x2: SCREEN_XY.x2,
    y2: (SCREEN_XY.y2 + SCREEN_XY.y1) / 2 - 10,
  };
  const BOTTOM_HALF_XY = {
    x1: TOP_HALF_XY.x1,
    y1: TOP_HALF_XY.y2 + 5,
    x2: SCREEN_XY.x2,
    y2: SCREEN_XY.y2 - 15,
  };
  const TOP_LEFT_XY = {
    x1: TOP_HALF_XY.x1,
    y1: TOP_HALF_XY.y1,
    x2: (SCREEN_XY.x2 + SCREEN_XY.x1) / 2 - 2,
    y2: TOP_HALF_XY.y2,
  };
  const TOP_RIGHT_XY = {
    x1: TOP_LEFT_XY.x2 + 4,
    y1: TOP_HALF_XY.y1,
    x2: TOP_HALF_XY.x2,
    y2: TOP_HALF_XY.y2,
  };
  const BOTTOM_LEFT_XY = {
    x1: TOP_LEFT_XY.x1,
    y1: BOTTOM_HALF_XY.y1,
    x2: TOP_LEFT_XY.x2,
    y2: BOTTOM_HALF_XY.y2,
  };
  const BOTTOM_RIGHT_XY = {
    x1: TOP_RIGHT_XY.x1,
    y1: BOTTOM_HALF_XY.y1,
    x2: TOP_RIGHT_XY.x2,
    y2: BOTTOM_HALF_XY.y2,
  };

  // Runtime state
  let lastLeftKnobTime = 0;
  let footerInterval = null;
  let originalIdleTimeout = Pip.settings.idleTimeout;

  function Player(index, name, currentLife) {
    this.index = index;
    this.name = name;
    this.currentLife = currentLife;
    this.commanderDamageSources = [];
  }

  function CommanderDamageSource(index, sourceName) {
    this.index = index;
    this.fromSource = sourceName;
    this.amount = 0;
  }

  function limitNumberWithinRange(num, min, max) {
    const parsed = parseInt(num);
    return Math.min(Math.max(parsed, min), max);
  }

  function clearFooterBar() {
    if (footerInterval) {
      clearInterval(footerInterval);
    }
    footerInterval = null;
  }

  function clearScreenArea(area) {
    h.clearRect(area.x1, area.y1, area.x2, area.y2);
  }

  function drawBoundaries(area) {
    h.drawRect(area.x1, area.y1, area.x2, area.y2);
  }

  function drawMenuBoundries() {
    if (C.SHOW_MENU_BOUNDRIES === false) return;
    drawBoundaries(SCREEN_XY);
    drawBoundaries(MENU_HEADER_XY);
    drawBoundaries(MENU_XY);
  }

  function drawGameBoundries() {
    switch (playerCount) {
      case 1:
        drawBoundaries(SCREEN_XY);
        break;
      case 2:
        drawBoundaries(TOP_HALF_XY);
        drawBoundaries(BOTTOM_HALF_XY);
        break;
      case 3:
        drawBoundaries(TOP_LEFT_XY);
        drawBoundaries(TOP_RIGHT_XY);
        drawBoundaries(BOTTOM_HALF_XY);
        break;
      case 4:
        drawBoundaries(TOP_LEFT_XY);
        drawBoundaries(TOP_RIGHT_XY);
        drawBoundaries(BOTTOM_LEFT_XY);
        drawBoundaries(BOTTOM_RIGHT_XY);
        break;
    }
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
      let menuOption = option;
      if (
        menuDisplayed === 'gameNew' &&
        index === 0 &&
        menuIndexSelected === 0
      ) {
        menuOption = 'Player Count: < ' + playerCount + ' >';
      } else if (menuDisplayed === 'gameNew' && index === 0) {
        menuOption = 'Player Count: ' + playerCount;
      } else if (
        menuDisplayed === 'commanderDamage' &&
        option.index === menuIndexSelected
      ) {
        menuOption = ' ' + option.fromSource + ': < ' + option.amount + ' >';
      } else if (menuDisplayed === 'commanderDamage') {
        menuOption = ' ' + option.fromSource + ': ' + option.amount;
      }
      h.drawString(menuOption, MENU_XY.x1 + padding, y);

      if (index === menuIndexSelected) {
        Pip.shadeBox(MENU_XY.x1, y - padding, MENU_XY.x2, y2 - padding);
      }
    });

    drawMenuBoundries();
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

    drawMenuBoundries();
  }

  function drawPlayerTile(area, player) {
    clearScreenArea(area);

    if (playerCount === 1) {
      h.setFontMonofonto28().setFontAlign(0, -1, 0);
    } else {
      h.setFontMonofonto23().setFontAlign(0, -1, 0);
    }

    const paddingY = 10;
    const rowHeight = 24;

    const playerNameX = (area.x1 + area.x2) / 2;
    const playerNameY = area.y1 + paddingY;
    h.drawString(player.name, playerNameX, playerNameY);

    let strLifeTotal = player.currentLife;
    if (playerIndexSelected === player.index) {
      strLifeTotal = '< ' + player.currentLife + ' >';
    }
    const lifeTotalX = (area.x1 + area.x2) / 2;
    const lifeTotalY = (area.y1 + area.y2) / 2 - rowHeight / 2 + paddingY;
    h.drawString(strLifeTotal, lifeTotalX, lifeTotalY);

    if (playerCount !== 1 && playerIndexSelected === player.index) {
      Pip.shadeBox(area.x1, area.y1, area.x2, area.y2);
    }

    if (gameType === 'commander' && playerIndexSelected === player.index) {
      const commanderPrompt = '* -> EDH dmg';
      const commanderPromptX = 5 + area.x1;
      let commanderPromptY = area.y2 - rowHeight + 5;
      if (playerCount === 1) {
        commanderPromptY += -10;
      }
      h.setFontAlign(-1, -1, 0)
        .setFont('6x8', 2)
        .drawString(commanderPrompt, commanderPromptX, commanderPromptY);
    }

    drawGameBoundries();
  }

  function drawGameBoard() {
    clearScreenArea(SCREEN_XY);
    h.setFontMonofonto16().setFontAlign(-1, -1, 0);

    switch (playerCount) {
      case 1:
        drawPlayerTile(SCREEN_XY, PLAYERS[0]);
        break;
      case 2:
        drawPlayerTile(TOP_HALF_XY, PLAYERS[1]);
        drawPlayerTile(BOTTOM_HALF_XY, PLAYERS[0]);
        break;
      case 3:
        drawPlayerTile(TOP_LEFT_XY, PLAYERS[1]);
        drawPlayerTile(TOP_RIGHT_XY, PLAYERS[2]);
        drawPlayerTile(BOTTOM_HALF_XY, PLAYERS[0]);
        break;
      case 4:
        drawPlayerTile(TOP_LEFT_XY, PLAYERS[1]);
        drawPlayerTile(TOP_RIGHT_XY, PLAYERS[2]);
        drawPlayerTile(BOTTOM_LEFT_XY, PLAYERS[0]);
        drawPlayerTile(BOTTOM_RIGHT_XY, PLAYERS[3]);
        break;
    }

    drawGameBoundries();
  }

  function menuLoad(menuOptions, menuHeader) {
    menuIndexSelected = 0;
    drawMenuHeader(menuHeader);
    drawMenu(menuOptions);
  }

  function menuScroll(dir) {
    const prevIndex = menuIndexSelected;

    switch (menuDisplayed) {
      case 'main':
        menuIndexSelected = limitNumberWithinRange(
          menuIndexSelected + dir,
          0,
          MENU_MAIN_OPTIONS.length - 1,
        );
        drawMenu(MENU_MAIN_OPTIONS);
        break;
      case 'gameNew':
        menuIndexSelected = limitNumberWithinRange(
          menuIndexSelected + dir,
          0,
          MENU_GAME_NEW_OPTIONS.length - 1,
        );
        drawMenu(MENU_GAME_NEW_OPTIONS);
        break;
      case 'commanderDamage':
        menuIndexSelected = limitNumberWithinRange(
          menuIndexSelected + dir,
          0,
          PLAYERS[playerIndexSelected].commanderDamageSources.length - 1,
        );
        drawMenu(PLAYERS[playerIndexSelected].commanderDamageSources);
        break;
      case 'inGameOptions':
        menuIndexSelected = limitNumberWithinRange(
          menuIndexSelected + dir,
          0,
          MENU_INGAME_OPTIONS.length - 1,
        );
        drawMenu(MENU_INGAME_OPTIONS);
        break;
    }

    if (prevIndex !== menuIndexSelected) {
      Pip.playSound('SCROLL');
    }
  }

  function playerScroll(dir) {
    const prevIndex = playerIndexSelected;
    if (inGame === false) return;
    playerIndexSelected = limitNumberWithinRange(
      playerIndexSelected + dir,
      0,
      PLAYERS.length - 1,
    );
    drawGameBoard();
    if (prevIndex !== playerIndexSelected) {
      Pip.playSound('SCROLL');
    }
  }

  function exitApp() {
    Pip.changeMenu();
  }

  function gameStart() {
    inGame = true;
    menuDisplayed = '';

    clearScreenArea(SCREEN_XY);

    let startingHP =
      gameType === 'commander' ? C.GAME_COMMANDER_HP : C.GAME_STANDARD_HP;

    PLAYERS.splice(0, PLAYERS.length);
    for (let i = 0; i < playerCount; i++) {
      const player = new Player(i, 'Player ' + (i + 1), startingHP);

      for (let j = 0; j < (playerCount === 1 ? 6 : playerCount); j++) {
        player.commanderDamageSources.push(
          new CommanderDamageSource(j, 'Player ' + (j + 1)),
        );
      }

      PLAYERS.push(player);
    }

    playerIndexSelected = 0;
    drawGameBoard();
  }

  function handleLeftKnob(dir, long) {
    if (dir !== 0) {
      let now = Date.now();
      if (now - lastLeftKnobTime < C.KNOB_DEBOUNCE) return;
      lastLeftKnobTime = now;
    }

    if (dir !== 0 && inGame === false) {
      return menuScroll(dir);
    } else if (dir === 0 && inGame === false) {
      Pip.playSound('SCROLL');
      switch (true) {
        case menuDisplayed === 'main' && menuIndexSelected === 0:
          menuDisplayed = 'gameNew';
          menuLoad(MENU_GAME_NEW_OPTIONS, 'New Game');
          break;
        case menuDisplayed === 'main' && menuIndexSelected === 1:
          menuDisplayed = 'help';
          drawMenuHelp();
          break;
        case menuDisplayed === 'main' && menuIndexSelected === 2:
          exitApp();
          break;
        case menuDisplayed === 'gameNew' && menuIndexSelected === 0:
          break;
        case menuDisplayed === 'gameNew' && menuIndexSelected === 1:
          gameType = 'standard';
          gameStart();
          break;
        case menuDisplayed === 'gameNew' && menuIndexSelected === 2:
          gameType = 'commander';
          gameStart();
          break;
        case menuDisplayed === 'gameNew' && menuIndexSelected === 3:
          menuDisplayed = 'main';
          menuLoad(MENU_MAIN_OPTIONS, 'Main Menu');
          break;
        case menuDisplayed === 'help' && menuIndexSelected === 0:
          menuDisplayed = 'main';
          menuLoad(MENU_MAIN_OPTIONS, 'Main Menu');
          break;
      }
      menuIndexSelected = 0;
    } else if (dir !== 0 && inGame === true) {
      Pip.playSound('SCROLL');
      if (menuDisplayed === 'commanderDamage') {
        menuScroll(dir);
      } else if (menuDisplayed === 'inGameOptions') {
        menuScroll(dir);
      } else {
        return playerScroll(dir * -1);
      }
    } else if (dir === 0 && !!long && inGame === true) {
      Pip.playSound('SCROLL');
      if (menuDisplayed !== 'inGameOptions') {
        menuDisplayed = 'inGameOptions';
        menuLoad(MENU_INGAME_OPTIONS, 'Game Options');
      } else {
        menuDisplayed = '';
        drawGameBoard();
      }
    } else if (dir === 0 && inGame === true) {
      if (
        gameType === 'commander' &&
        menuDisplayed !== 'commanderDamage' &&
        menuDisplayed !== 'inGameOptions'
      ) {
        Pip.playSound('SCROLL');
        menuDisplayed = 'commanderDamage';
        menuLoad(
          PLAYERS[playerIndexSelected].commanderDamageSources,
          'Who Dealt Commander Damage to ' +
            PLAYERS[playerIndexSelected].name +
            '?',
        );
      } else if (
        gameType === 'commander' &&
        menuDisplayed === 'commanderDamage'
      ) {
        Pip.playSound('SCROLL');
        menuDisplayed = '';
        drawGameBoard();
      } else if (menuDisplayed === 'inGameOptions') {
        Pip.playSound('SCROLL');
        switch (menuIndexSelected) {
          case 0:
            gameStart();
            break;
          case 1:
            inGame = false;
            menuDisplayed = 'gameNew';
            clearScreenArea(SCREEN_XY);
            menuLoad(MENU_GAME_NEW_OPTIONS, 'New Game');
            break;
          case 2:
            exitApp();
            break;
        }
        menuIndexSelected = 0;
      }
    }
  }

  function handleRightKnob(dir) {
    let prevIndex = 0;
    if (inGame === false) {
      if (menuDisplayed === 'gameNew' && menuIndexSelected === 0) {
        prevIndex = playerCount;
        playerCount = limitNumberWithinRange(
          playerCount + dir,
          C.PLAYER_COUNT_MIN,
          C.PLAYER_COUNT_MAX,
        );
        drawMenu(MENU_GAME_NEW_OPTIONS);
        if (prevIndex !== playerCount) {
          Pip.playSound('SCROLL');
        }
      }
    } else if (
      inGame === true &&
      menuDisplayed !== 'commanderDamage' &&
      menuDisplayed !== 'inGameOptions'
    ) {
      PLAYERS[playerIndexSelected].currentLife += dir;
      Pip.playSound('SCROLL');
      drawGameBoard();
    } else if (inGame === true && menuDisplayed === 'commanderDamage') {
      let cmndrDmg =
        PLAYERS[playerIndexSelected].commanderDamageSources[menuIndexSelected]
          .amount;
      let cmndrDmgBoundsHack = cmndrDmg + dir;
      cmndrDmg = limitNumberWithinRange(cmndrDmg + dir, 0, 21);
      PLAYERS[playerIndexSelected].commanderDamageSources[
        menuIndexSelected
      ].amount = cmndrDmg;

      if (cmndrDmgBoundsHack > -1 && cmndrDmgBoundsHack < 22) {
        PLAYERS[playerIndexSelected].currentLife += dir * -1;
        Pip.playSound('SCROLL');
      }

      drawMenu(PLAYERS[playerIndexSelected].commanderDamageSources);
    }
  }

  // Init
  originalIdleTimeout = Pip.settings.idleTimeout;
  Pip.settings.idleTimeout = 0;

  h.clear(1).flip();

  Pip.on('knob1', handleLeftKnob);
  Pip.on('knob2', handleRightKnob);

  menuLoad(MENU_MAIN_OPTIONS, 'Main Menu');
  drawAppTitleAndVersion();
  drawMenuBoundries();

  return {
    id: 'MTG_LIFE_COUNTER',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      clearFooterBar();
      Pip.removeListener('knob1', handleLeftKnob);
      Pip.removeListener('knob2', handleRightKnob);
      Pip.settings.idleTimeout = originalIdleTimeout;
    },
  };
});
