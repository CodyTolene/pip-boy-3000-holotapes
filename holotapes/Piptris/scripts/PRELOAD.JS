// =============================================================================
//  Name: Piptris
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app) {
  Pip.lastFlip = getTime();

  const file = E.openFile('HOLO/PIPTRIS/GAME.RAW', 'r');
  Pip.blitFile(h, file, {
    width: app.W,
    height: app.H,
    dstx: 0,
    dsty: 0,
    x: 0,
    y: 0,
    srcWidth: app.W,
    srcHeight: app.H,
  });
  file.close();

  h.flip();
  app.go(app.scenes.GAME);

  return { remove: () => {} };
});
