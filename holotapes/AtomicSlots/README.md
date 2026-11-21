# Atomic Slots

A three-reel slot machine for the Pip-Boy 3000, built for those nights when the
Strip's casinos are closed to you. Bet your caps, pull the lever, and watch the
reels.

### Info

**Author(s):**

- [@Radiomaru7](https://github.com/Radiomaru7)

### Controls

| Screen      | Control              | Action                          |
| ----------- | -------------------- | ------------------------------- |
| Menu        | Either wheel         | Move up and down the list       |
| Menu        | Press left wheel     | Open START, PAYOUTS or CONTROLS |
| Machine     | Left wheel (up/down) | Bigger / smaller bet            |
| Machine     | Press left wheel     | Spin                            |
| Machine     | Hold left wheel      | Back to the menu                |
| Payouts     | Press left wheel     | Back to the menu                |
| Controls    | Press left wheel     | Back to the menu                |
| Out of caps | Press left wheel     | 200 new caps                    |

The same table is on the CONTROLS page in the holotape's menu. STATS, ITEMS or
DATA leave the holotape. The right wheel only moves through the menu.

### How to Play

The holotape opens on its menu, with your bet and biggest win beside the
Pip-Boy's own Luck Vault Boy; choose START. You start with 200 caps. Pick a bet
of 1, 2, 5, 10 or 25 caps and press the left wheel to spin. Only the middle line
pays, marked by the arrows either side of the reels. PAYOUTS in the menu shows
the same table:

| Middle line         | Pays (times bet) |
| ------------------- | ---------------- |
| Seven, seven, seven | 300              |
| Three atoms         | 100              |
| Three bars          | 40               |
| Three bells         | 20               |
| Three caps          | 10               |
| Three cherries      | 15               |
| Any two cherries    | 3                |
| Any one cherry      | 1                |

Payouts include your stake, so a single cherry gives your bet back. The machine
returns about 96% of what goes in over the long run; the house always wins, but
slowly. If your bet is more than you can afford, it drops to the largest bet you
can cover.

Go broke and the cashier hands you another 200 caps. Your wallet, bet and best
win are saved in `HOLO/ATOMIC_SLOTS/SAVE.JSON`.

### STATS > GENERAL

Your record shows on the Pip-Boy's own STATS > GENERAL screen as Slots Biggest
Win, once there is one. The holotape ships a small hook,
`HOLO/ATOMIC_SLOTS/STATS_HOOK.JS`, that switches on the first time you open it
and registers itself in one shared startup slot (`.boot1`-`.boot3`, never
`.boot0`), so it keeps working after a full restart. No CFW file or boot loader
needed.

### License(s)

This game is licensed under the MIT License. See
[MIT](https://opensource.org/license/mit/) for more information.

`SPDX-License-Identifier: MIT`
