/**
 * Types for Access Terminal, the Fallout password hacking minigame.
 *
 * The screen is a wall of junk characters with candidate passwords hidden in
 * it. Bracket pairs inside the junk are "spans": selecting one either
 * restores an attempt or removes a wrong password.
 */

/** A bracket pair the player can select for a bonus. */
interface AccessTerminalSpan {
  /** Row the pair sits on. */
  row: number;
  /** Column of the opening bracket. */
  start: number;
  /** Column of the closing bracket. */
  end: number;
  /** Stable identity, so a used span stays used across rescans. */
  key: string;
  /** True once the player has taken this span's bonus. */
  consumed: boolean;
}
