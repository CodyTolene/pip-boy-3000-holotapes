/**
 * Fixed geometry and tuning for PipInvaders. Everything in here is a constant
 * the game never writes, grouped into one object so it costs a single
 * variable block rather than one per value.
 */
interface PipInvadersConfig {
  /** First screen row of the play area, just under the HUD divider. */
  top: number;
  /** Distance between invader column origins, in pixels. Sprites are 24 wide. */
  colStep: number;
  /** Distance between invader row origins, in pixels. Sprites are 16 tall. */
  rowStep: number;
  /** Leftmost and rightmost x the formation may reach. */
  marginX: number;
  /** Pixels the formation slides sideways on each march step. */
  marchX: number;
  /** Pixels the formation drops each time it reaches an edge. */
  marchY: number;
  /** Row the top of the formation starts on at the beginning of a wave. */
  startY: number;
  /** Top row of the bunkers. */
  bunkerY: number;
  /** Top row of the player's turret. */
  turretY: number;
  /** Pixels the turret travels per frame while gliding. */
  turretSpeed: number;
  /** Frames of turret glide one wheel click buys. */
  glide: number;
  /** Pixels a player shot climbs per frame. */
  shotSpeed: number;
  /** Pixels a bomb falls per frame. */
  bombSpeed: number;
  /** Frames of blinking invulnerability granted after the turret is hit. */
  guard: number;
  /** Screen row the bonus vertibird crosses on. */
  vertibirdY: number;
}
