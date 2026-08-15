# RobCo Entmt. Terminal (previously iPip Media Player)

### Info

**Author:**

- [@CodyTolene](https://github.com/CodyTolene)

**Contributors:**

- [@joemto20-tech](https://github.com/joemto20-tech)

### Description

RobCo Entertainment Terminal is a full media player for the Pip-Boy 3000. It
opens with a RobCo terminal sequence and provides three media players:

- **MUSIC** - Play WAV songs and playlists from the `MUSIC/` folder.
- **VIDEOS** - Watch AVI clips from the `VIDEOS/` folder full screen.
- **IMAGES** - View images from the `IMAGES/` folder on a black background.

### Music Player

Folders inside `MUSIC/` are shown as stations, or playlists.

- Open a station to see its songs.
- Select a song to play it. Select the playing song again to stop it.
- Use **SHUFFLE PLAY ALL** or **PLAY ALL** to play the entire station.
- When a song finishes, the next song starts automatically. Shuffle order is
  kept while Shuffle is active.
- Turn the right knob to adjust playback volume.

### Persistent Audio

Persistent Audio allows music to continue after leaving the holotape, much like
the Pip-Boy's built-in radio. It is **off by default** and is currently
available only on Pip-Boy firmware **v1.1.5**. Other firmware versions show an
informational message instead of the ON/OFF setting.

To turn it on:

1. Open **MUSIC** from the RobCo Entertainment Terminal media menu.
2. While viewing either the station list or a station's song list, press and
   hold the left knob until the Music settings menu opens.
3. Highlight **PERSISTENT AUDIO** and press the left knob to change it to
   **ON**.
4. Return to the Music player and start a station or song.

The music can now continue playing across Pip-Boy screens.

Persistent playback can be stopped in any of these ways:

- Open RobCo Entertainment Terminal and select the currently playing song.
- Open the Music settings menu and turn **PERSISTENT AUDIO** off.
- Visit the main firmware's **DATA > Radio** tab. Playback stops automatically
  so the built-in radio can use the audio system normally.
- Put the Pip-Boy to sleep.
- Restart, reboot, or power off the Pip-Boy.

Persistent playback is held in RAM only. It is never restored after a restart or
power loss. You have to boot the Holotape again to restore it.

### SD Card Layout

```text
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
  picture-03.img
  fullscreen-01.bin
```

The `MUSIC/`, `VIDEOS/`, and `IMAGES/` folders are created automatically when
the terminal launches if they don't exist. Full file paths must stay under 56
characters. Entries with paths that are too long are shown dimmed and cannot be
opened.

**Music (`MUSIC/`)**

- `.wav` files inside station folders are supported.
- Stations support one folder level. Subfolders inside a station are ignored.
- Convert audio files here: https://www.pip-boy.com/tools/audio-converter

**Video (`VIDEOS/`)**

- `.avi` files are supported.
- Clips must use the MS RLE codec with 8-bit paletted grayscale video to decode
  on the device.
- Convert video files here: https://www.pip-boy.com/tools/video-converter

**Images (`IMAGES/`)**

- Only the supported files `.json`, `.js`, `.img`, and `.bin` files are listed.
- Keep converted image files roughly under 30 KB when possible. Very large
  images can cause out of memory (OOM) errors.
- Convert image files here: https://www.pip-boy.com/tools/image-converter

### Controls

**Media menu**

- Left knob scroll: Move the selection up or down.
- Left knob press: Open the selected player.

**Music player**

- Left knob scroll: Move through the station or song list.
- Left knob press: Open a station, play or stop a song, or select a list action.
- Left knob long press: Open the Music settings menu while viewing a list.
- Right knob scroll: Adjust playback volume.
- Select **BACK TO PLAYLISTS** to leave a song list.
- Select **BACK TO MENU** from the station list to return to the media menu.

**Video player**

- Left knob scroll: Move through the video list.
- Left knob press: Play the selected clip. Press again during playback to stop
  and return to the list.
- Finished clips return to the list automatically.
- Select **BACK TO MENU** to return to the media menu.

**Image viewer**

- Left knob scroll: Move through the image list.
- Left knob press: Open the selected image. Press again to close it and return
  to the list.
- Select **BACK TO MENU** to return to the media menu.

### Instructions

1. Install the holotape and restart the Pip-Boy.
2. Open **Items > Misc** and select **RobCo Entmt. Terminal**.
3. After the intro, use the left knob to choose **MUSIC**, **VIDEOS**, or
   **IMAGES**.

**Music**

1. Select a station from the station list.
2. Select a song to play it, or choose **SHUFFLE PLAY ALL** or **PLAY ALL**.
3. Scroll up and down with the left knob to move through long song lists.
4. Select **BACK TO PLAYLISTS**, then **BACK TO MENU**, to return to the main
   media menu.

**Videos**

1. Select a clip to play it full screen.
2. Press the left knob to stop early, or let the clip finish.
3. Select **BACK TO MENU** to leave the video player.

**Images**

1. Select an image to view it.
2. Press the left knob to close it and return to the list.
3. Select **BACK TO MENU** to leave the image viewer.

Convert audio, video, and images into supported formats at
[pip-boy.com/tools](https://pip-boy.com/tools).

### Music Settings

The Music settings menu is available from either Music list. Press and hold the
left knob while viewing the station list or a station's song list.

- Left knob scroll: Highlight a setting.
- Left knob press: Toggle or advance the highlighted setting.
- Right knob scroll: Adjust the highlighted setting in either direction.

Available settings include Persistent Audio, song sorting, screen brightness,
audio volume, and screen timeout. Select **BACK TO MUSIC** to return to the
player.

### License(s)

This app is licensed under the Creative Commons Attribution-NonCommercial 4.0
International License. See
[CC-BY-NC-4.0](https://creativecommons.org/licenses/by-nc/4.0/) for more
information.

`SPDX-License-Identifiers: CC-BY-NC-4.0`
