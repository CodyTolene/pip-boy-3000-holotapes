/*
 * CARAVAN - lightweight Bet/Deck flow used by the post-game return menu.
 */
(function (api: CaravanPlayMenuApi): CaravanDisposable {
  let screen = 1,
    selection = 0,
    ante = api.ante === undefined ? 50 : api.ante,
    funds = api.funds === undefined ? 500 : api.funds,
    opponentFunds = api.opponentFunds === undefined ? 500 : api.opponentFunds,
    opponent = api.opponent || 'Ringo',
    removed = 0;

  function rowY(row: number): number {
    return 92 + row * 36;
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
  function drawRow(text: string, row: number, active: number | boolean): void {
    const y = rowY(row);
    h.setColor(3).drawString(text, 42, y);
    if (active) h.drawRect(28, y - 5, 452, y + 23);
  }
  function limit(): number {
    return funds < opponentFunds ? funds : opponentFunds;
  }
  function drawBet(): void {
    if (funds < 10 || opponentFunds < 10) {
      ante = 0;
      selection = 0;
    } else if (selection < 0 || selection > 3) selection = 0;
    drawHeader('CARAVAN - BET');
    h.drawRect(22, 48, 458, 138)
      .drawString(opponent + "'s Current Ante: " + opponentFunds, 38, 60)
      .drawString('Your Current Ante: ' + ante, 38, 86)
      .drawString('Your Total Funds: ' + funds, 38, 112);
    if (funds < 10) {
      drawRow('Not enough bottle caps to play...CLICK HERE!', 3, 1);
      return;
    }
    if (opponentFunds < 10) {
      drawRow('Opponent has no bottle caps...CLICK HERE!', 3, 1);
      return;
    }
    drawRow('Auto-Match', 2, selection === 0);
    drawRow('Raise', 3, selection === 1);
    drawRow('Accept', 4, selection === 2);
    drawRow('Exit', 5, selection === 3);
  }
  function drawReset(): void {
    drawBet();
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
  function drawDeck(): void {
    if (selection < 0 || selection > 1) selection = 0;
    drawHeader('CARAVAN - BUILD DECK');
    h.drawRect(22, 48, 458, 126)
      .drawString('Cards in Deck: 54', 38, 62)
      .drawString('Total Cards: 54', 38, 88)
      .drawString('Caravan Deck', 326, 62);
    drawRow('Play Caravan', 3, selection === 0);
    drawRow('< Back', 4, selection === 1);
  }
  function state(): CaravanSessionState {
    return {
      ante: ante,
      funds: funds,
      opponentFunds: opponentFunds,
      opponent: opponent,
    };
  }
  function detach(): void {
    // This screen owns both knob events via onExclusive(). Remove the
    // event properties completely rather than only removing one callback.
    try {
      Pip.removeAllListeners('knob1');
    } catch (e) {
      try {
        Pip.removeListener('knob1', onKnob1);
      } catch (e2) {}
    }
    try {
      Pip.removeAllListeners('knob2');
    } catch (e) {
      try {
        Pip.removeListener('knob2', onKnob2);
      } catch (e2) {}
    }
  }
  function leave(
    callback: ((state: CaravanSessionState) => void) | 0 | undefined,
  ): void {
    const savedState = state(),
      savedCallback = callback;
    detach();
    removed = 1;
    // Break both parent callback links before invoking the selected one.
    api.onStartGame = 0;
    api.onBack = 0;
    if (savedCallback) savedCallback(savedState);
  }
  function redrawValues(): void {
    h.clearRect(30, 54, 448, 132)
      .setColor(3)
      .drawString(opponent + "'s Current Ante: " + opponentFunds, 38, 60)
      .drawString('Your Current Ante: ' + ante, 38, 86)
      .drawString('Your Total Funds: ' + funds, 38, 112);
  }
  function onKnob2(direction: KnobDirection): void {
    let max;
    if (
      removed ||
      screen !== 1 ||
      !direction ||
      funds < 10 ||
      opponentFunds < 10
    )
      return;
    max = limit();
    ante += direction > 0 ? 10 : -10;
    if (ante < 10) ante = 10;
    if (ante > max) ante = max;
    Pip.playSound('SCROLL');
    redrawValues();
  }
  function onKnob1(direction: KnobDirection): void {
    let count;
    if (removed) return;
    if (direction) {
      count =
        screen === 1
          ? funds < 10 || opponentFunds < 10
            ? 1
            : 4
          : screen === 2
            ? 2
            : 1;
      selection += direction > 0 ? 1 : -1;
      if (selection < 0) selection = count - 1;
      if (selection >= count) selection = 0;
      Pip.playSound('SCROLL');
      if (screen === 1) drawBet();
      else if (screen === 2) drawDeck();
      return;
    }
    if (!(screen === 2 && selection === 0)) Pip.playSound('SELECT');
    if (screen === 5) {
      funds = 500;
      opponentFunds = 500;
      ante = Math.min(50, limit());
      screen = 1;
      selection = 0;
      drawBet();
      return;
    }
    if (screen === 1) {
      if (funds < 10 || opponentFunds < 10) {
        screen = 5;
        selection = 0;
        drawReset();
        return;
      }
      if (selection === 0) ante = Math.min(50, limit());
      else if (selection === 1) {
        ante += 10;
        if (ante > limit()) ante = limit();
      } else if (selection === 2) {
        if (ante < 10 || ante > limit()) {
          drawBet();
          return;
        }
        screen = 2;
        selection = 0;
        drawDeck();
        return;
      } else {
        leave(api.onBack);
        return;
      }
      drawBet();
      return;
    }
    if (screen === 2) {
      if (selection === 0) {
        leave(api.onStartGame);
        return;
      }
      screen = 1;
      selection = 2;
      drawBet();
    }
  }
  function remove(): void {
    if (removed) return;
    removed = 1;
    detach();
    api.onStartGame = 0;
    api.onBack = 0;
  }
  Pip.onExclusive('knob1', onKnob1);
  try {
    Pip.onExclusive('knob2', onKnob2);
  } catch (e) {
    try {
      Pip.removeAllListeners('knob1');
    } catch (e2) {
      Pip.removeListener('knob1', onKnob1);
    }
    throw e;
  }
  drawBet();
  return { remove: remove };
});
