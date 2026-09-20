/**
 * Espruino Graphics library, as exposed on the Pip-Boy 3000.
 *
 * The device provides a double-buffered 480x320 4bpp Graphics instance as
 * the global {@link h}. Draw methods are chainable
 * (`h.setColor(3).setFontMonofonto16().drawString("HI", 240, 160)`), and the
 * OS auto-flushes the buffer to the LCD every 50ms; apps that drive their
 * own rendering call {@link Graphics.flip} and then set
 * `Pip.lastFlip = getTime()` to skip the next auto-blit.
 *
 * @see https://www.espruino.com/Reference#Graphics
 */

/**
 * Image data accepted by {@link Graphics.drawImage}:
 *
 * - A binary string (e.g. from `atob("...")` or a converted image file).
 * - An object with `width`, `height`, `bpp` and pixel `buffer`.
 * - Another Graphics instance (via {@link Graphics.asImage}).
 */
type GraphicsImage =
  string | ArrayBuffer | Uint8Array | Graphics | GraphicsImageObject;

/**
 * The object form of an image.
 *
 * Holotapes that ship sprites as JSON build one of these after decoding the
 * base64 pixel data, filling in the optional palette and transparency only
 * when the asset defines them.
 */
interface GraphicsImageObject {
  /** Image width in pixels. */
  width: number;
  /** Image height in pixels. */
  height: number;
  /** Bits per pixel (holotape images must be 4bpp or less). */
  bpp?: number;
  /** Raw pixel data. */
  buffer: ArrayBuffer | Uint8Array | string;
  /** Palette color index treated as transparent. */
  transparent?: number;
  /** Optional palette mapping image values to display colors. */
  palette?: Uint16Array | number[];
}

/** Options for {@link Graphics.drawImage}. */
interface DrawImageOptions {
  /** Rotation around the image center, in radians. */
  rotate?: number;
  /** Scale factor (1 = original size). */
  scale?: number;
  /** Frame index for images that contain multiple frames. */
  frame?: number;
  /** Center the image on x/y instead of using them as the top-left. */
  center?: boolean;
}

/**
 * Font names available on the Pip-Boy 3000 for {@link Graphics.setFont}.
 *
 * The device (a 3000a) ships Monofonto sizes up to 36px plus Fixedsys16.
 * Custom fonts can also be registered by the firmware, so any string is
 * accepted at the type level.
 */
type PipBoyFontName =
  | 'Fixedsys16'
  | 'Monofonto14'
  | 'Monofonto16'
  | 'Monofonto18'
  | 'Monofonto23'
  | 'Monofonto28'
  | 'Monofonto36';

/**
 * A drawing surface. On the Pip-Boy the global {@link h} is the screen's
 * double-buffered Graphics instance; additional instances can be created
 * off-screen via {@link GraphicsConstructor.createArrayBuffer}.
 *
 * Color indices on the 4bpp display run 0 (black) through 3 (white), with
 * 1 and 2 as intermediate greys; the visible tint comes from the device
 * palette (see `Pip.setPalette`). `setColor(-1)` acts as a no-op /
 * transparent in some contexts.
 */
