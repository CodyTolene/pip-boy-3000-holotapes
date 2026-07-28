// =============================================================================
//  Name: Battle-Pip
//  Author: Theeohn Megistus
//  License: MIT
//  Repository: https://github.com/Theeohn/Battle-Pip-3000a
// =============================================================================
(function() {

const C = {
  GX: 60, GY: 36, CELL: 24,               // grid: 240x240, 10x10 cells
  LEN: [2, 3, 3, 4, 5],                   // ship lengths, placement order
  IMG: {
    title:   "HOLO/BATTLEPIP/TITLE.BIN",
  },
  SND: {
    title:  "HOLO/BATTLEPIP/TITLE.WAV",
    sonar1: "HOLO/BATTLEPIP/SONAR1.WAV",
    sonar2: "HOLO/BATTLEPIP/SONAR2.WAV",
    hit:    "HOLO/BATTLEPIP/HIT.WAV",
    miss:   "HOLO/BATTLEPIP/MISS.WAV",
    win:    "HOLO/BATTLEPIP/WIN.WAV",
    lose:   "HOLO/BATTLEPIP/LOSE.WAV",
    gowin:  "HOLO/BATTLEPIP/GOWIN.WAV",
    golose: "HOLO/BATTLEPIP/GOLOSE.WAV"
  },
  TXT: {
    place: ["Place", "your", "ships!"],
    pTurn: ["Your Turn"],
    pWin:  ["Democracy", "prevails!"],
    pLose: ["Democracy", "has", "fallen!"],
    sunkE: ["Enemy", "ship", "downed!"],
    sunkP: ["They", "downed", "your", "ship!"]
  },
  BLK: {
    win: [
      { t: "YOU WIN!!!", f: "Monofonto36", c: 3 },
      { t: "Press the left wheel to play again!", f: "Monofonto18", c: 2 }
    ],
    lose: [
      { t: "YOU LOSE!!!", f: "Monofonto36", c: 3 },
      { t: "Press the left wheel to play again!", f: "Monofonto18", c: 2 }
    ],
    start: [
      { t: "Search through the fog of war!", f: "Monofonto28", c: 3 },
      { t: "Press left wheel to start", f: "Monofonto18", c: 2 }
    ]
  }
};

const STATE = { TITLE: 0, PLACEMENT: 1, PLAYER_TURN: 2, CPU_TURN: 3, WIN: 4, LOSE: 5 };

let state = STATE.TITLE;
let locked = 0;      // input lock during overlays/animations
let logoImg;         // cached rotated "BATTLE-PIP" label (built after boot)
let tick;            // main setInterval handle
let initT, titleT;   // setTimeout handles for safe cleanup
let cpuMode = 0;     // 0 = Easy CPU, 1 = Hard CPU
let cpuTargets = []; // Target stack for Hard CPU adjacent targeting

let board = {
  pShip: new Uint8Array(100), pHit: new Uint8Array(100),  // player board
  eShip: new Uint8Array(100), eHit: new Uint8Array(100)   // enemy (CPU) board
};
let pShips = [];   // {len,row,col,horiz,hits,sunk} x5
let eShips = [];

let plc = { idx: 0, row: 0, col: 0, horiz: 1, done: 0, w: 0 };   // placement cursor
let cur = { row: 0, col: 0 };                                    // targeting cursor
let ttl = { on: 1, t: 750, w: 0 };                               // title flash
let remain = { p: 5, e: 5 };                                     // ships left

// sequencing: overlay timer / sunk state / cpu think / win-lose flip
let seq = {
  ovT: 0, after: 0,
  sWho: 0,
  cpuT: 0, cpuDotT: 0, cpuDots: 0,
  flipT: 2500, flipPh: 0
};

// memory efficiency caches
let textCache = {};

// ---------------------------------------------------------------------
// low level drawing helpers
// ---------------------------------------------------------------------
function flip() { h.flip(); Pip.lastFlip = getTime(); }

function thickRect(x1, y1, x2, y2, t, col) {
  h.setColor(col);
  h.fillRect(x1, y1, x2, y1 + t - 1);
  h.fillRect(x1, y2 - t + 1, x2, y2);
  h.fillRect(x1, y1, x1 + t - 1, y2);
  h.fillRect(x2 - t + 1, y1, x2, y2);
}

// generic bordered, auto-wrapping message box. parts: [{t,f,c}, ...]
function textBlock(cx, cy, maxW, parts) {
  let key = maxW + "_";
  for (let i = 0; i < parts.length; i++) key += parts[i].t;

  let cached = textCache[key];
  if (!cached) {
    const lines = [], lineH = [];
    for (let p = 0; p < parts.length; p++) {
      h.setFont(parts[p].f);
      const wrapped = h.wrapString(parts[p].t, maxW);
      const fh = h.stringMetrics("Mg").height + 6;
      for (let i = 0; i < wrapped.length; i++) {
        lines.push({ t: wrapped[i], f: parts[p].f, c: parts[p].c });
        lineH.push(fh);
      }
    }
    let totalH = 0;
    for (let i = 0; i < lineH.length; i++) totalH += lineH[i];
    const boxW = maxW + 24, boxH = totalH + 20;
    cached = { lines: lines, lineH: lineH, boxW: boxW, boxH: boxH };
    textCache[key] = cached;
  }

  const x1 = cx - cached.boxW / 2, y1 = cy - cached.boxH / 2, x2 = cx + cached.boxW / 2, y2 = cy + cached.boxH / 2;
  h.setColor(0).fillRect(x1, y1, x2, y2);
  thickRect(x1, y1, x2, y2, 3, 3);
  let ly = y1 + 10;
  for (let i = 0; i < cached.lines.length; i++) {
    h.setColor(cached.lines[i].c).setFont(cached.lines[i].f).setFontAlign(0, -1).drawString(cached.lines[i].t, cx, ly);
    ly += cached.lineH[i];
  }
}

function drawRightText(lines, font, color) {
  h.setColor(color).setFont(font).setFontAlign(0, 0);
  const lh = 34, startY = 160 - ((lines.length - 1) * lh) / 2;
  for (let i = 0; i < lines.length; i++) h.drawString(lines[i], 390, startY + i * lh);
}

function drawFullscreenBin(path) {
  let file = E.openFile(path, 'r');
  if (!file) return;
  
  let target = new Uint8Array(h.buffer);
  let offset = target.length;
  let chunk = file.read(256);

  while (chunk) {
    offset -= chunk.length;
    target.set(chunk, offset);
    chunk = file.read(256);
  }

  file.close();
}

function buildLogo() {
  const w = h.setFontMonofonto36().stringWidth("BATTLE-PIP") + 4;
  const g = Graphics.createArrayBuffer(w, 40, 4);
  g.setFontMonofonto36().setColor(3).setFontAlign(-1, -1).drawString("BATTLE-PIP", 2, 2);
  logoImg = g.asImage();
}

function drawLogo() {
  if (!logoImg) return;
  h.drawImage(logoImg, 26, 160, { rotate: -Math.PI / 2 });
}

// ---------------------------------------------------------------------
// board / ship geometry helpers
// ---------------------------------------------------------------------
function forCells(row, col, len, horiz, fn) {
  for (let i = 0; i < len; i++) fn(horiz ? row : row + i, horiz ? col + i : col, i);
}

function shipFits(grid, row, col, len, horiz) {
  if (horiz && col + len > 10) return false;
  if (!horiz && row + len > 10) return false;
  let ok = true;
  forCells(row, col, len, horiz, function(r, c) { if (grid[r * 10 + c]) ok = false; });
  return ok;
}

function markShip(grid, row, col, len, horiz, id) {
  forCells(row, col, len, horiz, function(r, c) { grid[r * 10 + c] = id; });
}

function findFreeStart(len) {
  for (let r = 0; r < 10; r++)
    for (let c = 0; c <= 10 - len; c++)
      if (shipFits(board.pShip, r, c, len, 1)) return { row: r, col: c };
  return { row: 0, col: 0 };
}

function placeCpuShips() {
  for (let i = 0; i < 5; i++) {
    const len = C.LEN[i];
    let row, col, hz, ok;
    do {
      hz = Math.randInt(2);
      row = Math.randInt(hz ? 10 - len + 1 : 10);
      col = Math.randInt(hz ? 10 : 10 - len + 1);
      ok = shipFits(board.eShip, row, col, len, hz);
    } while (!ok);
    markShip(board.eShip, row, col, len, hz, i + 1);
    eShips.push({ len: len, row: row, col: col, horiz: hz, hits: 0, sunk: 0 });
  }
}

function drawShipShape(row, col, len, horiz, color) {
  h.setColor(color);
  const pad = 3, r = (C.CELL - 2 * pad) / 2 | 0;
  if (horiz) {
    const x1 = C.GX + col * C.CELL + pad + r, x2 = C.GX + (col + len) * C.CELL - pad - r;
    const yc = C.GY + row * C.CELL + (C.CELL / 2 | 0);
    h.fillRect(x1, yc - r, x2, yc + r);
    h.fillCircle(x1, yc, r); h.fillCircle(x2, yc, r);
  } else {
    const y1 = C.GY + row * C.CELL + pad + r, y2 = C.GY + (row + len) * C.CELL - pad - r;
    const xc = C.GX + col * C.CELL + (C.CELL / 2 | 0);
    h.fillRect(xc - r, y1, xc + r, y2);
    h.fillCircle(xc, y1, r); h.fillCircle(xc, y2, r);
  }
}

function drawIndicator(x0, y0, row, col, hitVal, shipHere) {
  const cx = x0 + col * C.CELL + (C.CELL / 2 | 0), cy = y0 + row * C.CELL + (C.CELL / 2 | 0);
  if (hitVal === 2) {
    h.setColor(2).fillCircle(cx, cy, 9); // Hit uses color 2
  } else if (hitVal === 1) {
    h.setColor(1).fillCircle(cx, cy, 7); // Miss uses color 1
  } else {
    h.setColor(shipHere ? 3 : 3).drawCircle(cx, cy, 9);
  }
}

function drawGridLines(x, y) {
  thickRect(x, y, x + 240, y + 240, 1, 1);
  h.setColor(3);
  for (let i = 1; i < 10; i++) {
    h.fillRect(x + i * 24 - 1, y, x + i * 24 + 1, y + 240);
    h.fillRect(x, y + i * 24 - 1, x + 240, y + i * 24 + 1);
  }
}

function drawLabels(x, y) {
  h.setColor(3).setFontMonofonto16().setFontAlign(0, 0);
  for (let i = 0; i < 10; i++) {
    const cx = x + i * 24 + 12;
    h.drawString("" + (i + 1), cx, y - 16);
  }
  for (let i = 0; i < 10; i++) {
    const cy = y + i * 24 + 12;
    h.drawString(String.fromCharCode(65 + i), x + 240 + 16, cy);
  }
}

function clearBoardArea() { h.clearRect(C.GX, C.GY - 20, C.GX + 260, C.GY + 260); }

function inPreview(r, c, pr, pc, len, horiz) {
  let found = false;
  forCells(pr, pc, len, horiz, function(rr, cc) { if (rr === r && cc === c) found = true; });
  return found;
}

function drawPlacementBoard() {
  drawGridLines(C.GX, C.GY);
  drawLabels(C.GX, C.GY);
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) {
      const shipHere = board.pShip[r * 10 + c] !== 0 || inPreview(r, c, plc.row, plc.col, C.LEN[plc.idx], plc.horiz);
      drawIndicator(C.GX, C.GY, r, c, 0, shipHere);
    }
  for (let i = 0; i < pShips.length; i++) {
    const s = pShips[i];
    drawShipShape(s.row, s.col, s.len, s.horiz, 3);
  }
  if (plc.idx < 5) drawShipShape(plc.row, plc.col, C.LEN[plc.idx], plc.horiz, 3);
}

function drawPlayerTurnBoard() {
  drawGridLines(C.GX, C.GY);
  drawLabels(C.GX, C.GY);
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) drawIndicator(C.GX, C.GY, r, c, board.eHit[r * 10 + c], 0);
  for (let i = 0; i < eShips.length; i++) {
    const s = eShips[i];
    if (s.sunk) drawShipShape(s.row, s.col, s.len, s.horiz, 2);
  }
}

