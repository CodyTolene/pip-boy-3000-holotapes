# PipRoids

### Info

**Author(s):**

- [@reket](https://github.com/reket)

### Description

A vector-style asteroid shooter for the Pip-Boy 3000. You drift through a
wrapping field of tumbling rocks with nothing but a rotation thruster, a main
engine, and eight shots in the air at a time. Shoot a rock and it breaks into
two smaller ones, so clearing a wave gets busier before it gets quieter. Your
best score is kept on the SD card between sessions.

### Controls

The right wheel on this hardware only scrolls, so it is given over entirely to
steering and the left wheel carries the engine and the trigger. DATA is
swallowed while the holotape is open and reused as pause; STAT and ITEM both
still exit.

| Input                   | Action                                       |
| ----------------------- | -------------------------------------------- |
| Right wheel (rotate)    | Turn the ship, one step per click            |
| Left wheel (rotate)     | Fire the main engine, either direction       |
| Left wheel (press)      | Shoot                                        |
| Left wheel (long press) | Hyperspace: jump somewhere else on the field |
| DATA                    | Pause and resume                             |
| STATS or ITEMS          | Exit the holotape                            |

A turn step is 15 degrees, so a full rotation takes 24 clicks.

On the title and game over screens, a press of the left wheel starts the next
run.

### Scoring

| Rock   | Points | Breaks into |
| ------ | ------ | ----------- |
| Large  | 20     | Two medium  |
| Medium | 50     | Two small   |
| Small  | 100    | Nothing     |

Clearing every rock advances the wave and re-centres your ship. Waves start with
four large rocks and grow to five. You get three ships; the HUD shows the spares
you have left as outlines beside the score.

### Instructions

The ship keeps its momentum. The engine adds to your current velocity rather
than setting it, so stopping means turning around and burning the other way, and
a hard turn at speed still leaves you sliding sideways. Everything wraps at the
edges of the field, shots and rocks included.

Hyperspace moves you instantly to a random spot with your speed zeroed. It costs
nothing, but it can drop you next to a rock, so it is a last resort rather than
a free escape.

### Notes

Rocks are drawn as spinning six-point outlines. One shared unit shape is
pre-rotated into 32 orientations at startup, so a rock costs a table lookup and
a scale rather than any trigonometry, and a rock's heading is stored as a
position in that table instead of as an angle. Vertices are written into
preallocated typed arrays, so a frame never allocates. Moving the rocks and
testing them against the shots and the ship all happen in one pass. Only the
play field is cleared each frame - the HUD is repainted just when the score,
wave, or ship count changes, and the field is drawn under a clip rect so a rock
near the divider cannot leave pixels stranded in a band that is not being
redrawn. The frame loop and the rock renderer both carry Espruino's `"ram"`
directive.

Two simplifications are worth knowing: a sprite that straddles an edge is drawn
on one side only rather than in both places, and collisions are not wrap-aware.
Both are invisible in normal play because positions jump across the seam in a
single frame.

### License(s)

This game is licensed under the MIT License. See
[MIT](https://opensource.org/license/mit/) for more information.

`SPDX-License-Identifier: MIT`
