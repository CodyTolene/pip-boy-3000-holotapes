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
- `HOLO/STARTUP_ANIMATIONS/STARTUP_RUNTIME.JS`
- `HOLO/STARTUP_ANIMATIONS/STARTUP_WAKE.JS`
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

## Community Custom Bootups

PIP-CO Startup Systems can automatically detect up to five user/community
startup animations directly in `HOLO/STARTUP_ANIMATIONS/`. No JavaScript
editing, JSON descriptor, or additional folder is required.

Supported filenames:

- `Custom_Bootup.AVI`
- `Custom_Bootup_2.AVI`
- `Custom_Bootup_3.AVI`
- `Custom_Bootup_4.AVI`
- `Custom_Bootup_5.AVI`

When at least one of these files exists, a **Custom Bootups** submenu appears
automatically. Missing slots remain hidden. Audio should be embedded in the AVI,
matching the normal Startup Systems media format. Custom bootups use the
firmware `videoStopped` event as their normal completion signal, with a hard
failsafe for safety.

This scan occurs when the holotape UI opens; the persistent startup runtime does
not continuously scan the SD card.

## Controls

- Left wheel: navigate
- Left wheel press: select
- `< Back`: return to Misc
- NPC submenu: includes a scroll indicator when the list extends beyond the
  visible rows

## Runtime / compatibility notes

Version 1.3.0 further separates the holotape UI from the startup runtime. The
full menu closure is released when the holotape closes; a small deferred wake
loader arms the persistent startup runtime only when needed. This reduces
retained RAM compared with keeping the full startup implementation inside the UI
app.

On a true cold reboot, crash reboot, or full power-loss reset, Startup Systems
returns to **Default Bootup**. Normal same-session standby/off-to-on behavior
keeps the selected custom startup active.

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
