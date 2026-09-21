/*
 * CARAVAN - CARAVAN_MENU_INTERFACE.JS
 * Main menus, submenus, demo launch, and loading UI. Results are handled lazily by APP.JS.
 * Readable source only; installed runtime remains in the matching minified file.
 */
(function (api: CaravanMenuApi): CaravanMenuModule {
  function pickOpponent(): string {
    const names =
      'Cliff Briscoe|Dale Barton|Amb. Dennis Crocker|Isaac|Private Jake Erwin|Johnson Nash|Jules|Keith|Lacey|Little Buster|Quartermaster Mayes|No-bark Noonan|Ringo|Jed Masterson'.split(
        '|',
      );
    return names[(Date.now() >>> 0) % names.length];
  }

  const fs = api.fs,
    appPath = api.basePath;
  let screen = api.screen === undefined ? 0 : api.screen,
    menuSelection = api.menuSelection || 0,
    ante = api.ante === undefined ? 50 : api.ante,
    funds = api.funds === undefined ? 500 : api.funds,
    opponentFunds = api.opponentFunds === undefined ? 500 : api.opponentFunds,
    opponent = api.opponent || pickOpponent(),
    demoModule: CaravanDisposable = 0 as never,
    soundModule: CaravanDisposable = 0 as never,
    knob1Attached = 0,
    knob2Attached = 0,
    removed = 0,
    volumeTimer = 0;

  // --- Drawing primitives and menu screens ---
  function drawHeader(title: string): void {
    h.clear()
      .setColor(3)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString(title, 240, 10)
      .drawLine(18, 34, 462, 34)
      .setFontAlign(-1, -1);
  }

  function menuRowY(row: number): number {
    return (screen === 0 ? 116 : 92) + row * 36;
  }

  function drawMenuRow(
    text: string,
    row: number,
    selected: number | boolean,
  ): void {
    const y = menuRowY(row);
    h.setColor(3).drawString(text, 42, y);
    if (selected) h.drawRect(28, y - 5, 452, y + 23);
  }

  function drawMainMenu(): void {
    if (menuSelection < 0 || menuSelection > 4) menuSelection = 0;
    drawHeader('CARAVAN');
    h.drawString('Fallout: New Vegas Card Game', 42, 48)
      .drawString('Opponent: ' + opponent, 42, 68)
      .drawLine(42, 96, 438, 96);
    drawMenuRow('Play Caravan', 0, menuSelection === 0);
    drawMenuRow('Tutorial', 1, menuSelection === 1);
    drawMenuRow('Rules / Controls', 2, menuSelection === 2);
    drawMenuRow('Volume Adjustment', 3, menuSelection === 3);
    drawMenuRow('< Back', 4, menuSelection === 4);
  }

  function betLimit(): number {
    return funds < opponentFunds ? funds : opponentFunds;
  }

  function drawBetMenu(): void {
    if (funds < 10 || opponentFunds < 10) {
      ante = 0;
      menuSelection = 0;
    } else if (menuSelection < 0 || menuSelection > 3) menuSelection = 0;
    drawHeader('CARAVAN - BET');
    h.drawRect(22, 48, 458, 138)
      .drawString(opponent + "'s Current Ante: " + opponentFunds, 38, 60)
      .drawString('Your Current Ante: ' + ante, 38, 86)
      .drawString('Your Total Funds: ' + funds, 38, 112);
    if (funds < 10) {
      drawMenuRow('Not enough bottle caps to play...CLICK HERE!', 3, 1);
      return;
    }
    if (opponentFunds < 10) {
      drawMenuRow('Opponent has no bottle caps...CLICK HERE!', 3, 1);
      return;
    }
    drawMenuRow('Auto-Match', 2, menuSelection === 0);
    drawMenuRow('Raise', 3, menuSelection === 1);
    drawMenuRow('Accept', 4, menuSelection === 2);
    drawMenuRow('Exit', 5, menuSelection === 3);
  }

  function drawResetPopup(): void {
    drawBetMenu();
    h.setColor(0)
      .fillRect(70, 70, 410, 200)
      .setColor(3)
      .drawRect(70, 70, 410, 200)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString('RESET', 240, 82)
      .drawLine(90, 108, 390, 108)
      .drawString('Reset Total Ante', 240, 138)
      .setFontAlign(-1, -1)
      .drawRect(104, 131, 376, 165);
  }

  function drawDeckMenu(): void {
    if (menuSelection < 0 || menuSelection > 1) menuSelection = 0;
    drawHeader('CARAVAN - BUILD DECK');
    h.drawRect(22, 48, 458, 126)
      .drawString('Cards in Deck: 54', 38, 62)
      .drawString('Total Cards: 54', 38, 88)
      .drawString('Caravan Deck', 326, 62);
    drawMenuRow('Play Caravan', 3, menuSelection === 0);
    drawMenuRow('< Back', 4, menuSelection === 1);
  }

  function drawRules(): void {
    drawHeader('CARAVAN - CONTROLS');
    h.setFontMonofonto16()
      .setColor(3)
      .drawString('BOTH WHEELS', 30, 43)
      .drawString('Turn: scroll menus, cards and targets.', 42, 64)
      .drawString('LEFT WHEEL PRESS', 30, 86)
      .drawString('Press: open or confirm an action.', 42, 107)
      .drawString('NORMAL PLAY', 30, 129)
      .drawString('Scroll LEFT past card 1 for tracks.', 42, 150)
      .drawString('Card: Play / Discard / Cancel.', 42, 171)
      .drawString('Track: Disband Caravan / Cancel.', 42, 192)
      .drawString('Face: choose board, then target.', 42, 213)
      .drawString('21-26 wins lane; win 2 of 3.', 42, 234)
      .drawString('Empty deck + hand = loss.', 42, 255)
      .drawString('< Back', 42, 286)
      .drawRect(28, 281, 452, 309);
  }

  function menuRowForSelection(selection: number): number {
    if (screen === 0) return selection;
    if (screen === 1) return selection + 2;
    if (screen === 2) return selection + 3;
    return 5;
  }

  function menuTextForSelection(selection: number): string {
    if (screen === 0)
      return selection === 0
        ? 'Play Caravan'
        : selection === 1
          ? 'Tutorial'
          : selection === 2
            ? 'Rules / Controls'
            : selection === 3
              ? 'Volume Adjustment'
              : '< Back';
    if (screen === 1)
      return funds < 10
        ? 'Not enough bottle caps to play...CLICK HERE!'
        : opponentFunds < 10
          ? 'Opponent has no bottle caps...CLICK HERE!'
          : selection === 0
            ? 'Auto-Match'
            : selection === 1
              ? 'Raise'
              : selection === 2
                ? 'Accept'
                : 'Exit';
    if (screen === 2) return selection === 0 ? 'Play Caravan' : '< Back';
    return '< Back';
  }

  function redrawMenuSelection(previousSelection: number): void {
    let row, y;
    row = menuRowForSelection(previousSelection);
    y = menuRowY(row);
    h.clearRect(24, y - 7, 456, y + 25);
    drawMenuRow(menuTextForSelection(previousSelection), row, 0);
    row = menuRowForSelection(menuSelection);
    y = menuRowY(row);
    h.clearRect(24, y - 7, 456, y + 25);
    drawMenuRow(menuTextForSelection(menuSelection), row, 1);
  }

  function redrawBetValues(): void {
    h.clearRect(30, 54, 448, 132)
      .setColor(3)
      .drawString(opponent + "'s Current Ante: " + opponentFunds, 38, 60)
      .drawString('Your Current Ante: ' + ante, 38, 86)
      .drawString('Your Total Funds: ' + funds, 38, 112);
  }

  function drawCurrentScreen(): void {
    if (screen === 0) drawMainMenu();
    else if (screen === 1) drawBetMenu();
    else if (screen === 2) drawDeckMenu();
    else if (screen === 5) drawResetPopup();
    else drawRules();
  }

  // --- Game-loading handoff ---
  function handoffGame(): void {
    const startGameCallback = api.onStartGame;
    api.onStartGame = 0;
    if (startGameCallback) {
      startGameCallback({
        ante: ante,
        funds: funds,
        opponentFunds: opponentFunds,
        opponent: opponent,
      });
    }
  }

  // --- Volume Adjustment submenu lifecycle ---
  function unloadSoundMenu(defragment: number | boolean): void {
    if (soundModule && soundModule.remove) soundModule.remove();
    soundModule = 0 as never;
    if (defragment) E.defrag();
  }

  function onSoundMenuExit(): void {
    unloadSoundMenu(0);
    screen = 0;
    menuSelection = 3;
    attachMenuListeners();
    drawMainMenu();
  }

  function loadSoundMenuDeferred(): void {
    let sourceCode: string = 0 as never,
      soundFactory: CaravanVolumeFactory = 0 as never;
    volumeTimer = 0;
    if (removed) return;
    process.memory(true);
    E.defrag();
    process.memory(true);
    try {
      sourceCode = fs.readFileSync(appPath + 'CARAVAN_VOLUME_SOUND.MIN.JS');
      soundFactory = eval(sourceCode) as CaravanVolumeFactory;
      sourceCode = 0 as never;
      soundModule = soundFactory({
        fs: fs,
        basePath: appPath,
        onBack: onSoundMenuExit,
      });
      soundFactory = 0 as never;
      process.memory(true);
    } catch (error) {
      sourceCode = 0 as never;
      soundFactory = 0 as never;
      soundModule = 0 as never;
      if (!removed) {
        menuSelection = 3;
        attachMenuListeners();
        drawMainMenu();
      }
    }
  }

  function startSoundMenu(): void {
    if (removed || volumeTimer) return;
    detachMenuListeners();
    // Let the knob callback return before eval-loading the large Volume UI.
    volumeTimer = setTimeout(loadSoundMenuDeferred, 8);
  }

  // --- Menu input listeners ---
  function detachMenuListeners(): void {
    if (knob1Attached) {
      Pip.removeListener('knob1', onKnob1);
      knob1Attached = 0;
    }
    if (knob2Attached) {
      Pip.removeListener('knob2', onKnob2);
      knob2Attached = 0;
    }
  }

  function attachMenuListeners(): void {
    if (!knob1Attached) {
      Pip.onExclusive('knob1', onKnob1);
      knob1Attached = 1;
    }
    if (!knob2Attached) {
      try {
        Pip.onExclusive('knob2', onKnob2);
        knob2Attached = 1;
      } catch (error) {
        if (knob1Attached) {
          Pip.removeListener('knob1', onKnob1);
          knob1Attached = 0;
        }
        throw error;
      }
    }
  }

  // --- Game and demo launch flow ---
  function musicVolumeNeedsApply(): boolean {
    let config = '',
      target = 0,
      applied = 15;
    try {
      config = fs.readFileSync(appPath + 'VOLUME_SOUND.CFG') || '';
    } catch (error) {
      return 0 as never;
    }
    if (config.length < 8 || config.charAt(6) !== '1') return 0 as never;
    target = parseInt(config.charAt(7), 16);
    if (isNaN(target) || target <= 0) return 0 as never;
    if (target > 15) target = 15;
    if (config.length >= 9) {
      applied = parseInt(config.charAt(8), 16);
      if (isNaN(applied) || applied < 1 || applied > 15) applied = 15;
    }
    return target !== applied;
  }

  function startGame(): void {
    let sourceCode: string = 0 as never,
      applyFactory: CaravanVolumeApplyFactory = 0 as never,
      applyModule: CaravanVolumeApplyModule = 0 as never;
    if (
      removed ||
      funds < 10 ||
      opponentFunds < 10 ||
      ante < 10 ||
      ante > betLimit()
    )
      return;
    unloadSoundMenu(0);
    detachMenuListeners();
    // The heavy volume patcher is needed only when the requested music
    // level differs from the level already written into the WAV. Normal
    // repeated games now skip this eval-loaded module entirely.
    if (!musicVolumeNeedsApply()) {
      handoffGame();
      return;
    }
    function afterApply(): void {
      sourceCode = 0 as never;
      applyFactory = 0 as never;
      applyModule = 0 as never;
      handoffGame();
    }
    try {
      sourceCode = fs.readFileSync(appPath + 'CARAVAN_VOLUME_APPLY.MIN.JS');
      applyFactory = eval(sourceCode) as CaravanVolumeApplyFactory;
      sourceCode = 0 as never;
      applyModule = applyFactory({
        fs: fs,
        basePath: appPath,
      });
      applyFactory = 0 as never;
      if (applyModule && applyModule.apply) {
        if (applyModule.apply(afterApply) === 2) return;
      }
    } catch (error) {}
    afterApply();
  }

  function unloadDemo(defragment: number | boolean): void {
    if (demoModule && demoModule.remove) demoModule.remove();
    demoModule = 0 as never;
    if (defragment) E.defrag();
  }

  function onDemoExit(): void {
    unloadDemo(1);
    screen = 0;
    menuSelection = 1;
    attachMenuListeners();
    drawMainMenu();
  }

  function startDemo(): void {
    let sourceCode: string, demoFactory: CaravanTutorialFactory;
    detachMenuListeners();
    E.defrag();
    h.clear()
      .setColor(3)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString('LOADING TUTORIAL...', 240, 146)
      .setFontAlign(-1, -1);
    sourceCode = fs.readFileSync(appPath + 'CARAVAN_TUTORIAL.MIN.JS');
    demoFactory = eval(sourceCode) as CaravanTutorialFactory;
    sourceCode = 0 as never;
    demoModule = demoFactory({
      fs: fs,
      basePath: appPath,
      onExit: onDemoExit,
    });
    demoFactory = 0 as never;
  }

  // --- Top-level navigation and input ---
  function exitHolotape(): void {
    try {
      Pip.changeMenu('MISC.JS');
    } catch (error) {
      try {
        Pip.changeMenu();
      } catch (fallbackError) {}
    }
  }

  function onKnob2(direction: KnobDirection): void {
    let maxAnte;
    if (screen !== 1 || !direction || funds < 10 || opponentFunds < 10) return;
    maxAnte = betLimit();
    ante += direction > 0 ? 10 : -10;
    if (ante < 10) ante = 10;
    if (ante > maxAnte) ante = maxAnte;
    Pip.playSound('SCROLL');
    redrawBetValues();
  }

  function onKnob1(direction: KnobDirection): void {
    let optionCount;
    if (direction) {
      const previousSelection = menuSelection;
      optionCount =
        screen === 0
          ? 5
          : screen === 1
            ? funds < 10 || opponentFunds < 10
              ? 1
              : 4
            : screen === 2
              ? 2
              : 1;
      menuSelection += direction > 0 ? 1 : -1;
      if (menuSelection < 0) menuSelection = optionCount - 1;
      if (menuSelection >= optionCount) menuSelection = 0;
      Pip.playSound('SCROLL');
      if (optionCount > 1) redrawMenuSelection(previousSelection);
      return;
    }
    /*
     * Do not fire SELECT immediately before handing control to either
     * Volume Adjustment or the game. The game music and custom SFX are
     * 16 kHz; Play/Rematch transition silently so a firmware UI cue cannot
     * overlap the first game-audio stream.
     *
     * All other SELECT sounds stay enabled.
     */
    if (!(
      (screen === 2 && menuSelection === 0) ||
      (screen === 0 && menuSelection === 3)
    )) {
      Pip.playSound('SELECT');
    }
    if (screen === 0) {
      if (menuSelection === 0) {
        screen = 1;
        menuSelection = 0;
      } else if (menuSelection === 1) {
        startDemo();
        return;
      } else if (menuSelection === 2) {
        screen = 4;
        menuSelection = 0;
      } else if (menuSelection === 3) {
        startSoundMenu();
        return;
      } else {
        exitHolotape();
        return;
      }
    } else if (screen === 1) {
      if (funds < 10 || opponentFunds < 10) {
        screen = 5;
        menuSelection = 0;
      } else if (menuSelection === 0) {
        ante = Math.min(50, betLimit());
      } else if (menuSelection === 1) {
        ante += 10;
        if (ante > betLimit()) ante = betLimit();
      } else if (menuSelection === 2) {
        if (ante < 10 || ante > betLimit()) {
          drawBetMenu();
          return;
        }
        screen = 2;
        menuSelection = 0;
      } else {
        screen = 0;
        menuSelection = 0;
      }
    } else if (screen === 5) {
      funds = 500;
      opponentFunds = 500;
      ante = Math.min(50, betLimit());
      screen = 1;
      menuSelection = 0;
    } else if (screen === 2) {
      if (menuSelection === 0) {
        startGame();
        return;
      }
      screen = 1;
      menuSelection = 2;
    } else {
      screen = 0;
      menuSelection = 1;
    }
    drawCurrentScreen();
  }

  // --- Final cleanup ---
  function removeApp(): void {
    if (removed) return;
    removed = 1;
    if (volumeTimer) {
      clearTimeout(volumeTimer);
      volumeTimer = 0;
    }
    detachMenuListeners();
    if (demoModule && demoModule.remove) demoModule.remove();
    demoModule = 0 as never;
    if (soundModule && soundModule.remove) soundModule.remove();
    soundModule = 0 as never;
    api.onStartGame = 0;
  }
  attachMenuListeners();
  drawCurrentScreen();
  return {
    id: 'CARAVAN_MENU',
    remove: removeApp,
  };
});
