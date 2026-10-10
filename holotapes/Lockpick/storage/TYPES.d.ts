/** Lockpick progress, stored at HOLO/LOCKPICK/SAVE.JSON. */
interface LockpickSave {
  /** Bobby pins left in the player's inventory. */
  p: number;
  /** Locks picked cleanly in the current run (forced locks do not count). */
  n: number;
  /** Score for the current run. */
  s: number;
  /** Best run score so far. */
  b: number;
  /** Index of the lock level last chosen on the menu. */
  d: number;
}

/** Per-difficulty tuning for one lock level. */
interface LockpickLevel {
  /** Name shown on the menu and HUD. */
  name: string;
  /** Half-width of the sweet spot, in degrees of pin angle. */
  tol: number;
  /** Strain clicks a bobby pin survives before it snaps. */
  hp: number;
  /** Chance out of 100 that forcing the lock works. */
  force: number;
  /** Score for picking a lock of this level. */
  pts: number;
  /** Bobby pins found when picking a lock of this level. */
  win: number;
}
