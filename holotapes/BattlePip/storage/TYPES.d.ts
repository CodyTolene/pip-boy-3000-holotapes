/**
 * Types for BattlePip, a Battleship game against the Pip-Boy.
 *
 * Both grids are 10x10 and stored flat, indexed `row * 10 + col`.
 */

/** A grid position. */
interface BattlePipCell {
  /** Row index, 0-9. */
  r: number;
  /** Column index, 0-9. */
  c: number;
}

/** One wrapped line of a dialog box, with the font and colour to draw it. */
interface BattlePipTextLine {
  /** The line text. */
  t: string;
  /** Font name to draw it with. */
  f: string;
  /** Colour index to draw it in. */
  c: number;
}

/**
 * A laid-out dialog box, cached by width and content.
 *
 * Wrapping text is expensive on this hardware, so a box is measured once and
 * the result reused for every redraw.
 */
interface BattlePipTextBox {
  /** The wrapped lines. */
  lines: BattlePipTextLine[];
  /** Height of each line, in pixels. */
  lineH: number[];
  /** Overall box width, in pixels. */
  boxW: number;
  /** Overall box height, in pixels. */
  boxH: number;
}
