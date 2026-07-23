// =============================================================================
//  Name: Solitaire
//  Author: Theeohn Megistus
//  License: MIT
//  Repository: https://github.com/Theeohn/Solitaire-3000a
// =============================================================================
(function() {
  const C = {
    CARD_W: 42,
    CARD_H: 60,
    STOCK_X: 18,
    WASTE_X: 84,
    FOUND_X: 228,
    ROW1_Y: 19,
    FOUND_SPACING: 60,
    TAB_X: 18,
    TAB_Y: 89,
    TAB_SPACING: 66,
    FD_OFF: 5,
    FU_OFF: 14,
  };
  const STATES = { TITLE: 0, PLAY: 1, WIN: 2 };
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const FOUND_SLOT_SUIT = [2, 0, 1, 3];
  const TOP_TO_TAB = [0, 1, 3, 4, 5, 6];
  const TAB_TO_TOP = [0, 1, 1, 2, 3, 4, 5];

const DECK_OPTS = [
    { name: "Random Deck", file: null },
    { name: "13 Stars", file: "13.JSON" },
    { name: "Atomic Wrangler", file: "ATOMIC.JSON" },
    { name: "Bison Steve", file: "BISON.JSON" },
    { name: "Gomorrah", file: "GOMORRAH.JSON" },
    { name: "Lucky 38", file: "LUCKY.JSON" },
    { name: "Mr. Pebbles", file: "PEBBLES.JSON" },
    { name: "Sierra Madre", file: "SIERRA.JSON" },
    { name: "Silver Rush", file: "SILVER.JSON" },
    { name: "The Tops", file: "TOPS.JSON" },
    { name: "Ultra Luxe", file: "ULTRA.JSON" },
    { name: "Vault Boy", file: "VAULTB.JSON" },
    { name: "Wild Wasteland", file: "WILD.JSON" }
  ];

  let tableau, tabDown, stock, waste, foundations, held, cursorPile, grabDepth;
  let gameState, redrawInterval, winInterval, winQueue, winIdx, bouncer;
  let deckIdx = 0;
  let loadedDeckImg = null;

  function buildDeck() {
    let d = [];
    for (let i = 0; i < 52; i++) d.push(i);
    for (let i = d.length - 1; i > 0; i--) {
      let j = Math.randInt(i + 1);
      let t = d[i]; d[i] = d[j]; d[j] = t;
    }
    return d;
  }

  function rankIdx(c) { return c % 13; }
  function suitIdx(c) { return (c / 13) | 0; }
  function rank1(c) { return rankIdx(c) + 1; }
  function isRed(c) { let s = suitIdx(c); return s === 1 || s === 2; }

  function initGame() {
    tableau = [[], [], [], [], [], [], []];
    tabDown = [0, 0, 0, 0, 0, 0, 0];
    stock = [];
    waste = [];
    foundations = [0, 0, 0, 0];
    held = null;
    cursorPile = 0;
    grabDepth = 1;
    gameState = STATES.TITLE;
  }

 function loadSelectedDeck() {
    let chosenIdx = deckIdx;
    if (chosenIdx === 0) {
      chosenIdx = Math.randInt(13) + 1;
    }
    let filename = DECK_OPTS[chosenIdx].file;
    try {
      const fs = require('fs');
      const data = JSON.parse(fs.readFileSync('HOLO/SOLITAIRE/' + filename));
      const image = {
        bpp: data.bpp,
        buffer: E.toArrayBuffer(atob(data.buffer)),
        height: data.height,
        width: data.width,
      };
      if (data.transparent >= 0) {
        image.transparent = data.transparent;
      }
      if (data.palette) {
        image.palette = new Uint16Array(data.palette.length);
        for (let i = 0; i < data.palette.length; i++) {
          const color = data.palette[i] / 255;
          image.palette[i] = h.toColor(color, color, color);
        }
      }
      loadedDeckImg = image;
    } catch (e) {
      loadedDeckImg = null;
    }
  }

  function dealGame() {
    let d = buildDeck();
    tableau = [[], [], [], [], [], [], []];
    tabDown = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j <= i; j++) tableau[i].push(d.pop());
      tabDown[i] = i;
    }
    stock = d;
    waste = [];
    foundations = [0, 0, 0, 0];
    held = null;
    cursorPile = 0;
    grabDepth = 1;
    gameState = STATES.PLAY;
  }

  function restartGame() {
    if (winInterval) { clearInterval(winInterval); winInterval = undefined; }
    dealGame();
  }

  function drawFromStock() {
    if (stock.length) waste.push(stock.pop());
    else if (waste.length) { stock = waste.reverse(); waste = []; }
  }

  function pickUp(p) {
    if (p === 1) {
      if (waste.length) held = { from: 1, count: 1 };
    } else if (p >= 2 && p < 6) {
      let suit = FOUND_SLOT_SUIT[p - 2];
      if (foundations[suit] > 0) held = { from: p, count: 1 };
    } else if (p >= 6) {
      let i = p - 6, up = tableau[i].length - tabDown[i];
      if (up > 0) held = { from: p, count: Math.min(grabDepth, up) };
    }
  }

  function sourceCards(from, count) {
    if (from === 1) return [waste[waste.length - 1]];
    if (from >= 2 && from < 6) {
      let suit = FOUND_SLOT_SUIT[from - 2];
      return [suit * 13 + (foundations[suit] - 1)];
    }
    let i = from - 6, n = tableau[i].length;
    return tableau[i].slice(n - count);
  }

  function removeHeld() {
    let from = held.from, count = held.count;
    if (from === 1) { waste.pop(); }
    else if (from >= 2 && from < 6) {
      let suit = FOUND_SLOT_SUIT[from - 2];
      foundations[suit] -= count;
    } else {
      let i = from - 6, n = tableau[i].length;
      tableau[i].splice(n - count, count);
      if (tableau[i].length === tabDown[i] && tabDown[i] > 0) tabDown[i] -= 1;
    }
  }

  function placeCards(p, cards) {
    if (p >= 2 && p < 6) {
      let suit = FOUND_SLOT_SUIT[p - 2];
      foundations[suit] += cards.length;
    } else {
      let i = p - 6;
      for (let k = 0; k < cards.length; k++) tableau[i].push(cards[k]);
    }
  }

  function tryPlace(p) {
    let cards = sourceCards(held.from, held.count);
    let ok = false;
    if (p >= 2 && p < 6) {
      let suit = FOUND_SLOT_SUIT[p - 2];
      if (held.count === 1 && suitIdx(cards[0]) === suit && rank1(cards[0]) === foundations[suit] + 1) ok = true;
    } else if (p >= 6) {
      let i = p - 6, n = tableau[i].length;
      if (n === 0) { if (rank1(cards[0]) === 13) ok = true; }
      else {
        let top = tableau[i][n - 1];
        if (rank1(top) === rank1(cards[0]) + 1 && isRed(top) !== isRed(cards[0])) ok = true;
      }
    }
    if (ok) { removeHeld(); placeCards(p, cards); checkWin(); }
    held = null;
  }

  function checkWin() {
    if (foundations[0] === 13 && foundations[1] === 13 && foundations[2] === 13 && foundations[3] === 13) enterWin();
  }

  function moveHoriz(dir) {
    cursorPile = cursorPile < 6 ? (cursorPile + dir + 6) % 6 : 6 + ((cursorPile - 6 + dir + 7) % 7);
    grabDepth = 1;
  }

  function moveVert() {
    cursorPile = cursorPile < 6 ? 6 + TOP_TO_TAB[cursorPile] : TAB_TO_TOP[cursorPile - 6];
    grabDepth = 1;
  }

  function adjustDepth(dir) {
    let i = cursorPile - 6, up = tableau[i].length - tabDown[i];
    if (up < 1) up = 1;
    grabDepth = E.clip(grabDepth + dir, 1, up);
  }

  function verticalMove(dir) {
    if (cursorPile >= 6 && held === null) {
      let i = cursorPile - 6, up = tableau[i].length - tabDown[i];
      if (up < 1) up = 1;
      if (dir > 0 && grabDepth < up) { adjustDepth(dir); return; }
    }
    moveVert();
  }

  function pressAction() {
    if (gameState === STATES.TITLE) { 
      loadSelectedDeck();
      dealGame(); 
      Pip.playSound('TAB'); 
      drawAll(); 
      return; 
    }
    if (gameState === STATES.WIN) { restartGame(); Pip.playSound('TAB'); drawAll(); return; }
    if (cursorPile === 0) {
      if (held) held = null; else drawFromStock();
    } else if (held === null) {
      pickUp(cursorPile);
    } else if (held.from === cursorPile) {
      held = null;
    } else {
      tryPlace(cursorPile);
    }
    Pip.playSound('TAB');
    if (gameState !== STATES.WIN) drawAll();
  }

  function buildWinQueue() {
    let f = [foundations[0], foundations[1], foundations[2], foundations[3]];
    let q = [], more = true;
    while (more) {
      more = false;
      for (let s = 0; s < 4; s++) {
        if (f[s] > 0) { q.push(s * 13 + (f[s] - 1)); f[s]--; more = true; }
      }
    }
    return q;
  }

  function slotForSuit(s) {
    for (let j = 0; j < 4; j++) if (FOUND_SLOT_SUIT[j] === s) return j;
    return 0;
  }

  function enterWin() {
    gameState = STATES.WIN;
    winQueue = buildWinQueue();
    winIdx = 0;
    bouncer = null;
    drawAll();
    winInterval = setInterval(winTick, 40);
  }

  function winTick() { "ram";
    if (!bouncer) {
      if (winIdx >= winQueue.length) { clearInterval(winInterval); winInterval = undefined; return; }
      let card = winQueue[winIdx++], slot = slotForSuit(suitIdx(card));
      bouncer = {
        card: card,
        x: C.FOUND_X + slot * C.FOUND_SPACING + C.CARD_W / 2,
        y: C.ROW1_Y + C.CARD_H / 2,
        vx: ((Math.randInt(7) - 3) || 2) * 2,
        vy: (-2 - Math.randInt(3)) * 2,       
        b: 0,
      };
    }
    bouncer.vy += 2.4;
    bouncer.x += bouncer.vx;
    bouncer.y += bouncer.vy;
    if (bouncer.y + C.CARD_H / 2 > 320) { bouncer.y = 320 - C.CARD_H / 2; bouncer.vy = -bouncer.vy * 0.7; bouncer.b++; }
    if (bouncer.x - C.CARD_W / 2 < 0) { bouncer.x = C.CARD_W / 2; bouncer.vx = -bouncer.vx * 0.8; }
    if (bouncer.x + C.CARD_W / 2 > 480) { bouncer.x = 480 - C.CARD_W / 2; bouncer.vx = -bouncer.vx * 0.8; }
    drawCardFace(bouncer.card, bouncer.x - C.CARD_W / 2, bouncer.y - C.CARD_H / 2, true);
    drawWinBox();
    h.flip();
    Pip.lastFlip = getTime();
    if (bouncer.b >= 5) bouncer = null;
  }

  function drawHeart(cx, cy, r, outline) {
    if (outline) {
      h.drawCircle(cx - r * 0.5, cy - r * 0.3, r * 0.5);
      h.drawCircle(cx + r * 0.5, cy - r * 0.3, r * 0.5);
      h.drawPoly([cx - r, cy - r * 0.1, cx + r, cy - r * 0.1, cx, cy + r], true);
    } else {
      h.fillCircle(cx - r * 0.5, cy - r * 0.3, r * 0.5);
      h.fillCircle(cx + r * 0.5, cy - r * 0.3, r * 0.5);
      h.fillPoly([cx - r, cy - r * 0.1, cx + r, cy - r * 0.1, cx, cy + r]);
    }
  }

  function drawSpade(cx, cy, r, outline) {
    if (outline) {
      h.drawCircle(cx - r * 0.5, cy + r * 0.3, r * 0.5);
      h.drawCircle(cx + r * 0.5, cy + r * 0.3, r * 0.5);
      h.drawPoly([cx - r, cy + r * 0.1, cx + r, cy + r * 0.1, cx, cy - r], true);
      h.drawPoly([cx - r * 0.3, cy + r * 0.3, cx + r * 0.3, cy + r * 0.3, cx, cy + r * 1.15], true);
    } else {
      h.fillCircle(cx - r * 0.5, cy + r * 0.3, r * 0.5);
      h.fillCircle(cx + r * 0.5, cy + r * 0.3, r * 0.5);
      h.fillPoly([cx - r, cy + r * 0.1, cx + r, cy + r * 0.1, cx, cy - r]);
      h.fillPoly([cx - r * 0.3, cy + r * 0.3, cx + r * 0.3, cy + r * 0.3, cx, cy + r * 1.15]);
    }
  }

  function drawDiamond(cx, cy, r, outline) {
    if (outline) {
      h.drawPoly([cx, cy - r, cx + r * 0.65, cy, cx, cy + r, cx - r * 0.65, cy], true);
    } else {
      h.fillPoly([cx, cy - r, cx + r * 0.65, cy, cx, cy + r, cx - r * 0.65, cy]);
    }
  }

  function drawClub(cx, cy, r, outline) {
    if (outline) {
      h.drawCircle(cx, cy - r * 0.45, r * 0.5);
      h.drawCircle(cx - r * 0.45, cy + r * 0.15, r * 0.5);
      h.drawCircle(cx + r * 0.45, cy + r * 0.15, r * 0.5);
      h.drawPoly([cx - r * 0.3, cy + r * 0.15, cx + r * 0.3, cy + r * 0.15, cx, cy + r * 1.1], true);
    } else {
      h.fillCircle(cx, cy - r * 0.45, r * 0.5);
      h.fillCircle(cx - r * 0.45, cy + r * 0.15, r * 0.5);
      h.fillCircle(cx + r * 0.45, cy + r * 0.15, r * 0.5);
      h.fillPoly([cx - r * 0.3, cy + r * 0.15, cx + r * 0.3, cy + r * 0.15, cx, cy + r * 1.1]);
    }
  }

  function drawSuitIcon(s, cx, cy, r, outline) {
    if (s === 0) drawClub(cx, cy, r, outline);
    else if (s === 1) drawDiamond(cx, cy, r, outline);
    else if (s === 2) drawHeart(cx, cy, r, outline);
    else drawSpade(cx, cy, r, outline);
  }

  function drawCardBack(x, y, exposedH) {
    let h2 = exposedH || C.CARD_H;
    
    if (loadedDeckImg) {
      h.setClipRect(x, y, x + C.CARD_W, y + h2 - 1);
      h.drawImage(loadedDeckImg, x, y);
      h.setClipRect(0, 0, 479, 319);
      h.setColor(0).drawRect(x, y, x + C.CARD_W, y + C.CARD_H);
    } else {
      h.setColor(1).fillRect(x, y, x + C.CARD_W, y + h2);
      h.setColor(0).drawRect(x, y, x + C.CARD_W, y + h2);
      
      h.setColor(2);
      for (let r = 0; r < 4; r++) {
        let py = y + 7 + r * 13;
        if (py >= y + h2) break; 
        
        for (let c = 0; c < 3; c++) {
          let px = x + 7 + c * 11;
          let squareH = Math.min(5, y + h2 - py);
          if (squareH > 0) h.fillRect(px, py, px + 5, py + squareH);
        }
      }
    }
  }

  function drawCardFace(card, x, y, big, exposedH) {
    let h2 = exposedH || C.CARD_H;
    let s = suitIdx(card), col = (s === 1 || s === 2) ? 1 : 0;
    
    h.setColor(3).fillRect(x, y, x + C.CARD_W, y + h2);
    h.setColor(0).drawRect(x, y, x + C.CARD_W, y + h2);
    h.setColor(col).setFontAlign(-1, -1);
    
    if (big) {
      h.setFontMonofonto18();
      h.drawString(RANKS[rankIdx(card)], x + 3, y + 3);
      drawSuitIcon(s, x + C.CARD_W / 2, y + C.CARD_H / 2 + 4, 13);
    } else {
      h.setFontMonofonto14();
      h.drawString(RANKS[rankIdx(card)], x + 3, y + 3);
      drawSuitIcon(s, x + C.CARD_W - 8, y + 8, 5);
    }
  }

  function drawEmptySlot(x, y) {
    h.setColor(2).drawRect(x, y, x + C.CARD_W, y + C.CARD_H);
    if (x === C.STOCK_X && y === C.ROW1_Y && stock.length === 0 && waste.length > 0) {
      let cx = x + C.CARD_W / 2, cy = y + C.CARD_H / 2;
      h.setColor(3);
      
      let sz = 10;
      h.drawRect(cx - sz, cy - sz, cx + sz, cy + sz);

      h.drawLine(cx - 4, cy - sz, cx, cy - sz - 4);
      h.drawLine(cx, cy - sz - 4, cx + 4, cy - sz);
      h.drawLine(cx - 4, cy - sz - 1, cx, cy - sz - 5);
      h.drawLine(cx, cy - sz - 5, cx + 4, cy - sz - 1);

      h.drawLine(cx - 4, cy + sz, cx, cy + sz + 4);
      h.drawLine(cx, cy + sz + 4, cx + 4, cy + sz);
      h.drawLine(cx - 4, cy + sz + 1, cx, cy + sz + 5);
      h.drawLine(cx, cy + sz + 5, cx + 4, cy + sz + 1);
    }
  }

  function layoutColumn(i) {
    let n = tableau[i].length, ys = [C.TAB_Y];
    let avail = 320 - 16 - C.TAB_Y - C.CARD_H;
    let total = 0;
    for (let k = 1; k < n; k++) total += (k - 1 < tabDown[i]) ? C.FD_OFF : C.FU_OFF;
    let scale = (total > avail && total > 0) ? avail / total : 1;
    let y = C.TAB_Y;
    for (let k = 1; k < n; k++) {
      y += ((k - 1 < tabDown[i]) ? C.FD_OFF : C.FU_OFF) * scale;
      ys.push(y);
    }
    return ys;
  }

  function topBox(p, depth) {
    if (p === 0) return [C.STOCK_X, C.ROW1_Y, C.STOCK_X + C.CARD_W, C.ROW1_Y + C.CARD_H];
    if (p === 1) return [C.WASTE_X, C.ROW1_Y, C.WASTE_X + C.CARD_W, C.ROW1_Y + C.CARD_H];
    if (p < 6) {
      let x = C.FOUND_X + (p - 2) * C.FOUND_SPACING;
      return [x, C.ROW1_Y, x + C.CARD_W, C.ROW1_Y + C.CARD_H];
    }
    let i = p - 6, x = C.TAB_X + i * C.TAB_SPACING, n = tableau[i].length;
    if (n === 0) return [x, C.TAB_Y, x + C.CARD_W, C.TAB_Y + C.CARD_H];
    let ys = layoutColumn(i);
    let up = n - tabDown[i];
    let d = depth < 1 ? 1 : depth;
    let cap = up > 0 ? up : 1;
    if (d > cap) d = cap;
    let startIdx = n - d;
    if (startIdx < 0) startIdx = 0;
    return [x, ys[startIdx], x + C.CARD_W, ys[n - 1] + C.CARD_H];
  }

  function drawCursor() {
    let depth = (cursorPile >= 6 && held === null) ? grabDepth : 1;
    let box = topBox(cursorPile, depth);
    h.setColor(3).drawRect(box[0] - 2, box[1] - 2, box[2] + 2, box[3] + 2);
  }

  function drawHeld() {
    if (!held) return;
    let box = topBox(held.from, held.count);
    Pip.shadeBox(box[0] - 2, box[1] - 2, box[2] + 2, box[3] + 2);
  }

  function hintText() {
    if (gameState === STATES.WIN) return 'PRESS TO PLAY AGAIN';
    if (held) return (held.from === cursorPile) ? 'Press: Cancel' : 'Press: Place Here';
    if (cursorPile === 0) return stock.length ? 'Press: Draw Card' : (waste.length ? 'Press: Reshuffle' : 'Deck Empty');
    if (cursorPile >= 6 && grabDepth > 1) return 'Press: Pick Up ' + grabDepth;
    if (cursorPile >= 6) {
      let i = cursorPile - 6, up = tableau[i].length - tabDown[i];
      if (up > 1) return 'Press: Pick Up   Scroll Down: Stack';
    }
    return 'Press: Pick Up';
  }

  function drawTitleScreen() {
    drawCardFace(Math.randInt(52), 45, 55, true);
    drawCardFace(Math.randInt(52), 395, 55, true);
    drawCardFace(Math.randInt(52), 45, 205, true);
    drawCardFace(Math.randInt(52), 395, 205, true);

    h.setColor(3).setFontMonofonto36().setFontAlign(0, 0).drawString('SOLITAIRE', 240, 84);
    h.setColor(2).setFontMonofonto18().setFontAlign(0, 0).drawString('Select a deck, then', 240, 150)
    h.setColor(2).setFontMonofonto18().setFontAlign(0, 0).drawString('press the left wheel to play!', 240, 173);

    let txt = "<  " + DECK_OPTS[deckIdx].name + "  >";
    h.setColor(3).setFontMonofonto18().drawString(txt, 240, 238);
  }

  function drawStock() {
    if (stock.length) drawCardBack(C.STOCK_X, C.ROW1_Y);
    else drawEmptySlot(C.STOCK_X, C.ROW1_Y);
  }

  function drawWaste() {
    if (waste.length) drawCardFace(waste[waste.length - 1], C.WASTE_X, C.ROW1_Y, true);
    else drawEmptySlot(C.WASTE_X, C.ROW1_Y);
  }

  function drawFoundationSlot(j) {
    let x = C.FOUND_X + j * C.FOUND_SPACING, suit = FOUND_SLOT_SUIT[j];
    if (foundations[suit] > 0) {
      drawCardFace(suit * 13 + (foundations[suit] - 1), x, C.ROW1_Y, true);
    } else {
      h.setColor(2).drawRect(x, C.ROW1_Y, x + C.CARD_W, C.ROW1_Y + C.CARD_H);
      drawSuitIcon(suit, x + C.CARD_W / 2, C.ROW1_Y + C.CARD_H / 2, 13, true);
    }
  }

  function drawFoundations() {
    for (let j = 0; j < 4; j++) drawFoundationSlot(j);
  }

  function drawTableauColumn(i) {
    let col = tableau[i], n = col.length, x = C.TAB_X + i * C.TAB_SPACING;
    if (n === 0) { drawEmptySlot(x, C.TAB_Y); return; }
    
    let ys = layoutColumn(i);
    for (let k = 0; k < n; k++) {
      let isLast = (k === n - 1);
      let exposedH = isLast ? C.CARD_H : (ys[k + 1] - ys[k]);
      
      if (k < tabDown[i]) {
        drawCardBack(x, ys[k], exposedH);
      } else {
        drawCardFace(col[k], x, ys[k], isLast, exposedH);
      }
    }
  }

  function drawTableau() {
    for (let i = 0; i < 7; i++) drawTableauColumn(i);
  }

  function drawHint() {
    let text = hintText();
    h.setFontMonofonto14();
    let tw = h.stringWidth(text);
    let x1 = 240 - tw / 2 - 8, x2 = 240 + tw / 2 + 8, y1 = 295, y2 = 317;
    h.setColor(0).fillRect(x1, y1, x2, y2);
    h.setColor(2);
    h.drawRect(x1, y1, x2, y2);
    h.drawRect(x1 + 1, y1 + 1, x2 - 1, y2 - 1);
    h.setColor(3).setFontAlign(0, 0).drawString(text, 240, 308);
  }

  function drawPlayScreen() {
    h.setColor(2).setFontMonofonto16().setFontAlign(-1, 0)
      .drawString('DECK: ' + stock.length, C.WASTE_X + C.CARD_W + 6, C.ROW1_Y + C.CARD_H / 2);
    drawStock();
    drawWaste();
    drawFoundations();
    drawTableau();
    if (gameState === STATES.PLAY) { drawCursor(); drawHeld(); }
    drawHint();
  }

  function drawWinBox() {
    h.setFontMonofonto36();
    let tw1 = h.stringWidth('YOU WIN!!!');
    h.setFontMonofonto18();
    let tw2 = h.stringWidth('Press left wheel to play again!');
    let tw = Math.max(tw1, tw2);
    
    let x1 = 240 - tw / 2 - 20, x2 = 240 + tw / 2 + 20, y1 = 110, y2 = 220;
    
    h.setColor(0).fillRect(x1, y1, x2, y2);
    h.setColor(3);
    h.drawRect(x1, y1, x2, y2);
    h.drawRect(x1 + 1, y1 + 1, x2 - 1, y2 - 1);
    h.drawRect(x1 + 2, y1 + 2, x2 - 2, y2 - 2);
    
    h.setFontMonofonto36().setFontAlign(0, 0).drawString('YOU WIN!!!', 240, 145);
    h.setColor(2).setFontMonofonto18().drawString('Press left wheel to play again!', 240, 190);
  }

  function drawAll() { "ram";
    delete Pip.blitOptions.y1;
    delete Pip.blitOptions.y2;
    h.clear(1);
    if (gameState === STATES.TITLE) drawTitleScreen();
    else drawPlayScreen();
    if (gameState === STATES.WIN) drawWinBox();
    h.flip();
    Pip.lastFlip = getTime();
  }

  function periodicRedraw() {
    if (gameState === STATES.WIN) return;
    if (getTime() - Pip.lastFlip < 0.75) return;
    drawAll();
  }

  function onKnob1(dir) { "ram";
    if (dir) {
      if (gameState === STATES.TITLE) {
        deckIdx = (deckIdx + dir + DECK_OPTS.length) % DECK_OPTS.length;
        Pip.playSound('SCROLL');
        drawAll();
        return;
      }
      if (gameState === STATES.PLAY) {
        verticalMove(dir);
        Pip.playSound('SCROLL');
        drawAll();
      }
      return;
    }
    pressAction();
  }

  function onKnob2(dir) { "ram";
    if (dir) {
      if (gameState === STATES.TITLE) {
        deckIdx = (deckIdx + dir + DECK_OPTS.length) % DECK_OPTS.length;
        Pip.playSound('SCROLL');
        drawAll();
        return;
      }
      if (gameState === STATES.PLAY) {
        moveHoriz(dir);
        Pip.playSound('SCROLL');
        drawAll();
      }
      return;
    }
    pressAction();
  }

  function start() {
    h.clear();
    Pip.audioStop();
    initGame();

    Pip.onExclusive('knob1', onKnob1);
    Pip.onExclusive('knob2', onKnob2);

    redrawInterval = setInterval(periodicRedraw, 4000);
    drawAll();
  }

  function remove() {
    if (redrawInterval) clearInterval(redrawInterval);
    if (winInterval) clearInterval(winInterval);
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
    Pip.audioStop();
    h.clear();
    h.flip();
  }

  start();

  return {
    id: 'SOLITAIRE',
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
