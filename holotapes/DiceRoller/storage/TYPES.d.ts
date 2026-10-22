/** Scenes */
type DiceRollerFile = 'DICE_MENU.JS' | 'DICE_ROLL.JS';

/** State */
interface DiceRollerApp {
  /** Display width in pixels. */
  W: number;
  /** Display height in pixels. */
  H: number;
  /** Face counts, indexed by type. */
  faces: Uint8Array;
  /** Index of the selected die. */
  type: number;
  /** Number of dice, 1 through 10. */
  count: number;
  /** Modifier applied once to the sum, -99 through 99. */
  modifier: number;
  /** Minimum for success. Zero disables the target. */
  target: number;
  /** Minimum for critical. Zero disables criticals. */
  critical: number;
  /** Last natural face of each die, using the first count entries. */
  values: Uint8Array;
  /** Last sum w/ the modifier. */
  total: number;
  /** Number of dice that met critical. */
  criticals: number;
  /** Are dice settled. */
  ready: boolean;
  /** Queue scene change (next tick). */
  go: (file: DiceRollerFile) => void;
}

interface DiceRollerScene {
  /** Cleanup. */
  remove: () => void;
}

type DiceRollerSceneFactory = (app: DiceRollerApp) => DiceRollerScene;

/** Six floats per die: x, y, natural face, radius, x speed, y speed. */
type DiceRollerBuffer = Float32Array;
