// =============================================================================
//  Name: RobCo Entertainment Terminal
//  Author(s): @CodyTolene
//  Contributor(s): @joemto20-tech
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================

(function (app) {
  const rd = Pip.radio;

  // Make sure we're applying the monkey patches to a supported firmware version. If not, disable persistence.
  try {
    rd.rcetPersistSupported =
      fs.readFileSync('VERSION') === app.supportedFirmwareVersion;
  } catch (e) {
    rd.rcetPersistSupported = false;
  }
  if (!rd.rcetPersistSupported) global.__RCETPersist = false;

  // Goes to the next track & starts it.
  rd.mjNext = new Function(
    "var r=Pip.radio,S=r.mjStations||[],si=r.mjStationIndex||0,st=S[si],n=st&&st.t,pre=st&&st.p,i;if(!n||!n.length){r.mjOn=0;r.mojaveStation=0;Pip.radioClipPlaying=0;return}i=(r.mjTrackIndex==undefined?-1:r.mjTrackIndex)+1;if(i>=n.length)i=0;r.mjStationIndex=si;r.mjTrackIndex=i;r.mojaveCurrent=pre+n[i];r.mjOn=1;r.mojaveStation=1;Pip.radioClipPlaying=1;try{r.setPower(false)}catch(e){}r.mjNoNext=1;r.mjAllow=1;try{Pip.audioStop()}catch(e){}try{Pip.audioStart(r.mojaveCurrent)}catch(e){r.mjOn=0;r.mojaveStation=0;Pip.radioClipPlaying=0;r.mojaveError=''+e}r.mjAllow=0;if(r.mjTimer)clearTimeout(r.mjTimer);r.mjTimer=setTimeout(function(){var r=Pip.radio;r.mjNoNext=0;r.mjTimer=0},700)",
  );

  // Removes any stale track-end listener from an earlier install.
  if (rd.mjHandler) {
    try {
      Pip.removeListener('audioStopped', rd.mjHandler);
    } catch (e) {}
  }
  // If play ends go to the next track
  rd.mjHandler = new Function(
    'var r=Pip.radio;if(!r||!r.mjOn||r.mjNoNext)return;setTimeout(function(){var r=Pip.radio;if(!r||!r.mjOn||r.mjNoNext)return;try{if(Pip.audioIsPlaying&&Pip.audioIsPlaying())return}catch(e){}if(r.mjNext)r.mjNext()},30)',
  );
  Pip.on('audioStopped', rd.mjHandler);

  // Prevent any stale handlers
  if (rd.mjTabHandler) {
    try {
      Pip.removeListener('mode', rd.mjTabHandler);
    } catch (e) {}
    try {
      Pip.removeListener('menuX', rd.mjTabHandler);
    } catch (e) {}
    rd.mjTabHandler = 0;
  }

  // Stops play, clears and restores every patched Pip method.
  Pip.rcetStop = new Function(
    "var r=Pip.radio;r.mjOn=0;r.mojaveStation=0;Pip.radioClipPlaying=0;r.mjNoNext=1;r.mjAllow=1;try{Pip.audioStop()}catch(e){}r.mjAllow=0;r.mojaveError=0;if(r.mjTimer)clearTimeout(r.mjTimer);if(r.mjWatch)clearInterval(r.mjWatch);r.mjTimer=0;r.mjWatch=0;if(r.mjHandler){try{Pip.removeListener('audioStopped',r.mjHandler)}catch(e){}}if(r.mjTabHandler){try{Pip.removeListener('mode',r.mjTabHandler)}catch(e){}try{Pip.removeListener('menuX',r.mjTabHandler)}catch(e){}}r.mjHandler=0;r.mjTabHandler=0;r.mjNext=0;r.mjStations=0;r.mjStationIndex=0;r.mjTrackIndex=0;r.mojaveCurrent=0;r.mjVol=0;if(Pip._mjStart){Pip.audioStart=Pip._mjStart;Pip._mjStart=0}if(Pip._mjStop){Pip.audioStop=Pip._mjStop;Pip._mjStop=0}if(Pip._rcetSleepOrig){Pip.goToSleep=Pip._rcetSleepOrig;Pip._rcetSleepOrig=0;Pip._rcetSleepWrapped=0}Pip.rcetStop=0;setTimeout(new Function('process.memory(true)'),0)",
  );

  if (app.persist && rd.rcetPersistSupported) {
    // Block other audio starts
    if (!Pip._mjStart && Pip.audioStart) {
      Pip._mjStart = Pip.audioStart;
      Pip.audioStart = new Function(
        'p',
        'var r=Pip.radio;if(r&&r.mjOn&&!r.mjAllow)return 0;if(r&&r.mjOn){r.mjNoNext=1;if(r.mjTimer)clearTimeout(r.mjTimer);r.mjTimer=setTimeout(function(){var r=Pip.radio;r.mjNoNext=0;r.mjTimer=0},700)}return Pip._mjStart.apply(Pip,arguments)',
      );
    }
    // Blocks other audio stops
    if (!Pip._mjStop && Pip.audioStop) {
      Pip._mjStop = Pip.audioStop;
      Pip.audioStop = new Function(
        'var r=Pip.radio;if(r&&r.mjOn&&!r.mjAllow)return 0;if(r&&r.mjOn){r.mjNoNext=1;if(r.mjTimer)clearTimeout(r.mjTimer);r.mjTimer=setTimeout(function(){var r=Pip.radio;r.mjNoNext=0;r.mjTimer=0},700)}return Pip._mjStop.apply(Pip,arguments)',
      );
    }
    // Stops persistence entering sleep
    if (!Pip._rcetSleepWrapped && typeof Pip.goToSleep === 'function') {
      Pip._rcetSleepWrapped = 1;
      Pip._rcetSleepOrig = Pip.goToSleep;
      Pip.goToSleep = new Function(
        "var o=Pip._rcetSleepOrig;try{if(Pip.rcetStop&&Pip.radio&&Pip.radio.mjOn)Pip.rcetStop()}catch(e){}if(typeof o=='function')return o.apply(Pip,arguments)",
      );
    }
    // Restore normal audio before the default firmware's DATA > Radio tab loads
    rd.mjTabHandler = new Function(
      'var r=Pip.radio;if(r&&r.mjOn&&Pip.MODE==2&&Pip.MENUX==4&&Pip.rcetStop)Pip.rcetStop()',
    );
    Pip.on('mode', rd.mjTabHandler);
    Pip.on('menuX', rd.mjTabHandler);
  }

  // Removes stale watchdog interval
  if (rd.mjWatch) clearInterval(rd.mjWatch);

  // Maintains DAC & volume state and continues if an audio stop event is missed
  rd.mjWatch = setInterval(
    new Function(
      "var r=Pip.radio;if(!r)return;if(!r.mjOn){if(Pip.rcetStop)Pip.rcetStop();return}try{if(Pip.setDACMode)Pip.setDACMode('out')}catch(e){}try{if(Pip.setVol&&typeof r.mjVol=='number')Pip.setVol(r.mjVol)}catch(e){}if(r.mjNoNext)return;try{if(!Pip.audioIsPlaying||Pip.audioIsPlaying())return}catch(e){return}if(r.mjNext)r.mjNext()",
    ),
    1000,
  );
});
