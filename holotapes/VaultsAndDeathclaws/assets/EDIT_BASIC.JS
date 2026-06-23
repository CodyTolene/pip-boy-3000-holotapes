// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: EDIT_BASIC.JS (form builder, not a scene)
//  Description: Builds the profile, stats, combat, caps, and carry forms
//  Notes: Returns [title, buttons, rows] for EDIT_FORM.JS
// =============================================================================

(function (context) {
  /**
   * Build a number row
   * @param label The row label
   * @param path The path to the value
   * @param minimum The lowest value
   * @param maximum The highest value
   * @param step The amount to change
   * @returns {Array} The number row
   */
  function number(label, path, minimum, maximum, step) {
    return [2, label, path, minimum, maximum, step];
  }

  /**
   * Build a text row
   * @param label The row label
   * @param path The path to the value
   * @param maximumLength The text limit
   * @returns {Array} The text row
   */
  function text(label, path, maximumLength) {
    return [4, label, path, maximumLength || 64];
  }

  if (context.screenDescriptor.code === 'profile') {
    return [
      'PROFILE',
      [['< BACK', 'back']],
      [
        text('NAME', ['name'], 20),
        text('ORIGIN', ['origin']),
        number('LEVEL', ['level'], 1, 99, 1),
        number('XP EARNED', ['xpEarned'], 0, 99999, 5),
        number('XP TO NEXT', ['xpNext'], 0, 99999, 5),
      ],
    ];
  }

  if (context.screenDescriptor.code === 'special') {
    // Keep the stat names in stored order
    const names = [
      'STRENGTH',
      'PERCEPTION',
      'ENDURANCE',
      'CHARISMA',
      'INTELLIGENCE',
      'AGILITY',
      'LUCK',
    ];
    const rows = [];

    // Hardcoded 7 for performance
    for (let i = 0; i < 7; i++) {
      rows.push(number(names[i], ['special', i], 1, 10, 1));
    }

    rows.push(number('LUCK POINTS', ['luckPoints'], 0, 10, 1));

    return ['S.P.E.C.I.A.L.', [['< BACK', 'back']], rows];
  }

  if (context.screenDescriptor.code === 'combat') {
    // Combat values use a fixed six item array
    return [
      'COMBAT',
      [['< BACK', 'back']],
      [
        number('MELEE DAMAGE', ['combat', 0], 0, 99, 1),
        number('DEFENSE', ['combat', 1], 0, 99, 1),
        number('INITIATIVE', ['combat', 2], 0, 99, 1),
        number('POISON DR', ['combat', 3], 0, 99, 1),
        number('MAX HP', ['combat', 4], 0, 999, 1),
        number('CURRENT HP', ['combat', 5], 0, 999, 1),
        number('CURRENT RAD', ['radCur'], 0, 999, 1),
      ],
    ];
  }

  if (context.screenDescriptor.code === 'equip') {
    // Weapons, ammo, and consumables live in their own tables
    return [
      'EQUIPMENT',
      [['< BACK', 'back']],
      [text('ARMOR', ['armor']), text('HELMET', ['helmet'])],
    ];
  }

  if (context.screenDescriptor.code === 'conditions') {
    return [
      'CONDITIONS',
      [['< BACK', 'back']],
      [text('ADDICTIONS', ['addictions']), text('DISEASES', ['diseases'])],
    ];
  }

  if (context.screenDescriptor.code === 'companions') {
    return [
      'COMPANIONS',
      [['< BACK', 'back']],
      [
        text('COMPANION 1', ['companions', 0]),
        text('COMPANION 2', ['companions', 1]),
        text('COMPANION 3', ['companions', 2]),
      ],
    ];
  }

  if (context.screenDescriptor.code === 'notes') {
    return [
      'NOTES',
      [['< BACK', 'back']],
      [
        text('FACTION REP', ['factionRep']),
        text('SETTLEMENT REP', ['settlementRep']),
        text('QUEST NOTES', ['questNotes']),
        text('CHARACTER NOTES', ['charNotes']),
      ],
    ];
  }

  // The last form is caps and carry weight
  return [
    'CAPS & CARRY',
    [['< BACK', 'back']],
    [
      number('CAPS', ['caps'], 0, 99999, 5),
      number('CURRENT CARRY', ['carryCur'], 0, 999, 1),
      number('MAX CARRY', ['carryMax'], 0, 999, 1),
    ],
  ];
});
