// ====== Flappy Roach (A Flappy-ish Wasteland Game) ======
// ====== A JS learning experience for Jim D. ======
// ====== Thanks to @Code, @Darrian/@Rikkuness, @Aidan's Lab for all the advice, suggestions, tips, and tricks! ======
// ====== Left Dial-press / DATA Button-press flaps/restarts game, STATS pauses, Page Selector exits, Power soft reboot ======
//
(function () {
  var oldCurrent = Pip.CURRENT;
  var oldDisable = Pip.blitOptions && Pip.blitOptions.disable;

  Pip.remove();

  if (Pip.blitOptions) {
    Pip.blitOptions.disable = false;
  }
  clearWatch();

let C = h;
 HS_PATH = "/HOLO/FLAPPY/flappy_hs",
 inTitle = true,
 paused = false,
 menuItems = ["RESUME GAME", "RESTART GAME", "QUIT (REBOOT)"],
 menuIndex = 0,
 W = C.getWidth(),
 H = C.getHeight(),
 renderToggle = true, // Used to limit draw routine to every other tick. Only set to False if skipping ticks is enabled in the draw routine
 finalScore = 0,
 pipes = [],
 score = 0,
 gameOver = false,
 lastDrawnScore = -1,
 loopId = null,
 powerWatchId = null,
 playWasDown = false,
 knob1WasDown = false,
 frameCount = 0,
 roachFlapT = 0,
 roachTilt  = 0,
 tOverSound = null,
 tImpactClear = null,
 lastFlapSoundT = 0,
 impactFX = null,
 showGameOverUI = true,
 inputLockedUntil = 0,
 GRAVITY = 0.4,
 FLAP = -5,
 PIPE_SPEED = 4,
 PIPE_GAP = 40,
 PIPE_WIDTH = 15,
 PIPE_SPACING = 200,
 SND_FLAP  = "/HOLO/FLAPPY/BeetleFlying.wav",
 SND_HIT  = "/HOLO/FLAPPY/HitGround.wav",
 SND_OVER  = "/HOLO/FLAPPY/GameOver.wav",
 SND_SPLAT   = "/HOLO/FLAPPY/SplatOnPipe.wav",
 SND_START = "/HOLO/FLAPPY/StartGame.wav",
 CEIL_H  = 18,  // pixels offset
 FLOOR_H = 20,  // pixels offset
// Play area bounds (Flappy Roach must stay inside these)
 EDGE_PAD = 0, // Change this value to adjust boundary bezel gap
 PLAY_TOP = CEIL_H,
 PLAY_BOT = H - FLOOR_H;
// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

function drawTitleScreen() {
  C.clear();
  C.setFontAlign(-1, -1);
  C.setFont("6x8", 3);
  drawCentered("FLAPPY ROACH", Math.floor(H * 0.25));
  C.setFont("6x8", 2);
  drawCentered("Knob1 or DATA", Math.floor(H * 0.52));
  drawCentered("to START", Math.floor(H * 0.60));
  drawCentered("STATS: Pause Menu", Math.floor(H * 0.78));
  flushScreen();
}

function startRun() {
  inTitle = false;
  gameOver = false;
  paused = false;
  // give player a moment of stability
  bird.y = H / 2;
  bird.vy = 0;
  pipes = [];
  newPipe(); // or newPipe(W) depending on your current version
  playSound(SND_START); // optional, if you want start sound here
}

function playSound(name) {
  try {
    Pip.audioStop();
    Pip.audioStart(name);
  } catch (e) {
    Pip.errorBox(e);    // Enable pop-up error box
  }
}

function playFlapSound() {
  let now = getTime() * 1000; // ms
  if (now - lastFlapSoundT < 120) return; // 120ms minimum gap
  lastFlapSoundT = now;
  playSound(SND_FLAP);
}

function drawSplat(x, y, s, t) {
  // x,y: center-ish, s: size scale, t: 0..1 progress
  let r = Math.max(2, s + Math.floor(t * 6));
  // central blob
  C.fillRect(x - r, y - r, x + r, y + r);
  // droplets (fixed pattern, grows a bit with t)
  let d = r + 2;
  C.fillRect(x - d, y - 1, x - d + 2, y + 1)
  .fillRect(x + d - 2, y - 1, x + d, y + 1)
  .fillRect(x - 1, y - d, x + 1, y - d + 2)
  .fillRect(x - 1, y + d - 2, x + 1, y + d);
  // diagonals
  C.fillRect(x - d, y - d, x - d + 2, y - d + 2)
  .fillRect(x + d - 2, y - d, x + d, y - d + 2)
  .fillRect(x - d, y + d - 2, x - d + 2, y + d)
  .fillRect(x + d - 2, y + d - 2, x + d, y + d);
  // optional little “crack” line for pipe hit
  if (impactFX && impactFX.kind === "HIT") {
    C.drawLine(x - r - 2, y, x + r + 2, y);
  }
}

function flapAction() {
  // Ignore all input during lockout window
  if (getTime() < inputLockedUntil) return;
  // Pause menu: press selects
  if (paused && !gameOver) {
    pauseSelect();
    return;
  }
  if (inTitle) { startRun(); return; }
  if (gameOver) { resetGame(); startRun(); return; }
  bird.vy = FLAP;
  roachFlapT = 6;
  roachTilt = -1;
  playFlapSound();
}

// * * * * * * * * * * * * * * * Save High Score * * * * * * * * * * * * * * * * * *
function saveHighScoreIfNeeded(s) {
    if (s > highScore) {
      highScore = s;
	  fs.writeFileSync(HS_PATH, String(s));
    }
}

// * * * * * * * * * * * * * * * Load High Score * * * * * * * * * * * * * * * * * *
function loadHighScore() {
  try {
    return parseInt(fs.readFileSync(HS_PATH) || "0", 10);
  } catch (e) {
    if (e && e.toString().indexOf("NO_FILE") >= 0) {
      fs.writeFileSync(HS_PATH, "0");
      return 0;
    }
    throw e;
  }
}

let highScore = loadHighScore();

function togglePause() {
  paused = !paused;
  if (paused) {
    menuIndex = 0;  // keep this!
    // Small input lock so the pause button press
    // doesn’t instantly trigger a menu selection
    inputLockedUntil = getTime() + 0.15;
    // Reset press-state tracking so a held button
    // doesn't count as a new press
    knob1WasDown = (typeof ENC1_PRESS !== "undefined") ? ENC1_PRESS.read() : false;
    playWasDown  = (typeof BTN_DATA  !== "undefined") ? BTN_DATA.read()  : false;
  }
}

function pauseSelect() {
  C.clear();
  let choice = menuItems[menuIndex];
  if (choice === "RESUME GAME") {
    paused = false;
  } else if (choice === "RESTART GAME") {
    paused = false;
    resetGame();
    startRun && startRun(); // if you have startRun
    // or just reset+inTitle=true depending on your flow
  } else if (choice.indexOf("QUIT") === 0) {
    // Save score, then reboot (reliable “exit”)
    try { saveHighScoreIfNeeded(score); } catch (e) {}
    C.clearRect(0, PLAY_TOP, W - 1, PLAY_BOT - 1);
    E.reboot();
  }
}

function flushScreen() {
  C.clearRect()
}

function newPipe() {
  // Playable lane height (between ceiling and floor bars)
  const laneTop = PLAY_TOP;
  const laneBot = PLAY_BOT;
  const laneH   = laneBot - laneTop;
  // Logic is based on a lane now
  let gap = Math.min(PIPE_GAP, laneH - 20);   // 20 is analogous to your old "H - 30" safety
  if (gap < 10) gap = 10;                    // safety: don't allow absurdly tiny gaps
  let margin = 10,                           // same feel as before
  usable = laneH - gap - margin * 2,
  gapY = laneTop + margin + Math.random() * (usable > 0 ? usable : 1);
  pipes.push({ x: W, gapY: gapY, scored: false, gap: gap });
}

function resetGame() {
  W = C.getWidth();
  H = C.getHeight();
  paused = false;
  gameOver = false;
  bird = { x: Math.floor(W * 0.25), y: H / 2, vy: 0, size: 6 };
  pipes = [];
  score = 0;
  inTitle = true; // <--
}

// Floor & Ceiling
function drawBounds() {
  // Ceiling
  C.setColor(0,0,0);
  C.fillRect(0, 0, W-1, PLAY_TOP-1)
  // Floor
  .fillRect(0, PLAY_BOT, W-1, H-1);
  // Optional: thin bright edge line so it "reads" clearly
  C.setColor(1,1,1);
  C.drawLine(0, PLAY_TOP-1, W-1, PLAY_TOP-1)
  .drawLine(0, PLAY_BOT,   W-1, PLAY_BOT);
}

function update() {
  if (!pipes) pipes = []; // safety
  // --- Always poll inputs FIRST (even on score/title/pause screens) ---
  // DATA Button
  if (typeof BTN_DATA !== "undefined") {
    let down = BTN_DATA.read();
    if (down && !playWasDown) flapAction();
    playWasDown = down;
  }

  // knob1 press (hardware)
  if (typeof ENC1_PRESS !== "undefined") {
    let down = ENC1_PRESS.read();
    if (down && !knob1WasDown) flapAction();
   knob1WasDown = down;
  }

  // Now we can bail out of motion/physics while on other screens
  if (inTitle) return;
  if (gameOver || paused) return;

  // Flap animation countdown
  if (roachFlapT > 0) roachFlapT--;

  // Tilt easing
  let targetTilt = 0;
  if (bird && isFinite(bird.vy)) targetTilt = (bird.vy < 0) ? -1 : 1;
  roachTilt += (targetTilt - roachTilt) * 0.15;

  // Physics
  bird.vy += GRAVITY;
  bird.y += bird.vy;
  if (!isFinite(bird.y)) { bird.y = H/2; bird.vy = 0; }
  if (bird.y < 0 || bird.y + bird.size > H) endRun("FELL");

// ---- Ceiling / Floor Collision (CLAMP HERE) ----
let clippedY = E.clip(bird.y, PLAY_TOP, PLAY_BOT - bird.size);

if (clippedY !== bird.y) {
  bird.y = clippedY;
  endRun("HIT");
}

  // New collision loop
  // Pipes move/collide/score
  for (let i = 0; i < pipes.length; i++) {
  let p = pipes[i];
  p.x -= PIPE_SPEED;
  if (bird.x + bird.size > p.x && bird.x < p.x + PIPE_WIDTH) {
    let gapTop = Math.max(p.gapY, PLAY_TOP),
    gapBot = Math.min(p.gapY + p.gap, PLAY_BOT);
    if (bird.y < gapTop || bird.y + bird.size > gapBot) endRun("HIT");
  }
  if (!p.scored && p.x + PIPE_WIDTH < bird.x) {
    p.scored = true;
    score++;
  }
}

  // Spawn pipesF
  let last = pipes[pipes.length - 1];
  if (!last) newPipe();
  else if (last.x <= W - PIPE_SPACING) newPipe();
  // Remove pipes that have gone off screen (INSIDE update!)
  if (pipes.length && pipes[0].x < -PIPE_WIDTH) {
    pipes.shift();
  }
}

function drawCentered(text, y) {
  C.setFontAlign(-1, -1); // left/top
  let tw = C.stringWidth(text),
  x = Math.max(0, Math.floor((W - tw) / 2));
  C.drawString(text, x, y);
}

function draw() {
  C.clearRect(0, PLAY_TOP, W - 1, PLAY_BOT - 1);
  if (inTitle) {
    drawTitleScreen();
    return;
  }
  // Pipes
  if (!pipes) pipes = [];
  // (Optional but recommended) draw visible ceiling/floor first
  drawBounds();
  for (let i = 0; i < pipes.length; i++) {
    let p = pipes[i],
    gapY = Math.max(p.gapY, PLAY_TOP);
    // Top pipe: stop at the start of the gap (but never draw above the ceiling bar)
    C.fillRect(p.x, PLAY_TOP, p.x + PIPE_WIDTH, gapY)
    // Bottom pipe: start after the gap and stop at the floor bar
    .fillRect(p.x, gapY + p.gap, p.x + PIPE_WIDTH, PLAY_BOT);
  }
  // Rad-Roach
  drawRadroach(bird.x, bird.y, bird.size, frameCount, roachFlapT, roachTilt);
  // Score
  C.setFont("6x8", 2);
  C.setFontAlign(-1, -1);
if (score !== lastDrawnScore) {
  lastDrawnScore = score;
}
  C.drawString(" Score: " + score, 2, PLAY_TOP + 2);
// If Game Over
  if (gameOver) {
  C.clear();   // full clear only for static screen
  // If we’re in the impact phase, draw splat instead of text
  if (!showGameOverUI && impactFX) {
  // Splat overlay - Increases by 0.3 times.
  // If splat is increased, setTimeout (at the bottom of "function endRun") should also be increased to the same.
  // Also, inputLockedUntil should be set to the same thing.
    let t = Math.min(1, (getTime() - impactFX.t0) / 0.95); // 0..1
    drawSplat(impactFX.x, impactFX.y, 3, t);
    return;
  }
   // Otherwise: normal Game Over screen
      C.setFont("6x8", 3);
      drawCentered("GAME OVER", Math.floor(H * 0.14));
      C.setFont("6x8", 2);
        drawCentered("Score: " + finalScore, Math.floor(H * 0.30));
        drawCentered("Highest Score: " + highScore, Math.floor(H * 0.40));
        drawCentered("Dial1/DATA: Play Again", Math.floor(H * 0.64));
        drawCentered("Power: Exit to MAIN", Math.floor(H * 0.74));
  } else if (paused) {
    drawPauseMenu();
  }
  return;
}

// If the display supports color and you’re already using setColor, you could make the eyes “glow red”
// by briefly switching colors for the eye pixels — but the blink/pulse trick works in monochrome as well.
function drawRadroach(x, y, s, t, flapT, tilt) {
  let k = Math.max(1, Math.floor(s / 3)),
  // tilt shift: -1..1 => -2..2 pixels
  dxTop = Math.round((-tilt) * 2),   // tilt up shifts head slightly
  dxBot = Math.round(( tilt) * 2);
  // BODY
  C.fillRect(x + 1*k + dxTop, y + 1*k, x + 5*k + dxBot, y + 4*k)
  .fillRect(x + 2*k + dxTop, y + 0*k, x + 4*k + dxTop, y + 1*k) // head
  .fillRect(x + 1*k + dxBot, y + 4*k, x + 5*k + dxBot, y + 5*k); // abdomen
  // Removed the Eye Glow and Halo Effects Here
  // WINGS (only visible right after flap)
  if (flapT > 0) {
    // alternate wing pose for a flapping look
    let w = (flapT & 1) ? 3 : 2;
    // left wing
    C.drawLine(x + 1*k + dxTop, y + 2*k, x - w*k, y + 1*k)
    .drawLine(x + 1*k + dxTop, y + 3*k, x - w*k, y + 4*k)
    // right wing
    .drawLine(x + 5*k + dxBot, y + 2*k, x + (6+w)*k, y + 1*k)
    .drawLine(x + 5*k + dxBot, y + 3*k, x + (6+w)*k, y + 4*k);
  }
  // LEGS (simple)
  C.fillRect(x + 0*k + dxTop, y + 2*k, x + 0*k + dxTop, y + 2*k)
  .fillRect(x + 6*k + dxBot, y + 2*k, x + 6*k + dxBot, y + 2*k);
}

function bindGameControls() {
  let enc1b,
  enc1time = 0,
  enc1fast = 0;

Pip.onExclusive("knob1", function(dir) {
  if (dir > 0) {
    // clockwise
  } else {
    // counter-clockwise
  }
});

  setWatch(function (e) {
    if (enc1b === e.data) return;

  enc1b = e.data;

  if (e.state) {
    if (e.time - enc1time < 0.1) enc1fast++;
    else enc1fast = 1;

    enc1time = e.time;

    let step = Math.max(1, Math.min(5, enc1fast >> 1)),
    dir = e.state ^ e.data ? step : -step;

    if (paused && !gameOver) {
      if (dir > 0) menuIndex--;
      else menuIndex++;

      if (menuIndex < 0) menuIndex = menuItems.length - 1;
      if (menuIndex >= menuItems.length) menuIndex = 0;

      draw();
    }
  }
},
  ENC1_A, {
  data: ENC1_B,
  edge: 0,
  repeat: true,
  debounce: 0
});
setWatch(function () {
  if (!gameOver) togglePause();
}, BTN_STATS, { edge: "rising", repeat: true, debounce: 50 });
}

function drawPauseMenu() {
  C.clear();
  C.setFontAlign(-1, -1);
  C.drawRect(10, 20, W - 10, H - 20);
  C.setFont("6x8", 3);
  drawCentered("PAUSED", 28);
  C.setFont("6x8", 2);
  for (let i = 0; i < menuItems.length; i++) {
//    let y = 52 + i * 12;
    let y = 102 + i * 16, // Adjust Y location of menuItems
    t = (i === menuIndex ? "> " : "  ") + menuItems[i];
    drawCentered(t, y);
  }
  C.setFont("6x8", 2);
  drawCentered("STATS Press: Resume", H - 56);
  drawCentered("Left Knob / DATA Press: Select", H - 36);
}

function stopGame() {
  if (loopId) { clearInterval(loopId); loopId = null; }
  if (powerWatchId) { clearWatch(powerWatchId); powerWatchId = null; }
  if (tOverSound) { clearTimeout(tOverSound); tOverSound = null; }
  if (tImpactClear) { clearTimeout(tImpactClear); tImpactClear = null; }
}

function endRun(reason) {
  gameOver = true;
  paused = false;
  // Can be tuned up or down to change "0.6"
  // Ideally should match the 'Splat' timing
  inputLockedUntil = getTime() + 0.75; // 600 ms lockout
  finalScore = score;
  saveHighScoreIfNeeded(finalScore);
  // Start impact animation for 300ms
  showGameOverUI = false;
  impactFX = {
    kind: reason,
    x: Math.round(bird.x + bird.size/2),
    y: (reason === "FELL")
         ? Math.min(H - 6, Math.round(bird.y + bird.size/2))
         : Math.round(bird.y + bird.size/2),
    t0: getTime()
  };
  // Play sound (your full paths)
  if (reason === "HIT")  playSound(SND_SPLAT);
  if (reason === "FELL") playSound(SND_HIT);
  // playSound(SND_OVER);
  // clear any previous endRun timers (defensive)
  if (tOverSound) { clearTimeout(tOverSound); tOverSound = null; }
  if (tImpactClear) { clearTimeout(tImpactClear); tImpactClear = null; }
  tOverSound = setTimeout(() => playSound(SND_OVER), 500);
  tImpactClear = setTimeout(() => {
    showGameOverUI = true;
    impactFX = null;
    tImpactClear = null;
  }, 950);    // Changes Splat duration
}

// The Game Starts Here
  stopGame();
  resetGame();
  draw();
  playSound(SND_START); // optional: start sound when restarting
  bindGameControls();
  powerWatchId = setWatch(
    () => { E.reboot(); }, 
    BTN_POWER, 
    {
      debounce: 50,
      edge: "rising",
      repeat: true,
    }
  );
  draw();
// Below used to limit draw routine to every other tick
// Used in conjunction with "let renderToggle = false"
// If NOT skipping ticks then set "let renderToggle = false" to "true"
//  loopId = setInterval(function () {    // Optional to skip ticks
  loopId = setInterval(() => {    // Optional to NOT skip ticks
   update();
   frameCount++;
//   renderToggle = !renderToggle;    // Optional to skip ticks
//   if (renderToggle) draw();    // Optional to skip ticks
     draw();    // Optional to NOT skip ticks
 }, 50); // Adjust framerate

return {
  fullscreen: true,

  remove: function () {
    stopGame();

    if (Pip.blitOptions) {
      Pip.blitOptions.disable = false;
    }

    try {
      Pip.setWatches();
    } catch (e) {}
  }
};

})
