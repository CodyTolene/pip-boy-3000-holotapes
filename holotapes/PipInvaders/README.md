# Pip Invaders

Space Invaders, moved to the wasteland. Thirty-two creatures advance on the
vault in four ranks, stepping sideways and dropping a row every time they reach
the edge. You have a turret, four bunkers that crumble as they take fire, and
three lives. Thin the ranks and they come faster. Let them reach the bunker line
and the vault is breached.

### Info

**Author(s):**

- [@reket](https://github.com/reket)

### Controls

| Input            | Action                          |
| ---------------- | ------------------------------- |
| Left wheel       | Track the turret left and right |
| Right wheel      | Track the turret left and right |
| Left wheel press | Fire                            |
| DATA             | Pause and resume                |
| STATS or ITEMS   | Leave the holotape              |

Either wheel steers, so it plays with either hand. The right wheel does not
press on this hardware, so the left wheel's press carries the trigger. Each
click of a wheel buys a short glide, and keeping the wheel rolling keeps the
turret moving.

Two shots may be in the air at once. Fire into a bunker and you will punch a
hole through your own cover, exactly as in the original: four hits to the same
spot wear a channel clean through it.

### Scoring

| Target      | Points |
| ----------- | ------ |
| Deathclaw   | 40     |
| Radscorpion | 30     |
| Bloatfly    | 20     |
| Radroach    | 10     |
| Vertibird   | 150    |

Deathclaws hold the back rank, so the points you most want are the ones you
reach last. A vertibird crosses the top of the field now and then; it is worth
more than any rank and it does not wait.

Clearing all thirty-two starts the next wave with fresh bunkers, a faster march,
and heavier fire. The best score is kept on the card between sessions.

### Notes

The creatures are drawn in the idiom of the arcade original: bilaterally
symmetric silhouettes whose two march frames move only the antennae, arms and
legs, built out of 2x2 blocks. Each is authored as a 12x8 design and expanded at
startup into a 24x16 one-bit sprite, with all ten packed into a single 480-byte
array. One image object is reused for every draw with its buffer pointed at the
right window, so a frame of thirty-three sprites allocates nothing and each one
is a native blit rather than a pile of primitives.

Every image is a multiple of eight pixels wide, and not by accident. Espruino
blits an image as one continuous bit stream, stepping over a row by
`bpp * width` bits with no padding out to a byte boundary, so any other width
draws progressively sheared. A bunker that renders sheared no longer matches the
bitmap its hit tests read, which is a bug that looks like bad luck rather than
bad arithmetic.

The bunkers are the sprite idea turned to a different purpose: each is a 48x16
one-bit bitmap, so a hit simply clears a blob of bits out of it. Erosion is
therefore pixel accurate and a whole bunker still costs one blit.

Projectiles are tested against cover along the whole span they travelled in a
frame, not at the point they ended up. A shot covers twelve pixels a frame and a
bunker is only sixteen tall, so from a fixed firing height a point test only
ever samples two of its rows; two hits clear both and every later shot down that
column sails through cover still plainly drawn on the screen.

Shots find which invader they hit by arithmetic rather than by search. The
formation is a fixed grid, so a shot's column and row fall out of its offset
from the formation origin, and the check is a constant handful of operations
instead of a walk over all thirty-two slots.

The play field is drawn under a clip rect so a sprite near the divider cannot
leave pixels stranded in the HUD band, which is only repainted when the score,
wave, or turret count changes. The invader renderer and the physics step carry
Espruino's `"ram"` directive.

### License(s)

This game is licensed under the MIT License. See
[MIT](https://opensource.org/license/mit/) for more information.

`SPDX-License-Identifier: MIT`
