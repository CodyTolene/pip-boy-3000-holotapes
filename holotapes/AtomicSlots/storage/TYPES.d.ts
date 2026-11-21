/** Atomic Slots progress, stored at HOLO/ATOMIC_SLOTS/SAVE.JSON. */
interface AtomicSlotsSave {
  /** Caps in the player's wallet. */
  caps: number;
  /** Index into the bet table the player last used. */
  bet: number;
  /** Biggest single win so far, in caps. */
  best: number;
}

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
