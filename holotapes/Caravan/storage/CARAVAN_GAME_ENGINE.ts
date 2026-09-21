/*
 * CARAVAN - CARAVAN_GAME_ENGINE.JS
 * Caravan rules, deck logic, scoring, face-card behavior, and CPU choices.
 * Readable source only; installed runtime remains in the matching minified file.
 */
(function (): CaravanEngine {
  let randomSeed = ((Date.now() & 2147483647) ^ 1511508451) >>> 0;

  // --- Card primitives ---
  function rank(card: number): number {
    return card & 15;
  }

  function suit(card: number): number {
    return (card >> 4) & 3;
  }

  function isNumber(card: number): boolean {
    return rank(card) <= 10;
  }

  // --- Caravan stack helpers ---
  function baseCardCount(cards: CaravanCards): number {
    let numberCardCount = 0;
    for (let cardIndex = 0; cardIndex < cards.length; cardIndex++) {
      if (isNumber(cards[cardIndex])) numberCardCount++;
    }
    return numberCardCount;
  }

  function lastNumberIndex(cards: CaravanCards): number {
    for (let cardIndex = cards.length - 1; cardIndex >= 0; cardIndex--) {
      if (isNumber(cards[cardIndex])) return cardIndex;
    }
    return -1;
  }

  function groupEndIndex(cards: CaravanCards, baseIndex: number): number {
    let cardIndex = baseIndex + 1;
    while (cardIndex < cards.length && !isNumber(cards[cardIndex])) cardIndex++;
    return cardIndex;
  }

  function removeGroupAt(cards: CaravanCards, baseIndex: number): void {
    const endIndex = groupEndIndex(cards, baseIndex),
      removeCount = endIndex - baseIndex;
    let cardIndex, targetLength;
    if (removeCount <= 0) return;
    // Compact in place, but do not assign to Array.length directly.
    // The Pip-Boy 1.1.6 Espruino runtime can throw "Assignment to a constant"
    // from direct length mutation in this face-card path.
    targetLength = cards.length - removeCount;
    for (cardIndex = endIndex; cardIndex < cards.length; cardIndex++) {
      cards[cardIndex - removeCount] = cards[cardIndex];
    }
    while (cards.length > targetLength) cards.pop();
  }

  function groupValueAt(cards: CaravanCards, baseIndex: number): number {
    if (
      baseIndex < 0 ||
      baseIndex >= cards.length ||
      !isNumber(cards[baseIndex])
    )
      return 0;
    let groupValue = rank(cards[baseIndex]);
    for (
      let cardIndex = baseIndex + 1;
      cardIndex < cards.length && !isNumber(cards[cardIndex]);
      cardIndex++
    ) {
      if (rank(cards[cardIndex]) === 13) groupValue <<= 1;
    }
    return groupValue;
  }

  function lastNumberRank(cards: CaravanCards): number {
    const numberIndex = lastNumberIndex(cards);
    return numberIndex >= 0 ? rank(cards[numberIndex]) : 0;
  }

  // --- Direction and face-card rules ---
  function lastEffectiveSuit(cards: CaravanCards): number {
    const baseIndex = lastNumberIndex(cards);
    if (baseIndex < 0) return 0;
    let effectiveSuit = suit(cards[baseIndex]);
    const endIndex = groupEndIndex(cards, baseIndex);
    for (let cardIndex = baseIndex + 1; cardIndex < endIndex; cardIndex++) {
      if (rank(cards[cardIndex]) === 12) effectiveSuit = suit(cards[cardIndex]);
    }
    return effectiveSuit;
  }

  function computeDirection(cards: CaravanCards): number {
    let previousNumberIndex = -1,
      latestNumberIndex = -1,
      direction = 0;
    for (let cardIndex = 0; cardIndex < cards.length; cardIndex++) {
      if (isNumber(cards[cardIndex])) {
        previousNumberIndex = latestNumberIndex;
        latestNumberIndex = cardIndex;
      }
    }
    if (previousNumberIndex >= 0 && latestNumberIndex >= 0) {
      const latestRank = rank(cards[latestNumberIndex]);
      const previousRank = rank(cards[previousNumberIndex]);
      if (latestRank > previousRank) direction = 1;
      else if (latestRank < previousRank) direction = -1;
    }
    if (latestNumberIndex >= 0 && direction) {
      const endIndex = groupEndIndex(cards, latestNumberIndex);
      for (
        let cardIndex = latestNumberIndex + 1;
        cardIndex < endIndex;
        cardIndex++
      ) {
        if (rank(cards[cardIndex]) === 12) direction = -direction;
      }
    }
    return direction;
  }

  function refreshDirections(
    playerCaravans: CaravanCaravans,
    cpuCaravans: CaravanCaravans,
    playerDirections: CaravanDirections,
    cpuDirections: CaravanDirections,
  ): void {
    for (let laneIndex = 0; laneIndex < 3; laneIndex++) {
      playerDirections[laneIndex] = computeDirection(playerCaravans[laneIndex]);
      cpuDirections[laneIndex] = computeDirection(cpuCaravans[laneIndex]);
    }
  }

  function insertFaceAt(
    cards: CaravanCards,
    baseIndex: number,
    card: number,
  ): void {
    const insertIndex = groupEndIndex(cards, baseIndex);
    let cardIndex;
    // Grow with push() instead of cards.length++. Direct length mutation caused
    // a hardware Espruino "Assignment to a constant" crash on face-card play.
    cards.push(card);
    for (cardIndex = cards.length - 1; cardIndex > insertIndex; cardIndex--) {
      cards[cardIndex] = cards[cardIndex - 1];
    }
    cards[insertIndex] = card;
  }

  function removeJokerMatches(
    cards: CaravanCards,
    protectedCards: CaravanCards,
    protectedBaseIndex: number,
    targetRank: number,
    targetSuit: number,
    matchBySuit: boolean,
  ): void {
    for (let cardIndex = cards.length - 1; cardIndex >= 0; cardIndex--) {
      if (!isNumber(cards[cardIndex])) continue;
      if (cards === protectedCards && cardIndex === protectedBaseIndex)
        continue;
      const isMatch = matchBySuit
        ? suit(cards[cardIndex]) === targetSuit
        : rank(cards[cardIndex]) === targetRank;
      if (isMatch) removeGroupAt(cards, cardIndex);
    }
  }

  function playJoker(
    cards: CaravanCards,
    baseIndex: number,
    card: number,
    playerCaravans: CaravanCaravans,
    cpuCaravans: CaravanCaravans,
    playerDirections: CaravanDirections,
    cpuDirections: CaravanDirections,
  ): void {
    // Joker is the heaviest single board mutation. Collect transient garbage
    // first so a late-match Joker cannot be the allocation that tips the heap.
    process.memory(true);
    const targetRank = rank(cards[baseIndex]);
    const targetSuit = suit(cards[baseIndex]);
    const matchBySuit = targetRank === 1;
    insertFaceAt(cards, baseIndex, card);
    for (let laneIndex = 0; laneIndex < 3; laneIndex++) {
      removeJokerMatches(
        playerCaravans[laneIndex],
        cards,
        baseIndex,
        targetRank,
        targetSuit,
        matchBySuit,
      );
      removeJokerMatches(
        cpuCaravans[laneIndex],
        cards,
        baseIndex,
        targetRank,
        targetSuit,
        matchBySuit,
      );
    }
    refreshDirections(
      playerCaravans,
      cpuCaravans,
      playerDirections,
      cpuDirections,
    );
  }

  function playFaceCard(
    caravans: CaravanCaravans,
    directions: CaravanDirections,
    laneIndex: number,
    baseIndex: number,
    card: number,
    playerCaravans: CaravanCaravans,
    cpuCaravans: CaravanCaravans,
    playerDirections: CaravanDirections,
    cpuDirections: CaravanDirections,
  ): number {
    const cards = caravans[laneIndex];
    if (
      baseIndex < 0 ||
      baseIndex >= cards.length ||
      !isNumber(cards[baseIndex])
    )
      return 0;
    if (rank(card) === 14) {
      playJoker(
        cards,
        baseIndex,
        card,
        playerCaravans,
        cpuCaravans,
        playerDirections,
        cpuDirections,
      );
    } else if (rank(card) === 11) {
      removeGroupAt(cards, baseIndex);
      refreshDirections(
        playerCaravans,
        cpuCaravans,
        playerDirections,
        cpuDirections,
      );
    } else {
      insertFaceAt(cards, baseIndex, card);
      directions[laneIndex] = computeDirection(cards);
    }
    return 1;
  }

  // --- Randomness and deck construction ---
  function random32(): number {
    if (!randomSeed) randomSeed = 1831565813;
    randomSeed ^= randomSeed << 13;
    randomSeed ^= randomSeed >>> 17;
    randomSeed ^= randomSeed << 5;
    return randomSeed >>> 0;
  }

  function thinkDelay(): number {
    return 1500 + (random32() % 1501);
  }

  function shuffleDeck(deck: Uint8Array): Uint8Array {
    for (let currentIndex = deck.length - 1; currentIndex > 0; currentIndex--) {
      const randomIndex = random32() % (currentIndex + 1);
      const currentCard = deck[currentIndex];
      deck[currentIndex] = deck[randomIndex];
      deck[randomIndex] = currentCard;
    }
    return deck;
  }

  function makeDeck(cpuDeck: number | boolean): Uint8Array {
    const deck = new Uint8Array(54);
    const suitOffset = cpuDeck ? 1 : 0;
    let deckIndex = 0;
    for (let suitIndex = 0; suitIndex < 4; suitIndex++) {
      for (let cardRank = 1; cardRank <= 13; cardRank++) {
        deck[deckIndex++] = (((suitIndex + suitOffset) & 3) << 4) | cardRank;
      }
    }
    deck[deckIndex++] = ((cpuDeck ? 2 : 0) << 4) | 14;
    deck[deckIndex] = ((cpuDeck ? 3 : 1) << 4) | 14;
    return deck;
  }

  function ensureOpeningNumbers(deck: Uint8Array): void {
    let openingNumberCount = 0;
    let searchIndex = 8;
    for (let openingIndex = 0; openingIndex < 8; openingIndex++) {
      if (isNumber(deck[openingIndex])) openingNumberCount++;
    }
    let replacementIndex = 0;
    while (openingNumberCount < 3 && searchIndex < deck.length) {
      while (replacementIndex < 8 && isNumber(deck[replacementIndex]))
        replacementIndex++;
      while (searchIndex < deck.length && !isNumber(deck[searchIndex]))
        searchIndex++;
      if (replacementIndex >= 8 || searchIndex >= deck.length) break;
      const replacementCard = deck[replacementIndex];
      deck[replacementIndex] = deck[searchIndex];
      deck[searchIndex] = replacementCard;
      openingNumberCount++;
      replacementIndex++;
      searchIndex++;
    }
  }

  // --- Scoring and play legality ---
  function total(cards: CaravanCards): number {
    let cardIndex = 0;
    let caravanTotal = 0;
    while (cardIndex < cards.length) {
      const cardRank = rank(cards[cardIndex]);
      if (cardRank <= 10) {
        let groupValue = cardRank;
        cardIndex++;
        while (cardIndex < cards.length && rank(cards[cardIndex]) > 10) {
          if (rank(cards[cardIndex]) === 13) groupValue <<= 1;
          cardIndex++;
        }
        caravanTotal += groupValue;
      } else {
        cardIndex++;
      }
    }
    return caravanTotal;
  }

  function openingPhase(caravans: CaravanCaravans): boolean {
    return (
      !caravans.openingComplete &&
      (!caravans[0].length || !caravans[1].length || !caravans[2].length)
    );
  }

  function numberCardCount(cards: CaravanCards): number {
    let count = 0;
    for (let cardIndex = 0; cardIndex < cards.length; cardIndex++) {
      if (isNumber(cards[cardIndex])) count++;
    }
    return count;
  }

  function nthNumberIndex(cards: CaravanCards, numberPosition: number): number {
    let numberCount = 0;
    for (let cardIndex = 0; cardIndex < cards.length; cardIndex++) {
      if (!isNumber(cards[cardIndex])) continue;
      if (numberCount === numberPosition) return cardIndex;
      numberCount++;
    }
    return -1;
  }

  function canPlay(
    caravans: CaravanCaravans,
    directions: CaravanDirections,
    laneIndex: number,
    card: number,
  ): number | boolean {
    const cards = caravans[laneIndex];
    const cardRank = rank(card);
    if (openingPhase(caravans)) return cardRank <= 10 && !cards.length;
    if (cardRank > 10) return 0;
    if (!cards.length) return 1;
    const previousRank = lastNumberRank(cards);
    if (cardRank === previousRank) return 0;
    if (baseCardCount(cards) === 1) return 1;
    if (suit(card) === lastEffectiveSuit(cards)) return 1;
    const direction = directions[laneIndex];
    if (direction > 0) return cardRank > previousRank;
    if (direction < 0) return cardRank < previousRank;
    return 1;
  }

  function playNumberCard(
    caravans: CaravanCaravans,
    directions: CaravanDirections,
    laneIndex: number,
    card: number,
  ): void {
    caravans[laneIndex].push(card);
    directions[laneIndex] = computeDirection(caravans[laneIndex]);
    if (
      !caravans.openingComplete &&
      caravans[0].length &&
      caravans[1].length &&
      caravans[2].length
    ) {
      caravans.openingComplete = 1;
    }
  }

  function laneWinner(playerTotal: number, cpuTotal: number): number {
    const playerSold = playerTotal >= 21 && playerTotal <= 26;
    const cpuSold = cpuTotal >= 21 && cpuTotal <= 26;
    if (!playerSold && !cpuSold) return 0;
    if (playerSold && !cpuSold) return 1;
    if (!playerSold && cpuSold) return -1;
    if (playerTotal === cpuTotal) return 0;
    return playerTotal > cpuTotal ? 1 : -1;
  }

  function checkWinner(
    playerCaravans: CaravanCaravans,
    cpuCaravans: CaravanCaravans,
    turnCount: number,
    playerHand: number[],
    cpuHand: number[],
  ): CaravanOutcome {
    let soldLaneCount = 0;
    let playerWins = 0;
    let cpuWins = 0;
    for (let laneIndex = 0; laneIndex < 3; laneIndex++) {
      const laneResult = laneWinner(
        total(playerCaravans[laneIndex]),
        total(cpuCaravans[laneIndex]),
      );
      if (laneResult) soldLaneCount++;
      if (laneResult > 0) playerWins++;
      if (laneResult < 0) cpuWins++;
    }
    if (soldLaneCount === 3) {
      if (playerWins >= 2) return 'PLAYER';
      if (cpuWins >= 2) return 'CPU';
    }
    if (turnCount > 120 || (!playerHand.length && !cpuHand.length)) {
      if (playerWins > cpuWins) return 'PLAYER';
      if (cpuWins > playerWins) return 'CPU';
      return 'DRAW';
    }
    return '';
  }

  // --- CPU move selection ---
  function chooseCpuMove(
    hand: number[],
    cpuCaravans: CaravanCaravans,
    cpuDirections: CaravanDirections,
    playerCaravans: CaravanCaravans,
    playerDirections: CaravanDirections,
  ): number {
    let bestScore = -10000;
    let encodedMove = -1;
    let moveScore;
    if (openingPhase(cpuCaravans)) {
      for (let handIndex = 0; handIndex < hand.length; handIndex++) {
        const card = hand[handIndex];
        if (!isNumber(card)) continue;
        for (let laneIndex = 0; laneIndex < 3; laneIndex++) {
          if (cpuCaravans[laneIndex].length) continue;
          moveScore = rank(card) * 3 + (random32() & 7);
          if (moveScore > bestScore) {
            bestScore = moveScore;
            encodedMove = (handIndex << 13) | (laneIndex << 10);
          }
        }
      }
      return encodedMove;
    }
    // If a CPU caravan is busted, remember disband as a fallback.
    // A useful normal/face-card play can still beat this score.
    for (let laneIndex = 0; laneIndex < 3; laneIndex++) {
      if (total(cpuCaravans[laneIndex]) > 26) {
        bestScore = 70 + (random32() & 7);
        encodedMove = -(laneIndex + 2);
        break;
      }
    }
    for (let handIndex = 0; handIndex < hand.length; handIndex++) {
      const card = hand[handIndex];
      const cardRank = rank(card);
      if (cardRank <= 10) {
        for (let laneIndex = 0; laneIndex < 3; laneIndex++) {
          if (!canPlay(cpuCaravans, cpuDirections, laneIndex, card)) continue;
          const projectedTotal = total(cpuCaravans[laneIndex]) + cardRank;
          moveScore =
            projectedTotal > 26
              ? -700 - projectedTotal
              : projectedTotal >= 21
                ? 250 + projectedTotal
                : projectedTotal * 3;
          moveScore += random32() & 7;
          if (moveScore > bestScore) {
            bestScore = moveScore;
            encodedMove = (handIndex << 13) | (laneIndex << 10);
          }
        }
        continue;
      }
      for (let targetBoard = 0; targetBoard < 2; targetBoard++) {
        for (let laneIndex = 0; laneIndex < 3; laneIndex++) {
          const targetCards = targetBoard
            ? playerCaravans[laneIndex]
            : cpuCaravans[laneIndex];
          const currentTotal = total(targetCards);
          for (let baseIndex = 0; baseIndex < targetCards.length; baseIndex++) {
            if (!isNumber(targetCards[baseIndex])) continue;
            const targetGroupValue = groupValueAt(targetCards, baseIndex);
            let projectedTotal;
            if (cardRank === 13) {
              projectedTotal = currentTotal + targetGroupValue;
              moveScore = targetBoard
                ? currentTotal >= 21 &&
                  currentTotal <= 26 &&
                  projectedTotal > 26
                  ? 480 + currentTotal
                  : 20
                : projectedTotal > 26
                  ? -520
                  : projectedTotal >= 21
                    ? 320 + projectedTotal
                    : projectedTotal * 3;
            } else if (cardRank === 11) {
              projectedTotal = currentTotal - targetGroupValue;
              moveScore = targetBoard
                ? currentTotal >= 21 && currentTotal <= 26
                  ? 430 + currentTotal
                  : 35
                : currentTotal > 26 && projectedTotal <= 26
                  ? 360
                  : currentTotal >= 21 && currentTotal <= 26
                    ? -220
                    : 25;
            } else if (cardRank === 12) {
              // Queen: use on the CPU's active end card, but never stack
              // another Queen immediately on top of a Queen.
              moveScore =
                !targetBoard &&
                baseIndex === lastNumberIndex(targetCards) &&
                rank(targetCards[targetCards.length - 1]) !== 12
                  ? 55
                  : -300;
            } else {
              // Joker: keep it simple and offensive rather than doing
              // expensive full-board look-ahead.
              moveScore = targetBoard ? 25 + targetGroupValue * 2 : -300;
            }
            moveScore += random32() & 7;
            if (moveScore > bestScore) {
              bestScore = moveScore;
              encodedMove =
                (handIndex << 13) |
                (targetBoard << 12) |
                (laneIndex << 10) |
                (baseIndex + 1);
            }
          }
        }
      }
    }
    return bestScore < -200 ? -1 : encodedMove;
  }
  return [
    isNumber,
    openingPhase,
    numberCardCount,
    nthNumberIndex,
    canPlay,
    playNumberCard,
    playFaceCard,
    checkWinner,
    makeDeck,
    shuffleDeck,
    ensureOpeningNumbers,
    thinkDelay,
    chooseCpuMove,
  ];
});
