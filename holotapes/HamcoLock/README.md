# HAMCo Lock

A PIN lock screen for the Pip-Boy 3000. Set a 4-digit access code and the
Pip-Boy asks for it before it can be used.

## First-time setup

Play the **SET LOCK** holotape. On first use it opens **CREATE ACCESS CODE** —
there is no default password.

1. **Turn the knob** to change the highlighted digit.
2. **Side wheel** moves between the four digit slots.
3. **Press the knob** to confirm, then re-enter the same code to save it.

## Unlocking

When the lock screen appears, enter your 4-digit code. A correct code shows
**ACCESS GRANTED** (with a sound and video, and a blue LED flash); a wrong code
shows **ACCESS DENIED** with a red flash so you can try again.

## Settings

Play the **SET LOCK** holotape again to open the settings menu, or long-press
**DATA** (the PIN is required). Turn to navigate, press to select.

| Option          | What it does                             |
| --------------- | ---------------------------------------- |
| **STARTUP**     | Lock when the Pip-Boy powers on          |
| **SLEEP**       | Lock on a quick wake from sleep          |
| **BOTH**        | Lock on either                           |
| **OFF**         | Disabled                                 |
| **SET PIN**     | Change your access code                  |
| **SET FACTION** | Choose the logo shown on the lock screen |
| **EXIT**        | Leave settings                           |

## Controls

| Action                  | Control        |
| ----------------------- | -------------- |
| Change value / navigate | Turn the knob  |
| Move between digits     | Side wheel     |
| Select / enter          | Press the knob |

## Faction logos

26 selectable logos: VAULTTEC, BROTHERHOOD, NCR, NCRSEAL, ENCLAVE, ENCLAVE1,
LEGION, REDTALON, FIENDS, VANGRAFFS, GUNNERS, OPERATORS, KINGS, BIGMT,
TUNNELSNAKES, ATOMCATS, GREATKHANS, FOLLOWERS, RESPONDERS, VIPERS, RANGERS,
MOTHMAN, WHITEGLOVE, SMUGGLERS, HAM, INTERSTATE80.

Swap in your own by replacing the matching `.BIN` (a native 2bpp transparent
Pip-Boy image). Logo position and boot-intro scale are tunable constants at the
top of `LOCK.JS`.

## Notes

- The lock arms when you play the tape and stays armed across sleep and wake,
  but not across a full power-off. After a cold power-off, play the tape once to
  re-arm it.
- Your settings are saved to `HOLO/HAMCOLOCK/LOCK.JSON` on first run.
- `G.AVI` is the ACCESS GRANTED video — replace it with your own if you like;
  the playback length is read from the file automatically.

## Files

| File          | Purpose                                  |
| ------------- | ---------------------------------------- |
| `APP.JS`      | Holotape entry point                     |
| `SERVICE.JS`  | Shared lock service (arming, mode logic) |
| `LOCK.JS`     | Lock / login screen                      |
| `GRANT.JS`    | ACCESS GRANTED sound, video and hand-off |
| `SETTINGS.JS` | Settings menu                            |
| `SETPIN.JS`   | First-run PIN creation                   |

## Credits

Created by [@joemto20-tech](https://github.com/joemto20-tech).

Tested on Pip-Boy 3000 Mk V firmware 1.1.5.