function drawCpuTurnBoard() {
  drawGridLines(C.GX, C.GY);
  drawLabels(C.GX, C.GY);
  for (let i = 0; i < pShips.length; i++) {
    const s = pShips[i];
    drawShipShape(s.row, s.col, s.len, s.horiz, 3);
  }
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) {
      const idx = r * 10 + c;
      drawIndicator(C.GX, C.GY, r, c, board.pHit[idx], 0);
    }
}

function drawCursor(row, col, on) {
  const x = C.GX + col * C.CELL, y = C.GY + row * C.CELL;
  if (on) {
    thickRect(x + 8, y + 8, x + C.CELL - 8, y + C.CELL - 8, 2, 3);
  } else {
    h.clearRect(x + 7, y + 7, x + C.CELL - 7, y + C.CELL - 7);
    drawIndicator(C.GX, C.GY, row, col, board.eHit[row * 10 + col], 0);
  }
}

function drawCpuDots() {
  let s = "\"";
  for (let i = 0; i < 5; i++) s += i < seq.cpuDots ? "." : " ";
  s += "\"";
  h.clearRect(320, 140, 470, 180);
  h.setColor(3).setFontMonofonto23().setFontAlign(0, 0).drawString(s, 390, 160);
}

// ---------------------------------------------------------------------
// title screen
// ---------------------------------------------------------------------
function drawTitleBox(on) {
  const w = 340, hh2 = 90, x1 = 240 - w / 2, y1 = 255 - hh2 / 2, x2 = 240 + w / 2, y2 = 255 + hh2 / 2;
  h.setColor(0).fillRect(x1, y1, x2, y2);
  thickRect(x1, y1, x2, y2, 3, 3);
  if (on) {
    h.setColor(3).setFontMonofonto28().setFontAlign(0, 0).drawString("PRESS TO START!", 240, 241);
    h.setFontMonofonto16().drawString("< MODE: " + (cpuMode === 0 ? "EASY CPU" : "HARD CPU") + " >", 240, 278);
  }
}

