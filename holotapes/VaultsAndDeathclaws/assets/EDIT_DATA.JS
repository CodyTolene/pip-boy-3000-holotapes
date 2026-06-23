// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: EDIT_DATA.JS (data builder, not a scene)
//  Description: Builds new characters, loads old saves, and adds blank entries
//  Notes:
//    new returns a new character
//    load updates and returns a saved character
//    entry returns a blank weapons, ammo, gear, or perk entry
// =============================================================================

(function (dataRequest) {
  /**
   * Build a new character with default values
   * @returns {Object} The new character
   */
  function defaults() {
    const character = {
      addictions: '', // Free text list of addictions
      ammo: [], // Each entry is [caliber, qty]
      armor: '', // Worn armor name
      caps: 0,
      carryCur: 0,
      carryMax: 0,
      charNotes: '', // Free text character notes
      combat: [0, 0, 0, 0, 0, 0], // Melee, defense, initiative, poison DR, max HP, current HP
      companions: ['', '', ''], // Up to three companion names
      diseases: '', // Free text list of diseases
      factionRep: '', // Faction reputation notes
      gear: [], // Each entry is [item, lbs]
      helmet: '', // Worn helmet name
      level: 1,
      locs: [], // Each entry is [physical, energy, radiation, HP, injured]
      luckPoints: 0,
      name: '',
      origin: '',
      perks: [], // Each entry is [name, rank, effect]
      questNotes: '', // Free text quest notes
      radCur: 0, // Current accumulated radiation
      settlementRep: '', // Settlement reputation notes
      skills: [], // Each value stores the tag and rank
      special: [5, 5, 5, 5, 5, 5, 5], // STR, PER, END, CHA, INT, AGI, LCK
      weapons: [], // Each entry uses the 12 fields below
      xpEarned: 0,
      xpNext: 0,
    };

    // Hardcoded 17 for performance
    for (let i = 0; i < 17; i++) {
      character.skills.push(0); // Start each skill at rank 0 without a tag
    }

    // Hardcoded 6 for performance
    for (let i = 0; i < 6; i++) {
      character.locs.push([0, 0, 0, 0, 0]); // Start each body location at 0
    }

    return character;
  }

  /**
   * Update an old character to the current data shape
   * @param character The saved character
   * @returns {Object} The updated character
   */
  function migrate(character) {
    if (character.addictions === undefined) {
      character.addictions = '';
    }

    if (character.ammo === undefined) {
      character.ammo = [];
    }

    if (character.armor === undefined) {
      character.armor = '';
    }

    if (character.caps === undefined) {
      character.caps = 0;
    }

    if (character.carryCur === undefined) {
      character.carryCur = 0;
    }

    if (character.carryMax === undefined) {
      character.carryMax = 0;
    }

    if (character.charNotes === undefined) {
      character.charNotes = '';
    }

    if (character.companions === undefined) {
      character.companions = ['', '', ''];
    }

    // Make sure there are always three companion slots
    while (character.companions.length < 3) {
      character.companions.push('');
    }

    if (character.diseases === undefined) {
      character.diseases = '';
    }

    if (character.factionRep === undefined) {
      character.factionRep = '';
    }

    if (character.gear === undefined) {
      character.gear = [];
    }

    if (character.helmet === undefined) {
      character.helmet = '';
    }

    if (character.level === undefined) {
      character.level = 1;
    }

    if (character.luckPoints === undefined) {
      character.luckPoints = 0;
    }

    if (character.name === undefined) {
      character.name = '';
    }

    if (character.origin === undefined) {
      character.origin = '';
    }

    if (character.perks === undefined) {
      character.perks = [];
    }

    if (character.questNotes === undefined) {
      character.questNotes = '';
    }

    if (character.radCur === undefined) {
      character.radCur = 0;
    }

    if (character.settlementRep === undefined) {
      character.settlementRep = '';
    }

    if (character.special === undefined) {
      character.special = [5, 5, 5, 5, 5, 5, 5];
    }

    if (character.weapons === undefined) {
      character.weapons = [];
    }

    if (character.xpEarned === undefined) {
      character.xpEarned = 0;
    }

    if (character.xpNext === undefined) {
      character.xpNext = 0;
    }

    // Change old combat objects into arrays
    if (!(character.combat instanceof Array)) {
      character.combat = [
        character.combat.melee || 0,
        character.combat.defense || 0,
        character.combat.initiative || 0,
        character.combat.poisonDR || 0,
        character.combat.maxHP || 0,
        character.combat.curHP || 0,
      ];
    }

    if (character.skills === undefined) {
      character.skills = [];

      // Hardcoded 17 for performance
      for (let i = 0; i < 17; i++) {
        character.skills.push(0);
      }
    } else {
      // Pack old skill objects into one value
      for (let i = 0; i < character.skills.length; i++) {
        if (typeof character.skills[i] === 'object') {
          character.skills[i] =
            (character.skills[i].rank | 0) + (character.skills[i].tag ? 8 : 0);
        }
      }
    }

    // Fill any missing skill slots
    while (character.skills.length < 17) {
      character.skills.push(0);
    }

    if (character.locs === undefined) {
      character.locs = [];

      // Hardcoded 6 for performance
      for (let i = 0; i < 6; i++) {
        character.locs.push([0, 0, 0, 0]);
      }
    }

    // Fill any missing body locations
    while (character.locs.length < 6) {
      character.locs.push([0, 0, 0, 0]);
    }

    // Change old body objects into arrays
    for (let i = 0; i < character.locs.length; i++) {
      if (!(character.locs[i] instanceof Array)) {
        character.locs[i] = [
          character.locs[i].phys || 0,
          character.locs[i].en || 0,
          character.locs[i].rad || 0,
          character.locs[i].hp || 0,
        ];
      }

      // Add the injured flag to older four field locations
      while (character.locs[i].length < 5) {
        character.locs[i].push(0);
      }
    }

    // Change old weapon objects into arrays
    for (let i = 0; i < character.weapons.length; i++) {
      if (!(character.weapons[i] instanceof Array)) {
        const v = character.weapons[i];

        character.weapons[i] = [
          v.name || '',
          v.skill || '',
          v.tn || 0,
          v.tag ? 1 : 0,
          v.damage || '',
          v.effects || '',
          v.type || '',
          v.rate || '',
          v.range || '',
          v.qualities || '',
          v.ammo || '',
          v.weight || 0,
        ];
      }
    }

    // Change old ammo objects into arrays
    for (let i = 0; i < character.ammo.length; i++) {
      if (!(character.ammo[i] instanceof Array)) {
        character.ammo[i] = [
          character.ammo[i].caliber || '',
          character.ammo[i].qty || 0,
        ];
      }
    }

    // Change old gear objects into arrays
    for (let i = 0; i < character.gear.length; i++) {
      if (!(character.gear[i] instanceof Array)) {
        character.gear[i] = [
          character.gear[i].item || '',
          character.gear[i].lbs || 0,
        ];
      }
    }

    // Change old perk objects into arrays
    for (let i = 0; i < character.perks.length; i++) {
      if (!(character.perks[i] instanceof Array)) {
        character.perks[i] = [
          character.perks[i].name || '',
          character.perks[i].rank || 0,
          character.perks[i].effect || '',
        ];
      }
    }

    return character;
  }

  // Return a blank table entry
  if (dataRequest.requestType === 'entry') {
    if (dataRequest.tableName === 'weapons') {
      // Name, skill, TN, tag, damage, effects, type, rate, range, qualities, ammo, weight
      return ['', '', 0, 0, '', '', '', '', '', '', '', 0];
    }

    if (dataRequest.tableName === 'ammo') {
      return ['', 0]; // Caliber and quantity
    }

    if (dataRequest.tableName === 'gear') {
      return ['', 0]; // Item and weight
    }

    return ['', 0, '']; // Name, rank, and effect
  }

  // Load a saved character or build a new one
  return dataRequest.storedCharacter
    ? migrate(dataRequest.storedCharacter)
    : defaults();
});
