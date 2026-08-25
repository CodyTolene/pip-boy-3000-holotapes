(function (params) {
  let active = true;

  let loadTimeout = setTimeout(function () {
    loadTimeout = 0;
    if (!active) return;
    active = false;

    try {
      Pip.CURRENT = 0;
    } catch (error) {}

    try {
      E.defrag();
      Pip.CURRENT = eval(fs.readFileSync('HOLO/BRKBNCE/MAIN.JS'))(params || 0);
    } catch (error) {
      print('BRICK BOUNCE LOAD ERROR ' + (error.message || error));
    }
  }, 30);

  return {
    id: 'BRKBNCE',
    remove: function () {
      active = false;
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        loadTimeout = 0;
      }
    },
  };
});
