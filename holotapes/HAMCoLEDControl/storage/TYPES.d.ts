/**
 * HAMCo LED Control shared types.
 *
 * APP.ts is the settings UI; SESSION.ts is eval-loaded so the effect can
 * outlive the holotape. The live session sits on global.HAM_LED_SESSION.
 */

/** Persisted / runtime LED settings (0/1 flags, indices into FX/COL/SPD). */
interface HamLedState {
  enabled: number;
  fx: number;
  ca: number;
  cb: number;
  spd: number;
  level: number;
}

/** Live session object returned by SESSION.ts / start(). */
interface HamLedService {
  /** Protocol version; APP adopts only when v === 9. */
  v: number;
  /** Current cleaned settings. */
  state: HamLedState;
  /** Apply new settings (restarts animation when enabled). */
  apply(x: HamLedState | object): HamLedService;
  /** Tear down and optionally restore firmware amber LEDs. */
  restoreNative(light?: boolean | number): void;
  /** Alias used by remove paths. */
  remove(passive?: boolean): void;
}

declare var HAM_LED_SESSION: HamLedService | undefined;
