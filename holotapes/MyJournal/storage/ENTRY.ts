(function (api: JournalApi, start: number): JournalScreen | null {
  // An open entry: the quest screen with its objectives, a note, or the
  // save screen after the keyboard. Loaded by APP.ts only while an entry is
  // open, so the journal list uses less memory the rest of the time.
  // start: the entry's index in the journal, -1 to pick up a draft from the
  // keyboard, or -2 for the CONTROLS page.
  const ROW_H = api.rowH;
  // The CONTROLS page. Headings are the lines without a colon.
  const HELP_LINES = [
    'THE JOURNAL',
    'LEFT WHEEL: UP AND DOWN THE LIST',
    'RIGHT WHEEL: QUESTS OR NOTES',
    'PRESS: OPEN   HOLD: MOVE IT, PRESS TO DROP',
    'IN AN ENTRY',
    'LEFT WHEEL: UP AND DOWN   RIGHT WHEEL: CHOICES',
    'PRESS: DO IT (DELETE ASKS TWICE)',
    'KEYBOARD',
    'LEFT WHEEL: ROWS   RIGHT WHEEL: COLUMNS',
    'PRESS: KEY   HOLD: NEXT WORD OR SPELLING',
    'SPELL: EITHER WHEEL, HOLD TO FINISH',
  ];
  const CONFIRM_ACTIONS = ['SAVE', 'EDIT TITLE', 'EDIT BODY', 'DISCARD'];

  let mode = 'view';
  let viewIdx = start;
  let viewActionIdx = 0;
  // Quest screen: the objective whose choices are showing (-1 none), the
  // highlighted choice, and the first objective row on screen.
  let objOpen = -1;
  let objChoice = 0;
  let viewScroll = 0;
  // Save screen after the keyboard.
  let catChoice = 0;
  let newTitleText = '';
  let newBodyText = '';
  let confirmIdx = 0;
  // DELETE and DISCARD ask for a second press; turning a wheel cancels.
  let armed = false;
  // A note's first text line on screen, for notes too long to fit.
  let noteScroll = 0;
  let noteMore = false;

  // A quest's objectives; older entries use their body as the one objective.
  function objectives(q: JournalEntry): string[] {
    return q.obj ? q.obj.slice() : q.body ? [q.body] : [];
  }
  // Which objectives are done (1) or not (0), one per objective.
  function doneFlags(q: JournalEntry): number[] {
    const n = objectives(q).length;
    const od: number[] = [];
    for (let i = 0; i < n; i++) od.push(q.od && q.od[i] ? 1 : 0);
    return od;
  }
  function setObjectives(q: JournalEntry, list: string[], od: number[]): void {
    q.obj = list;
    q.od = od;
    // Keeps the first objective in body too, as older versions read it.
    q.body = list.length ? list[0] : '';
  }

  // Picks up where the keyboard left off: a new objective for a quest, or a
  // new entry to save.
  function resumeDraft(): void {
    const d = api.draft;
    const quests = api.quests();
    if (d && d.addTo && d.bodyDone) {
      for (let i = 0; i < quests.length; i++) {
        if (quests[i].id !== d.addTo) continue;
        const list = objectives(quests[i]);
        const od = doneFlags(quests[i]);
        const at = d.objIdx === undefined ? -1 : d.objIdx;
        if (d.body && at >= 0 && at < list.length) {
          // A changed objective keeps its place and its done mark.
          list[at] = d.body;
          setObjectives(quests[i], list, od);
          api.save();
        } else if (d.body && at < 0) {
          list.push(d.body);
          od.push(0);
          setObjectives(quests[i], list, od);
          api.save();
        }
        viewIdx = i;
        viewActionIdx = at >= 0 ? at : Math.max(0, list.length - 1);
      }
      api.clearDraft();
    } else if (d && d.editId && d.bodyDone) {
      // A saved entry's title (or a note's text) changed on the keyboard.
      for (let i = 0; i < quests.length; i++) {
        if (quests[i].id !== d.editId) continue;
        quests[i].title = d.title;
        if (quests[i].cat === 1) quests[i].body = d.body;
        api.save();
        viewIdx = i;
      }
      api.clearDraft();
    } else if (d && d.title && d.bodyDone) {
      catChoice = d.cat;
      newTitleText = d.title;
      newBodyText = d.body;
      mode = 'confirm';
    }
  }

  // Objective rows on the quest screen (notes have none).
  function viewRows(): number {
    const q = api.quests()[viewIdx];
    return q.cat === 0 ? objectives(q).length : 0;
  }

  function viewActions(): string[] {
    const q = api.quests()[viewIdx];
    if (objOpen >= 0) {
      return [
        doneFlags(q)[objOpen] ? 'NOT DONE' : 'MARK DONE',
        'EDIT',
        'REMOVE',
        'BACK',
      ];
    }
    const actions = ['BACK'];
    if (q.cat === 0 && objectives(q).length < api.maxObj) {
      actions.push('ADD OBJECTIVE');
    }
    if (q.cat === 0) actions.push(q.status ? 'MARK ACTIVE' : 'MARK DONE');
    actions.push('RENAME');
    if (q.cat === 1) actions.push('EDIT TEXT');
    actions.push(armed ? 'DELETE?' : 'DELETE');
    return actions;
  }

  // An objective's own choices: mark it done or not, or remove it.
  function objectiveActivate(): void {
    const q = api.quests()[viewIdx];
    const list = objectives(q);
    const od = doneFlags(q);
    const label = viewActions()[objChoice];
    if (label === 'MARK DONE' || label === 'NOT DONE') {
      od[objOpen] = od[objOpen] ? 0 : 1;
      setObjectives(q, list, od);
      api.save();
    } else if (label === 'EDIT') {
      api.toKeyboard({
        cat: 0,
        title: q.title,
        body: '',
        bodyDone: false,
        addTo: q.id,
        objIdx: objOpen,
        text: list[objOpen],
      });
      return;
    } else if (label === 'REMOVE') {
      list.splice(objOpen, 1);
      od.splice(objOpen, 1);
      setObjectives(q, list, od);
      api.save();
      viewActionIdx = E.clip(objOpen, 0, Math.max(0, list.length - 1));
    }
    objOpen = -1;
    Pip.playSound('SCROLL');
    draw();
  }

  function viewActivate(): void {
    if (objOpen >= 0) return objectiveActivate();
    const rows = viewRows();
    if (viewActionIdx < rows) {
      objOpen = viewActionIdx;
      objChoice = 0;
      Pip.playSound('SELECT');
      draw();
      return;
    }
    const quests = api.quests();
    const q = quests[viewIdx];
    const label = viewActions()[viewActionIdx - rows];
    if (label === 'BACK') {
      api.done(-1);
      return;
    } else if (label === 'ADD OBJECTIVE') {
      api.toKeyboard({
        cat: 0,
        title: q.title,
        body: '',
        bodyDone: false,
        addTo: q.id,
      });
      return;
    } else if (label === 'MARK DONE' || label === 'MARK ACTIVE') {
      q.status = q.status ? 0 : 1;
      api.save();
    } else if (label === 'RENAME') {
      api.toKeyboard({
        cat: q.cat,
        title: '',
        body: q.body,
        bodyDone: false,
        editId: q.id,
        text: q.title,
        keep: true,
      });
      return;
    } else if (label === 'EDIT TEXT') {
      api.toKeyboard({
        cat: q.cat,
        title: q.title,
        body: '',
        bodyDone: false,
        editId: q.id,
        text: q.body,
      });
      return;
    } else if (label === 'DELETE') {
      armed = true;
      Pip.playSound('SELECT');
      draw();
      return;
    } else if (label === 'DELETE?') {
      quests.splice(viewIdx, 1);
      api.save();
      api.done(-1);
      return;
    }
    Pip.playSound('SCROLL');
    draw();
  }

  function confirmLabels(): string[] {
    const a = CONFIRM_ACTIONS.slice();
    if (armed) a[a.length - 1] = 'DISCARD?';
    return a;
  }
  function confirmActivate(): void {
    const label = confirmLabels()[confirmIdx];
    if (label === 'SAVE') {
      api.add(catChoice, newTitleText, newBodyText);
      api.clearDraft();
      api.done(catChoice);
      return;
    } else if (label === 'EDIT TITLE') {
      // Opens with the title typed so far; the body is kept.
      api.toKeyboard({
        cat: catChoice,
        title: '',
        body: newBodyText,
        bodyDone: false,
        text: newTitleText,
        keep: true,
      });
      return;
    } else if (label === 'EDIT BODY') {
      api.toKeyboard({
        cat: catChoice,
        title: newTitleText,
        body: '',
        bodyDone: false,
        text: newBodyText,
      });
      return;
    } else if (label === 'DISCARD') {
      armed = true;
      Pip.playSound('SELECT');
      draw();
      return;
    } else if (label === 'DISCARD?') {
      api.clearDraft();
      api.done(-1);
      return;
    }
    Pip.playSound('SCROLL');
    draw();
  }

  // A row of choices along the bottom, highlighted the Pip-Boy's way.
  // Less space round each one when they would run past x 465.
  function drawChoices(items: string[], sel: number, y: number): void {
    let x = 24;
    h.setFontMonofonto14();
    let text = 0;
    for (let i = 0; i < items.length; i++) text += h.stringWidth(items[i]);
    const pad = E.clip(
      Math.floor((441 - text - 8 * (items.length - 1)) / items.length),
      6,
      16,
    );
    for (let i = 0; i < items.length; i++) {
      const wpx = h.stringWidth(items[i]) + pad;
      if (i === sel) Pip.shadeBox(x, y, x + wpx, y + ROW_H);
      h.setColor(3)
        .setFontAlign(0, 0)
        .drawString(items[i], x + wpx / 2, y + 13);
      x += wpx + 8;
    }
  }

  // Wrapped text w wide from x 24, from line skip on, down to y 248 (the
  // choices row starts at 256). noteMore is set when lines are left below.
  function textAt(
    text: string,
    w: number,
    y: number,
    c: number,
    skip: number,
  ): number {
    const lines = h.setFontMonofonto14().wrapString(text, w);
    h.setColor(c).setFontAlign(-1, -1);
    let i = skip;
    for (; i < lines.length && y <= 232; i++) {
      h.drawString(lines[i], 24, y);
      y += 16;
    }
    noteMore = i < lines.length;
    return y;
  }

  function drawView(): void {
    h.reset().clear(0);
    const q = api.quests()[viewIdx];
    const rows = viewRows();
    // The header's info line also carries the second-press warning and the
    // open objective's number (there are no hint lines at the bottom).
    api.header(
      'MY JOURNAL',
      armed
        ? 'PRESS AGAIN TO DELETE'
        : objOpen >= 0
          ? 'OBJECTIVE ' + (objOpen + 1) + ' OF ' + rows
          : api.catLabel(q.cat) + api.statusLabel(q),
    );
    const y = textAt(q.title, 441, 50, 3, 0);
    h.setColor(1).drawLine(24, y + 2, 465, y + 2);
    if (q.cat !== 0) {
      // A long note scrolls with the left wheel.
      textAt(q.body || '(NO DETAILS)', 420, y + 8, 3, noteScroll);
      h.setColor(2).setFontMonofonto14().setFontAlign(0, -1);
      if (noteScroll > 0) h.drawString('^', 455, y + 8);
      if (noteMore) h.drawString('v', 455, 232);
    } else if (!rows) {
      h.setColor(2)
        .setFontMonofonto14()
        .setFontAlign(-1, -1)
        .drawString('NO OBJECTIVES YET', 24, y + 10);
    } else {
      // The objectives as a native list, done ones dimmer and marked.
      const list = objectives(q);
      const od = doneFlags(q);
      const top = y + 6;
      const fits = Math.max(1, Math.floor((248 - top) / ROW_H));
      const cur = objOpen >= 0 ? objOpen : viewActionIdx;
      if (cur < rows) {
        if (cur < viewScroll) viewScroll = cur;
        if (cur >= viewScroll + fits) viewScroll = cur - fits + 1;
      }
      viewScroll = E.clip(viewScroll, 0, Math.max(0, rows - fits));
      h.setFontMonofonto14();
      for (let i = viewScroll; i < rows && i < viewScroll + fits; i++) {
        const ry = top + (i - viewScroll) * ROW_H;
        if (i === cur) Pip.shadeBox(24, ry, 465, ry + ROW_H);
        h.setColor(od[i] ? 2 : 3)
          .setFontAlign(-1, 0)
          .drawString(
            api.fit(list[i] + (od[i] ? ' (DONE)' : ''), 410),
            34,
            ry + 14,
          );
      }
      h.setColor(2).setFontAlign(0, -1);
      if (viewScroll > 0) h.drawString('^', 455, top);
      if (viewScroll + fits < rows) h.drawString('v', 455, 232);
    }
    drawChoices(
      viewActions(),
      objOpen >= 0 ? objChoice : viewActionIdx - rows,
      256,
    );
    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawConfirm(): void {
    h.reset().clear(0);
    api.header(
      'MY JOURNAL',
      armed ? 'PRESS AGAIN TO THROW IT AWAY' : 'NEW ' + api.catLabel(catChoice),
    );
    const y = textAt(newTitleText, 441, 50, 3, 0);
    h.setColor(1).drawLine(24, y + 2, 465, y + 2);
    textAt(newBodyText || '(NO DETAILS)', 441, y + 8, 3, 0);
    drawChoices(confirmLabels(), confirmIdx, 256);
    h.flip();
    Pip.lastFlip = getTime();
  }

  // One page of controls (Signal Match style); any press goes back.
  function drawHelp(): void {
    let y = 54;
    h.reset().clear(0);
    api.header('MY JOURNAL', 'CONTROLS');
    h.setFontMonofonto14().setFontAlign(-1, 0);
    for (let i = 0; i < HELP_LINES.length; i++) {
      const head = HELP_LINES[i].indexOf(':') < 0;
      if (head && i) y += 6;
      h.setColor(head ? 3 : 2).drawString(HELP_LINES[i], 40, y);
      y += 17;
    }
    h.setColor(3).setFontAlign(0, 0).drawString('PRESS TO GO BACK', 240, 268);
    h.flip();
    Pip.lastFlip = getTime();
  }

  function draw(): void {
    if (mode === 'help') drawHelp();
    else if (mode === 'confirm') drawConfirm();
    else drawView();
  }

  // Left wheel: up and down (the note's text, or the objectives and down
  // onto the choices). Right wheel: left and right along the choices. Where
  // there is nothing to move up or down, either wheel picks a choice.
  function knob(dir: number, right: boolean): void {
    if (mode === 'help') return;
    armed = false;
    if (mode === 'confirm') {
      confirmIdx =
        (confirmIdx + dir + CONFIRM_ACTIONS.length) % CONFIRM_ACTIONS.length;
    } else if (objOpen >= 0) {
      const n = viewActions().length;
      objChoice = (objChoice + dir + n) % n;
    } else {
      const q = api.quests()[viewIdx];
      const rows = viewRows();
      const n = viewActions().length;
      if (!right && q.cat === 1 && (noteMore || noteScroll > 0)) {
        // Up on the wheel goes back up the note.
        const next = Math.max(0, noteScroll + dir);
        if (next === noteScroll || (dir > 0 && !noteMore)) return;
        noteScroll = next;
      } else if (!right && rows) {
        // The choices row sits under the last objective.
        const next = Math.min(viewActionIdx, rows) + dir;
        if (next < 0 || next > rows) return;
        viewActionIdx = next;
      } else if (viewActionIdx < rows) {
        viewActionIdx = rows;
      } else {
        viewActionIdx = rows + ((viewActionIdx - rows + dir + n) % n);
      }
    }
    Pip.playSound('SCROLL');
    draw();
  }

  function click(): void {
    if (mode === 'help') api.done(-1);
    else if (mode === 'confirm') confirmActivate();
    else viewActivate();
  }

  // Init. Nothing to open if the draft's quest has since been deleted.
  if (start === -2) mode = 'help';
  else if (start < 0) resumeDraft();
  if (viewIdx < 0 && mode === 'view') return null;

  return {
    help: mode === 'help',
    draw: draw,
    knob: knob,
    click: click,
    remove: function (): void {
      // Nothing of its own to stop: the journal owns the wheels and timers.
    },
  };
});
