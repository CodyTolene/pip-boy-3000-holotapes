# Gyro Maze

Tilt the Pip-Boy to roll a ball through a randomly generated maze. Find the exit
to win.

### Info

**Author(s):**

- [@reket](https://github.com/reket)

### Controls

| Input                | Action                  |
| -------------------- | ----------------------- |
| Tilt Pip-Boy         | Roll the ball           |
| Left wheel press     | Start game / Play again |
| STATS, ITEMS or DATA | Leave the holotape      |

### How to Play

Each game generates a fresh maze using the recursive backtracker algorithm,
which guarantees the maze is solvable. The ball starts at the center of the
maze, and a dim marker shows where the exit is on one of the edges.

Tilt the Pip-Boy to roll the ball. The accelerometer reads the device's
orientation and applies it as force to the ball. Walls stop the ball dead rather
than bouncing it, so you can use them to control your momentum.

When the ball reaches the exit, a "You win!" popup appears. Press either wheel
to play again with a new maze.

### Notes

The maze is a 28x18 grid of 16-pixel cells, filling the 480x272 play area below
the header. Walls are drawn as 2-pixel thick lines so passages are 12 pixels
wide, giving the 8-pixel-diameter ball room to roll without catching on corners.

The physics run at 20 fps with simple drag and a speed cap. Collision detection
checks the ball's current cell and the four neighbors it might be overlapping,
stopping the ball at any wall it penetrates rather than bouncing.

If the device has no accelerometer (`Pip.accel` is undefined), the ball will not
move. The game still runs, but there is no way to control it.

### License(s)

This game is licensed under the MIT License. See
[MIT](https://opensource.org/license/mit/) for more information.

`SPDX-License-Identifier: MIT`
