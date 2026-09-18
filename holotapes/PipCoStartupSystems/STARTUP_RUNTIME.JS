(function() {
  if (global.__PipCoStartupRuntimeV210) return global.__PipCoStartupRuntimeV210;

  const fs = require("fs"),
    basePath = "HOLO/STARTUP_ANIMATIONS/",
    selectionPath = basePath + "SELECT.JSON",
    builtinFiles = [
      "MISTER.AVI",
      "VAULTGIRL.AVI",
      "DEATHCLAW.AVI",
      "YESMAN.AVI",
      "ENCLAVE.AVI",
      "BOS.AVI",
      "MOTHMAN.AVI",
      "MINUTEMEN.AVI",
      "ENCLAVE_PIPBOY.AVI",
      "MRHOUSE.AVI",
      "CLASSIC_MRHOUSE.AVI",
      "CLASSIC_MRHOUSE_ANIMATED.AVI",
      "CLASSIC_MRHOUSE_FULLY_ANIMATED.AVI",
      "DOGMEAT.AVI"
    ],
    expectedDurations = new Uint16Array([
      6250, 3500, 3500, 4917, 5500, 5500, 5500,
      5500, 26000, 7667, 5250, 6083, 6000, 4167
    ]),
    safetyTimeouts = new Uint16Array([
      15000, 12000, 13000, 16000, 9015, 9015, 9015,
      16500, 30500, 11182, 13000, 15000, 15000, 13000
    ]),
    useVideoStoppedEvent = new Uint8Array([1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1]);

  if (!global.__PipCoStartupSessionV214) {
    try {
      fs.writeFileSync(selectionPath, '{"startup":-1}');
    } catch (error) {
      // A cold session must still fall back to stock even if the SD write fails.
    }
    global.__PipCoStartupSessionV214 = 1;
    return 0;
  }

  let stockBootAnimation = typeof Pip.bootAnimation === "function" ? Pip.bootAnimation : undefined,
    stockAudioStart = typeof Pip.audioStart === "function" ? Pip.audioStart : undefined,
    ownsVideo = 0,
    ownsAudio = 0,
    suppressNextCrtSound = 0;

  function startupFile(startupIndex) {
    if (startupIndex < 14) return builtinFiles[startupIndex];
    if (startupIndex === 14) return "Custom_Bootup.AVI";
    if (startupIndex > 14 && startupIndex < 19) {
      return "Custom_Bootup_" + (startupIndex - 13) + ".AVI";
    }
    return "";
  }

  function selectedStartup() {
    try {
      let startupIndex = JSON.parse(fs.readFileSync(selectionPath)).startup | 0;
      return startupIndex >= -1 && startupIndex < 19 ? startupIndex : -1;
    } catch (error) {
      return -1;
    }
  }

  function startupAvailable(startupIndex) {
    let fileName = startupFile(startupIndex);
    return startupIndex >= 0 && fileName && fs.statSync(basePath + fileName) ? 1 : 0;
  }

  function restoreRuntime() {
    if (ownsVideo) {
      try {
        Pip.videoStop();
      } catch (error) {
        // Cleanup is best-effort if firmware is already tearing down playback.
      }
    }
    if (ownsAudio) {
      try {
        Pip.audioStop();
      } catch (error) {
        // Cleanup is best-effort if firmware is already tearing down playback.
      }
    }
    ownsVideo = ownsAudio = 0;
    if (stockAudioStart) Pip.audioStart = stockAudioStart;
    if (stockBootAnimation) Pip.bootAnimation = stockBootAnimation;
    if (global.__PipCoStartupRuntimeV210 === runtimeApi) {
      global.__PipCoStartupRuntimeV210 = undefined;
    }
    process.memory(true);
    E.defrag();
  }

  function filteredAudioStart(path) {
    let startupIndex = selectedStartup();
    if (!startupAvailable(startupIndex)) {
      return stockAudioStart ? stockAudioStart.apply(Pip, arguments) : undefined;
    }
    if (suppressNextCrtSound && path === "SOUND/FX/CRT_ON2.WAV") {
      suppressNextCrtSound = 0;
      return;
    }
    return stockAudioStart ? stockAudioStart.apply(Pip, arguments) : undefined;
  }

  function runStockBoot(done) {
    let result;
    try {
      result = stockBootAnimation ? stockBootAnimation.call(Pip) : undefined;
      if (result && typeof result.then === "function") result.then(done);
      else done();
    } catch (error) {
      done();
    }
  }

  function customBootAnimation() {
    let startupIndex = selectedStartup();
    if (!startupAvailable(startupIndex)) {
      return stockBootAnimation ? stockBootAnimation.call(Pip) : Promise.resolve();
    }

    return new Promise(function(done) {
      let launchTimer = 0,
        safetyTimer = 0,
        fallbackTimer = 0,
        videoStoppedHandler,
        finished = 0;

      function finishBoot() {
        if (finished) return;
        finished = 1;
        if (launchTimer) clearTimeout(launchTimer);
        if (safetyTimer) clearTimeout(safetyTimer);
        if (fallbackTimer) clearTimeout(fallbackTimer);
        launchTimer = safetyTimer = fallbackTimer = 0;
        if (videoStoppedHandler) {
          Pip.removeListener("videoStopped", videoStoppedHandler);
          videoStoppedHandler = undefined;
        }

        // Always stop the owned media before handing control back to Pip-OS.
        // Older hardware-tested builds used this same handoff and did not leave
        // the AVI decoder's final frame on the display after wake.
        if (ownsVideo) {
          try {
            Pip.videoStop();
          } catch (error) {
            // Playback may already have reached EOF; videoStop is cleanup only.
          }
        }
        if (ownsAudio) {
          try {
            Pip.audioStop();
          } catch (error) {
            // Embedded AVI audio may already have stopped with the video.
          }
        }

        ownsVideo = ownsAudio = 0;
        h.reset().setClipRect(0, 0, 479, 319);
        suppressNextCrtSound = 1;

        // Preserve the proven handoff delay so the video layer can fully
        // release before firmware redraws the normal Pip-Boy screen.
        setTimeout(done, 160);
      }

      function playSelectedStartup() {
        let fileName;
        if (finished) return;
        if (!startupAvailable(startupIndex)) {
          finished = 1;
          runStockBoot(done);
          return;
        }

        fileName = startupFile(startupIndex);
        try {
          Pip.videoStop();
          Pip.audioStop();
        } catch (error) {
          // Stopping stale playback is defensive; continue with a clean screen.
        }
        h.clear();
        h.flip();

        try {
          Pip.videoStart(basePath + fileName, { x: 0, y: 0 });
          ownsVideo = ownsAudio = 1;
          safetyTimer = setTimeout(function() {
            finishBoot();
          }, startupIndex < 14 ? safetyTimeouts[startupIndex] : 120000);
        } catch (error) {
          finished = 1;
          ownsVideo = ownsAudio = 0;
          runStockBoot(done);
          return;
        }

        if (startupIndex < 14 ? useVideoStoppedEvent[startupIndex] : 1) {
          videoStoppedHandler = function() {
            finishBoot();
          };
          try {
            Pip.on("videoStopped", videoStoppedHandler);
          } catch (error) {
            videoStoppedHandler = undefined;
            fallbackTimer = setTimeout(function() {
              finishBoot();
            }, (startupIndex < 14 ? expectedDurations[startupIndex] : 30000) + 500);
          }
        } else {
          fallbackTimer = setTimeout(function() {
            finishBoot();
          }, expectedDurations[startupIndex] + (startupIndex === 8 ? 420 : 180));
        }
      }

      launchTimer = setTimeout(playSelectedStartup, 1895);
    });
  }

  const runtimeApi = { restore: restoreRuntime };
  if (stockAudioStart) Pip.audioStart = filteredAudioStart;
  Pip.bootAnimation = customBootAnimation;
  global.__PipCoStartupRuntimeV210 = runtimeApi;
  return runtimeApi;
});
