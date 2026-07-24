// =========================================================
// CHEM WARS - A Mojave Trading Simulation
// Holotape for the Wand Company Pip-Boy 3000 (Espruino)
// -----
// You lost an Omertas shipment: 30 days to pay 50,000 caps
// (+2%/day, payable at Gomorrah) or lose your kneecaps.
// NARC-9, Fiends, muggers, and cazadores stalk the roads.
// -----
// MEMORY-CRITICAL: deploy the minified build (terser, with
// own-property mangling) as HOLO/CHEM_WARS/APP.JS, plus
// TEXT.TXT (all game text) alongside it. TEXT.TXT is one
// line: sections split '#', entries '|', sub-lines '~' —
// those three characters are reserved and must not appear
// in text. Section order (indices are load-bearing):
//  0 LOC_TAG   1 BOOM      2 CRASH     3 (unused)
//  4 FIND      5 EVT_INTRO 6 VIOLATION 7 RUN_OK
//  8 FX_DESC   9 FX_USE   10 END_TITLE 11 END_TEXT
// 12 OFFER    13 NOPE     14 INTRO    15 MISC (M[])
// 16 RAID     17 HAZARD   18 HEAL     19 LOC_NAMES
// 20 CHEMS    21 BAR      22 UI FRAGMENTS (U[])
// =========================================================

