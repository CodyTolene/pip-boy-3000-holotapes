// Lockpick's record in STATS > GENERAL.
//
// Installs as HOLO/LOCKPICK/STATS_HOOK.JS. Lockpick runs it when it opens, and it
// registers itself so a shared boot slot runs it again after a full restart
// (see register below).
//
// STATS > GENERAL reads its rows through the firmware global
// loadJSONWithDefaults('SETTINGS/GENERAL.JSON', ...). The first Radiomaru
// holotape to load wraps that global once and keeps a table of row functions
// in global.RM_STATS; each game adds its own, so every installed game gets its
// rows and none are added twice. Roach Stomp's score patch wraps the same
// global, and both sets of rows show.
//
// The row is read from the game's save file each time the screen opens.
// Plain functions only, so older Espruino builds can parse it.
(function () {
  // Status for the RM Check holotape.
  const status = (global.RM_PATCH = global.RM_PATCH || {}) as Record<
    string,
    string
  >;
  // Keeps this hook working after a full restart. The hook's path goes in
  // USER/RADIOMARU_BOOT.JSON, and one boot slot shared by every Radiomaru
  // holotape runs the files listed there at startup. Like the Character
  // Switcher, it only uses .boot1-.boot3 (.boot0 belongs to the Fallout
  // companion app) and only writes when something is missing.
  function register(path: string): void {
    const LIST = 'USER/RADIOMARU_BOOT.JSON';
    const MARK = '"RM_HOLO_HOOKS";';
    const SLOTS = ['.boot1', '.boot2', '.boot3'];
    const LOADER =
      MARK +
      'setTimeout(function(){var fs=require("fs"),l;' +
      'try{l=JSON.parse(fs.readFileSync("' +
      LIST +
      '"));}catch(e){return;}' +
      'if(!Array.isArray(l))return;' +
      'l.forEach(function(p){try{eval(fs.readFileSync(p));}' +
      'catch(e){print("RM_HOLO_HOOKS "+p+": "+e);}});},0);';
    let list: string[] = [];
    try {
      list = JSON.parse(fs.readFileSync(LIST)) as string[];
    } catch (e) {
      list = [];
    }
    if (!Array.isArray(list)) list = [];
    if (list.indexOf(path) < 0) {
      list.push(path);
      fs.writeFileSync(LIST, JSON.stringify(list));
    }
    const st = require('Storage');
    let free = '';
    for (let i = 0; i < SLOTS.length; i++) {
      const s = st.read(SLOTS[i]);
      if (s === undefined) {
        if (!free) free = SLOTS[i];
      } else if (String(s).indexOf(MARK) === 0) {
        if (String(s) !== LOADER) st.write(SLOTS[i], LOADER);
        return;
      }
    }
    if (free) st.write(free, LOADER);
    status.boot = free ? 'slot ' + free : 'no free boot slot';
  }

  register('HOLO/LOCKPICK/STATS_HOOK.JS');
  if (typeof loadJSONWithDefaults !== 'function') return;
  if (!global.RM_STATS) {
    global.RM_STATS = {};
    const orig = loadJSONWithDefaults;
    global.loadJSONWithDefaults = function (
      file: string,
      defaults: Record<string, PipValue>,
    ): Record<string, PipValue> {
      const o = orig(file, defaults);
      if (file !== 'SETTINGS/GENERAL.JSON') return o;
      const rows = global.RM_STATS as Record<string, StatsRowFn>;
      for (const k in rows) {
        try {
          rows[k](o);
        } catch (e) {
          // One game's save can't break the screen.
        }
      }
      return o;
    };
  }
  (global.RM_STATS as Record<string, StatsRowFn>).lockpick = function (
    o: Record<string, PipValue>,
  ): void {
    let s: StatsSave = {};
    try {
      s = JSON.parse(fs.readFileSync('HOLO/LOCKPICK/SAVE.JSON')) as StatsSave;
    } catch (e) {
      return;
    }
    if (!s) return;
    if (s.b) o['Lockpick Best Run'] = s.b;
  };
  status.lockpick = 'ok';
})();
