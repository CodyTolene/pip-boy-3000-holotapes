/** One saved journal entry, stored in USER/MYQUESTS.JSON. */
interface JournalEntry {
  /** Unique id, one more than the highest existing id. */
  id: number;
  /** Tab the entry belongs to: 0 quest, 1 note. */
  cat: number;
  /** Title typed on the T9 keyboard. */
  title: string;
  /** Optional body text typed on the T9 keyboard. */
  body: string;
  /** Quests only: 0 active, 1 done. */
  status: number;
  /**
   * Quests only: the objectives, like a game quest's. Older entries have
   * none and use body as their one objective.
   */
  obj?: string[];
  /** Quests only: 1 for each objective that is done, in obj order. */
  od?: number[];
  /** Creation time, in seconds since the epoch. */
  created: number;
}

/**
 * Entry being written, shared between the journal and the T9 keyboard
 * through USER/QUEST_DRAFT.JSON while they hand off to each other.
 */
interface JournalDraft {
  /** Tab the new entry will go in: 0 quest, 1 note. */
  cat: number;
  /** Title, empty until the keyboard has collected it. */
  title: string;
  /** Body text, possibly empty. */
  body: string;
  /** True once the keyboard has finished the body step. */
  bodyDone: boolean;
  /** Set when adding an objective: the id of the quest it goes on. */
  addTo?: number;
  /** With addTo: the objective being changed instead of a new one. */
  objIdx?: number;
  /** Set when changing a saved entry: its id. */
  editId?: number;
  /** Text the keyboard starts with, for changing existing text. */
  text?: string;
  /** True when only the title is being typed: the body is kept as it is. */
  keep?: boolean;
}

/** A row on the journal list screen. */
interface JournalListLabel {
  /** Text drawn for the row. */
  text: string;
  /** True for the "+ NEW" row, drawn dimmer than real entries. */
  special: boolean;
}

/** One key on the T9 keypad grid. */
interface T9KeyItem {
  /** What the key does: group, punct, backspace, delword, left, right, done, spell or space. */
  type: string;
  /** Digit a group key adds to the key sequence. */
  digit?: number;
  /** Large digit drawn on a group key. */
  digitLabel?: string;
  /** Small letters drawn on a group key. */
  sub?: string;
  /** Text drawn on a non-digit key. */
  label?: string;
  /** Grid row, 0 at the top. */
  row: number;
  /** Grid column, 0 at the left. */
  col: number;
}

/** A word already placed in the text being typed. */
interface T9Word {
  /** The word as shown. */
  text: string;
  /** Digit sequence it came from, or null for a spelled word. */
  key: string | null;
  /** Punctuation added with the 1 key (. , ? or !). */
  p?: string;
}

/** What the T9 word list on the SD card has for one key sequence. */
interface T9Lookup {
  /** Words for exactly this sequence, most common first, or null. */
  words: string[] | null;
  /** With no exact match: the start of the first longer word that fits. */
  prefix: string;
  /** True when HOLO/MY_JOURNAL/T9DICT.TXT could not be read. */
  missing: boolean;
}

/** One record the firmware's DataFile returns for a quest or note. */
interface DataRecord {
  /** Name shown in the list. */
  txt: string;
  /** Notes only: 1 text, 2 image, 3 holotape recording. */
  t?: number;
  /** Notes only: body text. */
  desc?: string;
  /** Quests only: objectives, shown as bullet points. */
  obj?: string[];
}

/** The firmware's reader for DATA/<F3|NV>/*.DAT files (defined in FW.JS). */
declare class FirmwareDataFile {
  public constructor(path: string);
  /** Record ids, in list order. */
  public ids: Uint32Array;
  /** The open .DAT file. */
  public file: EspruinoFile;
  /** Byte offset of the first record. */
  public end: number;
  /** Length of every record, in bytes. */
  public len: number;
  /** The record with this id. */
  public getId(id: number): DataRecord;
  /** Closes the file. */
  public close(): void;
}

/** Global DataFile class; the journal patch replaces it with a subclass. */
declare let DataFile: typeof FirmwareDataFile;

/** The part of a game-data record that says where its picture is. */
interface ArtRecord {
  /** Offset of the picture in the matching .IMG file. */
  io?: number;
  /** Length of the picture in bytes. */
  il?: number;
}

/** What the journal hands to an open entry (ENTRY.ts). */
interface JournalApi {
  /** Height of a list row. */
  rowH: number;
  /** Objectives per quest. */
  maxObj: number;
  /** A finished draft back from the keyboard, while the entry opens. */
  draft: JournalDraft | null;
  /** All entries, quests and notes. */
  quests(): JournalEntry[];
  /** Saves the entries. */
  save(): void;
  /** Adds and saves a new entry. */
  add(cat: number, title: string, body: string): void;
  /** Removes the draft file. */
  clearDraft(): void;
  /** Saves a draft and hands over to the keyboard. */
  toKeyboard(d: JournalDraft): void;
  /** Closes the entry; tab is the tab to show, or -1 to stay. */
  done(tab: number): void;
  header(title: string, info: string): void;
  fit(t: string, w: number): string;
  catLabel(c: number): string;
  statusLabel(q: JournalEntry): string;
}

/** An open entry's screen. */
interface JournalScreen {
  /** True for the CONTROLS page, where a hold goes back like a press. */
  help: boolean;
  draw(): void;
  /** right is true for the right wheel. */
  knob(dir: number, right: boolean): void;
  click(): void;
  remove(): void;
}

/** What ENTRY.JS evaluates to. */
type JournalScreenFactory = (
  api: JournalApi,
  start: number,
) => JournalScreen | null;

/** Hand-off between the DATA hook's wrapper and its work mode (DATA_HOOK.ts). */
interface JournalReq {
  /** The real QUESTS.DAT or NOTES.DAT, open for reading. */
  f: EspruinoFile;
  /** True for QUESTS.DAT. */
  q: boolean;
  /** The view with the journal in front, when there is anything to add. */
  r?: EspruinoFile;
  /** What went wrong, if anything. */
  e?: string;
}
/** Set only while the DATA hook runs in work mode. */
declare let RM_DATA: JournalReq | undefined;
