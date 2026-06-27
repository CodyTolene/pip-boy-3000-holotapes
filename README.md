<div align="center">
  <img align="center" src=".github/images/logo.png" height="400" />
  <h1 align="center">Pip-Boy 3000 Holotapes</h1>
  <p align="center">
    A community driven repository of custom applications and games for the 
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
- [License(s)](#licenses)

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## Description <a name="description"></a>

Pip-Boy 3000 Holotapes by the community, for the community.

Install on: [pip-boy.com][link-pip-boy]

Follow the guide below to create your own custom Holotapes for the Pip-Boy 3000!

<p align="right">[ <a href="#index">Index</a> ]</p>

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## Creating a new Holotape <a name="create"></a>

1. Create a directory for the app or game under `holotapes/`. Every Holotape
   must use this structure:

   ```text
   holotapes/<YourHolotape>/
   ├── app.js
   ├── app.min.js
   ├── metadata.json
   ├── README.md
   ├── ChangeLog
   └── assets/
   ```

2. Write the unminified source in `app.js`. The app must be an anonymous
   function expression that the Pip-Boy OS invokes; do not invoke it yourself
   with a trailing `()`. It must return an uppercase alphanumeric `id` and a
   `remove` function.

   Example app:

   <details>
   <summary>Expand/Collapse</summary>

   ```js
   (function () {
     const W = h.getWidth(),
       H = h.getHeight();
     let leftWheel = 0,
       rightWheel = 0,
       lastInput = 'NONE';

     function draw() {
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

     function onKnob1(dir, long) {
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

     function onKnob2(dir) {
       if (dir) {
         rightWheel += dir;
         lastInput = dir < 0 ? 'RIGHT UP' : 'RIGHT DOWN';
         Pip.playSound('SCROLL');
       }
       draw();
     }

     Pip.audioStop();
     Pip.onExclusive('knob1', onKnob1);
     Pip.onExclusive('knob2', onKnob2);
     draw();

     return {
       id: 'EXAMPLE',
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

3. Add `metadata.json`. Asset paths and storage URLs are relative to the
   Holotape directory. The storage directory is the metadata `id` converted to
   uppercase, with underscores replacing hyphens.

   ```json
   {
     "id": "example",
     "name": "Example Holotape",
     "author": "@your-github-username",
     "version": "1.0.0",
     "description": "A short, one-sentence description.",
     "icon": "assets/icon.png",
     "previews": [],
     "type": "app",
     "readme": "README.md",
     "storage": [{ "name": "HOLO/EXAMPLE/APP.JS", "url": "app.min.js" }],
     "storageOptional": []
   }
   ```

   The metadata `id` must contain only lowercase letters, numbers, and hyphens;
   `version` must use semantic versioning; and `type` must be exactly `app` or
   `game`. Do not edit `holotapes/registry.json` manually. `npm run build`
   generates it from each `metadata.json` file.

4. Document the description, controls, installation, tested firmware, and
   credits in the Holotape's `README.md`.

5. Add at least one `ChangeLog` entry in this format:

   ```text
   1.0.0 (yyyy-mm-dd)
   <pull-request-or-change-link>
   - Initial release
   ```

6. Generate `app.min.js` from `app.js` as described in
   [Build and minification](#build-minification). Both files must behave
   identically.

<p align="right">[ <a href="#index">Index</a> ]</p>

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## Development Workflow <a name="development"></a>

### Using Pip-Boy.com

<details>
<summary>Expand/Collapse</summary>

1. Open the [Pip-Boy 3000 Holotape Creator/Editor][link-holotape-creator].

2. Create a new Holotape and give it a name.

3. Create or edit the Holotape code in the built-in editor.

4. Test your Holotape on the device using the "Save & Test" button.

   > ![img-info][img-info] The editor's "Encode" button can prepare code for
   > testing. Keep the readable source as `app.js` and the encoded/minified
   > output as `app.min.js`.

5. Download your files and add them to this repository.
</details>

### Using the Espruino Web IDE

You can use one of the two methods below to upload and test your Holotape:

<details>
<summary>Expand/Collapse</summary>

1. Open the [Espruino Web IDE](https://www.espruino.com/ide/) or its
   [GitHub-hosted version](https://espruino.github.io/EspruinoWebIDE).

2. Open your file:

   ![img-open-file](.github/images/screenshots/open-file.png)

3. Enable **Watch File**.

   ![img-watch-file](.github/images/screenshots/watch-file.png)

4. Edit the app in VS Code or the Web IDE's built-in editor.

5. Enable **Settings > Minification > Esprima: Mangle**.

6. Set **Settings > Minification > Pretokenise code before upload** to
   **Yes/Always**.

7. Upload to the device for testing.

> ![img-info][img-info] You can use a boot code file to boot straight into the
> app.

</details>

### Build and minification <a name="build-minification"></a>

Minify and Encode your Holotape here:

https://www.pip-boy.com/3000/holotapes/create

This will give you a proper `app.min.js` from `app.js`.

Run the repository build after adding or changing metadata:

```sh
npm install
npm run build
```

This rebuilds `holotapes/registry.json`, rewrites relative file paths for the
registry, and rejects metadata whose `type` is not `app` or `game`. It does not
generate `app.min.js` or perform all of the submission checks for you.

<p align="right">[ <a href="#index">Index</a> ]</p>

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## Images <a name="images"></a>

<details>
<summary>Expand/Collapse</summary>

Holotape images must be bitmaps with a maximum color depth of 4bpp. Convert
source artwork with the
[Image Converter](https://www.pip-boy.com/tools/image-converter).

Prefer one `h.drawImage()` call over many procedural drawing calls for sprites.

Small sprites can be stored inline:

```js
const sprites = { icon: atob('...') };
h.drawImage(sprites.icon, 120, 80);
```

Larger collections can be stored separately and loaded from the SD card. Defer
large asset loads with `setTimeout(..., 0)` and call `E.defrag()` first:

```js
let sprites,
  assetTimeout = setTimeout(function () {
    E.defrag();
    sprites = eval(require('fs').readFileSync('HOLO/MYAPP/IMG.JS'));
    h.drawImage(sprites.icon, 120, 80);
  }, 0);
```

Any asset timeout must be cleared in `remove()`. Very large backgrounds can be
streamed into `h.buffer` with `E.openFile()` and `Uint8Array` instead of being
held as another complete image in memory.

Metadata icons must be PNG files. Preview files may be PNG, GIF, or MP4, and
their paths must be relative to the Holotape directory.

</details>

<p align="right">[ <a href="#index">Index</a> ]</p>

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## Input handling <a name="input"></a>

<details>
<summary>Expand/Collapse</summary>

Use `Pip.onExclusive()` when an app needs exclusive control input handling:

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

`Pip.onExclusive()` is the preferred default. Use `Pip.on()` only when the app
intentionally needs to coexist with another handler. A `setWatch()` on
`ENC1_PRESS` is reserved for unusually latency-sensitive press handling. A
direct watch on a button such as `BTN_DATA` is appropriate only when no
`Pip.on()` event exists.

Remove every listener and watch when the app exits:

```js
Pip.removeListener('knob1', onKnob1);
clearWatch(buttonWatch);
```

</details>

<p align="right">[ <a href="#index">Index</a> ]</p>

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## Memory and Performance <a name="memory"></a>

<details>
<summary>Expand/Collapse</summary>

Main rules:

- The display is always 480×320. If dimensions are needed repeatedly, declare
  them once as `const W = h.getWidth(), H = h.getHeight()`.
- Every variable consumes a scarce Espruino block. Use `const` for constants,
  `let` for mutable state, never `var`, and inline single-use values.
- Always use the global `h` graphics object directly and chain graphics calls.
  Do not spend a variable block on an alias for `h`.
- Use `h.clearRect()`, clipping, cached wrapped text, and dirty flags to redraw
  only changed regions.
- Timer-driven apps normally rely on the OS auto-flush. Do not call `h.flip()`
  from a `setInterval()` loop. For `Pip.onFrame` rendering, set
  `Pip.lastFlip = getTime()` before drawing and call `h.flip()` after drawing.
- Use `"ram"` for performance-critical frame functions and `"jit"` for small,
  numeric tight loops. Do not use either without a measured need.
- Use `Math.randInt(n)` instead of `Math.random()`, and use typed arrays for
  dense numeric data.
- Espruino does not support `async`/`await`, ES modules, template literals,
  `fetch()`, `XMLHttpRequest`, or `requestAnimationFrame()`.
- Keep the app scoped:

  ```js
  (function () {
    // App code here
    return {
      id: 'APPID',
      notDefault: true,
      fullscreen: true,
      remove: function () {
        /* clean up app resources */
      },
    };
  });
  ```

- Clean up every resource created by the app in `remove()`:

  ```js
  remove: function() {
    Pip.removeListener("knob1", onKnob1);
    clearInterval(intervalId);
    clearTimeout(timeoutId);
    clearWatch(watchId);
    Pip.audioStop();
    h.clear();
  }
  ```

- Never call `load()` or `E.reboot()` from `remove()`, call `Pip.remove()` at
  the top of the app, use a bare `clearWatch()`, or delete/reassign OS globals.

Useful memory checks:

```js
process.memory();
print(E.getSizeOf(this, 1).sort((a, b) => a.size - b.size));
print(E.getSizeOf(Pip, 1).sort((a, b) => a.size - b.size));
print(E.getSizeOf(this['\xFF'], 1).sort((a, b) => a.size - b.size));
```

`this['\xFF']` shows timers, watches, and internal runtime state.

`Pip.CURRENT` can hold the current page or app code.

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

2. Clone your fork and enter the repository:

   ```sh
   git clone https://github.com/<my-username>/pip-boy-3000-holotapes.git
   cd pip-boy-3000-holotapes
   ```

   > ![Info][img-info] Replace `<my-username>` with your GitHub username.

3. Sync your fork before starting. On your fork's GitHub page, select **Sync
   fork > Update branch**. Then update local `main` and merge it into your
   working branch:

   ```sh
   git checkout main
   git pull origin main
   git checkout -b <my-branch>
   git merge main
   git push origin <my-branch>
   ```

   To merge all the new updates from the original repository's `main` branch
   directly into your checked out working branch:

   ```sh
   git checkout <my-branch>
   git pull https://github.com/CodyTolene/pip-boy-3000-holotapes.git main
   git push origin <my-branch>
   ```

   Replace `<my-branch>` with your branch name. If the branch does not exist
   yet, create it from the updated `main` branch with:

   ```sh
   git checkout -b my-holotape
   ```

4. Make the change. New Holotapes must include all files described in
   [Creating a new Holotape](#create).

5. Run the repository build and test the Holotape on the device:

   ```sh
   npm install
   npm run build
   ```

6. Before opening a pull request, verify:
   - `app.js` starts with `(function() {`, ends with `});`, and is not invoked.
   - The return object contains a literal uppercase alphanumeric `id` and a
     `remove` function.
   - Every listener, interval, timeout, and watch is removed or cleared; audio
     is stopped if used.
   - `remove()` exits cleanly without `load()` or `E.reboot()`.
   - No unsupported language/runtime features or OS-global mutations are used.
   - `app.min.js` exists and behaves exactly like `app.js`.
   - Metadata uses a unique lowercase ID, semantic version, valid type, valid
     relative paths, and the matching `HOLO/<APP_ID>/` storage prefix.
   - `README.md` documents controls and `ChangeLog` contains an entry.
   - Images are converted bitmaps at 4bpp or less.
   - The app can be opened, closed, and opened again without leaking resources.
   - Memory usage is acceptable before, during, and after the app runs.

7. Stage, commit, and push your changes. For a branch named `<my-branch>`:

   ```sh
   git add -A && git commit -m "My change description" && git push origin <my-branch>
   ```

8. [Open a pull request](https://github.com/CodyTolene/pip-boy-3000-holotapes/pulls)
   from your working branch to this repository's `main` branch. Describe the
   change and include screenshots, GIFs, or video previews when the UI changed.

</details>

<p align="right">[ <a href="#index">Index</a> ]</p>

<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->
<!---------------------------------------------------------------------------->

## License(s) <a name="licenses"></a>

This project is licensed under the MIT License.

Some projects in this repository may have their own licenses. Check each app or
game's individual files and README for license terms that apply to that specific
project.

See the [LICENSE-MIT](LICENSE-MIT) file for more details.

`SPDX-License-Identifiers: MIT`

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
