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
  /** MISC rows for holotapes: the file the row starts. */
  exec?: string;
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

/** The tapes in the case, shared by APP.ts and OPTIONS.ts. */
interface CaseState {
  /** The .info file names, in list order. */
  files: string[];
  /** One byte per tape: 1 hidden from MISC, 2 favourite. */
  flags: Uint8Array;
  /** True once something changed that ITEMS > MISC shows next time. */
  changed: boolean;
}

/** What APP.ts hands the options file (OPTIONS.ts). */
interface CaseApi {
  s: CaseState;
  /** Index of the tape the options are for. */
  tape: number;
  /** Left edge of the right-hand panel. */
  px: number;
  /** Width of the list. */
  listW: number;
  nameOf(k: number): string;
  reorder(rank: (k: number) => number | string): void;
  setHidden(k: number, hide: boolean): void;
  saveLists(): void;
  saveOrder(): void;
  launch(k: number): void;
  clearPanel(): void;
  openList(start: number): PipScroller;
  /** Back to the list on the named tape; top is the first row shown, or -1. */
  close(name: string, top: number): void;
}

/** The loaded options file. */
interface CaseOptions {
  remove(): void;
}

/** OPTIONS.JS evaluates to one of these. */
type CaseOptionsFactory = (api: CaseApi) => CaseOptions;
