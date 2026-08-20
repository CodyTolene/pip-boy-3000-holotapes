// =============================================================================
//  Name: Vault-Tec Timer
//  Authors: @trekker87, @Theeohn
//  License: MIT
//  Repository: https://github.com/Theeohn/Vault-Tec-Timer-3000a
// =============================================================================

(function () {
  let screen;

  function goTo(file) {
    if (screen && screen.remove) screen.remove();
    screen = null;
    h.reset();
    try {
      screen = eval(require('fs').readFileSync(file))(goTo);
    } catch (e) {
      Pip.log('VAULTTIMER failed to load ' + file + ': ' + e);
      if (file !== 'HOLO/VAULT_TEC_TIMER/TITLE.JS') {
        screen = eval(require('fs').readFileSync('HOLO/VAULT_TEC_TIMER/TITLE.JS'))(goTo);
      }
    }
  }

  goTo('HOLO/VAULT_TEC_TIMER/TITLE.JS');

  return {
    id: 'VAULTTIMER',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      if (screen && screen.remove) screen.remove();
    },
  };
});