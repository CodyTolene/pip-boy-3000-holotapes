/**
 * Concrete JSON-ish values that cross the Espruino / Pip-Boy boundary.
 * Prefer a tighter type at each call site when you know the shape.
 */
/** Function values that may be parked on `global` by holotapes. */
type PipCallable = (...args: PipValue[]) => PipValue;

type PipValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | PipValue[]
  | Record<string, PipValue>
  | PipCallable;

/**
 * Espruino runtime globals available on the Pip-Boy 3000.
 *
 * These declarations cover the JavaScript interpreter environment the device
 * firmware exposes to holotape apps. Espruino is a small-footprint
 * interpreter: there are no ES modules, no async/await, no template literal
 * support, and function declarations are NOT hoisted (a function must appear
 * earlier in the file than the first statement that references it).
 *
 * @see https://www.espruino.com/Reference
 */

/**
 * A hardware pin (button, encoder line, LED, etc.).
 *
 * Pins can be read and written directly, or watched for edges with
 * {@link setWatch}.
 */
interface Pin {
  /** Reads the current digital value of the pin. */
  read(): boolean;
  /** Writes a digital value to the pin. */
  write(value: boolean | number): void;
  /** Sets the pin output high. */
  set(): void;
  /** Sets the pin output low. */
  reset(): void;
  /**
   * Sets the pin mode (e.g. `"input"`, `"input_pullup"`, `"output"`).
   * Calling with no argument returns the pin to its default state.
   */
  mode(mode?: string): void;
  /** Returns information about the pin (port, number, functions). */
  getInfo(): { port: string; num: number; functions: object };
}

/** Options accepted by {@link setWatch}. */
interface SetWatchOptions {
  /**
   * If `true` the watch fires on every matching edge; if `false` (default)
   * it fires once and is then removed automatically.
   */
  repeat?: boolean;
  /**
   * Which signal edge triggers the callback. The numeric forms are the same
   * three values: `1` rising, `-1` falling, `0` both.
   */
  edge?: 'rising' | 'falling' | 'both' | 1 | -1 | 0;
  /**
   * A second pin to sample whenever the watch fires. Its value arrives as
   * {@link WatchEvent.data}, which is how both lines of a quadrature encoder
   * are read from a single watch.
   */
  data?: Pin;
  /**
   * Debounce time in milliseconds. The callback only fires if the pin is
   * still in the triggering state after this delay, which filters out
   * mechanical switch bounce.
   */
  debounce?: number;
  /** If `true`, use a hardware interrupt (advanced use only). */
  irq?: boolean;
}

/** Event object passed to a {@link setWatch} callback. */
interface WatchEvent {
  /** Pin state at the time the watch fired. */
  state: boolean;
  /** Time of this event, in seconds (same clock as {@link getTime}). */
  time: number;
  /** Time of the previous event, in seconds (undefined for the first). */
  lastTime: number | undefined;
  /**
   * Value of the pin named by the `data` option, sampled at the moment the
   * watch fired. Reading a second line this way is how quadrature encoders
   * are decoded: the XOR of `state` and `data` gives the turn direction.
   */
  data: number;
}

/**
 * Calls a function whenever the given pin changes state.
 *
 * On the Pip-Boy this is the low-latency way to catch encoder presses
 * (`setWatch(fn, ENC1_PRESS, { edge: 'rising', debounce: 20, repeat: true })`)
 * or presses of buttons that have no `Pip.on` event (e.g. `BTN_DATA`).
 * Every watch created by an app must be cleared with {@link clearWatch} in
 * the app's `remove()` cleanup.
 *
 * @returns An id that can be passed to {@link clearWatch}.
 */
declare function setWatch(
  callback: (event: WatchEvent) => void,
  pin: Pin,
  options?: SetWatchOptions | boolean,
): number;

