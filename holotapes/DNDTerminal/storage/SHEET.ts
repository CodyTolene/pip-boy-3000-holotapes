(function (app: DndApp): DndScene {
  const character = app.character!;
  const C = {
    sections: ['BASICS', 'ABILITIES', 'SAVES', 'SKILLS', 'TEXT'],
    // Fields per section.
    // Each section has one header line before the fields.
    sizes: new Uint8Array([7, 6, 6, 18, 3]),
    lines: 45,
    visible: 7,
    abilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
    basics: [
      'NAME',
      'LEVEL',
      'CURRENT HP',
      'MAXIMUM HP',
      'TEMPORARY HP',
      'ARMOR CLASS',
      'PROFICIENCY',
    ],
    skills: [
      'Acrobatics',
      'Animal Handling',
      'Arcana',
      'Athletics',
      'Deception',
      'History',
      'Insight',
      'Intimidation',
      'Investigation',
      'Medicine',
      'Nature',
      'Perception',
      'Performance',
      'Persuasion',
      'Religion',
      'Sleight of Hand',
      'Stealth',
      'Survival',
    ],
    skillAbility: new Uint8Array([
      1, 4, 3, 0, 5, 3, 4, 5, 3, 4, 3, 4, 5, 5, 3, 1, 1, 4,
    ]),
  };
  /**
   * app.row:
   *   0 < BACK
   *   1 SAVE & CLOSE
   *   2+ list line (app.row - 2).
   *
   * app.page:
   *   For returning to same view..
   */
  let section = 0;
  let index = 0;

  // Index -1 = section header.
  function locate(line: number): void {
    section = 0;
    while (section < 4 && line > C.sizes[section]) {
      line -= C.sizes[section] + 1;
      section++;
    }
    index = line - 1;
  }

  function signed(value: number): string {
    return (value >= 0 ? '+' : '') + value;
  }

  function modifier(ability: number): number {
    return Math.floor((character.scores[ability] - 10) / 2);
  }

  function proficiency(): number {
    return 2 + Math.floor((character.level - 1) / 4);
  }

  function field(): DndTextField {
    return section === 0
      ? 'name'
      : index === 0
        ? 'conditions'
        : index === 1
          ? 'equipment'
          : 'notes';
  }

  function label(): string {
    return section === 0
      ? C.basics[index]
      : section < 3
        ? C.abilities[index]
        : section === 3
          ? C.skills[index]
          : field().toUpperCase();
  }

  function value(): string {
    let trained = 0;
    if (section === 0) {
      if (index === 0) return character.name.slice(0, 23) || '<empty>';
      if (index === 1) return '' + character.level;
      if (index === 2) return '' + character.hp;
      if (index === 3) return '' + character.maxHp;
      if (index === 4) return '' + character.tempHp;
      return index === 5
        ? '' + character.ac
        : signed(proficiency()) + ' (LEVEL)';
    }
    if (section === 1)
      return character.scores[index] + ' (' + signed(modifier(index)) + ')';
    if (section === 2 || section === 3) {
      trained =
        ((section === 2 ? character.saves : character.skills) >> index) & 1;
      return (
        (trained ? '[X] ' : '[ ] ') +
        signed(
          modifier(section === 2 ? index : C.skillAbility[index]) +
            trained * proficiency(),
        )
      );
    }
    return character[field()].slice(0, 24) || '(empty)';
  }

  function clampScroll(): void {
    const line = app.row - 2;
    let first = line;
    if (app.row < 2) return;
    locate(line - 1);
    if (index < 0) first = line - 1;
    if (first < app.page) app.page = first;
    if (line > app.page + C.visible - 1) app.page = line - C.visible + 1;
    app.page = E.clip(app.page, 0, C.lines - C.visible);
  }

  function draw(): void {
    let button = 0;
    let row = 0;
    let line = 0;
    let top = 0;
    let width = 0;
    let title = 'CHARACTER SHEET';
    if (app.row >= 2) {
      locate(app.row - 2);
      title = C.sections[section];
    }
    app.frame(
      title + (app.dirty ? ' *' : ''),
      'L-MOVE  L-PRESS SELECT  L-HOLD DICE  R-ADJUST',
    );
    for (button = 0; button < 2; button++) {
      h.setColor(app.row === button ? 3 : 2);
      if (app.row === button)
        h.fillRect(12 + button * 232, 31, 236 + button * 232, 58);
      else h.drawRect(12 + button * 232, 31, 236 + button * 232, 58);
      h.setColor(app.row === button ? 0 : 3)
        .setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString(button ? 'SAVE & CLOSE' : '< BACK', 124 + button * 232, 44);
    }
    for (row = 0; row < C.visible && app.page + row < C.lines; row++) {
      line = app.page + row;
      top = 69 + row * 28;
      locate(line);
      if (index < 0) {
        h.setColor(1).setFontMonofonto16().setFontAlign(0, 0);
        width = h.stringWidth(C.sections[section]) / 2 + 8;
        h.drawString(C.sections[section], 240, top + 13)
          .drawLine(16, top + 13, 240 - width, top + 13)
          .drawLine(240 + width, top + 13, 464, top + 13);
        continue;
      }
      if (app.row === line + 2) Pip.shadeBox(8, top, 472, top + 26);
      h.setColor(app.row === line + 2 ? 3 : 2)
        .setFontMonofonto16()
        .setFontAlign(-1, -1)
        .drawString(label(), 16, top + 5)
        .setFontAlign(1, -1)
        .drawString(value(), 464, top + 5);
    }
    h.setColor(2)
      .setFontMonofonto14()
      .setFontAlign(0, -1)
      .drawString(
        app.message || character.name.slice(0, 32) || '<empty>',
        240,
        278,
      );
  }

  function adjust(direction: number): void {
    locate(app.row - 2);
    if (section === 0) {
      if (index === 1)
        character.level = E.clip(character.level + direction, 1, 20);
      else if (index === 2)
        character.hp = E.clip(character.hp + direction, 0, character.maxHp);
      else if (index === 3) {
        character.maxHp = E.clip(character.maxHp + direction, 1, 9999);
        character.hp = Math.min(character.hp, character.maxHp);
      } else if (index === 4)
        character.tempHp = E.clip(character.tempHp + direction, 0, 9999);
      else if (index === 5)
        character.ac = E.clip(character.ac + direction, 0, 99);
      else return;
    } else if (section === 1)
      character.scores[index] = E.clip(
        character.scores[index] + direction,
        1,
        30,
      );
    else if (section === 2) character.saves ^= 1 << index;
    else if (section === 3) character.skills ^= 1 << index;
    else return;
    app.dirty = true;
    app.message = '';
  }

  function move(direction: number): void {
    const delta = direction > 0 ? 1 : -1;
    let steps = Math.abs(direction);
    let next = 0;
    while (steps--) {
      next = app.row + delta;
      if (next >= 2) {
        locate(next - 2);
        if (index < 0) next += delta;
      }
      if (next < 0 || next > C.lines + 1) break;
      app.row = next;
    }
    clampScroll();
  }

  function onLeft(direction: KnobDirection, long?: boolean): void {
    if (!direction && long) {
      app.go('DICE_MENU.JS');
      return;
    }
    if (direction) move(direction);
    else if (app.row === 0) {
      if (app.dirty) {
        app.confirm = 'discard';
        app.go('CONFIRM.JS');
      } else app.go('LIST.JS');
      return;
    } else if (app.row === 1) {
      if (app.save()) app.go('LIST.JS');
      else draw();
      return;
    } else {
      locate(app.row - 2);
      if (section === 4 || (section === 0 && index === 0)) {
        app.editField = field();
        app.go(section === 4 ? 'TEXT.JS' : 'KEYBOARD.JS');
        return;
      }
      if (section === 2 || section === 3) adjust(1);
    }
    draw();
  }

  function onRight(direction: KnobDirection): void {
    if (!direction) return;
    if (app.row < 2) app.row = E.clip(app.row + direction, 0, 1);
    else adjust(direction);
    draw();
  }

  function remove(): void {
    Pip.removeListener('knob1', onLeft);
    Pip.removeListener('knob2', onRight);
  }

  app.row = E.clip(app.row, 0, C.lines + 1);
  if (app.row >= 2) {
    locate(app.row - 2);
    if (index < 0) app.row++;
  }
  clampScroll();
  Pip.onExclusive('knob1', onLeft);
  Pip.onExclusive('knob2', onRight);
  draw();
  return { remove: remove };
});
