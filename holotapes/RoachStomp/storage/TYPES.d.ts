/**
 * Types for Roach Stomp.
 *
 * Roaches march down a fixed number of lanes; the player lines up with a lane
 * and stomps before the roach reaches the bottom row.
 */

/** Difficulty names, which also key the per-difficulty tuning tables. */
type RoachStompDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

/** A roach currently marching down one lane. */
interface RoachStompRoach {
  /** Which row of the lane the roach occupies. */
  row: number;
  /**
   * Time, from getTime(), after which the roach can no longer be stomped.
   * Undefined until the roach reaches the stompable row.
   */
  stompDeadline: number | undefined;
}

/** A precomputed screen position for one board cell. */
interface RoachStompCell {
  /** Pixel X of the cell's top-left corner. */
  x: number;
  /** Pixel Y of the cell's top-left corner. */
  y: number;
}

/** One difficulty's best score, as saved to the SD card. */
interface RoachStompHighScore {
  /** Difficulty name. */
  name: string;
  /** Best score recorded for it. */
  score: number;
}

/** Decoded sprite JSON for drawImage. */
interface RoachStompImage {
  bpp: number;
  buffer: string;
  height: number;
  transparent?: number;
  width: number;
}

/** Lane slot: a marching roach, or empty. */
type RoachStompLane = RoachStompRoach | undefined | null;

/** Raw WAV header info used with Pip.audioStartVar. */
type RoachStompSfxInfo = Record<string, PipValue>;
