# Vault-Tec Timer

A countdown timer app for the Pip-Boy 3000. Set the number of minutes, choose
your alert style, and press the knob to start. When the timer expires, the
device will alert you with sound, flashing lights, or both — your choice.

## Controls

| Input                                 | Action                                                         |
| ------------------------------------- | -------------------------------------------------------------- |
| Left scroll wheel (knob1) up/down     | Cycle alert type (SOUND ONLY / LIGHTS ONLY / LIGHTS AND SOUND) |
| Right scroll wheel (knob2) left/right | Adjust minutes (1–99)                                          |
| Left scroll wheel press               | Start timer / Cancel timer / Reset after alert                 |

## Screens

- **Set screen** — Adjust minutes and alert type before starting
- **Running screen** — Displays countdown in MM:SS format
- **Done screen** — Plays selected alert until knob is pressed to reset

## Alert Types

- **SOUND ONLY** — Alternates SCROLL and TAB sounds every 500ms
- **LIGHTS ONLY** — Cycles screen through palette colors
- **LIGHTS AND SOUND** — Both simultaneously

## Installation

Place the following files on your Pip-Boy 3000 SD card:

```
APPS/TIMER.JS
APPINFO/TIMER.info
```

## Firmware Tested

Pip-Boy 3000 — firmware version tested in development session (June 2026).

## Notes

- The app suppresses the idle filter (screen jitter) while running and restores
  it on exit.
- Clean exit restores all listeners, intervals, and watches.

## License

MIT