interface Graphics {
  /**
   * Clears the screen (or the clip rect) and resets the cursor position.
   *
   * @param reset Pass `true` to also reset graphics state (color, font,
   * etc.) like {@link Graphics.reset}. On the Pip-Boy, holotapes commonly
   * call `h.clear(1)` where the argument is truthy and behaves as above.
   */
  clear(reset?: boolean | number): Graphics;
  /** Fills the given rectangle with the current background color. */
  clearRect(x1: number, y1: number, x2: number, y2: number): Graphics;
  /**
   * Sets the foreground color index (0-3 on the 4bpp display).
   *
   * NOTE: the color persists globally across all subsequent draw calls,
   * even in other functions. Always set the color explicitly before drawing
   * where the color matters.
   */
  setColor(color: number): Graphics;
  /** Sets the foreground color from separate red/green/blue floats 0..1. */
  setColor(red: number, green: number, blue: number): Graphics;
  /**
   * Sets the background color index used by text drawing and
   * {@link Graphics.clearRect}.
   */
  setBgColor(color: number): Graphics;
  /** Sets the background color from separate red/green/blue floats 0..1. */
  setBgColor(red: number, green: number, blue: number): Graphics;
  /** Returns the current foreground color. */
  getColor(): number;
  /** Returns the current background color. */
  getBgColor(): number;
  /**
   * Converts red/green/blue floats (0..1) into a color value for the
   * current bit depth. Used when building custom palettes.
   */
  toColor(red: number, green: number, blue: number): number;
  /**
   * Selects a font by name, e.g. `h.setFont("Monofonto14")`. Equivalent to
   * calling the matching `setFontXxx()` method.
   */
  setFont(name: PipBoyFontName | (string & {}), size?: number): Graphics;
  /** Selects the Fixedsys 16px font. */
  setFontFixedsys16(): Graphics;
  /** Selects the Monofonto 14px font. */
  setFontMonofonto14(): Graphics;
  /** Selects the Monofonto 16px font (the OS default for body text). */
  setFontMonofonto16(): Graphics;
  /** Selects the Monofonto 18px font. */
  setFontMonofonto18(): Graphics;
  /** Selects the Monofonto 23px font. */
  setFontMonofonto23(): Graphics;
  /** Selects the Monofonto 28px font. */
  setFontMonofonto28(): Graphics;
  /** Selects the Monofonto 36px font (largest available on this device). */
  setFontMonofonto36(): Graphics;
  /** Returns the name of the current font. */
  getFont(): string;
  /** Returns the height in pixels of the current font. */
  getFontHeight(): number;
  /**
   * Sets text alignment relative to the draw position.
   *
   * @param x Horizontal: -1 left, 0 center, 1 right.
   * @param y Vertical: -1 top, 0 center, 1 bottom.
   * @param rotation Optional rotation: 0 none, 1 = 90deg CW, 2 = 180, 3 = 270.
   */
  setFontAlign(x: number, y: number, rotation?: number): Graphics;
  /**
   * Draws a string at the given position using the current font, color, and
   * alignment.
   *
   * @param solid Pass `true` to also fill the text background with the
   * background color (used for flicker-free redraws over old text).
   */
  drawString(
    text: string | number,
    x: number,
    y: number,
    solid?: boolean,
  ): Graphics;
  /** Measures the rendered width of a string in the current font. */
  stringWidth(text: string | number): number;
  /** Returns `{ width, height }` (and more) for a string in the current font. */
  stringMetrics(text: string | number): {
    width: number;
    height: number;
    etc?: PipValue;
  };
  /**
   * Word-wraps text to fit within `maxWidth` pixels, returning an array of
   * lines. Wrapping is expensive on this hardware: wrap once and cache the
   * result instead of re-wrapping every frame.
   */
  wrapString(text: string, maxWidth: number): string[];
  /** Draws a 1px line between two points. */
  drawLine(x1: number, y1: number, x2: number, y2: number): Graphics;
  /** Draws an anti-aliased line between two points. */
  drawLineAA(x1: number, y1: number, x2: number, y2: number): Graphics;
  /** Draws a rectangle outline. */
  drawRect(x1: number, y1: number, x2: number, y2: number): Graphics;
  /** Draws a rectangle outline from a bounds object. */
  drawRect(rect: { x: number; y: number; w: number; h: number }): Graphics;
  /** Draws a filled rectangle. */
  fillRect(x1: number, y1: number, x2: number, y2: number): Graphics;
  /** Draws a filled rectangle from a bounds object. */
  fillRect(rect: { x: number; y: number; w: number; h: number }): Graphics;
  /** Draws a circle outline centered on x, y. */
  drawCircle(x: number, y: number, radius: number): Graphics;
  /** Draws a filled circle centered on x, y. */
  fillCircle(x: number, y: number, radius: number): Graphics;
  /** Draws an ellipse outline within the given bounding box. */
  drawEllipse(x1: number, y1: number, x2: number, y2: number): Graphics;
  /** Draws a filled ellipse within the given bounding box. */
  fillEllipse(x1: number, y1: number, x2: number, y2: number): Graphics;
  /**
   * Draws a polygon outline from a flat vertex array `[x1,y1,x2,y2,...]`.
   *
   * @param closed Pass `true` to connect the last vertex back to the first.
   */
  drawPoly(points: ArrayLike<number>, closed?: boolean): Graphics;
  /** Draws an anti-aliased polygon outline. */
  drawPolyAA(points: ArrayLike<number>, closed?: boolean): Graphics;
  /** Draws a filled polygon from a flat vertex array `[x1,y1,x2,y2,...]`. */
  fillPoly(points: ArrayLike<number>, closed?: boolean): Graphics;
  /** Draws a filled anti-aliased polygon. */
  fillPolyAA(points: ArrayLike<number>, closed?: boolean): Graphics;
  /**
   * Draws an image (sprite) with its top-left corner at x, y.
   *
   * Prefer one bitmap draw over many `fillRect` calls when rendering
   * sprites; a single `drawImage` is far cheaper than 10+ primitive calls.
   */
  drawImage(
    image: GraphicsImage,
    x?: number,
    y?: number,
    options?: DrawImageOptions,
  ): Graphics;
  /** Returns `{ width, height }` (and bpp info) for an image. */
  imageMetrics(image: GraphicsImage): {
    width: number;
    height: number;
    bpp?: number;
    frames?: number;
  };
  /** Reads the color index of a single pixel. */
  getPixel(x: number, y: number): number;
  /** Sets a single pixel to the given (or current) color. */
  setPixel(x: number, y: number, color?: number): Graphics;
  /**
   * Restricts all subsequent drawing to the given rectangle. Reset via
   * {@link Graphics.reset} or by setting the clip rect to the full screen.
   */
  setClipRect(x1: number, y1: number, x2: number, y2: number): Graphics;
  /** Scrolls the display contents by the given offset. */
  scroll(xOffset: number, yOffset: number): Graphics;
  /**
   * Returns the bounding rectangle modified since the last call, or
   * `undefined` if nothing changed.
   *
   * @param reset Pass `true` to clear the modified region afterwards.
   */
  getModified(
    reset?: boolean,
  ): { x1: number; y1: number; x2: number; y2: number } | undefined;
  /** Display width in pixels (480 on the Pip-Boy 3000). */
  getWidth(): number;
  /** Display height in pixels (320 on the Pip-Boy 3000). */
  getHeight(): number;
  /** Number of bits per pixel of this Graphics instance. */
  getBPP(): number;
  /**
   * Resets graphics state (color, font, alignment, clip rect) to defaults.
   * Useful when transitioning between visually unrelated screens.
   */
  reset(): Graphics;
  /**
   * Sends the frame buffer to the display (calls `Pip.blitScreen`
   * internally). Pair with `Pip.lastFlip = getTime()` so the OS timer skips
   * its next auto-blit; only needed when the app drives its own rendering,
   * as interval-driven apps are already covered by the 50ms auto-flush.
   */
  flip(all?: boolean): void;
  /**
   * The raw frame buffer as an ArrayBuffer. Holotapes stream large
   * background images from disk directly into `new Uint8Array(h.buffer)`.
   */
  buffer: ArrayBuffer;
  /**
   * Returns this Graphics instance's contents as an image object (or
   * compact string) usable with {@link Graphics.drawImage}.
   */
  asImage(type?: 'object' | 'string'): GraphicsImage;
  /** Returns the bounding box of the drawn content. */
  asBMP?(): string;
  /** Moves the line-drawing cursor without drawing. */
  moveTo(x: number, y: number): Graphics;
  /** Draws a line from the cursor to the given point. */
  lineTo(x: number, y: number): Graphics;
}

