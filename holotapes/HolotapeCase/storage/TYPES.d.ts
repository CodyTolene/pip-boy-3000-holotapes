/** One holotape found in an .info registration file. */
interface CaseTape {
  /** Display name from the .info file. */
  n: string;
  /** Script path to launch, e.g. HOLO/LOCKPICK/APP.JS. */
  s: string;
  /** Icon path, or an empty string when there is none. */
  i: string;
  /** The .info file's own name. */
  f: string;
  /** 1 when hidden from ITEMS > MISC. */
  h: number;
  /** 1 when marked as a favourite. */
  v: number;
}

/** Fields read from a holotape's .info registration file. */
interface CaseInfo {
  /** Holotape id. */
  id?: string;
  /** Display name. */
  name?: string;
  /** Script to launch. */
  src?: string;
  /** Icon image path. */
  icon?: string;
}

/** The firmware's MISC screen: JS/MISC.JS evaluates to one of these. */
type MiscScreen = (params: object) => HolotapeApp;

/** One row of the firmware's scrolling list. */
interface PipScrollerItem {
  /** Row text. */
  txt: string;
  /** Draws the filled box the firmware uses for equipped items. */
  activ?: boolean;
  /** Holotape Case: index of the tape in its file list. */
  k?: number;
}

/** Options for the firmware's scrolling list (as used by JS/MISC.JS). */
interface PipScrollerOptions {
  /** Number of rows. */
  itemCount: number;
  /** List width in pixels. */
  width?: number;
  /** Show the equipped-state boxes. */
  hasEquipStates?: boolean;
  /** Row to start on. */
  scrollStart?: number;
  /** Returns a row; called only for rows that come on screen. */
  getItem: (i: number) => PipScrollerItem;
  /** Draws the right-hand panel for the highlighted row. */
  render?: (item: PipScrollerItem) => void;
  /** Left wheel press on a row. */
  onClick?: (i: number) => void;
  /** Left wheel hold on a row. */
  onLongClick?: (i: number) => void;
}

/** The list widget returned by Pip.createScroller. */
interface PipScroller {
  /** Highlighted row. */
  selectedIndex: number;
  /** First row on screen. */
  scrollIndex: number;
  /** Pixel offset of the first row. */
  scrollY: number;
  /** Sets the row count and forgets the rows already drawn. */
  updateItemCount(n: number): void;
  /** Redraws the list; listOnly skips the right-hand panel. */
  render(opts?: { listOnly?: boolean }): void;
  /** Stops listening to the left wheel. */
  remove(): void;
}

interface PipController {
  /** The firmware's scrolling list, the one ITEMS > MISC uses. */
  createScroller(options: PipScrollerOptions): PipScroller;
}
