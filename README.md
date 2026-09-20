<div align="center">
  <img align="center" src=".github/images/logo.png" height="400" />
  <h1 align="center">Pip-Boy 3000 Holotapes</h1>
  <p align="center">
    TypeScript sources for community apps and games on the
    <a href="https://www.thewandcompany.com/pip-boy-3000/" target="_blank">Pip-Boy 3000</a>,
    hosted on <a href="https://www.pip-boy.com/" target="_blank">pip-boy.com</a>.
  </p>
  <p align="center">
    <a href="https://pip-boy.com" target="_blank">
      Pip-Boy.com
    </a>&nbsp;|&nbsp;
    <a href="https://discord.com/invite/zQmAkEg8XG" target="_blank">
      Discord Community
    </a>&nbsp;|&nbsp;
    <a href="https://gear.bethesda.net/products/fallout-pip-boy-3000-replica" target="_blank">
      Bethesda Store
    </a>&nbsp;|&nbsp;
    <a href="https://www.thewandcompany.com">
      The Wand Company
    </a>&nbsp;|&nbsp;
    <a href="https://www.espruino.com" target="_blank">
      Espruino
    </a>&nbsp;|&nbsp;
    <a href="https://log.robco-industries.org/" target="_blank">
      RobCo Industries
    </a>
  </p>
</div>

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## Index <a name="index"></a>

