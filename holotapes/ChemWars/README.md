# Chem Wars

A 30-day trading game in the spirit of the classic _Drug Wars_, set in the
Mojave Wasteland of Fallout: New Vegas.

You're a small-time courier who just lost a massive shipment belonging to the
Omertas. You have **30 days** to scrape together **50,000 caps** before they
collect your kneecaps. Meanwhile, Officer NARC-9 — one of Mr. House's standard
police Securitrons, single-mindedly devoted to stamping out the illegal chem
trade — patrols the roads, printing citations out of its chassis at anyone
carrying contraband. The Omertas wait at the end of the 30 days; NARC-9 is the
one you'll keep running into along the way.

## How to Play

- Buy chems where they're cheap, travel, and sell where they're expensive.
- Traveling between locations costs **1 day**. Prices reroll on arrival.
- Travel **on foot** (free, risky) or by **caravan** (250 caps — guards keep
  NARC-9 and muggers away, and fellow traders make offers more often). Toggle it
  at the top of the travel menu.
- Watch for market booms and crashes — that's where fortunes are made.
- The road is dangerous. **Officer NARC-9** may stop you: run (it might catch
  you, seize your contraband, and fine you), bribe it (25% of on-hand caps), or
  fight it if you own the laser pistol. **Fiends** ambush travelers too: run
  (risk a beating and a robbery), pay them off, or fight. Wasteland critters —
  cazadores, radscorpions, bighorners — also take bites out of your HP.
- Hit **0 HP** and you black out: you wake at Doc Mitchell's a day later, 10% of
  your caps lighter.
- **Overdose**: each dose past your first in a day adds 15% OD risk (25-45 HP),
  and Jet's free travel doesn't reset the clock. Sleep it off or pace yourself.
- Your debt **grows 2% per day**. Pay it down at **Gomorrah on The Strip** (PAY
  DEBT on the action bar) — partial payments welcome, no refunds, no receipts,
  no further questions.
- In **Freeside**, the Atomic Wrangler runs a caps stash: 3% daily interest and
  mugging-proof. Legally distinct from a bank.
- A traveling merchant sometimes offers a brahmin-hide duffel: +50 pack space,
  up to 200 total. It smells awful. Buy it anyway.
- **USE** a chem for a one-trip edge: Buffout toughens you up (+20 HP in a
  fight), Jet makes the next trip cost no day, Psycho boosts fight damage 50%,
  Mentats mark market bargains with a `*`, Med-X halves fight damage taken.
  Every dose carries a **20% addiction risk** — addictions drain 300 caps a day
  until cured.
- The **Gun Runners** may flag you down with a laser pistol (3,500 caps). Owning
  it unlocks **FIGHT** in every hostile encounter — Securitron or Fiend. Win for
  salvage or loot with no fine; lose and you're knocked out cold, fined or
  robbed, and wake at Doc Mitchell's. Buffout, Psycho, and Med-X all tilt the
  odds.
- **Doc Mitchell** in Goodsprings patches you up (3 caps per HP) and cures
  addictions (500 caps each). "Let me take a look at ya."
- On day 30, choose TRAVEL to face the Omertas and settle up. How the story ends
  depends on how you did — five endings, from KNEECAP FORFEITURE to THE COURIER
  KING. Your best profit is saved to the holotape as the Mojave Record.
- Exiting the app mid-run suspends your game — next launch offers RESUME or
  START NEW RUN on the title screen.

## Locations

Goodsprings, Freeside, The Strip, Red Rock Canyon, Novac, Hidden Valley. Each
has its own market character — Jet floods Freeside, The Strip pays top cap for
everything, the Khans cook cheap Psycho in Red Rock, and the Brotherhood keeps
Hidden Valley oversupplied with Mentats.

## Controls

| Input                        | Action                           |
| ---------------------------- | -------------------------------- |
| Main wheel (rotate)          | Move cursor / adjust amount      |
| Main wheel (press)           | Select / confirm                 |
| Second wheel (main screen)   | Walk the horizontal action bar   |
| Second wheel (amount picker) | Big steps (±10 chems, ±500 caps) |
| Second wheel (in a submenu)  | Quick back to main menu          |

In the amount picker, confirming at 0 cancels.

## Manual Install

- `app.min.js` → `HOLO/CHEM_WARS/APP.JS`
- `TEXT.TXT` → `HOLO/CHEM_WARS/TEXT.TXT` (all game text, loaded at runtime to
  keep the interpreted code small — the app requires it)
- An `APPINFO/CHEM_WARS.info` metadata file registers the game in the Items >
  Misc list (created automatically when installing from Pip-Boy.com). Reboot the
  Pip-Boy after copying so the list rescans.

## Version History

See `ChangeLog`.
