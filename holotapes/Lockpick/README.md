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

### Secret

<details>
<summary>Spoiler: how to unlock it</summary>

Pick a **Very Hard** lock cleanly (forcing does not count) and **Tumbler mode**
unlocks for good. A **MODE** switch appears at the bottom of the menu.

Tumbler is a side view of a real pin-tumbler lock. Keep tension on the plug and
lift the pins one at a time to the shear line. Only one pin binds at a time, in
a random order, and you have to find it by feel:

| Input                | Action                                     |
| -------------------- | ------------------------------------------ |
| Right wheel (rotate) | Slide the pick between pins (and to EXIT)  |
| Left wheel (rotate)  | Up raises the pick and pin, down lowers it |
| Left wheel (press)   | Change tension: light, medium, heavy       |
| Left wheel (hold)    | Release tension, dropping every pin        |

- **Loose pins** spring back down on their own. **The binding pin** stays where
  you leave it. Lift it to the shear line on medium tension and it clicks and
  sets, and the plug turns a little.
- **Heavy tension** jams the binding pin solid and strains the pick until it
  snaps, costing a bobby pin. **Light tension** cannot hold a normal pin, so it
  slides back down.
- **Overset** a pin past the shear line and it jams; release and start over.
- **Spool pins** (Hard and Very Hard) give a false set: the plug lurches round
  further and nothing clicks. Switch to light tension and pause and the spool
  slips into place.

On Very Easy and Easy the binding pin is marked. From Average up you only have
the sound, the pins and the plug to go on. Tumbler locks pay double score and
share your run's bobby pins.

</details>

### STATS > GENERAL

Your record shows on the Pip-Boy's own STATS > GENERAL screen as Lockpick Best
Run, once there is one. The holotape ships a small hook,
`HOLO/LOCKPICK/STATS_HOOK.JS`, that switches on the first time you open it and
registers itself in one shared startup slot (`.boot1`-`.boot3`, never `.boot0`),
so it keeps working after a full restart. No CFW file or boot loader needed.

### License(s)

This game is licensed under the MIT License. See
[MIT](https://opensource.org/license/mit/) for more information.

`SPDX-License-Identifier: MIT`
