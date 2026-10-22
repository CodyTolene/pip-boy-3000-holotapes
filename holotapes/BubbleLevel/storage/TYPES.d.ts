/** Saved calibration for Bubble Level, stored at HOLO/BUBBLE_LEVEL/CAL.JSON. */
interface BubbleLevelCal {
  /**
   * Zero offsets in degrees: [surface X, surface Y, edge X, edge Y]. The edge
   * Y slot is unused but kept so both modes share one layout.
   */
  z: number[];
  /** Index into the full-scale range table the user last picked. */
  r: number;
}