function drawTitleMode() {
  const w = 340, hh2 = 90, x1 = 240 - w / 2, y1 = 255 - hh2 / 2, x2 = 240 + w / 2, y2 = 255 + hh2 / 2;
  h.setColor(0).fillRect(x1 + 10, 265, x2 - 10, y2 - 6);
  h.setColor(3).setFontMonofonto16().setFontAlign(0, 0).drawString("< MODE: " + (cpuMode === 0 ? "EASY CPU" : "HARD CPU") + " >", 240, 278);
}

function goTitle() {
  state = STATE.TITLE;
  Pip.audioStart(C.SND.title, {repeat: true });
  ttl.on = 1; 
  ttl.t = 750;
  
  h.clear(0);
  drawTitleBox(1);
  
  h.flip();
  Pip.lastFlip = getTime();

  if (titleT) clearTimeout(titleT);
  titleT = setTimeout(() => { 
    drawTitleBg(); 
    drawTitleBox(ttl.on); 
    h.flip(); 
    Pip.lastFlip = getTime(); 
  }, 0);
}

function drawTitleBg() { drawFullscreenBin(C.IMG.title); }

// ---------------------------------------------------------------------
// game state transitions
// ---------------------------------------------------------------------
function newGame() {
  board.pShip.fill(0); board.pHit.fill(0); board.eShip.fill(0); board.eHit.fill(0);
  pShips = []; 
  eShips = [];
  plc.idx = 0; plc.row = 0; plc.col = 0; plc.horiz = 1; plc.done = 0;
  cur.row = 0; cur.col = 0;
  remain.p = 5; remain.e = 5;
  seq.ovT = 0; seq.after = 0; seq.sWho = 0; locked = 0;
  cpuTargets = [];
  placeCpuShips();
}

