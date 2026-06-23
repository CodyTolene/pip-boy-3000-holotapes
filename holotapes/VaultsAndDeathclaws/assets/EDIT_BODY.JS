// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: EDIT_BODY.JS (form builder, not a scene)
//  Description: Builds the damage resistance forms by body location
//  Notes:
//    body shows all locations and loc edits one location
//    Returns [title, buttons, rows] for EDIT_FORM.JS
// =============================================================================

(function (context) {
  // Keep body names in stored order
  const names = [
    'HEAD',
    'TORSO',
    'LEFT ARM',
    'RIGHT ARM',
    'LEFT LEG',
    'RIGHT LEG',
  ];

  // Build one body location form
  if (context.screenDescriptor.code === 'loc') {
    const i = context.screenDescriptor.index;

    // Each location stores physical, energy, radiation, HP, and injured
    return [
      names[i],
      [['< BACK', 'back']],
      [
        [2, 'PHYS DR', ['locs', i, 0], 0, 99, 1],
        [2, 'ENERGY DR', ['locs', i, 1], 0, 99, 1],
        [2, 'RAD DR', ['locs', i, 2], 0, 99, 1],
        [2, 'HP', ['locs', i, 3], 0, 999, 1],
        [3, 'INJURED', ['locs', i, 4]], // Type 3 is a checkbox
      ],
    ];
  }

  // Show the d20 range for each body location
  const ranges = ['1-2', '3-8', '9-11', '12-14', '15-17', '18-20'];
  const rows = [];

  // Add one link row for each location and flag any injuries
  // Hardcoded 6 for performance
  for (let i = 0; i < 6; i++) {
    rows.push([
      6,
      names[i] +
        ' (' +
        ranges[i] +
        ')' +
        (context.characterData.locs[i][4] ? ' *INJURED' : ''),
      'loc',
      undefined,
      i,
    ]);
  }

  return ['DAMAGE RESIST.', [['< BACK', 'back']], rows];
});
