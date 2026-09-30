# Sudoku

### Info

**Author(s):**

- [@reket](https://github.com/reket)

### Description

A full 9x9 Sudoku for the Pip-Boy 3000, in three difficulties. Every puzzle has
exactly one solution and can be finished with pure logic - no guessing is ever
required. The side panel tracks the difficulty, your solve time, how many
squares are left, how many digits currently clash, and how many hints you have
taken.

A new puzzle is dealt every time the holotape is opened.

### Difficulty

| Level  | Solvable with                                              |
| ------ | ---------------------------------------------------------- |
| Easy   | Naked and hidden singles                                   |
| Normal | The above, plus locked candidates and naked / hidden pairs |
| Hard   | The above, plus naked / hidden triples and X-wing          |

Each level needs its hardest technique at least once, so a hard puzzle can never
be cracked with normal-level logic alone. Press **DATA** to pick a level;
confirming one always starts a new game, and the level then sticks until you
change it again.

### Controls

The right wheel on this hardware only scrolls, so the STAT and DATA buttons take
the place of its presses while the holotape is open. ITEM still exits.

| Input                   | Action                                     |
| ----------------------- | ------------------------------------------ |
| Left wheel (rotate)     | Move the cursor up/down a row              |
| Right wheel (rotate)    | Move the cursor left/right a column        |
| Left wheel (press)      | Start entering a digit in the current cell |
| Left wheel (long press) | Reveal the correct digit (counts a hint)   |
| STAT                    | Clear the current cell                     |
| DATA                    | Open the difficulty picker                 |
| ITEM                    | Exit the holotape                          |

While entering a digit:

| Input              | Action                              |
| ------------------ | ----------------------------------- |
| Either wheel, up   | Count the pending digit up          |
| Either wheel, down | Count the pending digit down        |
| Left wheel (press) | Confirm the digit                   |
| Left wheel (hold)  | Cancel and leave the cell as it was |
| STAT               | Cancel and leave the cell as it was |

In the difficulty picker:

| Input                | Action                           |
| -------------------- | -------------------------------- |
| Either wheel, rotate | Choose a level                   |
| Left wheel (press)   | Start a new game at that level   |
| Left wheel (hold)    | Cancel and keep the current game |
| STAT or DATA         | Cancel and keep the current game |

After the puzzle is solved, a left-wheel press or STAT deals a new one at the
same level, and DATA opens the picker.

### Rules

- Standard Sudoku: every row, column, and 3x3 box holds the digits 1 - 9 once.
- The puzzle's own clues are drawn brightest and cannot be edited or cleared.
- Digits you enter are drawn dimmer, and any digit that repeats in its row,
  column, or box is dimmed further and counted under `CLASH`.
- Fill all 81 squares with no clashes and the puzzle is solved. Because each
  puzzle has a single solution, a clash-free full grid is always the right one.

### Notes

Puzzles are not solved or searched for on the device. The holotape carries
thirty-six clue masks, twelve per level, that were graded off-device against a
fixed base grid: each leaves exactly one solution, is reachable with its own
level's techniques, and is not reachable with the level below's. On load the
base grid is relabelled, its bands, stacks, rows, and columns are shuffled, and
it is sometimes transposed. Those transformations preserve validity, uniqueness,
and difficulty alike, so the deal is instant and the same mask never looks the
same twice.

### License(s)

This game is licensed under the MIT License. See
[MIT](https://opensource.org/license/mit/) for more information.

`SPDX-License-Identifier: MIT`
