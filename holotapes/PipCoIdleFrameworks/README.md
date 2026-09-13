# PIP-CO Idle Frameworks v1.1.0

A configurable idle/screensaver framework for The Wand Company Pip-Boy 3000.

PIP-CO Idle Frameworks can run its built-in PIP-BOY 3000 falling-bomb
screensaver or dynamically use compatible screensavers from separately installed
provider holotapes.

## Features

- 2-minute automatic idle activation
- Built-in PIP-BOY 3000 falling-bomb screensaver
- Optional Mesmetron integration
- Optional Pipquarium integration
- Live preview from the PIP-CO menu
- Fullscreen automatic-idle runner
- Provider entries only appear when the matching provider holotape is installed
- PIP-CO owns wake/exit controls while a provider is running as an idle
- Provider holotapes retain their native behavior when opened normally
- Radio/audio detection remains read-only

## Optional providers

### Mesmetron

Mesmetron is not bundled with PIP-CO Idle Frameworks. If
`HOLO/MESMETRON/TITLE.JS` is installed, PIP-CO reads Mesmetron's current
screensaver list dynamically. Removing Mesmetron removes those entries from
PIP-CO automatically.

### Pipquarium

Pipquarium is not bundled with PIP-CO Idle Frameworks. If
`HOLO/PIPQUARIUM/APP.JS` is installed, Pipquarium appears automatically as an
available provider.

## Controls

- Left wheel: navigate the menu
- Left wheel press: select / enable / disable / preview
- Either scroll-wheel press: exit an active screensaver or preview
- `< Back`: return to the previous menu or Misc

## Runtime / compatibility notes

Version 1.1.0 separates the settings UI from a lightweight wake watcher and
transient idle service. When the holotape closes with an idle provider enabled,
`WAKE.JS` watches for two minutes of inactivity and loads `IDLE.JS` only when a
fullscreen screensaver actually needs to run.

On a true cold reboot, crash reboot, or full power-loss reset, Idle Frameworks
returns to **disabled**. Normal same-session standby/off-to-on behavior
preserves the configured idle provider.

The framework checks existing radio/audio state before starting its own built-in
audio and does not replace the stock radio implementation.

## Tested hardware

- The Wand Company Pip-Boy 3000
- Pip-Boy OS 1.1.6 / firmware build 2v29.361

## Credits

@LlamaYeYe
