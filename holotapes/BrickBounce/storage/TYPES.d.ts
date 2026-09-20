/**
 * Brick Bounce shared types.
 *
 * Scene files are uninvoked function expressions loaded with eval. Keep every
 * annotation erasable so the emitted JavaScript matches the device-tested
 * sources.
 */

/** Arguments the OS / sibling scenes pass into Brick Bounce loaders. */
interface BrickBounceParams {
  keepMusic?: boolean | number;
  view?: string;
  score?: number;
  high?: number;
  sound?: boolean | number;
  music?: boolean | number;
  vol?: number;
  disp?: boolean | number;
  mode?: boolean | number;
  diff?: number;
  slot?: number;
  level?: number;
  win?: boolean | number;
  ps?: number;
  x?: boolean | number;
  players?: number;
  resume?: boolean | number;
  preview?: boolean | number;
  custom?: string | number;
  cfg?: PipValue;
  msg?: string;
  sec?: number;
  bonus?: number;
  base?: number;
  lbo?: PipValue;
  cbo?: PipValue;
  save?: BrickBounceGameSave | PipValue;
  /** Upload / scoreboard payload fields. */
  s?: number;
  n?: string;
  m?: number;
  d?: number;
  w?: number;
  l?: number;
}

/**
 * Factory shape of every Brick Bounce scene file: an uninvoked function
 * expression that returns a holotape app object.
 */
type BrickBounceFactory = (params?: BrickBounceParams | 0) => HolotapeApp;

/** Decrypted save payload returned by SAVE.ts `read`. */
interface BrickBounceSaveEnvelope {
  d: PipValue;
  r: string;
}

/** SAVE.JS / SAVEW.JS factory: `(file, data?) => value`. */
type BrickBounceSaveDb = (
  file: string,
  data?: PipValue | 0,
) => PipValue | 0 | 1;

/** Settings record stored in SETTINGS/BRKBNCE.DAT. */
interface BrickBounceSettings {
  sound?: number;
  music?: number;
  vol?: number;
  disp?: number;
  ps?: number;
  paddle?: number;
  ball?: number;
  name?: string;
  high?: number;
  fh?: number;
  rh?: number;
  sh?: number;
  shs?: number;
  mpv?: number;
  u?: number;
  ul?: number;
  on?: string;
  ib?: number;
  bcl?: number;
  bcu?: number;
  bt?: number;
  ce?: number;
  cpa?: number;
  cpb?: number;
  csn?: number;
  csp?: number;
  scores?: BrickBounceScoreRow[];
}

/** Snapshot of blit options Brick Bounce temporarily overrides. */
interface BrickBounceBlitBackup {
  v?: boolean | number;
  i?: number[];
  n?: boolean | number;
  vsync?: boolean | number;
  ydiff?: number;
  filter?: number | number[];
  idleFilter?: number[];
  noScanEffect?: boolean | number;
}

/** Brick sprite sheet loaded from BRICKS.JS (array of image strings). */
type BrickBounceImages = string[];

/** Floaty mini-game WAV buffers. */
interface BrickBounceFloatyAudio {
  PAD: Uint8Array;
  CLEAR: Uint8Array;
  GAME: Uint8Array;
  [name: string]: Uint8Array;
}

/** UI sound names Brick Bounce passes to Pip.playSound. */
type BrickBounceUiSound = PipSoundName;

/** Global blit backup stash used across Brick Bounce scenes. */
interface BrickBounceGlobalBlit {
  __bbBo?: BrickBounceBlitBackup;
}

/** In-game WAV buffers for the main Brick Bounce game. */
interface BrickBounceGameAudio {
  PAD: Uint8Array;
  WALL: Uint8Array;
  BRK: Uint8Array;
  HIT: Uint8Array;
  CLANK: Uint8Array;
  [name: string]: Uint8Array;
}

/** Brick cell value: digit code or letter power-up glyph. */
type BrickBounceCell = number | string;
/** Autosave blob written by GAME.ts. */
interface BrickBounceGameSave {
  p?: number;
  w?: number;
  s?: number;
  v?: number;
  l?: number;
  c?: number;
  m?: number;
  d?: number;
  z?: number;
  x?: number;
  xe?: number;
  b?: string;
}

/** Leaderboard row. */
interface BrickBounceScoreRow {
  n?: string;
  s?: number;
  m?: number;
  d?: number;
  w?: number;
  l?: number;
  x?: number;
}
/** Per-slot run save loaded from SAVE.JS. */
interface BrickBounceSlotSave {
  p?: number;
  s?: number;
  v?: number;
  l?: number;
  c?: number;
  m?: number;
  d?: number;
  z?: number;
  x?: number;
  xe?: number;
  b?: string;
}
interface BrickBouncePongAudio {
  PAD: Uint8Array;
  WALL: Uint8Array;
  BRK: Uint8Array;
  [name: string]: Uint8Array;
}
interface BrickBounceRunAudio {
  PAD: Uint8Array;
  GAME: Uint8Array;
  [name: string]: Uint8Array;
}
interface BrickBounceSnakeAudio {
  HIT: Uint8Array;
  POWER: Uint8Array;
  GAME: Uint8Array;
  [name: string]: Uint8Array;
}
