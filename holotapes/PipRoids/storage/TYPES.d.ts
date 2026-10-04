/** Field geometry and flight model constants for the PipRoids holotape. */
interface PipRoidsConfig {
  /** First screen row of the play field, below the HUD band. */
  top: number;
  /** Height of the play field in pixels; positions wrap over this span. */
  height: number;
  /** Radians the ship turns per click of the left wheel. */
  turn: number;
  /** Velocity in pixels per frame added by one frame of thrust. */
  accel: number;
  /** Velocity multiplier applied every frame, so the ship coasts to a stop. */
  drag: number;
  /** Ceiling on ship speed in pixels per frame. */
  maxSpeed: number;
  /** Muzzle velocity of a shot in pixels per frame, added to the ship's. */
  shotSpeed: number;
  /** Frames a shot stays alive before it expires. */
  shotLife: number;
  /** Frames the thruster burns for one click of the right wheel. */
  thrustFrames: number;
  /** Frames of blinking invulnerability granted after a respawn. */
  spawnGuard: number;
}
