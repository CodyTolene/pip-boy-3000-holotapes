# PIP-CO Startup Systems v1.4.0

Pick a custom startup animation to play in place of the stock Pip-Boy boot video, from four categories plus your own drop-in Custom Bootups.

## Categories

Each category only appears if at least one animation from that category is installed.

- **Special Bootups** — Mister Handy, Vault Girl, Deathclaw Vault Experiment, Enclave PIP-BOY
- **Faction Bootups** — The Enclave, The Brotherhood of Steel, The Minutemen, Mothman
- **NPC Bootups** — YES MAN, Mr. House, Classic Mr. House, Classic Mr. House Animated, Classic Mr. House Fully Animated, Dogmeat
- **Custom Bootups** — `Custom_Bootup.AVI` through `Custom_Bootup_5.AVI` under `HOLO/STARTUP_ANIMATIONS/`

## Controls

- **Left wheel, rotate** — move the selection.
- **Left wheel, press** — open a category or activate the highlighted bootup.
- **Default Bootup** — restores the original Pip-Boy startup immediately.
- **< Back** — returns to the previous menu; at the top level it exits to Misc.

The active startup is marked `ACTIVE`.

## Runtime and memory design

The repository keeps readable source separate from the device runtime:

- `app.js` — human-readable settings UI.
- `app.min.js` — installed UI runtime.
- `STARTUP_RUNTIME.JS` — human-readable persistent boot hook.
- `assets/STARTUP_RUNTIME.MIN.JS` — installed persistent runtime.
- `STARTUP_WAKE.JS` — human-readable deferred loader.
- `assets/STARTUP_WAKE.MIN.JS` — installed deferred loader.

`STARTUP_RUNTIME` and `STARTUP_WAKE` stay split so the wake module can remain tiny and defer the larger runtime until it is actually needed. Whole-module `"ram"` directives were removed; the runtime relies on compact install files, lazy evaluation, immediate release of temporary source/factory references, and defragmentation at heavy transitions instead of forcing the complete modules into the JavaScript variable-block pool.

The runtime stores animation duration tables in typed arrays, owns only the video/audio state it starts, removes its `videoStopped` listener and boot timers after every boot, and restores the original `Pip.bootAnimation` / `Pip.audioStart` functions when Default Bootup is selected.

A cold JS session resets the selection to Default. Normal standby/off-to-on behavior within the same live session preserves the selected startup.

## Installation

Install through pip-boy.com. Startup AVIs are optional and large, so install only the animations you want.

## Firmware tested

Designed for The Wand Company Pip-Boy 3000 firmware 1.1.6. Real-device testing remains the final stability check after this review cleanup.

## Credits

@LlamaYeYe


## MISC holotape icon

The package includes `APPINFO/PIP_CO_STARTUP_SYSTEMS.info` and the supplied `PIP_CO_STARTUP_SYSTEMS.IMG`. The APPINFO entry points its `icon` field at `HOLO/STARTUP_ANIMATIONS/PIP_CO_STARTUP_SYSTEMS.IMG`, so the custom image is used for the holotape entry in MISC.
