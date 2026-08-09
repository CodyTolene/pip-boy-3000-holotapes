# PIP-CO Startup Systems

A custom Holotape for The Wand Company Pip-Boy 3000 that lets the user choose
which startup sequence plays when the Pip-Boy wakes.

## Modular startup choices

### Special Bootups

- Mister Handy
- Vault Girl
- Deathclaw Vault Experiment

### Faction Bootups

- The Enclave
- The Brotherhood of Steel

### NPC Bootups

- YES MAN

`Default Bootup` is always available.

The menu dynamically detects installed startup media. A custom startup appears
only when both its matching AVI animation and WAV audio file are installed.

## Optional installation

The Core files install normally. Startup media is listed through the
repository's `storageOptional` system so users can install only the startup
content they want.

Each startup currently consists of two optional files:

- Animation
- Audio

Install both files for a startup to make it appear in PIP-CO. If only one file
is present, the Core hides that incomplete startup instead of exposing a broken
menu entry.

## Dynamic categories

Categories are shown only when at least one complete startup is installed in
that category:

- Special Bootups
- Faction Bootups
- NPC Bootups

If a selected startup is later removed, PIP-CO detects the missing media and
safely returns to Default Bootup.

## Controls

- Left wheel: move through the menu
- Left wheel press: select
- `< Back`: return to the previous menu / MISC

## Installation path

Runtime files are installed under:

`HOLO/STARTUP_ANIMATIONS/`

The selected startup is stored in:

`HOLO/STARTUP_ANIMATIONS/SELECT.JSON`

## Startup reliability

Version 2.0.0 includes the tested startup reliability changes:

- memory defragmentation before custom playback
- AVI playback starts before WAV playback
- 180 ms video decoder head start
- matching cleanup delay
- stale selection repair when optional media is removed

## Hardware / firmware testing

Tested on The Wand Company Pip-Boy 3000 hardware with:

- Core
- Special Bootups
- YES MAN
- The Brotherhood of Steel
- The Enclave
- dynamic add/remove detection

## Credits

Created by @LlamaYeYe.

Pip-Boy 3000 is a product of The Wand Company / Bethesda.
