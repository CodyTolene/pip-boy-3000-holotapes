# My Journal

A personal quest log and notebook for the Pip-Boy 3000. Track your own quests,
mark them done, jot down notes, and type it all with a built-in T9 predictive
keyboard that knows the wasteland's vocabulary.

### Info

**Author(s):**

- [@Radiomaru7](https://github.com/Radiomaru7)

### Controls

The same controls are on the journal's own **CONTROLS** page (the second row of
the list, under + NEW).

**Journal**

| Input                | Action                                          |
| -------------------- | ----------------------------------------------- |
| Left wheel (rotate)  | Up and down: the list, objectives, a long note  |
| Left wheel (press)   | Open an entry / start a new one / do the action |
| Left wheel (hold)    | Pick up an entry to reorder it (press to drop)  |
| Right wheel (rotate) | Switch between the QUESTS and NOTES tabs        |
| Right wheel (rotate) | In an entry: left and right along the choices   |
| Left wheel (press)   | On the CONTROLS page: back to the list          |
| STATS, ITEMS or DATA | Leave the holotape                              |

**Keyboard**

| Input                | Action                                                     |
| -------------------- | ---------------------------------------------------------- |
| Left wheel (rotate)  | Move between keypad rows                                   |
| Right wheel (rotate) | Move between keypad columns                                |
| Left wheel (press)   | Press the highlighted key                                  |
| Left wheel (hold)    | Accept the current word, or cycle the last word's spelling |
| 1 key                | Add . to the last word; press again for , ? or !           |
| 0 key (SPACE)        | Start the next word                                        |
| SPELL: either wheel  | Step through the letters, numbers, BKSP and FINISH         |
| SPELL: press         | Add the letter (or do BKSP / FINISH)                       |
| SPELL: hold          | Finish the word                                            |

### How to Use

Pick **+ NEW QUEST** or **+ NEW NOTE** and the keyboard opens for the title,
then again for the body (the body is optional, so you can press DONE straight
away). Back in the journal you can save, edit either part, or discard. Editing
opens the keyboard with the text already there, so you only fix what is wrong;
editing the title keeps the body. DISCARD asks first: press it again to throw
the entry away, or turn a wheel to keep it.

The keyboard works like an old phone: press the digit for each letter once and
the dictionary suggests the word. While you key, the start of the first word
that fits shows instead of the digits. When a word has more than one match (GO
and IN are both 4-6), hold the left wheel to cycle between them. 0 (SPACE)
starts the next word and 1 adds punctuation to the last one. BKSP removes a
digit, DEL removes the whole word, and the arrow keys move the cursor between
words.

For a word the dictionary does not know, press **SPELL** to pick letters,
numbers and punctuation one at a time, then choose FINISH (or hold the wheel).

Open an entry to read it, mark a quest done or active again, rename it, change a
note's text (**EDIT TEXT**), or delete it. **DELETE** asks first: it changes to
DELETE?, and a second press deletes the entry (turning a wheel cancels). A note
too long for the screen scrolls with the left wheel; arrows on the right show
when there is more.

Quests can have several objectives, like the game's own quests. The body you
type for a new quest is its first objective. Open the quest and pick **ADD
OBJECTIVE** to type another (up to 10). Turn the wheel to an objective and press
it to mark it done (or not done), edit its text, or remove it. Done objectives
stay in the list with (DONE) on the end, so the whole quest history stays
visible, here and in DATA > QUESTS.

### In DATA > QUESTS and DATA > NOTES

My Journal comes with a small hook, `HOLO/MY_JOURNAL/DATA_HOOK.JS`, that
switches on the first time you open the journal. From then on your journal shows
up in the Pip-Boy's own DATA screens:

- Active journal quests appear at the top of DATA > QUESTS, with their
  objectives listed like a game quest's; done ones end in (DONE). Quests you
  mark done drop off the list.
- Journal notes appear at the top of DATA > NOTES, with the body text shown
  beside the list like any other note.

The hook adds your entries as the quest and notes data is read, so it works
however the screens themselves are stored. It only reads `USER/MYQUESTS.JSON`
and the game's own data files; it never changes them. Each entry is built only
when the screen reads it, so memory does not grow with the journal. Very long
entries are shortened to fit the game's record size. New entries appear the next
time you open the screen.

It keeps working after a full restart: the hook adds itself to
`USER/RADIOMARU_BOOT.JSON`, and one small boot script shared by Radiomaru7's
holotapes runs the files listed there at startup. Like the Character Switcher,
it only uses a free slot among `.boot1`-`.boot3` (never `.boot0`, which belongs
to the Fallout companion app) and only writes when something is missing. If all
three slots are already taken, it still works until the next full restart, and
opening the holotape again switches it back on.

### Notes

- The journal holds up to 99 entries (quests and notes together). When it is
  full, + NEW shows JOURNAL FULL until you delete one.

The dictionary, `HOLO/MY_JOURNAL/T9DICT.TXT`, holds about 12,000 words: the most
common English words, Fallout 3 and New Vegas names and words, and the journal's
original Fallout list (which includes some swear words, because wastelanders
talk that way). Slurs are left out. It stays on the SD card and is searched
there a few bytes at a time, so a bigger list costs no memory; copy it along
with `T9.JS`.

The keyboard is a second file, `T9.JS`, that the journal hands off to with
`Pip.loadHolotape`. The two pass the entry in progress through
`USER/QUEST_DRAFT.JSON`, and saved entries live in `USER/MYQUESTS.JSON`.

The left wheel press is read with `setWatch` rather than the knob event, so a
hold can be timed reliably. The right wheel is only ever turned, never pressed.

### Credits

The word list is built from the 2018 English frequency list of
[FrequencyWords](https://github.com/hermitdave/FrequencyWords) by Hermit Dave
(CC BY-SA 4.0, from OpenSubtitles), filtered with
[english-words](https://github.com/dwyl/english-words) by dwyl (Unlicense).
`T9DICT.TXT` is shared under CC BY-SA 4.0.

### License(s)

This app is licensed under the MIT License. See
[MIT](https://opensource.org/license/mit/) for more information.

`SPDX-License-Identifier: MIT`
