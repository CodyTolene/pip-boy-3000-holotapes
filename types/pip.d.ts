/**
 * The Pip-Boy 3000 firmware API, exposed to holotapes as the global
 * {@link Pip} object.
 *
 * Method and property documentation follows the official RobCo Industries
 * Pip API Documentation for the Pip-Boy 3000 (not the older Mk V; some
 * details differ between the two devices and between firmware versions).
 */

/** Direction value passed to knob (thumbwheel) event handlers. */
type KnobDirection = -1 | 0 | 1;

/**
 * Handler for `knob1` / `knob2` events.
 *
 * @param dir `1` for clockwise/down, `-1` for counter-clockwise/up, and `0`
 * for a press of the wheel.
 * @param long Only supplied with press events (`dir === 0`): `true` when the
 * press was a long press.
 */
type KnobHandler = (dir: KnobDirection, long?: boolean) => void;

/**
 * UI sound effect names accepted by {@link PipController.playSound}.
 *
 * These are the names the firmware maps to its own interface sounds. They
 * are a different set from the raw sample names used by
 * {@link PipController.audioBuiltin}.
 */
type PipSoundName =
  | 'ALARM'
  | 'CANCELED'
  | 'HIGHLIGHT'
  | 'MODE'
  | 'SCROLL'
  | 'SELECT'
  | 'TAB'
  | string;

/** Built-in sound names for {@link PipController.audioBuiltin}. */
type PipBuiltinAudioName = 'OK' | 'OK2' | 'PREV' | 'NEXT' | 'COLUMN' | 'CLICK';

/** Options for {@link PipController.audioStart}. */
interface PipAudioStartOptions {
  /** Enables playback debug output. */
  debug?: boolean;
  /** Restart the sound from the beginning when it finishes. */
  repeat?: boolean;
}

/** Options for {@link PipController.audioStartVar}. */
interface PipAudioVarOptions {
  /** Mix into audio already in the ring buffer instead of replacing it. */
  overlap?: boolean;
  /** WAV encoding of the buffer: 16-bit PCM, 8-bit PCM, or IMA ADPCM. */
  encoding?: 16 | 8 | 'adpcm' | string;
  /** Block alignment; required for ADPCM data (see {@link PipController.audioRead}). */
  blockAlign?: number;
  /** Input sample rate in Hz (device audio is normally 16000). */
  sampleRate?: number;
}

/** Object filled in by {@link PipController.audioRead} for later playback. */
interface PipAudioReadInfo {
  /** Detected WAV encoding, ready for {@link PipController.audioStartVar}. */
  encoding?: 16 | 8 | 'adpcm' | string;
  /** Detected ADPCM block alignment. */
  blockAlign?: number;
}

/** Options for {@link PipController.videoStart}. */
interface PipVideoOptions {
  /** Left edge of the video on screen. */
  x?: number;
  /** Top edge of the video on screen. */
  y?: number;
  /** Enables playback debug output. */
  debug?: boolean;
  /** Restart the clip from the beginning when it finishes. */
  repeat?: boolean;
}

/** Options for {@link PipController.blitFile}. */
interface PipBlitFileOptions {
  /** Width of the region to draw, in pixels. */
  width: number;
  /** Height of the region to draw, in pixels. */
  height: number;
  /** Destination X on the target Graphics buffer. */
  dstx: number;
  /** Destination Y on the target Graphics buffer. */
  dsty: number;
  /** Source X within the image stored in the file. */
  x: number;
  /** Source Y within the image stored in the file. */
  y: number;
  /** Full width of the image stored in the file. */
  srcWidth: number;
  /** Full height of the image stored in the file. */
  srcHeight: number;
}

/** Options for {@link PipController.blitImage}. */
interface PipBlitImageOptions {
  /** Integer scale factor; values below 1 are rounded up to 1. */
  scale?: number;
  /** Hides the CRT scanline effect for this blit. */
  noScanEffect?: boolean;
  /** Renders only the top `height` rows of the image. */
  height?: number;
}

/**
 * Options object consulted by `Pip.blitScreen()` on every flip.
 *
 * Holotapes set `y1`/`y2` immediately before an `h.flip()` to blit only the
 * rows in that band (a large win for scrolling lists), then `delete` both
 * properties to restore full-screen updates.
 */