/**
 * Clears a watch created with {@link setWatch}.
 *
 * WARNING: calling `clearWatch()` with no arguments removes ALL watches,
 * including the Pip-Boy OS's own button handlers. Always pass the id.
 */
declare function clearWatch(id?: number | null): void;

/**
 * Repeatedly calls a function with the given period in milliseconds.
 *
 * Extra arguments are passed straight to the callback on every tick, which
 * avoids a closure lookup per call (`setInterval(onFrame, 50, h)` is the
 * conventional Pip-Boy game loop). Every interval an app creates must be
 * cleared with {@link clearInterval} in the app's `remove()` cleanup.
 *
 * @returns An id that can be passed to {@link clearInterval}.
 */
declare function setInterval<TArgs extends PipValue[]>(
  callback: (...args: TArgs) => void,
  interval: number,
  ...args: TArgs
): number;
/**
 * Fallback for callbacks that ignore the extra arguments, which is common
 * when a shared function is reused as both a direct call and a timer tick.
 */
declare function setInterval(
  callback: (...args: never[]) => void,
  interval?: number,
  ...args: PipValue[]
): number;

/**
 * Clears an interval created with {@link setInterval}.
 *
 * Passing null or undefined is a no-op, which is why holotapes can hold
 * their timer handles as nullable values and clear them unconditionally.
 */
declare function clearInterval(id?: number | null): void;

/**
 * Calls a function once after the given delay in milliseconds.
 *
 * `setTimeout(fn, 0)` defers work to the event loop; holotapes use it to
 * load heavy assets after the app object has been returned to the OS.
 *
 * @returns An id that can be passed to {@link clearTimeout}.
 */
declare function setTimeout<TArgs extends PipValue[]>(
  callback: (...args: TArgs) => void,
  delay: number,
  ...args: TArgs
): number;
/** Fallback for callbacks that ignore the extra arguments. */
declare function setTimeout(
  callback: (...args: never[]) => void,
  delay?: number,
  ...args: PipValue[]
): number;

/**
 * Clears a timeout created with {@link setTimeout}.
 *
 * Passing null or undefined is a no-op.
 */
declare function clearTimeout(id?: number | null): void;

/**
 * Changes the period of an existing interval without recreating it.
 * Useful for speeding a game loop up as difficulty increases.
 */
declare function changeInterval(id: number, interval: number): void;

/** Returns the current system time in seconds, as a float. */
declare function getTime(): number;

/**
 * Decodes a base64 string into a binary "flat string".
 *
 * The result can be handed directly to `h.drawImage()` for inline sprite
 * data. Note that the Espruino pretokeniser decodes static `atob("...")`
 * calls at build time, so shipping base64 sprites costs nothing at runtime.
 */
declare function atob(data: string): string;

/** Encodes a string or byte array to base64. */
declare function btoa(
  data: string | ArrayBuffer | Uint8Array | number[],
): string;

/** Writes a digital value to a pin (faster than `pin.write` under JIT). */
declare function digitalWrite(pin: Pin, value: boolean | number): void;

/** Reads a digital value from a pin. */
declare function digitalRead(pin: Pin): number;

/** Reads an analog value from a pin, returning a float 0..1. */
declare function analogRead(pin: Pin): number;

/** Outputs an analog (PWM) value on a pin. */
declare function analogWrite(
  pin: Pin,
  value: number,
  options?: { freq?: number; soft?: boolean },
): void;

/** Prints to the console (the USB/serial REPL, not the device screen). */
declare function print(...args: PipValue[]): void;

/** Logs a debug message to the console. */
declare function debug(message?: string | number | boolean): void;

/**
 * Evaluates a string of JavaScript.
 *
 * Holotapes use this to load data or lazy scene modules from the SD card:
 * `eval(fs.readFileSync("HOLO/MYAPP/SCENE.JS"))` yields whatever the file's
 * expression evaluates to (conventionally an uninvoked function expression).
 */
declare function eval(code: string): PipValue;

