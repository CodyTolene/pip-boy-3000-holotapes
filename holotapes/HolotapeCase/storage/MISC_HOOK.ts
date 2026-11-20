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
//
// Memory: only a small fs.readFileSync wrapper stays in memory. When the
// MISC screen's file is read, the wrapper runs this file again in work mode
// (global.RM_MISC set), which builds the filter and hand-off for that one
// screen; they are switched on only while MISC builds its list and are
// freed with it.
(function () {
  // Work mode: the wrapper below is loading the MISC screen.
  if (global.RM_MISC === 1) {
    const HIDDEN = 'HOLO/HOLOTAPE_CASE/HIDDEN.JSON';
    const ORDER = 'HOLO/HOLOTAPE_CASE/ORDER.JSON';
    const SELF = 'HOLOTAPE-CASE.INFO';
    // Holotapes treated like the Pip-Boy's own: never hidden, listed first
    // with the case. Keep in step with C.STOCK in APP.ts. Zeta Invaders (an
    // official app since firmware 1.2.0) is matched by the start of its file
    // name.
    const STOCK = ['ATOMIC.INFO', 'GRELOK.INFO'];
    const stock = function (u: string): boolean {
      return STOCK.indexOf(u) >= 0 || u.indexOf('ZETA') === 0;
    };

    const readList = function (path: string): string[] {
      try {
        const l = JSON.parse(fs.readFileSync(path)) as string[];
        return Array.isArray(l) ? l : [];
      } catch (e) {
        return [];
      }
    };

    // The APPINFO listing with hidden tapes left out, in the case's order.
    const listDir = function (
      origDir: (path: string) => string[],
    ): (path: string) => string[] {
      return function (path: string): string[] {
        const names = origDir.call(fs, path);
        if (!names) return names;
        if (String(path).toUpperCase().replace(/\/+$/, '') !== 'APPINFO') {
          return names;
        }
        const hide = readList(HIDDEN);
        const order = readList(ORDER);
        const shown = names.filter(function (n: string): boolean {
          const u = n.toUpperCase();
          return stock(u) || hide.indexOf(u) < 0;
        });
        if (!order.length) return shown;
        // The case first, then the case's order; anything new keeps its
        // place at the end.
        const rank: number[] = shown.map(function (
          n: string,
          i: number,
        ): number {
          const u = n.toUpperCase();
          const p = order.indexOf(u);
          return u === SELF ? -2 : stock(u) ? -1 : p < 0 ? 100000 + i : p;
        });
        const idx: number[] = shown.map(function (
          n: string,
          i: number,
        ): number {
          return i;
        });
        // Equal ranks (the Pip-Boy's own tapes) go A to Z by file name: the
        // Pip-Boy's sort does not keep the order it was given.
        idx.sort(function (a: number, b: number): number {
          return (
            rank[a] - rank[b] ||
            (shown[a].toUpperCase() < shown[b].toUpperCase() ? -1 : 1)
          );
        });
        const list = idx.map(function (i: number): string {
          return shown[i];
        });
        // Firmware 1.2.0's MISC sorts this listing A to Z. That one sort
        // leaves the case's order as it is (the list is thrown away once
        // MISC has built its rows).
        list.sort = function (): string[] {
          return list;
        };
        return list;
      };
    };

    // Starting a tape from MISC: the firmware's MISC loads the tape from a
    // timer inside its own screen, so its whole list (every visible tape) is
    // still in memory while the tape loads, and bigger tapes run out of
    // memory when many tapes are shown. The press handler is swapped for a
    // full hand-off: only the tape's path is kept and the tape is started
    // from the top level, so MISC can be freed first. Rows without a tape
    // (the game's own MISC items) keep the firmware's handler.
    const handOff = function (
      origCreate: (o: PipScrollerOptions) => PipScroller,
    ): (o: PipScrollerOptions) => PipScroller {
      return function (o: PipScrollerOptions): PipScroller {
        if (o && o.onClick && o.getItem) {
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
    };

    // Runs the MISC screen with both switched on only while it builds.
    global.RM_wrapMisc = function (screen: MiscScreen): MiscScreen {
      global.RM_wrapMisc = undefined;
      return function (params: object): HolotapeApp {
        const dir = fs.readdirSync;
        const create = Pip.createScroller;
        fs.readdirSync = listDir(dir);
        Pip.createScroller = handOff(create);
        let r!: HolotapeApp;
        try {
          r = screen(params);
        } catch (e) {
          fs.readdirSync = dir;
          Pip.createScroller = create;
          throw e;
        }
        fs.readdirSync = dir;
        Pip.createScroller = create;
        return r;
      };
    };
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
  })('HOLO/HOLOTAPE_CASE/MISC_HOOK.JS');
  if (status.misc === 'ok') return;
  status.misc = 'start';
  const origRead = fs.readFileSync;
  fs.readFileSync = function (path: string): string {
    const src = origRead.call(fs, path);
    if (path !== 'JS/MISC.JS' || typeof src !== 'string') return src;
    global.RM_MISC = 1;
    global.RM_wrapMisc = undefined;
    try {
      new Function(
        String(origRead.call(fs, 'HOLO/HOLOTAPE_CASE/MISC_HOOK.JS')),
      )();
    } catch (e) {
      global.RM_wrapMisc = undefined;
    }
    global.RM_MISC = undefined;
    if (typeof global.RM_wrapMisc !== 'function') return src;
    // The screen file is one function expression; hand it through the
    // wrapper.
    return 'RM_wrapMisc(' + src.replace(/[;\s]+$/, '') + ')';
  };
  status.misc = 'ok';
})();
