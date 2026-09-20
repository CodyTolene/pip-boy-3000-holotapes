/**
 * Types for Piptris.
 *
 * Piptris is split across several files so only the active screen is
 * resident: `APP.JS` owns shared state, music, and saved data, and loads one
 * scene at a time from the SD card. Each scene file is an uninvoked function
 * expression that receives this shared object and returns a handle the app
 * calls `remove()` on before loading the next scene.
 */

/** Scene file names, relative to the holotape's storage directory. */
interface PiptrisScenes {
  /** The playfield. */
  GAME: string;
  /** The post-game score screen. */
  GAME_OVER: string;
  /** How-to-play text. */
  INSTRUCTIONS: string;
  /** Title sequence. */
  INTRO: string;
  /** Main menu. */
  MENU: string;
  /** Asset preloader shown while the game warms up. */
  PRELOAD: string;
  /** Settings screen. */
  SETTINGS: string;
}

/**
 * The shared application object passed to every scene.
 *
 * Scenes read display metrics and settings from here and call back into it
 * to change screen, persist data, or control music, rather than owning any
 * of that themselves.
 */
interface PiptrisApp {
  /** Display height in pixels. */
  H: number;
  /** Display width in pixels. */
  W: number;
  /** Volume in effect while the game runs, on the firmware's 0-33 scale. */
  currentVol: number;
  /** When true, the CRT scanline and jitter effects are suppressed. */
  displayClean: boolean;
  /** Index into {@link PiptrisApp.musicSources} of the chosen source. */
  musicSource: number;
  /** Available music sources: the bundled tracks, SD folders, and OFF. */
  musicSources: string[];
  /** Whether UI sound effects are enabled. */
  soundEffects: boolean;
  /** Version string read from the holotape metadata. */
  version: string;
  /** Scene file names. */
  scenes: PiptrisScenes;
  /** Best score so far. Populated by loadData() during startup. */
  highScore: number;
  /** Track paths found in the selected music source. */
  musicList: string[];
  /**
   * Set by the menu scene so the intro only plays once per session, and
   * cleared again on teardown.
   */
  menuLoaded: boolean | undefined;
  /** Applies the current display settings to the blit options. */
  applyDisplay: () => void;
  /** Forces a garbage collection pass between scenes. */
  gc: () => void;
  /** Loads saved settings and the high score from the SD card. */
  loadData: () => void;
  /** Rescans the SD card for available music sources. */
  loadMusicSources: () => void;
  /**
   * Plays the nuke sound effect, if sound effects are enabled.
   *
   * @param ignoreMusic Pass true to play it even while music is streaming,
   * accepting that the music is cut short (the device has one audio channel).
   */
  playNukeSound: (ignoreMusic?: boolean) => void;
  /** Records a finished game's score, updating the high score. */
  recordScore: (score: number) => void;
  /** Writes settings and the high score back to the SD card. */
  saveData: () => void;
  /** Starts background music, unless the source is OFF. */
  startMusic: (ignoreMusic?: boolean) => void;
  /** Stops background music. */
  stopMusic: () => void;
  /**
   * Queues a scene change. The swap happens on the next event loop turn, so
   * the calling scene finishes its current handler before being torn down.
   */
  go: (file: string, params?: object) => void;
}

/** The handle a scene returns so the app can tear it down. */
interface PiptrisScene {
  /** Releases the scene's listeners, timers, and watches. */
  remove: () => void;
}

/** A scene file: an uninvoked function expression the app evaluates. */
type PiptrisSceneFactory = (app: PiptrisApp, params?: object) => PiptrisScene;

/** A queued scene change awaiting the next event loop turn. */
interface PiptrisPendingScene {
  /** Scene file to load. */
  file: string;
  /** Arbitrary parameters handed to the scene. */
  params?: object;
}

/** Display settings captured on entry so they can be restored on exit. */
interface PiptrisSavedDisplay {
  /** The firmware's idle jitter filter. */
  idleFilter: number[] | undefined;
  /** Whether the scanline effect was suppressed. */
  noScanEffect: number | boolean | undefined;
}

/** The end-of-game summary handed to the GAME_OVER scene. */
interface PiptrisGameStats {
  /** Difficulty level reached. */
  level: number;
  /** Total lines cleared. */
  lines: number;
  /** Final score. */
  score: number;
}
