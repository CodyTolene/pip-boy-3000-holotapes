/**
 * Holotape app conventions for the Pip-Boy 3000.
 *
 * A holotape source file is a single anonymous function expression that is
 * NOT invoked; the Pip-Boy OS evaluates the file and calls the function
 * itself, storing the returned object as `Pip.CURRENT`:
 *
 * ```ts
 * (function (): HolotapeApp {
 *   // state, then ALL function declarations, then init code
 *   return {
 *     id: 'MYAPP',
 *     notDefault: true,
 *     fullscreen: true,
 *     remove: function () {
 *       // clear every interval/timeout/watch, remove every listener,
 *       // stop audio/video this app started
 *     },
 *   };
 * });
 * ```
 *
 * Espruino does not hoist function declarations, so initialization code
 * must come after every function it references.
 */

/** The object a holotape's IIFE must return to the Pip-Boy OS. */
interface HolotapeApp {
  /** Uppercase alphanumeric app id (no spaces or hyphens). */
  id: string;
  /**
   * Cleanup called when the user navigates away. Must remove every
   * listener, clear every interval/timeout/watch, and stop any audio or
   * video the app started. Must never call `load()` or `E.reboot()`.
   */
  remove: () => void;
  /**
   * When `true`, pressing any mode button closes the app and returns to
   * the original firmware page. Apps should set this.
   */
  notDefault?: boolean;
  /** When `true`, the OS does not draw its header/footer over the app. */
  fullscreen?: boolean;
}

/**
 * A lazily loaded scene/module file. Such files are stored on the SD card
 * and loaded on demand to keep resident RAM low:
 *
 * ```ts
 * const mod = (
 *   eval(fs.readFileSync('HOLO/MYAPP/SETTINGS.JS')) as HolotapeSceneFactory
 * )(api);
 * // later: mod.remove(); process.memory(true);
 * ```
 *
 * Like apps, each module file is a single uninvoked function expression.
 */
type HolotapeSceneFactory<
  TApi = PipValue,
  TScene extends { remove: () => void } = { remove: () => void },
> = (api: TApi) => TScene;
