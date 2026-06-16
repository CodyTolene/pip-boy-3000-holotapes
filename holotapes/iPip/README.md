# iPip Media Player

### Info

**Author(s):**

- [@CodyTolene](https://github.com/CodyTolene)

### Description

A WAV media player.

Every folder in the `MUSIC/` folder is a "station" (playlist)

Browse and play songs one at a time, shuffle them, play the whole list in order,
or sort the list A-Z / Z-A.

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
- The `MUSIC/` folder is created automatically on launch if it does not exist.
  When no station playlists are found, the app shows a prompt to add one at
  [pip-boy.com](https://www.pip-boy.com/3000/ipip-media-player).

### Controls

- Left knob scroll: Move selection up / down in list
- Left knob press: Open station / play or stop song / navigate pages
- Right knob scroll: Adjust volume
- Left knob long press: Open settings menu (close with another long press)

### Instructions

1. Install and reboot the Pip-Boy.
2. Select **iPip** from Items → Misc.
3. The station list loads automatically from `MUSIC/`.
4. Scroll to a station and press the left knob to open it.
5. Scroll to a song and press to play. Press the same song again to stop.
6. Select **SHUFFLE PLAY ALL** to play all songs in the current station in
   random order. Select it again to stop playback.
7. Select **PLAY ALL (TOP-DOWN)** to play all songs in the current station in
   order, starting from the top. Select it again to stop playback.
8. Select **BACK TO PLAYLISTS** (top of the song list) to return to the station
   list.
9. Use **< PREV PAGE** and **NEXT PAGE >** at the bottom of a long song list to
   navigate between pages.

### Settings

1. To open the settings menu in-app, hold/long press the left wheel button.
2. Select a setting to adjust using the left knob.
3. Adjust sorting from A-Z or Z-A.
4. Adjust screen brightness with the right knob.
5. Adjust volume with the right knob.
6. Close settings menu with another long hold press of the left wheel button.

### License(s)

This app is licensed under the Creative Commons Attribution-NonCommercial 4.0
International License. See
[CC-BY-NC-4.0](https://creativecommons.org/licenses/by-nc/4.0/) for more
information.

`SPDX-License-Identifiers: CC-BY-NC-4.0, CC0-1.0`
