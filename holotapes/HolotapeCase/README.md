# Holotape Case

With fifty holotapes installed, ITEMS > MISC gets long. Holotape Case is a
submenu of ITEMS > MISC that lists every holotape on the card in the Pip-Boy's
own list style, favourites on top (marked like equipped items), and plays any of
them. It can also hide holotapes so they stop crowding ITEMS > MISC, and show
them again whenever you like.

### Info

**Author(s):**

- [@Radiomaru7](https://github.com/Radiomaru7)

### Controls

| Input                | Action                                            |
| -------------------- | ------------------------------------------------- |
| Left wheel (rotate)  | Scroll the list                                   |
| Right wheel (rotate) | Switch ITEMS tabs, as on any ITEMS screen         |
| Left wheel (press)   | Options: favourite, hide / show, hide or show all |
| Left wheel (hold)    | Play the highlighted holotape                     |
| STATS, ITEMS or DATA | Leave the case                                    |

### Hiding holotapes from ITEMS > MISC

ITEMS > MISC lists every `.info` file in `APPINFO/` each time you open it.
Holotape Case comes with a small patch, `CFW/52_RADIOMARU_MISC.JS`, that the
pip-boy.com bootloader runs at every boot. While the MISC screen builds its
list, the patch leaves out the holotapes you have hidden. Nothing is moved or
deleted, so pip-boy.com and other apps still see every holotape as installed.

- **Hide from MISC** / **Show in ITEMS > MISC** toggles the highlighted tape.
- **Hide all but favourites** is the quick tidy-up: only your favourites (and
  the case itself) stay in ITEMS > MISC.
- **Hide all custom holotapes** hides every holotape installed from pip-boy.com.
  The Pip-Boy's own MISC items come from its data files, so they stay, and so
  does the case.
- **Show all in MISC** puts everything back.

Changes show up the next time you open ITEMS > MISC; no reboot needed. The patch
itself takes effect after a reboot, and without it nothing is hidden. The hidden
list is saved in `HOLO/HOLOTAPE_CASE/HIDDEN.JSON`.

Version 1.0 hid tapes by moving their `.info` files into
`HOLO/HOLOTAPE_CASE/STORED/`. Version 1.1 moves any it finds there back into
`APPINFO/` and keeps them hidden.

Favourites are saved in `HOLO/HOLOTAPE_CASE/FAVS.JSON`.

### Notes

Holotapes are launched with `Pip.loadHolotape` (firmware 1.1.5 and later). Icons
are shown when the `.info` file points at a converted `.IMG` icon; other
holotapes get a plain cassette.

### License(s)

This app is licensed under the MIT License. See
[MIT](https://opensource.org/license/mit/) for more information.

`SPDX-License-Identifier: MIT`
