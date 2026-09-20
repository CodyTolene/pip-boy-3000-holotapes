/**
 * Player state and inventory data APIs, per the official RobCo Industries
 * Player and Data Files documentation for the Pip-Boy 3000.
 *
 * Most holotapes that need to grant items should use the `player.additem()`
 * helpers; the DataFile/InvFile classes are for code that reads or edits
 * the underlying .DAT / .INV files directly.
 */

/** Attributes returned by {@link PlayerState.getinfo}. */
interface PlayerInfo {
  /** Player name. */
  name: string;
  /** Current level. */
  level: number;
  /** XP needed to reach the next level. */
  xpNext: number;
  /** Maximum hit points. */
  maxHP: number;
  /** Maximum action points. */
  maxAP: number;
  /** Maximum carry weight. */
  maxWg: number;
  /** Current hit points (sum of limb conditions). */
  hp: number;
  /** Current carry weight (weight of the inventory). */
  wg: number;
  /** Any other attribute values that have been set on the player. */
  [attribute: string]: PipValue;
}

/** The global player-state API. */
interface PlayerState {
  /**
   * Nested PLAYER.JSON record some holotapes read for display name
   * (player.player.name). Optional — not every firmware build exposes it.
   */
  player?: { name?: string; [key: string]: PipValue };

  /**
   * Flushes modified persistent attributes to disk. Call from an app's
   * `remove()` rather than repeatedly, to avoid thrashing the SD card.
   */
  sync(): void;

  /** Returns all player attributes currently in state. */
  getinfo(): PlayerInfo;

  /**
   * Resets all inventories to their defaults for both the Fallout 3 and
   * New Vegas game modes.
   */
  resetinventory(): void;

  /**
   * Recalculates the player's carried weight from the inventories. Rarely
   * needed directly.
   */
  calculateInvWeight(): void;

  /**
   * Returns the value of a player attribute by name (mirrors the game's
   * `getav` console command), e.g. `player.getav('karma')`.
   */
  getav(av: string): PipValue;

  /**
   * Sets a player attribute value (mirrors the game's `setav` command).
   *
   * @param persist Non-standard extension: when `true` the value survives
   * a reboot once {@link PlayerState.sync} runs. Avoid persisting unless
   * the value genuinely needs to outlive the session.
   */
  setav(av: string, value: PipValue, persist?: boolean): void;

  /**
   * Adds a perk by form ID (hex values match game conventions, e.g.
   * `0x00031DC4` for "Computer Whiz"). Valid IDs depend on the current
   * game mode; the perk is written to that mode's PERKS.JSON.
   */
  addperk(formId: number): void;

  /** Removes a perk by form ID (the inverse of {@link PlayerState.addperk}). */
  removeperk(formId: number): void;

  /** Advances the player level by one. */
  advlevel(): void;

  /** Sets the player's level. */
  setlevel(level: number): void;

  /**
   * Adds items to the inventory by form ID and count (e.g.
   * `player.additem(0x0001519E, 6)` for six Nuka-Colas). Valid form IDs
   * depend on the current game mode.
   */
  additem(formId: number, count: number): void;

  /**
   * Like {@link PlayerState.additem} but also sets the items' condition.
   *
   * @param condition Condition percentage, 0-100.
   */
  additemhealthpercent(formId: number, count: number, condition: number): void;

  /**
   * Removes items from the inventory by form ID and count.
   * Not yet implemented in current firmware.
   */
  removeitem(formId: number, count: number): void;

  /**
   * Equips an item by form ID.
   * Not yet implemented in current firmware.
   */
  equipitem(formId: number): void;
}

/** The global player-state API object. */
declare const player: PlayerState;

/** A single entry in an inventory file. */
interface InvItem {
  /** The item's form ID. */
  id: number;
  /** How many of the item are held. */
  cnt: number;
  /** Condition percentage, 0-100. */
  cnd: number;
  /** Flags byte (uint8); no flags are currently defined. */
  fl: number;
}

/** Fields accepted when adding or updating an inventory entry. */
interface InvItemUpdate {
  /** The item's form ID (required when adding). */
  id?: number;
  /** Item count (defaults to 1 when adding). */
  cnt?: number;
  /** Condition percentage 0-100 (defaults to 100 when adding). */
  cnd?: number;
  /** Flags byte (defaults to 0 when adding). */
  fl?: number;
}

/** Options for the {@link InvFile} constructor. */
interface InvFileOptions {
  /** Called with the InvFile instance once the file has loaded. */
  onLoaded?: (inv: InvFile) => void;
  /**
   * Form IDs (typically `data.ids` from a {@link DataFile}) defining the
   * sort order of the inventory.
   */
  idOrder?: Uint32Array;
}

/**
 * Parses a binary .DAT file holding game item data.
 *
 * @example
 * const data = new DataFile("/DATA/F3/MISC.DAT");
 * const cola = data.getId(0x0001519E);
 * data.close();
 */
declare class DataFile {
  /** Opens a data file from disk. */
  public constructor(path: string);

  /** All form IDs present in the data file. */
  public ids: Uint32Array;

  /** Looks up a record by form ID and returns its data as an object. */
  public getId(formId: number): Record<string, PipValue>;

  /** Safely closes the open file handle. */
  public close(): void;
}

/**
 * Reads and writes a player inventory (.INV) file: which items are held,
 * their counts, and their condition.
 *
 * @example
 * const inv = new InvFile("/INV/F3/MISC.INV", { idOrder: data.ids });
 * const first = inv.get(0);
 * inv.set(0, { cnt: first.cnt + 1 });
 * inv.sync();
 */
declare class InvFile {
  /** Opens (and reads) an inventory file from disk. */
  public constructor(path: string, options?: InvFileOptions);

  /**
   * Re-reads the file from disk, invoking the `onLoaded` callback if one
   * was configured. Called automatically by the constructor.
   */
  public refreshItems(): void;

  /** Returns all form IDs present in this inventory. */
  public ids(): number[];

  /** Returns the inventory entry at index `i` (not form ID). */
  public get(i: number): InvItem;

  /**
   * Updates fields of the existing entry at index `i` (e.g. `{ cnt: 3 }`).
   * Does not add new items; use {@link InvFile.add} for that.
   */
  public set(i: number, data: InvItemUpdate): void;

  /**
   * Appends a new entry. `data.id` is required; `cnt`, `cnd`, and `fl`
   * default to 1, 100, and 0.
   */
  public add(data: InvItemUpdate & { id: number }): void;

  /** Removes the entry at index `i`. */
  public remove(i: number): void;

  /** Returns the index of the entry with the given form ID, or -1. */
  public indexOf(formId: number): number;

  /**
   * Writes changes back to disk (no-op when nothing changed). Call from
   * the app's `remove()` or as infrequently as possible.
   */
  public sync(): void;
}