function goPlacement() {
  newGame();
  state = STATE.PLACEMENT;
  h.clear(0);
  drawLogo();
  drawPlacementBoard();
  drawRightText(C.TXT.place, "Monofonto28", 3);
  h.setColor(2).setFont("Monofonto16").setFontAlign(0, 0);
  h.drawString("Press to rotate,", 390, 230);
  h.drawString("hold to place!", 390, 255);
  flip();
}

function goPlayerTurn() {
  state = STATE.PLAYER_TURN;
  Pip.audioStart(C.SND.sonar1);
  h.clear(0);
  drawLogo();
  drawPlayerTurnBoard();
  drawRightText(C.TXT.pTurn, "Monofonto28", 3);
  drawCursor(cur.row, cur.col, true);
  flip();
}

function goCpuTurn() {
  state = STATE.CPU_TURN;
  Pip.audioStart(C.SND.sonar2);
  seq.cpuT = 3000; seq.cpuDots = 0; seq.cpuDotT = 600;
  h.clear(0);
  drawLogo();
  drawCpuTurnBoard();
  drawCpuDots();
  flip();
}

function goWin() {
  state = STATE.WIN;
  seq.flipT = 2500; seq.flipPh = 0;
  Pip.audioStop();
  Pip.audioStart(C.SND.gowin);
  drawEndScreen();
}

