# Atomic Slots

A three-reel slot machine for the Pip-Boy 3000, built for those nights when the
Strip's casinos are closed to you. Bet your caps, pull the lever, and watch the
reels.

### Info

**Author(s):**

- [@Radiomaru7](https://github.com/Radiomaru7)

### Controls

| Input                | Action                    |
| -------------------- | ------------------------- |
| Left wheel (rotate)  | Change your bet           |
| Left wheel (press)   | Spin / return from a menu |
| Left wheel (hold)    | Show the payout table     |
| STATS, ITEMS or DATA | Leave the holotape        |

### How to Play

You start with 200 caps. Pick a bet of 1, 2, 5, 10 or 25 caps and press the left
wheel to spin. Only the middle line pays, marked by the arrows either side of
the reels.

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

### License(s)

This game is licensed under the MIT License. See
[MIT](https://opensource.org/license/mit/) for more information.

`SPDX-License-Identifier: MIT`
