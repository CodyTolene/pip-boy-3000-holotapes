# PIP-CO Startup Systems

A custom Holotape for The Wand Company Pip-Boy 3000 that lets the user choose
which startup sequence plays when the Pip-Boy wakes.

## Startup choices

- Default Bootup
- Mister Handy
- Vault Girl
- Deathclaw Ripped Suit

The selected custom startup uses a matching AVI animation and WAV audio file.
The selection is stored in `HOLO/STARTUP_ANIMATIONS/SELECT.JSON`.

## Controls

- Left wheel: move through the menu
- Left wheel press: select
- `< Back`: return to MISC

## Installation

Install through the Pip-Boy Holotape installer/registry after the repository
build generates the registry entry.

Runtime files are installed under:

`HOLO/STARTUP_ANIMATIONS/`

## Hardware / firmware testing

Tested on The Wand Company Pip-Boy 3000 hardware.

The exact firmware version used for the final device test was not recorded in
the supplied final package and should be added here before submitting the pull
request.

## Notes

This Holotape modifies the live startup behavior so the selected animation can
persist after leaving the Holotape and play on the next wake.

## Credits

Created by @LlamaYeYe.

Pip-Boy 3000 is a product of The Wand Company / Bethesda.
