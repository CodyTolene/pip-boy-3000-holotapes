# Lockpick

The lockpicking minigame from Fallout 3 and New Vegas, on your Pip-Boy. Find the
sweet spot with the bobby pin, turn the lock with the screwdriver, and try not
to snap every pin you own.

### Info

**Author(s):**

- [@Radiomaru7](https://github.com/Radiomaru7)

### Controls

| Input                | Action                                          |
| -------------------- | ----------------------------------------------- |
| Left wheel (rotate)  | Choose a lock level / try the lock (either way) |
| Left wheel (press)   | Start a lock / back to the menu                 |
| Left wheel (hold)    | Force the lock                                  |
| Right wheel (rotate) | Move the bobby pin                              |
| STATS, ITEMS or DATA | Leave the holotape                              |

### How to Play

1. Pick a lock level from Very Easy to Very Hard and press the left wheel.
2. Turn the right wheel to slide the bobby pin around the top of the lock.
3. Turn the left wheel either way to apply the screwdriver. The closer the pin
   is to the hidden sweet spot, the further the lock turns.
4. If the lock stops and shudders, the pin is wrong and taking strain. The
   harder the outer ring shakes, the closer the pin is to snapping. Keep forcing
   it and the pin snaps. Back off, move the pin, and try again.
5. When the lock turns all the way, it opens.

Moving the pin releases the screwdriver, and the lock springs back on its own if
you stop turning, just like letting go of the trigger in the games.

After a pin breaks, the new pin starts back at the top of the lock, but the
sweet spot stays put, so a snapped pin still teaches you something. Higher lock
levels have a narrower sweet spot and weaker pins.

**Forcing** (hold the left wheel) opens the lock outright or jams it for good.
The odds drop sharply with the lock level, and a forced lock earns nothing.

### Runs and scoring

Each run starts with 8 bobby pins. Picking a lock cleanly finds you more pins
and adds to your score, and harder locks pay more. Very Easy locks are good
practice but never find you a pin:

| Lock      | Pins found | Score |
| --------- | ---------- | ----- |
| Very Easy | 0          | 1     |
| Easy      | 1          | 2     |
| Average   | 2          | 3     |
| Hard      | 2          | 5     |
| Very Hard | 3          | 8     |

When your last pin snaps the run is over, and you see how many locks you picked
and your score against your best. Press the left wheel to start a new run. You
can change the lock level from the menu at any point during a run.

Your current run and best score are saved in `HOLO/LOCKPICK/SAVE.JSON`, so you
can leave and come back to a run.

### License(s)

This game is licensed under the MIT License. See
[MIT](https://opensource.org/license/mit/) for more information.

`SPDX-License-Identifier: MIT`
