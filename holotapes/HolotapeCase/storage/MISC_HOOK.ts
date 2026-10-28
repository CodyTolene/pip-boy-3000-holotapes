// Short ITEMS > MISC list, for Holotape Case.
//
// Installs as HOLO/HOLOTAPE_CASE/MISC_HOOK.JS. Holotape Case runs it when it
// opens, and it registers itself so a shared boot slot runs it again after a
// full restart (see register below). It does nothing if already active.
//
// The firmware's MISC screen (JS/MISC.JS) lists every .info file it finds with
// fs.readdirSync('APPINFO') each time the screen opens. This patch hides the
// tapes named in HOLO/HOLOTAPE_CASE/HIDDEN.JSON from that one listing and puts
// the rest in the case's order (HOLO/HOLOTAPE_CASE/ORDER.JSON), with Holotape
// Case itself first, and only while MISC.JS is building its list. Nothing is
// moved or deleted: APPINFO keeps every .info file, so pip-boy.com and other
// apps still see them all.
//
// It also makes starting a tape from MISC a full hand-off (see below), so a
// long MISC list no longer takes memory away from the tape being started.
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
      try {
        // A card with no USER folder fails with NO_PATH, so make it first.
        if (!fs.statSync('USER')) fs.mkdir('USER');
        fs.writeFileSync(LIST, JSON.stringify(list));
      } catch (e) {
        // Not listed for startup, but the hook still works until a restart.
      }
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

  register('HOLO/HOLOTAPE_CASE/MISC_HOOK.JS');
  if (status.misc === 'ok') return;
  status.misc = 'start';
  const HIDDEN = 'HOLO/HOLOTAPE_CASE/HIDDEN.JSON';
  const ORDER = 'HOLO/HOLOTAPE_CASE/ORDER.JSON';
  const SELF = 'HOLOTAPE-CASE.INFO';
  // Holotapes treated like the Pip-Boy's own: never hidden, listed first with
  // the case. Keep in step with C.STOCK in APP.ts.
  const STOCK = ['ATOMIC.INFO', 'GRELOK.INFO'];
  const origRead = fs.readFileSync;
  const origDir = fs.readdirSync;
  let inMisc = false;

  function readList(path: string): string[] {
    try {
      const l = JSON.parse(origRead.call(fs, path)) as string[];
      return Array.isArray(l) ? l : [];
    } catch (e) {
      return [];
    }
  }

  fs.readdirSync = function (path: string): string[] {
    const names = origDir.call(fs, path);
    if (!inMisc || !names) return names;
    if (String(path).toUpperCase().replace(/\/+$/, '') !== 'APPINFO') {
      return names;
    }
    const hide = readList(HIDDEN);
    const order = readList(ORDER);
    const shown = names.filter(function (n: string): boolean {
      const u = n.toUpperCase();
      return STOCK.indexOf(u) >= 0 || hide.indexOf(u) < 0;
    });
    if (!order.length) return shown;
    // The case first, then the case's order; anything new keeps its place at
    // the end.
    const rank: number[] = shown.map(function (n: string, i: number): number {
      const u = n.toUpperCase();
      const p = order.indexOf(u);
      return u === SELF
        ? -2
        : STOCK.indexOf(u) >= 0
          ? -1
          : p < 0
            ? 100000 + i
            : p;
    });
    const idx: number[] = shown.map(function (n: string, i: number): number {
      return i;
    });
    idx.sort(function (a: number, b: number): number {
      return rank[a] - rank[b];
    });
    return idx.map(function (i: number): string {
      return shown[i];
    });
  };

  // Runs the MISC screen with the filter switched on while it builds.
  // Starting a tape from MISC: the firmware's MISC loads the tape from a timer
  // inside its own screen, so its whole list (every visible tape) is still in
  // memory while the tape loads, and bigger tapes run out of memory when many
  // tapes are shown. While MISC builds its list, its press handler is swapped
  // for a full hand-off: only the tape's path is kept and the tape is started
  // from the top level, so MISC can be freed first. Rows without a tape (the
  // game's own MISC items) keep the firmware's handler.
  const origCreate = Pip.createScroller;
  Pip.createScroller = function (o: PipScrollerOptions): PipScroller {
    if (inMisc && o && o.onClick && o.getItem) {
      const click = o.onClick;
      const get = o.getItem;
      o.onClick = function (i: number): void {
        let path = '';
        try {
          const it = get(i);
          path = it && it.exec ? String(it.exec) : '';
        } catch (e) {
          path = '';
        }
        if (!path) {
          click(i);
          return;
        }
        setTimeout(
          new Function(
            'Pip.loadHolotape(' + JSON.stringify(path) + ')',
          ) as () => void,
          10,
        );
      };
    }
    return origCreate.call(Pip, o);
  };

  global.RM_wrapMisc = function (screen: MiscScreen): MiscScreen {
    return function (params: object): HolotapeApp {
      let r!: HolotapeApp;
      inMisc = true;
      try {
        r = screen(params);
      } catch (e) {
        inMisc = false;
        throw e;
      }
      inMisc = false;
      return r;
    };
  };

  fs.readFileSync = function (path: string): string {
    const src = origRead.call(fs, path);
    if (path !== 'JS/MISC.JS' || typeof src !== 'string') return src;
    // The screen file is one function expression; hand it through the wrapper.
    return 'RM_wrapMisc(' + src.replace(/[;\s]+$/, '') + ')';
  };
  status.misc = 'ok';
})();