/**
 * `true` when the code is running in the Espruino emulator instead of on
 * real Pip-Boy hardware; `undefined` on the device itself.
 */
declare const EMU: boolean | undefined;

/**
 * The firmware version string, as reported by the interpreter.
 *
 * Espruino exposes this alongside `process.env.VERSION`; the Pip-Boy
 * firmware sets it to its own release number.
 */
declare const VERSION: string;

/**
 * The interpreter's global scope object.
 *
 * Holotapes should keep their state inside their own closure, but `global` is
 * the documented way to hand state to a co-operating script that is evaluated
 * separately (for example a custom-firmware patch file that must find a
 * session object a holotape left behind).
 *
 * Members are typed as `PipValue` on purpose: anything parked here came from
 * outside this file, so narrow it to a declared shape before use.
 */
declare const global: Record<string, PipValue> & {
  __PipCoIdleService?: PipCoIdleService;
  __PipCoIdleWake?: PipCoIdleWake;
  __PipCoIdleSessionV120?: number;
  HAMCO_LOCK_SERVICE?: HamcoLockService;
  HAM_LED_SESSION?: HamLedService;
  __PipRadioActive?: number | boolean;
};

/**
 * Loads a built-in module.
 *
 * Only firmware-bundled modules exist on the device; there is no package
 * system. `fs` is also available as a global without requiring it.
 */
declare function require(module: 'fs'): FsModule;
declare function require(module: 'Storage'): StorageModule;
declare function require(module: 'heatshrink'): HeatshrinkModule;
declare function require(module: string): PipValue;

/**
 * SD card filesystem access. Available as the global {@link fs} or via
 * `require("fs")`; firmware code uses the global directly.
 *
 * Path convention: no leading slash (`"HOLO/MYAPP/DATA.JSON"`). Errors:
 * `NO_FILE` means the file itself is missing, `NO_PATH` means an
 * intermediate directory is missing.
 */
interface FsModule {
  /**
   * Reads an entire file and returns its contents as a binary string.
   * Throws if the file does not exist.
   */
  readFileSync(path: string): string;
  /** Alias of {@link FsModule.readFileSync} (Espruino fs is synchronous). */
  readFile(path: string): string;
  /**
   * Writes data to a file, replacing any existing content.
   * Returns `true` on success.
   */
  writeFileSync(path: string, data: string | ArrayBuffer | Uint8Array): boolean;
  /** Alias of {@link FsModule.writeFileSync} (Espruino fs is synchronous). */
  writeFile(path: string, data: string | ArrayBuffer | Uint8Array): boolean;
  /** Appends data to a file, creating it if needed. */
  appendFileSync(
    path: string,
    data: string | ArrayBuffer | Uint8Array,
  ): boolean;
  /** Alias of {@link FsModule.appendFileSync}. */
  appendFile(path: string, data: string | ArrayBuffer | Uint8Array): boolean;
  /** Lists the entries in a directory. */
  readdir(path?: string): string[];
  /** Alias of {@link FsModule.readdir}. */
  readdirSync(path?: string): string[];
  /**
   * Returns file information, or `undefined` if the path does not exist.
   *
   * IMPORTANT: unlike Node, a missing path does NOT throw, so existence
   * checks must inspect the return value rather than use try/catch.
   */
  statSync(
    path: string,
  ): { size: number; dir: boolean; mtime?: Date } | undefined;
  /**
   * Creates a directory. Does NOT create parent directories; create each
   * level of a nested path individually.
   */
  mkdir(path: string): boolean;
  /** Alias of {@link FsModule.mkdir} (Espruino fs is synchronous). */
  mkdirSync(path: string): boolean;
  /** Deletes a file. */
  unlink(path: string): boolean;
  /** Alias of {@link FsModule.unlink}. */
  unlinkSync(path: string): boolean;
  /** Renames (moves) a file or directory. */
  rename(oldPath: string, newPath: string): boolean;
  /** Alias of FsModule.rename (Espruino fs is synchronous). */
  renameSync(oldPath: string, newPath: string): boolean;
}

