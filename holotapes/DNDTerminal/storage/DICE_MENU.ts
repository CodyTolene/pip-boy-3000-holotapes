(function (app: DndApp): DndScene {
  const character = app.character;
  const C = {
    abilities: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
    kinds: ['ABILITY CHECK', 'SAVING THROW', 'SKILL CHECK', 'ATTACK ROLL'],
    modes: ['DISADVANTAGE', 'NORMAL', 'ADVANTAGE'],
    skills: [
      'ACROBATICS',
      'ANIMAL HANDLING',
      'ARCANA',
      'ATHLETICS',
      'DECEPTION',
      'HISTORY',
      'INSIGHT',
      'INTIMIDATION',
      'INVESTIGATION',
      'MEDICINE',
      'NATURE',
      'PERCEPTION',
      'PERFORMANCE',
      'PERSUASION',
      'RELIGION',
      'SLEIGHT OF HAND',
      'STEALTH',
      'SURVIVAL',
    ],
    skillAbility: new Uint8Array([
      1, 4, 3, 0, 5, 3, 4, 5, 3, 4, 3, 4, 5, 5, 3, 1, 1, 4,
    ]),
  };
  let selected = 1;
  let selectedButton = 1;

  function state(): DndDice {
    return {
      mode: 0,
      kind: 0,
      index: 0,
      proficient: 1,
      advantage: 0,
      bonus: 0,
      dc: 0,
      faces: new Uint8Array([4, 6, 8, 10, 12, 20, 100]),
      die: 1,
      count: 1,
      damageBonus: 0,
      crit: 0,
      modifier: 0,
      label: '',
      values: new Uint8Array(20),
      rolled: 0,
      natural: 0,
      total: 0,
      outcome: '',
      ready: false,
      origin: character ? 1 : 0,
    };
  }

  function rows(): number[] {
    const dice = app.dice!;
    if (dice.mode) return [0, 7, 8, 9, 10];
    return dice.kind === 3 ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 4, 5, 6];
  }

  function signed(value: number): string {
    return (value >= 0 ? '+' : '') + value;
  }

  function modifier(ability: number): number {
    return Math.floor((character!.scores[ability] - 10) / 2);
  }

  function proficiency(): number {
    return 2 + Math.floor((character!.level - 1) / 4);
  }

  function derived(): number {
    const dice = app.dice!;
    if (!character) return 0;
    if (dice.kind === 1)
      return (
        modifier(dice.index) +
        ((character!.saves >> dice.index) & 1) * proficiency()
      );
    if (dice.kind === 2)
      return (
        modifier(C.skillAbility[dice.index]) +
        ((character!.skills >> dice.index) & 1) * proficiency()
      );
    return (
      modifier(dice.index) +
      (dice.kind === 3 ? dice.proficient * proficiency() : 0)
    );
  }

  function source(): string {
    const dice = app.dice!;
    return dice.kind === 2 ? C.skills[dice.index] : C.abilities[dice.index];
  }

  function label(code: number): string {
    const dice = app.dice!;
    if (code === 0) return 'ROLL TYPE';
    if (code === 1) return 'D20 ROLL';
    if (code === 2) return dice.kind === 2 ? 'SKILL' : 'ABILITY';
    if (code === 3) return 'PROFICIENT';
    if (code === 4) return 'ROLL MODE';
    if (code === 5) return 'EXTRA BONUS';
    if (code === 6) return dice.kind === 3 ? 'TARGET AC' : 'DC';
    if (code === 7) return 'DAMAGE DIE';
    if (code === 8) return 'DICE';
    return code === 9 ? 'DAMAGE BONUS' : 'CRITICAL HIT';
  }

  function value(code: number): string {
    const dice = app.dice!;
    if (code === 0) return dice.mode ? 'DAMAGE' : 'D20';
    if (code === 1) return C.kinds[dice.kind];
    if (code === 2) return source() + ' ' + signed(derived());
    if (code === 3) return dice.proficient ? 'YES' : 'NO';
    if (code === 4) return C.modes[dice.advantage + 1];
    if (code === 5) return signed(dice.bonus);
    if (code === 6) return '' + (dice.dc || 'OFF');
    if (code === 7) return 'D' + dice.faces[dice.die];
    if (code === 8) return '' + dice.count;
    if (code === 9) return signed(dice.damageBonus);
    return dice.crit ? 'YES (DICE X2)' : 'NO';
  }

  function adjust(code: number, direction: number): void {
    const dice = app.dice!;
    if (code === 0) dice.mode ^= 1;
    else if (code === 1) {
      dice.kind = (dice.kind + direction + 4) % 4;
      dice.index = E.clip(dice.index, 0, dice.kind === 2 ? 17 : 5);
    } else if (code === 2) {
      const total = dice.kind === 2 ? 18 : 6;
      dice.index = (dice.index + direction + total) % total;
    } else if (code === 3) dice.proficient ^= 1;
    else if (code === 4)
      dice.advantage = E.clip(dice.advantage + direction, -1, 1);
    else if (code === 5) dice.bonus = E.clip(dice.bonus + direction, -20, 20);
    else if (code === 6) dice.dc = E.clip(dice.dc + direction, 0, 40);
    else if (code === 7) dice.die = E.clip(dice.die + direction, 0, 6);
    else if (code === 8) dice.count = E.clip(dice.count + direction, 1, 10);
    else if (code === 9)
      dice.damageBonus = E.clip(dice.damageBonus + direction, -20, 20);
    else dice.crit ^= 1;
    selected = E.clip(selected, 0, rows().length + 1);
    dice.ready = false;
  }

  function prepare(): void {
    const dice = app.dice!;
    if (dice.mode) {
      dice.modifier = dice.damageBonus;
      dice.label =
        (dice.crit ? dice.count * 2 : dice.count) +
        'D' +
        dice.faces[dice.die] +
        (dice.damageBonus ? signed(dice.damageBonus) : '') +
        (dice.crit ? ' CRIT' : '');
    } else {
      dice.modifier = derived() + dice.bonus;
      dice.label =
        source() +
        ' ' +
        signed(dice.modifier) +
        (dice.advantage ? (dice.advantage > 0 ? ' ADV' : ' DIS') : '');
    }
  }

  function draw(): void {
    const dice = app.dice!;
    const list = rows();
    let button = 0;
    let row = 0;
    let top = 0;
    app.frame('DICE ROLLER', 'L-MOVE/SELECT    R-ADJUST/SWITCH');
    for (button = 0; button < 2; button++) {
      h.setColor(selected === button ? 3 : 2);
      if (selected === button)
        h.fillRect(12 + button * 232, 31, 236 + button * 232, 58);
      else h.drawRect(12 + button * 232, 31, 236 + button * 232, 58);
      h.setColor(selected === button ? 0 : 3)
        .setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString(
          button ? 'ROLL' : dice.origin ? '< BACK TO SHEET' : '< BACK TO LIST',
          124 + button * 232,
          44,
        );
    }
    for (row = 0; row < list.length; row++) {
      top = 66 + row * 26;
      if (selected === row + 2) Pip.shadeBox(8, top, 472, top + 24);
      h.setColor(selected === row + 2 ? 3 : 2)
        .setFontMonofonto16()
        .setFontAlign(-1, -1)
        .drawString(label(list[row]), 16, top + 4)
        .setFontAlign(1, -1)
        .drawString(value(list[row]), 464, top + 4);
    }
    h.setColor(dice.ready ? 3 : 2)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString(
        dice.ready
          ? 'LAST ' + dice.total + (dice.outcome ? '  ' + dice.outcome : '')
          : character
            ? character.name.slice(0, 32)
            : 'NO CHARACTER: EXTRA BONUS ONLY',
        240,
        256,
      );
  }

  function onLeft(direction: KnobDirection): void {
    const total = rows().length;
    if (direction) {
      if (direction > 0) {
        if (selected < 2) {
          selectedButton = selected;
          selected = 2;
        } else selected = E.clip(selected + 1, 2, total + 1);
      } else if (selected === 2) selected = selectedButton;
      else if (selected > 2) selected--;
      Pip.playSound('SCROLL');
      draw();
    } else if (selected === 0) {
      const origin = app.dice!.origin;
      app.dice = null;
      app.go(origin ? 'SHEET.JS' : 'LIST.JS');
    } else if (selected === 1) {
      prepare();
      app.go('DICE_ROLL.JS');
    }
  }

  function onRight(direction: KnobDirection): void {
    if (!direction) return;
    if (selected < 2) {
      selected = E.clip(selected + direction, 0, 1);
      selectedButton = selected;
    } else adjust(rows()[selected - 2], direction);
    Pip.playSound('SCROLL');
    draw();
  }

  function remove(): void {
    Pip.removeListener('knob1', onLeft);
    Pip.removeListener('knob2', onRight);
  }

  if (!app.dice) app.dice = state();
  Pip.onExclusive('knob1', onLeft);
  Pip.onExclusive('knob2', onRight);
  draw();
  return { remove: remove };
});
