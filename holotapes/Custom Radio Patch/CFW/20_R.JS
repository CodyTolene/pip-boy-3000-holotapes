// Custom RADIO CFW patch V9.
// Replaces only JS/RADIO.JS and gives custom radio normal sleep behavior.
(function () {
  if (typeof fs === 'undefined' || typeof fs.readFileSync !== 'function') return;
  if (typeof Pip === 'undefined') return;

  var cfw = global.CFW = global.CFW || {};

  // Supply the custom low-memory RADIO menu without changing internal firmware.
  if (!cfw.radioMenuPatch) {
    cfw.radioMenuPatch = true;
    cfw.radioOriginalRead = fs.readFileSync;
    fs.readFileSync = function (file) {
      if (file === 'JS/RADIO.JS' || file === '/JS/RADIO.JS') {
        try {
          return cfw.radioOriginalRead('CFW/R.DAT');
        } catch (e) {
          // Missing/bad payload: fall through to stock RADIO.JS.
        }
      }
      return cfw.radioOriginalRead.apply(fs, arguments);
    };
  }

  // Shut down persistent custom radio before the firmware enters sleep.
  if (!cfw.radioSleepPatch && typeof Pip.goToSleep === 'function') {
    cfw.radioSleepPatch = true;
    cfw.radioOriginalSleep = Pip.goToSleep;

    cfw.stopCustomRadioForSleep = function () {
      var r = Pip.radio;
      var custom;
      if (!r) return;

      custom = !!(
        r.mjOn || Pip._mjStart || Pip._mjStop ||
        r.mjHandler || r.mjWatch || r.mjTracks
      );

      if (custom) {
        r.mjNoNext = true;
        r.mjOn = false;
        r.mojaveStation = false;
        Pip.radioClipPlaying = false;

        if (r.mjTimer) clearTimeout(r.mjTimer);
        if (r.mjWatch) clearInterval(r.mjWatch);
        if (r.mjHandler) {
          try { Pip.removeListener('audioStopped', r.mjHandler); } catch (e) {}
        }

        // Stop through the original firmware function when wrappers are active.
        try {
          r.mjAllow = true;
          if (Pip._mjStop) Pip._mjStop.call(Pip);
          else if (Pip.audioStop) Pip.audioStop();
        } catch (e) {}
        r.mjAllow = false;

        if (Pip._mjStart) {
          Pip.audioStart = Pip._mjStart;
          Pip._mjStart = 0;
        }
        if (Pip._mjStop) {
          Pip.audioStop = Pip._mjStop;
          Pip._mjStop = 0;
        }

        r.mjTimer = 0;
        r.mjWatch = 0;
        r.mjHandler = 0;
        r.mjNext = 0;
        r.mjTracks = 0;
        r.mjTrackIndex = -1;
        r.mjStationName = '';
        r.mjStationPath = '';
        r.mojaveCurrent = '';
        r.mojaveError = '';
      }

      // FM must also be physically powered down before sleep.
      if (Pip.radioOn || custom) {
        try { r.setPower(false); } catch (e) {}
      }
      Pip.radioOn = false;
      Pip.radioClipPlaying = false;
    };

    Pip.goToSleep = function () {
      cfw.stopCustomRadioForSleep();
      return cfw.radioOriginalSleep.apply(Pip, arguments);
    };
  }
})();
