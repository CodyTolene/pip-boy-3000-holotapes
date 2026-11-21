// My Journal entries in DATA > QUESTS and DATA > NOTES.
//
// Installs as HOLO/MY_JOURNAL/DATA_HOOK.JS. My Journal runs it when it opens,
// and it registers itself so a shared boot slot runs it again after a full
// restart (see register below). It does nothing if it is already active.
//
// Memory: only a small E.openFile wrapper stays in memory. The journal code
// below (reading MYQUESTS.JSON, building the records) runs only while
// QUESTS.DAT or NOTES.DAT is being opened: the wrapper runs this file again
// in work mode (RM_DATA set) and takes the view it builds.
//
// The QUESTS and NOTES screens read DATA/F3 (or NV) QUESTS.DAT and NOTES.DAT
// through E.openFile. Each .DAT is: record count and record size (two 32-bit
// numbers), then one 32-bit id per record, then the fixed-size JSON records.
// When one of those two files is opened for reading, this patch hands back a
// view of it with your journal from USER/MYQUESTS.JSON added as extra records
// at the top. It works below the screens, so it does not matter how their own
// code is stored. The real .DAT files are only read, never changed.
// Plain functions only, so older Espruino builds can parse it.
(function () {
  // Work mode: the wrapper below is opening QUESTS.DAT or NOTES.DAT.
  const req = typeof RM_DATA !== 'undefined' ? RM_DATA : undefined;
  if (req) {
    const FILE = 'USER/MYQUESTS.JSON';
    // Journal entries get ids well clear of the game's own form ids.
    const BASE = 0xfe000000;
    // Most journal entries shown; keep in step with MAX_ENTRIES in APP.ts.
    const MAX = 99;

    const journal = function (cat: number): JournalEntry[] {
      let all: JournalEntry[] = [];
      try {
        all = JSON.parse(fs.readFileSync(FILE)) as JournalEntry[];
      } catch (e) {
        return [];
      }
      if (!Array.isArray(all)) return [];
      // Quests only while they are still active; notes always.
      return all
        .filter(function (j: JournalEntry): boolean {
          return j && j.cat === cat && (cat === 1 || !j.status);
        })
        .slice(0, MAX);
    };

    // A 32-bit number as four little-endian bytes.
    const u32 = function (n: number): string {
      return String.fromCharCode(
        n & 255,
        (n >>> 8) & 255,
        (n >>> 16) & 255,
        (n >>> 24) & 255,
      );
    };

    // One journal entry as a record, padded with zeros to the record size.
    const record = function (
      j: JournalEntry,
      quests: boolean,
      size: number,
    ): string {
      let t = '';
      let k = 0;
      let n = 0;
      if (quests) {
        // Every objective, like a game quest; done ones end in (DONE).
        const obj: string[] = (
          j.obj ? j.obj.slice() : j.body ? [String(j.body)] : []
        ).map(function (o: string, i: number): string {
          return String(o) + (j.od && j.od[i] ? ' (DONE)' : '');
        });
        t = JSON.stringify({ txt: j.title, obj: obj });
        // Too long for a record: shorten the longest objective, or drop the
        // last one when they are all short.
        while (t.length > size && obj.length && n++ < 40) {
          let longest = 0;
          for (k = 1; k < obj.length; k++) {
            if (obj[k].length > obj[longest].length) longest = k;
          }
          if (obj[longest].length > 24) {
            obj[longest] =
              obj[longest].slice(
                0,
                Math.max(20, obj[longest].length - (t.length - size) - 8),
              ) + '...';
          } else {
            obj.pop();
          }
          t = JSON.stringify({ txt: j.title, obj: obj });
        }
      } else {
        let body = String(j.body || '');
        do {
          t = JSON.stringify({ txt: j.title, t: 1, desc: body || j.title });
          body = body.slice(
            0,
            Math.max(0, body.length - (t.length - size) - 8),
          );
          n++;
        } while (t.length > size && n < 4);
      }
      if (t.length > size) t = JSON.stringify({ txt: String(j.title) });
      while (t.length < size) t += '\0';
      return t.slice(0, size);
    };

    // The real file, seen with the journal records in front. Only the header
    // and ids are held in memory; each journal record is built when the screen
    // reads it, so memory stays flat however long the journal is.
    const withJournal = function (
      f: EspruinoFile,
      rm: JournalEntry[],
      quests: boolean,
    ): EspruinoFile {
      let i = 0;
      const head = E.toArrayBuffer(String(f.read(8)));
      const h = new Uint32Array(head);
      const n = h[0];
      const size = h[1];
      const realIds = String(f.read(4 * n));
      const realEnd = 8 + 4 * n;
      let pre = u32(n + rm.length) + u32(size);
      for (i = 0; i < rm.length; i++) pre += u32(BASE + rm[i].id);
      pre += realIds;
      const preLen = pre.length;
      const recEnd = preLen + rm.length * size;
      let pos = 0;
      return {
        read: function (len: number): string | undefined {
          let out = '';
          let k = 0;
          let off = 0;
          let part = '';
          while (len > 0 && pos < recEnd) {
            if (pos < preLen) {
              part = pre.substr(pos, len);
            } else {
              k = Math.floor((pos - preLen) / size);
              off = pos - preLen - k * size;
              part = record(rm[k], quests, size).substr(off, len);
            }
            out += part;
            pos += part.length;
            len -= part.length;
          }
          if (len > 0) {
            f.seek(realEnd + (pos - recEnd));
            const r = f.read(len);
            if (r !== undefined) {
              out += String(r);
              pos += String(r).length;
            }
          }
          return out.length ? out : undefined;
        },
        seek: function (p: number): void {
          pos = p;
        },
        skip: function (b: number): void {
          pos += b;
        },
        write: function (): number {
          return 0;
        },
        close: function (): void {
          f.close();
        },
      };
    };

    try {
      const rm = journal(req.q ? 0 : 1);
      if (rm.length) req.r = withJournal(req.f, rm, req.q);
    } catch (e) {
      req.e = String(e);
      req.f.seek(0);
    }
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
  })('HOLO/MY_JOURNAL/DATA_HOOK.JS');
  if (status.journal === 'ok') return;
  status.journal = 'start';
  const origOpen = E.openFile;
  E.openFile = function (
    path: string,
    mode: 'r' | 'w' | 'a' | 'r+' | 'w+' | 'a+',
  ): EspruinoFile {
    const f = origOpen.call(E, path, mode);
    if (mode !== 'r') return f;
    // Work mode opens nothing itself, but never nest.
    if (typeof RM_DATA !== 'undefined' && RM_DATA) return f;
    const p = String(path).toUpperCase();
    let quests = false;
    if (p.slice(-10) === 'QUESTS.DAT') quests = true;
    else if (p.slice(-9) !== 'NOTES.DAT') return f;
    const r: JournalReq = { f: f, q: quests };
    RM_DATA = r;
    try {
      new Function(String(fs.readFileSync('HOLO/MY_JOURNAL/DATA_HOOK.JS')))();
    } catch (e) {
      r.e = String(e);
    }
    RM_DATA = undefined;
    if (r.e) {
      status.journal = 'error: ' + r.e;
      f.seek(0);
    }
    return r.r || f;
  };
  status.journal = 'ok';
})();
