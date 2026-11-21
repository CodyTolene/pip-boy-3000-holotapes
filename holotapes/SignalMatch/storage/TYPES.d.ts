/**
 * Types for Signal Match, a memory game played on a tuning wheel.
 *
 * The wheel has sixteen positions with a digit on every other one. The game
 * plays a sequence of digits and the player tunes back to each in turn.
 */

/**
 * The four corners of one wheel segment, precomputed so the segment can be
 * filled with a single polygon draw.
 *
 * The inner edge is wider than the outer edge, which gives each wedge its
 * tapered dial look.
 */
interface SignalMatchWedge {
  /** Centre angle of the wedge, in radians. */
  angle: number;
  /** Outer radius, in pixels. */
  outerR: number;
  /** Inner edge, first corner X. */
  x0: number;
  /** Inner edge, first corner Y. */
  y0: number;
  /** Inner edge, second corner X. */
  x1: number;
  /** Inner edge, second corner Y. */
  y1: number;
  /** Outer edge, first corner X. */
  x2: number;
  /** Outer edge, first corner Y. */
  y2: number;
  /** Outer edge, second corner X. */
  x3: number;
  /** Outer edge, second corner Y. */
  y3: number;
}

/** What Signal Match keeps in HOLO/SIGNAL_MATCH/SAVE.JSON. */
interface SignalMatchSave {
  /** Best number of rounds matched. */
  b: number;
}

/** The picture fields of a record in the Pip-Boy's DATA/<game>/*.DAT files. */
interface ArtRecord {
  /** Offset of the picture in the .IMG file. */
  io?: number;
  /** Length of the picture in bytes. */
  il?: number;
}

/** The field the STATS hook reads from the save (see STATS_HOOK.ts). */
interface StatsSave {
  /** Best number of rounds matched. */
  b?: number;
}