/** SD card filesystem (global alias of `require("fs")`). */
declare const fs: FsModule;

/**
 * Internal flash storage module (`require("Storage")`).
 *
 * This is the device's internal flash, distinct from the SD card handled by
 * {@link fs}. The firmware uses it for fallback logging; holotapes should
 * prefer the SD card for their own data.
 */
interface StorageModule {
  /** Compact the journalled flash filesystem. Pass true to run synchronously. */
  compact(wait?: boolean): void;
  /** Reads a file from flash storage, or `undefined` if missing. */
  read(name: string, offset?: number, length?: number): string | undefined;
  /** Writes data to a file in flash storage. */
  write(
    name: string,
    data: string | ArrayBuffer | Uint8Array | object,
    offset?: number,
    size?: number,
  ): boolean;
  /** Reads a file and parses it as JSON, or `undefined` on failure. */
  readJSON(name: string, noExceptions?: boolean): PipValue;
  /** Serialises a value as JSON and writes it to a file. */
  writeJSON(name: string, data: PipValue): boolean;
  /** Lists file names in flash storage, optionally filtered by regex. */
  list(regex?: RegExp, filter?: { sf?: boolean }): string[];
  /** Erases a single file from flash storage. */
  erase(name: string): void;
  /** Returns the free space in bytes. */
  getFree(): number;
}

/** Internal flash storage (also available via `require("Storage")`). */
declare const Storage: StorageModule;

/** Heatshrink compression module (`require("heatshrink")`). */
interface HeatshrinkModule {
  /** Compresses a byte array. */
  compress(data: string | ArrayBuffer | Uint8Array): Uint8Array;
  /** Decompresses data produced by {@link HeatshrinkModule.compress}. */
  decompress(data: string | ArrayBuffer | Uint8Array): Uint8Array;
}

/** Result object returned by {@link Process.memory}. */
interface MemoryInfo {
  /** Number of free variable blocks. */
  free: number;
  /** Number of variable blocks currently in use. */
  usage: number;
  /** Total variable blocks available to the interpreter. */
  total: number;
  /** Number of blocks used by command history. */
  history: number;
  /** Number of variables freed by the garbage collection pass, if one ran. */
  gc: number;
  /** Time taken for the garbage collection pass, in milliseconds. */
  gctime: number;
  /** Size of one variable block in bytes (typically 10-16). */
  blocksize: number;
  [key: string]: number | undefined;
}

/** The Espruino process object. */
interface Process {
  /**
   * Returns memory usage statistics.
   *
   * @param gc Pass `true` to force a garbage collection pass first (used
   * after unloading a lazy module to reclaim its code); pass `false` to
   * read usage without triggering GC.
   */
  memory(gc?: boolean): MemoryInfo;
  /** Environment/build information for the firmware. */
  env: Record<string, string | number | undefined>;
  /** Espruino version string. */
  version: string;
}

/** Espruino process information. */
declare const process: Process;

/** Minimal console available on the device (output goes to the REPL). */
interface EspruinoConsole {
  log(...args: PipValue[]): void;
  warn(...args: PipValue[]): void;
  error(...args: PipValue[]): void;
  debug(...args: PipValue[]): void;
}

declare const console: EspruinoConsole;

/**
 * A file handle opened with {@link EspruinoUtils.openFile}, used to stream
 * large assets (e.g. raw background images) from the SD card without
 * loading them fully into RAM.
 */
