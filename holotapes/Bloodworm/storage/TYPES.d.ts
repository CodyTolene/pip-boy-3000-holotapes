/**
 * Types for Bloodworm, a snake game for one or two players.
 *
 * The playfield is a grid of tiles; each worm is a list of occupied tiles
 * with the head first.
 */

/** A grid position, in tile coordinates. */
interface BloodwormPoint {
  /** Column index. */
  x: number;
  /** Row index. */
  y: number;
}

/** One worm and the player controlling it. */
interface BloodwormPlayer {
  /** Colour index this worm is drawn in. */
  color: number;
  /** Current heading, as an index into the direction table. */
  dirIdx: number;
  /** Heading queued by the player's last input, applied on the next tick. */
  nextDir: number;
  /** False once the worm has crashed. */
  alive: boolean;
  /** Apples eaten this round. */
  score: number;
  /** Occupied tiles, head first. */
  segments: BloodwormPoint[];
}
