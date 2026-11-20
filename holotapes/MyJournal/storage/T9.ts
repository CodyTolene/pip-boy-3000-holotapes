(function (): HolotapeApp {
  // Full hand-off to another holotape: it is started from the top level
  // once this one has returned, so nothing of this one is still held in
  // memory while the next one loads.
  function handOff(path: string): void {
    setTimeout(
      new Function(
        'Pip.loadHolotape(' + JSON.stringify(path) + ')',
      ) as () => void,
      20,
    );
  }

  const W = h.getWidth();
  const DRAFT_FILE = 'USER/QUEST_DRAFT.JSON';

  function loadDraft(): JournalDraft {
    try {
      return JSON.parse(fs.readFileSync(DRAFT_FILE)) as JournalDraft;
    } catch (e) {
      return { cat: 0, title: '', body: '', bodyDone: false };
    }
  }
  function saveDraft(d: JournalDraft): void {
    fs.writeFileSync(DRAFT_FILE, JSON.stringify(d));
  }

  const draft = loadDraft();
  const target = !draft.title ? 'title' : !draft.bodyDone ? 'body' : null;

  // Nothing left to type: hand straight back to the journal.
  if (!target) {
    handOff('/HOLO/MY_JOURNAL/APP.JS');
    return {
      id: 'T9KEYBOARD',
      notDefault: true,
      fullscreen: true,
      remove: function (): void {
        // Nothing was set up.
      },
    };
  }

  // The word list lives on the SD card, not in memory: one line per key
  // sequence, sorted by that sequence, words most common first, e.g.
  // "GOOD,HOME,GONE,HOOD". The sequence itself is not stored; it is worked
  // out from the line's first word. A binary search finds a line with about
  // 15 small reads, the same way the firmware's DataFile reads its records.
  const DICT_FILE = 'HOLO/MY_JOURNAL/T9DICT.TXT';
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LETTER_KEYS = '22233344455566677778889999';
  const PUNCT = '.,?!';

  function keyOf(word: string): string {
    let k = '';
    for (let i = 0; i < word.length; i++) {
      const n = LETTERS.indexOf(word.charAt(i));
      if (n >= 0) k += LETTER_KEYS.charAt(n);
    }
    return k;
  }
  function readStr(f: EspruinoFile, n: number): string {
    const r = f.read(n);
    if (r === undefined) return '';
    return typeof r === 'string' ? r : E.toString(r) || '';
  }
  // The first whole line that starts at or after byte pos, and where it
  // starts. One read of the card is usually enough, as lines are short.
  function lineFrom(
    f: EspruinoFile,
    pos: number,
    size: number,
  ): { at: number; line: string } {
    let at = pos > 0 ? pos - 1 : 0;
    f.seek(at);
    let buf = '';
    let start = pos > 0 ? -1 : 0;
    for (;;) {
      const part = readStr(f, 48);
      buf += part;
      if (start < 0) {
        const nl = buf.indexOf('\n');
        if (nl >= 0) {
          at += nl + 1;
          buf = buf.slice(nl + 1);
          start = 0;
        } else {
          at += buf.length;
          buf = '';
        }
      }
      if (start === 0) {
        const end = buf.indexOf('\n');
        if (end >= 0) return { at: at, line: buf.slice(0, end) };
      }
      if (!part) return { at: start === 0 ? at : size, line: buf };
    }
  }

  // Result of the last lookup, kept so redraws do not read the card again.
  let lastKey = '';
  let lastLook: T9Lookup = { words: null, prefix: '', missing: false };

  // Finds the words for a key sequence. When there is no exact match,
  // prefix holds the letters of the first word that starts with it.
  function lookup(key: string): T9Lookup {
    if (!key) return { words: null, prefix: '', missing: false };
    if (key === lastKey) return lastLook;
    let res: T9Lookup = { words: null, prefix: '', missing: false };
    let f: EspruinoFile | undefined;
    try {
      const st = fs.statSync(DICT_FILE);
      if (!st) throw new Error('missing');
      const size = st.size;
      f = E.openFile(DICT_FILE, 'r');
      let lo = 0,
        hi = size;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        const r = lineFrom(f, mid, size);
        if (r.at >= hi) {
          hi = mid;
          continue;
        }
        const k = keyOf(r.line.split(',')[0]);
        if (k === key) {
          res.words = r.line.split(',');
          break;
        }
        if (k < key) lo = r.at + r.line.length + 1;
        else hi = mid;
      }
      if (!res.words && lo < size) {
        const next = lineFrom(f, lo, size).line.split(',')[0];
        if (keyOf(next).indexOf(key) === 0) {
          // The first key.length letters of that word.
          let n = 0,
            p = '';
          for (let i = 0; i < next.length && n < key.length; i++) {
            p += next.charAt(i);
            if (LETTERS.indexOf(next.charAt(i)) >= 0) n++;
          }
          res.prefix = p;
        }
      }
      f.close();
      f = undefined;
    } catch (e) {
      if (f) f.close();
      res = { words: null, prefix: '', missing: true };
    }
    lastKey = key;
    lastLook = res;
    return res;
  }

  const SPELL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,'!?";
  const LONG_PRESS_MS = 450;

  // Phone keypad in the middle with 0 (space) centred underneath, and the
  // editing keys mirrored down both sides. Keys stay inside the screen's
  // curved edges (x 30-450, y 104-269).
  const KEY_W = 80,
    KEY_H = 36,
    COL_GAP = 5,
    ROW_GAP = 7;
  const KEYPAD_X0 = 30,
    KEYPAD_Y0 = 104;
  const ITEMS: T9KeyItem[] = [
    { type: 'left', label: '', row: 0, col: 0 },
    { type: 'punct', digitLabel: '1', sub: '.,?!', row: 0, col: 1 },
    { type: 'group', digit: 2, digitLabel: '2', sub: 'ABC', row: 0, col: 2 },
    { type: 'group', digit: 3, digitLabel: '3', sub: 'DEF', row: 0, col: 3 },
    { type: 'right', label: '', row: 0, col: 4 },
    { type: 'backspace', label: 'BKSP', row: 1, col: 0 },
    { type: 'group', digit: 4, digitLabel: '4', sub: 'GHI', row: 1, col: 1 },
    { type: 'group', digit: 5, digitLabel: '5', sub: 'JKL', row: 1, col: 2 },
    { type: 'group', digit: 6, digitLabel: '6', sub: 'MNO', row: 1, col: 3 },
    { type: 'delword', label: 'DEL', row: 1, col: 4 },
    { type: 'spell', label: 'SPELL', row: 2, col: 0 },
    { type: 'group', digit: 7, digitLabel: '7', sub: 'PQRS', row: 2, col: 1 },
    { type: 'group', digit: 8, digitLabel: '8', sub: 'TUV', row: 2, col: 2 },
    { type: 'group', digit: 9, digitLabel: '9', sub: 'WXYZ', row: 2, col: 3 },
    { type: 'done', label: 'DONE', row: 2, col: 4 },
    { type: 'space', digitLabel: '0', sub: 'SPACE', row: 3, col: 2 },
  ];
  const LAST_ROW = 3,
    LAST_COL = 4,
    SPACE_COL = 2;

  let selRow = 0,
    selCol = 2,
    // Column to go back to when leaving the one-key bottom row.
    upCol = 2;
  let entryKeys = '',
    candidateIdx = 0;
  let currentWord = '';
  const words: T9Word[] = [];
  let cursor = 0;
  let cleanedUp = false;
  let pressTimer: number | null = null,
    longFired = false;
  // True while the last key pressed was 1, so pressing it again cycles the
  // punctuation instead of adding more.
  let punctRun = false;
  let spelling = false,
    spellIdx = 0,
    spellBuffer = '';

  // Changing existing text: it starts on the keyboard, cursor at the end.
  // Words of letters only can still be cycled with a hold.
  if (draft.text) {
    const parts = draft.text.split(' ');
    for (let i = 0; i < parts.length; i++) {
      let t = parts[i];
      if (!t) continue;
      let p: string | undefined;
      if (t.length > 1 && PUNCT.indexOf(t.charAt(t.length - 1)) >= 0) {
        p = t.charAt(t.length - 1);
        t = t.slice(0, -1);
      }
      const k = keyOf(t);
      words.push({ text: t, key: k.length === t.length ? k : null, p: p });
    }
    cursor = words.length;
  }

  function refreshCurrentWord(): void {
    const l = lookup(entryKeys);
    currentWord = l.words
      ? l.words[candidateIdx]
      : l.prefix
        ? l.prefix
        : entryKeys;
  }
  function commitCurrentWord(): void {
    // Commits exactly what is displayed, with no separate recomputation.
    words.splice(cursor, 0, { text: currentWord, key: entryKeys });
    cursor++;
    entryKeys = '';
    candidateIdx = 0;
    currentWord = '';
  }
  function moveCursor(dir: number): void {
    cursor = E.clip(cursor + dir, 0, words.length);
  }
  function shown(w: T9Word): string {
    return w.text + (w.p || '');
  }

  function currentItemIndex(): number {
    for (let i = 0; i < ITEMS.length; i++)
      if (ITEMS[i].row === selRow && ITEMS[i].col === selCol) return i;
    return 0;
  }

  // Guarded so it is safe to run both before a hand-off and again when the
  // OS calls remove().
  function cleanup(): void {
    if (cleanedUp) return;
    cleanedUp = true;
    if (pressWatch) clearWatch(pressWatch);
    if (pressTimer) clearTimeout(pressTimer);
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
    h.clear();
  }

  function finishEntry(): void {
    const text = words.map(shown).join(' ');
    // The starting text was for this step only.
    draft.text = undefined;
    if (target === 'title') {
      draft.title = text || '(UNTITLED)';
      // Only the title was being changed: the body stays as it was.
      if (draft.keep) {
        draft.keep = undefined;
        draft.bodyDone = true;
      }
    } else {
      draft.body = text;
      draft.bodyDone = true;
    }
    try {
      saveDraft(draft);
    } catch (e) {
      // The card would not take the draft (full or locked). The text stays
      // on screen so nothing typed is lost; DONE can be pressed again.
      Pip.playSound('TAB');
      h.setColor(2)
        .setFontMonofonto14()
        .setFontAlign(0, 0)
        .drawString('COULD NOT WRITE TO THE SD CARD', 240, 290);
      return;
    }
    cleanup();
    handOff(
      draft.bodyDone ? '/HOLO/MY_JOURNAL/APP.JS' : '/HOLO/MY_JOURNAL/T9.JS',
    );
  }

  function spellLabel(idx: number): string {
    if (idx < 41) return SPELL_CHARS.charAt(idx);
    if (idx === 41) return 'BKSP';
    return 'FINISH';
  }
  function finishSpelling(): void {
    if (spellBuffer) {
      words.splice(cursor, 0, { text: spellBuffer, key: null });
      cursor++;
    }
    spelling = false;
    spellBuffer = '';
    spellIdx = 0;
    Pip.playSound('SELECT');
    draw();
  }
  function spellActivate(): void {
    if (spellIdx < 41) {
      spellBuffer += SPELL_CHARS.charAt(spellIdx);
    } else if (spellIdx === 41) {
      if (spellBuffer) spellBuffer = spellBuffer.slice(0, -1);
    } else {
      finishSpelling();
      return;
    }
    Pip.playSound('SCROLL');
    draw();
  }

  // The 1 key: "." on the end of the last word; pressing it again cycles
  // through , ? and !.
  function punctuate(): void {
    if (currentWord) {
      commitCurrentWord();
      punctRun = false;
    }
    if (cursor === 0) return;
    const w = words[cursor - 1];
    if (punctRun && w.p) {
      w.p = PUNCT.charAt((PUNCT.indexOf(w.p) + 1) % PUNCT.length);
    } else {
      w.p = PUNCT.charAt(0);
    }
    punctRun = true;
  }

  function onShortClick(): void {
    if (spelling) {
      spellActivate();
      return;
    }
    const item = ITEMS[currentItemIndex()];
    if (item.type === 'punct') {
      punctuate();
      Pip.playSound('SCROLL');
      draw();
      return;
    }
    punctRun = false;
    if (item.type === 'left') moveCursor(-1);
    else if (item.type === 'right') moveCursor(1);
    else if (item.type === 'group') {
      entryKeys += item.digit;
      candidateIdx = 0;
      refreshCurrentWord();
    } else if (item.type === 'backspace') {
      if (entryKeys) {
        entryKeys = entryKeys.slice(0, -1);
        candidateIdx = 0;
        if (entryKeys) refreshCurrentWord();
        else currentWord = '';
      } else if (cursor > 0 && words[cursor - 1].p) {
        words[cursor - 1].p = undefined;
      }
    } else if (item.type === 'delword') {
      if (entryKeys) {
        entryKeys = '';
        candidateIdx = 0;
        currentWord = '';
      } else if (cursor > 0) {
        words.splice(cursor - 1, 1);
        cursor--;
      }
    } else if (item.type === 'spell') {
      entryKeys = '';
      candidateIdx = 0;
      currentWord = '';
      spelling = true;
      spellIdx = 0;
      spellBuffer = '';
    } else if (item.type === 'space') {
      if (currentWord) commitCurrentWord();
    } else if (item.type === 'done') {
      if (currentWord) commitCurrentWord();
      finishEntry();
      return;
    }
    Pip.playSound('SCROLL');
    draw();
  }
  function onLongPress(): void {
    punctRun = false;
    if (spelling) {
      if (spellBuffer) finishSpelling();
      return;
    }
    if (currentWord) {
      commitCurrentWord();
      Pip.playSound('SELECT');
      draw();
    } else if (cursor > 0) {
      const t = words[cursor - 1];
      if (t.key) {
        const cands = lookup(t.key).words;
        if (cands && cands.length > 1) {
          t.text =
            cands[(cands.indexOf(t.text) + 1 + cands.length) % cands.length];
          Pip.playSound('SELECT');
          draw();
        }
      }
    }
  }
  // Left wheel: up and down the rows (up on the wheel moves up).
  function onKnob1(dir: KnobDirection): void {
    if (!dir) return;
    if (spelling) {
      spellIdx = (spellIdx + dir + 43) % 43;
      Pip.playSound('SCROLL');
      draw();
      return;
    }
    const row = E.clip(selRow + dir, 0, LAST_ROW);
    if (row === selRow) return;
    if (row === LAST_ROW) {
      upCol = selCol;
      selCol = SPACE_COL;
    } else if (selRow === LAST_ROW) {
      selCol = upCol;
    }
    selRow = row;
    Pip.playSound('SCROLL');
    draw();
  }
  // Right wheel: across the columns (the bottom row has only one key).
  function onKnob2(dir: KnobDirection): void {
    if (!dir) return;
    if (spelling) {
      spellIdx = (spellIdx + dir + 43) % 43;
      Pip.playSound('SCROLL');
      draw();
      return;
    }
    if (selRow === LAST_ROW) return;
    const col = E.clip(selCol + dir, 0, LAST_COL);
    if (col === selCol) return;
    selCol = col;
    Pip.playSound('SCROLL');
    draw();
  }
  // The left wheel press is watched directly so a hold can be timed.
  function onWatch(e: WatchEvent): void {
    if (e.state) {
      if (!pressTimer) {
        longFired = false;
        pressTimer = setTimeout(function (): void {
          longFired = true;
          pressTimer = null;
          onLongPress();
        }, LONG_PRESS_MS);
      }
    } else {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      if (!longFired) onShortClick();
    }
  }

  function drawCaret(x: number, y: number): void {
    h.setColor(3).fillRect(x - 1, y - 2, x + 1, y + 16);
  }
  // The typed text, two lines at most: the line with the cursor and the one
  // before it, so long entries scroll instead of running into the keys. The
  // word being keyed sits at the cursor, in a dimmer colour.
  function drawWords(x0: number, y0: number, maxWidth: number): void {
    h.setFontMonofonto16().setFontAlign(-1, -1);
    // Text of each slot; the slot at the cursor is the word being keyed.
    const parts: string[] = [];
    for (let i = 0; i < words.length; i++) {
      if (i === cursor) parts.push(entryKeys ? currentWord : '');
      parts.push(shown(words[i]));
    }
    if (cursor === words.length) parts.push(entryKeys ? currentWord : '');
    const xs: number[] = [],
      ls: number[] = [];
    let x = x0,
      line = 0;
    for (let i = 0; i < parts.length; i++) {
      const wpx = h.stringWidth(parts[i]);
      if (x - x0 + wpx > maxWidth && x > x0) {
        x = x0;
        line++;
      }
      xs.push(x);
      ls.push(line);
      x += parts[i] ? wpx + 10 : 4;
    }
    const top = Math.max(0, ls[cursor] - 1);
    for (let i = 0; i < parts.length; i++) {
      if (ls[i] < top || ls[i] > top + 1) continue;
      const y = y0 + (ls[i] - top) * 20;
      if (i === cursor) {
        drawCaret(xs[i], y);
        if (parts[i]) h.setColor(2).drawString(parts[i], xs[i] + 4, y);
        continue;
      }
      const wpx = h.stringWidth(parts[i]);
      if (i === cursor - 1 && !entryKeys) {
        h.setColor(3).fillRect(xs[i] - 2, y - 2, xs[i] + wpx + 2, y + 14);
        h.setColor(0);
      } else h.setColor(1);
      h.drawString(parts[i], xs[i], y);
    }
  }
  function keyX(col: number): number {
    return KEYPAD_X0 + col * (KEY_W + COL_GAP);
  }
  function keyY(row: number): number {
    return KEYPAD_Y0 + row * (KEY_H + ROW_GAP);
  }
  function drawKey(item: T9KeyItem, i: number): void {
    const selected = i === currentItemIndex();
    const x = keyX(item.col),
      y = keyY(item.row),
      w = KEY_W,
      h2 = KEY_H;
    h.setColor(selected ? 3 : 1).drawRect(x, y, x + w, y + h2);
    if (selected) h.setColor(3).fillRect(x + 1, y + 1, x + w - 1, y + h2 - 1);
    h.setColor(selected ? 0 : 2);
    if (item.digitLabel) {
      // Digit and letters share the key's middle line, like a phone key.
      h.setFontMonofonto23()
        .setFontAlign(-1, 0)
        .drawString(item.digitLabel, x + 7, y + h2 / 2 + 1);
      h.setFontMonofonto14()
        .setFontAlign(1, 0)
        .drawString(item.sub as string, x + w - 6, y + h2 / 2 + 1);
    } else if (item.type === 'left' || item.type === 'right') {
      // Drawn triangles: the font has no arrow glyphs.
      const cx = x + w / 2,
        cy = y + h2 / 2,
        d = item.type === 'left' ? -1 : 1;
      h.fillPoly([cx - 7 * d, cy - 9, cx + 7 * d, cy, cx - 7 * d, cy + 9]);
    } else {
      h.setFontMonofonto14()
        .setFontAlign(0, 0)
        .drawString(item.label as string, x + w / 2, y + h2 / 2);
    }
  }
  function drawCandidates(list: string[], current: number): void {
    let cx = 30;
    h.setFontMonofonto16().setFontAlign(-1, -1);
    for (let i = 0; i < list.length; i++) {
      const label = list[i],
        wpx = h.stringWidth(label) + 12;
      if (cx + wpx > 450) break;
      if (i === current) {
        h.setColor(3).fillRect(cx, 76, cx + wpx, 92);
        h.setColor(0);
      } else h.setColor(1);
      h.drawString(label, cx + 6, 78);
      cx += wpx + 8;
    }
  }
  function drawNote(text: string): void {
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, -1)
      .drawString(text, W / 2, 78);
  }
  function drawSpelling(): void {
    h.setColor(2)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString('SPELLING: ' + spellBuffer, W / 2, 50);
    h.setColor(3)
      .setFontMonofonto36()
      .setFontAlign(0, 0)
      .drawString(spellLabel(spellIdx), W / 2, 150);
    // The ones either side, dimmer, so the turn direction is plain to see.
    h.setColor(1)
      .setFontMonofonto23()
      .drawString(spellLabel((spellIdx + 42) % 43), W / 2 - 120, 150)
      .drawString(spellLabel((spellIdx + 1) % 43), W / 2 + 120, 150);
  }
  function draw(): void {
    h.reset().clear(0);
    const heading =
      target === 'title'
        ? draft.text
          ? 'EDIT TITLE'
          : 'ENTER TITLE'
        : draft.addTo
          ? draft.objIdx === undefined
            ? 'NEW OBJECTIVE'
            : 'EDIT OBJECTIVE'
          : draft.text || draft.editId
            ? 'EDIT TEXT'
            : 'ENTER BODY (OPTIONAL)';
    // Header drawn like the Pip-Boy's own: title on the line at the top left.
    h.setColor(3)
      .setFontMonofonto18()
      .setFontAlign(-1, 0)
      .drawString(heading, 57, 18);
    h.drawLine(15, 18, 47, 18).drawLine(
      67 + h.stringWidth(heading),
      18,
      465,
      18,
    );

    if (spelling) {
      drawSpelling();
      h.flip();
      Pip.lastFlip = getTime();
      return;
    }

    drawWords(30, 32, 420);
    if (entryKeys) {
      const l = lookup(entryKeys);
      if (l.missing) drawNote('NO WORD LIST: COPY T9DICT.TXT');
      else if (l.words) drawCandidates(l.words, candidateIdx);
      else if (l.prefix) drawNote('KEEP TYPING');
      else drawNote('NO MATCH: TRY THE SPELL KEY');
    } else if (cursor > 0 && words[cursor - 1].key) {
      const prev = words[cursor - 1];
      const alts = lookup(prev.key as string).words;
      if (alts && alts.length > 1)
        drawCandidates(alts, alts.indexOf(prev.text));
    }
    // The keys carry their own labels; the controls are on the journal's
    // CONTROLS page.
    for (let i = 0; i < ITEMS.length; i++) drawKey(ITEMS[i], i);
    h.flip();
    Pip.lastFlip = getTime();
  }

  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  const pressWatch = setWatch(onWatch, ENC1_PRESS, {
    repeat: true,
    edge: 'both',
    debounce: 60,
  });
  draw();

  return {
    id: 'T9KEYBOARD',
    notDefault: true,
    fullscreen: true,
    remove: cleanup,
  };
});
