/*
 * CARAVAN - CARAVAN_GAME.JS
 * Resident match controller, input flow, turn flow, and rematch reset.
 * Readable source only; installed runtime remains in the matching minified file.
 */
(function (api: CaravanGameApi): CaravanGameModule {
  const fs = api[0],
    basePath = api[1];
  let engine: CaravanEngine = 0 as never,
    renderer: CaravanRenderer = 0 as never,
    audio: CaravanGameAudio = 0 as never,
    playerDeck: Uint8Array = 0 as never,
    cpuDeck: Uint8Array = 0 as never,
    playerDeckPosition = 0,
    cpuDeckPosition = 0,
    playerHand: number[] = [],
    cpuHand: number[] = [],
    playerCaravans: CaravanCaravans = [[], [], []],
    cpuCaravans: CaravanCaravans = [[], [], []],
    playerDirection: CaravanDirections = new Int8Array(3),
    cpuDirection: CaravanDirections = new Int8Array(3),
    handIndex = 0,
    targetIndex = 0,
    cpuTurn = 0,
    turnCount = 0,
    finished = 0,
    removed = 0,
    actionMenuOpen = 0,
    actionSelection = 0,
    cpuTimer = 0,
    bootTimer = 0,
    finishTimer = 0,
    ready = 0,
    inputAttached = 0,
    faceMode = 0,
    faceBoard = 0,
    faceLane = 0,
    faceCursor = 0,
    faceBase = -1,
    laneMode = 0,
    message = 'YOUR TURN',
    renderState: CaravanRenderState = 0 as never;

  // --- Render state ---
  function createRenderState(): CaravanRenderState {
    return [
      api[2],
      playerHand,
      playerCaravans,
      cpuCaravans,
      handIndex,
      targetIndex,
      cpuTurn,
      actionMenuOpen,
      actionSelection,
      faceMode,
      faceBoard,
      faceLane,
      faceBase,
      0,
      message,
      -1,
      laneMode,
    ];
  }

  function syncRenderState(): void {
    renderState[4] = handIndex;
    renderState[5] = targetIndex;
    renderState[6] = cpuTurn;
    renderState[7] = actionMenuOpen;
    renderState[8] = actionSelection;
    renderState[9] = faceMode;
    renderState[10] = faceBoard;
    renderState[11] = faceLane;
    renderState[12] = faceBase;
    renderState[13] =
      playerDeck.length - playerDeckPosition + playerHand.length;
    renderState[14] = message;
    renderState[16] = laneMode;
  }

  // --- Rendering helpers ---
  function drawGame(): void {
    syncRenderState();
    if (renderer) renderer[0](renderState);
  }

  function redrawStatus(): void {
    syncRenderState();
    if (renderer) renderer[3](renderState);
  }

  function drawPlayerCard(): void {
    if (playerDeckPosition < playerDeck.length)
      playerHand.push(playerDeck[playerDeckPosition++]);
  }

  function drawCpuCard(): void {
    if (cpuDeckPosition < cpuDeck.length)
      cpuHand.push(cpuDeck[cpuDeckPosition++]);
  }

  // --- Match setup and result checks ---
  function dealStartingHands(): void {
    engine[10](playerDeck);
    engine[10](cpuDeck);
    for (let cardIndex = 0; cardIndex < 8; cardIndex++) {
      drawPlayerCard();
      drawCpuCard();
    }
  }

  function currentResult(): CaravanOutcome {
    const outcome = engine[7](
      playerCaravans,
      cpuCaravans,
      turnCount,
      playerHand,
      cpuHand,
    );
    if (outcome) return outcome;
    if (playerDeckPosition >= playerDeck.length && !playerHand.length)
      return 'CPU';
    if (cpuDeckPosition >= cpuDeck.length && !cpuHand.length) return 'PLAYER';
    return '';
  }

  function detachInput(): void {
    if (!inputAttached) return;
    Pip.removeListener('knob1', handleKnob);
    Pip.removeListener('knob2', handleRightKnob);
    inputAttached = 0;
  }

  // --- Module/result lifecycle ---
  function releaseGameplayModules(): void {
    ready = 0;
    detachInput();
    // Keep the stateless Engine, Renderer, and reusable audio controller
    // alive for the whole Caravan session. The audio controller has already
    // been idled by returnResult(), which closes its file, stops music, and
    // releases the 2.5 KB card-SFX buffer. Only per-match data is discarded.
    renderState = 0 as never;
    message = 0 as never;
    playerDeck =
      cpuDeck =
      playerHand =
      cpuHand =
      playerCaravans =
      cpuCaravans =
      playerDirection =
      cpuDirection =
        0 as never;
    handIndex =
      targetIndex =
      cpuTurn =
      turnCount =
      actionMenuOpen =
      actionSelection =
      faceMode =
      faceBoard =
      faceLane =
      faceCursor =
      laneMode =
        0;
    faceBase = -1;
    process.memory(true);
  }

  function returnResult(): void {
    const outcome = currentResult() || 'DRAW',
      done = api[3];
    finishTimer = 0;
    if (audio) audio[2]();
    releaseGameplayModules();
    if (done) done(outcome);
  }

  function finishGame(outcome: CaravanOutcome): void {
    if (finished) return;
    finished = 1;
    cpuTurn = 0;
    detachInput();
    message =
      outcome === 'PLAYER'
        ? 'YOU WIN'
        : outcome === 'CPU'
          ? api[2] + ' WINS'
          : 'DRAW';
    drawGame();
    finishTimer = setTimeout(returnResult, 450);
  }

  // --- Turn transition helpers ---
  function afterMove(soundKind: number): void {
    const outcome = currentResult();
    turnCount++;
    if (outcome) {
      finishGame(outcome);
      if (audio) audio[1](soundKind);
      return;
    }
    cpuTurn = 1;
    message = engine[1](cpuCaravans) ? api[2] + ' OPENING' : api[2] + "'S TURN";
    drawGame();
    if (audio) audio[1](soundKind);
    cpuTimer = setTimeout(runCpuTurn, engine[11]());
  }

  // --- Player action and face-card flow ---
  function showInvalidOpening(): void {
    message = 'INVALID OPENING';
    Pip.playSound('SCROLL');
    redrawStatus();
  }

  function openActionMenu(): void {
    if (finished || cpuTurn || !playerHand.length) return;
    actionMenuOpen = 1;
    actionSelection = 0;
    syncRenderState();
    Pip.playSound('SELECT');
    if (renderer) renderer[4](renderState, 0);
  }

  function openTrackMenu(): void {
    if (finished || cpuTurn || laneMode !== 3) return;
    actionMenuOpen = 2;
    actionSelection = 0;
    syncRenderState();
    Pip.playSound('SELECT');
    if (renderer) renderer[4](renderState, 0);
  }

  function closeActionMenu(redraw: number | boolean): void {
    actionMenuOpen = 0;
    actionSelection = 0;
    if (redraw) drawGame();
  }

  function clearFaceTarget(): void {
    faceMode = 0;
    faceBoard = 0;
    faceLane = 0;
    faceCursor = 0;
    faceBase = -1;
  }

  function showInvalidFaceTarget(): void {
    message = 'INVALID TARGET';
    Pip.playSound('SCROLL');
    redrawStatus();
  }

  function faceTargetTotal(): number {
    const targetCaravans = faceBoard ? cpuCaravans : playerCaravans;
    let targetCount = 0;
    for (let laneIndex = 0; laneIndex < 3; laneIndex++) {
      targetCount += engine[2](targetCaravans[laneIndex]);
    }
    return targetCount;
  }

  function updateFaceBaseFromCursor(): void {
    const targetCaravans = faceBoard ? cpuCaravans : playerCaravans;
    let remainingTargetIndex = faceCursor;
    faceBase = -1;
    for (let laneIndex = 0; laneIndex < 3; laneIndex++) {
      const laneTargetCount = engine[2](targetCaravans[laneIndex]);
      if (remainingTargetIndex < laneTargetCount) {
        faceLane = laneIndex;
        faceBase = engine[3](targetCaravans[laneIndex], remainingTargetIndex);
        return;
      }
      remainingTargetIndex -= laneTargetCount;
    }
  }

  function cancelFaceTarget(): void {
    clearFaceTarget();
    actionMenuOpen = 1;
    actionSelection = 0;
    message = 'YOUR TURN';
    drawGame();
  }

  function finishFacePlay(): void {
    const card = playerHand[handIndex];
    const targetCaravans = faceBoard ? cpuCaravans : playerCaravans;
    const targetDirections = faceBoard ? cpuDirection : playerDirection;
    if (
      card === undefined ||
      faceBase < 0 ||
      !engine[6](
        targetCaravans,
        targetDirections,
        faceLane,
        faceBase,
        card,
        playerCaravans,
        cpuCaravans,
        playerDirection,
        cpuDirection,
      )
    ) {
      showInvalidFaceTarget();
      return;
    }
    clearFaceTarget();
    playerHand.splice(handIndex, 1);
    drawPlayerCard();
    if (handIndex >= playerHand.length)
      handIndex = Math.max(0, playerHand.length - 1);
    actionSelection = 0;
    message = 'CARD PLAYED';
    afterMove(0);
  }

  function startFaceTarget(): void {
    actionMenuOpen = 0;
    actionSelection = 0;
    clearFaceTarget();
    faceMode = 1;
    message = 'SELECT BOARD';
    Pip.playSound('SELECT');
    drawGame();
  }

  function confirmFaceTarget(): void {
    if (faceMode === 1) {
      if (actionSelection === 2) {
        cancelFaceTarget();
        return;
      }
      faceBoard = actionSelection;
      const targetCount = faceTargetTotal();
      if (!targetCount) {
        showInvalidFaceTarget();
        return;
      }
      faceMode = 2;
      faceCursor = 0;
      updateFaceBaseFromCursor();
      message = 'TARGET CARD';
      Pip.playSound('SELECT');
      drawGame();
      return;
    }
    if (faceBase < 0) {
      showInvalidFaceTarget();
      return;
    }
    finishFacePlay();
  }

  function onFaceKnob(direction: KnobDirection): void {
    if (!direction) {
      confirmFaceTarget();
      return;
    }
    if (faceMode === 2) {
      const targetCount = faceTargetTotal();
      if (!targetCount) {
        showInvalidFaceTarget();
        return;
      }
      const previousLane = faceLane;
      const previousBase = faceBase;
      faceCursor += direction > 0 ? 1 : -1;
      if (faceCursor < 0) faceCursor = targetCount - 1;
      if (faceCursor >= targetCount) faceCursor = 0;
      updateFaceBaseFromCursor();
      message = 'TARGET CARD';
      syncRenderState();
      Pip.playSound('SCROLL');
      if (renderer) {
        renderer[5](renderState, previousLane, previousBase);
      } else {
        drawGame();
      }
      return;
    }
    const previousSelection = actionSelection;
    actionSelection += direction > 0 ? 1 : -1;
    if (actionSelection < 0) actionSelection = 2;
    if (actionSelection > 2) actionSelection = 0;
    syncRenderState();
    Pip.playSound('SCROLL');
    if (renderer) {
      renderer[4](renderState, 1, previousSelection);
    } else {
      drawGame();
    }
  }

  function lanePlayable(
    laneIndex: number,
    card: number | undefined,
    opening: boolean,
  ): number {
    if (laneIndex < 0 || laneIndex > 2 || card === undefined) return 0;
    if (opening && playerCaravans[laneIndex].length) return 0;
    return engine[4](playerCaravans, playerDirection, laneIndex, card) ? 1 : 0;
  }

  function cancelLaneTarget(): void {
    laneMode = 0;
    actionMenuOpen = 1;
    actionSelection = 0;
    targetIndex = 0;
    message = 'YOUR TURN';
    drawGame();
  }

  function startLaneTarget(): number {
    const card = playerHand[handIndex],
      opening = engine[1](playerCaravans);
    let firstLane = -1;
    for (let laneIndex = 0; laneIndex < 3; laneIndex++) {
      if (lanePlayable(laneIndex, card, opening)) {
        firstLane = laneIndex;
        break;
      }
    }
    if (firstLane < 0) {
      message = 'NO VALID CARAVAN';
      actionMenuOpen = 1;
      actionSelection = 0;
      Pip.playSound('SCROLL');
      drawGame();
      return 0;
    }
    actionMenuOpen = 0;
    actionSelection = 0;
    laneMode = 1;
    targetIndex = firstLane;
    message = 'SELECT CARAVAN';
    drawGame();
    return 1;
  }

  function finishNumberPlay(): void {
    const card = playerHand[handIndex];
    const opening = engine[1](playerCaravans);
    if (card === undefined || targetIndex < 0) return;
    if (!lanePlayable(targetIndex, card, opening)) {
      laneMode = 0;
      actionMenuOpen = 1;
      actionSelection = 0;
      message = opening ? 'INVALID OPENING' : 'INVALID PLAY';
      Pip.playSound('SCROLL');
      drawGame();
      return;
    }
    laneMode = 0;
    engine[5](playerCaravans, playerDirection, targetIndex, card);
    targetIndex = 0;
    playerHand.splice(handIndex, 1);
    if (!opening) drawPlayerCard();
    if (handIndex >= playerHand.length)
      handIndex = Math.max(0, playerHand.length - 1);
    message = 'CARD PLAYED';
    afterMove(0);
  }

  function finishDisband(): void {
    if (targetIndex < 0) return;
    if (!playerCaravans[targetIndex].length) {
      message = 'EMPTY CARAVAN';
      Pip.playSound('SCROLL');
      redrawStatus();
      return;
    }
    laneMode = 0;
    playerCaravans[targetIndex].splice(0, playerCaravans[targetIndex].length);
    playerDirection[targetIndex] = 0;
    targetIndex = 0;
    message = 'CARAVAN DISBANDED';
    afterMove(1);
  }

  function onLaneKnob(direction: KnobDirection): void {
    let previousTarget;
    if (laneMode === 3) {
      if (!direction) {
        openTrackMenu();
        return;
      }
      previousTarget = targetIndex;
      if (direction > 0) {
        if (targetIndex < 2) {
          targetIndex++;
        } else {
          laneMode = 0;
          targetIndex = 0;
          handIndex = 0;
          message = 'YOUR TURN';
          Pip.playSound('SCROLL');
          drawGame();
          return;
        }
      } else if (targetIndex > 0) {
        targetIndex--;
      } else {
        return;
      }
      syncRenderState();
      Pip.playSound('SCROLL');
      if (renderer) renderer[2](renderState, previousTarget);
      else drawGame();
      return;
    }
    if (!direction) {
      finishNumberPlay();
      return;
    }
    previousTarget = targetIndex;
    const card = playerHand[handIndex],
      opening = engine[1](playerCaravans),
      step = direction > 0 ? 1 : -1;
    let nextTarget = targetIndex + step;
    while (
      nextTarget >= 0 &&
      nextTarget < 3 &&
      !lanePlayable(nextTarget, card, opening)
    ) {
      nextTarget += step;
    }
    if (nextTarget < 0 || nextTarget > 2) {
      cancelLaneTarget();
      Pip.playSound('SCROLL');
      return;
    }
    targetIndex = nextTarget;
    syncRenderState();
    Pip.playSound('SCROLL');
    if (renderer) renderer[2](renderState, previousTarget);
    else drawGame();
  }

  function confirmAction(): void {
    if (!actionMenuOpen) return;
    if (actionMenuOpen === 2) {
      if (actionSelection === 0) {
        if (engine[1](playerCaravans)) {
          showInvalidOpening();
          return;
        }
        actionMenuOpen = 0;
        actionSelection = 0;
        finishDisband();
        return;
      }
      Pip.playSound('SELECT');
      closeActionMenu(1);
      return;
    }
    if (actionSelection === 0) {
      playSelectedCard();
      return;
    }
    if (actionSelection === 1) {
      actionMenuOpen = 0;
      actionSelection = 0;
      discardSelectedCard();
      return;
    }
    Pip.playSound('SELECT');
    closeActionMenu(1);
  }

  function playSelectedCard(): number {
    const card = playerHand[handIndex];
    const opening = engine[1](playerCaravans);
    if (finished || cpuTurn || card === undefined) return 0;
    if (opening && !engine[0](card)) {
      showInvalidOpening();
      return 0;
    }
    if (!opening && !engine[0](card)) {
      startFaceTarget();
      return 2;
    }
    return startLaneTarget() ? 2 : 0;
  }

  function discardSelectedCard(): void {
    if (finished || cpuTurn || !playerHand.length) return;
    playerHand.splice(handIndex, 1);
    drawPlayerCard();
    if (handIndex >= playerHand.length)
      handIndex = Math.max(0, playerHand.length - 1);
    message = 'CARD DISCARDED';
    afterMove(1);
  }

  // --- Player and CPU turns ---
  function beginPlayerTurn(): void {
    cpuTimer = 0;
    if (finished) return;
    cpuTurn = 0;
    message = engine[1](playerCaravans) ? 'OPENING - YOUR TURN' : 'YOUR TURN';
    syncRenderState();
    if (renderer) renderer[3](renderState);
    if (renderer) renderer[2](renderState, -1);
  }

  function runCpuTurn(): void {
    const opening = engine[1](cpuCaravans);
    let soundKind;
    cpuTimer = 0;
    if (finished) return;
    const encodedMove = engine[12](
      cpuHand,
      cpuCaravans,
      cpuDirection,
      playerCaravans,
      playerDirection,
    );
    if (encodedMove <= -2) {
      const disbandLane = -encodedMove - 2;
      if (
        disbandLane >= 0 &&
        disbandLane < 3 &&
        cpuCaravans[disbandLane].length
      ) {
        cpuCaravans[disbandLane].splice(0, cpuCaravans[disbandLane].length);
        cpuDirection[disbandLane] = 0;
        message = api[2] + ' DISBANDED';
        soundKind = 1;
      } else {
        if (cpuHand.length) cpuHand.splice(0, 1);
        drawCpuCard();
        message = api[2] + ' DISCARDED';
        soundKind = 1;
      }
    } else if (encodedMove < 0 || !cpuHand.length) {
      if (cpuHand.length) cpuHand.splice(0, 1);
      drawCpuCard();
      message = api[2] + ' DISCARDED';
      soundKind = 1;
    } else {
      const cpuHandIndex = encodedMove >> 13;
      const targetIsPlayer = (encodedMove >> 12) & 1;
      const laneIndex = (encodedMove >> 10) & 3;
      const baseIndex = (encodedMove & 1023) - 1;
      const card = cpuHand[cpuHandIndex];
      if (engine[0](card)) {
        engine[5](cpuCaravans, cpuDirection, laneIndex, card);
      } else if (targetIsPlayer) {
        engine[6](
          playerCaravans,
          playerDirection,
          laneIndex,
          baseIndex,
          card,
          playerCaravans,
          cpuCaravans,
          playerDirection,
          cpuDirection,
        );
      } else {
        engine[6](
          cpuCaravans,
          cpuDirection,
          laneIndex,
          baseIndex,
          card,
          playerCaravans,
          cpuCaravans,
          playerDirection,
          cpuDirection,
        );
      }
      cpuHand.splice(cpuHandIndex, 1);
      if (!opening) drawCpuCard();
      message = api[2] + ' PLAYED';
      soundKind = 0;
    }
    turnCount++;
    const outcome = currentResult();
    if (outcome) {
      finishGame(outcome);
      if (audio) audio[1](soundKind);
      return;
    }
    cpuTurn = 1;
    drawGame();
    if (audio) audio[1](soundKind);
    cpuTimer = setTimeout(beginPlayerTurn, engine[11]());
  }

  // --- Hardware input handlers ---
  function scrollHand(direction: KnobDirection): void {
    if (!direction || !playerHand.length) return;
    if (direction < 0 && handIndex === 0) {
      laneMode = 3;
      targetIndex = 2;
      message = 'YOUR TURN';
      Pip.playSound('SCROLL');
      drawGame();
      return;
    }
    const previousHandIndex = handIndex;
    if (direction > 0) {
      if (handIndex >= playerHand.length - 1) return;
      handIndex++;
    } else {
      handIndex--;
    }
    renderState[4] = handIndex;
    Pip.playSound('SCROLL');
    if (renderer) renderer[1](renderState, previousHandIndex);
  }

  function handleRightKnob(direction: KnobDirection): void {
    if (direction) handleKnob(direction);
  }

  function handleKnob(direction: KnobDirection): void {
    if (!ready || finished || cpuTurn) return;
    if (faceMode) {
      onFaceKnob(direction);
      return;
    }
    if (actionMenuOpen) {
      if (!direction) {
        confirmAction();
        return;
      }
      const previousSelection = actionSelection,
        maximumSelection = actionMenuOpen === 2 ? 1 : 2;
      actionSelection += direction > 0 ? 1 : -1;
      if (actionSelection < 0) actionSelection = maximumSelection;
      if (actionSelection > maximumSelection) actionSelection = 0;
      syncRenderState();
      Pip.playSound('SCROLL');
      if (renderer) renderer[4](renderState, 0, previousSelection);
      return;
    }
    if (laneMode) {
      onLaneKnob(direction);
      return;
    }
    if (!direction) {
      openActionMenu();
      return;
    }
    scrollHand(direction);
  }

  // --- Rematch reset and module loading ---
  function bootMatch(): void {
    bootTimer = 0;
    if (removed) return;
    E.defrag();
    if (!engine)
      engine = loadModule('CARAVAN_GAME_ENGINE.MIN.JS') as CaravanEngine;
    E.defrag();
    if (!renderer)
      renderer = loadModule('CARAVAN_DRAW_SCREEN.MIN.JS', [
        fs,
        basePath,
      ]) as CaravanRenderer;
    playerDeck = engine[9](engine[8](0));
    cpuDeck = engine[9](engine[8](1));
    playerDeckPosition = cpuDeckPosition = 0;
    playerHand = [];
    cpuHand = [];
    playerCaravans = [[], [], []];
    cpuCaravans = [[], [], []];
    playerDirection = new Int8Array(3);
    cpuDirection = new Int8Array(3);
    handIndex =
      targetIndex =
      cpuTurn =
      turnCount =
      finished =
      actionMenuOpen =
      actionSelection =
      laneMode =
        0;
    clearFaceTarget();
    dealStartingHands();
    message = 'OPENING - YOUR TURN';
    renderState = createRenderState();
    drawGame();
    h.flip();
    Pip.lastFlip = getTime();
    process.memory(true);
    E.defrag();
    if (!audio)
      audio = loadModule('CARAVAN_GAME_AUDIO.MIN.JS', [
        fs,
        basePath,
      ]) as CaravanGameAudio;
    if (audio) audio[0]();
    // The controller already owns these handlers, so avoid eval-loading a
    // separate controls wrapper every match. onExclusive replaces any stale
    // empty listener entries left by the prior Results screen.
    Pip.onExclusive('knob1', handleKnob);
    Pip.onExclusive('knob2', handleRightKnob);
    inputAttached = 1;
    ready = 1;
  }

  function restartGame(newOpponent?: string): void {
    if (removed || bootTimer) return;
    if (newOpponent) api[2] = newOpponent;
    if (cpuTimer) clearTimeout(cpuTimer);
    if (finishTimer) clearTimeout(finishTimer);
    cpuTimer = finishTimer = 0;
    ready = 0;
    process.memory(true);
    bootTimer = setTimeout(bootMatch, 1);
  }

  function loadModule(
    fileName: string,
    moduleArguments?: CaravanRendererApi | CaravanGameAudioApi,
  ): CaravanLoadedModule {
    let sourceCode: string = fs.readFileSync(basePath + fileName);
    let moduleFactory = eval(sourceCode) as CaravanLoadedModuleFactory;
    sourceCode = 0 as never;
    const moduleObject =
      moduleArguments === undefined
        ? moduleFactory()
        : moduleFactory(moduleArguments);
    moduleFactory = 0 as never;
    process.memory(true);
    return moduleObject;
  }

  // --- Menu suspension ---
  function suspendForMenu(): void {
    if (removed) return;
    ready = 0;
    detachInput();
    // Keep Engine + the small idled Audio controller resident across the
    // post-game menu. Hardware isolation showed the fixed ~106-block loss
    // remained when Renderer stayed resident but Engine was re-evaluated,
    // identifying the Engine reload cycle as the remaining leak. Renderer
    // is much larger and safe to release here, which still leaves the
    // compact return menu plenty of headroom.
    if (renderer) renderer[6]();
    renderer = 0 as never;
    process.memory(true);
    E.defrag();
  }

  function suspendForHeavyMenu(): void {
    if (removed) return;
    ready = 0;
    detachInput();
    if (renderer) renderer[6]();
    renderer = 0 as never;
    // Heavy post-game tools need extra eval headroom. Release only the
    // idled Audio controller and keep Engine resident so the proven Engine
    // reload leak cannot return.
    if (audio) audio[3]();
    audio = 0 as never;
    process.memory(true);
    E.defrag();
  }

  // --- Final cleanup ---
  function removeGame(): void {
    if (removed) return;
    removed = 1;
    if (cpuTimer) clearTimeout(cpuTimer);
    if (finishTimer) clearTimeout(finishTimer);
    if (bootTimer) clearTimeout(bootTimer);
    cpuTimer = finishTimer = bootTimer = 0;
    ready = 0;
    detachInput();
    if (audio) audio[3]();
    audio = 0 as never;
    if (renderer) renderer[6]();
    renderer = 0 as never;
    engine = 0 as never;
    renderState = 0 as never;
    message = 0 as never;
    playerDeck =
      cpuDeck =
      playerHand =
      cpuHand =
      playerCaravans =
      cpuCaravans =
      playerDirection =
      cpuDirection =
        0 as never;
    api[3] = 0;
    process.memory(true);
  }
  bootTimer = setTimeout(bootMatch, 1);
  return [removeGame, restartGame, suspendForMenu, suspendForHeavyMenu];
});
