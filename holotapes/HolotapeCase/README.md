# Holotape Case

With fifty holotapes installed, ITEMS > MISC gets long. Holotape Case is a
submenu of ITEMS > MISC that lists every holotape on the card in the Pip-Boy's
own list style, favourites on top (marked like equipped items), and plays any of
them from its options, so a stray press never starts a game. It can also hide
holotapes so they stop crowding ITEMS > MISC, and show them again whenever you
like.

### Info

**Author(s):**

- [@Radiomaru7](https://github.com/Radiomaru7)

### Controls

| Input                | Action                                     |
| -------------------- | ------------------------------------------ |
| Left wheel (rotate)  | Scroll the list                            |
| Right wheel (rotate) | Switch ITEMS tabs, as on any ITEMS screen  |
| Left wheel (press)   | Options: play, move, favourite, hide, sort |
| Left wheel (hold)    | Options, same as a press                   |
| STATS, ITEMS or DATA | Leave the case                             |

### Organising your case

- **Move in list** picks the tape up: turn the left wheel to carry it up or
  down, and press to put it down.
- **Sort the case** sorts everything A to Z, puts favourites at the top, or puts
  hidden tapes at the bottom.

The order is saved in `HOLO/HOLOTAPE_CASE/ORDER.JSON`, and ITEMS > MISC lists
your holotapes in the same order, with Holotape Case first. Holotapes installed
later go at the end. Until you first move or sort something, the case lists
favourites first and then by file name, and ITEMS > MISC keeps its usual order.

Atomic Command and Grelok count as the Pip-Boy's own holotapes. The case leaves
them out, Hide all never hides them, and ITEMS > MISC lists them right after the
case.

### Hiding holotapes from ITEMS > MISC

ITEMS > MISC lists every `.info` file in `APPINFO/` each time you open it.
Holotape Case comes with a small hook, `HOLO/HOLOTAPE_CASE/MISC_HOOK.JS`, that
switches on the first time you open the case. While the MISC screen builds its
list, the hook leaves out the holotapes you have hidden and puts the rest in the
case's order. Nothing is moved or deleted, so pip-boy.com and other apps still
see every holotape as installed.

It keeps working after a full restart: the hook adds itself to
`USER/RADIOMARU_BOOT.JSON`, and one small boot script shared by Radiomaru7's
holotapes runs the files listed there at startup. Like the Character Switcher,
it only uses a free slot among `.boot1`-`.boot3` (never `.boot0`, which belongs
to the Fallout companion app) and only writes when something is missing. If all
three slots are already taken, it still works until the next full restart, and
opening the holotape again switches it back on.

- **Hide from MISC** / **Show in ITEMS > MISC** toggles the highlighted tape.
- **Hide all but favourites** is the quick tidy-up: only your favourites (and
  the case itself) stay in ITEMS > MISC.
- **Hide all custom holotapes** hides every holotape installed from pip-boy.com.
  The Pip-Boy's own MISC items come from its data files, so they stay, and so
  does the case.
- **Show all in MISC** puts everything back.

Changes show up the next time you open ITEMS > MISC; no reboot needed. The
hidden list is saved in `HOLO/HOLOTAPE_CASE/HIDDEN.JSON`. **Show all in MISC**
turns hiding off.

Favourites are saved in `HOLO/HOLOTAPE_CASE/FAVS.JSON`.

### Notes

The options menus are a second file, `OPTIONS.JS`, that the case loads only
while they are open, so the list uses less memory the rest of the time.

Holotapes are launched with `Pip.loadHolotape` (firmware 1.1.5 and later). Icons
are shown when the `.info` file points at a converted `.IMG` icon; other
holotapes get a plain cassette.

### License(s)

This app is licensed under the MIT License. See
[MIT](https://opensource.org/license/mit/) for more information.

`SPDX-License-Identifier: MIT`
