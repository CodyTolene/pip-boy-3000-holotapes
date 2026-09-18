# PIP-CO Idle Frameworks v1.2.0

Adds a 2-minute Pip-Boy idle screensaver with a choice of the built-in PIP-BOY 3000 animation, an installed Mesmetron item, or Pipquarium.

## Options

- **PIP-BOY 3000** — built-in logo/bomb screensaver with its own audio bed.
- **Mesmetron** — installed Mesmetron entries are discovered from `HOLO/MESMETRON/TITLE.JS`.
- **Pipquarium** — appears automatically when `HOLO/PIPQUARIUM/APP.JS` exists.

Only one idle provider can be active at a time.

## Controls

- **Left wheel, rotate** — move the selection.
- **Left wheel, press** — open a submenu, toggle an option, Preview, or Back.
- **Either wheel while a preview/screensaver is active** — exit the idle renderer.

## Runtime and memory design

The settings UI is not kept resident. On exit it stores the selection and arms a lightweight wake watcher. The wake watcher waits for two minutes of inactivity, then loads `IDLE.JS`, which loads the service and only the selected renderer.

Readable source is kept in the holotape root while optimized runtime copies live under `assets/` and are the files installed by `metadata.json`. Readable source is kept separate from the compact installed runtime. Large components are lazy-loaded only when needed, and whole-module `ram` directives are avoided so normal Pip-Boy use keeps a smaller resident footprint.

Additional cleanup in this build:

- `TITLE.BIN` is loaded once per settings session instead of being re-read on every menu redraw.
- The bomb sprite is stored as `BOMB.BIN` instead of eval-loading a JavaScript/base64 image object.
- Lazy-loaded source strings/factories are released immediately after evaluation.
- All owned timers and knob listeners are explicitly tracked and cleared.
- The lightweight wake watcher is the only resident idle component while normal Pip-Boy menus are in use.
- Existing radio/audio playback is detected so the built-in screensaver does not take over audio that it does not own.

## Installation

Install through pip-boy.com.

## Firmware tested

Designed for The Wand Company Pip-Boy 3000 firmware 1.1.6. Tested against The Wand Company Pip-Boy 3000 firmware 1.1.6; real-device idle/wake/menu behavior remains the final source of truth.

## Credits

@LlamaYeYe

## MISC holotape icon

The package includes `APPINFO/PIP_CO_IDLE_FRAMEWORKS.info` and the supplied `PIPCOIDLEFRAMEWORKS.IMG`. The APPINFO entry points its `icon` field at `HOLO/FALLOUT_SCREENSAVER/PIPCOIDLEFRAMEWORKS.IMG`, so the custom image is used for the holotape entry in MISC.