interface PipBlitOptions {
  /** Vertical blit offset used by some lock/screensaver paths. */
  y?: number;
  /** First screen row to blit (partial update). */
  y1?: number;
  /** Last screen row to blit (partial update). */
  y2?: number;
  /** Animation frames used by the firmware boot/idle sequences. */
  anim?: PipValue[];
  /** Index into the idle animation array. */
  idleIndex?: number;
  /** Hex color values for the CRT jitter / idle effect. */
  idleFilter?: number[];
  /**
   * Suppresses the CRT scanline effect when set. Apps that draw fine detail
   * turn it off and restore the previous value on exit.
   */
  noScanEffect?: number | boolean;
  /**
   * Stops the firmware blitting the screen at all. An app that takes over
   * rendering can set this, but must restore the original value on exit or
   * the OS display stays frozen.
   */
  disable?: boolean;
  vsync?: number | boolean;
  ydiff?: number;
  filter?: number | number[];
}

/**
 * The object describing the currently active screen or app.
 *
 * Whatever a holotape's IIFE returns becomes `Pip.CURRENT`; the OS calls
 * its `remove()` when navigating away.
 */
interface PipCurrentApp {
  /** Identifier of the current menu or app. */
  id?: string;
  /**
   * Cleanup function called when the screen changes. Must undo everything
   * the app set up: listeners, intervals, timeouts, watches, and audio.
   */
  remove: () => void;
  /**
   * When `true`, pressing any mode button navigates away from this app back
   * to the original firmware page.
   */
  notDefault?: boolean;
  /** When `true`, the OS does not render its header or footer. */
  fullscreen?: boolean;
}

/**
 * Device settings, loaded from `SETTINGS/DEVICE.JSON` on the SD card and
 * held in memory. Modify this object directly to change settings.
 *
 * SCALE WARNING: `brightness` here is the firmware UI's integer scale 1-20,
 * NOT the 0-1 float used by {@link PipController.setBrightness}; never feed
 * one into the other. `volume` (3-27) IS directly compatible with
 * {@link PipController.setVol}.
 */
interface PipSettings {
  /** Firmware UI brightness, integer 1-20 (not the 0-1 float scale). */
  brightness?: number;
  /** Output volume, integer (firmware UI keeps it within 3-27). */
  volume?: number;
  /** 12-hour clock display when `true`. */
  hr12?: boolean;
  /** Date format: 0 = DD.MM.YY, 1 = MM.DD.YY, 2 = YY-MM-DD. */
  timeFormat?: number;
  /** Show 4-digit years when `true`. */
  year4?: boolean;
  /** Century stored alongside the RTC (which only spans 2000-2099). */
  century?: number;
  /** Idle timeout before auto-sleep, or 0/undefined when disabled. */
  idleTimeout?: number;
  /** Additional firmware- and app-defined settings. */
  [key: string]: PipValue;
}

/** One LED target passed to {@link PipController.fadeTo}. */
interface LedFadeSpec {
  /** The LED pin to drive, e.g. `LED_RED`. */
  pin: Pin;
  /** Brightness to fade toward, as a float 0-1. */
  target: number;
}

/** The FM radio driver instance at {@link PipController.radio}. */
interface PipRadio {
  /** Tuned frequency in 10kHz steps (e.g. 9950 = 99.5MHz). */
  freq: number;
  /** Radio volume, 0-15. */
  volume: number;
  /** Interval handle used while seeking / retuning. */
  interval?: number | undefined;
  /** Enables or disables the radio IC. */
  setPower?(on: boolean): void;
  /** Writes a 2-byte value to a radio register via I2C2. */
  write_reg(register: number, data: number): void;
  /** Reads a radio register via I2C2. */
  read_reg(register: number): number;
  /** Firmware- and app-defined radio state. */
  [key: string]: PipValue;
}

/** The accelerometer driver, when the hardware revision provides one. */
interface PipAccelerometer {
  /**
   * Reads the current acceleration as a three element array of x, y, and z
   * components.
   */
  read(): number[];
  [key: string]: PipValue;
}

/**
 * On-screen keyboard object returned by
 * {@link PipController.createKeyboard} (firmware 1.1.4+).
 */
interface PipKeyboard {
  /** Redraws the keyboard. */
  draw(): void;
  /**
   * Detaches both knob listeners and stops the cursor blink. The keyboard
   * does NOT close itself when Enter is selected; call this from the
   * callback (or your cleanup path) before drawing the next screen.
   */
  remove(): void;
}

