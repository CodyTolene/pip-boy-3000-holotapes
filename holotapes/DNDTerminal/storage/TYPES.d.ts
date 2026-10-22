/** Default fields */
interface DndFields {
  /** Character name, up to 40 characters. */
  name: string;
  /** Character level, 1 through 20. */
  level: number;
  /** Hit points, 0 through maximum HP. */
  hp: number;
  /** Maximum hit points, 1 through 9999. */
  maxHp: number;
  /** Temporary hit points, 0 through 9999. */
  tempHp: number;
  /** Armor class, 0 through 99. */
  ac: number;
  /** Six saving-throw proficiency bits in STR/DEX/CON/INT/WIS/CHA order. */
  saves: number;
  /** Eighteen skill proficiency bits in the sheet's alphabetical order. */
  skills: number;
  /** Free text conditions, up to 120 characters. */
  conditions: string;
  /** Free text equipment, up to 240 characters. */
  equipment: string;
  /** Free text notes, up to 240 characters. */
  notes: string;
}

/** Character (kept while swapping scenes). */
interface DndCharacter extends DndFields {
  /** Six ability scores, 1 through 30. */
  scores: Uint8Array;
}

/** Versioned JSON record; scores are ordinary JSON arrays on disk. */
interface DndDiskCharacter extends DndFields {
  /**
   * Save schema version
   * Only version 1 is supported, might remove this in future releases depending
   */
  version: number;
  /** The six scores go here (serialized). */
  scores: number[];
}

/** List. */
interface DndListEntry {
  /** Save slot, from 1 through 999. */
  slot: number;
  /** Character name. */
  name: string;
}

/** Scenes. */
type DndFile =
  | 'LIST.JS'
  | 'SHEET.JS'
  | 'TEXT.JS'
  | 'KEYBOARD.JS'
  | 'CONFIRM.JS'
  | 'DICE_MENU.JS'
  | 'DICE_ROLL.JS';

/** Field names. */
type DndTextField = 'name' | 'conditions' | 'equipment' | 'notes';

/** State and callback defs */
interface DndApp {
  /** Current character, null on the list. */
  character: DndCharacter | null;
  /** Current or new save slot, from 1 through 99. */
  slot: number;
  /** If character has unsaved edits. */
  dirty: boolean;
  /** First visible line of the sheet list, kept to restore the scroll position. */
  page: number;
  /** Current sheet selection: 0 back, 1 save, 2+ list line plus 2. */
  row: number;
  /** Field being edited in the keyboard. */
  editField: DndTextField;
  /** Pending confirmation purpose. */
  confirm: 'delete' | 'discard';
  /** List selection: 0 add, 1 roll dice, 2+ characters. Kept between scenes. */
  listRow: number;
  /** Current visible message. */
  message: string;
  /** Dice roller state, only kept while the dice scenes are open. */
  dice: DndDice | null;
  /** Scene change. */
  go: (file: DndFile) => void;
  /** Shared screen title and footer. */
  frame: (title: string, footer: string) => void;
  /** Saved JSON slots, showing unreadable files without overwriting them. */
  list: () => DndListEntry[];
  /** Create a new unsaved character.. in the first available slot. */
  create: () => boolean;
  /** Read and verify a character, or report error. */
  open: (slot: number) => boolean;
  /** Write the character directly to its JSON slot. */
  save: () => boolean;
  /** Remove the selected character. */
  erase: () => boolean;
}

/** SRD 5.1 dice roller settings and last result. */
interface DndDice {
  /** 0 is a d20 roll, 1 is a damage roll. */
  mode: number;
  /** d20 roll: 0 ability check, 1 saving throw, 2 skill check, 3 attack roll. */
  kind: number;
  /** Ability index (STR/DEX/CON/INT/WIS/CHA), or skill index for skill checks. */
  index: number;
  /** Attack rolls add the proficiency bonus when 1. */
  proficient: number;
  /** -1 disadvantage, 0 normal, 1 advantage. */
  advantage: number;
  /** Extra situational bonus for d20 rolls, -20 through 20. */
  bonus: number;
  /** DC or target AC, 0 turns pass and fail off. */
  dc: number;
  /** Damage die faces: d4, d6, d8, d10, d12, d20 and d100. */
  faces: Uint8Array;
  /** Index of the selected damage die in faces. */
  die: number;
  /** Damage dice before a critical hit, 1 through 10. */
  count: number;
  /** Damage modifier, -20 through 20. */
  damageBonus: number;
  /** A critical hit doubles the damage dice when 1. */
  crit: number;
  /** Total modifier for the next roll, derived from the character. */
  modifier: number;
  /** Roll title shown on the roll screen. */
  label: string;
  /** Natural faces of the last roll, up to 20 dice. */
  values: Uint8Array;
  /** Number of dice in the last roll. */
  rolled: number;
  /** Natural d20 kept after advantage or disadvantage, 0 for damage. */
  natural: number;
  /** Last total including the modifier. */
  total: number;
  /** Natural 20 or 1, critical, and pass or fail text for the last roll. */
  outcome: string;
  /** The last roll is settled and scored. */
  ready: boolean;
  /** Entry point: 0 list, 1 sheet. Cleared with the state on exit. */
  origin: number;
}

/** Six floats per die: x, y, natural face, radius, x speed, y speed. */
type DndDiceBuffer = Float32Array;

interface DndScene {
  /** Cleanup. */
  remove: () => void;
}

type DndSceneFactory = (app: DndApp) => DndScene;
