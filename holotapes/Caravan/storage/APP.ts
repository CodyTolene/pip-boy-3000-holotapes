/*
 * CARAVAN - app.js
 * Top-level holotape lifecycle and lazy module handoff.
 * Readable source only; installed runtime remains in the matching minified file.
 */
(function (): HolotapeApp {
  const fs = require('fs'),
    basePath = 'HOLO/CARAVAN/';
  let menuModule: CaravanDisposable = 0 as never,
    gameModule: CaravanGameModule = 0 as never,
    resultModule: CaravanResultModule = 0 as never,
    winModule: CaravanDisposable = 0 as never,
    toolModule: CaravanDisposable = 0 as never,
    timer = 0,
    removed = 0,
    ante = 50,
    funds = 500,
    opponentFunds = 500,
    opponent = '',
    savedIdleTimeout = 0,
    idleDisabled = 0,
    pendingOutcome: CaravanOutcome = '',
    pendingDelta = 0,
    toolKind = 0;

  // --- Timing and memory helpers ---
  function clearTimer(): void {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
  }

  function reclaim(hard?: number | boolean): void {
    process.memory(true);
    if (hard) E.defrag();
  }

  // --- Pip-Boy idle handling ---
  function disableIdle(): void {
    if (idleDisabled) return;
    savedIdleTimeout = Pip.settings ? (Pip.settings.idleTimeout as number) : 0;
    if (Pip.settings) Pip.settings.idleTimeout = 0;
    if (Pip.timers && Pip.timers.idle) {
      clearTimeout(Pip.timers.idle);
      delete Pip.timers.idle;
    }
    idleDisabled = 1;
  }

  function restoreIdle(): void {
    if (!idleDisabled) return;
    if (Pip.settings) Pip.settings.idleTimeout = savedIdleTimeout;
    idleDisabled = 0;
    if (!Pip.sleeping && Pip.kickIdleTimer) {
      try {
        Pip.kickIdleTimer();
      } catch (idleError) {}
    }
  }

  // --- Lazy module lifecycle ---
  function unloadMenu(): void {
    if (menuModule && menuModule.remove) menuModule.remove();
    menuModule = 0 as never;
  }

  function unloadGame(): void {
    if (gameModule) gameModule[0]();
    gameModule = 0 as never;
  }

  function unloadResult(): void {
    if (resultModule && resultModule.remove) resultModule.remove();
    resultModule = 0 as never;
  }

  function unloadWin(): void {
    if (winModule && winModule.remove) winModule.remove();
    winModule = 0 as never;
  }

  function unloadTool(): void {
    if (toolModule && toolModule.remove) toolModule.remove();
    toolModule = 0 as never;
  }

  // --- Menu, game, and results flow ---
  function loadMenu(
    compact?: number | boolean,
    requestedSelection?: number,
  ): void {
    let sourceCode: string = 0 as never,
      factory: CaravanMenuFactory | CaravanReturnMenuFactory = 0 as never;
    if (removed) return;
    // Keep Pip-Boy automatic idle sleep disabled for the entire Caravan
    // session. Static Caravan screens may be left open indefinitely without
    // a sleep/wake cycle adding OS state on top of resident game modules.
    disableIdle();
    unloadTool();
    unloadMenu();
    reclaim();
    sourceCode = fs.readFileSync(
      basePath +
        (compact
          ? 'CARAVAN_RETURN_MENU.MIN.JS'
          : 'CARAVAN_MENU_INTERFACE.MIN.JS'),
    );
    factory = eval(sourceCode) as CaravanMenuFactory | CaravanReturnMenuFactory;
    sourceCode = 0 as never;
    menuModule = factory({
      fs: fs,
      basePath: basePath,
      screen: 0,
      menuSelection: requestedSelection || 0,
      ante: ante,
      funds: funds,
      opponentFunds: opponentFunds,
      opponent: opponent,
      resultOutcome: 'DRAW',
      resultDelta: 0,
      onStartGame: requestGame,
      onOpenTool: compact ? requestTool : 0,
    });
    factory = 0 as never;
    h.flip();
    Pip.lastFlip = getTime();
  }

  function requestTool(kind: number): void {
    if (removed) return;
    toolKind = kind ? 1 : 0;
    clearTimer();
    timer = setTimeout(beginTool, 8);
  }

  function beginTool(): void {
    let sourceCode: string = 0 as never,
      factory: CaravanTutorialFactory | CaravanVolumeFactory = 0 as never;
    timer = 0;
    if (removed) return;
    unloadMenu();
    if (gameModule && gameModule[3]) gameModule[3]();
    reclaim(1);
    if (toolKind) {
      h.clear()
        .setColor(3)
        .setFontMonofonto16()
        .setFontAlign(0, -1)
        .drawString('LOADING TUTORIAL...', 240, 146)
        .setFontAlign(-1, -1);
      h.flip();
      Pip.lastFlip = getTime();
    }
    try {
      sourceCode = fs.readFileSync(
        basePath +
          (toolKind
            ? 'CARAVAN_TUTORIAL.MIN.JS'
            : 'CARAVAN_VOLUME_SOUND.MIN.JS'),
      );
      factory = eval(sourceCode) as
        CaravanTutorialFactory | CaravanVolumeFactory;
      sourceCode = 0 as never;
      toolModule = toolKind
        ? (factory as CaravanTutorialFactory)({
            fs: fs,
            basePath: basePath,
            onExit: toolBack,
          })
        : (factory as CaravanVolumeFactory)({
            fs: fs,
            basePath: basePath,
            onBack: toolBack,
          });
      factory = 0 as never;
      reclaim();
    } catch (error) {
      sourceCode = 0 as never;
      factory = 0 as never;
      toolModule = 0 as never;
      loadMenu(1, toolKind ? 1 : 3);
    }
  }

  function toolBack(): void {
    if (removed) return;
    clearTimer();
    timer = setTimeout(function (): void {
      timer = 0;
      if (removed) return;
      unloadTool();
      reclaim(1);
      loadMenu(1, toolKind ? 1 : 3);
    }, 1);
  }

  function requestGame(state: CaravanSessionState): void {
    if (removed) return;
    ante = state.ante;
    funds = state.funds;
    if (state.opponentFunds !== undefined) opponentFunds = state.opponentFunds;
    opponent = state.opponent || opponent;
    h.clear()
      .setColor(3)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString('LOADING GAME...', 240, 146)
      .setFontAlign(-1, -1);
    h.flip();
    Pip.lastFlip = getTime();
    clearTimer();
    timer = setTimeout(beginGame, 1);
  }

  function beginGame(): void {
    let sourceCode: string = 0 as never,
      factory: CaravanGameFactory = 0 as never;
    timer = 0;
    if (removed) return;
    // Use the direct game-start path that already proved reliable on hardware.
    // Finished-match cleanup runs before this, so there is no second nested
    // startup timer to lose between the menu and the game factory.
    unloadMenu();
    unloadResult();
    unloadWin();
    disableIdle();
    reclaim(1);
    // Keep one lightweight game controller for the whole Caravan session.
    // A finished match has already released Engine/Renderer/Audio/data, so
    // restarting the same controller avoids repeatedly eval-loading the
    // large outer game module and its callback/timer graph.
    if (gameModule) {
      gameModule[1](opponent);
      return;
    }
    sourceCode = fs.readFileSync(basePath + 'CARAVAN_GAME.MIN.JS');
    factory = eval(sourceCode) as CaravanGameFactory;
    sourceCode = 0 as never;
    gameModule = factory([fs, basePath, opponent, finishGame]);
    factory = 0 as never;
    // The game factory has already scheduled its normal boot timer.
    // Reclaim only the temporary source/eval objects before that timer runs.
    reclaim();
  }

  function ensureResult(): number {
    let sourceCode: string = 0 as never,
      factory: CaravanResultFactory = 0 as never;
    if (resultModule) return 1;
    sourceCode = fs.readFileSync(basePath + 'CARAVAN_RESULT_MENU.MIN.JS');
    factory = eval(sourceCode) as CaravanResultFactory;
    sourceCode = 0 as never;
    resultModule = factory({
      fs: fs,
      basePath: basePath,
    });
    factory = 0 as never;
    return resultModule ? 1 : 0;
  }

  function showPendingResult(): void {
    timer = 0;
    if (removed) return;
    // The win-audio callback has fully returned by the time this executes,
    // so its timer/closure stack can be reclaimed before Results is loaded.
    reclaim(1);
    if (!ensureResult()) return;
    resultModule.show({
      outcome: pendingOutcome,
      delta: pendingDelta,
      opponent: opponent,
      funds: funds,
      opponentFunds: opponentFunds,
      onRematch: rematch,
      onNewOpponent: rematch,
      onBack: resultBack,
    });
    pendingOutcome = '';
    pendingDelta = 0;
  }

  function winDone(): void {
    winModule = 0 as never;
    if (removed) return;
    clearTimer();
    timer = setTimeout(showPendingResult, 8);
  }

  function finishGame(outcome: CaravanOutcome): void {
    let delta = 0,
      maxAnte = 0;
    if (removed) return;
    if (outcome === 'PLAYER') {
      delta = ante;
      funds += ante;
      opponentFunds -= ante;
      if (opponentFunds < 0) opponentFunds = 0;
    } else if (outcome === 'CPU') {
      delta = -ante;
      funds -= ante;
      if (funds < 0) funds = 0;
      opponentFunds += ante;
    }
    maxAnte = funds < opponentFunds ? funds : opponentFunds;
    if (funds < 10 || maxAnte < 10) ante = 0;
    else if (ante > maxAnte) ante = maxAnte;
    pendingOutcome = outcome;
    pendingDelta = delta;
    clearTimer();
    timer = setTimeout(function (): void {
      let sourceCode: string = 0 as never,
        factory: CaravanWinAudioFactory = 0 as never;
      timer = 0;
      if (removed) return;
      sourceCode = fs.readFileSync(basePath + 'CARAVAN_WIN_AUDIO.MIN.JS');
      factory = eval(sourceCode) as CaravanWinAudioFactory;
      sourceCode = 0 as never;
      winModule = factory([fs, basePath, outcome, winDone]);
      factory = 0 as never;
    }, 8);
  }

  function rematch(newOpponent?: string): void {
    let maxAnte = 0;
    if (removed || funds < 10) return;
    if (newOpponent) {
      opponent = newOpponent;
      opponentFunds = 500;
    } else if (opponentFunds < 10) return;
    maxAnte = funds < opponentFunds ? funds : opponentFunds;
    if (maxAnte < 10) return;
    if (ante < 10) ante = Math.min(50, maxAnte);
    else if (ante > maxAnte) ante = maxAnte;
    clearTimer();
    timer = setTimeout(beginGame, 1);
  }

  function resultBack(): void {
    // Result callbacks execute from inside CARAVAN_RESULT_MENU's knob handler.
    // Do not unload/GC that module while its own closure is still on-stack.
    // Rematch already waits for the callback to unwind before unload, and that
    // path is flat on hardware. Defer the entire Back cleanup one event turn
    // so Results can return naturally before we release it.
    clearTimer();
    timer = setTimeout(function (): void {
      timer = 0;
      if (removed) return;
      unloadResult();
      if (gameModule && gameModule[2]) gameModule[2]();
      reclaim(1);
      // Give the just-released Results closure one more event turn before
      // reading/evaluating the compact post-game menu.
      timer = setTimeout(function (): void {
        timer = 0;
        if (removed) return;
        reclaim(1);
        loadMenu(1);
      }, 8);
    }, 1);
  }

  // --- Final cleanup ---
  function remove(): void {
    if (removed) return;
    removed = 1;
    pendingOutcome = '';
    pendingDelta = 0;
    clearTimer();
    unloadMenu();
    unloadGame();
    unloadResult();
    unloadWin();
    unloadTool();
    restoreIdle();
    reclaim();
  }
  loadMenu();
  return {
    id: 'CARAVAN',
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
