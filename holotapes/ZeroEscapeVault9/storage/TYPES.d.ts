/**
 * Types for Zero Escape: Vault 9.
 *
 * The app is a nine-player ally/betray tournament. Everything below either
 * describes the game state or the test surface the app exposes when a test
 * harness sets the `__test` flag on the firmware object.
 */

/** One competitor in the tournament, including the human player. */
interface Participant {
  /** Display name. */
  name: string;
  /** Index into the character table, or -1 for the human player. */
  ch: number;
  /** Current score. */
  pts: number;
  /** False once the participant has been eliminated. */
  alive: boolean;
  /** True for the single human-controlled participant. */
  human: boolean;
  /** True if the participant was eliminated rather than simply losing. */
  died: boolean;
}

/** Snapshot of the end-of-game flags, returned by the test surface. */
interface ZeroEscapeFlags {
  /** True once the game has finished. */
  end: boolean;
  /** True if the player won. */
  won: boolean;
}

/**
 * The object this holotape returns to the Pip-Boy OS.
 *
 * The underscore-prefixed members are test hooks. They are attached only
 * when the firmware object carries a `__test` flag, so they cost nothing on
 * a normal device, and every one of them is optional here to reflect that.
 */
interface ZeroEscapeApp extends HolotapeApp {
  /** Returns the live participant list. */
  _parts?: () => Participant[];
  /** Scores one pairing, returning both participants' point deltas. */
  _score?: (va: number, vb: number) => number[];
  /** Runs the AI vote for participant `i` against opponent `o`. */
  _cpuVote?: (i: number, o: number) => 0 | 1;
  /** Returns the AI's distrust of opponent `o`, from participant `i`. */
  _distrust?: (i: number, o: number) => number;
  /** Returns the current round's pairings. */
  _pairs?: () => number[][];
  /** Casts the player's vote and resolves the round. */
  _resolve?: (pv: number) => void;
  /** Starts a round. */
  _start?: () => void;
  /** Returns the current round number. */
  _round?: () => number;
  /** Returns the end-of-game flags. */
  _flags?: () => ZeroEscapeFlags;
  /** Rebuilds the participant list from the given character indices. */
  _setup?: (arr: number[]) => void;
  /** Sets a participant's score. */
  _setPts?: (i: number, v: number) => void;
  /** Seeds the betrayal/alliance history between two participants. */
  _setBetrayHist?: (i: number, o: number, bm: number, am: number) => void;
  /** Forces a specific set of pairings. */
  _setPairs?: (ps: number[][]) => void;
  /** Forces a redraw. */
  _draw?: () => void;
  /** Switches to a specific screen. */
  _setScreen?: (s: number) => void;
  /** Sets how many pairings have been revealed on the results screen. */
  _setReveal?: (n: number) => void;
  /** Jumps to a page of the rules screen. */
  _setRulesPage?: (p: number) => void;
  /** Seeds last round's votes and point deltas. */
  _setVotes?: (v: ArrayLike<number>, d: ArrayLike<number>) => void;
  /** Marks a participant alive or eliminated. */
  _setAlive?: (i: number, v: boolean) => void;
}

/**
 * The firmware object with the non-standard test flag some holotapes check.
 *
 * It is not part of the documented Pip API; a harness sets it so an app can
 * expose extra hooks without shipping them to real devices.
 */
interface PipWithTestFlag extends PipController {
  /** Set by a test harness to enable an app's test hooks. */
  __test?: boolean;
}

/** The text content loaded from DATA.JSON for the story screens. */
interface ZeroEscapeText {
  /** Cinematic intro paragraphs. */
  c: string[];
  /** Rules pages. */
  r: string[];
  /** Character biography lines. */
  b: string[];
}
