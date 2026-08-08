// =============================================================================
//  Name: Prisoner's Dilemma
//  License: MIT
//  Description: A Nonary-style "AB Game" for the Pip-Boy 3000, inspired by the
//               voting game in Zero Escape: Virtue's Last Reward. You are SIGMA
//               plus 7 CPU rivals, each with a distinct decision-making AI.
//
//  Rules: everyone starts at 3 points, escape at >= 9. Each round players are
//  paired at random and secretly pick ALLY or BETRAY:
//    ally + ally      -> +2 / +2
//    betray + betray  ->  0 /  0
//    betray + ally    -> +3 / -2
//  Reach 0 points and you die (out of the game; dead CPUs auto-ally forever).
//  When anyone hits >= 9 the game ends: >= 9 escape (win), the rest lose.
//
//  Controls (only the LEFT wheel has a button; the RIGHT wheel only turns):
//    menus: either wheel turn = move, left press = pick, left hold = exit
//    vote:  either wheel turn = toggle ALLY/BETRAY, left press = lock in
//    results / end screen: left press = continue
// =============================================================================
(function () {
  const START_PTS = 3;
  const WIN_PTS = 9;
  const N = 8; // total players (SIGMA + 7)
  const ALLY = 0;
  const BETRAY = 1;

  // Character roster (7 of these 8 are drawn each game). Bios are loaded from
  // DATA.JSON on the Character Info screen (loadText). `t` = AI trait weights,
  // a fixed-order array (saves the repeated key names in RAM):
  //   t[0]=bias t[1]=block t[2]=greed t[3]=reach t[4]=trust t[5]=sAlly t[6]=sBet t[7]=vol
  const CHARS = [
    { name: 'PHI', t: [0.35, 0.65, 0.65, 0.45, 0.45, 0.35, 0.5, 0.08] },
    { name: 'DIO', t: [0.62, 0.45, 0.9, 0.2, 0.3, 0.1, 0.6, 0.2] },
    { name: 'TENMYOUJI', t: [0.42, 0.5, 0.45, 0.35, 0.9, 0.25, 0.6, 0.12] },
    { name: 'QUARK', t: [0.22, 0.3, 0.35, 0.4, 0.35, 0.5, 0.3, 0.38] },
    { name: 'LUNA', t: [0.08, 0.12, 0.15, 0.5, 0.15, 0.6, 0.12, 0.06] },
    { name: 'CLOVER', t: [0.4, 0.4, 0.45, 0.3, 0.65, 0.35, 0.5, 0.5] },
    { name: 'ALICE', t: [0.34, 0.5, 0.5, 0.45, 0.75, 0.4, 0.5, 0.12] },
    { name: 'K', t: [0.24, 0.55, 0.5, 0.5, 0.85, 0.45, 0.45, 0.06] },
  ];

  const MENU = ['Play', 'Game Rules', 'Character Info', 'Exit'];

  // Title (menu only). Change this one line for a different name / for release.
  const TITLE_TOP = 'ZERO ESCAPE';
  const TITLE_BIG = 'VAULT 9';

  // Display text (lore, rules, character bios) lives in a small companion file,
  // read on demand and dropped on exit, so ~1.3 KB isn't resident at load time.
  // Shipped as HOLO/ZERO_ESCAPE_VAULT_9/DATA.JSON (see metadata.json "storage").
  const DATA_PATH = '/HOLO/ZERO_ESCAPE_VAULT_9/DATA.JSON';
  let fsMod;
  try {
    fsMod = require('fs');
  } catch (e) {
    fsMod = null;
  }
  // Minimal fallback so the text screens still work if the file is ever missing.
  const TXT_FALLBACK = {
    c: [
      'Vault 9. You wake with amnesia among eight prisoners. Escape only by playing the Nonary Game.',
    ],
    r: [
      'Reach a minimum of 9 points to open the Number 9 Door.',
      'Ally/ally +2, betray/ally +3/-2, betray/betray 0.',
      'Fall to 0 points and you die.',
    ],
    b: ['(bio unavailable - reinstall the holotape)'],
  };
  let txt = null; // loaded {c,r,b} while a text screen is open; null otherwise
  function loadText() {
    if (txt) return txt;
    let d = null;
    if (fsMod) {
      try {
        d = JSON.parse(fsMod.readFileSync(DATA_PATH));
      } catch (e) {}
    }
    txt = d && d.c && d.r && d.b ? d : TXT_FALLBACK;
    return txt;
  }
  function freeText() {
    txt = null;
    try {
      process.memory(true);
    } catch (e) {} // force GC to reclaim it now
  }

  // Streamed assets (live on the SD card, never resident): fullscreen 480x320
  // raw-framebuffer images + the menu music. Registered in metadata.json.
  // E.openFile paths have NO leading slash (per the converter's example);
  // fs.readFileSync / audioStart paths keep theirs.
  const INTRO_BIN = 'HOLO/ZERO_ESCAPE_VAULT_9/MAINSCREEN.BIN';
  const DOOR_BIN = 'HOLO/ZERO_ESCAPE_VAULT_9/DOOROPENS.BIN';
  const MUSIC_WAV = '/HOLO/ZERO_ESCAPE_VAULT_9/MAINTHEME.WAV';
  const MUSIC_MS = 174000; // track is 2:54; re-arm to loop while on menu/end screens
  // Subtle bed under a round. Menu / rules / info / door / end keep MAINTHEME.
  const BG_WAV = '/HOLO/ZERO_ESCAPE_VAULT_9/BACKGROUND.WAV';
  const BG_MS = 140000; // BACKGROUND.WAV is 140.06s; re-arm just under it to loop
  // Sting played as each pair is revealed on the results screen.
  const REVEAL_WAV = '/HOLO/ZERO_ESCAPE_VAULT_9/CRT_ON.WAV';
  const REVEAL_SFX_MS = 894; // clip is 0.894s
  let musicTrack = null; // path of the stream now playing, null when silent
  let musicTimer = null;
  let revealSting = false; // true while the stings own the single audio channel
  let stingTimer = null;

  // --- Screen geometry --------------------------------------------------------
  const W = h.getWidth();
  const H = h.getHeight();
  const SAFE_L = 12;
  const SAFE_T = 22;
  const SAFE_R = W - 12;
  const SAFE_B = H - 12;

  // --- State ------------------------------------------------------------------
  const S_MENU = 0;
  const S_INFO = 1;
  const S_PAIR = 2;
  const S_RESULT = 3;
  const S_OVER = 4;
  const S_RULES = 5;
  const S_INTRO = 6; // fullscreen splash on first launch, before the menu
  const S_DOOR = 7; // fullscreen "door opens" just before the win/game-over lists
  let screen = S_MENU;
  let menuSel = 0;
  let infoSel = 0;
  let rulesPage = 0;

  let PARTS = []; // { name, ch, pts, alive, human, died }
  let round = 1;
  let pairs = []; // [[a,b], ...]
  let partner = new Uint8Array(N);
  let playerVote = ALLY;
  const lastVote = new Uint8Array(N);
  const lastDelta = new Int8Array(N);
  let gameEnd = false;
  let gameWon = false;
  // Results screen drama: reveal the pairs one at a time on a timer.
  // One sting per revealed pair, so this must be >= REVEAL_SFX_MS or each sting
  // cuts off the one before it (there is only one audio channel).
  const REVEAL_MS = 900; // ~1 pair every 0.9s, just clear of the 0.894s clip
  let revealCount = 99; // pairs shown (99 = all; the animation counts up from 1)
  let revealTimer = null;

  // Aggregate AI memory (fixed size — no per-round logs).
  const betrayedMe = new Uint16Array(N * N); // [i*N+o] times o betrayed i
  const alliedMe = new Uint16Array(N * N); // [i*N+o] times o allied with i
  const gBetray = new Uint16Array(N); // times each player betrayed
  const gRounds = new Uint16Array(N); // interactions each player had

  let origIdle = 0;
  let removed = false;

  // --- Helpers ----------------------------------------------------------------
  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }
  function rnd() {
    return Math.randInt(1000) / 1000;
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.randInt(i + 1);
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }
  function sfx(s) {
    if (musicTrack || revealSting) return; // one audio channel: don't cut the stream
    try {
      Pip.playSound(s);
    } catch (e) {}
  }
  function flip() {
    h.flip();
  }

  // --- Music: streamed from the SD card (no RAM cost). Plays on the menu / rules
  // / info and the end screens; stops during gameplay. Looped by re-arming a
  // timer to the track length. Cleared on stop / exit so nothing lingers. -------
  // Which track this screen wants, or null for silence. The results stings take
  // the channel for themselves while the reveal sequence runs.
  function wantedTrack() {
    if (revealSting) return null;
    if (
      screen === S_MENU ||
      screen === S_RULES ||
      screen === S_INFO ||
      screen === S_DOOR ||
      screen === S_OVER
    )
      return MUSIC_WAV;
    if (screen === S_PAIR || screen === S_RESULT) return BG_WAV;
    return null;
  }
  function startTrack(path, ms) {
    musicTrack = path;
    // Stop first: audioStart on top of a live stream lets the already-buffered
    // audio drain, so the old track kept playing ~1-2s into the new screen.
    try {
      Pip.audioStop();
    } catch (e) {}
    try {
      Pip.setDACPower(true);
    } catch (e) {}
    try {
      Pip.setDACMode('out');
    } catch (e) {}
    try {
      Pip.audioStart(path);
    } catch (e) {}
    if (musicTimer) {
      clearTimeout(musicTimer);
      musicTimer = null;
    }
    if (!ms) return; // length unknown -> play through once, don't re-arm
    musicTimer = setTimeout(function loop() {
      if (musicTrack !== path) return; // switched tracks or stopped: drop the loop
      try {
        Pip.audioStart(path);
      } catch (e) {}
      musicTimer = setTimeout(loop, ms);
    }, ms);
  }
  function stopMusic() {
    musicTrack = null;
    if (musicTimer) {
      clearTimeout(musicTimer);
      musicTimer = null;
    }
    try {
      Pip.audioStop();
    } catch (e) {}
  }
  function syncMusic() {
    const want = wantedTrack();
    if (want === musicTrack) return; // already correct (also covers null === null)
    if (!want) {
      stopMusic();
      return;
    }
    startTrack(want, want === MUSIC_WAV ? MUSIC_MS : BG_MS);
  }

  // Blit a raw 480x320 2bpp framebuffer file straight to the screen. Streams in
  // small chunks so the ~38 KB image never sits in RAM as a second copy.
  // Returns true on success; callers fall back to a text screen otherwise.
  // Blit a raw 480x320 framebuffer file straight to the screen, following the
  // Pip image converter's own usage example: stream 256-byte chunks and fill
  // h.buffer BACKWARDS from the end (that's the layout the .BIN is exported for).
  // set() takes the chunk string directly, so it's native/fast (a per-byte JS
  // loop here trips the watchdog). Returns true on success; else a text screen.
  function showBin(path) {
    try {
      const file = E.openFile(path, 'r');
      if (!file) return false;
      const target = new Uint8Array(h.buffer);
      let offset = target.length;
      let chunk = file.read(256);
      while (chunk) {
        offset -= chunk.length;
        if (offset < 0) break; // guard against an oversized file
        target.set(chunk, offset);
        chunk = file.read(256);
      }
      file.close();
      h.flip();
      return true;
    } catch (e) {
      return false;
    }
  }

  // --- Game setup -------------------------------------------------------------
  function setupWith(charIdx) {
    PARTS = [
      {
        name: 'SIGMA',
        ch: -1,
        pts: START_PTS,
        alive: true,
        human: true,
        died: false,
      },
    ];
    for (let k = 0; k < charIdx.length; k++) {
      PARTS.push({
        name: CHARS[charIdx[k]].name,
        ch: charIdx[k],
        pts: START_PTS,
        alive: true,
        human: false,
        died: false,
      });
    }
    for (let i = 0; i < betrayedMe.length; i++) {
      betrayedMe[i] = 0;
      alliedMe[i] = 0;
    }
    for (let i = 0; i < N; i++) {
      gBetray[i] = 0;
      gRounds[i] = 0;
    }
    round = 1;
    gameEnd = false;
    gameWon = false;
  }
  function newGame() {
    const idx = shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, N - 1);
    setupWith(idx);
    startRound();
  }

  function startRound() {
    stopReveal();
    const order = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    pairs = [];
    for (let i = 0; i < N; i += 2) {
      pairs.push([order[i], order[i + 1]]);
      partner[order[i]] = order[i + 1];
      partner[order[i + 1]] = order[i];
    }
    playerVote = ALLY;
    screen = S_PAIR;
    draw();
  }

  // --- AI ---------------------------------------------------------------------
  function distrust(i, o) {
    const k = i * N + o;
    const bm = betrayedMe[k];
    const am = alliedMe[k];
    let pd = 0.45;
    if (bm + am > 0) pd = bm / (bm + am);
    let gd = 0.4;
    if (gRounds[o] > 0) gd = gBetray[o] / gRounds[o];
    return clamp(0.55 * pd + 0.45 * gd, 0, 1);
  }

  function cpuVote(i, o) {
    const P = PARTS[i];
    const O = PARTS[o];
    const t = CHARS[P.ch].t; // [bias, block, greed, reach, trust, sAlly, sBet, vol]
    let b = t[0];
    if (O.pts >= WIN_PTS - 3) b += t[1]; // opponent could escape soon -> deny them
    if (P.pts === WIN_PTS - 3)
      b += t[2]; // betray vs ally = +3 -> escape
    else if (P.pts >= WIN_PTS - 2) b -= t[3]; // ally = +2 -> escape, prefer ally if trusted
    const d = distrust(i, o);
    b += (d - 0.4) * t[4]; // above-average distrust pushes betray
    if (P.pts <= 2) {
      if (d < 0.4)
        b -= t[5]; // trust them -> risk allying to gain +2 and survive
      else b += t[6]; // don't trust -> betray (safe: 0 or +3, never the -2 that kills)
    }
    b += (rnd() - 0.5) * t[7];
    b = clamp(b, 0.02, 0.98);
    return Math.randInt(1000) < b * 1000 ? BETRAY : ALLY;
  }

  function voteOf(i) {
    const P = PARTS[i];
    if (P.human) return playerVote;
    if (!P.alive) return ALLY; // dead players auto-ally
    return cpuVote(i, partner[i]);
  }

  function scorePair(va, vb) {
    if (va === ALLY && vb === ALLY) return [2, 2];
    if (va === BETRAY && vb === BETRAY) return [0, 0];
    if (va === BETRAY) return [3, -2];
    return [-2, 3];
  }

  function resolveRound() {
    for (let i = 0; i < N; i++) lastVote[i] = voteOf(i);
    for (let pi = 0; pi < pairs.length; pi++) {
      const a = pairs[pi][0];
      const b = pairs[pi][1];
      const va = lastVote[a];
      const vb = lastVote[b];
      const d = scorePair(va, vb);
      lastDelta[a] = PARTS[a].alive ? d[0] : 0;
      lastDelta[b] = PARTS[b].alive ? d[1] : 0;
      if (PARTS[a].alive) PARTS[a].pts += d[0];
      if (PARTS[b].alive) PARTS[b].pts += d[1];
      // Learn from what each did to the other (votes are revealed to everyone).
      if (PARTS[a].alive) {
        if (vb === BETRAY) betrayedMe[a * N + b]++;
        else alliedMe[a * N + b]++;
      }
      if (PARTS[b].alive) {
        if (va === BETRAY) betrayedMe[b * N + a]++;
        else alliedMe[b * N + a]++;
      }
      if (PARTS[a].alive) {
        gRounds[a]++;
        if (va === BETRAY) gBetray[a]++;
      }
      if (PARTS[b].alive) {
        gRounds[b]++;
        if (vb === BETRAY) gBetray[b]++;
      }
    }
    for (let i = 0; i < N; i++) {
      const P = PARTS[i];
      P.died = false;
      if (P.alive && P.pts <= 0) {
        P.pts = 0;
        P.alive = false;
        P.died = true;
      }
    }
    gameEnd = false;
    gameWon = false;
    if (!PARTS[0].alive) {
      gameEnd = true; // Sigma died -> immediate loss
    } else {
      let any = false;
      for (let i = 0; i < N; i++)
        if (PARTS[i].alive && PARTS[i].pts >= WIN_PTS) any = true;
      if (any) {
        gameEnd = true;
        gameWon = PARTS[0].pts >= WIN_PTS;
      }
    }
    screen = S_RESULT;
    startReveal();
  }

  // Reveal the result pairs one at a time for drama. The timer is always
  // cleared before we leave the screen or the app (see stopReveal callers).
  function stopReveal() {
    if (revealTimer) {
      clearInterval(revealTimer);
      revealTimer = null;
    }
  }
  // One CRT_ON sting per revealed pair (4 pairs -> 4 stings). There is a single
  // audio channel, so the stings replace the background bed for the length of
  // the sequence and hand it back once the last one has finished playing.
  function playSting() {
    try {
      Pip.setDACPower(true);
    } catch (e) {}
    try {
      Pip.setDACMode('out');
    } catch (e) {}
    try {
      Pip.audioStart(REVEAL_WAV);
    } catch (e) {}
  }
  function stopStings() {
    if (stingTimer) {
      clearTimeout(stingTimer);
      stingTimer = null;
    }
    revealSting = false;
  }
  function startReveal() {
    stopReveal();
    stopStings();
    revealCount = 1; // first pair shows at once, the rest tick in
    revealSting = true;
    stopMusic(); // free the channel before the first sting
    draw(); // draw() -> syncMusic(), which stays silent while revealSting
    playSting(); // pair 1
    revealTimer = setInterval(function () {
      revealCount++;
      const last = revealCount >= pairs.length;
      if (last) {
        revealCount = pairs.length;
        stopReveal();
      }
      draw();
      playSting();
      // After the final sting has finished, give the channel back to the bed.
      if (last)
        stingTimer = setTimeout(function () {
          revealSting = false;
          syncMusic();
        }, REVEAL_SFX_MS);
    }, REVEAL_MS);
  }

  // --- Drawing ----------------------------------------------------------------
  function dispName(i) {
    return PARTS[i].human ? '-YOU-' : PARTS[i].name;
  }
  function tag(i) {
    const P = PARTS[i];
    return P.alive ? dispName(i) + ' ' + P.pts : dispName(i) + ' x';
  }
  // Death marker. The Pip has only 4 greens and the point numbers already use
  // the brightest, so brightest is as light as it gets; drawn right-aligned.
  function drawDead(xRight, cy) {
    h.setColor(3)
      .setFontMonofonto14()
      .setFontAlign(1, 0, 0)
      .drawString('Deceased', xRight, cy);
  }

  function drawMenu() {
    h.clear(0);
    h.setColor(2)
      .setFontMonofonto18()
      .setFontAlign(0, -1, 0)
      .drawString(TITLE_TOP, W >> 1, SAFE_T);
    h.setColor(3)
      .setFontMonofonto36()
      .setFontAlign(0, -1, 0)
      .drawString(TITLE_BIG, W >> 1, SAFE_T + 26);
    const top = 118;
    const rh = 36;
    for (let i = 0; i < MENU.length; i++) {
      const y = top + i * rh;
      if (i === menuSel) {
        h.setColor(3).fillRect(120, y - 4, W - 120, y + 26);
        h.setColor(0);
      } else {
        h.setColor(2);
      }
      h.setFontMonofonto23()
        .setFontAlign(0, -1, 0)
        .drawString(MENU[i], W >> 1, y);
    }
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, 1, 0)
      .drawString('wheel: move   press: pick', W >> 1, SAFE_B);
    flip();
  }

  function drawInfo() {
    h.clear(0);
    const c = CHARS[infoSel];
    const bio = loadText().b[infoSel] || '(bio unavailable)';
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, -1, 0)
      .drawString(
        'CHARACTER  < ' + (infoSel + 1) + ' / ' + CHARS.length + ' >',
        W >> 1,
        SAFE_T,
      );
    h.setColor(3)
      .setFontMonofonto36()
      .setFontAlign(0, -1, 0)
      .drawString(c.name, W >> 1, SAFE_T + 34);
    h.setColor(3).setFontMonofonto18();
    const lines = h.wrapString(bio, W - 60);
    for (let i = 0; i < lines.length; i++) {
      h.setFontAlign(0, -1, 0).drawString(lines[i], W >> 1, 120 + i * 26);
    }
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, 1, 0)
      .drawString('wheel: browse   press: back', W >> 1, SAFE_B);
    flip();
  }

  function drawChoice(cx, y, label, sel) {
    const half = 52;
    if (sel) {
      h.setColor(3).fillRect(cx - half, y, cx + half, y + 36);
      h.setColor(0);
    } else {
      h.setColor(0).fillRect(cx - half, y, cx + half, y + 36);
      h.setColor(3).drawRect(cx - half, y, cx + half, y + 36);
    }
    h.setFontMonofonto18()
      .setFontAlign(0, 0, 0)
      .drawString(label, cx, y + 18);
  }

  // The Number 9 Door: a Fallout-style vault door — an outer gear (dark, with
  // teeth) around a bright spoked wheel with bolts and the number in the hub.
  function drawVaultDoor(cx, cy, R) {
    const T = Math.max(4, (R * 0.28) | 0); // tooth length
    // Gear body + 8 teeth (dark).
    h.setColor(1).fillCircle(cx, cy, R);
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      const p = [
        (cx + R * Math.cos(a - 0.34)) | 0,
        (cy + R * Math.sin(a - 0.34)) | 0,
        (cx + (R + T) * Math.cos(a - 0.2)) | 0,
        (cy + (R + T) * Math.sin(a - 0.2)) | 0,
        (cx + (R + T) * Math.cos(a + 0.2)) | 0,
        (cy + (R + T) * Math.sin(a + 0.2)) | 0,
        (cx + R * Math.cos(a + 0.34)) | 0,
        (cy + R * Math.sin(a + 0.34)) | 0,
      ];
      h.fillPoly(p);
    }
    // Bright spoked wheel: outer ring, 8 spokes with bolts, hub.
    const Rr = (R * 0.82) | 0;
    const Rh = Math.max(6, (R * 0.34) | 0);
    h.setColor(3).drawCircle(cx, cy, Rr);
    h.drawCircle(cx, cy, Rr - 1);
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + Math.PI / 8;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      h.drawLine(
        (cx + Rh * ca) | 0,
        (cy + Rh * sa) | 0,
        (cx + Rr * ca) | 0,
        (cy + Rr * sa) | 0,
      );
      h.fillCircle((cx + Rr * ca) | 0, (cy + Rr * sa) | 0, 1); // rim bolt
      h.fillCircle(
        (cx + ((Rh + Rr) / 2) * ca) | 0,
        (cy + ((Rh + Rr) / 2) * sa) | 0,
        1,
      ); // mid bolt
    }
    h.setColor(1).fillCircle(cx, cy, Rh);
    h.setColor(3).drawCircle(cx, cy, Rh);
    h.setFontMonofonto23()
      .setFontAlign(0, 0, 0)
      .drawString('9', cx, cy + 1);
  }

  // One player's half of a room (rooms are split top/bottom by a wall).
  function drawRoomCell(i, x1, y1, x2, y2, mine) {
    const P = PARTS[i];
    const cy = (y1 + y2) >> 1;
    h.setColor(P.human ? 3 : mine ? 3 : 2)
      .setFontMonofonto16()
      .setFontAlign(-1, 0, 0);
    h.drawString(dispName(i), x1 + 8, cy);
    if (!P.alive) drawDead(x2 - 8, cy);
    else
      h.setColor(3)
        .setFontMonofonto23()
        .setFontAlign(1, 0, 0)
        .drawString('' + P.pts, x2 - 10, cy);
  }

  function drawPair() {
    h.clear(0);
    h.setColor(2)
      .setFontMonofonto16()
      .setFontAlign(-1, -1, 0)
      .drawString('ROUND ' + round, SAFE_L, 20);
    h.setColor(1).setFontMonofonto14().setFontAlign(1, -1, 0);
    h.drawString('wheel: move', SAFE_R, 14);
    h.drawString('press: pick', SAFE_R, 30);
    drawVaultDoor(W >> 1, 60, 38); // the big Number 9 Door: the goal, front and centre
    // A wide central corridor runs down to the door, voting rooms along each side.
    h.setColor(1);
    for (let y = 118; y < 244; y += 18) h.drawLine(222, y, 258, y);
    const rooms = [
      [12, 112, 202, 176],
      [12, 182, 202, 246],
      [278, 112, 468, 176],
      [278, 182, 468, 246],
    ];
    for (let pi = 0; pi < pairs.length; pi++) {
      const a = pairs[pi][0];
      const b = pairs[pi][1];
      const B = rooms[pi];
      const mine = a === 0 || b === 0;
      if (mine) {
        h.setColor(1).fillRect(B[0] + 1, B[1] + 1, B[2] - 1, B[3] - 1);
      }
      h.setColor(mine ? 3 : 2).drawRect(B[0], B[1], B[2], B[3]);
      const midy = (B[1] + B[3]) >> 1;
      h.setColor(3).drawLine(B[0] + 4, midy, B[2] - 4, midy);
      h.drawLine(B[0] + 4, midy + 1, B[2] - 4, midy + 1);
      drawRoomCell(a, B[0], B[1], B[2], midy, mine); // top of the room
      drawRoomCell(b, B[0], midy, B[2], B[3], mine); // bottom of the room
    }
    // Vote buttons kept near the centre, flanking the "paired with" text.
    drawChoice(118, 262, 'ALLY', playerVote === ALLY);
    drawChoice(W - 118, 262, 'BETRAY', playerVote === BETRAY);
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, 0, 0)
      .drawString('PAIRED WITH', W >> 1, 270);
    h.setColor(3)
      .setFontMonofonto18()
      .setFontAlign(0, 0, 0)
      .drawString(PARTS[partner[0]].name, W >> 1, 288);
    flip();
  }

  function voteWord(i) {
    return lastVote[i] === ALLY ? 'ALLY' : 'BETRAY';
  }

  function drawResult() {
    h.clear(0);
    h.setColor(3)
      .setFontMonofonto18()
      .setFontAlign(0, -1, 0)
      .drawString('RESULTS  ROUND ' + round, W >> 1, SAFE_T);
    const cxP = 196;
    const cxV = 272;
    const cxC = 352;
    const cxN = 438;
    h.setColor(2).setFontMonofonto14();
    h.setFontAlign(-1, -1, 0).drawString('PLAYER', SAFE_L, 46);
    h.setFontAlign(0, -1, 0).drawString('PTS', cxP, 46);
    h.drawString('VOTE', cxV, 46);
    h.drawString('CHG', cxC, 46);
    h.drawString('NEW', cxN, 46);
    h.setColor(1).drawLine(SAFE_L, 62, SAFE_R, 62);
    const order = [];
    for (let pi = 0; pi < pairs.length; pi++) {
      order.push([pairs[pi][0], pi]);
      order.push([pairs[pi][1], pi]);
    }
    const top = 66;
    const rh = 28;
    for (let r = 0; r < order.length; r++) {
      const i = order[r][0];
      const pi = order[r][1];
      if (pi >= revealCount) continue; // not revealed yet (dramatic reveal)
      const y = top + r * rh;
      const mine = pairs[pi][0] === 0 || pairs[pi][1] === 0;
      if (mine) {
        h.setColor(1).fillRect(SAFE_L, y, SAFE_R, y + rh - 2);
      }
      const P = PARTS[i];
      const d = lastDelta[i];
      h.setColor(mine ? 3 : 2);
      h.setFontMonofonto16()
        .setFontAlign(-1, 0, 0)
        .drawString(dispName(i), SAFE_L + 2, y + (rh >> 1));
      h.setFontAlign(0, 0, 0).drawString('' + (P.pts - d), cxP, y + (rh >> 1));
      h.setFontMonofonto14().drawString(voteWord(i), cxV, y + (rh >> 1));
      h.setFontMonofonto16().drawString(
        (d > 0 ? '+' : '') + d,
        cxC,
        y + (rh >> 1),
      );
      if (!P.alive) drawDead(SAFE_R, y + (rh >> 1));
      else
        h.drawString(
          '' + P.pts + (P.pts >= WIN_PTS ? ' *' : ''),
          cxN,
          y + (rh >> 1),
        );
      if (r % 2 === 1) {
        h.setColor(1).drawLine(SAFE_L, y + rh - 1, SAFE_R, y + rh - 1);
      }
    }
    const revealing = revealCount < pairs.length;
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, 1, 0)
      .drawString(
        revealing
          ? 'press: skip'
          : gameEnd
            ? 'press: final result'
            : 'press: next round',
        W >> 1,
        SAFE_B,
      );
    flip();
  }

  function drawTextPage(arr) {
    h.setColor(3).setFontMonofonto14().setFontAlign(-1, -1, 0);
    const wpx = SAFE_R - SAFE_L - 2; // wrap to the full width so margins are even
    const top = 62; // sits well below the title
    const bottom = SAFE_B - 14; // leave room above the footer
    // Wrap everything first (null = paragraph gap) so we can size the spacing
    // to fit whatever the device font produces -- never runs off the bottom.
    const rows = [];
    let full = 0,
      gaps = 0;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === '') {
        rows.push(null);
        gaps++;
        continue;
      }
      const lines = h.wrapString(arr[i], wpx);
      for (let j = 0; j < lines.length; j++) {
        rows.push(lines[j]);
        full++;
      }
    }
    let lh = (bottom - top) / (full + gaps * 0.5);
    lh = lh > 17 ? 17 : lh < 11 ? 11 : lh | 0; // readable range, nicely spaced
    let y = top;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] === null) {
        y += lh >> 1;
        continue;
      }
      h.drawString(rows[i], SAFE_L + 2, y);
      y += lh;
    }
  }

  function drawOutcomes() {
    const rows = [
      ['ALLY', 'ALLY', '+2 / +2'],
      ['ALLY', 'BETRAY', '-2 / +3'],
      ['BETRAY', 'BETRAY', '0 / 0'],
    ];
    const x1 = 26;
    const x2 = W - 26;
    const top = 76;
    const rh = 42;
    h.setColor(2).setFontMonofonto14();
    h.setFontAlign(0, -1, 0).drawString('PLAYER1', 110, top - 20);
    h.drawString('PLAYER2', 236, top - 20);
    h.drawString('POINTS', 396, top - 20);
    h.setColor(3).drawRect(x1, top, x2, top + 3 * rh);
    h.drawLine(316, top, 316, top + 3 * rh);
    for (let i = 0; i < rows.length; i++) {
      const y = top + i * rh;
      if (i > 0) {
        h.setColor(1).drawLine(x1, y, x2, y);
      }
      h.setColor(3).setFontMonofonto16().setFontAlign(0, 0, 0);
      h.drawString(rows[i][0], 110, y + (rh >> 1));
      h.drawString(rows[i][1], 236, y + (rh >> 1));
      h.setColor(2).drawString(rows[i][2], 396, y + (rh >> 1));
    }
    h.setColor(2).setFontMonofonto14().setFontAlign(0, -1, 0);
    const cap = top + 3 * rh + 12;
    h.drawString('Ally or Betray - the choice is yours.', W >> 1, cap);
    h.setColor(3);
    h.drawString('Will YOU trust the one in the other room?', W >> 1, cap + 20);
    h.drawString('Will THEY trust you?', W >> 1, cap + 38);
  }

  function drawRules() {
    h.clear(0);
    const titles = ['VAULT 9', 'THE RULES', 'VOTE OUTCOMES'];
    h.setColor(3)
      .setFontMonofonto28()
      .setFontAlign(0, -1, 0)
      .drawString(titles[rulesPage], W >> 1, SAFE_T);
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(1, -1, 0)
      .drawString('< ' + (rulesPage + 1) + '/3 >', SAFE_R, SAFE_T);
    const T = loadText();
    if (rulesPage === 0) drawTextPage(T.c);
    else if (rulesPage === 1) drawTextPage(T.r);
    else drawOutcomes();
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, 1, 0)
      .drawString('wheel: page    press: back', W >> 1, SAFE_B);
    flip();
  }

  function drawNames(list, x, y, w) {
    h.setColor(2).setFontMonofonto16();
    const s = list.length ? list.join('   ') : '(none)';
    const lines = h.wrapString(s, w);
    for (let i = 0; i < lines.length && i < 3; i++) {
      h.setFontAlign(-1, -1, 0).drawString(lines[i], x, y + i * 22);
    }
  }

  function drawOver() {
    h.clear(0);
    const win = [];
    const out = [];
    for (let i = 0; i < N; i++) {
      if (PARTS[i].alive && PARTS[i].pts >= WIN_PTS) win.push(dispName(i));
      else out.push(dispName(i) + (PARTS[i].alive ? '' : '(x)'));
    }
    h.setColor(3)
      .setFontMonofonto36()
      .setFontAlign(0, -1, 0)
      .drawString(gameWon ? 'YOU ESCAPED!' : 'GAME OVER', W >> 1, SAFE_T + 2);
    h.setColor(3)
      .setFontMonofonto18()
      .setFontAlign(-1, -1, 0)
      .drawString('ESCAPED:', SAFE_L, 78);
    drawNames(win, SAFE_L, 102, SAFE_R - SAFE_L);
    h.setColor(3)
      .setFontMonofonto18()
      .setFontAlign(-1, -1, 0)
      .drawString('LEFT BEHIND:', SAFE_L, 188);
    drawNames(out, SAFE_L, 212, SAFE_R - SAFE_L);
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, 1, 0)
      .drawString('press: main menu', W >> 1, SAFE_B);
    flip();
  }

  function drawIntro() {
    if (showBin(INTRO_BIN)) return; // fullscreen image shown
    // fallback splash if the .BIN is missing or the blit fails
    h.clear(0);
    h.setColor(2)
      .setFontMonofonto18()
      .setFontAlign(0, -1, 0)
      .drawString(TITLE_TOP, W >> 1, 116);
    h.setColor(3)
      .setFontMonofonto36()
      .setFontAlign(0, -1, 0)
      .drawString(TITLE_BIG, W >> 1, 142);
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, 1, 0)
      .drawString('press to begin', W >> 1, SAFE_B);
    flip();
  }
  function drawDoor() {
    if (showBin(DOOR_BIN)) return;
    h.clear(0);
    h.setColor(3)
      .setFontMonofonto28()
      .setFontAlign(0, 0, 0)
      .drawString('THE NUMBER 9 DOOR OPENS', W >> 1, H >> 1);
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, 1, 0)
      .drawString('press to continue', W >> 1, SAFE_B);
    flip();
  }

  function draw() {
    if (screen === S_MENU) drawMenu();
    else if (screen === S_RULES) drawRules();
    else if (screen === S_INFO) drawInfo();
    else if (screen === S_PAIR) drawPair();
    else if (screen === S_RESULT) drawResult();
    else if (screen === S_INTRO) drawIntro();
    else if (screen === S_DOOR) drawDoor();
    else drawOver();
    syncMusic(); // after the paint, so the screen always shows even if audio stalls
  }

  // --- Input ------------------------------------------------------------------
  function exitApp() {
    Pip.changeMenu();
  }
  function menuPick() {
    sfx('SELECT');
    if (menuSel === 0) newGame();
    else if (menuSel === 1) {
      rulesPage = 0;
      screen = S_RULES;
      draw();
    } else if (menuSel === 2) {
      infoSel = 0;
      screen = S_INFO;
      draw();
    } else exitApp();
  }
  function toggleVote() {
    playerVote = playerVote === ALLY ? BETRAY : ALLY;
    sfx('SCROLL');
    draw();
  }

  function onKnob1(dir, long) {
    if (screen === S_MENU) {
      if (dir === 0) {
        if (long) exitApp();
        else menuPick();
      } else {
        menuSel = clamp(menuSel + dir, 0, MENU.length - 1);
        sfx('SCROLL');
        draw();
      }
    } else if (screen === S_RULES) {
      if (dir === 0) {
        freeText();
        screen = S_MENU;
        draw();
      } else {
        rulesPage = clamp(rulesPage + dir, 0, 2);
        sfx('SCROLL');
        draw();
      }
    } else if (screen === S_INFO) {
      if (dir === 0) {
        freeText();
        screen = S_MENU;
        draw();
      } else {
        infoSel = (infoSel + dir + CHARS.length) % CHARS.length;
        sfx('SCROLL');
        draw();
      }
    } else if (screen === S_PAIR) {
      if (dir === 0) {
        if (long) {
          screen = S_MENU;
          draw();
        } else {
          sfx('SELECT');
          resolveRound();
        }
      } else {
        toggleVote();
      }
    } else if (screen === S_RESULT) {
      if (dir === 0) {
        // First press: reveal all. Drop the pending stings so the bed comes back.
        if (revealCount < pairs.length) {
          stopReveal();
          stopStings();
          revealCount = pairs.length;
          draw();
        } else if (gameEnd) {
          screen = S_DOOR;
          draw();
        } // door-opens screen before the lists
        else {
          round++;
          startRound();
        }
      }
    } else if (screen === S_INTRO) {
      if (dir === 0) {
        screen = S_MENU;
        draw();
      }
    } else if (screen === S_DOOR) {
      if (dir === 0) {
        screen = S_OVER;
        draw();
      }
    } else {
      // S_OVER
      if (dir === 0) {
        screen = S_MENU;
        draw();
      }
    }
  }

  function onKnob2(dir) {
    if (dir === 0) return; // right wheel has no button
    if (screen === S_MENU) {
      menuSel = clamp(menuSel + dir, 0, MENU.length - 1);
      sfx('SCROLL');
      draw();
    } else if (screen === S_RULES) {
      rulesPage = clamp(rulesPage + dir, 0, 2);
      sfx('SCROLL');
      draw();
    } else if (screen === S_INFO) {
      infoSel = (infoSel + dir + CHARS.length) % CHARS.length;
      sfx('SCROLL');
      draw();
    } else if (screen === S_PAIR) {
      toggleVote();
    }
  }

  // --- Lifecycle --------------------------------------------------------------
  origIdle = Pip.settings.idleTimeout;
  Pip.settings.idleTimeout = 0;
  h.clear(0).flip();
  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  screen = S_INTRO; // open on the fullscreen splash; a press enters the menu
  menuSel = 0;
  // Defer the first paint off the load path. The splash streams ~38 KB off the
  // SD and blits it; doing that during init (before returning `api`) starves the
  // watchdog through the whole Misc launch chain and freezes. On the next idle
  // tick it's safe. (Holotape guide: defer heavy loads with setTimeout.)
  // E.defrag() compacts the JsVar heap fragmented by the Misc launcher before we
  // allocate the splash buffer. NukeSweeper+ uses the same pattern here.
  setTimeout(function () {
    E.defrag();
    if (!removed) draw();
  }, 0);

  const api = {
    id: 'zero-escape-vault-9',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      if (removed) return;
      removed = true;
      stopReveal();
      stopStings();
      stopMusic();
      Pip.removeListener('knob1', onKnob1);
      Pip.removeListener('knob2', onKnob2);
      Pip.settings.idleTimeout = origIdle;
      Pip.audioStop();
      h.clear();
      h.flip();
    },
  };

  if (Pip.__test) {
    api._parts = function () {
      return PARTS;
    };
    api._score = function (a, b) {
      return scorePair(a, b);
    };
    api._cpuVote = function (i, o) {
      return cpuVote(i, o);
    };
    api._distrust = function (i, o) {
      return distrust(i, o);
    };
    api._pairs = function () {
      return pairs;
    };
    api._resolve = function (pv) {
      playerVote = pv;
      resolveRound();
    };
    api._start = function () {
      startRound();
    };
    api._round = function () {
      return round;
    };
    api._flags = function () {
      return { end: gameEnd, won: gameWon };
    };
    api._setup = function (arr) {
      setupWith(arr);
    };
    api._setPts = function (i, v) {
      PARTS[i].pts = v;
    };
    api._setBetrayHist = function (i, o, bm, am) {
      betrayedMe[i * N + o] = bm;
      alliedMe[i * N + o] = am;
    };
    api._setPairs = function (ps) {
      pairs = ps;
      for (let k = 0; k < ps.length; k++) {
        partner[ps[k][0]] = ps[k][1];
        partner[ps[k][1]] = ps[k][0];
      }
    };
    api._draw = function () {
      draw();
    };
    api._setScreen = function (s) {
      screen = s;
    };
    api._setReveal = function (n) {
      revealCount = n;
    };
    api._setRulesPage = function (p) {
      rulesPage = p;
    };
    api._setVotes = function (v, d) {
      for (let i = 0; i < N; i++) {
        lastVote[i] = v[i];
        lastDelta[i] = d[i];
      }
    };
    api._setAlive = function (i, v) {
      PARTS[i].alive = v;
      if (!v) {
        PARTS[i].pts = 0;
        PARTS[i].died = true;
      }
    };
  }

  return api;
});
