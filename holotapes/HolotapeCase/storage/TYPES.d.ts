/** One holotape found in an .info registration file. */
interface CaseTape {
  /** Display name from the .info file. */
  n: string;
  /** Script path to launch, e.g. HOLO/LOCKPICK/APP.JS. */
  s: string;
  /** Icon path, or an empty string when there is none. */
  i: string;
  /** The .info file's own name. */
  f: string;
  /** 1 when hidden from ITEMS > MISC. */
  h: number;
  /** 1 when marked as a favourite. */
  v: number;
}

/** Fields read from a holotape's .info registration file. */
interface CaseInfo {
  /** Holotape id. */
  id?: string;
  /** Display name. */
  name?: string;
  /** Script to launch. */
  src?: string;
  /** Icon image path. */
  icon?: string;
}

/** The firmware's MISC screen: JS/MISC.JS evaluates to one of these. */
type MiscScreen = (params: object) => HolotapeApp;
