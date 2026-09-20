/**
 * Types for Vaults & Deathclaws, a character sheet and dice roller for the
 * Fallout tabletop RPG.
 *
 * The holotape is split into scenes so only the active screen is resident:
 * `APP.JS` owns the shared state and loads one scene file at a time from the
 * SD card. Each scene is an uninvoked function expression that receives the
 * shared app object and returns a handle with `remove()`.
 */

/** Scene file names, relative to the holotape's storage directory. */
interface VndScenes {
  /** Dice roller. */
  DICE: string;
  /** Dice roller configuration menu. */
  DICE_MENU: string;
  /** Dice roll animation and result. */
  DICE_ROLL: string;
  /** Character slot editor entry point. */
  EDIT: string;
  /** Delete confirmation for a character slot. */
  EDIT_DELETE: string;
  /** The character sheet form. */
  EDIT_FORM: string;
  /** Editor section menu. */
  EDIT_MENU: string;
  /** Free text entry screen. */
  EDIT_TEXT: string;
  /** Title sequence. */
  INTRO: string;
  /** Character slot list. */
  LIST: string;
}

/**
 * A character sheet.
 *
 * Fields are stored in fixed-length arrays rather than nested objects
 * because a flat array costs far fewer Espruino variable blocks, and the
 * layout has to survive being written to and read back from JSON.
 */
interface VndCharacter {
  /** Free text list of addictions. */
  addictions: string;
  /** Ammunition held; each entry is `[caliber, quantity]`. */
  ammo: Array<Array<string | number>>;
  /** Worn armor name. */
  armor: string;
  /** Caps carried. */
  caps: number;
  /** Current carried weight. */
  carryCur: number;
  /** Maximum carry weight. */
  carryMax: number;
  /** Free text character notes. */
  charNotes: string;
  /** Melee, defense, initiative, poison DR, max HP, current HP. */
  combat: number[];
  /** Up to three companion names. */
  companions: string[];
  /** Free text list of diseases. */
  diseases: string;
  /** Faction reputation notes. */
  factionRep: string;
  /** Gear carried; each entry is `[item, pounds]`. */
  gear: Array<Array<string | number>>;
  /** Worn helmet name. */
  helmet: string;
  /** Character level. */
  level: number;
  /**
   * Body locations; each entry is
   * `[physical DR, energy DR, radiation DR, HP, injured]`.
   */
  locs: number[][];
  /** Luck points remaining. */
  luckPoints: number;
  /** Character name. */
  name: string;
  /** Character origin. */
  origin: string;
  /** Perks taken; each entry is `[name, rank, effect]`. */
  perks: Array<Array<string | number>>;
  /** Free text quest notes. */
  questNotes: string;
  /** Current accumulated radiation. */
  radCur: number;
  /** Settlement reputation notes. */
  settlementRep: string;
  /** Skill ranks, with the tagged flag folded into each value. */
  skills: number[];
  /** S.P.E.C.I.A.L. attributes, in stored order. */
  special: number[];
  /** Weapons; each entry uses the sheet's twelve weapon fields. */
  weapons: Array<Array<string | number>>;
  /** Experience earned. */
  xpEarned: number;
  /** Experience needed for the next level. */
  xpNext: number;
}

/** One screen of the character sheet form. */
interface VndScreenDescriptor {
  /** Which section of the sheet this screen edits. */
  code: string;
  /** Table name for weapons/ammo/gear/perks screens. */
  table?: string | number | VndFieldPath;
  /** Row index within a table screen. */
  index?: number | string | VndFieldPath;
}

/** The in-progress edit of one character slot. */
interface VndEditor {
  /** The working copy, saved only when the user confirms. */
  data: VndCharacter;
  /** Screen descriptors visited so far, for the back button. */
  history: VndScreenDescriptor[];
  /** Character slot number being edited. */
  number: number;
}

/**
 * Dice roller state, kept as a flat array to save variable blocks:
 *
 * `[0]` mode (0 Fallout, 1 combat, 2 generic), `[1]` Fallout dice count,
 * `[2]` combat dice count, `[3]` generic dice count, `[4]` die type,
 * `[5]` target number, `[6]` critical range, `[7]` main result,
 * `[8]` second result, `[9]` result ready flag.
 */
type VndDiceState = number[];