function goLose() {
  state = STATE.LOSE;
  seq.flipT = 2500; seq.flipPh = 0;
  Pip.audioStop();
  Pip.audioStart(C.SND.golose);
  drawEndScreen();
}

function drawEndScreen() {
  h.clear(0);
  drawLogo();
  if (seq.flipPh === 0) {
    if (state === STATE.WIN) {
        drawPlayerTurnBoard();
        drawRightText(C.TXT.pWin, "Monofonto28", 3);
    } else {
        drawCpuTurnBoard();
        drawRightText(C.TXT.pLose, "Monofonto28", 3);
    }
  } else if (state === STATE.WIN) {
    textBlock(240, 160, 300, C.BLK.win);
  } else {
    textBlock(240, 160, 300, C.BLK.lose);
  }
  flip();
}

// ---------------------------------------------------------------------
// placement logic (Optimized to prevent lag/re-clearing full board)
// ---------------------------------------------------------------------
function drawPlacementCompleteOverlay() {
  const cx = 240, cy = 160;
  textBlock(cx, cy, 240, C.BLK.start);
}

function redrawShipCellArea(r, c, pr, pc, len, horiz, oldPr, oldPc, oldLen, oldHoriz) {
  let cellsToUpdate = [];
  forCells(oldPr, oldPc, oldLen, oldHoriz, function(rr, cc) { cellsToUpdate.push({r: rr, c: cc}); });
  forCells(pr, pc, len, horiz, function(rr, cc) { cellsToUpdate.push({r: rr, c: cc}); });

  for (let i = 0; i < cellsToUpdate.length; i++) {
    const cell = cellsToUpdate[i];
    const x = C.GX + cell.c * C.CELL, y = C.GY + cell.r * C.CELL;
    h.setColor(0).fillRect(x + 1, y + 1, x + C.CELL - 1, y + C.CELL - 1);
    
    h.setColor(3);
    if (cell.c > 0) h.fillRect(x - 1, y + 1, x + 1, y + C.CELL - 1);
    if (cell.r > 0) h.fillRect(x + 1, y - 1, x + C.CELL - 1, y + 1);

    const shipHere = board.pShip[cell.r * 10 + cell.c] !== 0 || inPreview(cell.r, cell.c, pr, pc, len, horiz);
    drawIndicator(C.GX, C.GY, cell.r, cell.c, 0, shipHere);
  }

  for (let i = 0; i < pShips.length; i++) {
    const s = pShips[i];
    drawShipShape(s.row, s.col, s.len, s.horiz, 3);
  }
  drawShipShape(pr, pc, len, horiz, 3);
}

function moveShipPreview(dr, dc) {
  const len = C.LEN[plc.idx];
  const maxRow = plc.horiz ? 9 : 10 - len, maxCol = plc.horiz ? 10 - len : 9;
  const nr = E.clip(plc.row + dr, 0, maxRow), nc = E.clip(plc.col + dc, 0, maxCol);
  if (nr === plc.row && nc === plc.col) return;
  if (!shipFits(board.pShip, nr, nc, len, plc.horiz)) return;
  
  const oldR = plc.row, oldC = plc.col, oldH = plc.horiz;
  plc.row = nr; plc.col = nc;
  
  Pip.playSound("SCROLL");
  redrawShipCellArea(nr, nc, plc.row, plc.col, len, plc.horiz, oldR, oldC, len, oldH);
  flip();
}

function rotateShip() {
  const len = C.LEN[plc.idx], nh = plc.horiz ? 0 : 1;
  const maxRow = nh ? 9 : 10 - len, maxCol = nh ? 10 - len : 9;
  const nr = E.clip(plc.row, 0, maxRow), nc = E.clip(plc.col, 0, maxCol);
  if (!shipFits(board.pShip, nr, nc, len, nh)) return;
  
  const oldR = plc.row, oldC = plc.col, oldH = plc.horiz;
  plc.horiz = nh; plc.row = nr; plc.col = nc;
  
  redrawShipCellArea(nr, nc, plc.row, plc.col, len, plc.horiz, oldR, oldC, len, oldH);
  flip();
}

