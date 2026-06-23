// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: DICE.JS (scene)
//  Description: Sets up the shared dice state and opens the dice menu
//  Notes:
//    app.diceState[0] = mode  0 is Fallout, 1 is combat, 2 is generic
//    app.diceState[1] = Fallout dice count
//    app.diceState[2] = combat dice count
//    app.diceState[3] = generic dice count
//    app.diceState[4] = die type  d2, d4, d6, d8, d10, d12, d20, or d100
//    app.diceState[5] = target number
//    app.diceState[6] = critical range
//    app.diceState[7] = main result
//    app.diceState[8] = second result
//    app.diceState[9] = result ready flag
// =============================================================================

(function (app) {
  // Defer setup by one tick
  let loadTimeout = setTimeout(function () {
    loadTimeout = null;

    try {
      process.memory(true);
      E.defrag();
    } catch (error) {}
    // Start with generic mode, 2 dice, d6, target 12, and critical 1
    app.diceState = [2, 2, 2, 2, 6, 12, 1, 0, 0, 0];
    app.go(app.scenes.DICE_MENU);
  }, 0);

  return {
    remove: function () {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    },
  };
});
