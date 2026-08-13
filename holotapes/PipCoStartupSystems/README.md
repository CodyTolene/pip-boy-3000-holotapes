# PIP-CO Startup Systems

A modular custom-startup holotape for The Wand Company Pip-Boy 3000.

## Modular installation

The core application is installed automatically. Each startup sequence is an
optional self-contained AVI, so users can install only the sequences they want.

Audio is embedded directly in each AVI. There are no separate startup WAV files
to install or keep paired with the animation.

The holotape scans the installed startup AVIs and only shows categories and
startup options whose media is present.

## Core files

- `HOLO/STARTUP_ANIMATIONS/APP.JS`
- `HOLO/STARTUP_ANIMATIONS/SELECT.JSON`
- `HOLO/STARTUP_ANIMATIONS/TITLE.BIN`

## Optional startup sequences

- Mister Handy
- Vault Girl
- Deathclaw Vault Experiment
- YES MAN
- The Enclave
- The Brotherhood of Steel
- Mothman
- The Minutemen
- Enclave PIP-BOY

## Controls

- Left wheel: navigate
- Left wheel press: select
- `< Back`: return to MISC

## Behavior

- `Default Bootup` restores the normal Pip-Boy startup.
- The selected startup remains active across boots.
- Missing optional startup AVIs are hidden automatically.
- Startup media is loaded only when needed.
- Runtime code does not create or overwrite APPINFO; registration is handled by
  the installer metadata.

## Hardware validation

This release is derived from the final hardware-tested runtime. All nine startup
sequences were tested on The Wand Company Pip-Boy 3000 after their matching
audio was embedded into the AVI files.

The public build removes the hardware-test-only APPINFO self-registration block;
startup behavior, timings, fades, failsafes, menu order, and selection behavior
remain unchanged.
