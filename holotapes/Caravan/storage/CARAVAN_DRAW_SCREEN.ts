/*
 * CARAVAN - CARAVAN_DRAW_SCREEN.JS
 * Low-memory game renderer and incremental redraw helpers.
 * Readable source only; installed runtime remains in the matching minified file.
 */
(function (api: CaravanRendererApi): CaravanRenderer {
  const laneX = [18, 168, 318],
    fs = api[0],
    basePath = api[1];
  let graphicsFile: EspruinoFile = E.openFile(
      basePath + 'CARAVAN_GRAPHICS.BIN',
      'r',
    ),
    suitData = '';
  if (graphicsFile) {
    graphicsFile.seek(10002);
    suitData = graphicsFile.read(88) as string;
    if (graphicsFile.close) graphicsFile.close();
  }
  graphicsFile = 0 as never;
  let suitImages = [
    suitData.substr(0, 22),
    suitData.substr(22, 22),
    suitData.substr(44, 22),
    suitData.substr(66, 22),
  ];
  suitData = 0 as never;

  // --- Card/scoring helpers ---
  function rankText(rank: number): string {
    if (rank === 1) return 'A';
    if (rank === 11) return 'J';
    if (rank === 12) return 'Q';
    if (rank === 13) return 'K';
    if (rank === 14) return 'JK';
    return String(rank);
  }

  function total(cards: CaravanCards): number {
    let cardIndex = 0,
      value = 0,
      groupValue,
      rankValue;
    while (cardIndex < cards.length) {
      rankValue = cards[cardIndex] & 15;
      if (rankValue <= 10) {
        groupValue = rankValue;
        cardIndex++;
        while (cardIndex < cards.length && (cards[cardIndex] & 15) > 10) {
          if ((cards[cardIndex] & 15) === 13) groupValue <<= 1;
          cardIndex++;
        }
        value += groupValue;
      } else cardIndex++;
    }
    return value;
  }

  // --- Drawing primitives ---
  function box(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    erase: number | boolean,
  ): void {
    h.setColor(erase ? 0 : 3)
      .drawRect(x1, y1, x2, y2)
      .drawRect(x1 + 1, y1 + 1, x2 - 1, y2 - 1)
      .setColor(3);
  }

  function spacedBold(
    text: string,
    x: number,
    y: number,
    scale: number,
    align: number,
  ): void {
    const step = 6 * scale + 1,
      width = text.length ? text.length * step - 1 : 0;
    let drawX =
      align === 0 ? x - Math.floor(width / 2) : align === 1 ? x - width : x;
    h.setFont('6x8', scale).setFontAlign(-1, -1);
    for (
      let characterIndex = 0;
      characterIndex < text.length;
      characterIndex++
    ) {
      h.drawString(text[characterIndex], drawX, y).drawString(
        text[characterIndex],
        drawX + 1,
        y,
      );
      drawX += step;
    }
  }

  function card(
    cardValue: number,
    x: number,
    y: number,
    handCard: number | boolean,
    selected: number | boolean,
  ): void {
    const rankValue = cardValue & 15,
      suit = (cardValue >> 4) & 3,
      rankLabel = rankText(rankValue),
      suitLabel = suit === 0 ? 'S' : suit === 1 ? 'H' : suit === 2 ? 'D' : 'C';
    if (handCard) {
      h.setColor(3)
        .drawRect(x, y, x + 54, y + 53)
        .drawRect(x + 1, y + 1, x + 53, y + 52)
        .setFont('6x8', 2)
        .drawString(rankLabel, x + 5, y + 4)
        .drawString(rankLabel, x + 6, y + 4);
      if (rankValue === 14) spacedBold('JOKER', x + 27, y + 28, 1, 0);
      else {
        if (suitImages[suit]) h.drawImage(suitImages[suit], x + 21, y + 22);
        h.setFont('6x8', 2).drawString(suitLabel, x + 39, y + 33);
      }
      if (selected) box(x - 3, y - 3, x + 57, y + 56, 0);
      return;
    }
    const rankX = x + (rankLabel.length > 1 ? 2 : 3),
      clipRight = x + (rankLabel.length > 1 ? 22 : 16);
    h.setColor(3)
      .drawRect(x, y, x + 31, y + 41)
      .drawRect(x + 1, y + 1, x + 30, y + 40)
      .setClipRect(x + 1, y + 1, clipRight, y + 15)
      .setFont('6x8', 2)
      .drawString(rankLabel, rankX, y + 2)
      .setClipRect(0, 0, 479, 319);
    if (rankValue === 14) {
      h.setFont('6x8', 1).drawString('*', x + 13, y + 20);
      return;
    }
    if (suitImages[suit]) h.drawImage(suitImages[suit], x + 10, y + 18);
    h.setFont('6x8', 1)
      .drawString(suitLabel, x + (suit === 0 ? 21 : 23), y + 31)
      .drawString(suitLabel, x + (suit === 0 ? 22 : 24), y + 31)
      .drawString(suitLabel, x + (suit === 0 ? 21 : 23), y + 32)
      .drawString(suitLabel, x + (suit === 0 ? 22 : 24), y + 32);
  }

  // --- Caravan and hand layout ---
  function handStart(index: number, count: number, override?: number): number {
    const maxStart = count > 5 ? count - 5 : 0;
    let start =
      override !== undefined && override >= 0
        ? override
        : index > 2
          ? index - 2
          : 0;
    if (start > maxStart) start = maxStart;
    return start;
  }

  function caravan(
    cards: CaravanCards,
    otherCards: CaravanCards | 0,
    x: number,
    y: number,
    selected: number | boolean,
    selectedCard: number,
  ): void {
    let start,
      maxStart,
      drawX,
      value = total(cards),
      otherValue = otherCards ? total(otherCards) : -1;
    h.setColor(3).drawRect(x, y, x + 132, y + 69);
    spacedBold(String(value), x + 120, y + 6, 2, 1);
    if (
      value >= 21 &&
      value <= 26 &&
      (otherValue < 21 || otherValue > 26 || value > otherValue)
    )
      spacedBold('SOLD', x + 66, y + 8, 1, 0);
    else if (value > 26) spacedBold('BUST', x + 66, y + 8, 1, 0);
    maxStart = cards.length > 4 ? cards.length - 4 : 0;
    start = maxStart;
    if (selectedCard >= 0) {
      start = selectedCard > 1 ? selectedCard - 1 : 0;
      if (start > maxStart) start = maxStart;
    }
    drawX = x + 5;
    for (
      let cardIndex = start;
      cardIndex < cards.length && cardIndex < start + 4;
      cardIndex++
    ) {
      card(cards[cardIndex], drawX, y + 20, 0, 0);
      if (cardIndex === selectedCard)
        box(drawX - 2, y + 18, drawX + 33, y + 63, 0);
      drawX += 31;
    }
    if (!cards.length) spacedBold('EMPTY', x + 66, y + 35, 1, 0);
    if (selected) box(x - 3, y - 3, x + 135, y + 72, 0);
  }

  function hand(state: CaravanRenderState): void {
    let start = handStart(state[4], state[1].length, state[15]),
      end = Math.min(start + 5, state[1].length),
      x = 14;
    h.setColor(0).fillRect(0, 215, 479, 279).setColor(3);
    for (let cardIndex = start; cardIndex < end; cardIndex++) {
      card(
        state[1][cardIndex],
        x,
        223,
        1,
        cardIndex === state[4] && state[16] !== 3,
      );
      x += 91;
    }
  }

  function handScroller(state: CaravanRenderState): void {
    const count = state[1].length,
      trackX1 = 178,
      trackX2 = 302,
      trackY = 300,
      thumbWidth = 28,
      travel = trackX2 - trackX1 - thumbWidth + 1;
    let thumbX;
    h.setColor(3)
      .drawLine(trackX1, trackY, trackX2, trackY)
      .drawLine(trackX1, trackY - 2, trackX1, trackY + 2)
      .drawLine(trackX2, trackY - 2, trackX2, trackY + 2);
    thumbX =
      count < 2
        ? trackX1 + Math.floor(travel / 2)
        : trackX1 + Math.floor((travel * state[4]) / (count - 1));
    h.fillRect(thumbX, trackY - 3, thumbX + thumbWidth - 1, trackY + 3);
  }

  // --- Incremental redraws ---
  function redrawHandSelection(
    state: CaravanRenderState,
    previous: number,
  ): void {
    const count = state[1].length,
      oldStart = handStart(previous, count, state[15]),
      newStart = handStart(state[4], count, state[15]);
    let x;
    if (oldStart !== newStart) {
      hand(state);
      h.setColor(0).fillRect(174, 296, 306, 304).setColor(3);
      handScroller(state);
      return;
    }
    if (previous >= oldStart && previous < oldStart + 5 && previous < count) {
      x = 14 + (previous - oldStart) * 91;
      box(x - 3, 220, x + 57, 279, 1);
    }
    if (state[4] >= newStart && state[4] < newStart + 5 && state[4] < count) {
      x = 14 + (state[4] - newStart) * 91;
      box(x - 3, 220, x + 57, 279, 0);
    }
    h.setColor(0).fillRect(174, 296, 306, 304).setColor(3);
    handScroller(state);
  }

  function redrawTargetSelection(
    state: CaravanRenderState,
    previous: number,
  ): void {
    let x;
    if (previous >= 0 && previous < 3) {
      x = laneX[previous];
      box(x - 3, 139, x + 135, 214, 1);
    }
    if (state[16] && state[5] >= 0 && state[5] < 3) {
      x = laneX[state[5]];
      box(x - 3, 139, x + 135, 214, 0);
    }
  }

  // --- Action and face-target popups ---
  function actionRow(
    text: string,
    row: number,
    selected: number | boolean,
  ): void {
    const y = 101 + row * 27;
    h.setColor(0)
      .fillRect(128, y - 3, 352, y + 20)
      .setColor(3)
      .setFontAlign(0, -1);
    spacedBold(text, 240, y, 2, 0);
    if (selected) h.drawRect(132, y - 3, 348, y + 20);
    h.setFontAlign(-1, -1);
  }

  function popup(
    state: CaravanRenderState,
    face: number | boolean,
    previous?: number,
  ): void {
    const trackMenu = !face && state[7] === 2;
    function label(row: number): string {
      if (face)
        return row === 0
          ? 'Player Board'
          : row === 1
            ? 'Opponent Board'
            : 'Back';
      if (trackMenu) return row === 0 ? 'Disband Caravan' : 'Cancel';
      return row === 0 ? 'Play Card' : row === 1 ? 'Discard Card' : 'Cancel';
    }
    if (previous !== undefined) {
      actionRow(label(previous), previous, 0);
      actionRow(label(state[8]), state[8], 1);
      return;
    }
    h.setColor(0)
      .fillRect(122, 70, 358, 208)
      .setColor(3)
      .drawRect(122, 70, 358, 208)
      .drawRect(124, 72, 356, 206)
      .setFontAlign(0, -1);
    spacedBold(
      face ? 'TARGET BOARD' : trackMenu ? 'TRACK ACTION' : 'CARD ACTION',
      240,
      80,
      1,
      0,
    );
    if (face) {
      actionRow('Player Board', 0, state[8] === 0);
      actionRow('Opponent Board', 1, state[8] === 1);
      actionRow('Back', 2, state[8] === 2);
    } else if (trackMenu) {
      actionRow('Disband Caravan', 0, state[8] === 0);
      actionRow('Cancel', 1, state[8] === 1);
    } else {
      actionRow('Play Card', 0, state[8] === 0);
      actionRow('Discard Card', 1, state[8] === 1);
      actionRow('Cancel', 2, state[8] === 2);
    }
  }

  function redrawFaceTargetSelection(
    state: CaravanRenderState,
    previousLane: number,
  ): void {
    let x, cards;
    if (previousLane >= 0 && previousLane < 3) {
      x = laneX[previousLane];
      cards = state[10] ? state[3][previousLane] : state[2][previousLane];
      h.setColor(0)
        .fillRect(
          x - 3,
          (state[10] ? 48 : 142) - 3,
          x + 135,
          (state[10] ? 48 : 142) + 72,
        )
        .setColor(3);
      caravan(
        cards,
        state[10] ? state[2][previousLane] : state[3][previousLane],
        x,
        state[10] ? 48 : 142,
        0,
        previousLane === state[11] ? state[12] : -1,
      );
    }
    if (previousLane !== state[11]) {
      x = laneX[state[11]];
      cards = state[10] ? state[3][state[11]] : state[2][state[11]];
      h.setColor(0)
        .fillRect(
          x - 3,
          (state[10] ? 48 : 142) - 3,
          x + 135,
          (state[10] ? 48 : 142) + 72,
        )
        .setColor(3);
      caravan(
        cards,
        state[10] ? state[2][state[11]] : state[3][state[11]],
        x,
        state[10] ? 48 : 142,
        0,
        state[12],
      );
    }
  }

  // --- Status/footer drawing ---
  function redrawStatusTitle(state: CaravanRenderState): void {
    h.setColor(0).fillRect(16, 0, 464, 21).setColor(3);
    spacedBold(state[14], 240, 4, 2, 0);
    h.drawLine(16, 22, 464, 22);
  }

  function footer(state: CaravanRenderState): void {
    h.setColor(0)
      .fillRect(0, 282, 479, 319)
      .setColor(3)
      .drawLine(16, 282, 464, 282);
    spacedBold('HAND', 240, 285, 1, 0);
    handScroller(state);
    spacedBold('Total Cards = ' + state[13], 456, 286, 1, 1);
    if (state[16] === 3) {
      spacedBold('L/R Scroll Tracks', 22, 300, 1, -1);
      spacedBold('Left Press Actions', 456, 300, 1, 1);
    } else if (state[16] === 1 || state[9] === 2) {
      spacedBold('L/R Target / Edge Back', 22, 300, 1, -1);
      spacedBold('Left Press Place', 456, 300, 1, 1);
    } else if (state[7] || state[9] === 1) {
      spacedBold('L/R Scroll Menu', 22, 300, 1, -1);
      spacedBold('Left Press Select', 456, 300, 1, 1);
    } else {
      spacedBold('L/R Scroll Cards', 22, 300, 1, -1);
      spacedBold('Left Press Actions', 456, 300, 1, 1);
    }
  }

  // --- Full-screen render ---
  function draw(state: CaravanRenderState): void {
    h.clear().setColor(3).drawLine(16, 22, 464, 22);
    spacedBold(state[14], 240, 4, 2, 0);
    spacedBold(state[0], 22, 26, 2, -1);
    spacedBold('YOU', 22, 119, 2, -1);
    spacedBold('CPU CARAVANS', 360, 28, 1, -1);
    spacedBold('YOUR CARAVANS', 350, 122, 1, -1);
    for (let laneIndex = 0; laneIndex < 3; laneIndex++) {
      caravan(
        state[3][laneIndex],
        state[2][laneIndex],
        laneX[laneIndex],
        48,
        0,
        state[9] === 2 && state[10] === 1 && laneIndex === state[11]
          ? state[12]
          : -1,
      );
      caravan(
        state[2][laneIndex],
        state[3][laneIndex],
        laneX[laneIndex],
        142,
        !state[6] && !state[9] && state[16] && laneIndex === state[5],
        state[9] === 2 && state[10] === 0 && laneIndex === state[11]
          ? state[12]
          : -1,
      );
    }
    hand(state);
    footer(state);
    if (state[7]) popup(state, 0);
    else if (state[9] === 1) popup(state, 1);
  }
  return [
    draw,
    redrawHandSelection,
    redrawTargetSelection,
    redrawStatusTitle,
    popup,
    redrawFaceTargetSelection,
    function (): void {
      suitImages = [];
    },
  ];
});
