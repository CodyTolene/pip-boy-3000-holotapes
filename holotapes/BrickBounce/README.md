# Brick Bounce

![Brick Bounce title screen](pip-boy-3000-holotapes/holotapes/BrickBounce/assets/preview.png)

Brick Bounce is an original arcade brick-breaker for the Pip-Boy 3000. Clear 50
hand-built levels, collect power-ups, chase high scores, and unlock extra
content as you master the game.

## Screenshots

![Brick Bounce gameplay](pip-boy-3000-holotapes/holotapes/BrickBounce/assets/gameplay.png)

![Brick Bounce local high-score entry](pip-boy-3000-holotapes/holotapes/BrickBounce/assets/initials.png)

## Features

- 50 main levels plus bonus rounds every 10 levels.
- Arcade and Classic ball behavior, with Easy, Normal, Hard, and Insane
  difficulties.
- Three independent save profiles, automatic saves, local high scores, and
  custom level editing.
- Upload your score to the online leaderboard with a QR code.
- Power-ups including paddle size, Power Ball, Multi Ball, Extra Life, Fast
  Ball, Slow Ball, and random items.
- Unlockable bonus content: PONG, Snake, Floaty Ball, Bounce Run, a music
  player, and custom levels.
- Four awesome in-game music tracks.

## Controls

| Input                        | Action                                                |
| ---------------------------- | ----------------------------------------------------- |
| Turn a scroll wheel          | Move the paddle; navigate menus; change values        |
| Press the left knob          | Serve the ball, select an item, pause, or confirm     |
| Turn the second scroll wheel | Alternate menu navigation and secondary game controls |
| PONG two-player mode         | One player uses each scroll wheel                     |

## Installation

This holotape is intended for the Pip-Boy 3000 Holotapes repository and
Pip-Boy.com. The `metadata.json` `storage` list declares every file that must be
installed under `HOLO/BRKBNCE/`.

For repository development, place this directory at `holotapes/BrickBounce/`,
run `npm install`, then run `npm run build` from the repository root. The
repository build generates the registry entry under
`dist/pip-boy-3000-holotapes/`; generated registries are not committed.

## Firmware Tested

- Pip-Boy 3000 firmware 1.1.5
- Espruino 2v29.350

## Credits

- Game design, artwork and music: HtheB

## License

Copyright (c) 2026 HtheB.

Brick Bounce is licensed under the
[PolyForm Noncommercial License 1.0.0](LICENSE). It may be used, modified, and
shared for noncommercial purposes under those terms.

[NOTICE](NOTICE) grants Pip-Boy.com a limited additional permission to host,
distribute, and maintain Brick Bounce while accepting voluntary donations that
support the site's hosting and operation. That permission does not grant other
commercial rights to Brick Bounce.
