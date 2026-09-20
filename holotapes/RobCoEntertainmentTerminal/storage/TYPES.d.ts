/**
 * Types for the RobCo Entertainment Terminal.
 *
 * A media browser for the SD card: music, video, and images. Like the other
 * multi-screen holotapes it loads one scene file at a time so only the
 * active screen is resident.
 *
 * Music playback can optionally keep running after the holotape is closed.
 * That works by patching firmware functions and parking the state on the
 * radio driver, which is why several of these types describe fields the
 * terminal adds to `Pip.radio` rather than fields the firmware defines.
 */

/** Scene file names, relative to the holotape's storage directory. */
interface RcetScenes {
  /** Title sequence. */
  INTRO: string;
  /** Main menu. */
  MENU: string;
  /** Music browser and player. */
  MUSIC: string;
  /** Video browser and player. */
  VIDEO: string;
  /** Image browser. */
  IMAGES: string;
  /** Settings screen. */
  SETTINGS: string;
}

/** The shared application object passed to every scene. */
interface RcetApp {
  /** Display height in pixels. */
  H: number;
  /** Display width in pixels. */
  W: number;
  /** Brightness while the terminal runs, or null before it is captured. */
  currentBright: number | null;
  /** Volume while the terminal runs, or null before it is captured. */
  currentVol: number | null;
  /** Brightness captured on entry, restored on exit. */
  initialBright: number | null;
  /** Volume captured on entry, restored on exit. */
  initialVol: number | null;
  /** Terminal titles, indexed by the mode the user picked. */
  names: string[];
  /** Sort direction for browser listings: 1 ascending, -1 descending. */
  sortDir: number;
  /** Whether music should keep playing after the holotape closes. */
  persist: boolean;
  /** Terminal version string. */
  version: string;
  /** Firmware version that persistent audio support requires. */
  supportedFirmwareVersion: string;
  /** Scene file names. */
  scenes: RcetScenes;
  /** Queues a scene change for the next event loop turn. */
  go: (file?: string, params?: object) => void;
  /** Forces a garbage collection pass between scenes. */
  gc: () => void;
}

/** The handle a scene returns so the app can tear it down. */
interface RcetScene {
  /** Releases the scene's listeners, timers, and watches. */
  remove: () => void;
}

/** A scene file: an uninvoked function expression the app evaluates. */
type RcetSceneFactory = (app: RcetApp, params?: object) => RcetScene;

/** A queued scene change awaiting the next event loop turn. */
interface RcetPendingScene {
  /** Scene file to load. */
  file: string;
  /** Arbitrary parameters handed to the scene. */
  params?: object;
}

/**
 * The radio driver with the fields the terminal parks on it for persistent
 * playback.
 *
 * These are prefixed `mj` in the original source (for the Mojave station
 * feature they grew out of). None of them are firmware API; they exist only
 * while the terminal's persistence hook is installed.
 */
interface RcetRadio extends PipRadio {
  /** True while terminal-driven playback owns the audio path. */
  mjOn?: number | boolean;
  /** True while a terminal station rather than the FM radio is selected. */
  mojaveStation?: number | boolean;
  /** Stations the terminal built from the SD card. */
  mjStations?: RcetStation[];
  /** Index of the playing station. */
  mjStationIndex?: number;
  /** Index of the playing track within the station. */
  mjTrackIndex?: number;
  /** Path of the track currently playing. */
  mojaveCurrent?: string;
  /** Error text from the last failed start, if any. */
  mojaveError?: string | number;
  /** Guard that stops a stop event advancing to the next track. */
  mjNoNext?: number | boolean;
  /** Guard that lets the patched audio functions run their real bodies. */
  mjAllow?: number | boolean;
  /** Handle of the timer that clears the no-next guard. */
  mjTimer?: number;
  /** Handle of the interval watching for playback to end. */
  mjWatch?: number;
  /** The audioStopped handler, kept so it can be removed. */
  mjHandler?: (() => void) | number;
  /** The mode/menuX handler, kept so it can be removed. */
  mjTabHandler?: (() => void) | number;
  /** Volume captured for persistent playback. */
  mjVol?: number;
  /** Playback mode: 0 single track, 1 shuffle, 2 play all. */
  mjMode?: number;
  /** Advances to the next track; cleared to 0 on teardown. */
  mjNext?: (() => void) | number;
  /** True when the firmware supports the persistence hook. */
  rcetPersistSupported?: boolean;
}

