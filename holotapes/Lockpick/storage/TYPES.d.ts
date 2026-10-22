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
  /** 1 once Tumbler mode has been unlocked by picking a Very Hard lock. */
  u: number;
  /** Mode chosen on the menu: 0 Classic, 1 Tumbler. */
  m: number;
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

/** What Lockpick hands the lazily loaded Tumbler scene. */
interface LockpickTumblerApi {
  /** Lock level name, shown in the header. */
  name: string;
  /** Number of pin stacks in this lock. */
  pins: number;
  /** How many of those pins are security (spool) pins. */
  spools: number;
  /** Slack either side of a spool pin's shear point, in lift steps. */
  tol: number;
  /** Strain a pick survives under heavy tension before it snaps. */
  hp: number;
  /** True on beginner levels: the binding pin is highlighted. */
  hint: boolean;
  /** Breaks a pick: spends one bobby pin and returns how many are left. */
  snap: () => number;
  /** Leaves the scene: 0 back to the menu, 1 lock opened, 2 out of pins. */
  end: (result: number) => void;
}

/** The loaded Tumbler scene. */
interface LockpickTumblerScene {
  /** Removes the scene's listeners and timers. */
  remove: () => void;
}

/** Shape of TUMBLER.JS once evaluated. */
type LockpickTumblerFactory = (api: LockpickTumblerApi) => LockpickTumblerScene;

/** The part of a game-data record that says where its picture is. */
interface ArtRecord {
  /** Offset of the picture in the matching .IMG file. */
  io?: number;
  /** Length of the picture in bytes. */
  il?: number;
}

/** Adds a game's rows to STATS > GENERAL (see STATS_HOOK.ts). */
type StatsRowFn = (o: Record<string, PipValue>) => void;

/** The fields the stats hook reads from a game's save. */
interface StatsSave {
  /** Best score, round, field or level. */
  b?: number;
  /** Quickdraw duels won. */
  w?: number;
  /** Wasteland Walker all-time steps. */
  t?: number;
  /** Atomic Slots biggest win. */
  best?: number;
  /** Telegraph mastery string, one digit per character. */
  s?: string;
}