/**
 * Date/time picker object returned by
 * {@link PipController.createDateTimePicker} (firmware 1.1.4+).
 */
interface PipDateTimePicker {
  /** Detaches the picker's input handlers; it does not close itself. */
  remove(): void;
}

/** The main Pip-Boy firmware API object. */
interface PipController {
  /* ---------------------------------------------------------------- */
  /* Events                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Adds an event handler without removing existing ones. Prefer
   * {@link PipController.onExclusive} for knob input so a holotape's
   * handler is guaranteed to be the only listener.
   *
   * Knob handlers receive `1` (clockwise/down), `-1` (counter-clockwise/up)
   * or `0` (press; second argument `true` for a long press).
   */
  on(event: 'knob1' | 'knob2', handler: KnobHandler): void;
  /**
   * Fires when AVI playback finishes on its own (`videoStopped`, which does
   * NOT fire for a manual `videoStop()`), when audio playback finishes
   * (`audioStopped`), or when the torch is toggled (`torch`).
   */
  on(
    event: 'videoStopped' | 'audioStopped' | 'torch',
    handler: () => void,
  ): void;
  /** Fires when the mode dial changes page (STAT/ITEM/DATA). */
  on(event: 'mode', handler: (mode: number) => void): void;
  /** Fires when the 5-position submenu switch moves. */
  on(event: 'menuX', handler: (position: number) => void): void;
  on(event: string, handler: (...args: never[]) => void): void;

  /**
   * Registers a handler as the ONLY listener for the event, removing any
   * handlers other code had attached. This is the preferred default for
   * knob input in holotapes; use {@link PipController.on} only when
   * multiple handlers must coexist.
   */
  onExclusive(event: 'knob1' | 'knob2', handler: KnobHandler): void;
  onExclusive(event: string, handler: (...args: never[]) => void): void;
  /** Like on, but the listener runs before existing ones (e.g. OS handlers). */
  prependListener(event: string, handler: PipCallable): void;

  /**
   * Removes a previously added event handler. Every listener an app
   * registers must be removed here during the app's `remove()` cleanup.
   */
  removeListener(event: 'knob1' | 'knob2', handler: KnobHandler): void;
  removeListener(event: string, handler: (...args: never[]) => void): void;

  /** Removes all listeners for the event (or every event when omitted). */
  removeAllListeners(event?: string): void;

  /**
   * Emits an event. Notably `Pip.emit('mode', 1)` asks the OS to leave a
   * `notDefault` holotape and return to the firmware pages.
   */
  emit(event: string, ...args: PipValue[]): void;

  /* ---------------------------------------------------------------- */
  /* Properties                                                       */
  /* ---------------------------------------------------------------- */

  /**
   * Logs a message to the console and, when awake, to a log file under
   * `LOGS/` on the SD card. Each entry is prefixed with the date/time; if
   * the SD write fails the reason is written to internal flash instead.
   *
   * @param txt The text to log.
   * @param logFile Filename under `LOGS/` (defaults to "log.txt").
   */
  log(txt: string, logFile?: string): void;

  /** In-memory device settings (see {@link PipSettings} for scale gotchas). */
  settings: PipSettings;

  /**
   * Timestamp (from {@link getTime}) of the most recent screen blit. Set
   * this right after a manual `h.flip()` so the OS's 50ms auto-flush timer
   * skips its next redundant blit.
   */
  lastFlip: number;

  /* ---------------------------------------------------------------- */
  /* Audio                                                            */
  /* ---------------------------------------------------------------- */

  /**
   * Returns the raw byte data of a built-in sound effect, ready to play
   * with {@link PipController.audioStartVar}.
   */
  audioBuiltin(name: PipBuiltinAudioName): Uint8Array;

  /** Returns information about the currently playing audio file. */
  audioFileInfo(): PipValue;

  /** Returns the number of samples left free in the audio ring buffer. */
  audioGetFree(): number;

  /** Returns `true` while audio is playing. */
  audioIsPlaying(): boolean;

  /**
   * Reads a WAV file from the SD card into RAM for rapid replay.
   *
   * @param fileName Path to the WAV file on the SD card.
   * @param returnOptions If supplied, this object is filled with the
   * `encoding` and `blockAlign` fields needed by
   * {@link PipController.audioStartVar}.
   */
  audioRead(fileName: string, returnOptions?: PipAudioReadInfo): Uint8Array;

