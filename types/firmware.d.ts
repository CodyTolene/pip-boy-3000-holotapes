/**
 * Firmware-level globals that are not part of the documented Pip API.
 *
 * These exist on the device because the Pip-Boy OS is itself written in
 * JavaScript, so its own helpers are visible to anything the interpreter
 * evaluates. Custom-firmware patch files (installed to `CFW/` and eval'd by
 * the bootloader on every boot) use them to extend built-in screens.
 *
 * Treat everything here as less stable than the Pip API: it can change
 * between firmware releases, so guard for its presence before use.
 */

/**
 * Reads a JSON settings file, filling in any missing keys from `defaults`.
 *
 * The firmware's own screens call this to load their settings, which is what
 * makes it a useful hook point: replacing the global lets a patch add rows to
 * a built-in screen (for example a game's high score on STATS > GENERAL)
 * without replacing the screen's own script.
 *
 * @param file Path to the JSON file on the SD card.
 * @param defaults Values to fall back to for keys the file does not set.
 */
declare function loadJSONWithDefaults(
  file: string,
  defaults: Record<string, PipValue>,
): Record<string, PipValue>;

/**
 * The shared registry custom-firmware patches use to co-operate.
 *
 * The first patch to load installs the hook and creates the registry; later
 * patches find it already present and just add their own entry, so several
 * games can contribute rows to the same firmware screen.
 */
interface CfwRegistry {
  /**
   * High score sources, keyed by the label to show. Each value is the path
   * of the JSON file holding that game's scores.
   */
  SCORES?: Record<string, string>;
}

/**
 * Body/condition layout rectangle used by the stock STATUS CND screen.
 * Holotapes that mirror that layout (e.g. character switcher previews) read
 * BR.y / BR.h so they line up with the OS chrome.
 */
declare const BR: { x: number; y: number; w: number; h: number };

/**
 * True when the device is running in a Fallout: New Vegas–style profile
 * (higher level cap). Stock CND uses this for the Level N display.
 */
declare const NV: number | boolean | undefined;