- [Description](#description)
- [Creating a new Holotape](#create)
- [Development Workflow](#development)
- [Images](#images)
- [Input handling](#input)
- [Memory and Performance](#memory)
- [Contributing](#contributing)
- [License](#licenses)

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## Description <a name="description"></a>

Pip-Boy 3000 Holotapes by the community, for the community.

This repo is written in **TypeScript**. Write `.ts` under `storage/`.
`npm run build` strips the types and emits the Espruino `.JS` / `.MIN.JS` the
device runs (minified and pretokenised for you).

Install on: [pip-boy.com][link-pip-boy]

Agent / review rules live in [agents.md](agents.md).

<p align="right">[ <a href="#index">Index</a> ]</p>

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## Creating a new Holotape <a name="create"></a>

1. Create a directory under `holotapes/`:

   ```bash
   holotapes/<YourHolotape>/
     storage/           # Required files + uppercase stems, lowercase extensions
       APP.ts           # Main TypeScript source for the Holotape
     optional/          # Optional install files, if any
     previews/          # Preview images, if any
     metadata.json      # Metadata for the Holotape
     README.md          # Documentation for the Holotape
     ChangeLog          # Change log for the Holotape
   ```

   > ![img-info][img-info] Every file under `storage/`, `optional/`, and
   > `previews/` must use an uppercase filename stem and lowercase extension,
   > for example `APP.ts`, `DATA.json`, `ICON.png`. On-device `pipboy` paths
   > remain fully uppercase. `npm run verify` enforces both conventions.

2. Write `storage/APP.ts`. The app is an anonymous function expression the
   Pip-Boy OS invokes; do not call it with a trailing `()`. It must return an
   uppercase alphanumeric `id` and a `remove` function.

   Example:

   <details>
   <summary>Expand/Collapse</summary>

   ```ts
   (function (): HolotapeApp {
     const W = h.getWidth(),
       H = h.getHeight();
     let leftWheel = 0,
       rightWheel = 0,
       lastInput = 'NONE';

     function draw(): void {
       h.clear(0);
       h.setColor(3)
         .setFontMonofonto28()
         .setFontAlign(0, 0)
         .drawString('EXAMPLE', W / 2, 50)
         .setFontMonofonto18()
         .drawString('LAST: ' + lastInput, W / 2, 100)
         .setFontMonofonto16()
         .setFontAlign(-1, -1)
         .drawString('LEFT WHEEL: ' + leftWheel, 80, 145)
         .drawString('RIGHT WHEEL: ' + rightWheel, 80, 175)
         .drawString('PRESS THE LEFT WHEEL TO RESET', 80, H - 40);
     }

     function onKnob1(dir: KnobDirection, long?: boolean): void {
       if (dir) {
         leftWheel += dir;
         lastInput = dir < 0 ? 'LEFT UP' : 'LEFT DOWN';
         Pip.playSound('SCROLL');
       } else {
         leftWheel = 0;
         lastInput = long ? 'LEFT LONG PRESS' : 'LEFT PRESS';
         Pip.playSound('TAB');
       }
       draw();
     }

     function onKnob2(dir: KnobDirection): void {
       if (dir) {
         rightWheel += dir;
         lastInput = dir < 0 ? 'RIGHT UP' : 'RIGHT DOWN';
         Pip.playSound('SCROLL');
       }
       draw();
     }

     // Init last, Espruino does not hoist functions.
     Pip.audioStop();
     Pip.onExclusive('knob1', onKnob1);
     Pip.onExclusive('knob2', onKnob2);
     draw();

     return {
       id: 'example',
       notDefault: true,
       fullscreen: true,
       remove: function () {
         Pip.removeListener('knob1', onKnob1);
         Pip.removeListener('knob2', onKnob2);
         Pip.audioStop();
         h.clear();
       },
     };
   });
   ```

   </details>

3. Add `metadata.json`. Paths are relative to the Holotape directory. `pipboy`
   is the on-device path; `source` is the file in this repo. Script sources
   point at `.ts`; the build emits `.MIN.JS` into the production artifact.

   ```json
   {
     "id": "example",
     "name": "Example Holotape",
     "author": "@your-github-username @another-github-username",
     "version": "1.0.0",
     "description": "A short, one-sentence description.",
     "icon": "storage/ICON.img",
     "previews": [],
     "type": "app",
     "readme": "README.md",
     "storage": [
       { "pipboy": "HOLO/EXAMPLE/APP.JS", "source": "storage/APP.ts" },
       {
         "pipboy": "HOLO/EXAMPLE/CONFIG.JSON",
         "source": "storage/CONFIG.json"
       },
       { "pipboy": "HOLO/EXAMPLE/IMAGE.IMG", "source": "storage/IMAGE.img" },
       { "pipboy": "HOLO/EXAMPLE/OTHER.JS", "source": "storage/OTHER.ts" }
     ],
     "storageOptional": [
       {
         "label": "Example BIN Image",
         "sizeKB": 38,
         "pipboy": "HOLO/EXAMPLE/IMAGE.BIN",
         "source": "optional/IMAGE.bin"
       },
       {
         "label": "Example AVI Video",
         "sizeKB": 1234,
         "pipboy": "HOLO/EXAMPLE/VIDEO.AVI",
         "previewMp4": "previews/VIDEO.mp4",
         "source": "optional/VIDEO.avi"
       },
       {
         "label": "Example WAV Audio",
         "sizeKB": 543,
         "pipboy": "HOLO/EXAMPLE/AUDIO.WAV",
         "previewMp3": "previews/AUDIO.mp3",
         "source": "optional/AUDIO.wav"
       }
     ]
   }
   ```

   > ![img-info][img-info] `icon` can also be a PNG, but it will only be
   > displayed on the website. PNG files cannot be used on the device as the
   > Holotape image.

   > ![img-info][img-info] `id` is lowercase letters, numbers, and hyphens;
   > `version` is semver; `type` is `app` or `game`. Use `previousId` if your
   > Holotape ID has changed from a previous version. This helps the website
   > find the old files for uninstall and reinstall.

4. Documents for your Holotape should go in its readme file:
   `holotapes/<YourHolotape>/README.md`.

5. Add a `ChangeLog` file:

   ```text
   1.0.0 (yyyy-mm-dd)
   - Initial release
   ```

6. Build and check:

   ```sh
   npm install
   npm run verify
   ```

<p align="right">[ <a href="#index">Index</a> ]</p>

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## Development Workflow <a name="development"></a>

For this repo, keep sources as TypeScript under
`holotapes/<YourHolotape>/storage/` and let `npm run build` build the JS. Do not
commit generated `.JS` / `.MIN.JS` under `holotapes/`.

### Using Pip-Boy.com

<details>
<summary>Expand/Collapse</summary>

1. Open the [Pip-Boy 3000 Holotape Creator/Editor][link-holotape-creator].

2. Create or edit a Holotape in the built-in editor as JavaScript.

3. Test on the device with **Save & Test**.

</details>

### Using the Espruino Web IDE

<details>
<summary>Expand/Collapse</summary>

1. Open the [Espruino Web IDE](https://www.espruino.com/ide/) or its
   [GitHub-hosted version](https://espruino.github.io/EspruinoWebIDE).

2. Build first (`npm run build`), then upload the generated files from
   `dist/pip-boy-3000-holotapes/`.

</details>

### Build <a name="build"></a>

```sh
npm install
npm run build
```

Writes readable `.JS`, pretokenised `.MIN.JS`, and a generated `registry.json`
(catalog index for pip-boy.com) under `dist/pip-boy-3000-holotapes/`
(gitignored). Types are erased only - no transpile or polyfills. See
[agents.md](agents.md) for TypeScript rules.

### Commands <a name="commands"></a>

That is most of what you need day to day:

```sh
npm install          # Install dependencies (once)
npm run build        # Build for Pip-Boy, Outputs to `dist/`
npm run verify       # Verify all files
```

`npm run verify` is what husky runs on commit and what CI runs on PRs / deploy.
It fails the commit or job if any step fails. Formatting is required: run
`npm run format` before you commit (verify also checks Prettier and fails if
files are not formatted).

Pull requests use `.github/workflows/validate.yml`. Merges to `main` use
`.github/workflows/deploy.yml` (verify, then publish the production zip).

Schema for `metadata.json` is in `.vscode/settings.json`.

<p align="right">[ <a href="#index">Index</a> ]</p>

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## Images <a name="images"></a>

<details>
<summary>Expand/Collapse</summary>

Holotape images must be bitmaps with a maximum color depth of 1bpp. Convert
source artwork with the
[Image Converter](https://www.pip-boy.com/tools/image-converter).

The metadata icon is a transparent PNG or IMG, exactly 120x120, under
`storage/`.

Prefer one `h.drawImage()` call over many procedural draws for sprites.

Small sprites can be stored inline:

```js
const sprites = { icon: atob('...') };
h.drawImage(sprites.icon, 120, 80);
```

Larger collections can load from the SD card. Defer with `setTimeout(..., 0)`
and call `E.defrag()` first:

```js
let sprites,
  assetTimeout = setTimeout(function () {
    E.defrag();
    sprites = eval(require('fs').readFileSync('HOLO/MYAPP/IMG.JS'));
    h.drawImage(sprites.icon, 120, 80);
  }, 0);
```

Clear any asset timeout in `remove()`. Very large backgrounds can stream into
`h.buffer` with `E.openFile()` instead of holding another full image in RAM.

</details>

<p align="right">[ <a href="#index">Index</a> ]</p>

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## Input handling <a name="input"></a>

<details>
<summary>Expand/Collapse</summary>

Use `Pip.onExclusive()` when the app needs exclusive input:

```js
function onKnob1(dir, long) {
  if (dir === 1) {
    // Down / clockwise
  } else if (dir === -1) {
    // Up / counter-clockwise
  } else if (long) {
    // Long press
  } else {
    // Normal press
  }
}

Pip.onExclusive('knob1', onKnob1);
```

Prefer `Pip.onExclusive()`. Use `Pip.on()` only when handlers must coexist.
Remove every listener and watch in `remove()`.

Firmware 1.1.4+ has a built-in keyboard:

```js
Pip.createKeyboard(initialText, description, callback);
```

Call `.remove()` on the returned object (usually inside the callback) before
drawing the next screen. Older firmware: see [agents.md](agents.md).

</details>

<p align="right">[ <a href="#index">Index</a> ]</p>

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## Memory and Performance <a name="memory"></a>

<details>
<summary>Expand/Collapse</summary>

Main rules:

- Display is always 480x320. Cache once:
  `const W = h.getWidth(), H = h.getHeight()` or simply use
  `const W = 480, H = 320` since these will never change.
- Every variable costs a scarce Espruino block. Prefer `const` / `let`, never
  `var`, inline single-use values.
- Use global `h` directly and chain graphics calls. Do not alias `h`.
- Redraw only what changed (`clearRect`, clipping, dirty flags).
- Interval-driven apps rely on OS auto-flush - do not `h.flip()` from a
  `setInterval` loop. For `Pip.onFrame`, set `Pip.lastFlip = getTime()` before
  drawing and `h.flip()` after.
- `"ram"` for hot frame functions, `"jit"` for small numeric loops - only with a
  measured need.
- Use `Math.randInt(n)` instead of `Math.random()`.
- No `async`/`await`, ES modules, template literals, `fetch()`, or
  `requestAnimationFrame()`.
- Keep the app scoped as a function expression that returns `{ id, remove }`.
- Tear down every listener, interval, timeout, watch, and audio/video in
  `remove()`. Never call `load()` or `E.reboot()` from `remove()`.

Useful checks:

```js
process.memory();
print(E.getSizeOf(this, 1).sort((a, b) => a.size - b.size));
print(E.getSizeOf(Pip, 1).sort((a, b) => a.size - b.size));
print(E.getSizeOf(this['\xFF'], 1).sort((a, b) => a.size - b.size));
```

</details>

<p align="right">[ <a href="#index">Index</a> ]</p>

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## Contributing <a name="contributing"></a>

<details>
<summary>Expand/Collapse</summary>

1. Fork the repository:

   https://github.com/CodyTolene/pip-boy-3000-holotapes/fork

2. Clone your fork:

   ```sh
   git clone https://github.com/<my-username>/pip-boy-3000-holotapes.git
   cd pip-boy-3000-holotapes
   npm install
   ```

   > ![img-info][img-info] Replace `<my-username>` with your GitHub username.

3. Sync with upstream `main`, then branch:

   ```sh
   git checkout main
   git pull origin main
   git checkout -b <my-branch>
   ```

4. Make the change. New Holotapes need every file in
   [Creating a new Holotape](#create).

   > ![Warn][img-warn] Submit TypeScript sources under `storage/`. Do not commit
   > generated `.JS`, `.MIN.JS`, or the generated `registry.json`. Readable
   > source is required so the community can review and maintain apps.

5. Verify and test on a real Pip-Boy:

   ```sh
   npm run verify
   ```

6. Before opening a pull request:
   - `npm run verify` passes; no generated build output is committed.
   - Source is a function expression that is never invoked; return has a literal
     uppercase `id` and a `remove` function.
   - Every listener, interval, timeout, and watch is cleared; audio stopped if
     used.
   - No `any` / `unknown`; use real interfaces (see [agents.md](agents.md)).
   - Metadata: unique lowercase id, semver, valid type, matching fully uppercase
     `HOLO/<APP_ID>/` `pipboy` paths, with `source` pointing at `.ts` for
     scripts.
   - `README.md` documents controls; `ChangeLog` has an entry.
   - App opens, closes, and reopens cleanly on hardware.

7. Push and
   [open a pull request](https://github.com/CodyTolene/pip-boy-3000-holotapes/pulls)
   into `main`. Include screenshots or video when the UI changed.

</details>

<p align="right">[ <a href="#index">Index</a> ]</p>

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## License <a name="licenses"></a>

This repository is licensed under the MIT License by default. See
[LICENSE](LICENSE).

All code, holotapes, apps, games, scripts, metadata, documentation, assets, and
other contributions submitted to this repository (including pull requests and
issue attachments) must be MIT-licensed unless the repository maintainer states
otherwise in writing. By submitting a contribution, you agree it is provided
under the MIT License. Do not submit material you do not have the right to
license under MIT. Contributions with incompatible terms may be rejected or
removed.

Some individual files or assets may carry their own rights. When that happens it
is noted in that file's source and/or the holotape's `README.md`. Pip-Boy.com
has been given explicit permission to use those materials; that permission is
documented on a per-case basis in the same places.

`SPDX-License-Identifier: MIT`

<p align="right">[ <a href="#index">Index</a> ]</p>

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

<!-- IMAGE REFERENCES -->

[img-info]: .github/images/ng-icons/info.svg
[img-warn]: .github/images/ng-icons/warn.svg

<!-- LINK REFERENCES -->

[link-pip-boy]: https://pip-boy.com
[link-holotape-creator]: https://www.pip-boy.com/3000/holotapes/create
