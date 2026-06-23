// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: EDIT_TABLE.JS (form builder, not a scene)
//  Description: Builds the weapons, ammo, gear, and perks forms
//  Notes:
//    table lists entries and entry edits one item
//    Each entry uses an array to save memory
//    Returns [title, buttons, rows] for EDIT_FORM.JS
// =============================================================================

(function (context) {
  const table = context.screenDescriptor.table; // weapons, ammo, gear, or perks
  const titles = {
    ammo: 'AMMO',
    gear: 'GEAR',
    perks: 'PERKS & TRAITS',
    weapons: 'WEAPONS',
  };

  /**
   * Build a number row for a table entry
   * @param label The row label
   * @param index The entry index
   * @param field The field index
   * @param maximum The highest value
   * @returns {Array} The number row
   */
  function number(label, index, field, maximum) {
    return [2, label, [table, index, field], 0, maximum, 1];
  }

  /**
   * Build a text row for a table entry
   * @param label The row label
   * @param index The entry index
   * @param field The field index
   * @returns {Array} The text row
   */
  function text(label, index, field) {
    return [4, label, [table, index, field], 64];
  }

  // Build one entry form
  if (context.screenDescriptor.code === 'entry') {
    const i = context.screenDescriptor.index;

    let rows;

    // Field numbers match the stored array
    if (table === 'weapons') {
      rows = [
        text('NAME', i, 0),
        text('SKILL', i, 1),
        number('TN', i, 2, 99),
        [3, 'TAG', [table, i, 3]], // Type 3 is a checkbox
        text('DAMAGE', i, 4),
        text('EFFECTS', i, 5),
        text('TYPE', i, 6),
        text('RATE', i, 7),
        text('RANGE', i, 8),
        text('QUALITIES', i, 9),
        text('AMMO', i, 10),
        number('WEIGHT', i, 11, 999),
      ];
    } else if (table === 'ammo') {
      rows = [text('CALIBER', i, 0), number('QUANTITY', i, 1, 9999)];
    } else if (table === 'gear') {
      rows = [text('ITEM', i, 0), number('LBS', i, 1, 999)];
    } else {
      // Build perk fields
      rows = [
        text('NAME', i, 0),
        number('RANK', i, 1, 99),
        text('EFFECT', i, 2),
      ];
    }

    // Let the user go back or delete this entry
    return [
      titles[table] + ' ' + (i + 1),
      [
        ['< BACK', 'back'],
        ['DELETE', 'deleteEntry', table, i],
      ],
      rows,
    ];
  }

  // Build the entry list
  const entries = context.characterData[table];
  const rows = [[7, '+ ADD ENTRY', 'add', table]]; // Type 7 adds an entry

  // Add one link row for each entry
  for (let i = 0; i < entries.length; i++) {
    let label;

    if (table === 'weapons') {
      label = entries[i][0] || 'WEAPON ' + (i + 1);
    } else if (table === 'ammo') {
      // Show ammo count with its name
      label =
        (entries[i][0] || 'AMMO ' + (i + 1)) + '  x' + (entries[i][1] | 0);
    } else if (table === 'gear') {
      label = entries[i][0] || 'GEAR ' + (i + 1);
    } else {
      label = entries[i][0] || 'PERK ' + (i + 1);
    }

    rows.push([6, label, 'entry', table, i]); // Type 6 opens the entry form
  }

  return [titles[table], [['< BACK', 'back']], rows];
});
