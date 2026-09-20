(function (params?: BrickBounceParams | 0): HolotapeApp {
  let active = true;

  let loadTimeout: number = setTimeout(function (): void {
    loadTimeout = 0;
    if (!active) return;
    active = false;

    try {
      Pip.CURRENT = 0;
    } catch (error) {}

    try {
      E.defrag();
      Pip.CURRENT = (
        eval(fs.readFileSync('HOLO/BRKBNCE/MAIN.JS')) as BrickBounceFactory
      )(params || 0);
    } catch (error) {
      print(
        'BRICK BOUNCE LOAD ERROR ' +
          ((error as Error).message || (error as Error)),
      );
    }
  }, 30);

  return {
    id: 'BRKBNCE',
    remove: function (): void {
      active = false;
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        loadTimeout = 0;
      }
    },
  };
});
