/**
 * Types for PipVideoController.
 *
 * The holotape does not play video itself: it lists titles and prints a
 * command over the USB serial link, so companion software on the connected
 * computer starts playback there.
 */

/** One entry in the playlist the user fills in at the top of the app. */
interface PipVideoControllerEntry {
  /** Title shown in the list on the Pip-Boy. */
  name: string;
  /** Path sent to the companion software on the computer. */
  path: string;
}