interface EspruinoFile {
  /**
   * Reads up to `length` bytes from the file. Returns `undefined` when the
   * end of the file has been reached.
   */
  read(length: number): string | Uint8Array | undefined;
  /** Writes data to the file and returns the number of bytes written. */
  write(data: string | ArrayBuffer | Uint8Array): number;
  /** Skips forward the given number of bytes. */
  skip(bytes: number): void;
  /** Seeks to an absolute byte position. */
  seek(position: number): void;
  /** Closes the file handle. Always close streamed files when done. */
  close(): void;
  /** Returns information about the open file. */
  getStats?(): { size: number };
}

/**
 * The Espruino utility namespace: hardware helpers, memory tools, and
 * optimized math/array built-ins.
 */
interface EspruinoUtils {
  /**
   * Clamps a value into the inclusive range [min, max].
   * Preferred over hand-rolled `Math.min(Math.max(...))` chains.
   */
  clip(value: number, min: number, max: number): number;
  /**
   * Defragments interpreter memory to maximize contiguous free space.
   * Call before allocating large buffers or loading big assets.
   */
  defrag(): void;
  /** Forces a garbage collection pass. */
  gc(): void;
  /**
   * Opens a file on the SD card for streaming.
   *
   * @param path Path on the SD card, e.g. `"HOLO/MYAPP/TITLE.IMG"`.
   * @param mode `"r"` read, `"w"` write, `"a"` append (with `+` variants).
   */
  openFile(
    path: string,
    mode: 'r' | 'w' | 'a' | 'r+' | 'w+' | 'a+',
  ): EspruinoFile;
  /** Optimized sum of all elements of an array or typed array. */
  sum(data: ArrayLike<number> | string): number;
  /** Optimized variance of all elements of an array or typed array. */
  variance(data: ArrayLike<number>, mean?: number): number;
  /**
   * Returns the number of variable blocks used by a value. With `depth > 0`
   * returns a per-property breakdown, useful for finding memory hogs.
   */
  getSizeOf(value: PipValue, depth?: number): number | PipValue[];
  /**
   * Copies data into a single flat (contiguous) string, which is faster to
   * index and can be required by some APIs. Returns `undefined` if there is
   * not enough contiguous memory available.
   */
  toFlatString(
    data: string | ArrayBuffer | Uint8Array | number[],
  ): string | undefined;
  /** Converts data to a plain (possibly flat) string without copying when possible. */
  toString(
    ...data: Array<string | ArrayBuffer | Uint8Array | number[] | number>
  ): string | undefined;
  /**
   * Returns an ArrayBuffer view of the data without copying when possible.
   * Handy for reinterpreting a binary string read from disk.
   */
  toArrayBuffer(data: string | ArrayBuffer | Uint8Array): ArrayBuffer;
  /** Returns a Uint8Array view of the data without copying when possible. */
  toUint8Array(data: string | ArrayBuffer | Uint8Array | number[]): Uint8Array;
  /** Converts a value to a JS string, like `JSON.stringify` but for code. */
  toJS(value: PipValue): string;
  /** Returns a hardware random 32-bit integer. */
  hwRand(): number;
  /**
   * Sets interpreter flags (e.g. `{ jitDebug: 1 }` to print generated JIT
   * assembly, or `{ pretokenise: 1 }`).
   */
  setFlags(flags: Record<string, number | boolean>): void;
  /** Returns the current interpreter flags. */
  getFlags(): Record<string, number>;
  /**
   * Reboots the device immediately.
   *
   * Never call this from a holotape: apps must exit cleanly via `remove()`
   * and let the Pip-Boy OS restore its own state.
   */
  reboot(): void;
  /** Enters the deepest sleep state available (firmware use only). */
  enableWatchdog(timeout?: number, isAuto?: boolean): void;
  /** CRC32 of the given data. */
  CRC32(data: string | ArrayBuffer | Uint8Array): number;
  /** Displays a full-screen message using the interpreter (firmware use). */
  showMessage?(message: string, title?: string): void;
  setUSBHID(options?: { reportDescriptor: string }): void;
  sendUSBHID(report: ArrayLike<number>): boolean;
  stopEventPropagation(): void;
}

