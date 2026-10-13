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
