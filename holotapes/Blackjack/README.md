# Blackjack

A single-player Blackjack game for the Pip-Boy 3000. Play against the dealer
using a single shuffled deck, with variable betting and standard casino rules.

## Controls

| Input                                 | Action                                        |
| ------------------------------------- | --------------------------------------------- |
| Left scroll wheel (knob1) up/down     | Adjust bet amount (10-chip increments)        |
| Right scroll wheel (knob2) left/right | Cycle between HIT and STAND                   |
| Left scroll wheel press               | Deal / Confirm action / Continue after result |

## Rules

- Single 52-card deck, reshuffled when exhausted.
- Dealer hits on soft 17.
- Blackjack pays 3:2.
- Dealer's hole card is hidden until the player's turn ends.
- Start with 500 chips. Bet resets to minimum (10) after each hand.

## Screens

- **Betting screen** — Adjust bet with knob1, press to deal
- **Player screen** — Scroll knob2 to select HIT or STAND, press to confirm
- **Result screen** — Shows outcome (WIN / LOSE / BUST / BLACKJACK / PUSH),
  press to continue

## Installation

Place the following files on your Pip-Boy 3000 SD card:

```
APPS/BLACKJACK.JS
APPINFO/BLACKJACK.info
```

## Firmware Tested

Pip-Boy 3000 — firmware version tested in development session (June 2026).

## Notes

- Session-only chip balance — resets to 500 on app restart.
- Cards display rank only (no suit) to conserve screen space.
- Idle filter suppressed during app, restored on exit.

## License

MIT
