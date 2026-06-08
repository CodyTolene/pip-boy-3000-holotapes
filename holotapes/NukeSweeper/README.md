# NukeSweeper

A Minesweeper-style game for the Pip-Boy 3000. Navigate a 9x9 grid using the
scroll wheels, reveal squares, and avoid the 10 hidden mines. Your first reveal
is always safe.

## Controls

| Input                                 | Action                                           |
| ------------------------------------- | ------------------------------------------------ |
| Left scroll wheel (knob1) up/down     | Move cursor up/down                              |
| Right scroll wheel (knob2) left/right | Move cursor left/right                           |
| Left scroll wheel press               | Reveal selected square / Restart after game over |

## Rules

- Standard Minesweeper rules apply.
- The first square revealed is always mine-free (mines are placed after the
  first click).
- Revealing an empty square (no adjacent mines) flood-fills all connected empty
  squares automatically.
- Reveal all non-mine squares to win.
- Reveal a mine and it's game over — all mines are shown.

## Installation

Place the following files on your Pip-Boy 3000 SD card:

```
APPS/MINESWEEPER.JS
APPINFO/MINESWEEPER.info
```

## Firmware Tested

Pip-Boy 3000 — firmware version tested in development session (June 2026).

## Notes

- Grid is 9x9 with 10 mines (beginner standard).
- Flood fill uses an iterative queue to avoid stack overflow on large empty
  regions.
- The cursor is visible on all squares regardless of color.
- Idle filter is suppressed during app and restored on exit.

## License

MIT