  /**
   * Plays a WAV file straight from the SD card (16kHz mono PCM or ADPCM).
   * Starting a new sound automatically stops any current playback, so a
   * preceding `audioStop()` is unnecessary.
   */
  audioStart(fileName: string, options?: PipAudioStartOptions): void;

  /**
   * Plays raw WAV data from a variable. The entire buffer is queued at
   * once, so this call blocks while it fills the ring buffer. For ADPCM
   * data supply `blockAlign` (most easily obtained from
   * {@link PipController.audioRead}).
   */
  audioStartVar(
    waveAudio: Uint8Array | ArrayBuffer | string,
    options?: PipAudioVarOptions,
  ): void;

  /** Immediately stops all audio output through the codec. */
  audioStop(): void;

  /** Enables the audio master clock (firmware boot sequence). */
  enableMCLK(): void;

  /**
   * Copies the current I2S audio buffer into a flat x,y vertex array for
   * rendering with `h.drawPoly` (only the y elements are written). Used to
   * draw live waveform displays.
   *
   * @param destinationArray Array of x,y pairs whose y values are filled in.
   * @param yMin Minimum Y screen coordinate of the waveform.
   * @param yMax Maximum Y screen coordinate of the waveform.
   */
  getAudioWaveform(
    destinationArray: ArrayLike<number>,
    yMin: number,
    yMax: number,
  ): void;

  /** Configures the ES8388 audio codec over I2C (firmware boot sequence). */
  initDAC(): void;

  /** Plays a built-in UI sound: TAB (confirm), SCROLL, SELECT, HIGHLIGHT. */
  playSound(name: PipSoundName): void;

  /** Reads the current value of an audio DAC register. */
  readDACReg(register: number): number;

  /** Sets the DAC output mode; `"off"` disables audio output entirely. */
  setDACMode(mode: 'off' | 'out'): void;

  /** Enables/disables the DAC power supply (also feeds amp and SD card). */
  setDACPower(isOn: boolean): void;

  /**
   * Sets the DAC output volume. Values are clamped to 0-33 (the firmware's
   * own settings UI stays within 3-27).
   */
  setVol(volume: number): void;

  /**
   * Reports what is currently streaming: `"video"`, `"audio"`, `"both"`,
   * or `undefined` when idle.
   */
  streamPlaying(): 'video' | 'audio' | 'both' | undefined;

  /** Writes a value to an audio DAC register. */
  writeDACReg(register: number, value: number): void;

  /* ---------------------------------------------------------------- */
  /* Radio                                                            */
  /* ---------------------------------------------------------------- */

  /** The FM radio driver. */
  radio: PipRadio;

  /* ---------------------------------------------------------------- */
  /* Display & video                                                  */
  /* ---------------------------------------------------------------- */

  /**
   * Streams a raw image file from the SD card straight into a Graphics
   * buffer, without loading the whole image into RAM.
   *
   * This is how full-screen backgrounds are drawn (480x320 2bpp `.RAW`
   * files) and how the firmware's own world map scrolls a 2048x2048 source
   * image: `x`/`y` pick the top-left corner of the region to read from the
   * file, and `dstx`/`dsty`/`width`/`height` place it on screen.
   */
  blitFile(
    graphics: Graphics,
    file: EspruinoFile,
    options: PipBlitFileOptions,
  ): void;

  /**
   * Renders raw image data to the screen with the CRT scan effect.
   *
   * @param img Raw image data.
   * @param x Left edge on screen.
   * @param y Top edge on screen.
   * @param options Options object, or a bare number used as the scale.
   */
  blitImage(
    img: GraphicsImage,
    x?: number,
    y?: number,
    options?: PipBlitImageOptions | number,
  ): void;

  /** Options consulted by every screen blit (partial updates, idle jitter). */
  blitOptions: PipBlitOptions;

  /**
   * Renders the frame buffer to the LCD using the given Graphics context
   * and blit options. Called automatically inside `h.flip()` (which the OS
   * runs every 50ms), so apps rarely call it directly.
   */
  blitScreen(graphics: Graphics, blitOptions?: PipBlitOptions): void;

  /**
   * Draws the status icons in the top-left of the screen and returns the x
   * coordinate of the rightmost icon drawn.
   */
  drawIcons(): number;

  /** Draws a firmware-style gauge widget. */
  drawGauge(...args: PipValue[]): void;

