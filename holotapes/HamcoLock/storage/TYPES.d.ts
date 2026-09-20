/**
 * Hamco Lock shared types.
 *
 * Scene files are uninvoked function expressions. Keep annotations erasable.
 */

/** LOCK.JSON on-disk config. */
interface HamcoLockConfig {
  m: string;
  p: string;
  f: string;
  configured: boolean;
  mode?: string;
  pin?: string;
  faction?: string;
}

/** Menu navigation helpers snapped from Pip while a lock UI is up. */
interface HamcoLockMenuFn {
  (srcOverride?: string, params?: PipValue): void | number;
  apply(thisArg: PipController, args: IArguments): void | number;
}

/** Mode-button listener restored from Pip['#onmode']. */
type HamcoLockModeListener = (...args: PipValue[]) => void;

/** Active lock UI handle held by the service. */
interface HamcoLockActiveUI {
  remove: () => void;
  id?: string;
  notDefault?: boolean;
  fullscreen?: boolean;
}

/** Persistent service object on global.HAMCO_LOCK_SERVICE. */
interface HamcoLockService {
  remove: () => void;
  lock: () => void;
  settings: () => void;
  startup: () => void;
  closeUI: () => void;
  isBusy: () => boolean;
  mode: () => string;
}

/** Context passed into GRANT.JS after a correct PIN. */
interface HamcoLockGrantCtx {
  video: string;
  videoMs: number;
  finish: () => void;
  resetRoll: () => void;
  clearHud: () => void;
}

/** GRANT module surface. */
interface HamcoLockGrantMod {
  start: () => void;
  abort: () => void;
}

/** Eval factory used across lock scenes. */
interface HamcoLockFactory {
  (...args: PipValue[]): PipValue;
  apply(
    thisArg: undefined | PipController,
    argsArray: PipValue[] | IArguments,
  ): PipValue;
}

/** Done callback from LOCK/SETPIN/SETTINGS back to the service. */
type HamcoLockDone = (action: string) => void;

/** Save callback used by settings/setpin. */
type HamcoLockSave = (cfg: HamcoLockConfig) => boolean;
