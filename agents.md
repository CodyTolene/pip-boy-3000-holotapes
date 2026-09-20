# agents.md

Instructions for LLM agents writing or reviewing holotapes in this repository.
Follow these rules strictly. A review fails on any violation of the mandatory
checks in section 7.

Human contributors: [README.md](README.md) is the short guide (setup, create,
build, contribute). This file holds the detailed TypeScript, device, and review
rules - including notes that used to live in the README.

-

## Table of contents

- [1. Project context](#1-project-context)
- [2. Repository layout](#2-repository-layout)
- [3. TypeScript rules](#3-typescript-rules)
- [4. App structure](#4-app-structure)
- [5. Device programming rules](#5-device-programming-rules)
- [6. Registration and metadata](#6-registration-and-metadata)
- [7. Review and audit](#7-review-and-audit)
- [8. Anti-patterns](#8-anti-patterns)
- [9. Tooling notes](#9-tooling-notes)

-

## 1. Project context

- **Platform:** Pip-Boy 3000 replica running Espruino, a JavaScript interpreter
  for microcontrollers. Not the older Pip-Boy 3000 Mk V; some APIs differ.
- **Display:** 480x320, 4bpp. Color indices 0 (black) to 3 (white), with 1 and 2
  as intermediate greys.
- **Input:** two scroll wheels (`knob1`, `knob2`), each of which also presses.
- **Memory:** extremely constrained. Every variable allocation consumes a scarce
  block.
- **Language:** the Espruino subset. It has `class`, arrow functions, `Promise`,
  typed arrays, `Math.randInt`, `E.clip`, `E.defrag`. It does **not** have ES
  modules, `async`/`await`, or template literals.
- **Source language here is TypeScript.** The build strips types and emits the
  JavaScript the device runs. See section 3.
- **The API is documented in the types, not here.** `types/*.d.ts` carries JSDoc
  on every member of `Pip`, `h` (Graphics), `E`, `fs`, `Storage`, `player`,
  `DataFile`, and `InvFile`, including argument meanings, value ranges, and
  gotchas. Read the declaration rather than guessing, and never invent a method
  that is not declared.

-

## 2. Repository layout

Every holotape lives in its own directory:

```text
holotapes/<YourHolotape>/
  storage/          Required files, uppercase stems, lowercase extensions
    APP.ts          Main source
    TYPES.d.ts      Local types, when needed
  optional/         storageOptional files, when used
  previews/         Preview media, when used
  metadata.json     Registration entry (hand-written)
  README.md         Description, controls, credits
  ChangeLog         Version history
```

Rules:

- **Never add `.js`, `.min.js`, or `registry.json` under `holotapes/`.** They
  are generated only under `dist/pip-boy-3000-holotapes/`. `.min.js` is binary;
  formatting or editing it corrupts it. Regenerate with `npm run build`.
- **`metadata.json` is hand-maintained and nothing generates it.** No script in
  this repository writes a `metadata.json`, adds a `storage` entry, or invents
  an asset path. If a change needs a new file on the device, add its `storage`
  entry yourself and say so in your summary, because the developer is the only
  one who knows whether a file is required or optional and what it should be
  called on the device. The same applies to icons, `README.md`, and `ChangeLog`.
- Repository files under `storage/`, `optional/`, and `previews/` use uppercase
  filename stems and lowercase extensions. `storage/APP.ts` emits
  `storage/APP.JS` and `storage/APP.MIN.JS`. On-device paths remain fully
  uppercase to match the Pip-Boy development team's SD card convention.
- Every metadata `storage` `source` is directly under `storage/`, every
  `storageOptional` `source` is directly under `optional/`, and every preview is
  directly under `previews/`. The metadata icon is directly under `storage/` (no
  `assets/` folder).
- Every holotape has exactly one metadata icon: a transparent PNG or IMG that is
  exactly 120 by 120 pixels. Layout validation rejects anything else.
- Types used by one holotape go in that holotape's `TYPES.d.ts`. Only things the
  device itself provides belong in the shared `types/`.
- `ChangeLog` entries are:

  ```text
  <version> (<yyyy-mm-dd>)
  - <change description>
  ```

-

## 3. TypeScript rules

### 3.1 Only erasable syntax

`tsconfig.json` sets `erasableSyntaxOnly`. The build strips annotations and
changes nothing else: no transpiling, no downlevelling, no polyfills. Do not use
`enum`, a `namespace` with a runtime body, or constructor parameter properties.
Interfaces, type aliases, generics, and annotations are all fine.

### 3.2 No typechecking escapes

`@ts-nocheck`, bare `@ts-ignore`, unexplained `@ts-expect-error`, `any`, and
`unknown` are rejected by ESLint. Declare a concrete type (or a named interface
in a local `TYPES.d.ts`). Return types on functions are required and are
erasable.

### 3.3 Type syntax is free, code changes are not

This is the most important rule in the file.

Annotations, `as` casts, `!` non-null assertions, and `!:` definite assignment
assertions all erase to nothing, so they cannot change device behaviour. Adding
an initializer, a guard, or a temporary variable **does** change it, even when
it looks equivalent:

```ts
// Free: erases to `let winner;`
let winner!: string | null;

// Not free: emits `let winner = null;`
let winner: string | null = null;
```

When satisfying the type checker on code that already works on hardware, reach
for the erasable form first. If a real code change is genuinely the right fix,
make it deliberately, say so, and flag that it needs a device retest.

Useful erasable idioms:

- `let x!: T;` definite assignment when the value is filled before use and you
  do not want an initializer in the emitted JS.
- `x = null as never;` (or a typed sentinel) for teardown that clears a value.
- `function F(this: Shape, ...)` types a constructor-style function. Prefer a
  named constructor type over casting through `any`/`unknown`.

### 3.4 Never use `any` or `unknown`

Both are banned under `holotapes/**` and the linter enforces it. Declare a
concrete type or a named interface in a local `TYPES.d.ts`. For eval'd scene
factories, cast to a named factory type - do not leave the value as `unknown`.

### 3.5 Type the shapes, not just the leaves

Give a holotape's records real interfaces in its `types.d.ts`, with a JSDoc line
on every member explaining what it holds. A game's piece, its player record, its
save file, and its scene contract are all worth naming. Prefer that over
inlining an anonymous object type at each use.

### 3.6 Write annotations yourself

Write return types, parameter types, and named shapes by hand. Do not leave them
for inference or for a helper script. Object shapes built up property by
property, state variables filled in by a later `reset()`, and parameters with no
obvious call site still need judgement. Prefer a concrete annotation over
loosening a type to silence an error.

### 3.7 Build and verify

```bash
npm run verify
```

Layout, typecheck, lint, format check, metadata schema, production build, and
dist file checks. Run it before claiming a change is done, and report the result
honestly. `npm run build` alone emits `.js`, `.min.js`, and the registry under
`dist/pip-boy-3000-holotapes/` (registry is part of build, not a separate npm
script). Generated output must never be committed.

If the registry step reports a metadata problem, do not attempt to repair the
`metadata.json` on the developer's behalf unless they asked for it. Report which
file it named and what it said.

-

## 4. App structure

### 4.1 Function expression, not invoked

The whole app is an anonymous function expression. The Pip-Boy OS evaluates the
file and calls it. Do **not** add a trailing `()`.

```ts
(function (): HolotapeApp {
  // App code
});
```

### 4.2 Return object

The function must return an object with at least `id` and `remove`:

| Field        | Type       | Required | Description                                  |
| ------------ | ---------- | -------- | -------------------------------------------- |
| `id`         | `string`   | Yes      | Uppercase alphanumeric, no spaces or hyphens |
| `remove`     | `function` | Yes      | Cleanup, see 4.3                             |
| `notDefault` | `boolean`  | No       | Pressing any mode button exits the app       |
| `fullscreen` | `boolean`  | No       | Hides the OS header and footer               |

Put the id string literally in the return object; do not spend a variable on an
`APP_ID` constant.

### 4.3 `remove()` must tear down everything

Everything the app created, or it leaks into the OS and the next app:

1. Every `Pip.on` / `Pip.onExclusive` listener, via `Pip.removeListener`.
2. Every `setInterval` / `setTimeout` handle.
3. Every `setWatch` handle, via `clearWatch`.
4. `Pip.audioStop()` if the app played audio, `Pip.videoStop()` if it played
   video.
5. `h.clear()` if the app drew over non-app screen content.
6. Any setting the app changed (brightness, volume, palette, blit options),
   restored to the value captured on load.

It does not need a double-removal guard.

`remove()` must **never** call `load()` or `E.reboot()`. The app exits cleanly
so the OS can restore what was there before.

### 4.4 Declaration order

**Espruino does not hoist function declarations.** Statements run in source
order and a `function name() {}` only exists once its line has executed.
Referencing it earlier, including passing it to `setInterval`, `setTimeout`,
`Pip.on`, `Pip.onExclusive`, or `setWatch`, throws `ReferenceError` on the
device.

Declare all functions first, then initialization last: state, functions,
listener registration, first draw, timers, return object.

Node and browsers do hoist, so this bug is invisible to any off-device check.
The exception is a reference inside a callback body that runs later; by then the
whole file has finished executing.

### 4.5 Lazy scene loading

To keep RAM small, split rarely-active screens into separate files loaded from
the SD card only while in use. Each is a function expression, like an app:

```ts
(function (app: MyApp, params?: MySceneParams): MyScene {
  return { remove: removeScene };
});
```

The parent loads, uses, and drops it:

```ts
const scene = (eval(fs.readFileSync('HOLO/MYAPP/SCENE.JS')) as MySceneFactory)(
  app,
  params,
);
// later:
scene.remove();
process.memory(true); // force GC to reclaim the code
```

Rules:

- Type the factory (`MySceneFactory`) and cast the `eval` result to it. Never
  use `any` or `unknown`.
- The scene registers its own `Pip.onExclusive` handlers, displacing the
  parent's; the parent re-registers on unload.
- Pass state and write-back callbacks through the shared app object.
- The parent gates its own draws while a scene is loaded, so background events
  do not paint over the child screen.
- Every extra file needs its own `storage` entry in `metadata.json`, or loading
  fails with `NO_FILE`.

-

## 5. Device programming rules

### 5.1 Variables and memory

- `const` for constants, `let` for mutable state. **Never `var`** in new code.
- **Espruino does not block-scope `let`/`const`.** A `for (let i ...)` loop
  variable leaks to function scope. Never reuse a name inside a block if the
  outer value is still needed after it.
- Minimize declarations. Every one costs a scarce block. Hardcode constants that
  never change and inline single-use values.
- Group related constants into one object (`const C = { ... }`) rather than many
  individual declarations.
- Never alias the global `h`. Use it directly.
- Dense numeric data belongs in typed arrays, which are contiguous and far
  faster for random access than Espruino's linked-list arrays.

### 5.2 Graphics

- Chain calls on `h`:
  `h.setColor(3).setFontMonofonto16().setFontAlign(0, 0).drawString(...)`.
- **`h.setColor()` persists globally**, across statements and function
  boundaries. Set it explicitly before any draw where the color matters.
- Minimize pixels written per frame. Use `h.clearRect()`, `h.setClipRect()`, and
  dirty flags so only changed regions redraw.
- Cache wrapped text. `h.wrapString()` is expensive; wrap once and store the
  lines and their height.
- Interval-driven apps rely on the OS auto-flush every 50ms. Do **not** add
  manual `h.flip()` calls to a `setInterval` loop; they fire at arbitrary times
  relative to scanout and cause tearing. For `Pip.onFrame`-style rendering, set
  `Pip.lastFlip = getTime()` before drawing and call `h.flip()` after.
- `Pip.blitOptions.y1` / `.y2` blit only a band of rows, a large win for
  scrolling lists. `delete` both afterwards to restore full-screen updates.
- Prefer one `h.drawImage()` over many `fillRect`/`drawLine` calls for a sprite.

### 5.3 Input

- `Pip.onExclusive('knob1', handler)` is the default: it displaces any other
  listener so the app is the sole handler. Use `Pip.on` only when handlers must
  coexist.
- The handler receives a direction: `1` down/clockwise, `-1` up/counter-
  clockwise, `0` a press. A press may pass `true` as a second argument for a
  long press.
- `setWatch` on `ENC1_PRESS` is for unusually latency-sensitive presses only. A
  direct watch on a button such as `BTN_DATA` is appropriate only because no
  `Pip.on` event exists for it.
- An empty knob handler is legitimate: registering one claims the exclusive slot
  for a wheel the app deliberately ignores.

#### Keyboard and date/time overlays

Firmware 1.1.4 and later provides
`Pip.createKeyboard(initialText, description, callback)`. It claims both knobs
and returns an object with `draw()` and `remove()`. The keyboard does not close
itself: call `.remove()` in its callback or cleanup path before drawing the next
screen. Its `remove()` detaches both knob listeners and clears its cursor timer.

Pre-1.1.4 firmware has no global keyboard API. To support it, provide a local
text-entry scene modelled on the firmware's `showTextEntry`: a 4-row by
14-column lower/upper `KEYMAP`, with `\b` for backspace, `\x02` for shift, and
`\x03` for enter. Knob2 selects the column and knob1 selects the row and types
on press. Clear the cursor-blink interval and remove both knob listeners when
the scene closes.

`Pip.createDateTimePicker(date, includeDate, title, callback)` is also available
on firmware 1.1.4 and later. It edits the supplied `Date` in place and likewise
returns an object whose `remove()` must be called explicitly.

### 5.4 Timing and directives

- Drive animation with `setInterval` at the target frame rate, commonly 50ms.
  `requestAnimationFrame` does not exist.
- `"ram"` as the first statement of a function runs it from RAM instead of
  flash, and pretokenises it. Use it for the main frame loop.
- `"jit"` compiles a function to native ARM. Use it for small, self-contained,
  math-heavy loops. One directive per function.
- Do not add either without a measured need. The linter is configured not to
  strip them; the minifier preserves them.
- Whitespace and comments inside hot loops cost time on every iteration, since
  Espruino executes from source.

### 5.5 Files, assets, and audio

- `fs` is a global; `require("fs")` is optional. Paths take no leading slash:
  `fs.readFileSync("HOLO/MYAPP/DATA.JSON")`.
- **`fs.statSync()` returns `undefined` for a missing path, it does not throw.**
  A `try`/`catch` around it never fires. Check the return value.
- `fs.mkdir()` does not create parent directories; walk and create each level.
- Defer heavy asset loading with `setTimeout(fn, 0)` so the app returns its
  object first, and call `E.defrag()` before large allocations. Clear that
  timeout in `remove()`.
- Stream large images into `h.buffer` with `E.openFile()` rather than holding a
  second full copy in memory.
- Images must be 4bpp or less, converted with the
  [Image Converter](https://www.pip-boy.com/tools/image-converter).
- `Pip.audioStart()` stops any current playback already; a preceding
  `Pip.audioStop()` is redundant.
- Audio is 16kHz mono WAV, PCM or ADPCM. Video is MS RLE AVI only; an mpeg4 AVI
  will not decode.

Media conversion requirements:

- WAV audio must be mono at 16kHz. PCM (`pcm_s16le`) works; prefer IMA ADPCM
  (`adpcm_ima_wav`) when file size matters.
- AVI video must be no wider than 480 pixels, grayscale, 12fps, MS RLE, and
  8-bit paletted. Its audio must be mono 16kHz IMA ADPCM.
- MS RLE compresses flat runs well but performs badly on noise and dithering.
  Limit video to about 16 gray levels and disable dithering.

```sh
# PCM WAV
ffmpeg -i "input.mp3" -ac 1 -ar 16000 -sample_fmt s16 \
  -c:a pcm_s16le -f wav output.wav

# Device-compatible AVI
ffmpeg -i "input.mp4" \
  -vf "scale=480:-1,format=gray,split[a][b];[a]palettegen=max_colors=16:reserve_transparent=0[p];[b][p]paletteuse=dither=none" \
  -r 12 -c:v msrle -pix_fmt pal8 \
  -c:a adpcm_ima_wav -ac 1 -ar 16000 output.AVI
```

Video playback is non-blocking. Pair `Pip.videoStart()` with a removable
`videoStopped` listener and provide a knob-press skip path because a clip that
fails to decode may never emit the event. For a manual skip, remove the listener
before calling `Pip.videoStop()` so a synchronous stop cannot run the transition
twice.

### 5.6 Settings the app changes

If the app changes brightness or volume, capture the live values on load
(`Pip.brightness` for brightness, `Pip.settings.volume` for volume) and restore
them in `remove()`, so in-app changes are session-only.

Note the scale trap: `Pip.settings.brightness` is the firmware UI's integer 1-20
scale, **not** the 0-1 float that `Pip.setBrightness()` takes. Never feed one
into the other. `Pip.settings.volume` is 3-27 and is directly compatible with
`Pip.setVol()`.

-

## 6. Registration and metadata

`metadata.json` is written and maintained by the developer. Treat it as input
you read, not output you produce. Do not create one, do not add or reorder
`storage` entries, and do not rewrite asset paths, unless the developer asks for
that specifically. When your change adds a file the device needs, say plainly in
your summary which `storage` entry has to be added and what it should look like,
and leave the edit to them.

The one piece of automation here is the artifact's `holotapes/registry.json`,
which is generated by reading every `metadata.json`. That file never exists in
the source tree.

```json
{
  "id": "myholotape",
  "previousId": "old-holotape-id",
  "name": "My Holotape Name",
  "author": "@your-username",
  "version": "1.0.0",
  "description": "A brief description of the holotape.",
  "icon": "storage/ICON.png",
  "previews": ["previews/SCREEN.png"],
  "type": "game",
  "readme": "README.md",
  "storage": [{ "pipboy": "HOLO/MYAPP/APP.JS", "source": "storage/APP.ts" }],
  "storageOptional": []
}
```

| Field             | Rules                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`              | Lowercase alphanumeric and hyphens only. Unique in the registry.                                                        |
| `previousId`      | Optional. When `id` changes, preserve the former registry id so the website can find old files for uninstall/reinstall. |
| `name`            | Human-readable name shown on pip-boy.com.                                                                               |
| `author`          | GitHub username(s) prefixed with `@`, space separated.                                                                  |
| `version`         | [Semver](https://semver.org).                                                                                           |
| `description`     | One sentence.                                                                                                           |
| `icon`            | Transparent 120x120 PNG/IMG directly under `storage/`.                                                                  |
| `previews`        | PNG, MP4, or GIF files directly under `previews/`.                                                                      |
| `type`            | Exactly `app` or `game`. Nothing else.                                                                                  |
| `readme`          | Usually `README.md`.                                                                                                    |
| `storage`         | `{ pipboy, source }` pairs. `pipboy` is the on-device path; `source` is the repo file (`.ts` for scripts).              |
| `storageOptional` | Same shape, for files the user can choose to install.                                                                   |

`previousId` is migration metadata, not an alias for a new holotape. Omit it for
a holotape that has never changed id. When renaming an existing id, copy the
former value exactly, including its casing; historical ids are not necessarily
valid under today's lowercase `id` rule. Do not remove or replace it merely to
match the new id: pip-boy.com uses it to locate files installed under the old
registry entry during uninstall and reinstall.

`pipboy` paths follow `HOLO/<APP_ID>/<FILENAME>`, where `<APP_ID>` is the
metadata `id` uppercased with underscores replacing hyphens. That prefix is a
filesystem convention only; it has no relationship to any variable in the code.
Script `source` entries use uppercase stems and lowercase extensions (e.g.
`storage/APP.ts`). The build emits `APP.JS` / `APP.MIN.JS` and rewrites
production metadata/registry `source` values to the `.MIN.JS` artifact; `pipboy`
stays the on-device `.JS` name. Uppercase filenames match the Pip-Boy
development team's on-device convention.

-

## 7. Review and audit

When reviewing a change, first list all changed files and identify every new or
modified holotape. Run every mandatory and recommended check for each affected
holotape, report failures by rule ID, and give each holotape its own verdict.

### 7.1 Mandatory

| #   | Check                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| R01 | Source is a function expression, not invoked, no trailing `()`.                                                                                      |
| R02 | Return object has a literal uppercase `id` and a `remove` function.                                                                                  |
| R03 | Every `Pip.on`/`onExclusive` listener is removed in `remove()`.                                                                                      |
| R04 | Every `setInterval`/`setTimeout` handle is cleared in `remove()`.                                                                                    |
| R05 | Every `setWatch` handle is cleared in `remove()`.                                                                                                    |
| R06 | `remove()` does not call `load()` or `E.reboot()`.                                                                                                   |
| R07 | No function is referenced before its declaration line (4.4).                                                                                         |
| R08 | No `let`/`const` name is reused inside a block while the outer value is still needed.                                                                |
| R09 | No `any` or `unknown`. Use concrete types / local `TYPES.d.ts` interfaces.                                                                           |
| R10 | Only erasable TypeScript syntax is used.                                                                                                             |
| R11 | No unsupported runtime features: `async`/`await`, modules, template literals, `fetch`.                                                               |
| R12 | `Math.randInt(n)` rather than `Math.floor(Math.random() * n)`.                                                                                       |
| R13 | No OS global is deleted or reassigned, except a documented, restored patch.                                                                          |
| R14 | `metadata.json` has a unique lowercase id, semver version, and `type` of `app` or `game`; an id rename preserves the former value in `previousId`.   |
| R15 | Storage `pipboy` paths use the `HOLO/<APP_ID>/` prefix matching the metadata id.                                                                     |
| R16 | Every file in `storage` exists in the production artifact after `npm run build`.                                                                     |
| R17 | Every file the app loads at runtime has a `storage` entry, or it fails with `NO_FILE`.                                                               |
| R18 | `README.md` documents the controls; `ChangeLog` has an entry for the change.                                                                         |
| R19 | `npm run verify` passes and no generated `.js`, `.min.js`, or registry is committed.                                                                 |
| R20 | Files under `storage/`, `optional/`, and `previews/` use uppercase stems and lowercase extensions. TypeScript lives under `storage/` or `optional/`. |
| R21 | Every `storage` `source` is directly under `storage/`.                                                                                               |
| R22 | Every `storageOptional` `source` is directly under `optional/`.                                                                                      |
| R23 | Every preview is directly under `previews/`; the metadata icon is directly under `storage/`.                                                         |
| R24 | The icon is a transparent PNG or IMG and exactly 120x120 pixels.                                                                                     |

### 7.2 Recommended

| #   | Check                                                                      |
| --- | -------------------------------------------------------------------------- |
| S01 | Dirty flags or clip rects limit redraw to changed regions.                 |
| S02 | `"ram"` on the frame loop, `"jit"` on tight numeric loops, where measured. |
| S03 | Heavy asset loading deferred with `setTimeout(fn, 0)`.                     |
| S04 | `E.defrag()` before large allocations.                                     |
| S05 | Single-use values inlined; constants grouped into one object.              |
| S06 | The app opens, closes, and reopens without leaking or crashing.            |
| S07 | Record types are named and documented in the holotape's `types.d.ts`.      |
| S08 | Images are 4bpp or less and converted, not raw.                            |

### 7.3 Verdict format

```markdown
## Holotape Review: `<Name>`

### Mandatory

- [x] R01 - function expression, not invoked
- [ ] R04 - `frameInterval` is never cleared in `remove()`

### Recommended

- [x] S01 - dirty flags used
- [ ] S05 - `W`/`H` recomputed each frame

### Verdict: FAIL - 1 mandatory check failed.
```

### 7.4 What a review cannot conclude

Static review does not prove an app works. Espruino's lack of hoisting and its
flat `let` scoping mean a file can read correctly and still fail on hardware.
Say so: recommend a device test rather than implying the change is verified.

-

## 8. Anti-patterns

Never generate these.

| Anti-pattern                                  | Why                                                             |
| --------------------------------------------- | --------------------------------------------------------------- |
| `any` / `unknown`                             | Banned under `holotapes/**`. Use concrete types.                |
| `enum`, runtime `namespace`, param properties | Not erasable; the build rejects them.                           |
| Adding or editing `.js` or `.min.js`          | Generated artifact files; `.min.js` is binary and will corrupt. |
| Adding or editing `registry.json`             | Generated only in the production artifact.                      |
| Writing or "fixing" `metadata.json` unasked   | Developer-owned. Report what needs adding instead.              |
| `async`/`await`, `import`/`export`            | Not available in Espruino.                                      |
| Template literals                             | Not supported.                                                  |
| `fetch()`, `XMLHttpRequest`                   | No network on the device.                                       |
| `requestAnimationFrame`                       | Not available. Use `setInterval`.                               |
| `Math.random()`                               | Use `Math.randInt(n)`.                                          |
| `var`                                         | Wastes blocks and is less clear than `const`/`let`.             |
| Referencing a function before its declaration | Espruino does not hoist; throws on device.                      |
| Reusing a `let` name a block still needs      | Espruino's `let` is function-scoped; the inner write clobbers.  |
| `load()` or `E.reboot()` in `remove()`        | Rebooting on exit is hostile. Exit cleanly.                     |
| `Pip.remove()` at the top of an app           | The OS already cleaned up the previous app.                     |
| Bare `clearWatch()`                           | Clears the OS's watches too. Always pass the id.                |
| `let c = h`                                   | Wastes a variable block. Use `h` directly.                      |
| `Pip.audioStop()` before `Pip.audioStart()`   | `audioStart` already stops current playback.                    |
| A function wrapping a single call             | Wastes a block. Inline it unless it adds real logic.            |
| `try`/`catch` that only calls `Pip.errorBox`  | The global handler already shows an error box.                  |
| Manual `h.flip()` inside a `setInterval` loop | Causes tearing. Rely on the OS auto-flush.                      |
| Globals outside the app's function            | Pollutes the namespace every holotape shares.                   |
| Storing many functions in arrays or objects   | Consumes excessive memory blocks.                               |
| Object or array nesting deeper than 4 levels  | Wastes blocks and slows access.                                 |
| Strings longer than ~256 characters           | Each consumes a variable block.                                 |
| Images above 4bpp, or unconverted             | Wastes storage and memory.                                      |
| Files outside their metadata layout directory | Rejected by the layout step in `npm run verify`.                |

-

## 9. Tooling notes

Notes that are too detailed for the README.

### 9.1 npm scripts

Day-to-day scripts in `package.json`:

- `npm install` - dependencies
- `npm run build` - `.scripts/build.ts` (helpers under `.scripts/build/`)
- `npm run verify` - `.scripts/verify.ts` (husky pre-commit + CI)
- `npm run format` - Prettier write
- `npm prepare` - husky install

Build helpers live under `.scripts/build/`. Verification steps live under
`.scripts/verify/`. Do not re-add one-off npm scripts for those steps without a
strong reason.

### 9.2 What the build emits

Under `dist/pip-boy-3000-holotapes/`:

- `APP.JS` - type-stripped, readable
- `APP.MIN.JS` - Terser + Espruino pretokenise (binary; never hand-edit)
- `holotapes/registry.json` - generated from every `metadata.json`

Script `metadata` `source` values point at `.ts` in the repo. The production
artifact rewrites those `source` paths to `.MIN.JS`. `pipboy` stays the
on-device `.JS` path.

#### Terser name-mangling hazard

Terser follows standard JavaScript block scoping and may legitimately reuse a
name in an inner block. Espruino does not block-scope `let` or `const`, so
minification can turn otherwise distinct source names into one function-scoped
name. A loop variable can then overwrite a parameter or local that is used after
the loop, causing hardware-only failures such as `Function not found!`. R08
catches collisions already present in source but cannot catch collisions
introduced by the minifier.

Build tooling must not enable name mangling for an eval-loaded scene or data
builder unless it proves that the generated names are safe under Espruino's flat
scoping. When changing Terser options, add a regression case containing a
function parameter, a nested `for (let ...)` loop, and a use of the parameter
after the loop. Verify that the production output does not reuse the parameter's
name for the loop variable. After minifying an eval-loaded file, also verify
that it still evaluates to a bare function expression.

### 9.3 CI

- **Validate** (`.github/workflows/validate.yml`): PRs into `main`. Runs
  `npm run verify`, rejects committed `.js` / `registry.json` under
  `holotapes/`, uploads a short-lived zip artifact.
- **Deploy** (`.github/workflows/deploy.yml`): push to `main`. Same verify, then
  publishes one permanent zip on the rolling GitHub Release tag `production`.

### 9.4 Troubleshooting

- **Build: unsupported TypeScript syntax** - erasable-only: no `enum`, no
  runtime `namespace`, no constructor parameter properties.
- **`ReferenceError` on device, fine elsewhere** - function used before its
  declaration line. Init last.
- **Works once, breaks on reopen** - incomplete `remove()`.
- **Typecheck fails on hardware-proven code** - prefer erasable fixes (`!:`,
  `as`, annotations) over runtime changes.
