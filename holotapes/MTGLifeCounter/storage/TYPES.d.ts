/**
 * Types for the Magic: The Gathering life counter.
 *
 * The app tracks life totals for up to several players, plus commander
 * damage, which is recorded per opponent rather than as a single total.
 */

/** Commander damage dealt to a player by one particular opponent. */
interface MtgCommanderDamage {
  /** Index of the opponent dealing the damage. */
  index: number;
  /** Display name of the opponent. */
  fromSource: string;
  /** Damage dealt so far. */
  amount: number;
}

/** One player at the table. */
interface MtgPlayer {
  /** Seat index. */
  index: number;
  /** Display name. */
  name: string;
  /** Current life total. */
  currentLife: number;
  /** Commander damage taken, one entry per opponent. */
  commanderDamageSources: MtgCommanderDamage[];
}

/**
 * One row of a menu.
 *
 * Most menus are plain strings, but the commander damage screen passes the
 * damage records themselves so each row can render and edit its own value.
 */
type MtgMenuOption = string | MtgCommanderDamage;

/** ES5-style constructor for the player record (
ew Player(...)). */
interface MtgPlayerConstructor {
  new (index: number, name: string, currentLife: number): MtgPlayer;
  (this: MtgPlayer, index: number, name: string, currentLife: number): void;
}

/** ES5-style constructor for a commander damage record. */
interface MtgCommanderDamageConstructor {
  new (index: number, sourceName: string): MtgCommanderDamage;
  (this: MtgCommanderDamage, index: number, sourceName: string): void;
}