/** The shared application object passed to every scene. */
interface VndApp {
  /** Selected row in the character list, preserved across scenes. */
  listSel: number;
  /** Display height in pixels. */
  H: number;
  /** Display width in pixels. */
  W: number;
  /** Scene file names. */
  scenes: VndScenes;
  /**
   * The character currently being edited. Set by the editor entry scene
   * before any screen that reads it, and dropped again on teardown.
   */
  editor: VndEditor | null;
  /**
   * Dice roller state. Set by the roller before its menu and result scenes
   * run, and dropped again on teardown.
   */
  diceState: VndDiceState | null;
  /** Queues a scene change for the next event loop turn. */
  go: (file: string, params?: object) => void;
  /** Forces a garbage collection pass between scenes. */
  gc: () => void;
}

/** The handle a scene returns so the app can tear it down. */
interface VndScene {
  /** Releases the scene's listeners, timers, and watches. */
  remove: () => void;
}

/** A scene file: an uninvoked function expression the app evaluates. */
type VndSceneFactory = (app: VndApp, params?: object) => VndScene;

/** A queued scene change awaiting the next event loop turn. */
interface VndPendingScene {
  /** Scene file to load. */
  file: string;
  /** Arbitrary parameters handed to the scene. */
  params?: object;
}

/** Parameters handed to the character slot editor. */
interface VndEditorParameters {
  /** Slot number being opened. */
  characterNumber: number;
  /** True when the slot was empty and a fresh sheet is being created. */
  isNewCharacter?: boolean;
}

/** The request `EDIT_DATA.JS` answers: build a character or migrate one. */
interface VndDataRequest {
  /** `"new"` builds defaults, `"load"` migrates a stored sheet. */
  requestType: string;
  /** The stored sheet, when loading. */
  storedCharacter?: VndStoredCharacter | VndCharacter | null;
  /** Which table a blank entry is wanted for, when requestType is "entry". */
  tableName?: string;
}

/** The context a character sheet screen builder receives. */
interface VndScreenContext {
  /** The working copy being edited. */
  characterData: VndCharacter;
  /** Which screen to build. */
  screenDescriptor: VndScreenDescriptor;
}

/** Options for the reusable confirmation dialog. */
interface VndConfirmOptions {
  /** Name shown in the prompt. */
  name?: string;
  /** Called when the user selects DELETE. */
  onConfirm: () => void;
  /** Called when the user selects CANCEL. */
  onCancel: () => void;
}

/** Options for the free text entry screen. */
interface VndTextOptions {
  /** Label shown above the input. */
  label: string;
  /** Maximum characters accepted; defaults to 64. */
  maximumLength?: number;
  /** Path of the character field being edited. */
  path: VndFieldPath;
  /**
   * True for fields that must be written straight to disk, such as the
   * character name shown in the slot list.
   */
  returnToMenu?: boolean;
  /** The form screen to return to once the field is saved. */
  screen?: VndScreenDescriptor;
}

/** Options for the on-screen keyboard. */
interface VndKeyboardOptions {
  /** The shared app object, for screen metrics. */
  app: VndApp;
  /** Description drawn above the text box. */
  description?: string;
  /** Maximum characters accepted; defaults to 64. */
  maximumLength?: number;
  /** Called with the finished text when the user selects Enter. */
  onDone: (text: string) => void;
  /** Text to start editing. */
  text?: string;
}

/** The keyboard handle returned to the caller. */
interface VndKeyboard {
  /** Releases the keyboard's listeners and cursor blink. */
  remove: () => void;
}

/**
 * The combat block as older versions of the app stored it.
 *
 * Sheets saved before the array layout used named fields; `EDIT_DATA.JS`
 * migrates them on load.
 */
/**
 * A sheet as read from JSON before migrate(), including legacy nested shapes.
 * Only EDIT_DATA uses this; the live editor always sees {@link VndCharacter}.
 */
interface VndStoredCharacter {
  addictions?: string;
  ammo?: Array<Array<string | number> | VndLegacyAmmo>;
  armor?: string;
  caps?: number;
  carryCur?: number;
  carryMax?: number;
  charNotes?: string;
  combat?: number[] | VndLegacyCombat;
  companions?: string[];
  diseases?: string;
  factionRep?: string;
  gear?: Array<Array<string | number> | VndLegacyGear>;
  helmet?: string;
  level?: number;
  locs?: Array<number[] | VndLegacyLocation>;
  luckPoints?: number;
  name?: string;
  origin?: string;
  perks?: Array<Array<string | number> | VndLegacyPerk>;
  questNotes?: string;
  radCur?: number;
  settlementRep?: string;
  skills?: Array<number | VndLegacySkill>;
  special?: number[];
  weapons?: Array<Array<string | number> | VndLegacyWeapon>;
  xpEarned?: number;
  xpNext?: number;
}

