/**
 * Types for Checkers.
 *
 * The board is a flat `Uint8Array(64)`: 0 is empty, and the low bit of a
 * non-zero cell picks the side (1 player, 2 AI, plus 2 again for a king).
 * Moves are packed into a single integer so a whole move list costs one
 * array rather than one object per move.
 */

/** Scene file names, relative to the holotape's storage directory. */
interface CheckersScenes {
  /** The board. */
  GAME: string;
  /** How to play. */
  HELP: string;
  /** Main menu. */
  MENU: string;
}

/** The shared application object passed to every scene. */
interface CheckersApp {
  /** Display height in pixels. */
  H: number;
  /** Display width in pixels. */
  W: number;
  /** Scene file names. */
  scenes: CheckersScenes;
  /** Forces a garbage collection pass between scenes. */
  gc: () => void;
  /** Queues a scene change for the next event loop turn. */
  go: (file: string, params?: object) => void;
}

/** The handle a scene returns so the app can tear it down. */
interface CheckersScene {
  /** Releases the scene's listeners, timers, and watches. */
  remove: () => void;
}

/** A scene file: an uninvoked function expression the app evaluates. */
type CheckersSceneFactory = (
  app: CheckersApp,
  params?: object,
) => CheckersScene;

/** A queued scene change awaiting the next event loop turn. */
interface CheckersPendingScene {
  /** Scene file to load. */
  file: string;
  /** Arbitrary parameters handed to the scene. */
  params?: object;
}

/**
 * A move packed into one integer: the origin cell in bits 0-5, the
 * destination in bits 6-11, and the jumped cell above that.
 */
type CheckersMove = number;
