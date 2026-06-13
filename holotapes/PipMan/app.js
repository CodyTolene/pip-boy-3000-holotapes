// ============================================================
//  PIP MAN  —  Pip-Boy 3000 App
//  Description:
//  PipMan is a Pac-Man inspired game built for the Pip-Boy 3000, blending retro gaming nostalgia with the iconic wasteland aesthetic. Navigate the maze, dodge ghouls, and collect caps — all from the wrist-mounted terminal of the Commonwealth.
//  Controls:
//    knob1 (scroll wheel) → UP (-1) / DOWN (+1)
//    knob2 (thumb wheel)  → LEFT (-1) / RIGHT (+1)
//    ENC1_PRESS           → start / pause / resume / confirm
//  Scoring:
//    10 points per dot, 50 points per power pellet
//    200 points per ghoul eaten, plus 500 points and level increase on clearing all dots
//
//  Version 1.0.1
//
//  1.0.0 - Initial release
//  1.0.1 - Improved fps and input handling, improved ghost AI, added pause screen and minor bug fixes
//
// ============================================================

(function () {
  var W = h.getWidth(),
    H = h.getHeight();
  var COLS = 20,
    ROWS = 13;
  var TW = Math.floor(W / COLS),
    TH = Math.floor(H / ROWS);
  var OX = Math.floor((W - COLS * TW) / 2),
    OY = Math.floor((H - ROWS * TH) / 2);
  var S = Math.max(1, Math.floor((Math.min(TW, TH) * 0.7) / 6));

  var MAP_SRC =
    '11111111111111111111' +
    '10000000000000000001' +
    '13101101100111011031' +
    '10100000000000001001' +
    '10111011211211011101' +
    '10000012222221000001' +
    '10111012222221011101' +
    '10100000211200000101' +
    '10111011111111011101' +
    '10000000000000000001' +
    '13101110111101110131' +
    '10000000000000000001' +
    '11111111111111111111';

  var ST_START = 0,
    ST_PLAY = 1,
    ST_PAUSE = 2,
    ST_DEAD = 3,
    ST_CLEAR = 4,
    ST_OVER = 5;
  var GX = [9, 10, 9, 10],
    GY = [5, 5, 6, 6],
    GC = [1, 2, 3, 1];
  var MDX = [1, 0, -1, 0],
    MDY = [0, 1, 0, -1];

  var map, score, lives, level, gs;
  var px, py, pdx, pdy, pendx, pendy;
  var ftimer, ptick, gtick, stimer, dots, hiScore;
  var tI = null,
    dI = null,
    pW = null;
  var lk1 = 0,
    lk2 = 0;
  var gx = [0, 0, 0, 0],
    gy = [0, 0, 0, 0],
    gdx = [0, 0, 0, 0],
    gdy = [0, 0, 0, 0];
  var gsc = [0, 0, 0, 0],
    gde = [0, 0, 0, 0],
    grs = [0, 0, 0, 0],
    gmt = [0, 0, 0, 0];
  var dirX = [],
    dirY = [];
  var o0, o1, o2, o3, on;
  var opx,
    opy,
    ogx = [0, 0, 0, 0],
    ogy = [0, 0, 0, 0];

  function tile(tx, ty) {
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return 1;
    return map[ty * COLS + tx];
  }

  function mkMap() {
    map = [];
    for (var i = 0; i < MAP_SRC.length; i++)
      map[i] = MAP_SRC.charCodeAt(i) - 48;
    dots = 0;
    for (var j = 0; j < map.length; j++) {
      var t = map[j];
      if (t === 0 || t === 3) dots++;
    }
  }

  function markDirty(x, y) {
    dirX.push(x);
    dirY.push(y);
  }

  function drawCell(c, r) {
    var t = map[r * COLS + c];
    var x = OX + c * TW,
      y = OY + r * TH;
    h.setColor(0).fillRect(x, y, x + TW - 1, y + TH - 1);
    if (t === 1) {
      h.setColor(2).fillRect(x, y, x + TW - 1, y + TH - 1);
      h.setColor(3).drawRect(x, y, x + TW - 1, y + TH - 1);
    } else if (t === 0) {
      var mx = x + (TW >> 1),
        my = y + (TH >> 1);
      h.setColor(1).fillRect(mx - 1, my - 1, mx + 1, my + 1);
    } else if (t === 3) {
      if ((ptick >> 2) & 1) {
        var mx = x + (TW >> 1),
          my = y + (TH >> 1);
        h.setColor(2).fillRect(mx - 3, my - 4, mx + 3, my + 2);
        h.setColor(3).drawRect(mx - 3, my - 4, mx + 3, my + 2);
      }
    }
  }

  function drawFullMaze() {
    for (var r = 0; r < ROWS; r++)
      for (var c = 0; c < COLS; c++) drawCell(c, r);
  }

  function drawSprite(c, r) {
    var x = OX + c * TW,
      y = OY + r * TH;
    var cx = x + (TW >> 1),
      cy = y + (TH >> 1);
    for (var i = 0; i < 4; i++) {
      if (!gde[i] && !grs[i] && gx[i] === c && gy[i] === r) {
        if (gsc[i]) {
          h.setColor(ftimer < 30 && (ptick >> 2) & 1 ? 3 : 2).fillRect(
            cx - 3 * S,
            cy - 2 * S,
            cx + 3 * S,
            cy + 2 * S,
          );
        } else {
          h.setColor(GC[i]).fillRect(
            cx - 3 * S,
            cy - 5 * S,
            cx + 3 * S,
            cy + 2 * S,
          );
          h.setColor(3)
            .fillRect(cx - 2 * S, cy - 3 * S, cx - S, cy - 2 * S)
            .fillRect(cx + S, cy - 3 * S, cx + 2 * S, cy - 2 * S);
          h.setColor(0).fillRect(cx - 2 * S, cy + S, cx + 2 * S, cy + 2 * S);
        }
        return;
      }
    }
    if (px === c && py === r) {
      var fl = pdx < 0 ? -1 : 1;
      h.setColor(1).fillRect(cx - 3 * S, cy - 5 * S, cx + 3 * S, cy - 3 * S);
      h.setColor(3).fillRect(cx - 3 * S, cy - 3 * S, cx + 3 * S, cy + 3 * S);
      h.setColor(0).fillRect(cx + fl * S, cy - 2 * S, cx + fl * 2 * S, cy);
      return;
    }
    drawCell(c, r);
  }

  function drawHUD() {
    h.setColor(0).fillRect(0, 0, W - 1, 8);
    h.setFont('6x8', 1)
      .setFontAlign(-1, -1)
      .setColor(3)
      .drawString(score, 2, 1);
    h.setFontAlign(1, -1)
      .setColor(3)
      .drawString(
        lives > 2 ? 'OOO' : lives > 1 ? 'OO' : lives > 0 ? 'O' : '',
        W - 2,
        1,
      );
  }

  function drawBox(l1, l2) {
    var bw = 130,
      bh = l2 ? 38 : 20;
    var bx = (W - bw) >> 1,
      by = (H - bh) >> 1;
    h.setColor(0).fillRect(bx, by, bx + bw, by + bh);
    h.setColor(3).drawRect(bx, by, bx + bw, by + bh);
    h.setFont('6x8', 1).setFontAlign(0, 0);
    h.setColor(2).drawString(l1, W / 2, H / 2 - (l2 ? 8 : 0));
    if (l2) h.setColor(3).drawString(l2, W / 2, H / 2 + 10);
  }

  function spawnP() {
    px = 10;
    py = 9;
    pdx = 1;
    pdy = 0;
    pendx = 1;
    pendy = 0;
  }
  function spawnG() {
    for (var i = 0; i < 4; i++) {
      gx[i] = GX[i];
      gy[i] = GY[i];
      gdx[i] = i % 2 ? -1 : 1;
      gdy[i] = 0;
      gsc[i] = 0;
      gde[i] = 0;
      grs[i] = 0;
      gmt[i] = 0;
    }
  }

  function stepP() {
    opx = px;
    opy = py;
    if (tile(px + pendx, py + pendy) !== 1) {
      pdx = pendx;
      pdy = pendy;
    }
    var nx = px + pdx,
      ny = py + pdy;
    if (tile(nx, ny) !== 1) {
      px = nx;
      py = ny;
    }
    if (px !== opx || py !== opy) {
      markDirty(opx, opy);
      markDirty(px, py);
    }
    var c = tile(px, py);
    if (c === 0) {
      map[py * COLS + px] = 2;
      score += 10;
      dots--;
    } else if (c === 3) {
      map[py * COLS + px] = 2;
      score += 50;
      dots--;
      ftimer = 80 + level * 5;
      for (var i = 0; i < 4; i++) if (!gde[i]) gsc[i] = 1;
    }
    if (dots <= 0) {
      gs = ST_CLEAR;
      stimer = 25;
    }
  }

  function stepG() {
    for (var i = 0; i < 4; i++) {
      ogx[i] = gx[i];
      ogy[i] = gy[i];
      if (grs[i] > 0) {
        grs[i]--;
        continue;
      }
      if (gde[i]) {
        gde[i] = 0;
        gsc[i] = 0;
        gx[i] = GX[i];
        gy[i] = GY[i];
        gdx[i] = 1;
        gdy[i] = 0;
      }
      var ev = gsc[i] ? 2 : 1;
      gmt[i]++;
      if (gmt[i] < ev) continue;
      gmt[i] = 0;
      var ox = -gdx[i],
        oy = -gdy[i];
      on = 0;
      if (MDX[0] !== ox || MDY[0] !== oy) {
        if (tile(gx[i] + MDX[0], gy[i] + MDY[0]) !== 1) {
          if (on === 0) o0 = 0;
          else if (on === 1) o1 = 0;
          else if (on === 2) o2 = 0;
          else o3 = 0;
          on++;
        }
      }
      if (MDX[1] !== ox || MDY[1] !== oy) {
        if (tile(gx[i] + MDX[1], gy[i] + MDY[1]) !== 1) {
          if (on === 0) o0 = 1;
          else if (on === 1) o1 = 1;
          else if (on === 2) o2 = 1;
          else o3 = 1;
          on++;
        }
      }
      if (MDX[2] !== ox || MDY[2] !== oy) {
        if (tile(gx[i] + MDX[2], gy[i] + MDY[2]) !== 1) {
          if (on === 0) o0 = 2;
          else if (on === 1) o1 = 2;
          else if (on === 2) o2 = 2;
          else o3 = 2;
          on++;
        }
      }
      if (MDX[3] !== ox || MDY[3] !== oy) {
        if (tile(gx[i] + MDX[3], gy[i] + MDY[3]) !== 1) {
          if (on === 0) o0 = 3;
          else if (on === 1) o1 = 3;
          else if (on === 2) o2 = 3;
          else o3 = 3;
          on++;
        }
      }
      if (on === 0) {
        gdx[i] = ox;
        gdy[i] = oy;
        continue;
      }
      var ci;
      if (gsc[i] || Math.random() < 0.3) {
        ci =
          on === 1
            ? o0
            : on === 2
              ? Math.random() < 0.5
                ? o0
                : o1
              : Math.random() < 0.33
                ? o0
                : Math.random() < 0.5
                  ? o1
                  : o2;
      } else {
        var bd = 999,
          dd,
          cx2,
          co = o0;
        if (on > 0) {
          cx2 = o0;
          dd =
            Math.abs(gx[i] + MDX[cx2] - px) + Math.abs(gy[i] + MDY[cx2] - py);
          if (dd < bd) {
            bd = dd;
            co = cx2;
          }
        }
        if (on > 1) {
          cx2 = o1;
          dd =
            Math.abs(gx[i] + MDX[cx2] - px) + Math.abs(gy[i] + MDY[cx2] - py);
          if (dd < bd) {
            bd = dd;
            co = cx2;
          }
        }
        if (on > 2) {
          cx2 = o2;
          dd =
            Math.abs(gx[i] + MDX[cx2] - px) + Math.abs(gy[i] + MDY[cx2] - py);
          if (dd < bd) {
            bd = dd;
            co = cx2;
          }
        }
        if (on > 3) {
          cx2 = o3;
          dd =
            Math.abs(gx[i] + MDX[cx2] - px) + Math.abs(gy[i] + MDY[cx2] - py);
          if (dd < bd) {
            bd = dd;
            co = cx2;
          }
        }
        ci = co;
      }
      markDirty(gx[i], gy[i]);
      gdx[i] = MDX[ci];
      gdy[i] = MDY[ci];
      gx[i] += MDX[ci];
      gy[i] += MDY[ci];
      markDirty(gx[i], gy[i]);
    }
  }

  function hit(i) {
    if (gsc[i]) {
      gde[i] = 1;
      gsc[i] = 0;
      grs[i] = 8;
      score += 200;
    } else {
      lives--;
      if (lives <= 0) {
        if (score > hiScore) hiScore = score;
        gs = ST_OVER;
      } else {
        gs = ST_DEAD;
        stimer = 25;
      }
    }
  }

  function chkCol() {
    for (var i = 0; i < 4; i++) {
      if (gde[i] || grs[i] > 0) continue;
      if (gx[i] === px && gy[i] === py) {
        hit(i);
        continue;
      }
      if (gx[i] === opx && gy[i] === opy && ogx[i] === px && ogy[i] === py)
        hit(i);
    }
  }

  function onTick() {
    if (gs === ST_DEAD || gs === ST_CLEAR) {
      stimer--;
      if (stimer <= 0) {
        if (gs === ST_DEAD) {
          spawnP();
          spawnG();
          ftimer = 0;
          gs = ST_PLAY;
          h.clear(1);
          drawFullMaze();
          drawHUD();
          dirX = [];
          dirY = [];
        } else {
          level++;
          score += 500 * level;
          mkMap();
          spawnP();
          spawnG();
          ftimer = 0;
          gs = ST_PLAY;
          drawFullMaze();
        }
      }
      return;
    }
    if (gs !== ST_PLAY) return;
    gtick = (gtick + 1) & 255;
    ptick = (ptick + 1) & 255;
    if (ftimer > 0) {
      ftimer--;
      if (ftimer === 0) for (var i = 0; i < 4; i++) if (!gde[i]) gsc[i] = 0;
    }
    stepP();
    stepG();
    chkCol();
  }

  function onDraw() {
    if (gs === ST_START) {
      h.clear(1);
      h.setFontMonofonto28()
        .setFontAlign(0, 0)
        .setColor(3)
        .drawString('PIP MAN', W / 2, H / 2 - 60);
      h.setFont('6x8', 2)
        .setColor(2)
        .drawString('Click to START', W / 2, H / 2 - 20);
      if (hiScore > 0) {
        h.setFont('6x8', 2)
          .setColor(2)
          .setFontAlign(0, 0)
          .drawString('HIGH SCORE', W / 2, H / 2 + 5);
        h.setFont('6x8', 4)
          .setColor(1)
          .setFontAlign(0, 0)
          .drawString('' + hiScore, W / 2, H / 2 + 30);
      }
      h.setFont('6x8', 2)
        .setColor(3)
        .setFontAlign(0, 0)
        .drawString('SCROLL=UP/DN', W / 2, H / 2 + 68)
        .drawString('THUMB=L/R', W / 2, H / 2 + 88);
      h.flip();
      Pip.lastFlip = getTime();
      return;
    }
    if (gs === ST_OVER) {
      h.clear(1);
      h.setFont('6x8', 3)
        .setFontAlign(0, 0)
        .setColor(3)
        .drawString('GAME OVER', W / 2, H / 2 - 60);
      h.setFont('6x8', 2)
        .setColor(2)
        .drawString('Click to RESTART', W / 2, H / 2 - 20);
      h.setFont('6x8', 2)
        .setColor(3)
        .drawString('Score: ' + score, W / 2, H / 2 + 5)
        .drawString('Level: ' + level, W / 2, H / 2 + 25);
      h.setColor(2).drawString('High Score: ' + hiScore, W / 2, H / 2 + 45);
      h.flip();
      Pip.lastFlip = getTime();
      return;
    }
    if (gs === ST_PAUSE) {
      drawBox('-- PAUSED --', '');
      h.flip();
      Pip.lastFlip = getTime();
      return;
    }
    for (var k = 0; k < dirX.length; k++) drawSprite(dirX[k], dirY[k]);
    for (var j = 0; j < map.length; j++) {
      if (map[j] === 3) {
        var pc = j % COLS,
          pr = (j / COLS) | 0;
        drawCell(pc, pr);
      }
    }
    drawHUD();
    if (gs === ST_DEAD) drawBox('IRRADIATED!', lives + ' LIVES LEFT');
    if (gs === ST_CLEAR) drawBox('SECTOR CLEAR!', '+' + 500 * level + ' CAPS');
    dirX = [];
    dirY = [];
    h.flip();
    Pip.lastFlip = getTime();
  }

  function reset() {
    mkMap();
    score = 0;
    lives = 3;
    level = 1;
    ftimer = 0;
    ptick = 0;
    gtick = 0;
    gs = ST_PLAY;
    spawnP();
    spawnG();
    h.clear(1);
    drawFullMaze();
    drawHUD();
    h.flip();
    Pip.lastFlip = getTime();
    dirX = [];
    dirY = [];
  }

  function onK1(d) {
    if (!d) return;
    var n = Date.now();
    if (n - lk1 < 20) return;
    lk1 = n;
    if (gs === ST_PLAY) {
      pendy = d < 0 ? -1 : 1;
      pendx = 0;
    }
  }
  function onK2(d) {
    if (!d) return;
    var n = Date.now();
    if (n - lk2 < 20) return;
    lk2 = n;
    if (gs === ST_PLAY) {
      pendx = d < 0 ? -1 : 1;
      pendy = 0;
    }
  }
  function onBtn(e) {
    if (!e.state) return;
    if (gs === ST_START || gs === ST_OVER) reset();
    else if (gs === ST_PLAY) {
      gs = ST_PAUSE;
    } else if (gs === ST_PAUSE) {
      gs = ST_PLAY;
      h.clear(1);
      drawFullMaze();
      drawHUD();
      dirX = [];
      dirY = [];
    } else if (gs === ST_DEAD || gs === ST_CLEAR) stimer = 0;
  }

  function start() {
    h.clear();
    Pip.audioStop();
    hiScore = 0;
    try {
      var d = JSON.parse(fs.readFile('HOLO/PIPMAN/save.json'));
      hiScore = d.h || 0;
    } catch (e) {}
    gs = ST_START;
    mkMap();
    score = 0;
    lives = 3;
    level = 1;
    ftimer = 0;
    ptick = 0;
    gtick = 0;
    spawnP();
    spawnG();
    dirX = [];
    dirY = [];
    Pip.onExclusive('knob1', onK1);
    Pip.onExclusive('knob2', onK2);
    pW = setWatch(onBtn, ENC1_PRESS, {
      repeat: true,
      edge: 'both',
      debounce: 20,
    });
    onDraw();
    tI = setInterval(onTick, 100);
    dI = setInterval(onDraw, 33);
  }

  function remove() {
    Pip.removeListener('knob1', onK1);
    Pip.removeListener('knob2', onK2);
    clearInterval(tI);
    clearInterval(dI);
    clearWatch(pW);
    Pip.audioStop();
    h.clear();
    try {
      fs.writeFile('HOLO/PIPMAN/save.json', JSON.stringify({ h: hiScore }));
    } catch (e) {}
  }

  start();
  return { id: 'PIPMAN', notDefault: true, fullscreen: true, remove: remove };
});