  /** Plays the screen power-off animation. */
  offAnimation(): void;

  /** Plays the boot animation. */
  bootAnimation(): void;

  /** Renders a firmware UI block (internal). */
  renderBlock(...args: PipValue[]): void;

  /** Renders the on-screen debug overlay (internal). */
  renderDebugInfo(...args: PipValue[]): void;

  /** Renders the standard footer bar (used when restoring OS chrome). */
  renderFooter(): void;

  /** Renders the standard header bar (used when restoring OS chrome). */
  renderHeader(): void;

  /** Renders scrolling text overflow (internal). */
  renderTextOverflow(...args: PipValue[]): void;

  /** Triggers a random CRT glitch effect with a matching glitch sound. */
  screenGlitch(): void;

  /**
   * Draws the standard error box. This is normally invoked by the global
   * exception handler; if this method itself throws, the device reboots 15
   * seconds later.
   */
  errorBox(err: PipValue): void;

  /**
   * Sets the 4x16 color palette used to render everything on the device
   * (even/odd scanline pairs, with and without the scan effect). Capture
   * the previous palette and restore it on app exit.
   */
  setPalette(
    palette:
      [Uint16Array, Uint16Array, Uint16Array, Uint16Array] | Uint16Array[],
  ): void;

  /** Draws the firmware's shaded highlight box over the given rectangle. */
  shadeBox(x1: number, y1: number, x2: number, y2: number): void;

  /**
   * Types text onto the screen one character at a time (typewriter effect,
   * roughly one character per 600ms tick). A `Ã‚Â§` character in the string
   * inserts an artificial pause without printing anything.
   *
   * @param txt Text to reveal.
   * @param x Left edge of the text area (default 0).
   * @param y Top edge of the text area (default 0).
   * @param W Width of the text area (defaults to the rest of the screen).
   * @param H Height of the text area (defaults to the rest of the screen).
   * @param font Font name (default "Monofonto16").
   * @returns A promise that resolves when the effect completes.
   */
  typeText(
    txt: string,
    x?: number,
    y?: number,
    W?: number,
    H?: number,
    font?: string,
  ): Promise<void>;

  /**
   * Starts non-blocking playback of an AVI file from the SD card.
   *
   * Only MS RLE encoded AVIs decode on this device (see the repo docs for
   * the ffmpeg recipe); an mpeg4 AVI will not play. Pair with a
   * `videoStopped` listener for end-of-clip transitions, and always give
   * the user a knob-press skip path in case a clip fails to decode.
   */
  videoStart(fileName: string, options?: PipVideoOptions): void;

  /**
   * Stops any current AVI playback. When skipping a clip manually, remove
   * the `videoStopped` listener BEFORE calling this so a synchronous stop
   * event cannot re-trigger the transition.
   */
  videoStop(): void;

  /* ---------------------------------------------------------------- */
  /* Power & sleep                                                    */
  /* ---------------------------------------------------------------- */

  /** Battery icon index currently shown, 0 (empty) through 9 (full). */
  battIcon: number;

  /** Current battery voltage (e.g. 3.3), updated by checkBatteryLevel(). */
  battLevel: number;

  /** Whether the device is on USB power, set by checkChargeStatus(). */
  charging: boolean;

  /**
   * Samples the battery with a moving average, updating
   * {@link PipController.battLevel}. Returns `false` when the battery is
   * low; a critically low level triggers sleep. Pass `force` to reset the
   * smoothing and skip the shutdown check.
   */
  checkBatteryLevel(force?: boolean): boolean;

  /**
   * Checks USB power status, sets {@link PipController.charging}, and
   * updates the battery reading.
   */
  checkChargeStatus(force?: boolean): void;

  /** Starts the 1-second charge status polling timer. */
  startChargeStatusTimer(): void;

  /**
   * Puts the device to sleep. `false`/`undefined` plays the power-off
   * animation first; `true` sleeps immediately; a function is called (and
   * should return a promise) before power-off for custom shutdown logic.
   */
  goToSleep(immediate?: boolean | (() => Promise<void>)): void;

  /**
   * Sleep state: `true`/`false`, or a transitional state string such as
   * `"WAITING_FOR_LONG_PRESS"`, `"BUSY"`, `"GOING_TO_SLEEP"`,
   * `"WAKING_UP"`.
   */
  sleeping: boolean | string;

