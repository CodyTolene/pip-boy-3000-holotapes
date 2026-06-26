(function () {
  const START_CHIPS = 500;
  const MIN_BET = 10;
  const BET_STEP = 10;
  const CARD_W = 42;
  const CARD_H = 60;
  const CARD_SPACING = 52;
  const STATES = {
    BET: 'bet',
    PLAYER: 'player',
    DEALER: 'dealer',
    RESULT: 'result',
  };
  const ACTIONS = ['HIT', 'STAND'];

  let deck, chips, bet, playerHand, dealerHand, gameState, actionIndex, result;
  let removed = false;
  let clickWatch;
  let redrawInterval;

  // --- Deck ---

  function buildDeck() {
    let ranks = [
      'A',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      'J',
      'Q',
      'K',
    ];
    let d = [];
    for (let s = 0; s < 4; s++) {
      for (let r = 0; r < ranks.length; r++) {
        d.push(ranks[r]);
      }
    }
    for (let i = d.length - 1; i > 0; i--) {
      let j = Math.randInt(i + 1);
      let tmp = d[i];
      d[i] = d[j];
      d[j] = tmp;
    }
    return d;
  }

  function dealOneCard() {
    if (deck.length === 0) deck = buildDeck();
    return deck.pop();
  }

  // --- Hand value ---

  function cardValue(rank) {
    if (rank === 'A') return 11;
    if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
    return parseInt(rank);
  }

  function handValue(hand) {
    let total = 0,
      aces = 0;
    for (let i = 0; i < hand.length; i++) {
      let v = cardValue(hand[i]);
      if (hand[i] === 'A') aces++;
      total += v;
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }

  function isBust(hand) {
    return handValue(hand) > 21;
  }
  function isBlackjack(hand) {
    return hand.length === 2 && handValue(hand) === 21;
  }

  // --- Game logic ---

  function initGame() {
    chips = START_CHIPS;
    bet = MIN_BET;
    deck = buildDeck();
    gameState = STATES.BET;
    actionIndex = 0;
    playerHand = [];
    dealerHand = [];
    result = '';
  }

  function dealHands() {
    playerHand = [dealOneCard(), dealOneCard()];
    dealerHand = [dealOneCard(), dealOneCard()];
    actionIndex = 0;

    if (isBlackjack(playerHand)) {
      resolveDealerTurn();
      return;
    }

    gameState = STATES.PLAYER;
    drawAll();
  }

  function resolveDealerTurn() {
    while (handValue(dealerHand) < 17) {
      dealerHand.push(dealOneCard());
    }

    let pVal = handValue(playerHand);
    let dVal = handValue(dealerHand);
    let pBJ = isBlackjack(playerHand);
    let dBJ = isBlackjack(dealerHand);

    if (pBJ && dBJ) {
      result = 'PUSH';
    } else if (pBJ) {
      result = 'BLACKJACK!';
      chips += Math.floor(bet * 1.5) + bet;
    } else if (isBust(playerHand)) {
      result = 'BUST...';
      chips -= bet;
    } else if (isBust(dealerHand)) {
      result = 'DEALER BUSTS!';
      chips += bet;
    } else if (pVal > dVal) {
      result = 'YOU WIN!';
      chips += bet;
    } else if (dVal > pVal) {
      result = 'DEALER WINS...';
      chips -= bet;
    } else {
      result = 'PUSH';
    }

    if (chips <= 0) {
      chips = 0;
      result = result + ' - BROKE!';
    }
    gameState = STATES.RESULT;
    drawAll();
  }

  function playerHit() {
    playerHand.push(dealOneCard());
    if (isBust(playerHand)) {
      resolveDealerTurn();
    } else {
      drawAll();
    }
  }

  function playerStand() {
    resolveDealerTurn();
  }

  // --- Drawing ---

  function drawCardAt(rank, x, y, faceDown) {
    h.setColor(2).fillRect(x, y, x + CARD_W, y + CARD_H);
    h.setColor(1).drawRect(x, y, x + CARD_W, y + CARD_H);
    if (faceDown) {
      h.setColor(0)
        .setFontMonofonto23()
        .setFontAlign(0, 0)
        .drawString('?', x + CARD_W / 2, y + CARD_H / 2);
    } else {
      h.setColor(0)
        .setFontMonofonto23()
        .setFontAlign(0, 0)
        .drawString(rank, x + CARD_W / 2, y + CARD_H / 2);
    }
  }

  function drawHand(hand, startY, hideFirst) {
    let startX = 70;
    for (let i = 0; i < hand.length; i++) {
      drawCardAt(
        hand[i],
        startX + i * CARD_SPACING,
        startY,
        i === 0 && hideFirst,
      );
    }
  }

  function drawAll() {
    h.clear(1);

    // Top bar
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(-1, 0)
      .drawString('CHIPS: ' + chips, 30, 29);
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(1, 0)
      .drawString('BET: ' + bet, 450, 29);

    // Dealer area
    let hideDealer = gameState === STATES.PLAYER;
    let dealerScore = hideDealer ? '?' : handValue(dealerHand);
    h.setColor(2)
      .setFontMonofonto18()
      .setFontAlign(-1, 0)
      .drawString('DEALER', 60, 69);
    h.setColor(3).drawRect(144, 55, 188, 83);
    h.drawRect(145, 56, 187, 82);
    h.setFontMonofonto18()
      .setFontAlign(0, 0)
      .drawString('' + dealerScore, 166, 69);
    drawHand(dealerHand, 89, hideDealer);

    // Player area
    let playerScore = handValue(playerHand);
    h.setColor(2)
      .setFontMonofonto18()
      .setFontAlign(-1, 0)
      .drawString('PLAYER', 60, 177);
    if (playerHand.length > 0) {
      h.setColor(3).drawRect(144, 163, 188, 191);
      h.drawRect(145, 164, 187, 190);
      h.setFontMonofonto18()
        .setFontAlign(0, 0)
        .drawString('' + playerScore, 166, 177);
    }
    drawHand(playerHand, 197, false);

    // Bottom action area
    if (gameState === STATES.BET) {
      h.setColor(2)
        .setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString('LEFT WHEEL: ADJUST BET', 240, 279);
      Pip.shadeBox(140, 289, 340, 309);
      h.setColor(3)
        .setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString('PRESS TO DEAL', 240, 299);
    } else if (gameState === STATES.PLAYER) {
      for (let i = 0; i < ACTIONS.length; i++) {
        let x = 160 + i * 160;
        if (i === actionIndex) {
          Pip.shadeBox(x - 60, 282, x + 60, 309);
        }
        h.setColor(3)
          .setFontMonofonto18()
          .setFontAlign(0, 0)
          .drawString(ACTIONS[i], x, 299);
      }
    } else if (gameState === STATES.RESULT) {
      let isLoss =
        result === 'DEALER WINS' ||
        result.indexOf('BUST') >= 0 ||
        result.indexOf('BROKE') >= 0;
      h.setColor(isLoss ? 1 : 3)
        .setFontMonofonto23()
        .setFontAlign(0, 0)
        .drawString(result, 240, 287);
      h.setColor(2)
        .setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString('PRESS TO CONTINUE', 240, 307);
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  // --- Input ---

  function onLeftWheel(d) {
    if (gameState === STATES.BET) {
      bet = Math.max(MIN_BET, Math.min(chips, bet - d * BET_STEP));
      drawAll();
    }
  }

  function onRightWheel(d) {
    if (gameState === STATES.PLAYER) {
      actionIndex = (actionIndex + d + ACTIONS.length) % ACTIONS.length;
      Pip.playSound('SCROLL');
      drawAll();
    }
  }

  function onClick() {
    if (gameState === STATES.BET) {
      if (chips <= 0) {
        initGame();
        drawAll();
        return;
      }
      dealHands();
    } else if (gameState === STATES.PLAYER) {
      if (ACTIONS[actionIndex] === 'HIT') {
        playerHit();
      } else {
        playerStand();
      }
    } else if (gameState === STATES.RESULT) {
      bet = MIN_BET;
      actionIndex = 0;
      playerHand = [];
      dealerHand = [];
      result = '';
      gameState = STATES.BET;
      drawAll();
    }
  }

  // --- Lifecycle ---

  function start() {
    h.clear();
    Pip.audioStop();
    initGame();

    Pip.onExclusive('knob1', onLeftWheel);
    Pip.onExclusive('knob2', onRightWheel);

    clickWatch = setWatch(onClick, ENC1_PRESS, {
      repeat: true,
      edge: 'rising',
      debounce: 50,
    });

    redrawInterval = setInterval(drawAll, 1000);
    drawAll();
  }

  function remove() {
    if (removed) return;
    removed = true;

    if (redrawInterval) clearInterval(redrawInterval);
    if (clickWatch) clearWatch(clickWatch);
    Pip.removeListener('knob1', onLeftWheel);
    Pip.removeListener('knob2', onRightWheel);

    Pip.audioStop();
    h.clear();
    h.flip();
  }

  start();

  return {
    id: 'blackjack',
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
