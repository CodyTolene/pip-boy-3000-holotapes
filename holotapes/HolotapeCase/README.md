# Holotape Case

With fifty holotapes installed, ITEMS > MISC gets long. Holotape Case lists
every holotape on the card in one place, alphabetical with favourites on top,
and plays any of them. It can also store holotapes in the case so they stop
crowding ITEMS > MISC, and put them back whenever you like.

### Info

**Author(s):**

- [@Radiomaru7](https://github.com/Radiomaru7)

### Controls

| Input                | Action                                              |
| -------------------- | --------------------------------------------------- |
| Left wheel (rotate)  | Scroll the list                                     |
| Right wheel (rotate) | Jump to the next or previous letter                 |
| Left wheel (press)   | Play the highlighted holotape                       |
| Left wheel (hold)    | Actions: favourite, store / show, store or show all |
| STATS, ITEMS or DATA | Leave the holotape                                  |

### Storing holotapes

ITEMS > MISC is built from the `.info` files in `APPINFO/` when the Pip-Boy
boots. Storing a holotape moves its `.info` file into
`HOLO/HOLOTAPE_CASE/STORED/`, so after a reboot it no longer appears in ITEMS >
MISC, but it is still listed and playable here. Showing it moves the file back.
Nothing else is touched: the holotape's own files stay where they are.

**Store all others** is the quick tidy-up: everything except the highlighted
holotape (and the case itself) goes into the case. **Show all in MISC** puts
everything back.

Reboot after storing or showing to see the change in ITEMS > MISC.

**Before installing, updating or removing holotapes on pip-boy.com, use Show all
in MISC first.** The website finds installed holotapes by their `.info` files in
`APPINFO/`, so a stored holotape looks uninstalled to it.

Favourites are saved in `HOLO/HOLOTAPE_CASE/FAVS.JSON`.

### Notes

Holotapes are launched with `Pip.loadHolotape` (firmware 1.1.5 and later). Icons
are shown when the `.info` file points at a converted `.IMG` icon; other
holotapes get a plain cassette.

### License(s)

This app is licensed under the MIT License. See
[MIT](https://opensource.org/license/mit/) for more information.

`SPDX-License-Identifier: MIT`
