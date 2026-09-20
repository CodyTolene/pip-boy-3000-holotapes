/**
 * PipCalendar shared types.
 */

/** Currently selected calendar day (month is 0-11). */
interface PipCalSelectedDate {
  year: number;
  month: number;
  day: number;
}

/** One month's notes keyed by day number (1-31). */
type PipCalMonthNotes = Record<number, Array<string | null | undefined>>;

/** Full NOTES.json tree: year -> month -> day -> notes. */
type PipCalNotesFile = Record<number, Record<number, PipCalMonthNotes>>;

/** Wheel handler for a UI mode. */
type PipCalWheelFn = (dir: KnobDirection) => void;
