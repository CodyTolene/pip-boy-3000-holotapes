// Short ITEMS > MISC list, for Holotape Case.
//
// Installs to the SD card as CFW/52_RADIOMARU_MISC.JS. The pip-boy.com
// bootloader evals CFW/*.js on every boot after the firmware has loaded.
//
// The firmware's MISC screen (JS/MISC.JS) lists every .info file it finds with
// fs.readdirSync('APPINFO') each time the screen opens. This patch hides the
// tapes named in HOLO/HOLOTAPE_CASE/HIDDEN.JSON from that one listing, and only
// while MISC.JS is building its list. Nothing is moved or deleted: APPINFO
// keeps every .info file, so pip-boy.com and other apps still see them all.
(function () {
  const HIDDEN = 'HOLO/HOLOTAPE_CASE/HIDDEN.JSON';
  const origRead = fs.readFileSync;
  const origDir = fs.readdirSync;
  let inMisc = false;

  function hidden(): string[] {
    try {
      return JSON.parse(origRead.call(fs, HIDDEN)) as string[];
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
    const hide = hidden();
    if (!hide.length) return names;
    return names.filter(function (n: string): boolean {
      return hide.indexOf(n.toUpperCase()) < 0;
    });
  };

  // Runs the MISC screen with the filter switched on while it builds.
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
})();
