/**
 * Implicit globals used by Flappy Roach.
 *
 * The app assigns its entire state block without declaring it, so every name
 * below lands on the interpreter's global object rather than in the IIFE's
 * closure. That is an anti-pattern for holotapes (it pollutes the namespace
 * every app shares), but it is what the shipped JavaScript does, and this
 * port deliberately preserves on-device behaviour byte for byte.
 *
 * Declaring the names here rather than converting them to `let` keeps the
 * emitted JavaScript identical while still type checking every use. Moving
 * them into the closure is a worthwhile follow-up, but it is a behaviour
 * change and belongs in its own commit.
 */

/** Storage path for the persisted high score. */
declare let HS_PATH: string;
/** True while the title screen is showing. */
declare let inTitle: boolean;
/** True while the pause menu is open. */
declare let paused: boolean;
/** Pause menu entries. */
declare let menuItems: string[];
/** Index of the highlighted pause menu entry. */
declare let menuIndex: number;
/** Cached display width. */
declare let W: number;
/** Cached display height. */
declare let H: number;
/** Toggles every tick so the draw routine can skip alternate frames. */
declare let renderToggle: boolean;
/** Score captured when the run ended. */
declare let finalScore: number;

/** A single pipe obstacle scrolling right to left. */
interface FlappyPipe {
  /** Left edge of the pipe, in pixels. */
  x: number;
  /** Centre of the gap the roach must fly through. */
  gapY: number;
  /** Whether this pipe has already awarded a point. */
  scored: boolean;
  /** Height of the gap, in pixels. */
  gap: number;
}

/** The impact animation played when a run ends. */
interface FlappyImpact {
  /** Which failure triggered it: hitting a pipe or hitting the ground. */
  kind: string;
  /** Impact centre X. */
  x: number;
  /** Impact centre Y. */
  y: number;
  /** Timestamp the animation started, from getTime(). */
  t0: number;
}

/** The player character. */
interface FlappyBird {
  /** Fixed horizontal position. */
  x: number;
  /** Vertical position, driven by gravity and flaps. */
  y: number;
  /** Vertical velocity. */
  vy: number;
  /** Square hit-box size, in pixels. */
  size: number;
}

/** Active pipes, oldest first. */
declare let pipes: FlappyPipe[];
/** The player character, created on each run. */
declare let bird: FlappyBird;
/** Impact animation state, or null when none is playing. */
declare let impactFX: FlappyImpact | null;
/** Current score. */
declare let score: number;
/** True once the run has ended. */
declare let gameOver: boolean;
/** Last score value drawn, used to avoid redundant redraws. */
declare let lastDrawnScore: number;
/** Handle of the main game loop interval. */
declare let loopId: number | null;
/** Handle of the power button watch. */
declare let powerWatchId: number | null;
/** Previous DATA button state, for edge detection. */
declare let playWasDown: boolean;
/** Previous knob press state, for edge detection. */
declare let knob1WasDown: boolean;
/** Frames elapsed in the current run. */
declare let frameCount: number;
/** Timestamp of the last flap, used to animate the wings. */
declare let roachFlapT: number;
/** Current sprite tilt, eased toward the velocity direction. */
declare let roachTilt: number;
/** Timestamp of the last flap sound, used to rate limit audio. */
declare let lastFlapSoundT: number;
/** Handle of the timeout that plays the game over sound. */
declare let tOverSound: number | null;
/** Handle of the timeout that clears the impact animation. */
declare let tImpactClear: number | null;
/** True once the game over UI should be drawn (after the impact animation). */
declare let showGameOverUI: boolean;
/** Input is ignored until this timestamp, from getTime(). */
declare let inputLockedUntil: number;

/** Downward acceleration applied every frame. */
declare let GRAVITY: number;
/** Upward velocity applied by a flap. */
declare let FLAP: number;
/** Horizontal pipe speed, in pixels per frame. */
declare let PIPE_SPEED: number;
/** Vertical size of the gap between pipe halves. */
declare let PIPE_GAP: number;
/** Pipe width, in pixels. */
declare let PIPE_WIDTH: number;
/** Horizontal distance between consecutive pipes. */
declare let PIPE_SPACING: number;
/** Ceiling inset, in pixels. */
declare let CEIL_H: number;
/** Floor inset, in pixels. */
declare let FLOOR_H: number;
/** Extra bezel padding applied to the play area bounds. */
declare let EDGE_PAD: number;
/** Top of the play area. */
declare let PLAY_TOP: number;
/** Bottom of the play area. */
declare let PLAY_BOT: number;

/** Wing flap sound. */
declare let SND_FLAP: string;
/** Pipe collision sound. */
declare let SND_HIT: string;
/** Game over sound. */
declare let SND_OVER: string;
/** Splat sound played on a pipe hit. */
declare let SND_SPLAT: string;
/** Run start sound. */
declare let SND_START: string;
