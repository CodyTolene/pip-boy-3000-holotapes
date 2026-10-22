# Bubble Level

A spirit level for the Pip-Boy 3000. Lay it flat for a two-axis bullseye, or
stand it on its edge for a classic single vial.

### Info

**Author(s):**

- [@Radiomaru7](https://github.com/Radiomaru7)

### Controls

| Input                | Action                                      |
| -------------------- | ------------------------------------------- |
| Left wheel (rotate)  | Change the full-scale range (1 to 45 deg)   |
| Left wheel (press)   | Freeze the reading (press again to release) |
| Left wheel (hold)    | Zero the level at the current angle         |
| Right wheel (rotate) | Switch between Surface and Edge mode        |
| STATS, ITEMS or DATA | Leave the holotape                          |

### How to Use

**Surface mode** shows a bullseye. Set the Pip-Boy on the surface you want to
check; the bubble floats toward the high side, and the X and Y tilt readouts
show the angle in degrees on each axis.

**Edge mode** shows a single vial. Stand the Pip-Boy on its long edge against
the thing you are checking (a shelf, a picture frame) and read the angle.

When the surface is within 0.3 degrees of level the status box lights up and the
Pip-Boy beeps once.

Every Pip-Boy's accelerometer sits a little differently in its case. If the
bubble is not centered on a surface you know is level, hold the left wheel to
zero it there. To undo a bad zero, just zero again on a level surface. The zero
is saved per mode, along with your range setting, in
`HOLO/BUBBLE_LEVEL/CAL.JSON`, so it survives restarts.

Freeze is handy when you cannot see the screen while measuring: press the left
wheel, pick the Pip-Boy up, and read the held angle.

### Notes

Only the left wheel's press is used, because the Fallout 3 / New Vegas Pip-Boy
3000's right wheel does not press.

Angles come from the gravity vector with a light low-pass filter, polled every
40ms. Surface X and Y are each measured against the other two axes, so the
reading stays correct at steep angles rather than drifting like a raw `x * 90`
mapping would.

If the device has no accelerometer (`Pip.accel` is undefined), the app says so
and stays idle.

### License(s)

This app is licensed under the MIT License. See
[MIT](https://opensource.org/license/mit/) for more information.

`SPDX-License-Identifier: MIT`