interface VndLegacyCombat {
  /** Melee bonus. */
  melee?: number;
  /** Defense rating. */
  defense?: number;
  /** Initiative bonus. */
  initiative?: number;
  /** Poison damage resistance. */
  poisonDR?: number;
  /** Maximum hit points. */
  maxHP?: number;
  /** Current hit points. */
  curHP?: number;
}

/**
 * Sheet entries as older versions of the app stored them.
 *
 * Every list on the sheet used to hold objects with named fields; they are
 * arrays now, to save Espruino variable blocks. `EDIT_DATA.JS` converts any
 * stored sheet on load, which is why these shapes still need names.
 */
interface VndLegacySkill {
  /** Skill rank. */
  rank?: number;
  /** Whether the skill was tagged. */
  tag?: boolean;
}

/** A body location as older versions stored it. */
interface VndLegacyLocation {
  /** Physical damage resistance. */
  phys?: number;
  /** Energy damage resistance. */
  en?: number;
  /** Radiation damage resistance. */
  rad?: number;
  /** Hit points. */
  hp?: number;
}

/** A weapon as older versions stored it. */
interface VndLegacyWeapon {
  /** Weapon name. */
  name?: string;
  /** Governing skill. */
  skill?: string;
  /** Target number. */
  tn?: number;
  /** Whether the weapon was tagged. */
  tag?: boolean;
  /** Damage expression. */
  damage?: string;
  /** Special effects. */
  effects?: string;
  /** Damage type. */
  type?: string;
  /** Rate of fire. */
  rate?: string;
  /** Effective range. */
  range?: string;
  /** Weapon qualities. */
  qualities?: string;
  /** Ammunition used. */
  ammo?: string;
  /** Weight in pounds. */
  weight?: number;
}

/** An ammunition entry as older versions stored it. */
interface VndLegacyAmmo {
  /** Caliber name. */
  caliber?: string;
  /** Quantity held. */
  qty?: number;
}

/** A gear entry as older versions stored it. */
interface VndLegacyGear {
  /** Item name. */
  item?: string;
  /** Weight in pounds. */
  lbs?: number;
}

/** A perk as older versions stored it. */
interface VndLegacyPerk {
  /** Perk name. */
  name?: string;
  /** Perk rank. */
  rank?: number;
  /** Perk effect text. */
  effect?: string;
}

/**
 * A path to a field inside a character sheet, e.g. `['name']` or
 * `['weapons', 2, 4]` for the fifth column of the third weapon.
 */
type VndFieldPath = Array<string | number>;

/** Value read or written along a {@link VndFieldPath}. */
type VndFieldValue =
  | string
  | number
  | boolean
  | VndCharacter
  | VndLegacyCombat
  | VndLegacySkill
  | VndLegacyLocation
  | VndLegacyWeapon
  | VndLegacyAmmo
  | VndLegacyGear
  | VndLegacyPerk
  | Array<string | number>
  | number[]
  | string[]
  | Array<
      | Array<string | number>
      | VndLegacyAmmo
      | VndLegacyGear
      | VndLegacyPerk
      | VndLegacyWeapon
    >
  | Array<number | VndLegacySkill>
  | Array<number[] | VndLegacyLocation>
  | undefined;

/**
 * A form button: `[label, action, field, index]`.
 *
 * `action` is one of `back`, `add`, `deleteEntry`, or a screen code to open;
 * `field` and `index` are only present for the table actions.
 */
type VndFormButton = Array<string | number>;

/**
 * A form row.
 *
 * The first element is the row type, which decides how the rest is read:
 * 1 label only, 2 number with min/max/step, 3 checkbox, 4 text, 5 skill
 * (rank plus tag bit). Element 2 is the {@link VndFieldPath} being edited.
 */
type VndFormRow = Array<string | number | VndFieldPath>;

/** A built form screen: `[title, buttons, rows]`. */
type VndFormScreen = [string, VndFormButton[], VndFormRow[]];

/** A screen builder file: takes the context and returns the built screen. */
type VndScreenBuilder = (context: VndScreenContext) => VndFormScreen;
