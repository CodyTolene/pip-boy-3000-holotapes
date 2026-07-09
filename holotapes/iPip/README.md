# iPip Media Player

### Info

**Author(s):**

- [@CodyTolene](https://github.com/CodyTolene)

### Description

A full media player for the Pip-Boy 3000.

After the intro, iPip opens a media menu with three players:

- **MUSIC** - Play WAV playlists. Every folder in the `MUSIC/` folder is a
  "station" (playlist).
- **VIDEOS** - Watch AVI clips from the `VIDEOS/` folder full screen.
- **IMAGES** - View images from the `IMAGES/` folder centered on a black
  background.

### SD Card Layout

```
MUSIC/
  My Station/
    song-01.wav
    song-02.wav
  Another Station/
    track-01.wav
VIDEOS/
  clip-01.avi
  clip-02.avi
IMAGES/
  picture-01.json
  picture-02.js
  fullscreen-01.bin
```

- The `MUSIC/`, `VIDEOS/`, and `IMAGES/` folders are created automatically on
  launch if they do not exist.
- Full file paths must stay under 56 characters. Oversized entries are shown
  dimmed and cannot be opened.

**Music (`MUSIC/`)**

- Only `.wav` files inside station folders are played.
- Files placed directly in `MUSIC/` are ignored.
- Sub-folders inside station folders are ignored (one level only).

**Video (`VIDEOS/`)**

- Only `.avi` files are listed.
- Clips must use the MS RLE codec (8-bit paletted, grayscale) to decode on the
  device. See the holotape development guide for the recommended ffmpeg command.

**Images (`IMAGES/`)**

- `.json` files (1, 2, or 4 bpp) from the Espruino / pip-boy.com image converter
  are parsed and drawn centered on a black background.
- `.js` files are Espruino image strings at **1 or 2 bpp** (the JS string format
  from the converter). They are drawn centered on a black background.
- `.bin` files are treated as full-screen (480x320) raw framebuffers and are
  streamed straight to the display.
- Only `.json`, `.js`, and `.bin` files are listed; other files are ignored.
- Keep image files small (roughly under 30 KB). Very large images can exhaust
  device memory and fail to load.

### Controls

**Media menu**

- Left knob scroll: Move selection up / down
- Left knob press: Open the selected player

**Music player**

- Left knob scroll: Move selection up / down in list
- Left knob press: Open station / play or stop song / navigate pages
- Right knob scroll: Adjust volume
- Left knob long press: Open settings menu (close with another long press)
- Select **BACK TO MENU** (top of the station list) to return to the media menu.

**Video player**

- Left knob scroll: Move selection up / down in list
- Left knob press: Play the selected clip / while playing, stop and return to
  the list. Playback also returns to the list automatically when the clip ends.
- Select **BACK TO MENU** (top of the list) to return to the media menu.

**Image viewer**

- Left knob scroll: Move selection up / down in list
- Left knob press: Show the selected image / while viewing, close it and return
  to the list.
- Select **BACK TO MENU** (top of the list) to return to the media menu.

### Instructions

1. Install and reboot the Pip-Boy.
2. Select **iPip** from Items -> Misc.
3. After the intro, the media menu opens. Scroll with the left knob and press to
   open **MUSIC**, **VIDEOS**, or **IMAGES**.

**Music**

1. Scroll to a station and press the left knob to open it.
2. Scroll to a song and press to play. Press the same song again to stop.
3. Use **SHUFFLE PLAY ALL** or **PLAY ALL (TOP-DOWN)** to play the whole
   station.
4. Use **< PREV PAGE** / **NEXT PAGE >** to page through a long song list.
5. Select **BACK TO PLAYLISTS** to return to the station list, then **BACK TO
   MENU** to return to the media menu.

**Videos**

1. Scroll to a clip and press to play it full screen.
2. Press again to stop early, or let it finish, to return to the list.
3. Select **BACK TO MENU** to return to the media menu.

**Images**

1. Scroll to an image and press to view it centered on a black background.
2. Press again to close it and return to the list.
3. Select **BACK TO MENU** to return to the media menu.

Convert audio, video, and images into the supported formats at
[pip-boy.com/tools](https://pip-boy.com/tools).

### Settings

1. Open the music player, then hold / long press the left wheel button.
2. Select a setting to adjust using the left knob.
3. Adjust sorting from A-Z or Z-A.
4. Adjust screen brightness with the right knob.
5. Adjust volume with the right knob.

### License(s)

This app is licensed under the Creative Commons Attribution-NonCommercial 4.0
International License. See
[CC-BY-NC-4.0](https://creativecommons.org/licenses/by-nc/4.0/) for more
information.

This app uses a sound effect from pixabay.com. This sound effect uses a special
license that allows for free use in personal and commercial projects. More
information about this license can be found here:
https://pixabay.com/service/license-summary/

- [`SND_INTRO.WAV`](https://pixabay.com/sound-effects/film-special-effects-power-up-game-sound-effect-359227/)

`SPDX-License-Identifiers: CC-BY-NC-4.0, CC0-1.0`
