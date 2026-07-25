# Piptris

### Info

**Author:** Cody Tolene

**Website(s):**

- [Personal Site](https://www.CodyTolene.com)
- [GitHub](https://github.com/CodyTolene)
- [Pip-Boy](https://www.Pip-Boy.com)

### Description

Stack, rotate, and clear falling blocks in this Tetris inspired mini-game for
the Pip-Boy 3000. Clear lines for points, level up every 10 lines, and watch for
the nukes.

### Controls

- Title screen: press the left knob to start.
- Menus: turn either knob to highlight an option, press the left knob to select.
  In settings, turn the right knob to change the highlighted value.
- In game:
  - Left knob: rotate the piece.
  - Right knob: move the piece left and right.
  - Hold the left knob pressed: soft drop (fast fall).
- Game over: press the left knob to return to the menu.

### Gameplay

- Clearing 1, 2, 3, or 4 lines at once scores 100, 300, 500, or 800 points.
- Every 10 cleared lines raises the level and the drop speed.
- Nukes appear randomly, about 1 in 17 pieces. When one lands it detonates,
  clearing a 5x5 area (10 points per block) and collapsing floating blocks. A
  random explosion sound plays while music is off.

### Settings

- **CRT:** Toggles the scanline effect.
- **Volume:** `0`-`27`, session only; the system volume is restored on exit.
- **Sound FX:** Toggles menu and gameplay sounds.
- **Music:** `PIPTRIS/`, a `MUSIC/` playlist folder, or `OFF`.

The CRT, sound, and music choices are saved for the next session.

### Music

The `PIPTRIS/` option shuffle-plays every WAV file placed directly in the
`PIPTRIS/` folder at the root of the SD card. The optional Piptris tracks
install there, and custom WAV files can be added alongside them. Each folder
directly under `MUSIC/` is also listed as a playlist. Nested folders are not
scanned.

### License(s)

This game is licensed under the Creative Commons Attribution-NonCommercial 4.0
International License. See
[CC-BY-NC-4.0](https://creativecommons.org/licenses/by-nc/4.0/) for more
information.

This game uses music, sounds, and images from pixabay.com, which allows free use
in personal and commercial projects. More information about this license can be
found here: https://pixabay.com/service/license-summary/

- [`piptris-symphony.wav`](https://pixabay.com/music/classical-string-quartet-tetris-theme-korobeiniki-rearranged-arr-for-strings-185592/)
- [`piptris-whimsical.wav`](https://pixabay.com/music/lullabies-tetris-theme-korobeiniki-rearranged-arr-for-music-box-184978/)
- [`piptris-electro-swing.wav`](https://pixabay.com/music/acid-jazz-swinging-electro-swing-funny-catchy-151280/)
- [`EXPL_01.WAV`](https://pixabay.com/sound-effects/film-special-effects-loud-explosion-425457/)
- [`EXPL_02.WAV`](https://pixabay.com/sound-effects/film-special-effects-explosion-sound-effect-425455/)
- [`EXPL_03.WAV`](https://pixabay.com/sound-effects/film-special-effects-boom-425459/)
- [`EXPL_04.WAV`](https://pixabay.com/sound-effects/film-special-effects-explosion-fx-425453/)

`SPDX-License-Identifiers: CC-BY-NC-4.0, CC0-1.0`
