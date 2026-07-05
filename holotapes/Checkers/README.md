# Checkers

### Info

**Author(s):**

- [@trekker87](https://github.com/trekker87)

- [@CodyTolene](https://github.com/CodyTolene)

### Description

A two-player Checkers game for the Pip-Boy 3000, with you playing against an AI
opponent. Standard rules apply including forced jumps, multi-jumps, and king
promotion. Boot it up to a title menu with a built-in "How to Play" screen.

### Controls

Main Menu:

| Input                  | Action         |
| ---------------------- | -------------- |
| Left/Right knob scroll | Move selection |
| Left knob press        | Confirm        |

Game:

| Input             | Action                                           |
| ----------------- | ------------------------------------------------ |
| Left knob scroll  | Move cursor up/down                              |
| Right knob scroll | Move cursor left/right                           |
| Left knob press   | Select piece / Confirm move / Deselect / Restart |

### Rules

- Standard Checkers rules.
- You play as the bright pieces, moving up the board.
- AI plays as the dark pieces, moving down.
- Forced jumps are enforced; if a jump is available you must take it.
- Multi-jumps are handled for both player and AI. After a jump, if the same
  piece can jump again you must continue: move the cursor to a highlighted
  landing square and press to confirm.
- Pieces reaching the opposite end are promoted to kings (marked with K).
  Promotion ends the turn, even mid-jump.
- Kings can move and jump diagonally in all four directions.
- Win by capturing all opponent pieces or leaving them with no valid moves.

### AI Behavior

- Prioritizes jumps over simple moves (forced, same as the player).
- Prefers moves that promote a piece to king.
- Otherwise selects randomly from available moves.
- AI takes a short pause between moves so you can follow the board state.

### Notes

- The holotape is split into scenes (menu, game, help) that are loaded from the
  SD card on demand and released afterward to keep memory usage low.
- Board uses 35x35px cells to fit within the 320px screen height.
- The cursor is visible on all squares, including light squares, to prevent
  disorientation during navigation.
- Valid destinations are highlighted when a piece is selected.

### Installation

Place the following files on your Pip-Boy 3000 SD card:

```
HOLO/CHECKERS/APP.JS
HOLO/CHECKERS/GAME.JS
HOLO/CHECKERS/HELP.JS
HOLO/CHECKERS/MENU.JS
```

### License

MIT
