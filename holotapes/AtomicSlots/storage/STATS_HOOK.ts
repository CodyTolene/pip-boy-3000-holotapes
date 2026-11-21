// Atomic Slots's record in STATS > GENERAL.
//
// Installs as HOLO/ATOMIC_SLOTS/STATS_HOOK.JS. Atomic Slots runs it when it opens, and it
// registers itself so a shared boot slot runs it again after a full restart
// (see register below).
//
// STATS > GENERAL reads its rows through the firmware global
// loadJSONWithDefaults('SETTINGS/GENERAL.JSON', ...). The first Radiomaru
// holotape to load wraps that global once. The wrapper keeps nothing about
// the games in memory: each time GENERAL opens, it runs every STATS hook
// listed in USER/RADIOMARU_BOOT.JSON again in row mode (global.RM_ROW set),
// and each one adds its rows from its own save file and stops. So the games'
// rows cost memory only while the screen opens, not all the time the
// Pip-Boy is on. Roach Stomp's score patch wraps the same global, and both
// sets of rows show.
// Plain functions only, so older Espruino builds can parse it.
(function () {
  // Row mode: the STATS wrapper is building STATS > GENERAL.
  const row = global.RM_ROW as Record<string, PipValue> | undefined;
  if (row) {
    let s: StatsSave = {};
    try {
      s = JSON.parse(
        fs.readFileSync('HOLO/ATOMIC_SLOTS/SAVE.JSON'),
      ) as StatsSave;
    } catch (e) {
      return;
    }
    if (!s) return;
    if (s.best) row['Slots Biggest Win'] = s.best;
    return;
  }
  // Status for the terminal check.
  const status = (global.RM_PATCH = global.RM_PATCH || {}) as Record<
    string,
    string
  >;
  // Keeps this hook working after a full restart. The hook's path goes in
  // USER/RADIOMARU_BOOT.JSON, and one boot slot shared by every Radiomaru
  // holotape runs the files listed there at startup. Like the Character
  // Switcher, it only uses .boot1-.boot3 (.boot0 belongs to the Fallout
  // companion app) and only writes when something is missing or older.
  //
  // Boot loader v3 (after Aidan's Lab's review of the firmware-update
  // problem): it never prints or logs anything, because the USB console is
  // shared with the firmware updater and the companion app; boot slots run
  // before FW.JS, so it waits until the firmware has built Pip, h,
  // Pip.createScroller and loadJSONWithDefaults (checks every 50 ms, like
  // Aidan's boot0) and never runs a hook before that: after a minute it
  // gives up instead; it runs once per start; and any error is kept in
  // global.RM_HOLO_ERR for the terminal. Loader v4 runs each hook with
  // new Function rather than eval: a hook run by eval kept the loader's
  // scope, and with it the hook's whole source text, in memory for as long
  // as the Pip-Boy was on (about 730 blocks for all the hooks together in
  // the desktop Espruino simulator). The slot starts with its version
  // ("RMHH4";). A hook only rewrites the slot when the
  // slot's version is older than its own, and the loader skips listed hooks
  // from before v2 (they would put the old loader back), so old and new
  // hooks never take turns rewriting the slot.
  // Runs straight away and is not kept: an inner function the hook keeps
  // (a row or a patch) holds on to everything declared beside it, so the
  // loader text would otherwise stay in memory for as long as the Pip-Boy
  // is on.
  (function register(path: string): void {
    const LIST = 'USER/RADIOMARU_BOOT.JSON';
    const MARK = '"RM_HOLO_HOOKS";';
    const VER = 4;
    const SLOTS = ['.boot1', '.boot2', '.boot3'];
    const LOADER =
      MARK +
      '"RMHH' +
      VER +
      '";(function(){if(global.RM_HH)return;global.RM_HH=1;var n=0;' +
      'function err(k,e){try{(global.RM_HOLO_ERR=global.RM_HOLO_ERR||{})' +
      '[k]=String(e);}catch(x){}}' +
      'function go(){if(typeof Pip==="undefined"||typeof h==="undefined"||' +
      'typeof Pip.createScroller!=="function"||' +
      'typeof loadJSONWithDefaults!=="function"){' +
      'if(++n<1200)setTimeout(go,50);else err("boot","firmware not ready");' +
      'return;}' +
      'var fs=require("fs"),l;try{l=JSON.parse(fs.readFileSync("' +
      LIST +
      '"));}catch(e){err("list",e);return;}' +
      'if(!Array.isArray(l))return;' +
      'l.forEach(function(p){try{var s=String(fs.readFileSync(p));' +
      'if(s.indexOf("RMHH")<0&&s.indexOf("RM_HOLO_HOOKS")>=0){' +
      'err(p,"old hook skipped");return;}new Function(s)();}catch(e){err(p,e);}});}' +
      'setTimeout(go,0);})();';
    status.loader = 'v' + VER;
    let list: string[] = [];
    try {
      list = JSON.parse(fs.readFileSync(LIST)) as string[];
    } catch (e) {
      list = [];
    }
    if (!Array.isArray(list)) list = [];
    if (list.indexOf(path) < 0) {
      list.push(path);
      try {
        // A card with no USER folder can't take the list, so make it first.
        if (!fs.statSync('USER')) fs.mkdir('USER');
        fs.writeFileSync(LIST, JSON.stringify(list));
      } catch (e) {
        // Not listed for startup, but the hook still works until a restart.
      }
    }
    // Writing the boot slot can fail when the Pip-Boy's internal storage
    // is full ("Unable to find or create file"). The hook still switches
    // on now; it just isn't restarted automatically after a full restart.
    try {
      const st = require('Storage');
      let free = '';
      for (let i = 0; i < SLOTS.length; i++) {
        const s = st.read(SLOTS[i]);
        if (s === undefined) {
          if (!free) free = SLOTS[i];
        } else if (String(s).indexOf(MARK) === 0) {
          const t = String(s);
          // v1 slots have no version; read "RMHH<n>" straight after MARK.
          const v =
            t.indexOf('"RMHH', MARK.length) === MARK.length
              ? parseInt(t.substr(MARK.length + 5), 10)
              : 1;
          if (!(v >= VER)) st.write(SLOTS[i], LOADER);
          status.boot = 'slot ' + SLOTS[i];
          return;
        }
      }
      if (free) st.write(free, LOADER);
      status.boot = free ? 'slot ' + free : 'no free boot slot';
    } catch (e) {
      status.boot = 'boot slot not written: ' + e;
    }
  })('HOLO/ATOMIC_SLOTS/STATS_HOOK.JS');
  if (typeof loadJSONWithDefaults !== 'function') return;
  // STATS > GENERAL is the Pip-Boy's own editable list: the right wheel
  // changes the highlighted number, and leaving the screen saves the whole
  // list to SETTINGS/GENERAL.JSON. Our rows are records read from the
  // games' saves, so they are handed over read-only (a getter with a setter
  // that ignores changes) and are left out of that save (toJSON on the
  // list's prototype, so it never shows as a row). The Pip-Boy's own rows
  // still change and save exactly as before. Copies of our rows saved by
  // older versions are dropped the next time the screen saves.
  // RM_ST4 is set too, so an older hook loaded later adds no second wrapper.
  if (!global.RM_ST5) {
    global.RM_ST5 = 1;
    global.RM_ST4 = 1;
    const orig = loadJSONWithDefaults;
    global.loadJSONWithDefaults = function (
      file: string,
      defaults: Record<string, PipValue>,
    ): Record<string, PipValue> {
      const o = orig(file, defaults);
      if (file !== 'SETTINGS/GENERAL.JSON') return o;
      let l: string[] = [];
      try {
        l = JSON.parse(fs.readFileSync('USER/RADIOMARU_BOOT.JSON')) as string[];
      } catch (e) {
        return o;
      }
      if (!Array.isArray(l)) return o;
      const rows: Record<string, PipValue> = {};
      global.RM_ROW = rows;
      for (let i = 0; i < l.length; i++) {
        if (String(l[i]).indexOf('STATS_HOOK') < 0) continue;
        try {
          const src = String(fs.readFileSync(l[i]));
          // Only hooks that know row mode; an older one would install itself.
          if (src.indexOf('RM_ROW') >= 0) new Function(src)();
        } catch (e) {
          // One game's hook or save can't break the screen.
        }
      }
      global.RM_ROW = undefined;
      // Rows from every Radiomaru tape, including retired ones, so a copy
      // saved by an older version never shows as an editable row.
      const ours = [
        'Lockpick Best Run',
        'Minefield Best Field',
        'Mole Rat Whack Best',
        'Morse Characters Learned',
        'Quickdraw Best Avg ms',
        'Quickdraw Duels Won',
        'Rad Hunt Best Round',
        'Signal Match Best Rounds',
        'Slots Biggest Win',
        'Wasteland Pet',
        'Nuka Fizz Best Total',
        'Purifier Levels Cleared',
        'Steps Walked',
      ];
      const list: Record<string, PipValue> = Object.create({
        toJSON: function (): Record<string, PipValue> {
          const c: Record<string, PipValue> = {};
          Object.keys(list).forEach(function (k: string): void {
            if (!(k in rows) && ours.indexOf(k) < 0) c[k] = list[k];
          });
          return c;
        },
      });
      for (const k in o) {
        if (!(k in rows) && ours.indexOf(k) < 0) list[k] = o[k];
      }
      Object.keys(rows).forEach(function (k: string): void {
        Object.defineProperty(list, k, {
          get: function (): PipValue {
            return rows[k];
          },
          set: function (): void {
            // Read-only: a record, not a setting.
          },
          enumerable: true,
          configurable: true,
        });
      });
      return list;
    };
  }
  status.slots = 'ok';
})();