/** Static Graphics constructor/utilities. */
interface GraphicsConstructor {
  /**
   * Creates an off-screen Graphics instance backed by an ArrayBuffer.
   *
   * @param options `msb: true` matches the Pip-Boy's native bit ordering.
   */
  createArrayBuffer(
    width: number,
    height: number,
    bpp: number,
    options?: {
      zigzag?: boolean;
      vertical_byte?: boolean;
      msb?: boolean;
      interleavex?: boolean;
      buffer?: ArrayBuffer | Uint8Array;
    },
  ): Graphics;
  /** Creates a Graphics instance that calls your function per pixel. */
  createCallback(
    width: number,
    height: number,
    bpp: number,
    callback:
      | ((x: number, y: number, color: number) => void)
      | {
          setPixel: (x: number, y: number, color: number) => void;
          fillRect?: (
            x1: number,
            y1: number,
            x2: number,
            y2: number,
            color: number,
          ) => void;
        },
  ): Graphics;
  /** Creates an image object from a string (see Espruino image format). */
  createImage(str: string): GraphicsImage;
}

/** The Espruino Graphics class. */
declare const Graphics: GraphicsConstructor;

/**
 * The Pip-Boy screen's Graphics instance (480x320, 4bpp, double-buffered).
 *
 * Always draw through this global directly; never alias it to a local
 * variable (each alias wastes a scarce Espruino variable block).
 */
declare const h: Graphics;

/**
 * Secondary alias for the screen Graphics instance provided by the
 * firmware. Prefer {@link h} in holotape code; `g` appears in firmware
 * snippets (e.g. palette examples in the official docs).
 */
declare const g: Graphics;
