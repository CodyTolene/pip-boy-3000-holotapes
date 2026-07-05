# Agents.md — LLM Instructions for Holotape Development & Review

This file governs how LLM-powered agents behave when generating holotape code or auditing merge requests in this repository. Follow these rules strictly.

---

## Table of Contents

- [1. Project Context](#1-project-context)
- [2. Holotape File Structure](#2-holotape-file-structure)
- [3. Code Generation Rules](#3-code-generation-rules)
- [4. Registration & Metadata](#4-registration--metadata)
- [5. Review & Audit Rules](#5-review--audit-rules)
- [6. Anti-Patterns (Do Not Generate)](#6-anti-patterns-do-not-generate)
- [7. Build & Minification Process](#7-build--minification-process)

---

## 1. Project Context

- **Platform:** Pip-Boy 3000 replica device running Espruino (a JavaScript interpreter for microcontrollers).
- **Display:** 480×320 pixels.
- **Input:** Two scroll wheels (knob1 / knob2). Press events are handled either via `setWatch` on `ENC1_PRESS` or by checking for `dir === 0` in the knob1 handler — both patterns are used in production code.
- **Memory:** Extremely constrained. Every variable allocation consumes a scarce block. Minimize declarations. Hardcode constant values (screen dimensions, magic numbers) rather than assigning them to variables. Single-use expressions should be inlined.
- **Language:** JavaScript (Espruino subset — supports `class`, arrow functions, `Promise`, typed arrays, `Math.randInt`, `E.clip`, `E.defrag`, etc. Does NOT support ES6+ modules, `async`/`await`, or template literals).
- **Graphics API:** Global `h` object with method chaining (`h.setColor(n).setFontMonofonto16().drawString(...)`). Double-buffered. The device auto-flushes periodically. For dynamic apps (games, animations) that need immediate display updates, use `h.flip()` followed by `Pip.lastFlip = getTime()` to force an instant refresh. See [Espruino Graphics Reference](https://www.espruino.com/Reference#Graphics) for all available methods.
- **Sound:** `Pip.audioStart(path)` and `Pip.audioStartVar(buffer, options)` for WAV playback; `Pip.playSound('TAB' | 'SCROLL')` for simple UI sounds.
- **Pip API:** All available methods documented at [RobCo Pip-Boy 3000 API](https://robco-industries.org/documentation/pipboy/3000/api).

---

## 2. Holotape File Structure

Every holotape directory under `holotapes/` must contain:

```
holotapes/<YourHolotape>/
├── app.js          # Source code (unminified)
├── app.min.js      # Minified version (manually or tool-generated)
├── metadata.json   # Registration entry for the build system
├── README.md       # Description, controls, installation, credits
├── ChangeLog       # Version history with dates and PR links
└── assets/         # Images, sounds, icons, data files
    └── ...
```

**Rules:**

- `app.min.js` must be functionally identical to `app.js` — only whitespace, comments, and variable mangling differ.
- `metadata.json` icon and preview paths are relative to the holotape directory (e.g. `assets/myicon.png`). The build script automatically rewrites these to `holotapes/`-relative paths.
- `ChangeLog` format (one entry per version):
  ```
  <version> (<yyyy-mm-dd>)
  <PR-or-changelink>
  - <change description>
  ```

---

## 3. Code Generation Rules

When writing or modifying `app.js`, the agent **must** follow every rule below. Violations are rejected during review.

### 3.1 IIFE Wrapping

The entire app must be wrapped in an **anonymous function expression** (IIFE). This scopes all variables away from the global namespace.

```js
(function() {
  // All code here
});
```

**Do NOT** invoke the IIFE immediately — the Pip-Boy OS invokes it. **Do NOT** add trailing `()`. Note the style: no space between `function` and `()` — this is the convention used in production holotape code.

### 3.2 Required Return Object

The IIFE must return an object with at minimum an `id` and `remove`:

| Field    | Type       | Required | Description                                      |
|----------|------------|----------|--------------------------------------------------|
| `id`     | `string`   | Yes      | Uppercase alphanumeric ID (no spaces/hyphens)    |
| `remove` | `function` | Yes      | Cleanup function (see [3.3](#33-remove-function))|

Optional fields like `notDefault`, `fullscreen` may be added as needed. These are handled by `Pip.CURRENT`:
- `notDefault: true` — pressing any mode button navigates away to the original app.
- `fullscreen: true` — hides OS headers and footers.

Do not waste a variable on `APP_ID` — put the string literal directly in the return object.

```js
return {
  id: "MYAPP",
  notDefault: true,
  fullscreen: true,
  remove : function() {
    clearInterval(frameInterval);
    Pip.removeListener("knob1", onKnob1);
    Pip.removeListener("knob2", onKnob2);
    clearWatch(clickWatch);
    Pip.audioStop();
  }
};
```

### 3.3 `remove()` Function

The `remove` function **must** clean up anything the app created that could leak into other apps or the OS:

1. Remove all `Pip.on` / `Pip.onExclusive` listeners.
2. Clear all `setInterval` / `setTimeout` handles.
3. Clear all `setWatch` handles.
4. Call `Pip.audioStop()` if the app plays audio.
5. Call `h.clear()` if the app scribbled over non-app screen content (optional for fullscreen apps).

It does **not** need to guard against double removal (no `removed` flag needed).

**Critical:** The `remove` function must **never** call `load()` or `E.reboot()`. The app must exit cleanly so the Pip-Boy OS can restore the state that existed before the app was invoked. Rebooting the device on exit is poor practice and disrupts the user experience.

The `remove` function can be declared as a named function or inlined in the return object:

```js
return {
  id: "MYAPP",
  notDefault: true,
  fullscreen: true,
  remove : function() {
    clearInterval(frameInterval);
    clearInterval(gameInterval);
    Pip.removeListener("knob1", onKnob1);
    Pip.removeListener("knob2", onKnob2);
    clearWatch(clickWatch);
    Pip.audioStop();
    h.clear();
  }
};
```

### 3.4 Variable Declarations

- Use `const` for constants, `let` for mutable variables. **Never use `var`** — while `var` inside an IIFE doesn't leak globally, it still wastes variable blocks unnecessarily and `const`/`let` are clearer.
- **Espruino does NOT block-scope `let`/`const`.** A `for (let i = 0; ...)` loop variable leaks to function scope and behaves like `var`. Never reuse a name inside a block if a variable of the same name is still needed after the block; the inner assignment clobbers the outer value. This also constrains minification (see [7.1](#71-minification)).
- **Minimize the number of variables declared.** Every variable consumes a scarce Espruino block. If a value never changes (e.g. screen dimensions, grid sizes), hardcode the literal number instead of assigning it to a constant.
- **Screen dimensions are constant.** Use `const W = h.getWidth(), H = h.getHeight()` — the display never changes size at runtime. Do NOT declare `W`/`H` as `let` and reassign them in a `resetGame()` function.
- Do not declare an `APP_ID` constant — put the ID string directly in the return object.
- Do NOT create a local alias for `h` (e.g. `let C = h`). Always reference the global `h` object directly. This saves a variable block and follows the chaining convention in §3.5.
- Group related constants into a single object (`const C = { ... }`) rather than declaring many individual `const`s.

### 3.5 Graphics (`h`) Usage

- Always chain methods on the global `h` object: `h.setColor(n).setFontMonofonto16().setFontAlign(x, y).drawString(text, x, y)`.
- **`h.flip()` followed by `Pip.lastFlip = getTime()` is an optimization for apps that use `Pip.onFrame`-style callbacks** (where the OS timer drives rendering). The flip sends the frame buffer to the display, and setting `Pip.lastFlip` tells the OS timer to skip its next auto-blit. For apps driven by `setInterval` (most games), the default OS auto-flush every 50ms is already synchronized and explicit `flip()` is unnecessary — adding manual flips causes tearing because they fire at arbitrary times relative to display scanout. Only use explicit `h.flip()` when you are driving rendering from `Pip.onFrame`, not `setInterval`.
- For apps that DO need manual flips, set `Pip.lastFlip = getTime()` **before** drawing to suppress the OS auto-flip during the draw phase, then call `h.flip()` **after** all drawing is complete to send the finished frame.
- **Minimize pixels written per frame.** Every pixel written adds latency. Use targeted clearing with `h.clearRect()` and dirty flags to only redraw changed regions.
- Dirty flag pattern — set a flag when something changes, then redraw only flagged sections:
  ```js
  let redrawHeader = 0, redrawList = 0;

  function onFrame() {
    // ... game logic, set flags when state changes ...
    if (redrawHeader) drawHeader();
    if (redrawList) drawList();
    h.flip();
    Pip.lastFlip = getTime();
  }
  ```
- Available color indices (4bpp): `0` (black), `1` (grey), `2` (grey), `3` (white). Negative values like `-1` act as transparent/no-op in some contexts (e.g. `h.setColor(-1)`).
- **`h.setColor(n)` persists globally** — once set, all subsequent draw calls use that color until changed, even across unchained statements and function boundaries. Always explicitly set the color before any draw operation where the color matters.
- Available fonts: `Fixedsys16`, `Monofonto14`, `Monofonto16`, `Monofonto18`, `Monofonto23`, `Monofonto28`, `Monofonto36`, `Monofonto96`, `Monofonto120`, plus custom fonts via `h.setFont(name)`. Both `h.setFont("Monofonto14")` and `h.setFontMonofonto14()` forms are valid.
- `h.wrapString(text, maxWidth)` wraps text to a given width, returning an array of lines. Pre-wrap and cache the result rather than re-wrapping on every frame — text wrapping is expensive.
- `h.setBgColor(index)` sets the background color for subsequent text drawing. Also controls the fill color used by `h.clearRect()`.
- `h.setClipRect(x1, y1, x2, y2)` restricts all drawing to the given bounding box. Use it to prevent overdraw when rendering within a sub-region.
- `Pip.blitOptions.y1` / `Pip.blitOptions.y2` can be set before `h.flip()` to perform a **partial screen update** — only the rows between `y1` and `y2` are sent to the display. This is a major optimization for scrollers and lists:
  ```js
  Pip.blitOptions.y1 = renderTop;
  Pip.blitOptions.y2 = renderBtm;
  h.flip();
  Pip.lastFlip = getTime();
  delete Pip.blitOptions.y1; // revert to full-screen updates
  delete Pip.blitOptions.y2;
  ```
- `setFontAlign(x, y)`: `-1` = left/top, `0` = center, `1` = right/bottom.
- Use `Pip.shadeBox(x1, y1, x2, y2)` for highlighted/selected areas.
- `h.drawImage(image, x, y, options)` supports rotation and scaling via `{rotate: radians, scale: factor}`.
- `h.drawLineAA(x1, y1, x2, y2)` draws anti-aliased lines.
- `h.imageMetrics(image)` returns `{width, height}` — avoids manual dimension tracking.
- `h.reset()` resets all graphics state — used by skilled developers when transitioning between drastically different screens.
- `h.buffer` provides direct access to the frame buffer as a `Uint8Array` for bulk pixel operations (e.g., streaming images from disk).

### 3.6 Input Handling

- Use `Pip.on('knob1', callback)` or `Pip.onExclusive('knob1', callback)` for the left scroll wheel.
- Use `Pip.on('knob2', callback)` or `Pip.onExclusive('knob2', callback)` for the right scroll wheel.
- `Pip.on` adds a handler without removing others. `Pip.onExclusive` removes any other handlers and ensures the registered one is the sole listener — this is the preferred default. Use `Pip.on` only when you need multiple handlers on the same input.
- The knob callback receives a direction integer:
  - `1` — down / clockwise rotation.
  - `-1` — up / counter-clockwise rotation.
  - `0` — press event. The OS may also pass a second parameter: `true` for a long press, `undefined`/`false` for a normal press. Handle long presses by checking the second argument: `function onKnob1(dir, long) { if (dir === 0 && long) { ... } }`.
- **`setWatch` on `ENC1_PRESS`** is a specialized pattern for cases where press detection needs to be extremely responsive (e.g., shooting in a game). For most apps the `dir === 0` event via `Pip.on`/`Pip.onExclusive` is sufficient. For buttons that lack a `Pip.on` event (e.g. `BTN_DATA`), `setWatch` with `edge: 'rising'` is appropriate — this is the exception, not the default.
- Remove all listeners in `remove()` via `Pip.removeListener` and `clearWatch`.

```js
function onKnob1(dir) {
  if (dir) {
    // Scroll event — navigate, adjust value, etc.
  } else {
    // dir === 0 — press/confirm event
  }
}

Pip.on("knob1", onKnob1);
```

### 3.7 Game Loop & Frame Timing

Use a `setInterval` at your app's target frame rate (e.g. 50ms) to drive animation and game logic.

```js
let frameInterval = setInterval(onFrame, 50, h);
```

- Pass the graphics context `h` as an argument to avoid closure lookups.
- The frame callback is the central update point: process inputs, update game state, redraw changed regions, call `h.flip()`.
- Do NOT use `requestAnimationFrame` — it is not available on Espruino.
- Some apps also use a secondary `setInterval` for slower periodic logic (e.g. spawning enemies once every few seconds).
- Always clear all intervals in `remove()`.

### 3.8 The `"ram"` and `"jit"` Directives

For performance-critical functions, add a directive string as the first statement:

- **`"ram"`** — executes the function from RAM instead of flash. Also triggers automatic pretokenisation (whitespace stripped, tokens converted to numeric values for 10-20% speed improvement). Note: pretokenised functions lose source-level line numbers in stack traces.
- **`"jit"`** — enables JIT (Just-In-Time) compilation of the function to native ARM code. Significantly faster for math-heavy loop code. If a function cannot be JIT compiled, it falls back to plain JS execution without error.

```js
function onFrame(h) {  "ram";
  // game logic
}

function drawTicks() {  "jit";
  // math-heavy loop code - much faster than ram alone
}
```

**JIT details:**
- JIT collects all variable lookups at the start of the function. If you use `digitalWrite` multiple times, it is only searched for once. Under JIT, `digitalWrite(pin, X)` may be faster than `pin.write(X)` because method lookups are costlier.
- JIT does not fold constant arithmetic (`1 + 2` stays `1 + 2`, not `3`).
- JIT is intended for small, self-contained functions — not entire apps.
- Functions can be dynamically generated with `eval()` and then JIT compiled: `eval('(function() { "jit"; return ' + expr + '; })')`.
- Debug JIT output: `E.setFlags({jitDebug: 1})` shows the generated assembly.
- Use `"jit"` for tight numeric loops. Use `"ram"` for the main frame loop. Only one directive per function — `"jit"` takes priority if both apply.

**Whitespace matters:** Espruino executes directly from source. Whitespace and comments inside loop bodies cost time on every iteration. Keep comments outside hot loops and minimize whitespace between loop statements.

### 3.9 Sound, Volume & Brightness

- `Pip.playSound('TAB')` — confirm/select sound.
- `Pip.playSound('SCROLL')` — navigation/scroll sound.
- `Pip.playSound('SELECT')` — alternate select sound.
- `Pip.playSound('HIGHLIGHT')` — value-change highlight sound.
- `Pip.audioStart(path)` — start playing a WAV file from storage. Supports looping with `{repeat: true}`. **Note:** `Pip.audioStart()` automatically stops any currently-playing audio — there is no need to call `Pip.audioStop()` before starting a new sound.
- `Pip.audioStartVar(buffer, options)` — start playing an in-memory audio buffer. Options include `{encoding: "adpcm", sampleRate: 8000, blockAlign: 256, overlap: true}`.
- `Pip.audioRead(path)` — load a WAV file into an in-memory buffer for rapid replay. Pass an optional object as the second parameter to receive `encoding` and `blockAlign` values for `Pip.audioStartVar`.
- `Pip.audioBuiltin(name)` — returns a byte array for a built-in sound (`"OK"`, `"OK2"`, `"PREV"`, `"NEXT"`, `"COLUMN"`, `"CLICK"`). Use with `Pip.audioStartVar`.
- `Pip.typeText(text, x, y, W, H, fontName)` — typewriter-style text reveal effect. Returns a `Promise` that resolves when complete. Default font is `"Monofonto16"`. Note the uppercase `W` and `H` parameters.
- `Pip.audioStop()` — immediately stop all audio playback.
- `Pip.setVol(volume)` — set output volume, range `0`-`33` (the firmware's own settings UI stays within `3`-`27`).
- `Pip.setBrightness(v)`: set screen brightness; `v` is a float from roughly `0.001` (near off) to `1` (max). The current value is readable as the property `Pip.brightness` (guard with `typeof Pip.brightness === "number"`).
- **Scale gotcha:** `Pip.settings.brightness` is the firmware UI integer scale `1`-`20`, NOT the `0`-`1` float scale used by `Pip.setBrightness()`. Never feed one into the other. For capture/restore, read and write the live `Pip.brightness` float so the values stay self-consistent. `Pip.settings.volume` is an integer `3`-`27` and IS directly compatible with `Pip.setVol()`.
- If an app changes brightness or volume, capture the initial values on load (`Pip.brightness` for brightness, `Pip.settings.volume` for volume) and restore them in `remove()` so in-app changes are session-only and never override the system settings after exit.

### 3.10 Math & Utilities

- `Math.randInt(n)` — returns a random integer in `[0, n-1]`. Use instead of `Math.floor(Math.random() * n)`.
- `E.clip(value, min, max)` — clamp a value between min and max.
- `E.defrag()` — defragment memory. Call before loading large assets.
- `Math.atan2(y, x)` — available for angle calculations.
- `Math.sqrt()`, `Math.sin()`, `Math.cos()` — all standard Math functions are available.

### 3.11 App Initialization

**Declaration order is critical: Espruino does NOT hoist function declarations.** Statements run strictly in source order, and a `function name() {}` only exists once its declaration line has executed. Referencing a function by name before that line runs (calling it, or passing it to `setInterval`, `setTimeout`, `Pip.on`, `Pip.onExclusive`, `setWatch`, etc.) throws `ReferenceError: "name" is not defined` on the device. Declare ALL functions first, then put initialization and side-effect code (listener registration, intervals, the first `draw()`) at the bottom of the file. Node and browsers DO hoist, so this bug is invisible to any off-device syntax check or simulation; it only surfaces on real hardware. Exception: a not-yet-declared function may safely be referenced inside a callback body that runs later (for example inside a `setTimeout(fn, 0)` callback), because the whole file has finished executing by the time the callback fires. Only the first synchronous pass through the file is affected.

App initialization code runs at the top level of the IIFE. There is no requirement for a `start()` function. Common initialization patterns:

1. Declare state variables and constants.
2. Call `Pip.audioStop()` to ensure a clean audio state.
3. Load initial screen assets (stream from disk if needed).
4. Register input handlers.
5. Draw the initial screen.
6. Start the frame interval.

For loading large assets (images, sounds), defer the work to the event loop using `setTimeout(callback, 0)` so the app initializes and returns its object first.

```js
setTimeout(() => {
  E.defrag();
  IM = eval(require("fs").readFileSync("HOLO/MYAPP/APP_IMG.JS"));
  SND = {
    fire: Pip.audioRead("HOLO/MYAPP/FIRE.WAV"),
  };
}, 0);
```

### 3.12 Asset Loading & Streaming

- Load assets from the SD card using `require("fs").readFileSync(path)`.
- For large images, stream directly into the frame buffer using `E.openFile()` and `Uint8Array`:
  ```js
  let f = E.openFile("HOLO/MYAPP/MYIMAGE.IMG", "r");
  let a = new Uint8Array(h.buffer);
  let b = f.read(2048);
  while (b) {
    a.set(b, offset);
    offset += b.length;
    b = f.read(2048);
  }
  f.close();
  ```
- Use `eval()` to parse JSON-like data files: `eval(require("fs").readFileSync(path))`.
- Use `JSON.parse()` / `JSON.stringify()` for settings and save data.

### 3.13 Targeted Redrawing with Dirty Flags

Rather than redrawing the entire screen every frame, use boolean/integer flags to track which regions need updating:

```js
let redrawHeader = 0, redrawBody = 0;

function onFrame(h) {  "ram";
  // ... update game state, set flags when something changes ...
  if (playerMoved) redrawBody = 1;
  if (scoreChanged) redrawHeader = 1;

  if (redrawHeader) drawHeader();
  if (redrawBody) drawBody();

  h.flip();
  Pip.lastFlip = getTime();
}
```

This minimizes pixel writes and keeps latency low.

### 3.14 Debounced Rendering

For continuous inputs like knob scrolling, debounce the redraw so it only fires after movement settles:

```js
let drawTimeout;
function onKnob2(dir) {
  value = E.clip(value + dir, min, max);
  if (drawTimeout) clearTimeout(drawTimeout);
  drawTimeout = setTimeout(function() {
    drawTimeout = undefined;
    draw();
    h.flip();
    Pip.lastFlip = getTime();
  }, 10);
}
```

### 3.15 Method Binding for Tight Loops

In performance-critical loops with many iterations, bind graphics methods to local variables to avoid repeated property lookups. Only do this for loops with 50+ iterations — for small loops the variable block cost outweighs the lookup savings:

```js
function drawTicks() {  "jit";
  let r = h.fillRect.bind(h);
  for (let i = 0; i < 100; i++) r(x, y, x + w, y + 1);
}
```

### 3.16 Menu Pattern

Menus are a common UI pattern. A well-structured menu returns `{ draw, select, move, remove }` and supports actions, toggles, and numeric editing:

```js
function showMenu(items) {
  let options = items[""], menuItems = Object.keys(items).filter(k => k !== "");
  const menu = {
    draw() { /* draw title + each item with highlight/shadeBox */ },
    select() {
      const item = items[menuItems[options.selected]];
      if (typeof item === "function") item(menu);
      else if (item.value !== undefined) { /* toggle bool, or enter edit for numeric */ }
    },
    move(dir) {
      if (menu.selectEdit) { /* modify numeric value */ }
      else options.selected = E.clip(options.selected + dir, 0, menuItems.length - 1);
      menu.draw();
    },
    remove() { Pip.removeListener("knob1", onKnob1); }
  };
  function onKnob1(dir) { if (dir) menu.move(dir); else menu.select(); }
  Pip.onExclusive("knob1", onKnob1);
  menu.draw();
  return menu;
}
```

The `""` key holds options: `{ title, selected, rowHeight, wrapSelection, predraw }`. Menu items are functions (actions) or objects with `value` (booleans toggle, numbers edit inline with `min`/`max`/`step`/`onchange`). Confirmation dialogs are just a sub-menu: `{ "": { title: "Delete?", back: fn }, Yes: fn }`.

**Text entry:** there is no global firmware keyboard API for holotapes to call; even the firmware's bundled holotapes ship their own. You can copy the firmware's `showTextEntry` design instead: a KEYMAP grid of 4 rows by 14 columns (lower/upper variants, with control characters `\b` backspace, `\x02` shift, `\x03` enter), where knob2 selects the column, knob1 selects the row and its press types the key, long press repeats, and a `setInterval` blinks the cursor (clear that interval on remove). The callback receives the final text on Enter.

### 3.17 Text Wrapping & Caching

Text wrapping via `h.wrapString()` is expensive on constrained hardware. Always pre-wrap and cache the result:

```js
let cache = [];
const getItem = (i) => {
  if (cache[i]) return cache[i];
  const txt = h.setFont("Monofonto14").wrapString(items[i].txt, maxWidth);
  return (cache[i] = { txt, h: 10 + 14 * txt.length });
};
```

Store the pre-computed height alongside the wrapped lines. This avoids re-measuring on every scroll/layout pass.

### 3.18 Image Format & Conversion

All images used by holotapes must be **bitmaps at a maximum of 4 bits per pixel (4bpp)**. Larger images or higher bit depths waste scarce storage and memory.

**Prefer bitmaps over procedural drawing for sprites.** Drawing a sprite with many individual `fillRect`/`drawLine` calls (e.g. 10+ calls per frame for a small character) is wasteful — each call adds overhead. A single `h.drawImage(bitmap, x, y)` call replaces all of them. If the sprite has animated parts, draw a static base as a bitmap and overlay only the animated portions procedurally, or use a multi-frame bitmap with the `{frame: n}` option.

- Convert images using the online [Espruino Image Converter](https://www.espruino.com/Image+Converter) or the [Pip-Boy.com Image Converter](https://www.pip-boy.com/tools/image-converter).
- Alternatively, use the [imageconverter.js](https://github.com/espruino/EspruinoWebTools/blob/master/imageconverter.js) tool programmatically.
- The converter outputs a format that can be loaded via `eval(require("fs").readFileSync(...))` or `require(...)`.

Images can be defined **inline** in the app code or stored as **separate files** on the SD card:

```js
// Inline — embedded directly in app code (small sprites)
const sprites = { block: atob('...'), icon: atob('...') };
h.drawImage(sprites.icon, 120, 80);

// External file — loaded from SD card (larger assets, loaded once)
const IM = eval(require("fs").readFileSync("HOLO/MYAPP/APP_IMG.JS"));
h.drawImage(IM.icon, 120, 80);

// Streaming — for large background images, stream directly to frame buffer
let f = E.openFile("HOLO/MYAPP/TITLE.IMG", "r");
let a = new Uint8Array(h.buffer);
let b = f.read(2048), offset = 0;
while (b) { a.set(b, offset); offset += b.length; b = f.read(2048); }
f.close();
```

### 3.19 Audio & Video Format

All audio and video assets must follow these constraints:

**Audio (.wav):**
- Single channel (mono).
- 16 kHz sample rate (`-ar 16000`).
- PCM (`pcm_s16le`) or ADPCM (`adpcm_ima_wav`). Prefer ADPCM — it produces much smaller files.

```sh
# PCM audio
ffmpeg -i "input.mp3" -ac 1 -ar 16000 -sample_fmt s16 -c:a pcm_s16le -f wav output.wav
```

**Video (.avi):**
- Max 480px wide (display width), scaled proportionally.
- Grayscale (`format=gray`).
- 12 fps (`-r 12`).
- MS RLE codec (`-c:v msrle`), 8-bit paletted (`-pix_fmt pal8`).
- Audio: ADPCM mono 16 kHz (`-c:a adpcm_ima_wav -ac 1 -ar 16000`).

```sh
# AVI video
ffmpeg -i "input.mp4" -vf "scale=480:-1,format=gray,format=rgb555le" \
  -r 12 -c:v msrle -pix_fmt pal8 \
  -c:a adpcm_ima_wav -ac 1 -ar 16000 output.AVI
```

**Video playback:**

- `Pip.videoStart(path, { x, y, repeat })` plays an AVI, non-blocking. For a full-screen 480×320 clip use `{ x: 0, y: 0 }` (the firmware's BOOT.avi uses `x: 40` only because that clip is narrower than the screen).
- `Pip.on("videoStopped", cb)` fires when the clip finishes. Pair with `Pip.removeListener("videoStopped", cb)` in cleanup.
- `Pip.videoStop()` stops playback early. When skipping, remove the `videoStopped` listener BEFORE calling `videoStop()` so a synchronous stop event cannot re-trigger your transition.
- Audio is separate: start the matching WAV with `Pip.audioStart(path)` alongside `videoStart`, and stop both together.
- Always provide a knob-press skip path. A clip that fails to decode may never fire `videoStopped`, so the user must be able to escape.
- **Format gotcha:** only MS RLE AVI decodes on-device. An mpeg4/yuv420p AVI will NOT play.
- **Size gotcha:** MS RLE is lossless run-length encoding, so detailed or noisy grayscale content produces huge files (a plain `pal8` palette can reach 256 colors and an 8 MB file for a few seconds of video). Constrain the palette to about 16 gray levels with no dithering (dithering breaks RLE runs and bloats size) to cut file size roughly 2.6x:

  ```sh
  ffmpeg -i in.avi -vf "format=gray,split[a][b];[a]palettegen=max_colors=16:reserve_transparent=0[p];[b][p]paletteuse=dither=none" \
    -c:v msrle -c:a adpcm_ima_wav -ac 1 -ar 16000 out.avi
  ```

  For reference, the device's own boot animation is 2.65 MB (385×320, 12 fps, 10.6 s), so a ~3 MB full-screen intro is normal and playable.

---

## 4. Registration & Metadata

### 4.1 `metadata.json` Schema

```json
{
  "id": "myholotape",
  "name": "My Holotape Name",
  "author": "@your-username",
  "version": "1.0.0",
  "description": "A brief description of the holotape.",
  "icon": "assets/my-icon.png",
  "previews": [],
  "type": "game",
  "readme": "README.md",
  "storage": [
    { "name": "HOLO/MYAPP/APP.JS", "url": "app.min.js" }
  ],
  "storageOptional": []
}
```

**Validation rules for `metadata.json`:**

| Field             | Rules                                                                 |
|-------------------|-----------------------------------------------------------------------|
| `id`              | Lowercase alphanumeric + hyphens only. Must be unique in registry.    |
| `name`            | Human-readable name for display on pip-boy.com.                      |
| `author`          | GitHub username(s) prefixed with `@`. Separate multiple with spaces.  |
| `version`         | [Semver](https://semver.org/) format.                                |
| `description`     | Short, one-sentence description.                                     |
| `icon`            | Path relative to the holotape's directory. Must be a PNG.            |
| `previews`        | Array of paths (PNG, MP4, or GIF) relative to the holotape directory.|
| `type`            | Must be exactly `"app"` or `"game"`. No other values allowed.        |
| `readme`          | Usually `"README.md"`.                                               |
| `storage`         | Array of `{ name, url }` objects. `name` is the Espruino storage path (e.g. `HOLO/MYAPP/APP.JS`). `url` is the file path relative to the holotape directory. |
| `storageOptional` | Same shape as `storage`. Optional files the user can choose to install. |

### 4.2 Storage Name Convention

`name` fields in storage entries follow the pattern `HOLO/<APP_ID>/<FILENAME>` where `<APP_ID>` is derived from the metadata `id` converted to uppercase (underscores replace hyphens).

The `APP_ID` in storage names has no relationship to any JavaScript variable — it is purely a filesystem path convention. Do not declare an `APP_ID` constant in code.

---

## 5. Review & Audit Rules

When an LLM agent audits a pull request or holotape submission, it **must** check every item below. Flag any violation with the rule reference number.

### 5.1 Mandatory Checks (Hard Requirements)

| #   | Check                                                              | How to Verify                                                          |
|-----|---------------------------------------------------------------------|------------------------------------------------------------------------|
| R01 | IIFE wrapping, no trailing `()` invocation.                        | Read `app.js` — must start with `(function() {` and end with `});`     |
| R02 | Return object has `id` (string) and `remove` (function).           | Find the `return` statement before the closing `});`.                  |
| R03 | All `Pip.on`/`Pip.onExclusive` listeners cleared in `remove()`.    | Cross-reference every registration — each must have a matching `Pip.removeListener`. |
| R04 | All `setInterval`/`setTimeout` handles cleared in `remove()`.      | Cross-reference every timer — each must have a `clearInterval`/`clearTimeout`. |
| R05 | All `setWatch` handles cleared in `remove()`.                      | Every `setWatch` must have a matching `clearWatch`.                    |
| R06 | `metadata.json` type is `"app"` or `"game"`.                       | Validate the `type` field.                                             |
| R07 | `metadata.json` has valid semver version.                          | Check `version` field format.                                          |
| R08 | `app.min.js` exists and is a minified version of `app.js`.         | Spot-check key identifiers are mangled but structure matches.          |
| R09 | `ChangeLog` exists with at least one entry.                        | Read the file.                                                         |
| R10 | `README.md` exists with controls and description.                  | Read the file.                                                         |
| R11 | No unsupported ES6+ features (no `async/await`, no modules, no template literals). | `grep` for `async`, template literals `` `...` ``. |
| R12 | Uses `Math.randInt(n)`, not `Math.floor(Math.random() * n)`.       | `grep` for `Math.random` — should be zero matches.                     |
| R13 | No OS globals deleted or overwritten.                              | Check for risky assignments to known globals.                          |
| R14 | `metadata.json` storage names follow `HOLO/<ID>/` convention.      | Compare `id` with the storage name prefix. |
| R15 | Input events use `Pip.on`/`Pip.onExclusive` or `setWatch` — no bare `setWatch` on arbitrary pins. | Verify all watches are on `ENC1_PRESS` and all knob handlers use `Pip.on`/`Pip.onExclusive`. |

### 5.2 Soft Checks (Recommendations)

| #   | Check                                                              | Rationale                                                                 |
|-----|---------------------------------------------------------------------|---------------------------------------------------------------------------|
| S01 | Dirty flag pattern for targeted redrawing.                         | Avoids full-screen redraws on every frame; reduces latency.               |
| S02 | `"ram"` directive on performance-critical functions.               | Faster execution from RAM vs flash.                                       |
| S03 | Heavy asset loading deferred with `setTimeout(0)`.                 | Prevents blocking the event loop during initialization.                   |
| S04 | `E.defrag()` called before loading large assets.                   | Maximizes contiguous free memory for large allocations.                   |
| S05 | No unnecessary variable allocations (single-use values inlined).   | Every variable consumes a block; hardcode constants where possible.       |
| S06 | App can be opened and closed multiple times without crashing.      | Verifies `remove()` correctly resets all state.                           |
| S07 | Grouped constants object rather than many individual declarations. | Reduces variable block count.                                             |
| S08 | Images are ≤ 4bpp bitmaps converted via Espruino Image Converter. | Higher bit depths waste storage and memory; use the converter.             |

### 5.3 Review Procedure

For each PR, the LLM agent should:

1. **List all changed files** — identify new/modified holotapes.
2. **For each new/modified holotape, run through all Mandatory Checks (R01–R15).**
3. **Flag any failures** with the specific rule ID and a one-line explanation.
4. **Run through Soft Checks (S01–S08)** and note recommendations without blocking the PR.
5. **Verify `metadata.json` produces a valid registry entry** by confirming the `id`, storage name, and file paths are consistent.
6. **Provide a summary:** Pass/Fail/Pass-with-notes.

**Review output template:**

```markdown
## Holotape Review: `<Holotape Name>`

### Mandatory Checks
- [x] R01 — IIFE wrapped, no `()` invocation
- [ ] R02 — Missing `id` or `remove` in return object
- ...

### Soft Checks
- [x] S01 — Dirty flags used for targeted redraw
- [ ] S05 — Unnecessary variable allocation for single-use value
- ...

### Verdict: **FAIL** — 1 mandatory check failed.
```

---

## 6. Anti-Patterns (Do Not Generate)

The following must **never** appear in generated code:

| Anti-Pattern                         | Why It's Wrong                                                    |
|--------------------------------------|-------------------------------------------------------------------|
| `var` keyword                        | Wastes variable blocks; `const`/`let` are clearer.               |
| `async/await`                        | Not available in Espruino.                                        |
| `fetch()`, `XMLHttpRequest`          | No network APIs on the device.                                    |
| ES modules (`import`/`export`)       | Not supported.                                                    |
| Template literals (backtick strings) | Not supported in Espruino.                                        |
| `Math.random()`                      | Use `Math.randInt(n)` instead — it's faster and deterministic.    |
| `requestAnimationFrame`              | Not available on Espruino.                                        |
| Deleting/reassigning OS globals      | Corrupts the Pip-Boy OS and prevents returning to the menu.       |
| `load()` or `E.reboot()` in `remove()`| Rebooting on app exit is poor practice. Apps must clean up and return to the prior state cleanly — let the OS handle navigation. |
| `Pip.remove()` at top of IIFE         | The Pip-Boy OS cleans up the previous app before invoking a new one. Calling `Pip.remove()` at the top of a new IIFE removes nothing useful and wastes cycles. |
| Bare `clearWatch()` at init            | Clears ALL hardware watches including OS/system watches. The OS restores them, but this is destructive and unnecessary — no app watches exist at init time. |
| `let h_alias = h` or similar           | Always use the global `h` object directly (§3.5). Wrapping it in a local variable wastes a variable block and adds indirection for no benefit. |
| `Pip.audioStop()` before `Pip.audioStart()` | `Pip.audioStart()` automatically stops any currently-playing audio. Calling `Pip.audioStop()` first is redundant. |
| Single-call function wrappers            | `function playSound(n) { Pip.audioStart(n); }` wastes a function block. If a function body is just one call with the same arguments, inline the call at every call site. Only wrap if there is additional logic (debounce, error handling, state tracking). |
| Try/catch that only calls `Pip.errorBox(e)` | Espruino's global uncaught-exception handler already displays an error box for all exceptions. Catching just to re-display the same error adds overhead with no benefit. Only catch if you need custom recovery logic. |
| Referencing a function before its declaration line | Espruino does not hoist function declarations (§3.11). Throws `ReferenceError` on-device. Declare all functions first, init code last. |
| Reusing a `let` name that an outer variable still needs | Espruino's `let` is function-scoped, not block-scoped (§3.4). The inner assignment clobbers the outer value. |
| Global variables outside the IIFE    | Pollutes global namespace; conflicts with other holotapes.        |
| Storing functions in arrays/objects  | Consumes excessive memory blocks on Espruino.                     |
| Deep object/array nesting (>4 levels)| Wastes variable blocks and hurts performance.                     |
| Strings longer than ~256 chars       | Each string consumes a variable block; keep strings short.        |
| Images > 4bpp or unconverted         | Use Espruino Image Converter for 4bpp bitmaps; raw images waste memory. |

---

## 7. Build & Minification Process

The `app.min.js` is produced from `app.js` using a two-pass pipeline:

### 7.1 Minification

Strip whitespace, comments, and shorten identifiers. One suggested tool is [Terser](https://github.com/terser/terser):

```sh
terser app.js -c negate_iife=false,side_effects=false,directives=false -o app.min.js
```

- `negate_iife=false` — preserves the IIFE wrapper (required by rule R01).
- `side_effects=false` — disables dead-code removal that could strip side-effectful calls (e.g. `setWatch`, `Pip.on`).
- `directives=false`: prevents terser from treating the `"ram"` / `"jit"` directive strings (§3.8) as removable no-op expressions. Without it the directives are stripped and the performance benefit is silently lost.

Any minifier that preserves the IIFE structure, keeps the directive strings, and avoids stripping side-effectful calls is acceptable.

**Name mangling (`-m`) caveat:** terser's mangler legitimately reuses identifier names across block scopes, relying on spec-correct block scoping. Espruino treats `let` as function-scoped (§3.4), so a mangled `for(let C=0;...)` can clobber a still-live variable that terser renamed to `C` (classically a function parameter), producing runtime failures like `Function not found!` after the loop. Consequences:

- Files that are **eval'd as modules or data builders** (§3.24) must be built WITHOUT `-m`: keep the `-c` flags above and drop mangling. They load transiently, so the unmangled size has zero resident-RAM cost.
- Mangling the main `app.js` is only safe when every loop either references the would-be-clobbered variable inside the loop body (keeping it live so terser won't reuse the name) or the variable is not used after the loop. When in doubt, don't mangle.
- After minifying an eval'd module file, verify it still starts with `(function(`.

### 7.2 Espruino CLI (Pretokenisation)

Second pass: run the output through the Espruino CLI to pretokenise the source. Pretokenisation converts JavaScript tokens to numeric bytecode for faster parsing and 10–20% execution speed improvement on-device.

```sh
espruino app.min.js --config PRETOKENISE=2 --config SET_TIME_ON_WRITE=false -o app.min.js
```

- `--config PRETOKENISE=2` — strips whitespace and converts tokens to numeric values.
- `--config SET_TIME_ON_WRITE=false` — prevents timestamp embedding for reproducible builds.

**Note:** Pretokenised functions declared with the `"ram"` directive also benefit from automatic pretokenisation at runtime. The CLI pretokenisation step additionally covers code outside `"ram"` functions and strips toplevel whitespace.

---

## Appendix: Quick Reference

### Espruino Graphics (`h`) Method Reference

```js
h.clear(colorIndex);                       // Clear screen with color (0-3)
h.clearRect(x1, y1, x2, y2);              // Clear a specific region
h.setColor(colorIndex);                    // Set drawing color (0-3)
h.setFont(name);                           // Set a custom font by name
h.wrapString(text, maxWidth);              // Wrap text, returns array of lines
h.setBgColor(index);                       // Set background color (0-3)
h.setFontFixedsys16();                     // Fixedsys 16px
h.setFontMonofonto14();                    // Monofonto 14px
h.setFontMonofonto16();                    // Monofonto 16px
h.setFontMonofonto18();                    // Monofonto 18px
h.setFontMonofonto23();                    // Monofonto 23px
h.setFontMonofonto28();                    // Monofonto 28px
h.setFontMonofonto36();                    // Monofonto 36px
h.setFontMonofonto96();                    // Monofonto 96px
h.setFontMonofonto120();                   // Monofonto 120px
h.setFontAlign(x, y);                      // -1/0/1 for x and y
h.drawString(text, x, y);                  // Draw text
h.drawString(text, x, y, true);            // XOR draw (for flicker effects)
h.drawLine(x1, y1, x2, y2);               // Line
h.drawLineAA(x1, y1, x2, y2);             // Anti-aliased line
h.drawRect(x1, y1, x2, y2);               // Rectangle outline
h.fillRect(x1, y1, x2, y2);               // Filled rectangle
h.drawCircle(x, y, rad);                   // Circle outline
h.fillCircle(x, y, rad);                   // Filled circle
h.drawEllipse(x1, y1, x2, y2);            // Ellipse outline (bounding box)
h.fillEllipse(x1, y1, x2, y2);            // Filled ellipse (bounding box)
h.drawImage(image, x, y);                  // Draw an image/sprite
h.drawImage(image, x, y, {rotate:r, scale:s});  // Rotated/scaled image
h.drawPoly(poly, closed);                  // Polygon
h.drawPolyAA(poly, closed);                // Anti-aliased polygon
h.stringMetrics(text);                     // Get {width, height} of rendered text
h.stringWidth(text);                       // Get width of rendered text
h.imageMetrics(image);                     // Get {width, height} of image
h.getPixel(x, y);                          // Get pixel color at position
h.setClipRect(x1, y1, x2, y2);            // Restrict drawing to region
h.scroll(x, y);                            // Scroll display by dx, dy
h.getModified(reset);                      // Get dirty rect since last call
h.getWidth();                              // Display width (480)
h.getHeight();                             // Display height (320)
h.reset();                                 // Reset all graphics state
h.flip();                                  // Flush buffer, calls Pip.blitScreen()
Pip.blitScreen(h, Pip.blitOptions);         // Manual screen render (auto-called by flip)
Pip.lastFlip = getTime();                  // Tell Pip.timers.flip screen is current
```

See the full Espruino Graphics reference at [https://www.espruino.com/Reference#Graphics](https://www.espruino.com/Reference#Graphics).

### Pip Object Reference

```js
Pip.on('knob1', callback);                 // Add knob1 listener
Pip.on('knob2', callback);                 // Add knob2 listener
Pip.onExclusive('knob1', callback);        // Exclusive knob1 listener
Pip.onExclusive('knob2', callback);        // Exclusive knob2 listener
Pip.removeListener('knob1', callback);     // Remove knob1 listener
Pip.removeListener('knob2', callback);     // Remove knob2 listener
Pip.playSound('TAB');                      // Confirm sound
Pip.playSound('SCROLL');                   // Scroll sound
Pip.audioStart(path);                      // Play WAV from storage
Pip.audioStartVar(buffer, options);        // Play in-memory audio buffer
Pip.audioRead(path);                       // Load WAV into memory buffer
Pip.audioStop();                           // Stop all audio
Pip.shadeBox(x1, y1, x2, y2);             // Shaded highlight box
Pip.blitOptions;                           // Object for .y1/.y2 partial flips
Pip.typeText(txt, x, y, W, H, font);       // Typewriter text, returns Promise
Pip.screenGlitch();                        // Random CRT glitch effect + sound
Pip.errorBox(err);                          // Standard error display
Pip.log(txt, logFile);                     // Log to console + SD card LOGS/
Pip.videoStart(path, options);              // Play AVI video (MS RLE only)
Pip.videoStop();                           // Stop AVI playback
Pip.on('videoStopped', callback);          // Fires when AVI playback finishes
Pip.setVol(volume);                        // Set volume, 0-33
Pip.setBrightness(v);                      // Set brightness, float ~0.001-1
Pip.brightness;                            // Current brightness (0-1 float)
Pip.settings.brightness;                   // Firmware UI scale 1-20 (NOT the 0-1 float!)
Pip.settings.volume;                       // 3-27 int, compatible with setVol()
Pip.remove();                               // Call CURRENT.remove() safely
Pip.lastFlip = getTime();                  // Tell Pip.timers.flip screen is current
```

See the full Pip API reference at [https://robco-industries.org/documentation/pipboy/3000/api](https://robco-industries.org/documentation/pipboy/3000/api).

### Espruino Utility Reference

```js
E.clip(value, min, max);                   // Clamp value
E.defrag();                                // Defragment memory
Math.randInt(n);                           // Random int [0, n-1]
Math.atan2(y, x);                          // Arc tangent
fs.readFileSync(path);                     // Read file (fs is a global; require("fs") optional)
fs.writeFileSync(path, data);              // Write file to storage
fs.readdir(path);                          // List directory entries
fs.statSync(path);                         // Stat; returns undefined if missing (does NOT throw)
fs.mkdir(path);                            // Create directory (does NOT create parents)
fs.unlink(path);                           // Delete a file
E.openFile(path, mode);                    // Open file for streaming
JSON.parse(string);                        // Parse JSON
JSON.stringify(value);                     // Serialize to JSON
E.sum(array);                              // Optimized array sum
E.variance(array);                         // Optimized array variance
E.getSizeOf(value, depth);                 // Storage units used by object
process.memory();                          // Free blocks and memory info
process.memory(true);                      // Force a GC pass, then report memory
E.toFlatString(data);                      // Allocate flat contiguous string
debug(msg);                                // Log debug message
EMU;                                       // true if running in emulator
```

### Minimal Holotape Template

```js
(function() {
  let score = 0, clickWatch;

  function draw() {
    h.clearRect(0, 120, 479, 200);
    h.setColor(3).setFontMonofonto28().setFontAlign(0, 0)
      .drawString("Score: " + score, 240, 160);
  }

  function onKnob1(dir) {
    if (dir) {
      score = E.clip(score + dir, 0, 999);
      draw();
    } else {
      score = 0;
      draw();
    }
  }

  Pip.onExclusive("knob1", onKnob1);
  draw();

  return {
    id: "MYAPP",
    remove: function() {
      clearWatch(clickWatch);
      Pip.removeListener("knob1", onKnob1);
    },
  };
});
```

### 3.20 Variable Lookup & Scope

Espruino searches the scope chain to find variables on every access. **Global variables are slower to find than local variables.** For frequently-accessed values:

- Keep variables in the closest enclosing scope.
- Assign globally-referenced functions to local variables: `let d = someGlobalFn;`
- Short variable names look up slightly faster than long ones.
- Use `.bind()` to pre-bind arguments and avoid repeated lookups (see 3.15).

```js
// Slower — full lookup chain on each call
for (let i = 0; i < 1000; i++) someGlobalFn(LED1, 1);

// Faster — cached local reference
let d = someGlobalFn;
for (let i = 0; i < 1000; i++) d(LED1, 1);
```

### 3.21 Arrays, Objects & Typed Arrays

Espruino stores normal arrays and objects as **linked lists**. Element count directly affects access time. For performance-critical data:

- Use `Array.forEach`, `Array.map`, `Array.reduce`, `for (i of ...)` — these iterate the linked list efficiently.
- **Dense numeric data belongs in Typed Arrays** (`Uint8Array`, `Int16Array`, `Float32Array`, etc.). Typed arrays use contiguous flat memory and are vastly faster for random access.
- Use `TypedArray.set(src, offset)` for bulk copies.
- Pre-allocate typed arrays once and reuse them — allocation is slow and requires a contiguous memory block.
- 2D data: a 2D array-of-arrays is faster than a flat 1D array indexing via `[y * width + x]`.
- `E.sum(array)` and `E.variance(array)` are optimized built-ins for array math.
- Use `DataView` to access an `ArrayBuffer` with multiple types without copying:
  ```js
  let b = new ArrayBuffer(8);
  let v = new DataView(b);
  v.setUint16(0, 0x1234);
  v.setUint8(3, 0x56);
  v.getUint32(0); // 0x12340056
  ```
- Create TypedArray views on existing buffers for zero-copy reinterpretation:
  ```js
  let a = new Uint8Array([1,2,3,4,5,6,7,8]);
  let b = new Uint16Array(a.buffer); // [513,1027,1541,2055]
  let c = new Uint8Array(a.buffer, 2, 5); // [3,4,5,6,7]
  ```

### 3.22 Memory Measurement

Use these tools to profile memory usage:

- `process.memory()` — free blocks and total memory.
- `E.getSizeOf(value, 1)` — shows storage unit usage per property, sorted by size.
- `process.memory().blocksize` — size of each storage unit (typically 10-16 bytes depending on device).

### 3.23 Saving Data to SD Card

For read-heavy data that doesn't change often, write to the SD card:

```js
// Write to SD card
require("fs").writeFileSync("SETTINGS/MYAPP.JSON", JSON.stringify(data));

// Read from SD card
let data = require("fs").readFileSync("SETTINGS/MYAPP.JSON");
```

**Filesystem details:**

- `fs` is a **global** on the device; `require("fs")` is optional. Firmware code calls `fs.statSync`, `fs.readdir`, `fs.readFileSync` etc. directly.
- **Path convention:** prefer NO leading slash (`fs.readFileSync("HOLO/MYAPP/DATA.JSON")`). This is the firmware idiom everywhere. Leading-slash variants often work too, but code that eval-loads sibling module files should match the firmware exactly.
- `fs.mkdir(path)` creates a directory synchronously (throws on error). It does **not** create parent directories; for a nested path like `HOLO/MYAPP/SAVES`, walk and create each level, skipping levels that already exist.
- **`fs.statSync(path)` returns `undefined` for a missing path; it does NOT throw.** So `try { fs.statSync(p) } catch (e) { fs.mkdir(p) }` is a bug: the catch never fires and the directory is never created. Check the return value instead:

  ```js
  let st = fs.statSync(p);
  if (!st || !st.dir) fs.mkdir(p);
  ```

- `fs.unlink(path)` deletes a file.
- Error meanings: `NO_FILE` means the path resolved but the file is missing (commonly a `storage` entry that was never installed to the SD card); `NO_PATH` means an intermediate directory is missing.

When the firmware loads app code, function bodies and `const` declarations inside functions may be stored more efficiently than top-level variables. The `"ram"` directive loads a function into RAM for faster execution.

### 3.24 Lazy Module Loading (On-Demand Files)

To keep a holotape's RAM footprint small, split rarely-active screens (settings pages, editors, keyboards) into separate files that are loaded from the SD card only while in use, then dropped. This mirrors how the firmware itself loads its menu screens.

Each module file is a single **function expression** (not invoked, no trailing `()`), just like an app:

```js
// SETTINGS.JS evaluates to a function; calling it returns the module object
(function (api) {
  // ... module code ...
  return { id: "SETTINGS", select: doSelect, remove: doRemove };
});
```

The parent loads, uses, and unloads it:

```js
let mod = eval(fs.readFileSync("HOLO/MYAPP/SETTINGS.JS"))(api);
// ... later, on close:
mod.remove();
mod = null;
try { process.memory(true); } catch (e) {}  // force a GC pass to reclaim the code
```

Rules for this pattern:

- The module registers its own `Pip.onExclusive("knob1"/"knob2", ...)` handlers (displacing the parent's); on unload the parent re-registers its own. The parent keeps owning any `ENC1_PRESS` `setWatch` and delegates presses to `mod.select()`.
- Pass state and write-back callbacks through the `api` object. Globals (`h`, `Pip`, `getTime`, `fs`) are usable directly inside the module.
- The parent gates its own draws with `if (mod) return;` so background events don't paint over the child's screen.
- Modules can nest: a child may eval-load its own children. Each parent must `remove()` its child on exit (which in turn removes any grandchild), then run `process.memory(true)`.
- **Packaging:** every extra file needs its own `storage` entry in `metadata.json`, e.g. `{ "name": "HOLO/MYAPP/SETTINGS.JS", "url": "settings.min.js" }`. Every storage entry must actually be installed to the SD card or loading fails with `NO_FILE`.
- **Minification caveat:** the minified module file must still begin with `(function(` (a bare function expression). See [7.1](#71-minification) for the terser flags this requires, including why eval'd module files should not be name-mangled.