  /** Enters standby mode (power button use only). */
  off(): void;

  /**
   * Sets the brightness of the screen, button backlights, Geiger counter,
   * and downlights.
   *
   * @param v Float 0-1 (roughly 0.001 near-off to 1 full). This is NOT the
   * 1-20 integer scale stored in `Pip.settings.brightness`. Apps that
   * change brightness should capture {@link PipController.brightness} on
   * load and restore it in `remove()`.
   */
  setBrightness(v: number): void;

  /**
   * The current brightness as a 0-1 float. Guard reads with
   * `typeof Pip.brightness === "number"` on older firmware.
   */
  brightness: number;

  /** Enters sleep mode (JavaScript continues executing). */
  sleep(): void;

  /** Wakes the device up. */
  wake(): void;

  /** Firmware wake handler. */
  wakeUp(): void;

  /* ---------------------------------------------------------------- */
  /* Input & misc device state                                        */
  /* ---------------------------------------------------------------- */

  /** Whether headphones are plugged in, set by checkHeadphoneState(). */
  headphonesPresent: boolean;

  /**
   * Re-detects the headphone jack state, updating
   * {@link PipController.headphonesPresent}. Pass `force` to emit a state
   * change event even if nothing changed.
   */
  checkHeadphoneState(force?: boolean): void;

  /** Creates a firmware scrolling-list widget (internal UI helper). */
  createScroller(...args: PipValue[]): PipValue;

  /**
   * Draws a full-screen QWERTY keyboard (firmware 1.1.4+). Takes exclusive
   * control of both knobs: knob2 selects the column, knob1 selects the row
   * and presses to type (long press repeats; shift toggles case). The
   * callback receives the text when Enter is selected, but the keyboard
   * does not close itself: call `.remove()` on the returned object from the
   * callback before drawing the next screen. Input is capped to the visible
   * line width (about 415px); extra characters are dropped silently.
   */
  createKeyboard(
    initialText: string,
    description: string,
    callback: (text: string) => void,
  ): PipKeyboard;

  /**
   * Draws a date/time picker (firmware 1.1.4+) that edits the passed Date
   * in place: knob2 moves between fields, knob1 changes values and presses
   * to advance. Selecting SET fires the callback; like the keyboard, the
   * picker does not close itself, so call `.remove()` in the callback.
   *
   * @param date The Date object to edit in place.
   * @param includeDate Whether to include date fields (not just time).
   * @param title Title text drawn above the picker.
   * @param callback Called with the edited Date when SET is chosen.
   */
  createDateTimePicker(
    date: Date,
    includeDate: boolean,
    title: string,
    callback: (date: Date) => void,
  ): PipDateTimePicker;

  /**
   * Clears all existing button watches and installs the default handlers
   * for the STAT/ITEM/DATA buttons, power button, and encoder. Firmware
   * use; apps should not need this.
   */
  setWatches(): void;

  /* ---------------------------------------------------------------- */
  /* Date & time                                                      */
  /* ---------------------------------------------------------------- */

  /**
   * Formats a date/time per the user's settings. Returns a 4-element
   * array: `[0]` time as HH:MM, `[1]` the date per
   * `Pip.settings.timeFormat`, `[2]` combined date and time, `[3]` "AM" or
   * "PM".
   *
   * @param time Optional Date to format; defaults to the current time.
   */
  currentDateTime(time?: Date): [string, string, string, string];

  /**
   * Returns the current date/time as a Date. Handles years outside the
   * STM32 RTC's 2000-2099 range using the century stored in settings.
   */
  getDateAndTime(): Date;

  /**
   * Sets the device date/time, persisting the century to
   * `SETTINGS/DEVICE.JSON` and programming the STM32 RTC.
   */
  setDateAndTime(d: Date): void;

  /* ---------------------------------------------------------------- */
  /* Device info & configuration                                      */
  /* ---------------------------------------------------------------- */

  /** The accelerometer driver, when present on this hardware revision. */
  accel?: PipAccelerometer;

  /** Configures the wake-up alarm (firmware use). */
  configureAlarm(...args: PipValue[]): void;

  /** Formats a form ID for display (firmware use). */
  formatId(...args: PipValue[]): string;

  /** Returns the current game mode (e.g. Fallout 3 vs New Vegas). */
  getMode(): PipValue;

  /** Initialises the I2C buses (firmware boot sequence). */
  I2CInit(): void;

