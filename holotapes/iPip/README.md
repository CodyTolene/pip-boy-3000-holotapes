# iPip Media Player

### Info

**Author(s):**

- [@CodyTolene](https://github.com/CodyTolene)

### Description

A WAV media player.

Every folder in the `MUSIC/` folder is a "station" (playlist)

Browse and play songs one at a time or in random order.

### SD Card Layout

```
MUSIC/
  My Station/
    song-01.wav
    song-02.wav
  Another Station/
    track-01.wav
```

- Only `.wav` files inside station folders are played.
- Files placed directly in `MUSIC/` are ignored.
- Sub-folders inside station folders are ignored (one level only).
- Full file paths must stay under 56 characters — oversized entries are shown
  dimmed and cannot be played.

### Controls

- Left knob scroll: Move selection up / down in list
- Left knob press: Open station / play or stop song / navigate pages
- Right knob scroll: Same as left knob (secondary scroll)

### Instructions

1. Install and reboot the Pip-Boy.
2. Select **iPip** from Items → Misc.
3. The station list loads automatically from `MUSIC/`.
4. Scroll to a station and press the left knob to open it.
5. Scroll to a song and press to play. Press the same song again to stop.
6. Select **RANDOM** to shuffle all songs in the current station. Select it
   again to stop random playback.
7. Select **BACK** (top of the song list) to return to the station list.
8. Use **< PREV PAGE** and **NEXT PAGE >** at the bottom of a long song list to
   navigate between pages.

### License(s)

This app is licensed under the Creative Commons Attribution-NonCommercial 4.0
International License. See
[CC-BY-NC-4.0](https://creativecommons.org/licenses/by-nc/4.0/) for more
information.

`SPDX-License-Identifiers: CC-BY-NC-4.0, CC0-1.0`
