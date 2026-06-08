# Checkers

A two-player Checkers game for the Pip-Boy 3000, with you playing against an AI
opponent. Standard rules apply including forced jumps, multi-jumps, and king
promotion.

## Controls

| Input                                 | Action                                           |
| ------------------------------------- | ------------------------------------------------ |
| Left scroll wheel (knob1) up/down     | Move cursor up/down                              |
| Right scroll wheel (knob2) left/right | Move cursor left/right                           |
| Left scroll wheel press               | Select piece / Confirm move / Deselect / Restart |

## Rules

- Standard Checkers rules.
- You play as the bright pieces (color 3), moving up the board.
- AI plays as the dark pieces (color 1), moving down.
- Forced jumps are enforced — if a jump is available you must take it.
- Multi-jumps are handled for both player and AI.
- Pieces reaching the opposite end are promoted to kings (marked with K).
- Kings can move diagonally in all four directions.
- Win by capturing all opponent pieces or leaving them with no valid moves.

## AI Behavior

- Prioritizes jumps over simple moves.
- Prefers moves that promote a piece to king.
- Otherwise selects randomly from available moves.
- AI takes a short pause before moving so you can see the board state.

## Installation

Place the following files on your Pip-Boy 3000 SD card:

```
APPS/CHECKERS.JS
APPINFO/CHECKERS.info
```

## Firmware Tested

Pip-Boy 3000 — firmware version tested in development session (June 2026).

## Notes

- Board uses 35x35px cells to fit within the 320px screen height.
- Cursor is visible on all squares including light squares to prevent
  disorientation during navigation.
- Valid destinations are highlighted when a piece is selected.
- Idle filter suppressed during app, restored on exit.

## License

MIT
