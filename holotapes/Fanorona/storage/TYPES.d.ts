/**
 * Types for Fanorona, a Malagasy capture game played on a 5x9 board.
 *
 * Board squares hold a signed number: positive for the player's pieces,
 * negative for the opponent's, and 0 for an empty intersection.
 */

/** A board position. */
interface FanoronaCell {
  /** Row index, 0-4. */
  row: number;
  /** Column index, 0-8. */
  col: number;
}

/** A direction of travel across the board, as a row/column delta. */
interface FanoronaDirection {
  /** Row delta, -1, 0, or 1. */
  dr: number;
  /** Column delta, -1, 0, or 1. */
  dc: number;
}

/**
 * A candidate move.
 *
 * Fanorona captures happen by moving toward a line of enemy pieces
 * (approach) or away from one (withdrawal), so a single step can offer two
 * different capture sets and the player has to pick one.
 */
interface FanoronaMove {
  /** Row the piece moves from. */
  fr: number;
  /** Column the piece moves from. */
  fc: number;
  /** Row the piece moves to. */
  tr: number;
  /** Column the piece moves to. */
  tc: number;
  /** Row delta of the step. */
  dr: number;
  /** Column delta of the step. */
  dc: number;
  /** Pieces this move captures. */
  caps: FanoronaCell[];
  /** False for a plain move that captures nothing. */
  isCapture: boolean;
  /** Which capture rule applies, when this move captures. */
  captureType?: string;
}

/**
 * A set of board positions, keyed by `row * 9 + col`.
 *
 * Flat numeric keys are used instead of nested arrays because a plain object
 * costs far fewer Espruino variable blocks than a 5x9 array of arrays.
 */
type FanoronaCellSet = Record<number, boolean>;
