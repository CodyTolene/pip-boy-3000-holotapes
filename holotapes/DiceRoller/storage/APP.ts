(function (): HolotapeApp {
  let scene: DiceRollerScene | null = null;
  let pending: DiceRollerFile | null = null;
  let loadTimer: number | null = null;

  function loadScene(): void {
    loadTimer = null;
    const file = pending;
    pending = null;
    if (!file) {
      return;
    }
    if (scene) {
      scene.remove();
      scene = null;
    }
    process.memory(true);
    E.defrag();
    scene = (
      eval(
        fs.readFileSync('HOLO/DICE_ROLLER/' + file),
      ) as DiceRollerSceneFactory
    )(app);
  }

  function go(file: DiceRollerFile): void {
    pending = file;
    if (loadTimer === null) {
      loadTimer = setTimeout(loadScene, 0);
    }
  }

  function remove(): void {
    if (loadTimer !== null) {
      clearTimeout(loadTimer);
      loadTimer = null;
    }
    pending = null;
    if (scene) {
      scene.remove();
      scene = null;
    }
    Pip.audioStop();
    h.clear();
  }

  const app: DiceRollerApp = {
    W: h.getWidth(),
    H: h.getHeight(),
    faces: new Uint8Array([2, 4, 6, 8, 10, 12, 20, 100]),
    type: 2,
    count: 2,
    modifier: 0,
    target: 0,
    critical: 0,
    values: new Uint8Array(10),
    total: 0,
    criticals: 0,
    ready: false,
    go: go,
  };
  go('DICE_MENU.JS');

  return {
    id: 'DICEROLLER',
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
