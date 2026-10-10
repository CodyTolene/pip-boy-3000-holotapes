/** Atomic Slots progress, stored at HOLO/ATOMIC_SLOTS/SAVE.JSON. */
interface AtomicSlotsSave {
  /** Caps in the player's wallet. */
  caps: number;
  /** Index into the bet table the player last used. */
  bet: number;
  /** Biggest single win so far, in caps. */
  best: number;
}
