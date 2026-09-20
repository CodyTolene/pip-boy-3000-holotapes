/**
 * PipCo Idle Frameworks shared types.
 *
 * Scene files are uninvoked function expressions. Keep annotations erasable.
 */

/** CONFIG.JSON shape used by the settings UI (APP.ts). */
interface PipCoIdleAppConfig {
  enabled: number;
  mesEnabled: number;
  mesFile: string;
}

/** CONFIG.JSON shape as read by the background SERVICE. */
interface PipCoIdleServiceConfig {
  enabled: number;
  providerEnabled: number;
  providerFile: string;
}

/** Packed 2bpp image object drawn with h.drawImage. */
interface PipCoIdleImage {
  width: number;
  height: number;
  bpp: number;
  transparent: number;
  buffer: string;
}

/** Active screensaver / provider renderer handle. */
interface PipCoIdleRenderer {
  stop?: () => void;
}

/** Ignore/log helper passed into renderer factories. */
type PipCoIdleIgnoreError = (message: string) => void;

/**
 * Eval'd scene factory. Many loaders zero the variable after call for GC,
 * so call sites often use `| 0`.
 */
interface PipCoIdleFactory {
  (...args: PipValue[]): PipValue;
  apply(thisArg: undefined, argsArray: PipValue[]): PipValue;
}

/** Background idle service installed on `global.__PipCoIdleService`. */
interface PipCoIdleService {
  version: string;
  enabled: number;
  providerEnabled: number;
  providerFile: string;
  last: number;
  active: number;
  preview: number;
  runner: number;
  run: PipCoIdleRenderer | 0 | undefined;
  claimInputs?: (() => void) | undefined;
  stop: (returnToMenu: number) => void;
  play: (preview?: number | boolean) => void;
  playProvider: (preview?: number | boolean, fileName?: string) => void;
  destroy: () => void;
}

/** Wake watcher installed on `global.__PipCoIdleWake`. */
interface PipCoIdleWake {
  destroy: () => void;
}

/** Mesmetron module surface used by MESIDLE. */
interface PipCoIdleMesmetronModule {
  init: (mode: number) => void;
  draw: (g: Graphics) => void;
  remove?: () => void;
}
