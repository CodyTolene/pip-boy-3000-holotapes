// Roach Stomp high score in STATS > GENERAL.
// Adds a high score entry for Roach Stomp to the GENERAL stats screen.
//
// How it works:
// JS/GENERAL.JS is checked from the SD card each time the
// STATS > GENERAL screen opens, and it fetches its data by calling the
// firmware global loadJSONWithDefaults('SETTINGS/GENERAL.JSON', ...). This
// patch adds a 'Roach Stomp Score' block next to the Atomic Command logic.
//
// Notes:
// - This will not replace JS/GENERAL.JS.
// - Installs to SD card as CFW/50_ROACH_STOMP_SCORE.JS.
// - The file name is prepended with "50_" to load this later on as lower
//   priority just in case we ever add any higher priority CFW system patches.
// - Requires the bootloader (.boot0), which evals CFW/*.js on every
//   boot after the firmware has loaded. This is handled by the website.
//
// The first score patch to run installs the hook; additional games can
// use their own CFW file and register in global.CFW.SCORES like this one.
(function () {
  if (typeof loadJSONWithDefaults !== 'function') return;
  const cfw = (global.CFW = global.CFW || {});
  let scores = cfw.SCORES;
  if (!scores) {
    scores = cfw.SCORES = {};
    const orig = loadJSONWithDefaults;
    global.loadJSONWithDefaults = function (file, defaults) {
      const o = orig(file, defaults);
      if (file === 'SETTINGS/GENERAL.JSON') {
        Object.keys(scores).forEach(function (name) {
          try {
            const t = JSON.parse(fs.readFileSync(scores[name]));
            if (t.length > 0) {
              let high = t[0].score;
              for (let n = 1; n < t.length; n++) {
                if (t[n].score > high) high = t[n].score;
              }
              o[name + ' Score'] = high;
              // console.log('[Roach Stomp CFW] high score loaded: ' + high);
            }
          } catch (e) {
            // console.log('[Roach Stomp CFW] error reading high score: ' + e);
          }
        });
      }
      return o;
    };
  }
  scores['Roach Stomp'] = 'SETTINGS/ROACHSTOMP.JSON';
})();
