(function (): HolotapeApp {
  const folders = ['HOLO', 'HOLO/DND', 'HOLO/DND/CHAR'];
  const root = 'HOLO/DND/';
  let scene: DndScene | null = null;
  let pending: DndFile | null = null;
  let loadTimer: number | null = null;

  function loadScene(): void {
    loadTimer = null;
    const file = pending;
    pending = null;
    if (!file) return;
    if (scene) {
      scene.remove();
      scene = null;
    }
    process.memory(true);
    E.defrag();
    scene = (eval(fs.readFileSync(root + file)) as DndSceneFactory)(app);
  }

  function go(file: DndFile): void {
    pending = file;
    if (loadTimer === null) loadTimer = setTimeout(loadScene, 0);
  }

  function frame(title: string, footer: string): void {
    h.clear(0)
      .setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, -1)
      .drawString(title, 240, 4);
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString(footer, 240, 316);
  }

  function directoryExists(path: string): boolean {
    try {
      const stat = fs.statSync(path);
      return !!stat && !!stat.dir;
    } catch (error) {
      return false;
    }
  }

  function directories(): void {
    let index = 0;
    for (index = 0; index < folders.length; index++) {
      if (directoryExists(folders[index])) continue;
      try {
        fs.mkdir(folders[index]);
      } catch (error) {
        // Ignore
      }
      if (!directoryExists(folders[index])) throw 'Cannot create folder';
    }
  }

  function numberValid(
    value: number,
    minimum: number,
    maximum: number,
  ): boolean {
    return (
      typeof value === 'number' &&
      value === Math.floor(value) &&
      value >= minimum &&
      value <= maximum
    );
  }

  function load(file: string): string {
    const stat = fs.statSync(file);
    if (!stat || stat.size > 8192) throw 'Save missing or too large';
    return fs.readFileSync(file);
  }

  function decode(text: string): DndCharacter {
    const data = JSON.parse(text) as DndDiskCharacter;
    let index = 0;
    if (
      data.version !== 1 ||
      typeof data.name !== 'string' ||
      data.name.length > 40 ||
      !numberValid(data.level, 1, 20) ||
      !numberValid(data.maxHp, 1, 9999) ||
      !numberValid(data.hp, 0, data.maxHp) ||
      !numberValid(data.tempHp, 0, 9999) ||
      !numberValid(data.ac, 0, 99) ||
      !numberValid(data.saves, 0, 63) ||
      !numberValid(data.skills, 0, 262143) ||
      !Array.isArray(data.scores) ||
      data.scores.length !== 6 ||
      typeof data.conditions !== 'string' ||
      data.conditions.length > 120 ||
      typeof data.equipment !== 'string' ||
      data.equipment.length > 240 ||
      typeof data.notes !== 'string' ||
      data.notes.length > 240
    )
      throw 'Invalid character';
    for (index = 0; index < 6; index++) {
      if (!numberValid(data.scores[index], 1, 30))
        throw 'Invalid ability score';
    }
    return {
      name: data.name,
      level: data.level,
      hp: data.hp,
      maxHp: data.maxHp,
      tempHp: data.tempHp,
      ac: data.ac,
      saves: data.saves,
      skills: data.skills,
      conditions: data.conditions,
      equipment: data.equipment,
      notes: data.notes,
      scores: new Uint8Array(data.scores),
    };
  }

  function read(slot: number): DndCharacter {
    return decode(
      load(root + 'CHAR/' + (slot < 10 ? '0' : '') + slot + '.JSON'),
    );
  }

  function compare(first: DndListEntry, second: DndListEntry): number {
    return first.slot - second.slot;
  }

  function list(): DndListEntry[] {
    const entries: DndListEntry[] = [];
    let files: string[] = [];
    let index = 0;
    let slot = 0;
    let name = '';
    try {
      directories();
      files = fs.readdir(root + 'CHAR');
    } catch (error) {
      app.message = 'SD card unavailable. Check card and reopen.';
    }
    for (index = 0; index < files.length; index++) {
      if (!/\.json$/i.test(files[index])) continue;
      slot = parseInt(files[index], 10);
      if (slot < 1 || slot > 99) continue;
      try {
        name = read(slot).name || '<empty>';
      } catch (error) {
        name = 'UNREADABLE SLOT ' + slot;
      }
      entries.push({ slot: slot, name: name });
    }
    app.message = '';
    return entries.sort(compare);
  }

  function create(): boolean {
    let slot = 1;
    try {
      directories();
      while (
        slot <= 99 &&
        fs.statSync(root + 'CHAR/' + (slot < 10 ? '0' : '') + slot + '.JSON')
      )
        slot++;
      if (slot > 99) throw 'No free character slots';
      app.slot = slot;
      app.character = {
        name: '',
        level: 1,
        hp: 1,
        maxHp: 1,
        tempHp: 0,
        ac: 10,
        scores: new Uint8Array([10, 10, 10, 10, 10, 10]),
        saves: 0,
        skills: 0,
        conditions: '',
        equipment: '',
        notes: '',
      };
      app.dirty = true;
      app.page = 0;
      app.row = 2;
      app.message = '';
      return true;
    } catch (error) {
      app.message = 'Cannot create character. Check SD card or slots.';
      return false;
    }
  }

  function open(slot: number): boolean {
    try {
      app.character = read(slot);
      app.slot = slot;
      app.dirty = false;
      app.page = 0;
      app.row = 2;
      app.message = '';
      return true;
    } catch (error) {
      app.message = 'Cannot read this save. It has not been changed.';
      return false;
    }
  }

  function save(): boolean {
    const character = app.character!;
    const data: DndDiskCharacter = {
      version: 1,
      name: character.name,
      level: character.level,
      hp: character.hp,
      maxHp: character.maxHp,
      tempHp: character.tempHp,
      ac: character.ac,
      scores: [
        character.scores[0],
        character.scores[1],
        character.scores[2],
        character.scores[3],
        character.scores[4],
        character.scores[5],
      ],
      saves: character.saves,
      skills: character.skills,
      conditions: character.conditions,
      equipment: character.equipment,
      notes: character.notes,
    };
    try {
      directories();
      fs.writeFileSync(
        root + 'CHAR/' + (app.slot < 10 ? '0' : '') + app.slot + '.JSON',
        JSON.stringify(data),
      );
      app.dirty = false;
      app.message = '';
      return true;
    } catch (error) {
      app.message = 'Save failed. Edits kept; check SD card and retry.';
      return false;
    }
  }

  function erase(): boolean {
    const path =
      root + 'CHAR/' + (app.slot < 10 ? '0' : '') + app.slot + '.JSON';
    try {
      if (fs.statSync(path) && !fs.unlink(path)) throw 'Cannot delete save';
      app.character = null;
      app.dirty = false;
      app.message = '';
      return true;
    } catch (error) {
      app.message = 'Delete failed. Check SD card and retry.';
      return false;
    }
  }
  function remove(): void {
    if (loadTimer !== null) clearTimeout(loadTimer);
    loadTimer = null;
    pending = null;
    if (scene) {
      scene.remove();
      scene = null;
    }
    app.character = null;
    app.dice = null;
    Pip.audioStop();
    h.clear();
  }

  const app: DndApp = {
    character: null,
    slot: 0,
    dirty: false,
    page: 0,
    row: 2,
    editField: 'name',
    confirm: 'delete',
    listRow: 0,
    message: '',
    dice: null,
    go: go,
    frame: frame,
    list: list,
    create: create,
    open: open,
    save: save,
    erase: erase,
  };
  go('LIST.JS');
  return {
    id: 'dnd',
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
