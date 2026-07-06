// 
// 5 Card Draw / 7 Card Draw, single player vs. dealer.
// =============================================================================
//  Name: Poker (Pip-Boy holotape)
//  Author: Theeohn Megistus
//  License: MIT
//  Repository: https://github.com/Theeohn/Poker-3000a-
// =============================================================================
(function() {
  const C = {
    START_CHIPS: 500,
    MIN_BET: 10,
    BET_STEP: 10,
    CARD_W: 42,
    CARD_H: 60,
    CARD_SPACING: 52,
  };
  const STATES = { TITLE: 0, BET: 1, DRAW: 2, RESULT: 3 };
  const MODES = ['5 CARD DRAW', '7 CARD DRAW'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUITS = ['C', 'D', 'H', 'S'];
  const CATS = ['', 'HIGH CARD', 'PAIR', 'TWO PAIR', 'TRIPS', 'STRAIGHT', 'FLUSH', 'FULL HOUSE', 'QUADS', 'STR8 FLUSH'];

  let deck, chips, bet, mode, cursor, playerHand, dealerHand, discardMarks;
  let gameState, result, pCat, dCat, redrawInterval;

  function getHandSize(m) { return m === 1 ? 7 : 5; }

  // --- Deck & cards ---
  // Cards are ints 0-51: rank = c % 13 (0=A..12=K), suit = (c/13)|0.

  function buildDeck() {
    let d = [];
    for (let i = 0; i < 52; i++) d.push(i);
    for (let i = d.length - 1; i > 0; i--) {
      let j = Math.randInt(i + 1);
      let t = d[i]; d[i] = d[j]; d[j] = t;
    }
    return d;
  }

  function dealOneCard() {
    if (deck.length === 0) deck = buildDeck();
    return deck.pop();
  }

  function rankIdx(c) { return c % 13; }
  function suitIdx(c) { return (c / 13) | 0; }
  function rankVal(c) { let r = rankIdx(c); return r === 0 ? 14 : r + 1; }

  // --- Hand evaluation ---
  // Score = [category, k0..k4] compared lexicographically. 9=straight flush ... 1=high card.

  function scoreHand(cards) {
    let ranks = [], suits = [];
    for (let i = 0; i < 5; i++) {
      ranks.push(rankVal(cards[i]));
      suits.push(suitIdx(cards[i]));
    }
    ranks.sort(function (a, b) { return b - a; });

    let flush = suits[0] === suits[1] && suits[0] === suits[2] && suits[0] === suits[3] && suits[0] === suits[4];

    let uniq = [];
    for (let i = 0; i < 5; i++) if (uniq.indexOf(ranks[i]) < 0) uniq.push(ranks[i]);
    let straight = false, high = 0;
    if (uniq.length === 5) {
      if (uniq[0] - uniq[4] === 4) { straight = true; high = uniq[0]; }
      else if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) { straight = true; high = 5; }
    }

    let counts = {};
    for (let i = 0; i < 5; i++) counts[ranks[i]] = (counts[ranks[i]] || 0) + 1;
    let groups = [];
    for (let k in counts) groups.push([+k, counts[k]]);
    groups.sort(function (a, b) { return b[1] - a[1] || b[0] - a[0]; });

    let cat, k0 = 0, k1 = 0, k2 = 0, k3 = 0, k4 = 0;
    if (straight && flush) { cat = 9; k0 = high; }
    else if (groups[0][1] === 4) { cat = 8; k0 = groups[0][0]; k1 = groups[1][0]; }
    else if (groups[0][1] === 3 && groups[1][1] === 2) { cat = 7; k0 = groups[0][0]; k1 = groups[1][0]; }
    else if (flush) { cat = 6; k0 = ranks[0]; k1 = ranks[1]; k2 = ranks[2]; k3 = ranks[3]; k4 = ranks[4]; }
    else if (straight) { cat = 5; k0 = high; }
    else if (groups[0][1] === 3) { cat = 4; k0 = groups[0][0]; k1 = groups[1][0]; k2 = groups[2][0]; }
    else if (groups[0][1] === 2 && groups[1][1] === 2) { cat = 3; k0 = groups[0][0]; k1 = groups[1][0]; k2 = groups[2][0]; }
    else if (groups[0][1] === 2) { cat = 2; k0 = groups[0][0]; k1 = groups[1][0]; k2 = groups[2][0]; k3 = groups[3][0]; }
    else { cat = 1; k0 = ranks[0]; k1 = ranks[1]; k2 = ranks[2]; k3 = ranks[3]; k4 = ranks[4]; }

    return [cat, k0, k1, k2, k3, k4];
  }

  function cmpScore(a, b) {
    for (let i = 0; i < 6; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  }

  function bestScore(hand) {
    if (hand.length === 5) return scoreHand(hand);
    let best = null;
    for (let x = 0; x < 7; x++) {
      for (let y = x + 1; y < 7; y++) {
        let sub = [];
        for (let i = 0; i < 7; i++) if (i !== x && i !== y) sub.push(hand[i]);
        let s = scoreHand(sub);
        if (!best || cmpScore(s, best) > 0) best = s;
      }
    }
    return best;
  }

  // Simple dealer strategy: keep any paired rank, keep unpaired J/Q/K/A, redraw the rest.
  function dealerDiscards(hand) {
    let counts = {};
    for (let i = 0; i < hand.length; i++) {
      let r = rankVal(hand[i]);
      counts[r] = (counts[r] || 0) + 1;
    }
    let marks = [];
    for (let i = 0; i < hand.length; i++) {
      let r = rankVal(hand[i]);
      marks.push(counts[r] < 2 && r < 11);
    }
    return marks;
  }

  function applyDraw(hand, marks) {
    for (let i = 0; i < hand.length; i++) if (marks[i]) hand[i] = dealOneCard();
  }

  // --- Game logic ---

  function initGame() {
    chips = C.START_CHIPS;
    mode = 0;
    cursor = 0;
    playerHand = [];
    dealerHand = [];
    result = '';
    gameState = STATES.TITLE;
  }

  function startBet() {
    bet = C.MIN_BET;
    cursor = 0;
    gameState = STATES.BET;
  }

  function backToTitle() {
    cursor = mode;
    gameState = STATES.TITLE;
  }

  function dealHands() {
    deck = buildDeck();
    let n = getHandSize(mode);
    playerHand = [];
    dealerHand = [];
    for (let i = 0; i < n; i++) playerHand.push(dealOneCard());
    for (let i = 0; i < n; i++) dealerHand.push(dealOneCard());

    discardMarks = [];
    for (let i = 0; i < n; i++) discardMarks.push(false);
    cursor = 0;
    gameState = STATES.DRAW;
  }

  function confirmDraw() {
    applyDraw(playerHand, discardMarks);
    applyDraw(dealerHand, dealerDiscards(dealerHand));
    resolveShowdown();
  }

  function resolveShowdown() {
    let pScore = bestScore(playerHand);
    let dScore = bestScore(dealerHand);
    pCat = pScore[0];
    dCat = dScore[0];
    let cmp = cmpScore(pScore, dScore);

    if (cmp > 0) { result = 'YOU WIN - ' + CATS[pCat]; chips += bet; }
    else if (cmp < 0) { result = 'DEALER WINS - ' + CATS[dCat]; chips -= bet; }
    else { result = 'PUSH - ' + CATS[pCat]; }

    if (chips <= 0) { chips = 0; result += ' - BROKE!'; }
    gameState = STATES.RESULT;
  }

  // --- Drawing ---

  function drawCardAt(card, x, y, hidden) {
    h.setColor(2).fillRect(x, y, x + C.CARD_W, y + C.CARD_H);
    h.setColor(1).drawRect(x, y, x + C.CARD_W, y + C.CARD_H);
    h.setColor(0).setFontMonofonto23().setFontAlign(0, 0);
    if (hidden) { h.drawString('?', x + C.CARD_W / 2, y + C.CARD_H / 2); return; }
    h.drawString(RANKS[rankIdx(card)], x + C.CARD_W / 2, y + C.CARD_H / 2);
    h.setFontMonofonto18().setFontAlign(1, 1).drawString(SUITS[suitIdx(card)], x + C.CARD_W - 2, y + C.CARD_H + 3);
  }

  function drawHand(hand, startY, hideAll) {
    for (let i = 0; i < hand.length; i++) {
      drawCardAt(hand[i], 70 + i * C.CARD_SPACING, startY, hideAll);
    }
  }

  // Suit vector art - each built from filled circles + a polygon point/stem,
  function drawHeart(cx, cy, r) {
    h.fillCircle(cx - r * 0.5, cy - r * 0.3, r * 0.5);
    h.fillCircle(cx + r * 0.5, cy - r * 0.3, r * 0.5);
    h.fillPoly([cx - r, cy - r * 0.1, cx + r, cy - r * 0.1, cx, cy + r]);
  }

  function drawSpade(cx, cy, r) {
    h.fillCircle(cx - r * 0.5, cy + r * 0.3, r * 0.5);
    h.fillCircle(cx + r * 0.5, cy + r * 0.3, r * 0.5);
    h.fillPoly([cx - r, cy + r * 0.1, cx + r, cy + r * 0.1, cx, cy - r]);
    h.fillPoly([cx - r * 0.3, cy + r * 0.3, cx + r * 0.3, cy + r * 0.3, cx, cy + r * 1.15]);
  }

  function drawDiamond(cx, cy, r) {
    h.fillPoly([cx, cy - r, cx + r * 0.65, cy, cx, cy + r, cx - r * 0.65, cy]);
  }

  function drawClub(cx, cy, r) {
    h.fillCircle(cx, cy - r * 0.45, r * 0.5);
    h.fillCircle(cx - r * 0.45, cy + r * 0.15, r * 0.5);
    h.fillCircle(cx + r * 0.45, cy + r * 0.15, r * 0.5);
    h.fillPoly([cx - r * 0.3, cy + r * 0.15, cx + r * 0.3, cy + r * 0.15, cx, cy + r * 1.1]);
  }

  function drawTitleScreen() {
    h.setColor(2);
    drawSpade(65, 85, 25);
    drawHeart(415, 85, 25);
    drawDiamond(65, 235, 25);
    drawClub(415, 235, 25);
    h.setColor(3).setFontMonofonto36().setFontAlign(0, 0).drawString('POKER', 240, 95);
    for (let i = 0; i < 2; i++) {
      let y = 175 + i * 50;
      if (i === cursor) Pip.shadeBox(120, y - 12, 360, y + 12);
      h.setColor(3).setFontMonofonto18().setFontAlign(0, 0).drawString(MODES[i], 240, y);
    }
    h.setColor(2).setFontMonofonto14().setFontAlign(0, 0).drawString('Left wheel to select game mode', 240, 294);
  }

  function drawBetScreen() {
    h.setColor(2).setFontMonofonto16().setFontAlign(-1, 0).drawString('CHIPS: ' + chips, 30, 29);
    h.setColor(3).setFontMonofonto18().setFontAlign(1, 0).drawString('BET: ' + bet, 450, 29);
    h.setColor(3).setFontMonofonto23().setFontAlign(0, 0).drawString(MODES[mode], 240, 60);
    h.setColor(3).setFontMonofonto28().setFontAlign(0, 0).drawString('RIGHT WHEEL TO PLACE YOUR BET!', 240, 135);
    let opts = [chips <= 0 ? 'PRESS TO RESTART' : 'PRESS TO PLAY', 'CHANGE GAME'];
    for (let i = 0; i < 2; i++) {
      let y = 200 + i * 45;
      if (i === cursor) Pip.shadeBox(120, y - 14, 360, y + 14);
      h.setColor(3).setFontMonofonto16().setFontAlign(0, 0).drawString(opts[i], 240, y);
    }
    h.setColor(2).setFontMonofonto14().setFontAlign(0, 0).drawString('Left wheel to select', 240, 294);
  }

  function drawDrawScreen() {
    let n = getHandSize(mode);
    h.setColor(3).setFontMonofonto16().setFontAlign(-1, 0).drawString('CHIPS: ' + chips, 30, 29);
    h.setColor(3).setFontMonofonto16().setFontAlign(1, 0).drawString('BET: ' + bet, 450, 29);
    h.setColor(3).setFontMonofonto23().setFontAlign(0, 0).drawString(MODES[mode], 240, 60);
    h.setColor(3).setFontMonofonto16().setFontAlign(-1, 0).drawString('DEALER', 60, 69);
    drawHand(dealerHand, 89, true);
    h.setColor(3).setFontMonofonto16().setFontAlign(-1, 0).drawString('YOUR HAND', 60, 177);
    drawHand(playerHand, 197, false);
    for (let i = 0; i < n; i++) {
      let x = 70 + i * C.CARD_SPACING;
      if (i === cursor) h.setColor(3).drawRect(x - 2, 195, x + C.CARD_W + 2, 275);
      h.setColor(discardMarks[i] ? 2 : 3).setFontMonofonto14().setFontAlign(0, 0)
        .drawString(discardMarks[i] ? 'DISC' : 'HOLD', x + C.CARD_W / 2, 271);
    }
    if (cursor === n) Pip.shadeBox(190, 289, 290, 309);
    h.setColor(3).setFontMonofonto16().setFontAlign(0, 0).drawString('DRAW', 240, 299);
  }

  function drawResultScreen() {
    h.setColor(3).setFontMonofonto18().setFontAlign(-1, 0).drawString('CHIPS: ' + chips, 30, 29);
    h.setColor(2).setFontMonofonto16().setFontAlign(1, 0).drawString('BET: ' + bet, 450, 29);
    h.setColor(3).setFontMonofonto16().setFontAlign(-1, 0).drawString('DEALER - ' + CATS[dCat], 60, 69);
    drawHand(dealerHand, 89, false);
    h.setColor(3).setFontMonofonto16().setFontAlign(-1, 0).drawString('YOU - ' + CATS[pCat], 60, 177);
    drawHand(playerHand, 197, false);
    let isLoss = result.indexOf('DEALER WINS') >= 0 || result.indexOf('BROKE') >= 0;
    h.setColor(isLoss ? 3 : 3).setFontMonofonto18().setFontAlign(0, 0).drawString(result, 240, 279);
    h.setColor(2).setFontMonofonto16().setFontAlign(0, 0).drawString('PRESS TO CONTINUE', 240, 299);
  }

  function drawAll() { "ram";
    h.clear(1);
    if (gameState === STATES.TITLE) drawTitleScreen();
    else if (gameState === STATES.BET) drawBetScreen();
    else if (gameState === STATES.DRAW) drawDrawScreen();
    else drawResultScreen();
    h.flip();
    Pip.lastFlip = getTime();
  }

  // --- Input ---
  // Title screen: knob1 rotation moves the mode selector, knob1 press chooses it.
  // Betting: knob1 rotation moves the PLAY/CHANGE GAME selector, knob1 press
  // confirms it (deal, or return to the title screen); knob2 rotation adjusts
  // the bet amount.
  // Draw phase: either knob scrolls left/right across the cards one at a time,
  // wrapping to the DRAW button only when you scroll past the far left or
  // right card; either knob's press toggles hold/discard on the selected
  // card, or confirms the draw once the cursor is on the DRAW button.

  function onKnob1(dir) { "ram";
    if (dir) {
      if (gameState === STATES.TITLE) {
        cursor = E.clip(cursor + dir, 0, 1);
      } else if (gameState === STATES.BET) {
        cursor = E.clip(cursor + dir, 0, 1);
      } else if (gameState === STATES.DRAW) {
        let n = getHandSize(mode);
        cursor = (cursor + dir + n + 1) % (n + 1);
      } else {
        return;
      }
      Pip.playSound('SCROLL');
      drawAll();
      return;
    }

    if (gameState === STATES.TITLE) {
      mode = cursor;
      startBet();
    } else if (gameState === STATES.BET) {
      if (cursor === 1) { backToTitle(); }
      else if (chips <= 0) { chips = C.START_CHIPS; bet = C.MIN_BET; }
      else dealHands();
    } else if (gameState === STATES.DRAW) {
      let n = getHandSize(mode);
      if (cursor < n) discardMarks[cursor] = !discardMarks[cursor];
      else confirmDraw();
    } else if (gameState === STATES.RESULT) {
      startBet();
    }
    Pip.playSound('TAB');
    drawAll();
  }

  // knob2: during betting, rotation adjusts the bet amount only (no press
  // action - the PLAY/CHANGE GAME selection is knob1's job); during the draw
  // phase, it scrolls card-by-card and toggles discards, identical to knob1.
  function onKnob2(dir) { "ram";
    if (dir) {
      if (gameState === STATES.BET) {
        bet = Math.min(chips, Math.max(C.MIN_BET, bet - dir * C.BET_STEP));
      } else if (gameState === STATES.DRAW) {
        let n = getHandSize(mode);
        cursor = (cursor + dir + n + 1) % (n + 1);
      } else {
        return;
      }
      Pip.playSound('SCROLL');
      drawAll();
      return;
    }

    if (gameState === STATES.DRAW) {
      let n = getHandSize(mode);
      if (cursor < n) discardMarks[cursor] = !discardMarks[cursor];
      else confirmDraw();
      Pip.playSound('TAB');
      drawAll();
    }
  }

  // --- Lifecycle ---

  function start() {
    h.clear();
    Pip.audioStop();
    initGame();

    Pip.onExclusive('knob1', onKnob1);
    Pip.onExclusive('knob2', onKnob2);

    redrawInterval = setInterval(drawAll, 1000);
    drawAll();
  }

  function remove() {
    if (redrawInterval) clearInterval(redrawInterval);
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
    Pip.audioStop();
    h.clear();
    h.flip();
  }

  start();

  return {
    id: 'Poker',
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
