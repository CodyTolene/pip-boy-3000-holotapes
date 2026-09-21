/*
 * CARAVAN - lightweight post-game menu shell.
 * Owns post-game Play/Bet, Demo and Volume routing so APP stays lean in-game.
 */
(function (api: CaravanMenuApi): CaravanDisposable {
  const fs = api.fs,
    basePath = api.basePath;
  let selection = api.menuSelection || 0,
    screen = 0,
    removed = 0,
    child: CaravanDisposable = 0 as never,
    ante = api.ante,
    funds = api.funds,
    opponentFunds = api.opponentFunds,
    opponent = api.opponent || 'Ringo',
    volumeTimer = 0;

  function reclaim(hard?: number | boolean): void {
    process.memory(true);
    if (hard) E.defrag();
  }

  function updateState(state?: CaravanSessionState): void {
    if (!state) return;
    if (state.ante !== undefined) ante = state.ante;
    if (state.funds !== undefined) funds = state.funds;
    if (state.opponentFunds !== undefined) opponentFunds = state.opponentFunds;
    if (state.opponent) opponent = state.opponent;
  }

  function drawHeader(title: string): void {
    h.clear()
      .setColor(3)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString(title, 240, 10)
      .drawLine(18, 34, 462, 34)
      .setFontAlign(-1, -1);
  }

  function rowY(row: number): number {
    return 116 + row * 36;
  }

  function drawRow(text: string, row: number, active: number | boolean): void {
    const y = rowY(row);
    h.setColor(3).drawString(text, 42, y);
    if (active) h.drawRect(28, y - 5, 452, y + 23);
  }

  function drawMain(): void {
    if (selection < 0 || selection > 4) selection = 0;
    drawHeader('CARAVAN');
    h.drawString('Fallout: New Vegas Card Game', 42, 48)
      .drawString('Opponent: ' + opponent, 42, 68)
      .drawLine(42, 96, 438, 96);
    drawRow('Play Caravan', 0, selection === 0);
    drawRow('Tutorial', 1, selection === 1);
    drawRow('Rules / Controls', 2, selection === 2);
    drawRow('Volume Adjustment', 3, selection === 3);
    drawRow('< Back', 4, selection === 4);
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

  function detach(): void {
    // These menus own the knob events exclusively. Remove the event
    // properties themselves so Espruino cannot retain an empty listener
    // array/name that still anchors this menu closure between games.
    try {
      Pip.removeAllListeners('knob1');
    } catch (e) {
      try {
        Pip.removeListener('knob1', onKnob1);
      } catch (e2) {}
    }
    try {
      Pip.removeAllListeners('knob2');
    } catch (e) {}
  }

  function attach(): void {
    Pip.onExclusive('knob1', onKnob1);
  }

  function releaseChild(): void {
    if (child && child.remove) child.remove();
    child = 0 as never;
  }

  function backFromPlay(state: CaravanSessionState): void {
    updateState(state);
    child = 0 as never;
    if (removed) return;
    selection = 0;
    screen = 0;
    reclaim(1);
    attach();
    drawMain();
  }

  function startGame(state: CaravanSessionState): void {
    const callback = api.onStartGame;
    updateState(state);
    child = 0 as never;
    if (removed) return;
    removed = 1;
    detach();
    // Sever the parent callback before handing control back to APP.
    // If Espruino retains any stale menu bookkeeping, it can no longer
    // keep the APP/menu closure graph alive.
    api.onStartGame = 0;
    if (callback)
      callback({
        ante: ante,
        funds: funds,
        opponentFunds: opponentFunds,
        opponent: opponent,
      });
  }

  function openPlay(): void {
    let sourceCode: string = 0 as never,
      factory: CaravanPlayMenuFactory = 0 as never;
    detach();
    reclaim(1);
    sourceCode = fs.readFileSync(basePath + 'CARAVAN_PLAY_MENU.MIN.JS');
    factory = eval(sourceCode) as CaravanPlayMenuFactory;
    sourceCode = 0 as never;
    child = factory({
      ante: ante,
      funds: funds,
      opponentFunds: opponentFunds,
      opponent: opponent,
      onStartGame: startGame,
      onBack: backFromPlay,
    });
    factory = 0 as never;
  }

  function backFromDemo(): void {
    releaseChild();
    if (removed) return;
    selection = 1;
    screen = 0;
    reclaim(1);
    attach();
    drawMain();
  }

  function openDemo(): void {
    let sourceCode: string = 0 as never,
      factory: CaravanTutorialFactory = 0 as never;
    detach();
    if (api.onOpenTool) {
      removed = 1;
      api.onOpenTool(1);
      return;
    }
    reclaim(1);
    h.clear()
      .setColor(3)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString('LOADING TUTORIAL...', 240, 146)
      .setFontAlign(-1, -1);
    h.flip();
    Pip.lastFlip = getTime();
    sourceCode = fs.readFileSync(basePath + 'CARAVAN_TUTORIAL.MIN.JS');
    factory = eval(sourceCode) as CaravanTutorialFactory;
    sourceCode = 0 as never;
    child = factory({ fs: fs, basePath: basePath, onExit: backFromDemo });
    factory = 0 as never;
  }

  function backFromVolume(): void {
    releaseChild();
    if (removed) return;
    selection = 3;
    screen = 0;
    reclaim(1);
    attach();
    drawMain();
  }

  function loadVolumeDeferred(): void {
    let sourceCode: string = 0 as never,
      factory: CaravanVolumeFactory = 0 as never;
    volumeTimer = 0;
    if (removed) return;
    reclaim(1);
    reclaim(0);
    try {
      sourceCode = fs.readFileSync(basePath + 'CARAVAN_VOLUME_SOUND.MIN.JS');
      factory = eval(sourceCode) as CaravanVolumeFactory;
      sourceCode = 0 as never;
      child = factory({ fs: fs, basePath: basePath, onBack: backFromVolume });
      factory = 0 as never;
      reclaim(0);
    } catch (error) {
      sourceCode = 0 as never;
      factory = 0 as never;
      child = 0 as never;
      if (!removed) {
        selection = 3;
        screen = 0;
        attach();
        drawMain();
      }
    }
  }

  function openVolume(): void {
    if (removed || volumeTimer) return;
    detach();
    if (api.onOpenTool) {
      removed = 1;
      api.onOpenTool(0);
      return;
    }
    // Let the knob callback unwind before loading the Volume module.
    volumeTimer = setTimeout(loadVolumeDeferred, 8);
  }

  function exitHolotape(): void {
    removed = 1;
    detach();
    try {
      Pip.changeMenu('MISC.JS');
    } catch (e) {
      try {
        Pip.changeMenu();
      } catch (e2) {}
    }
  }

  function onKnob1(direction: KnobDirection): void {
    if (removed || child) return;
    if (screen === 1) {
      if (!direction) {
        Pip.playSound('SELECT');
        screen = 0;
        selection = 2;
        drawMain();
      }
      return;
    }
    if (direction) {
      selection += direction > 0 ? 1 : -1;
      if (selection < 0) selection = 4;
      if (selection > 4) selection = 0;
      Pip.playSound('SCROLL');
      drawMain();
      return;
    }
    if (selection !== 0 && selection !== 3) Pip.playSound('SELECT');
    if (selection === 0) openPlay();
    else if (selection === 1) openDemo();
    else if (selection === 2) {
      screen = 1;
      drawRules();
    } else if (selection === 3) openVolume();
    else exitHolotape();
  }

  function remove(): void {
    if (removed) return;
    removed = 1;
    if (volumeTimer) {
      clearTimeout(volumeTimer);
      volumeTimer = 0;
    }
    detach();
    releaseChild();
    api.onStartGame = 0;
  }

  attach();
  drawMain();
  return { remove: remove };
});
