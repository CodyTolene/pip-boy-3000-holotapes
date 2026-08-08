# Pip-Boy Custom Radio CFW — V10

Custom RADIO replacement for the Wand Company Pip-Boy. It keeps the stock firmware intact and substitutes the RADIO page through the `.boot0` custom-firmware loader.

## Repository layout

Keep these files at these exact paths:

└── CFW/
    ├── 20_R.JS
    └── R.DAT
```

Both files must be placed **directly inside `CFW/`**. Do not put them inside another folder such as `CFW/RADIO/`.

## Requirements

- Wand Company Pip-Boy
- SD card installed in the Pip-Boy
- The compatible bootloader tool that installs `.boot0`
- Custom music stored as WAV files under `MUSIC/`

## Bootloader installation

1. Open the bootloader/CFW tool.
2. Install the loader. The tool places `.boot0` in the Pip-Boy's internal storage.
3. Put these two files directly in the SD card's `CFW/` folder:
   - `20_R.JS`
   - `R.DAT`
4. Save or upload both files to the device.
5. Fully reboot the Pip-Boy.
6. Open **DATA > RADIO**.

`20_R.JS` runs at startup and installs the RADIO override. `R.DAT` contains the low-memory custom RADIO menu and is loaded only when RADIO is opened.

> Do not rename `R.DAT` to `.JS`. Every JavaScript file directly inside `CFW/` is executed during startup. Keeping the radio payload as `R.DAT` prevents the full RADIO menu from being loaded at boot.

## Adding custom stations

Create one folder per station directly under MUSIC/:


MUSIC/
├── Galaxy News Radio/
│   ├── TRACK01.WAV
│   └── TRACK02.WAV
└── Mojave Music Radio/
    ├── SONG01.WAV
    └── SONG02.WAV


Only folders containing .WAV files appear in the RADIO list. Empty folders, unrelated folders, "." and ".." are ignored.

Do not place songs another folder deeper. Use:


-MUSIC/STATION/SONG.WAV


not:


MUSIC/STATION/ALBUM/SONG.WAV


## Controls

### Main RADIO list

- Left wheel turn:** move through OFF, FM RADIO, and custom stations
- Left-wheel click:** select the highlighted entry
- Right wheel turn:** master volume for FM and custom music

### FM RADIO

- Select *FM RADIO* to enter tuning mode.
- Turn the *left wheel* to change frequency.
- The tuner box moves vertically with the frequency.
- Click the *left wheel* to return to the station list.

### Custom stations

- Select a custom station to begin playback and enter track mode.
- Turn the *left wheel* to move through its tracks.
- The track box moves in the same direction and shows the current track position.
- Click the *left wheel* to return to the station list without stopping playback.
- Select the active station again to re-enter track mode.

### OFF

Selecting **OFF** stops FM and custom music, removes playback timers and hooks, and leaves the RADIO menu available so another station can be selected immediately.

## Sleep behavior

Putting the Pip-Boy into sleep mode shuts down FM and custom music, removes auto-next timers and audio hooks, and leaves nothing running after sleep. Music does not automatically resume after waking.

## Updating

1. Replace both `CFW/20_R.JS` and `CFW/R.DAT` with the new versions.
2. Make sure no older duplicate radio patches remain in `CFW/`.
3. Fully reboot the Pip-Boy.

## Uninstalling

Delete these two files and reboot:

```text
CFW/20_R.JS
CFW/R.DAT
```

The stock internal `JS/RADIO.JS` was never modified, so the original RADIO page will load again.

## Troubleshooting

### Stock RADIO still appears

- Confirm both files are directly inside `CFW/`.
- Confirm the names are exactly `20_R.JS` and `R.DAT`.
- Confirm `.boot0` is installed.
- Fully reboot after changing files.

### Custom station does not appear

- Confirm it is a folder directly under `MUSIC/`.
- Confirm the folder contains at least one `.WAV` or `.WAVE` file.
- Remove extra nested album folders.

### LOW MEMORY while opening RADIO

- Remove older or duplicate RADIO patches from `CFW/`.
- Keep only one `20_R.JS` and one `R.DAT`.
- Do not install the large readable development source on the Pip-Boy.
- Reboot after cleaning the folder.

### Radio or music continues during sleep

- Confirm both files came from the same V10 package.
- Remove older versions of the radio hook and payload.
- Reinstall both files, then reboot.
