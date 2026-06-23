// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: EDIT_SKILL.JS (form builder, not a scene)
//  Description: Builds the skills form
//  Notes:
//    Skill values store the tag in bit 3 and the rank in bits 0 through 2
//    Returns [title, buttons, rows] for EDIT_FORM.JS
// =============================================================================

(function () {
  // Keep skill names in stored order
  const names = [
    'ATHLETICS (STR)',
    'BARTER (CHA)',
    'BIG GUNS (END)',
    'ENERGY WEAPONS (PER)',
    'EXPLOSIVES (PER)',
    'LOCKPICK (PER)',
    'MEDICINE (INT)',
    'MELEE WEAPONS (STR)',
    'PILOT (PER)',
    'REPAIR (INT)',
    'SCIENCE (INT)',
    'SMALL GUNS (AGI)',
    'SNEAK (AGI)',
    'SPEECH (CHA)',
    'SURVIVAL (END)',
    'THROWING (AGI)',
    'UNARMED (STR)',
  ];
  const rows = [];

  // Hardcoded 17 for performance
  for (let i = 0; i < 17; i++) {
    rows.push([5, names[i], ['skills', i]]);
  }

  return ['SKILLS', [['< BACK', 'back']], rows];
});