function placeCurrentShip() {
  const len = C.LEN[plc.idx];
  markShip(board.pShip, plc.row, plc.col, len, plc.horiz, plc.idx + 1);
  pShips.push({ len: len, row: plc.row, col: plc.col, horiz: plc.horiz, hits: 0, sunk: 0 });
  Pip.playSound("TAB");
  plc.idx++;
  if (plc.idx < 5) {
    const spot = findFreeStart(C.LEN[plc.idx]);
    plc.row = spot.row; plc.col = spot.col; plc.horiz = 1;
    clearBoardArea(); drawPlacementBoard(); flip();
  } else {
    plc.done = 1;
    clearBoardArea(); drawPlacementBoard();
    drawPlacementCompleteOverlay();
    flip();
  }
}

// ---------------------------------------------------------------------
// player-turn / cpu-turn logic
// ---------------------------------------------------------------------
function moveCursor(dr, dc) {
  const nr = E.clip(cur.row + dr, 0, 9), nc = E.clip(cur.col + dc, 0, 9);
  if (nr === cur.row && nc === cur.col) return;
  drawCursor(cur.row, cur.col, false);
  cur.row = nr; cur.col = nc;
  drawCursor(cur.row, cur.col, true);
  Pip.playSound("SCROLL");
  flip();
}

function showOverlay(text) {
  h.setColor(3).setFontMonofonto23().setFontAlign(0, 0);
  h.drawString(text, 240, 299);
  flip();
  seq.ovT = 3000;
}

function closeOverlay() {
  locked = 0;
  const a = seq.after; seq.after = 0;
  if (a === 1) goCpuTurn();
  else if (a === 2) goPlayerTurn();
}

function showSunkRightText(who) {
  locked = 1;
  seq.sWho = who;
  Pip.audioStart(who === 1 ? C.SND.win : C.SND.lose);
  
  h.clearRect(310, 20, 470, 300);
  if (who === 1) {
    drawRightText(C.TXT.sunkE, "Monofonto23", 3);
  } else {
    drawRightText(C.TXT.sunkP, "Monofonto23", 2);
  }
  flip();
  seq.ovT = 3500;
}

function finishSunk() {
  const who = seq.sWho;
  seq.sWho = 0;
  locked = 0;
  if (who === 1) {
    if (remain.e <= 0) goWin();
    else goCpuTurn();
  } else {
    if (remain.p <= 0) goLose();
    else goPlayerTurn();
  }
}

function fireAtCursor() {
  const idx = cur.row * 10 + cur.col;
  if (board.eHit[idx]) return;
  locked = 1;
  const hit = board.eShip[idx] !== 0;
  board.eHit[idx] = hit ? 2 : 1;
  drawIndicator(C.GX, C.GY, cur.row, cur.col, board.eHit[idx], 0);
  drawCursor(cur.row, cur.col, true);
  flip();
  Pip.audioStart(hit ? C.SND.hit : C.SND.miss);
  if (hit) {
    const s = eShips[board.eShip[idx] - 1];
    s.hits++;
    if (s.hits === s.len) { 
      s.sunk = 1; 
      remain.e--; 
      seq.after = 1;
      showSunkRightText(1); 
      return; 
    }
  }
  seq.after = 1;
  showOverlay(hit ? "Hit! Nice Shot!" : "Miss! That was close!");
}