  /** Low battery handler (firmware use). */
  lowBatt(...args: PipValue[]): void;

  /** Main firmware entry point (firmware use). */
  run(...args: PipValue[]): void;

  /** Enables/disables the LCD power supply. */
  setLCDPower(isOn: boolean): void;

  /** Current torch LED state, set by {@link PipController.setTorch}. */
  torchOn: boolean;

  /**
   * Controls the torch LED. `true`/`false` set it directly; `undefined`
   * toggles the current state (routing through the torch app for screen /
   * morse modes when needed).
   */
  setTorch(on?: boolean): void;

  /* ---------------------------------------------------------------- */
  /* Page navigation                                                  */
  /* ---------------------------------------------------------------- */

  /** Whether the retail demo loop is active. */
  demoMode: boolean;

  /** Current page: 0 = STAT, 1 = ITEM, 2 = DATA. */
  MODE: number;

  /** Position 0-4 of the 5-position submenu selector switch. */
  MENUX: number;

  /**
   * The currently active screen/app object. A holotape's returned object
   * is stored here while the holotape runs.
   */
  CURRENT: PipCurrentApp | 0 | undefined;

  /**
   * Changes to a new menu: refuses while a change is in progress, then
   * removes the open page, garbage-collects, clears the screen, redraws
   * header/footer, and loads the new menu.
   */
  /**
   * Load and run a holotape/scene JS file from the SD card (firmware helper
   * used by idle/screensaver runners). Path is typically under HOLO/.
   */
  loadHolotape(path: string): void;

  /** True while the OS main loop considers the device fully up. */
  running?: boolean;

  /**
   * Internal listener list for 'mode' events (firmware private).
   * Holotapes snapshot/restore it to suppress mode-button exits.
   */
  '#onmode'?: Array<(...args: PipValue[]) => void>;

  /** True while the OS is mid menu transition (defer idle overlays). */
  menuChanging?: boolean | number;

  /** True when the FM radio path is considered on (idle audio deferral). */
  radioOn?: boolean | number;

  changeMenu(srcOverride?: string, params?: PipValue): void;

  /** Polls the 5-position switch (runs automatically every 100ms). */
  checkSelectorSwitch(): void;

  /** Loads a menu source (firmware use). */
  loadMenu(srcOverride?: string, params?: PipValue): void;

  /**
   * Safely calls `Pip.CURRENT.remove()` with exception catching. Call this
   * rather than invoking `CURRENT.remove()` directly. Never call it at the
   * top of a new app's IIFE; the OS has already cleaned up the previous
   * app by then.
   */
  remove(): void;

  /** Navigates to the previous menu (internal). */
  _mPrev(): void;

  /* ---------------------------------------------------------------- */
  /* LEDs                                                             */
  /* ---------------------------------------------------------------- */

  /** Internal LED fade step. */
  _fade(...args: PipValue[]): void;

  /**
   * Fades one or more LEDs toward target brightness levels.
   *
   * Each spec names a pin and the level to reach, as a float 0-1. Holotapes
   * that drive the LEDs should restore the firmware's own state on exit,
   * either with {@link PipController.ledsRestore} or by replaying the values
   * captured on load.
   */
  fadeTo(specs: LedFadeSpec[]): void;

  /** Turns all LEDs off. */
  ledsAllOff(): void;

  /** Restores LEDs to their firmware-managed state. */
  ledsRestore(): void;

  /* ---------------------------------------------------------------- */
  /* Timers                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * The firmware's standard interval timers (`flip`, `selectorSwitch`,
   * `seek`, `idle`, `debug`, `radio`, `timeHeader`, `demo`, ...), stored
   * here so they can be stopped and restarted as a group.
   */
  timers: Record<string, number | undefined>;

  /** Creates all standard interval timers into {@link PipController.timers}. */
  startTimers(): void;

  /**
   * Stops and removes the standard timers (deliberately keeping
   * `chargeStatus` and `alarm` running). Pass extra timer names to stop
   * those too.
   */
  stopTimers(extra?: string[]): void;

  /**
   * Resets the idle sleep timer. With an idle timeout configured (and no
   * USB power), inactivity removes the current screen, shows the sleep
   * message, and puts the device to sleep.
   */
  kickIdleTimer(): void;
}

/** The global Pip-Boy firmware API object. */
declare const Pip: PipController;
