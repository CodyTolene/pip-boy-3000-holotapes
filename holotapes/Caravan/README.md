# Caravan v1.0.0

A playable recreation of **Caravan from Fallout: New Vegas** for **The Wand
Company Pip-Boy 3000**, built for firmware **1.1.6** and designed around the
device's limited Espruino memory.

## Features

- Player-vs-CPU Caravan gameplay
- Randomized 54-card decks
- Number cards, Aces, Jacks, Queens, Kings, and Jokers
- Three caravans per player
- Ascending and descending caravan rules
- Same-suit override behavior
- 21–26 selling range
- Proper tie handling
- Two-of-three caravan win detection
- Disband Caravan support
- Opening discard/redraw support
- 14 randomized Fallout: New Vegas Caravan opponents
- Built-in Tutorial
- Caravan Rules / Controls screen
- Rematch support
- Challenge New Opponent
- Player and opponent bottle-cap bankrolls
- Betting limited by available bottle caps
- Bottle-cap reset flow when funds run out
- Animated win/loss Results screen
- Dedicated Game Over Win audio
- Configurable sound effects and background music
- Individual audio preview controls
- Persistent volume settings
- Low-memory menu and gameplay architecture designed for repeated matches

## Opponents

Caravan randomly selects from 14 Fallout: New Vegas Caravan players:

- Cliff Briscoe
- Dale Barton
- Ambassador Dennis Crocker
- Isaac
- Private Jake Erwin
- Johnson Nash
- Jules
- Keith
- Lacey
- Little Buster
- Quartermaster Mayes
- No-bark Noonan
- Ringo
- Jed Masterson

**Rematch** keeps the current opponent.

**Challenge New Opponent** selects a different opponent without requiring the
entire game to be reloaded.

## Gameplay

Caravan includes the major card mechanics from Fallout: New Vegas:

- **Jack** removes a targeted numbered card and its attached face cards.
- **Queen** reverses caravan direction and changes its effective suit.
- **King** doubles the value of the targeted numbered card.
- **Joker** removes matching ranks or suits depending on the targeted card.

A caravan must total **21–26** and beat the opposing caravan to count as
**SOLD**.

Equal totals remain tied.

The game determines the winner once one side controls at least two of the three
caravan lanes with no unresolved ties preventing the result.

## Tutorial

Caravan includes a built-in lightweight Tutorial covering the major controls and
gameplay rules.

The Tutorial explains:

- Basic Caravan gameplay
- Card placement
- Caravan direction
- Same-suit overrides
- Selling caravans
- Jacks
- Queens
- Kings
- Jokers
- Disbanding caravans
- Winning and losing
- Bottle-cap behavior

The Tutorial uses a compact standalone renderer designed to reduce memory usage
and can be safely left open without continuously running background animation.

## Bottle Caps

The player and opponent both maintain their own bottle-cap totals.

Winning and losing updates each bankroll based on the current wager, and bets
cannot exceed the available funds of either side.

If the player runs out of caps, Caravan provides a reset flow that restores both
bankrolls so another game can be started.

If the opponent runs out of caps, Caravan prevents another match from starting
until the bankrolls are reset.

Resetting restores both sides to their starting bottle-cap totals.

## Results

The Results screen includes animated bottle-cap artwork for wins and losses.

Depending on the current bankroll and match state, the Results screen provides:

- **Rematch**
- **Challenge New Opponent**
- **Back**
- Bottle-cap reset / out-of-caps flows

The result artwork uses its own compact graphics bank:

`CARAVAN_RESULT_CAPS.BIN`

This allows the result animation to run without loading the larger gameplay
graphics bank during an already memory-heavy transition.

## Low-Memory Runtime

Caravan is split into multiple runtime modules specifically for the Pip-Boy's
constrained Espruino environment.

The game uses cleanup, garbage collection, and memory defragmentation around
heavier menu, gameplay, audio, and Results transitions.

The current runtime is designed so the main Game controller and Caravan Engine
can remain resident between matches instead of repeatedly rebuilding the Engine.

When extra memory is needed for heavier menus such as **Volume Adjustment** or
**Tutorial**, Caravan can release the gameplay Renderer and idled Game Audio
runtime while keeping the core game state available.

When gameplay resumes, the required modules are loaded again without rebuilding
the entire game engine.

This architecture allows repeated:

**Game → Results → Main Menu → Volume / Tutorial → Game**

cycles while keeping memory usage stable on real Pip-Boy hardware.

The Volume Adjustment and Tutorial interfaces also use compact standalone
runtimes to reduce peak memory usage.

Caravan does not generate diagnostic log files during normal use.

## Audio

Caravan includes:

- Playing Card sound
- Discard sound
- Bottle Cap result audio
- Game Over Win sound
- Background music
- Individual sound previews
- Separate sound-effect and music volume settings
- Persistent audio configuration

### Background Music

**Lazy Day - Tired** — Geoff Harvey from Pixabay

### Playing Card and Discard Sounds

**Alex from Pixabay**

### Bottle Cap Result Audio

**The Wand Company Pip-Boy 3000**

### Game Over Win Audio

**Sound Distributed From Wand Company MK V (TV Series) PIP-BOY**

## Thank You

Holotape artwork by **Goji!**

He put work into the Caravan cover artwork and it turned out awesome.