/** Espruino utility namespace. */
declare const E: EspruinoUtils;

/**
 * Loads the saved program from flash and restarts the interpreter.
 * Never call this from a holotape; the OS manages app lifecycles.
 */
declare function load(filename?: string): void;

/**
 * Saves the current interpreter state to flash.
 * Never call this from a holotape.
 */
declare function save(): void;

/** Reads 8 bits of memory at the given address (firmware/driver use). */
declare function peek8(address: number, count?: number): number | Uint8Array;

/** Writes 8 bits of memory at the given address (firmware/driver use). */
declare function poke8(address: number, value: number | number[]): void;

/** A serial port (USB CDC, hardware UART, etc.). */
interface SerialPort {
  /** Writes a string without a trailing newline. */
  print(text: string): void;
  /** Writes a string followed by a newline. */
  println(text: string): void;
  /** Writes raw bytes or characters. */
  write(...data: Array<string | number | ArrayBuffer | Uint8Array>): void;
  /** Registers a handler for incoming data. */
  on(event: 'data', handler: (data: string) => void): void;
  /** Removes a previously registered data handler. */
  removeListener(event: 'data', handler: (data: string) => void): void;
  /** Removes all listeners for the given event. */
  removeAllListeners(event?: string): void;
  /** Configures the port (baud rate etc.). */
  setup(baudrate?: number, options?: object): void;
}

/**
 * The USB CDC serial connection to a host PC. Holotapes can use it to talk
 * to companion software running on the computer the Pip-Boy is plugged into.
 */
declare const USB: SerialPort;

interface Math {
  /**
   * Returns a random integer in the range [0, max - 1].
   *
   * Espruino built-in: faster than `Math.floor(Math.random() * max)` and
   * preferred in all holotape code.
   */
  randInt(max: number): number;
}

/* ------------------------------------------------------------------ */
/* Pip-Boy hardware pins                                              */
/* ------------------------------------------------------------------ */

/**
 * Encoder (right thumbwheel) push switch. Watch with
 * `setWatch(fn, ENC1_PRESS, { edge: 'rising', debounce: 20, repeat: true })`
 * when press response must be immediate (e.g. firing in a game); otherwise
 * prefer the `dir === 0` press event on `Pip.on("knob1", ...)`.
 */
declare const ENC1_PRESS: Pin;
/** Encoder quadrature line A (used by the OS; rarely watched directly). */
declare const ENC1_A: Pin;
/** Encoder quadrature line B (used by the OS; rarely watched directly). */
declare const ENC1_B: Pin;
/**
 * The radio Play button. Has no `Pip.on` event, so apps that use it watch it
 * directly with `setWatch(fn, BTN_PLAY, { edge: 'rising', ... })`.
 */
declare const BTN_PLAY: Pin;
/** The DATA mode button (also readable directly via `BTN_DATA.read()`). */
declare const BTN_DATA: Pin;
/** The STATS mode button. */
declare const BTN_STATS: Pin;
/** The power button (PA0). Handled by the OS; do not watch from apps. */
declare const BTN_POWER: Pin;
/** The torch (flashlight) button, when present on the hardware revision. */
declare const BTN_TORCH: Pin;

/**
 * Red channel of the front indicator LED. Driving it directly (rather than
 * through `Pip.fadeTo`) is how holotapes produce effects such as a radiation
 * warning glow; restore the LEDs with `Pip.ledsRestore()` on exit.
 */
declare const LED_RED: Pin;
/** Green channel of the front indicator LED. */
declare const LED_GREEN: Pin;
/** Blue channel of the front indicator LED. */
declare const LED_BLUE: Pin;
/** The downward-facing illumination LED used while charging. */
declare const LED_DOWNFIRE: Pin;

/** Espruino lets Uint8Array.set take a binary string from File.read. */
interface Uint8Array {
  set(array: ArrayLike<number> | string, offset?: number): void;
}
