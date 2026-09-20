/**
 * Condition Character Switcher shared types.
 *
 * Scene files are uninvoked function expressions. Keep annotations erasable.
 */

/** Limb keys used by condition bars / actor values. */
type CcsLimbKey = 'head' | 'tors' | 'rArm' | 'lArm' | 'rLeg' | 'lLeg';

/** Image/part keys drawn for a limbs-mode character (plus name tag). */
type CcsImageKey =
  | 'head'
  | 'face'
  | 'torso'
  | 'left_arm'
  | 'right_arm'
  | 'left_leg'
  | 'right_leg'
  | 'name';

/** Condition percentages for each limb (0-100). */
interface CcsLimbValues {
  head: number;
  tors: number;
  lArm: number;
  rArm: number;
  lLeg: number;
  rLeg: number;
}

/** Screen position (+ optional end caps) for one condition bar. */
interface CcsBarPosition {
  x: number;
  y: number;
  leftCap?: number | boolean;
  rightCap?: number | boolean;
}

/** Per-limb bar layout; missing keys fall back to stock defaults. */
type CcsBarPositions = Partial<Record<CcsLimbKey, CcsBarPosition>>;

/** Draw position for one body-part image (or the name line). */
interface CcsImagePosition {
  x: number;
  y: number;
}

/** Per-part image layout; missing keys fall back to stock defaults. */
type CcsImagePositions = Record<string, CcsImagePosition | undefined>;

/** Actor-value name map: limb key -> player.getav name. */
type CcsAvMap = Partial<Record<CcsLimbKey, string>> &
  Record<string, string | undefined>;

/** Bounding box used when fitting a preview into the right-hand slot. */
interface CcsBBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Result of fitting a natural-coordinate bbox into the preview slot. */
interface CcsPreviewTransform {
  k: number;
  tx: number;
  ty: number;
}

/** Animated-mode character manifest (JSON beside a .BIN frame pack). */
interface CcsAnimatedCharacter {
  name?: string;
  mode?: string;
  pack: string;
  frameW?: number;
  frameH?: number;
  frameBpp?: number;
  frameSize: number;
  x: number;
  y: number;
  fps?: number;
  frameMs: number;
  stateOffsets: number[];
  stateCounts: number[];
  av: CcsAvMap;
  bars?: CcsBarPositions;
  positions?: CcsImagePositions;
}

/**
 * Limbs-mode character manifest (prefix of a .char file).
 * `_imageTableOffset` is stamped by the reader, not present on disk.
 */
interface CcsLimbsCharacter {
  name?: string;
  mode?: string;
  av?: CcsAvMap;
  bars?: CcsBarPositions;
  positions?: CcsImagePositions;
  _imageTableOffset?: number;
  [key: string]: PipValue;
}

/** Menu / scroller row describing one installable character. */
interface CcsCharacterItem {
  name?: string;
  file?: string;
  path?: string;
  mode?: string;
  [key: string]: PipValue;
}

/** ACTIVE.JSON pointer written when a character is selected. */
interface CcsActivePointer {
  file: string;
}
/** Runtime list of limb keys (for..in / for loops). */
type CcsLimbKeyList = CcsLimbKey[];

/** Image blob returned from heatshrink / file read for drawImage. */
type CcsImageBlob = GraphicsImage;