(function () {
  try {
    E.setFlags({ pretokenise: 1 });
  } catch (e) {}

  const fs = require('fs');
  const FL = Math.floor;
  const MR = Math.randInt;
  const SAVE_PATH = 'HOLO/CHEM_WARS/CW.JSON';

  function P(s) {
    return s.split('|');
  }

  let TX = null;

  // ===== TUNING ==========================================

  const GOAL_CAPS = 50000;
  const TOTAL_DAYS = 30;
  // Debt interest is debt/50 (2%/day); rate text lives in TEXT.
  const BANK_RATE = 3;
  const START_CAPS = 2000;
  const START_PACK = 100;
  const MAX_PACK = 200;

  // ===== DATA ============================================

  const CMIN = [90, 15, 350, 60, 500];
  const CMAX = [260, 90, 900, 200, 1400];
  const NUM_CHEMS = 5;
  const NUM_LOCS = 6;
  const LOC_GS = 0;
  const LOC_FREESIDE = 1;
  const LOC_STRIP = 2;

  // Price modifier %, indexed [loc * NUM_CHEMS + chem].
  // Base64-packed bytes; see git history for the plain table.
  const LOC_MOD = E.toUint8Array(
    atob('ZF9pZFpaPGRfbni0gnOMblVGaXhpZG5kX3N4eDeC'),
  );

  // Text tables: assigned in init() (deferred boot), nulled
  // in remove() so the next launch finds a compacted heap.
  let LOC_TAG,
    BOOM_MSG,
    CRASH_MSG,
    FIND_MSG,
    EVT_INTRO,
    VIOLATIONS,
    RUN_OK,
    FX_DESC,
    FX_USE_MSG,
    END_TITLE,
    END_TEXT,
    OFFER_TXT,
    NOPE,
    IN,
    M,
    RAID_INTRO,
    HAZ_MSG,
    HEAL_MSG,
    LOC_NAMES,
    CN,
    BAR_LABELS,
    U;

  const FX_BUFF = 1,
    FX_JET = 2,
    FX_PSY = 4,
    FX_MENT = 8,
    FX_MEDX = 16;

  // ===== STATE ===========================================

  const STATE = {
    day: 1,
    caps: START_CAPS,
    bank: 0,
    debt: GOAL_CAPS,
    loc: 0,
    pack: START_PACK,
    hp: 100,
    gun: false,
    fx: 0,
    addict: 0,
    tox: 0, // doses used today (OD risk)
    inv: new Uint16Array(NUM_CHEMS),
    prices: new Uint16Array(NUM_CHEMS),
    msg: '',
  };

  const M_INTRO = 0,
    M_MAIN = 1,
    M_BUY = 2,
    M_SELL = 3,
    M_TRAVEL = 4,
    M_QTY = 5,
    M_BANK = 6,
    M_EVENT = 7,
    M_OVER = 8,
    M_OFFER = 9,
    M_USE = 10,
    M_DOC = 11;

  const A_BUY = 0,
    A_SELL = 1,
    A_DEP = 2,
    A_WDR = 3,
    A_PAY = 4;

  const BAR_X4 = [90, 195, 300, 415];
  const BAR_X5 = [55, 150, 245, 337, 424];

  let best = 0;
  let sv = null;

  const UI = {
    mode: M_INTRO,
    caravan: false,
    newBest: false,
    cur: 0,
    chem: 0,
    act: A_BUY,
    qty: 0,
    qtyMax: 0,
    stage: 0,
    intro: 0,
    cost: 0,
    offType: 0,
    foe: 0, // M_EVENT: 0 = NARC-9, 1 = Fiends
    r1: '',
    r2: '',
    r3: '',
  };

  // ===== HELPERS =========================================

  function snd(s) {
    Pip.playSound(s);
  }

  // Stock OEM WAVs on the device SD (alarm themes + FX).
  // try/catch in case a custom SD card lacks them.
  function sfx(p) {
    try {
      Pip.audioStart('SOUND/' + p + '.wav');
    } catch (e) {}
  }

  // OEM aid sounds, index-aligned with CN and HEAL_MSG.
  const USE_SFX = P('MENTATS|JET|PSYCHO|MENTATS|SURGERY_MORPHINE');
  const HEAL_SFX = P('STIMPAK|FOOD_CHEWY|NUKACOLA');

  function rndInt(lo, hi) {
    return lo + MR(hi - lo + 1);
  }

  // Commas from 10,000 up ("2000", "50,000").
  function fmt(n) {
    const s = '' + n;
    let o = '',
      c = 0,
      i;
    if (n < 10000) return s;
    for (i = s.length - 1; i >= 0; i--) {
      o = s.charAt(i) + o;
      c++;
      if (c % 3 === 0 && i > 0) o = ',' + o;
    }
    return o;
  }

  function invTotal() {
    let t = 0;
    for (let i = 0; i < NUM_CHEMS; i++) t += STATE.inv[i];
    return t;
  }

  function countBits(b) {
    let n = 0;
    for (let i = 0; i < NUM_CHEMS; i++) if (b & (1 << i)) n++;
    return n;
  }

  function addictNames() {
    let s = '';
    for (let i = 0; i < NUM_CHEMS; i++) {
      if (STATE.addict & (1 << i)) s += (s ? ', ' : '') + CN[i];
    }
    return s;
  }

  function specialLoc() {
    return (
      STATE.loc === LOC_GS ||
      STATE.loc === LOC_FREESIDE ||
      STATE.loc === LOC_STRIP
    );
  }

  function menuLen() {
    if (UI.mode === M_MAIN) return specialLoc() ? 5 : 4;
    if (UI.mode === M_TRAVEL) return NUM_LOCS + 2;
    if (UI.mode === M_BANK || UI.mode === M_DOC) return 3;
    if (UI.mode === M_EVENT) return STATE.gun ? 3 : 2;
    if (UI.mode === M_OFFER) return 2;
    return NUM_CHEMS + 1;
  }

  // ===== PERSISTENCE =====================================

  function loadScore() {
    let d;
    try {
      d = JSON.parse(fs.readFile(SAVE_PATH));
      if (d && d.best) best = d.best;
      if (
        d &&
        d.sv &&
        d.sv.inv &&
        d.sv.inv.length === NUM_CHEMS &&
        d.sv.day >= 1 &&
        d.sv.day < TOTAL_DAYS
      ) {
        sv = d.sv;
      }
    } catch (e) {}
  }

  function saveAll(withRun) {
    const d = { best: best };
    let i, s;
    if (withRun) {
      s = {
        day: STATE.day,
        caps: STATE.caps,
        bank: STATE.bank,
        debt: STATE.debt,
        loc: STATE.loc,
        pack: STATE.pack,
        hp: STATE.hp,
        gun: STATE.gun ? 1 : 0,
        fx: STATE.fx,
        addict: STATE.addict,
        tox: STATE.tox,
        inv: [],
        prices: [],
      };
      for (i = 0; i < NUM_CHEMS; i++) {
        s.inv.push(STATE.inv[i]);
        s.prices.push(STATE.prices[i]);
      }
      d.sv = s;
    }
    try {
      fs.writeFile(SAVE_PATH, JSON.stringify(d));
    } catch (e) {}
  }

  // ===== MARKET ==========================================

  function randomizePrices() {
    const base = STATE.loc * NUM_CHEMS;
    let i, p, c;
    STATE.msg = '';
    for (i = 0; i < NUM_CHEMS; i++) {
      p = rndInt(CMIN[i], CMAX[i]);
      p = FL((p * LOC_MOD[base + i]) / 100);
      STATE.prices[i] = p < 1 ? 1 : p;
    }
    if (MR(10) < 3) {
      c = MR(NUM_CHEMS);
      if (MR(2) === 0) {
        p = STATE.prices[c] * rndInt(3, 5);
        STATE.prices[c] = p > 65535 ? 65535 : p;
        STATE.msg = BOOM_MSG[c];
      } else {
        p = FL(STATE.prices[c] / rndInt(3, 5));
        STATE.prices[c] = p < 1 ? 1 : p;
        STATE.msg = CRASH_MSG[c];
      }
    }
  }

  // ===== TRAVEL & EVENTS =================================

  // Too beat up to stand: lose a day and some caps, wake up
  // at Doc Mitchell's in Goodsprings on 30 HP.
  function blackout() {
    if (STATE.day < TOTAL_DAYS) STATE.day++;
    STATE.loc = LOC_GS;
    randomizePrices();
    STATE.tox = 0;
    STATE.hp = 30;
    STATE.caps -= FL(STATE.caps / 10);
    STATE.msg = M[65];
  }

  // Non-fight damage (beatings, critters, overdose). Buffout
  // toughness halves it. Returns HP actually lost, or -1 if
  // it knocked you out (blackout() already ran). KO happens
  // at exactly 0 — what the HP counter promises.
  function hurt(n) {
    if (STATE.fx & FX_BUFF) n = n >> 1;
    STATE.hp -= n;
    if (STATE.hp <= 0) {
      blackout();
      return -1;
    }
    return n;
  }

  // Returns 0 quiet, 1 NARC-9, 2 duffel offer, 3 gun offer,
  // 4 Fiend ambush.
  function travel(destIdx, caravan) {
    let r, loss, gain;
    const jet = STATE.fx & FX_JET;
    STATE.loc = destIdx;
    if (caravan) STATE.caps -= 250;
    if (jet) {
      STATE.fx &= ~FX_JET;
    } else {
      STATE.day++;
      STATE.debt += FL(STATE.debt / 50); // 2%/day
      STATE.bank += FL((STATE.bank * BANK_RATE) / 100);
      STATE.tox = 0; // sleep it off
    }
    STATE.fx &= ~FX_MENT;
    randomizePrices();
    loss = countBits(STATE.addict) * 300;
    if (loss > 0) {
      if (STATE.caps >= loss) {
        STATE.caps -= loss;
        if (!STATE.msg) STATE.msg = M[46] + loss + ' CAPS.';
      } else {
        // Can't feed the habit: withdrawal takes it in HP.
        STATE.caps = 0;
        gain = hurt(rndInt(5, 15));
        STATE.msg = M[70] + (gain >= 0 ? '-' + gain + ' HP.' : 'KO! -1 DAY.');
      }
    }
    const t = caravan ? [5, 8, 10, 20, 28, 36] : [18, 33, 41, 49, 55, 61];
    r = MR(100);
    if (r < t[0]) return 1; // combat chems stay live
    if (r < t[1]) return 4; // ditto
    if (r < t[2]) {
      // Wasteland fauna takes a bite. Name the culprit even
      // when it knocks you out.
      loss = MR(3);
      gain = hurt(rndInt(6, 18));
      STATE.msg =
        HAZ_MSG[loss] + (gain >= 0 ? ' -' + gain + ' HP.' : ' KO! -1 DAY.');
    } else if (r < t[3]) {
      if (STATE.hp < 100 && MR(2) === 0) {
        // Lucky find: something restorative.
        gain = rndInt(15, 30);
        STATE.hp += gain;
        if (STATE.hp > 100) STATE.hp = 100;
        loss = MR(3);
        STATE.msg = HEAL_MSG[loss] + ' +' + gain + ' HP.';
        sfx('FX/AID/' + HEAL_SFX[loss]);
      } else {
        gain = rndInt(50, 300);
        STATE.caps += gain;
        STATE.msg = FIND_MSG[MR(2)] + ' +' + gain;
      }
    } else if (r < t[4]) {
      if (STATE.pack < MAX_PACK) {
        STATE.fx = 0;
        return 2;
      }
    } else if (r < t[5]) {
      if (!STATE.gun) {
        STATE.fx = 0;
        return 3;
      }
    }
    STATE.fx = 0;
    if (!STATE.msg) {
      if (caravan) STATE.msg = M[11];
      else if (jet) STATE.msg = M[12];
    }
    if (STATE.day >= TOTAL_DAYS && !STATE.msg) STATE.msg = M[13];
    return 0;
  }

  // Overdose odds climb 15% per dose already taken today,
  // and "today" only resets when a real day passes — so a
  // Jet-fueled binge catches up with you fast.
  function odChance() {
    const c = STATE.tox * 15;
    return c > 90 ? 90 : c;
  }

  function useChem(i) {
    let r;
    if (STATE.inv[i] === 0) {
      STATE.msg = U[12];
      snd('HIGHLIGHT');
      return;
    }
    STATE.inv[i]--;
    if (MR(100) < odChance()) {
      STATE.tox++;
      r = hurt(rndInt(25, 45));
      STATE.msg = M[64] + (r >= 0 ? '-' + r + ' HP.' : 'KO! -1 DAY.');
    } else {
      STATE.tox++;
      STATE.fx |= 1 << i;
      sfx('FX/AID/' + USE_SFX[i]); // the dose hits
      if (!(STATE.addict & (1 << i)) && MR(5) === 0) {
        STATE.addict |= 1 << i;
        STATE.msg = M[24] + CN[i].toUpperCase() + '.';
      } else {
        STATE.msg = FX_USE_MSG[i];
      }
    }
    UI.mode = M_MAIN;
    UI.cur = 0;
  }

  // foe: 0 = NARC-9, 1 = Fiend ambush.
  function openEncounter(foe) {
    UI.mode = M_EVENT;
    UI.stage = 0;
    UI.cur = 0;
    UI.foe = foe;
    UI.intro = MR(2);
    UI.cost = FL(STATE.caps / 4);
  }

  // Laser pistol exchange. Psycho boosts your shots, Med-X
  // dulls theirs, Buffout's 20 temp HP soaks first. Returns
  // [won, hpLost].
  function fightSim(foeHp, lo, hi) {
    let my = STATE.hp + (STATE.fx & FX_BUFF ? 20 : 0);
    let taken = 0,
      dmg;
    while (foeHp > 0 && my > 0) {
      dmg = rndInt(18, 28);
      if (STATE.fx & FX_PSY) dmg = FL((dmg * 3) / 2);
      foeHp -= dmg;
      if (foeHp <= 0) break;
      dmg = rndInt(lo, hi);
      if (STATE.fx & FX_MEDX) dmg = dmg >> 1;
      my -= dmg;
      taken += dmg;
    }
    if (STATE.fx & FX_BUFF && taken > 0) {
      taken = taken > 20 ? taken - 20 : 0;
    }
    return [foeHp <= 0, taken];
  }

  // choice: 0 run, 1 bribe/pay, 2 fight (needs gun).
  function resolveEncounter(choice) {
    const raid = UI.foe === 1;
    let units, fine, sal, i, f, r;
    UI.stage = 1;
    UI.r3 = '';
    if (choice === 1) {
      if (UI.cost > 0) {
        STATE.caps -= UI.cost;
        if (raid) {
          UI.r1 = U[10] + fmt(UI.cost) + ' caps.';
          UI.r2 = M[61];
        } else {
          UI.r1 = M[50] + fmt(UI.cost) + ' caps.';
          UI.r2 = M[26];
        }
      } else if (raid) {
        // Broke? Fiends charge interest in bruises.
        r = hurt(rndInt(10, 25));
        UI.r1 = M[68];
        UI.r2 = M[69];
        UI.r3 = r >= 0 ? '-' + r + ' HP.' : M[65];
      } else {
        UI.r1 = M[27];
        UI.r2 = M[28];
      }
      STATE.fx = 0;
      return;
    }
    if (choice === 2) {
      sfx('FX/ARC_03'); // laser fire opens the exchange
      f = raid ? fightSim(50, 8, 18) : fightSim(80, 12, 24);
      if (f[0]) {
        // Win: real damage sticks, but adrenaline carries you
        // (no blackout on a victory).
        STATE.hp -= f[1];
        if (STATE.hp < 1) STATE.hp = 1;
        sal = raid ? rndInt(100, 400) : rndInt(200, 600);
        STATE.caps += sal;
        UI.r1 = raid ? M[63] : M[29];
        UI.r2 = (raid ? 'LOOTED ' : U[22]) + sal + ' CAPS.';
        UI.r3 = f[1] > 0 ? U[19] + f[1] + U[20] : M[33];
      } else if (raid) {
        // Knocked out cold = blackout, same as everywhere.
        fine = FL(STATE.caps / 4);
        STATE.caps -= fine;
        UI.r1 = M[66];
        UI.r2 = '-' + fmt(fine) + ' CAPS.';
        UI.r3 = M[65];
        blackout();
      } else {
        units = invTotal();
        fine = FL(STATE.caps / 5);
        STATE.caps -= fine;
        for (i = 0; i < NUM_CHEMS; i++) STATE.inv[i] = 0;
        UI.r1 = M[30];
        UI.r2 =
          units > 0 ? U[4] + fmt(fine) + ' CAPS.' : 'FINED ' + fmt(fine) + U[6];
        UI.r3 = M[65];
        blackout();
      }
      STATE.fx = 0;
      return;
    }
    if (MR(100) < 55) {
      UI.r1 = raid ? M[59] : RUN_OK[MR(2)];
      UI.r2 = raid ? '' : M[32];
      STATE.fx = 0;
      return;
    }
    if (raid) {
      // Caught: beaten and robbed.
      fine = FL((STATE.caps * rndInt(20, 35)) / 100);
      STATE.caps -= fine;
      r = hurt(rndInt(8, 20));
      UI.r1 = M[60];
      UI.r2 =
        (r >= 0 ? 'BEATEN -' + r + ' HP. ' : '') +
        'ROBBED -' +
        fmt(fine) +
        ' CAPS.';
      if (r < 0) UI.r3 = M[65];
      STATE.fx = 0;
      return;
    }
    units = invTotal();
    fine = FL(STATE.caps / 10);
    STATE.caps -= fine;
    sfx('FX/HOLSTOP'); // the citation printer delivers
    UI.r1 = 'CITATION #' + rndInt(1000, 9999) + ':';
    UI.r2 = '"' + VIOLATIONS[MR(4)] + '"';
    if (units > 0) {
      for (i = 0; i < NUM_CHEMS; i++) STATE.inv[i] = 0;
      UI.r3 = U[11] + units + '). FINE: ' + fmt(fine) + ' CAPS.';
    } else {
      UI.r3 = U[3] + fmt(fine) + U[18];
    }
    STATE.fx = 0;
  }

  // type: 0 duffel, 1 laser pistol.
  function openOffer(type) {
    UI.mode = M_OFFER;
    UI.cur = 0;
    UI.offType = type;
    UI.cost = type === 1 ? 3500 : STATE.pack === START_PACK ? 2000 : 6000;
  }

  function resolveOffer(choice) {
    if (choice === 0) {
      if (STATE.caps >= UI.cost) {
        STATE.caps -= UI.cost;
        if (UI.offType === 1) {
          STATE.gun = true;
          STATE.msg = M[19];
          sfx('FX/ARC_03'); // laser test-fire
        } else {
          STATE.pack += 50;
          STATE.msg = M[47] + STATE.pack + '.';
          sfx('FX/APP/U'); // duffel shouldered
        }
      } else {
        STATE.msg = M[22];
      }
    } else {
      STATE.msg = UI.offType === 1 ? M[20] : M[21];
    }
    UI.mode = M_MAIN;
    UI.cur = 0;
  }

  function finishGame() {
    const score = STATE.caps + STATE.bank - STATE.debt;
    UI.newBest = false;
    if (score > 0 && score > best) {
      best = score;
      UI.newBest = true;
    }
    sv = null;
    saveAll(false);
    UI.mode = M_OVER;
    // Party noisemaker for a win, vault klaxon for kneecaps.
    sfx(score >= 0 ? 'ALARM/Party' : 'ALARM/Klaxon');
  }

  function newGame() {
    STATE.day = 1;
    STATE.caps = START_CAPS;
    STATE.bank = 0;
    STATE.debt = GOAL_CAPS;
    STATE.loc = 0;
    STATE.pack = START_PACK;
    STATE.hp = 100;
    STATE.gun = false;
    STATE.fx = 0;
    STATE.addict = 0;
    STATE.tox = 0;
    for (let i = 0; i < NUM_CHEMS; i++) STATE.inv[i] = 0;
    randomizePrices();
    UI.mode = M_MAIN;
    UI.cur = 0;
  }

  function resumeGame() {
    let i;
    STATE.day = sv.day;
    STATE.caps = sv.caps;
    STATE.bank = sv.bank;
    STATE.debt = sv.debt;
    STATE.loc = sv.loc;
    STATE.pack = sv.pack;
    STATE.hp = sv.hp;
    STATE.gun = !!sv.gun;
    STATE.fx = sv.fx;
    STATE.addict = sv.addict;
    STATE.tox = sv.tox || 0;
    for (i = 0; i < NUM_CHEMS; i++) {
      STATE.inv[i] = sv.inv[i];
      STATE.prices[i] = sv.prices[i];
    }
    STATE.msg = M[25] + STATE.day + '.';
    UI.mode = M_MAIN;
    UI.cur = 0;
  }

  // ===== RENDERING =======================================

  function T(f, c, a, s, x, y) {
    if (f === 0) h.setFontMonofonto14();
    else if (f === 2) h.setFontMonofonto23();
    else h.setFontMonofonto16();
    h.setColor(c).setFontAlign(a, -1).drawString(s, x, y);
  }

  function CL(f, c, y, s) {
    T(f, c, 0, s, 240, y);
  }

  function R(f, s, x, y, hot) {
    if (hot) T(f, 3, -1, '>', x - 20, y);
    T(f, hot ? 3 : 2, -1, s, x, y);
  }

  function panel(t, a, b, big) {
    CL(2, 3, 100, t);
    CL(0, 2, 132, a);
    CL(0, 2, 150, b);
    CL(1, 3, 184, big);
  }

  function vmenu(items) {
    for (let i = 0; i < items.length; i++) {
      R(1, items[i], 70, 230 + i * 22, UI.cur === i);
    }
  }

  function drawIntro() {
    CL(2, 3, 26, M[45]);
    CL(0, 1, 54, IN[0]);
    for (let i = 0; i < 5; i++) CL(1, 2, 80 + 20 * i, IN[1 + i]);
    CL(0, 1, 188, IN[6]);
    if (best > 0) CL(0, 1, 210, M[48] + fmt(best) + M[49]);
    if (sv) {
      R(
        1,
        M[51] + sv.day + ' (' + fmt(sv.caps) + ' CAPS)',
        120,
        240,
        UI.cur === 0,
      );
      R(1, M[52], 120, 264, UI.cur === 1);
    } else {
      CL(1, 3, 244, M[36]);
      CL(0, 1, 292, IN[7]);
    }
  }

  function drawHeader() {
    h.setColor(1).fillRect(0, 0, 479, 25);
    T(1, 3, -1, 'CHEM WARS', 8, 5);
    T(1, 3, 0, 'HP ' + STATE.hp + (STATE.hp <= 25 ? '!' : ''), 240, 5);
    T(1, 3, 1, 'DAY ' + STATE.day + '/' + TOTAL_DAYS, 472, 5);
    CL(2, 3, 32, LOC_NAMES[STATE.loc]);
    CL(
      0,
      2,
      62,
      'CAPS ' +
        fmt(STATE.caps) +
        '  STASH ' +
        fmt(STATE.bank) +
        '  OWED ' +
        fmt(STATE.debt) +
        '  PACK ' +
        invTotal() +
        '/' +
        STATE.pack,
    );
    if (STATE.msg) {
      // Highlight bar: latest event pops off the page.
      h.setColor(1).fillRect(0, 77, 479, 96);
      CL(0, 3, 80, STATE.msg);
    }
  }

  function drawChemTable() {
    const picking = UI.mode === M_BUY || UI.mode === M_SELL;
    const trading =
      UI.mode === M_QTY && (UI.act === A_BUY || UI.act === A_SELL);
    const base = STATE.loc * NUM_CHEMS;
    let i, y, hot, avg, star, c;
    T(1, 1, -1, M[39], 70, 100);
    T(1, 1, 1, 'PRICE', 300, 100);
    T(1, 1, 1, 'HELD', 400, 100);
    for (i = 0; i < NUM_CHEMS; i++) {
      y = 122 + i * 22;
      hot = (picking && UI.cur === i) || (trading && UI.chem === i);
      c = hot ? 3 : 2;
      if (hot) T(1, 3, -1, '>', 50, y);
      T(1, c, -1, CN[i] + (STATE.addict & (1 << i) ? '!' : ''), 70, y);
      star = '';
      if (STATE.fx & FX_MENT) {
        avg = FL(((CMIN[i] + CMAX[i]) * LOC_MOD[base + i]) / 200);
        if (STATE.prices[i] * 100 < avg * 85) star = '*';
      }
      T(1, c, 1, star + STATE.prices[i], 300, y);
      T(1, c, 1, STATE.inv[i], 400, y);
    }
    if (picking) {
      R(1, 'BACK', 70, 122 + NUM_CHEMS * 22, UI.cur === NUM_CHEMS);
    }
  }

  function drawTravelList() {
    let i, y, label;
    T(1, 1, -1, M[38], 70, 100);
    for (i = 0; i <= NUM_LOCS + 1; i++) {
      y = 122 + i * 22;
      if (i === 0) {
        label = 'BY: ' + (UI.caravan ? M[40] : M[41]);
      } else if (i === NUM_LOCS + 1) {
        label = 'BACK';
      } else {
        label = LOC_NAMES[i - 1] + (i - 1 === STATE.loc ? ' (HERE)' : '');
      }
      R(1, label, 70, y, UI.cur === i);
    }
  }

  function drawBankPanel(withMenu) {
    panel(M[42], M[5], M[6], U[15] + fmt(STATE.bank) + ' CAPS');
    if (withMenu) vmenu(U[2].split('~'));
  }

  function drawDocPanel() {
    const ac = countBits(STATE.addict);
    panel(
      M[43],
      M[7],
      U[13] + (ac ? addictNames() : 'NONE'),
      'HP: ' + STATE.hp + '/100',
    );
    vmenu([
      U[14] + fmt((100 - STATE.hp) * 3) + ' CAPS)',
      U[5] + fmt(ac * 500) + ' CAPS)',
      'BACK',
    ]);
  }

  function drawPayPanel() {
    panel(M[44], M[8], M[9], 'OWED: ' + fmt(STATE.debt) + U[8]);
  }

  function drawUseList() {
    let i, y, hot, d, c;
    T(0, 1, -1, M[3], 50, 100);
    T(0, STATE.tox ? 3 : 1, 1, 'OD ' + odChance() + '%', 444, 100);
    for (i = 0; i < NUM_CHEMS; i++) {
      y = 118 + i * 18;
      hot = UI.cur === i;
      c = hot ? 3 : 2;
      if (hot) T(0, 3, -1, '>', 36, y);
      T(0, c, -1, CN[i] + (STATE.addict & (1 << i) ? '!' : ''), 50, y);
      T(0, c, 1, 'x' + STATE.inv[i], 180, y);
      d = FX_DESC[i];
      if (STATE.fx & (1 << i)) d += ' [ON]';
      T(0, c, -1, d, 200, y);
    }
    R(0, 'BACK', 50, 118 + NUM_CHEMS * 18, UI.cur === NUM_CHEMS);
    T(0, 1, -1, M[4], 50, 234);
  }

  function drawActionBar() {
    const n = specialLoc() ? 5 : 4;
    const xs = n === 5 ? BAR_X5 : BAR_X4;
    const nav = UI.mode === M_MAIN;
    let i, lit, label, c;
    for (i = 0; i < n; i++) {
      label =
        i < 4
          ? BAR_LABELS[i]
          : STATE.loc === LOC_GS
            ? 'DOCTOR'
            : STATE.loc === LOC_FREESIDE
              ? 'STASH'
              : 'PAY DEBT';
      if (nav) {
        lit = UI.cur === i;
        c = lit ? 3 : 2;
      } else {
        lit =
          (UI.mode === M_BUY && i === 0) ||
          (UI.mode === M_SELL && i === 1) ||
          (UI.mode === M_USE && i === 3);
        c = lit ? 3 : 1;
      }
      T(1, c, 0, lit ? '[' + label + ']' : label, xs[i], 266);
    }
  }

  function drawQtyPrompt() {
    const capsOp = UI.act >= A_DEP;
    let line;
    if (UI.act === A_BUY || UI.act === A_SELL) {
      line =
        (UI.act === A_BUY ? 'BUY ' : 'SELL ') +
        CN[UI.chem] +
        ' x' +
        UI.qty +
        ' = ' +
        fmt(UI.qty * STATE.prices[UI.chem]) +
        ' CAPS';
    } else {
      line =
        (UI.act === A_DEP
          ? 'DEPOSIT '
          : UI.act === A_WDR
            ? 'WITHDRAW '
            : U[16]) +
        fmt(UI.qty) +
        ' CAPS';
    }
    CL(1, 3, 264, line);
    CL(
      0,
      2,
      292,
      'WHEEL ' +
        (capsOp ? '+/-50' : '+/-1') +
        '  2ND ' +
        (capsOp ? '+/-500' : '+/-10') +
        U[0] +
        fmt(UI.qtyMax),
    );
  }

  function drawEvent() {
    const raid = UI.foe === 1;
    let t;
    CL(2, 3, 40, raid ? M[56] : M[37]);
    CL(0, 1, 72, raid ? M[57] : M[0]);
    if (UI.stage === 0) {
      t = (raid ? RAID_INTRO : EVT_INTRO)[UI.intro].split('~');
      CL(1, 2, 110, t[0]);
      CL(1, 2, 132, t[1]);
      R(1, M[54], 140, 180, UI.cur === 0);
      R(
        1,
        (raid ? M[58] : M[55]) + fmt(UI.cost) + ' CAPS)',
        140,
        204,
        UI.cur === 1,
      );
      if (STATE.gun) R(1, M[53], 140, 228, UI.cur === 2);
      CL(0, 1, 280, raid ? M[67] : M[1]);
    } else {
      CL(1, 2, 110, UI.r1);
      if (UI.r2) CL(1, 2, 132, UI.r2);
      if (UI.r3) CL(1, 2, 154, UI.r3);
      CL(0, 1, 220, M[34]);
    }
  }

  function drawOffer() {
    const s = OFFER_TXT[UI.offType].split('~');
    let i;
    CL(2, 3, 40, s[0]);
    for (i = 1; i < 4; i++) CL(1, 2, 78 + 22 * i, s[i]);
    CL(
      1,
      3,
      174,
      'PRICE: ' +
        fmt(UI.cost) +
        ' CAPS. ' +
        (UI.offType === 1 ? U[7] : 'PACK: ' + invTotal() + '/' + STATE.pack),
    );
    R(1, 'BUY IT', 160, 214, UI.cur === 0);
    R(1, U[21], 160, 238, UI.cur === 1);
  }

  function drawOver() {
    const net = STATE.caps + STATE.bank;
    const score = net - STATE.debt;
    let t, i, lines;
    if (STATE.debt === 0 && net >= 100000) t = 0;
    else if (score >= 50000) t = 1;
    else if (score >= 0) t = 2;
    else if (net * 5 >= STATE.debt * 3) t = 3;
    else t = 4;
    CL(0, 1, 14, M[2]);
    CL(2, 3, 40, END_TITLE[t]);
    lines = END_TEXT[t].split('~');
    for (i = 0; i < 3; i++) CL(1, 2, 96 + i * 22, lines[i]);
    if (score >= 0) {
      CL(
        1,
        3,
        184,
        'PROFIT: ' + fmt(score) + ' CAPS' + (UI.newBest ? U[9] : ''),
      );
    } else {
      CL(1, 3, 184, 'SHORT BY ' + fmt(-score) + ' CAPS.');
    }
    CL(0, 1, 214, 'WORTH ' + fmt(net) + U[17] + fmt(STATE.debt));
    if (best > 0) CL(0, 1, 234, M[48] + fmt(best) + M[49]);
    CL(0, 1, 282, M[35]);
  }

  function draw() {
    h.clear(0);
    if (UI.mode === M_INTRO) return drawIntro();
    if (UI.mode === M_OVER) return drawOver();
    if (UI.mode === M_EVENT) return drawEvent();
    if (UI.mode === M_OFFER) return drawOffer();
    drawHeader();
    if (UI.mode === M_TRAVEL) {
      drawTravelList();
    } else if (UI.mode === M_BANK) {
      drawBankPanel(true);
    } else if (UI.mode === M_DOC) {
      drawDocPanel();
    } else if (UI.mode === M_USE) {
      drawUseList();
      h.setColor(1).drawLine(40, 256, 440, 256);
      drawActionBar();
    } else if (UI.mode === M_QTY && UI.act >= A_DEP) {
      if (UI.act === A_PAY) drawPayPanel();
      else drawBankPanel(false);
      h.setColor(1).drawLine(40, 256, 440, 256);
      drawQtyPrompt();
    } else {
      drawChemTable();
      h.setColor(1).drawLine(40, 256, 440, 256);
      if (UI.mode === M_QTY) {
        drawQtyPrompt();
      } else {
        drawActionBar();
        if (UI.mode === M_MAIN) CL(0, 1, 300, LOC_TAG[STATE.loc]);
      }
    }
  }

  // ===== INPUT ===========================================

  function openQty(act) {
    let max;
    if (act === A_BUY) {
      max = FL(STATE.caps / STATE.prices[UI.chem]);
      if (STATE.pack - invTotal() < max) max = STATE.pack - invTotal();
    } else if (act === A_SELL) {
      max = STATE.inv[UI.chem];
    } else if (act === A_DEP) {
      max = STATE.caps;
    } else if (act === A_WDR) {
      max = STATE.bank;
    } else {
      max = STATE.caps < STATE.debt ? STATE.caps : STATE.debt;
    }
    if (max <= 0) {
      STATE.msg =
        act === A_BUY
          ? STATE.caps < STATE.prices[UI.chem]
            ? NOPE[0]
            : NOPE[1]
          : act === A_SELL
            ? NOPE[2]
            : act === A_DEP
              ? NOPE[3]
              : act === A_WDR
                ? NOPE[4]
                : STATE.debt <= 0
                  ? NOPE[5]
                  : NOPE[6];
      snd('HIGHLIGHT');
      return;
    }
    UI.act = act;
    UI.qty = max;
    UI.qtyMax = max;
    UI.mode = M_QTY;
  }

  function confirmQty() {
    const q = UI.qty;
    if (q > 0) {
      if (UI.act === A_BUY) {
        STATE.caps -= q * STATE.prices[UI.chem];
        STATE.inv[UI.chem] += q;
        STATE.msg = 'BOUGHT ' + q + ' ' + CN[UI.chem] + '.';
      } else if (UI.act === A_SELL) {
        STATE.caps += q * STATE.prices[UI.chem];
        STATE.inv[UI.chem] -= q;
        STATE.msg = 'SOLD ' + q + ' ' + CN[UI.chem] + '.';
      } else if (UI.act === A_DEP) {
        STATE.caps -= q;
        STATE.bank += q;
        STATE.msg = 'STASHED ' + fmt(q) + ' CAPS.';
      } else if (UI.act === A_WDR) {
        STATE.caps += q;
        STATE.bank -= q;
        STATE.msg = 'WITHDREW ' + fmt(q) + ' CAPS.';
      } else {
        STATE.caps -= q;
        STATE.debt -= q;
        if (STATE.debt === 0) {
          STATE.msg = M[14];
          sfx('ALARM/Party'); // noisemaker: kneecaps yours
        } else {
          STATE.msg = 'PAID ' + fmt(q) + U[1];
        }
      }
    }
    UI.mode = UI.act === A_DEP || UI.act === A_WDR ? M_BANK : M_MAIN;
    UI.cur = 0;
  }

  function select() {
    let ev;
    snd('SELECT');
    if (UI.mode === M_MAIN) {
      if (UI.cur === 0) UI.mode = M_BUY;
      else if (UI.cur === 1) UI.mode = M_SELL;
      else if (UI.cur === 2) {
        if (STATE.day >= TOTAL_DAYS) {
          finishGame();
          draw();
          return;
        }
        UI.mode = M_TRAVEL;
      } else if (UI.cur === 3) UI.mode = M_USE;
      else {
        if (STATE.loc === LOC_GS) UI.mode = M_DOC;
        else if (STATE.loc === LOC_FREESIDE) UI.mode = M_BANK;
        else {
          openQty(A_PAY);
          draw();
          return;
        }
      }
      UI.cur = 0;
    } else if (UI.mode === M_USE) {
      if (UI.cur === NUM_CHEMS) {
        UI.mode = M_MAIN;
        UI.cur = 0;
      } else {
        useChem(UI.cur);
      }
    } else if (UI.mode === M_DOC) {
      ev = (100 - STATE.hp) * 3;
      if (UI.cur === 0) {
        if (STATE.hp >= 100) STATE.msg = M[18];
        else if (STATE.caps < ev) STATE.msg = NOPE[0];
        else {
          STATE.caps -= ev;
          STATE.hp = 100;
          STATE.msg = M[15];
        }
      } else if (UI.cur === 1) {
        ev = countBits(STATE.addict) * 500;
        if (ev === 0) STATE.msg = M[16];
        else if (STATE.caps < ev) STATE.msg = NOPE[0];
        else {
          STATE.caps -= ev;
          STATE.addict = 0;
          STATE.msg = M[17];
        }
      } else {
        UI.mode = M_MAIN;
        UI.cur = 0;
      }
    } else if (UI.mode === M_BUY || UI.mode === M_SELL) {
      if (UI.cur === NUM_CHEMS) {
        UI.mode = M_MAIN;
        UI.cur = 0;
      } else {
        UI.chem = UI.cur;
        openQty(UI.mode === M_BUY ? A_BUY : A_SELL);
      }
    } else if (UI.mode === M_TRAVEL) {
      if (UI.cur === 0) {
        UI.caravan = !UI.caravan;
      } else if (UI.cur === NUM_LOCS + 1 || UI.cur - 1 === STATE.loc) {
        UI.mode = M_MAIN;
        UI.cur = 0;
      } else if (UI.caravan && STATE.caps < 250) {
        STATE.msg = M[23];
        snd('HIGHLIGHT');
      } else {
        ev = travel(UI.cur - 1, UI.caravan);
        if (ev === 1) openEncounter(0);
        else if (ev === 4) openEncounter(1);
        else if (ev === 2) openOffer(0);
        else if (ev === 3) openOffer(1);
        else {
          UI.mode = M_MAIN;
          UI.cur = 0;
        }
      }
    } else if (UI.mode === M_BANK) {
      if (UI.cur === 0) openQty(A_DEP);
      else if (UI.cur === 1) openQty(A_WDR);
      else {
        UI.mode = M_MAIN;
        UI.cur = 0;
      }
    } else if (UI.mode === M_QTY) {
      confirmQty();
    } else if (UI.mode === M_EVENT) {
      if (UI.stage === 0) resolveEncounter(UI.cur);
      else {
        UI.mode = M_MAIN;
        UI.cur = 0;
      }
    } else if (UI.mode === M_OFFER) {
      resolveOffer(UI.cur);
    }
    draw();
  }

  // Main wheel: 1 = CW/down, -1 = up, 0 = press.
  function onKnob1(dir) {
    let len;
    if (UI.mode === M_INTRO) {
      if (dir) {
        if (sv) {
          UI.cur = UI.cur ? 0 : 1;
          snd('SCROLL');
          draw();
        }
        return;
      }
      snd('SELECT'); // also fades out the title theme
      if (sv && UI.cur === 0) {
        resumeGame();
      } else {
        sv = null;
        UI.mode = M_MAIN;
        UI.cur = 0;
      }
      draw();
      return;
    }
    if (UI.mode === M_OVER) {
      if (!dir) {
        newGame();
        draw();
        sfx('FX/FNVTHEME'); // fresh run, same Mojave
      }
      return;
    }
    if (!dir) {
      select();
      return;
    }
    if (UI.mode === M_QTY) {
      // Scroll up (-1) increases, down decreases.
      len = UI.act >= A_DEP ? 50 : 1;
      UI.qty = E.clip(UI.qty - dir * len, 0, UI.qtyMax);
    } else {
      len = menuLen();
      UI.cur = (UI.cur + dir + len) % len;
    }
    snd('SCROLL');
    draw();
  }

  // Second wheel: bar nav on main, coarse steps in picker,
  // quick back in submenus.
  function onKnob2(dir) {
    let len;
    if (!dir) return;
    if (UI.mode === M_MAIN) {
      len = menuLen();
      UI.cur = (UI.cur + dir + len) % len;
      snd('SCROLL');
      draw();
    } else if (UI.mode === M_QTY) {
      UI.qty = E.clip(
        UI.qty + dir * (UI.act >= A_DEP ? 500 : 10),
        0,
        UI.qtyMax,
      );
      snd('SCROLL');
      draw();
    } else if ((3164 >> UI.mode) & 1) {
      // Submenus (BUY/SELL/TRAVEL/BANK/USE/DOC): quick back.
      UI.mode = M_MAIN;
      UI.cur = 0;
      snd('TAB');
      draw();
    }
  }

  // ===== BOOT ============================================
  // Deferred: loadHolotape's eval holds a full copy of our
  // source until its statement finishes, so allocating the
  // text tables inside it double-books the heap (first
  // launch after a power cycle OOMs). Return the app object
  // immediately; do the heavy lifting one tick later, after
  // the loader's copy is garbage. Never start audio before
  // init runs — streaming a WAV mid-load starves the loader.

  function init() {
    try {
      E.defrag();
    } catch (e) {}
    try {
      // Strip only trailing newlines — a full trim() would
      // eat the trailing space of the last text fragment.
      TX = fs
        .readFile('HOLO/CHEM_WARS/TEXT.TXT')
        .replace(/[\r\n]+$/, '')
        .split('#');
    } catch (e) {}
    if (!TX || TX.length < 23) {
      h.clear(0);
      h.setFontMonofonto16().setColor(3).setFontAlign(0, -1);
      h.drawString('CHEM WARS: COPY TEXT.TXT TO HOLO/CHEM_WARS/', 240, 150);
      return;
    }
    LOC_TAG = P(TX[0]);
    BOOM_MSG = P(TX[1]);
    CRASH_MSG = P(TX[2]);
    FIND_MSG = P(TX[4]);
    EVT_INTRO = P(TX[5]);
    VIOLATIONS = P(TX[6]);
    RUN_OK = P(TX[7]);
    FX_DESC = P(TX[8]);
    FX_USE_MSG = P(TX[9]);
    END_TITLE = P(TX[10]);
    END_TEXT = P(TX[11]);
    OFFER_TXT = P(TX[12]);
    NOPE = P(TX[13]);
    IN = P(TX[14]);
    M = P(TX[15]);
    RAID_INTRO = P(TX[16]);
    HAZ_MSG = P(TX[17]);
    HEAL_MSG = P(TX[18]);
    LOC_NAMES = P(TX[19]);
    CN = P(TX[20]);
    BAR_LABELS = P(TX[21]);
    U = P(TX[22]);
    TX = null; // the raw blob is no longer needed
    loadScore();
    newGame();
    UI.mode = M_INTRO;
    Pip.onExclusive('knob1', onKnob1);
    Pip.onExclusive('knob2', onKnob2);
    draw();
    // Post-load is safe for audio (we're outside the loader
    // frame now) — roll the theme under the title card.
    sfx('FX/FNVTHEME');
  }

  // Cheap synchronous splash to cover the deferral gap.
  h.clear(0);
  CL(1, 2, 148, 'PLEASE STAND BY');

  const bootTimer = setTimeout(init, 80);

  return {
    id: 'chem-wars',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      try {
        clearTimeout(bootTimer);
      } catch (e) {}
      if (UI.mode !== M_INTRO && UI.mode !== M_OVER) {
        saveAll(true);
      }
      try {
        E.setFlags({ pretokenise: 0 });
      } catch (e) {}
      try {
        Pip.audioStop();
      } catch (e) {}
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      // Free the string tables NOW and compact, so the next
      // launch's loader finds contiguous room.
      LOC_TAG =
        BOOM_MSG =
        CRASH_MSG =
        FIND_MSG =
        EVT_INTRO =
        VIOLATIONS =
        RUN_OK =
        FX_DESC =
        FX_USE_MSG =
        END_TITLE =
        END_TEXT =
        OFFER_TXT =
        NOPE =
        IN =
        M =
        RAID_INTRO =
        HAZ_MSG =
        HEAL_MSG =
        LOC_NAMES =
        CN =
        BAR_LABELS =
        U =
        TX =
        sv =
          null;
      try {
        E.defrag();
      } catch (e) {}
      h.clear();
    },
  };
});