/** One station: a folder of tracks the terminal can play in sequence. */
interface RcetStation {
  /** Station name, shown while it plays. */
  n: string;
  /** Track file names. */
  t: string[];
  /** Path prefix each track name is appended to. */
  p: string;
}

/** A row in one of the browser listings. */
interface RcetEntry {
  /** File or folder name as shown to the user. */
  name: string;
  /** Full path on the SD card. */
  path: string;
  /** True when the row is a folder the user can descend into. */
  dir?: boolean;
}

/**
 * Members this holotape adds to the firmware object at runtime.
 *
 * Persistent playback works by wrapping `Pip.audioStart`, `Pip.audioStop`,
 * and `Pip.goToSleep` so the terminal's own stream survives the holotape
 * closing, keeping the originals here so they can be put back. None of this
 * is firmware API, which is why every member is optional: they exist only
 * while the hook is installed, and `Pip.rcetStop()` removes them all.
 *
 * This is an interface merge rather than a separate type because the code
 * reads and writes them directly on the global `Pip`.
 */
interface PipController {
  /** Tears down persistent playback and restores every patched method. */
  rcetStop?: (() => void) | number;
  /** The original `Pip.audioStart`, saved while the wrapper is installed. */
  _mjStart?: PipController['audioStart'] | number;
  /** The original `Pip.audioStop`, saved while the wrapper is installed. */
  _mjStop?: PipController['audioStop'] | number;
  /** The original `Pip.goToSleep`, saved while the wrapper is installed. */
  _rcetSleepOrig?: PipController['goToSleep'] | number;
  /** Guard so the sleep wrapper is only installed once. */
  _rcetSleepWrapped?: number | boolean;
  /** Set while a terminal track rather than the FM radio is playing. */
  radioClipPlaying?: number | boolean;
}

/**
 * A row in a browser listing.
 *
 * The first row is always a menu entry; the rest describe media files, and
 * carry the flag the list uses to warn that a path is too long for the
 * firmware to open.
 */
interface RcetListItem {
  /** Row kind, which selects the icon and the press action. */
  type: string;
  /** Label for a fixed row such as BACK TO MENU. */
  label?: string;
  /** File name for a media row. */
  name?: string;
  /** True when the full path exceeds what the firmware can open. */
  tooLong?: boolean;
}

/** A row on the terminal's main menu. */
interface RcetMenuItem {
  /** Row label. */
  label: string;
  /** Description shown under the label. */
  desc: string;
  /** Scene key to open, for the rows that open a browser. */
  scene?: keyof RcetScenes;
  /** True for the row that stops persistent background music. */
  stop?: boolean;
}

/** A station: one folder of WAV files under the music directory. */
interface RcetMusicStation {
  /** Folder name shown to the user. */
  n: string;
  /** Full path on the SD card. */
  p: string;
}

/**
 * A row in the music browser.
 *
 * `t` is the row kind: `menu`, `back`, `station`, `song`, `shuffle`, or
 * `playall`. Which of the remaining fields is present depends on it.
 */
interface RcetMusicRow {
  /** Row kind. */
  t: string;
  /** Row label. */
  l: string;
  /** Track file name, for song rows. */
  name?: string;
  /** The station, for station rows. */
  s?: RcetMusicStation;
}

/** Parameters handed to the settings screen. */
interface RcetSettingsParams {
  /** Which screen opened settings, so BACK returns to the right place. */
  from?: string;
}