function cpuFire() {
  let idx = -1;
  if (cpuMode === 1 && cpuTargets.length > 0) {
    while (cpuTargets.length > 0) {
      let cand = cpuTargets.pop();
      if (!board.pHit[cand]) {
        idx = cand;
        break;
      }
    }
  }
  if (idx === -1) {
    do { idx = Math.randInt(100); } while (board.pHit[idx]);
  }

  const hit = board.pShip[idx] !== 0;
  board.pHit[idx] = hit ? 2 : 1;
  drawIndicator(C.GX, C.GY, (idx / 10) | 0, idx % 10, board.pHit[idx], 0);
  flip();
  Pip.audioStart(hit ? C.SND.hit : C.SND.miss);
  if (hit) {
    if (cpuMode === 1) {
      let r = (idx / 10) | 0, c = idx % 10;
      let neighbors = [
        {r: r - 1, c: c},
        {r: r + 1, c: c},
        {r: r, c: c - 1},
        {r: r, c: c + 1}
      ];
      for (let i = 0; i < neighbors.length; i++) {
        let nr = neighbors[i].r, nc = neighbors[i].c;
        if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) {
          let nIdx = nr * 10 + nc;
          if (!board.pHit[nIdx]) {
            cpuTargets.push(nIdx);
          }
        }
      }
    }
    const s = pShips[board.pShip[idx] - 1];
    s.hits++;
    if (s.hits === s.len) {
      s.sunk = 1;
      remain.p--;
      if (cpuMode === 1) cpuTargets = [];
      seq.after = 2;
      showSunkRightText(2);
      return;
    }
  }
  seq.after = 2;
  showOverlay(hit ? "Hit! Nice Shot!" : "Miss! That was close!");
}

// ---------------------------------------------------------------------
// input
// ---------------------------------------------------------------------
function onKnob1(dir, long) {
  if (state === STATE.TITLE) {
    if (dir === 0) { Pip.playSound("TAB"); goPlacement(); }
    else if (dir !== 0) {
      cpuMode = 1 - cpuMode;
      Pip.playSound("SCROLL");
      drawTitleMode();
      flip();
    }
    return;
  }
  if (state === STATE.WIN || state === STATE.LOSE) { if (dir === 0) goTitle(); return; }
  if (locked) return;
  if (state === STATE.PLACEMENT) {
    if (plc.done) { if (dir === 0) goPlayerTurn(); return; }
    if (dir === 0) { if (long) placeCurrentShip(); else rotateShip(); }
    else moveShipPreview(dir, 0);
    return;
  }
  if (state === STATE.PLAYER_TURN) {
    if (dir === 0) fireAtCursor();
    else moveCursor(dir, 0);
  }
}

function onKnob2(dir) {
  if (state === STATE.TITLE) {
    if (dir !== 0) {
      cpuMode = 1 - cpuMode;
      Pip.playSound("SCROLL");
      drawTitleMode();
      flip();
    }
    return;
  }
  if (!dir || locked) return;
  if (state === STATE.PLACEMENT && !plc.done) moveShipPreview(0, dir);
  else if (state === STATE.PLAYER_TURN) moveCursor(0, dir);
}

// ---------------------------------------------------------------------
// main tick -- drives all timed sequences at 10Hz
// ---------------------------------------------------------------------
function onTick(h) { "ram";
  if (seq.ovT > 0) { 
    seq.ovT -= 100; 
    if (seq.ovT <= 0) {
      if (seq.sWho > 0) {
        finishSunk();
      } else {
        closeOverlay();
      }
    } 
    return; 
  }
  if (state === STATE.CPU_TURN && seq.cpuT > 0) {
    seq.cpuT -= 100; seq.cpuDotT -= 100;
    if (seq.cpuDotT <= 0 && seq.cpuDots < 5) { seq.cpuDots++; seq.cpuDotT = 600; drawCpuDots(); flip(); }
    if (seq.cpuT <= 0) cpuFire();
    return;
  }
  if (state === STATE.WIN || state === STATE.LOSE) {
    seq.flipT -= 100;
    if (seq.flipT <= 0) { seq.flipT = 2500; seq.flipPh = seq.flipPh ? 0 : 1; drawEndScreen(); }
  }
}

// ---------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------
Pip.audioStop();
Pip.onExclusive("knob1", onKnob1);
Pip.onExclusive("knob2", onKnob2);
goTitle();
initT = setTimeout(() => { buildLogo(); }, 0);
tick = setInterval(onTick, 100, h);

return {
  id: "BATTLEPIP",
  notDefault: true,
  fullscreen: true,
  remove: function() {
    clearInterval(tick);
    if (initT) clearTimeout(initT);
    if (titleT) clearTimeout(titleT);
    Pip.removeListener("knob1", onKnob1);
    Pip.removeListener("knob2", onKnob2);
    Pip.audioStop();
    h.clear();
  }
};

});