# PIP-CO Idle Frameworks

A configurable idle/screensaver framework for The Wand Company Pip-Boy 3000.

PIP-CO Idle Frameworks can run its built-in Pip-Boy 3000 falling-bomb
screensaver or use compatible screensavers from an installed Mesmetron holotape
as idle providers.

## Features

- 2-minute idle activation
- Built-in PIP-BOY 3000 falling-bomb screensaver
- Optional Mesmetron idle-provider integration
- Live preview for the built-in screensaver and each detected Mesmetron idle
- Mesmetron screensavers are detected from the installed
  `HOLO/MESMETRON/TITLE.JS`
- Idle Framework owns the wake controls while a screensaver is active
- Mesmetron's native knob modifiers remain available when Mesmetron itself is
  opened normally
- Fullscreen automatic-idle runner prevents normal Pip-Boy page/header graphics
  from drawing over the screensaver
- Radio state/audio detection is read-only; the framework does not replace the
  Pip-Boy radio implementation

## Installation

Install through pip-boy.com / the holotape registry.

The installer creates the device-side `.info` registration from `metadata.json`.
The public app does not create or overwrite `APPINFO/*.info`.

Installed files are placed under:

`HOLO/FALLOUT_SCREENSAVER/`

Mesmetron is optional and is not bundled with this holotape. If a compatible
Mesmetron installation is present at `HOLO/MESMETRON/`, its current screensaver
list is read dynamically.

## Controls

Inside PIP-CO Idle Frameworks:

- Left wheel: move through menu items
- Left wheel press: select
- `Preview Screensaver`: start the selected preview immediately
- `< Back`: return

While an Idle Framework screensaver is active, wheel activity wakes/exits the
screensaver instead of changing Mesmetron brightness or modifiers.

## Idle Choices

### PIP-BOY 3000

The built-in Fallout-style falling-bomb screensaver.

### Mesmetron

When Mesmetron is installed, compatible entries from its actual `ITEMS` list are
shown automatically. Developer/example text outside that list is ignored.

Only one idle provider is selected at a time.

## Compatibility

The hardware-tested V23.67 runtime was specifically cleaned to coexist with:

- PIP-CO Startup Systems
- Mesmetron
- built-in FM radio
- other Pip-Boy pages such as RADIO, ITEMS, DATA, SETTINGS, and MISC

Idle Framework does not replace `Pip.audioStart`, `Pip.bootAnimation`,
`Pip.kickIdleTimer`, `Pip.goToSleep`, `Pip.onExclusive`, `Pip.CURRENT`, or
`Pip.blitOptions`.

Automatic idle uses a small fullscreen runner loaded through the normal holotape
path. Mesmetron modules retain their native `draw(h)` rendering behavior so
persistence-based effects such as Ribbon, Spiral, and Vortex render correctly.

## Configuration

The selected idle configuration is stored in:

`HOLO/FALLOUT_SCREENSAVER/CONFIG.JSON`

## Hardware-tested baseline

This repository update is based on **V23.67**, tested on The Wand Company
Pip-Boy 3000 after the cleanup and compatibility pass.
