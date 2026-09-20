/**
 * Types for Chem Wars.
 *
 * The game is a trading run across the wasteland: buy and sell chems, dodge
 * raiders, and pay off a debt before the days run out. A run in progress is
 * written to the SD card so it can be resumed after the holotape is closed.
 */

/** A saved run, as written to and read back from the save file. */
interface ChemWarsSave {
  /** Day number the run is on. */
  day: number;
  /** Caps carried. */
  caps: number;
  /** Caps in the bank. */
  bank: number;
  /** Outstanding debt. */
  debt: number;
  /** Index of the current location. */
  loc: number;
  /** Carry capacity. */
  pack: number;
  /** Current hit points. */
  hp: number;
  /** Whether a gun is owned, stored as 0 or 1. */
  gun: number;
  /** Active status effect flags. */
  fx: number;
  /** Addiction level. */
  addict: number;
  /** Toxicity level. */
  tox: number;
  /** Quantity held of each chem, indexed by chem. */
  inv: number[];
  /** Current price of each chem, indexed by chem. */
  prices: number[];
}

/** The save file's top-level contents. */
interface ChemWarsSaveFile {
  /** Best score achieved across all runs. */
  best: number;
  /** The run in progress, if there is one. */
  sv?: ChemWarsSave;
}
