# PIP-CO Startup Systems

A startup selector for The Wand Company Pip-Boy 3000.

This public modular build preserves the hardware-tested V79
startup/menu/playback behavior while moving MISC registration back to the normal
pip-boy.com metadata installation path.

## Installation

Install through pip-boy.com / the holotape registry. The website creates the
device-side `.info` registration from `metadata.json`, so the holotape appears
under Items > MISC.

The required **Core** installs:

- `HOLO/STARTUP_ANIMATIONS/APP.JS`
- `HOLO/STARTUP_ANIMATIONS/TITLE.BIN`
- `HOLO/STARTUP_ANIMATIONS/SELECT.JSON`

Startup media is optional. Each startup requires its matching **AVI + WAV
pair**. The app scans installed files and only shows a startup when both
required files are present.

The website/installer is responsible for creating the device `.info`
registration from `metadata.json`. `APP.JS` does not create or overwrite
`APPINFO/*.info`.

## Startup choices

### Special Bootups

- Mister Handy
- Vault Girl
- Deathclaw Vault Experiment
- Enclave PIP-BOY

### Faction Bootups

- The Enclave
- The Brotherhood of Steel
- The Minutemen
- Mothman

### NPC Bootups

- YES MAN

### Default Bootup

Restores the stock startup sequence.

## Controls

- Left wheel: move
- Left wheel press: select
- `< Back`: return

## Notes

The selected startup is stored in `HOLO/STARTUP_ANIMATIONS/SELECT.JSON`.

For a custom startup to appear in the menu, both its AVI and WAV must be
installed.

## Credits

Created by @LlamaYeYe.
