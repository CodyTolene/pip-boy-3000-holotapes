/**
 * Types for Book It, a plain text reader for files on the SD card.
 *
 * Books are paged rather than loaded whole: the reader records the byte
 * offset of each page it has reached so it can seek back without holding the
 * file in memory.
 */

/**
 * A row in the file browser.
 *
 * `type` is `back`, `dir`, or `file`; only the last two name a path on the
 * SD card.
 */
interface BookItItem {
  /** Row kind. */
  type: string;
  /** Row label as shown to the user. */
  label: string;
  /** File or folder name, for rows that point at the SD card. */
  name?: string;
}
