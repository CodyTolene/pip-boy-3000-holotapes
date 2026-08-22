# PIP-CO Startup Systems

A modular custom-startup holotape for The Wand Company Pip-Boy 3000. Select a
startup sequence in the holotape, then the selected animation is used on the
next Pip-Boy boot/wake.

## Pip-Boy.com modular installation

The core installs automatically. Each startup AVI is optional, so users can
install only the startup sequences they want. Audio is embedded in each AVI;
there are no separate startup WAV dependencies. The holotape only shows startups
whose AVI is installed.

### Core files

- `HOLO/STARTUP_ANIMATIONS/APP.JS`
- `HOLO/STARTUP_ANIMATIONS/SELECT.JSON`
- `HOLO/STARTUP_ANIMATIONS/TITLE.BIN`

### Optional startup sequences

- Mister Handy
- Vault Girl
- Deathclaw Vault Experiment
- Enclave PIP-BOY
- The Enclave
- The Brotherhood of Steel
- The Minutemen
- Mothman
- YES MAN
- Mr. House
- Classic Mr. House
- Classic Mr. House Animated
- Classic Mr. House Fully Animated
- Dogmeat

## Controls

- Left wheel: navigate
- Left wheel press: select
- `< Back`: return to Misc
- NPC submenu: includes a scroll indicator when the list extends beyond the
  visible rows

## Runtime / compatibility notes

Version 1.1.0 uses a small persistent startup service separated from the
holotape menu/UI. This prevents the startup hook from retaining the full menu,
title, and scroller closure after the holotape closes. The change was made after
repeated hardware testing exposed `CALLBACK`, `LOW_MEMORY`, and `MEMORY`
failures on Pip-Boy OS 1.1.6.

The hard-failsafe timer now begins after `Pip.videoStart()` succeeds, so
firmware/pre-play delays do not consume the startup's playback window.
Event-ended startup videos continue to use `videoStopped`; timer-ended startups
use their normal fade path.

`ENCLAVE_PIPBOY.AVI` uses the clean rebuilt media stream that resolved an
audio-only/black-video startup case during 1.1.6 testing. Other startup media
remains on its previously working encoding.

Runtime APPINFO self-registration and diagnostic PIP-CO logging are not used in
the repository/modular build. Registration is handled by `metadata.json`.

## Tested hardware

- The Wand Company Pip-Boy 3000
- Pip-Boy OS 1.1.6 / firmware build 2v29.361
- Repeated startup selection, holotape reopen, and boot-cycle testing across all
  included startup entries
