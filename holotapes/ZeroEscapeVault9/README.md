# Zero Escape Vault 9

A Nonary-style "AB Game" for the Pip-Boy 3000. You are SIGMA, locked in Vault 9
with seven CPU rivals. Everyone starts on 3 points; reach 9 and the Number 9
Door opens. Each round you are paired at random and both players secretly choose
**ALLY** or **BETRAY**.

|                 | outcome     |
| --------------- | ----------- |
| ally + ally     | **+2 / +2** |
| betray + ally   | **+3 / -2** |
| betray + betray | **0 / 0**   |

Fall to 0 points and you die. When anyone reaches 9 the game ends: everyone on 9
or more escapes, the rest are left behind.

## The rivals

Seven of these eight are drawn each game, based on the original game characters:

| character | behaviour                                                       |
| --------- | --------------------------------------------------------------- |
| PHI       | strategic; mild early, ruthless once someone nears the exit     |
| DIO       | predatory; betrays on instinct and barely reads your record     |
| TENMYOUJI | reads evidence harder than anyone; swings on what you show them |
| QUARK     | cautious but erratic                                            |
| LUNA      | pacifist; allies almost unconditionally                         |
| CLOVER    | volatile; the least predictable of the eight                    |
| ALICE     | reciprocator; repays trust and betrayal in kind                 |
| K         | principled; never betrays first, but answers in kind            |

Each weighs four pressures: **blocking** a rival about to escape, **seizing**
its own win, **trust** learned from revealed votes, and **survival** when its
points are dangerously low - all shaded by personality and a little noise.

## Controls

| screen              | input                                           |
| ------------------- | ----------------------------------------------- |
| menu / rules / info | either wheel turn = move, left press = select   |
| voting              | either wheel turn = toggle ALLY/BETRAY          |
| voting              | left press = lock in your vote                  |
| results             | left press = reveal all, press again = continue |
| anywhere            | left press and hold = exit to the menu          |

## Strategy

Everyone blocks a player close to 9, so you cannot simply climb. Earn trust with
the reciprocal characters (K, ALICE, TENMYOUJI...) so they still ally when you
are high, then pick your moment. Watch for rivals sitting on exactly 6 points -
betraying an ally from there scores +3 and wins outright, and almost every
character takes that shot. Be luck be on your side

## Installation

Install from Pip-Boy.com, or copy to the SD card manually:

```
HOLO/ZERO_ESCAPE_VAULT_9/APP.JS        (assets/APP.MIN.JS)
HOLO/ZERO_ESCAPE_VAULT_9/DATA.JSON     (assets/DATA.JSON)
```

Optional assets - the game runs without them and falls back to text screens:

```
HOLO/ZERO_ESCAPE_VAULT_9/MAINSCREEN.BIN
HOLO/ZERO_ESCAPE_VAULT_9/DOOROPENS.BIN
HOLO/ZERO_ESCAPE_VAULT_9/MAINTHEME.WAV
HOLO/ZERO_ESCAPE_VAULT_9/BACKGROUND.WAV
HOLO/ZERO_ESCAPE_VAULT_9/CRT_ON.WAV
```

Images are 480x320 2bpp raw framebuffer exports from the Pip-Boy.com image
converter (38,400 bytes each). The two music tracks are IMA ADPCM 4-bit mono 16
kHz; the reveal sting is 16-bit PCM mono 16 kHz. Everything is streamed from the
card, so no asset is ever resident in RAM.

## Notes

The app streams both the images and the audio straight from the SD card, so
neither is ever resident in RAM. Display text (lore, rules, character bios)
lives in `DATA.JSON` and is loaded on demand, then released. Every listener,
timer and interval is cleared and audio is stopped in `remove()`.

## Tested firmware

Pip-Boy 3000 Mk V, software version **2v29.350**.

## Credits & License

A fan tribute; character names belong to their creators. All AI behaviour and
text here are original.

MIT - `SPDX-License-Identifier: MIT`
