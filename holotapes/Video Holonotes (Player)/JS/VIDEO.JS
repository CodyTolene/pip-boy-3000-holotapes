(function () {
  // Simple Pip-Boy Video Player v1.2
  //
  // This version is intentionally forgiving:
  // - Tries VIDEO and /VIDEO paths
  // - Keeps a clean device menu with physical scroller execute support
  // - Supports videos directly in VIDEO/
  // - Supports videos inside VIDEO/<folder>/
  //
  // Layout A:
  //   VIDEO/TEST.avi
  //
  // Layout B:
  //   VIDEO/Commercials/TEST.avi

  const ROOT = "VIDEO";
  const DEFAULT_X = 0;
  const DEFAULT_Y = 0;
  const UI_W = h.getWidth ? h.getWidth() : 480;
  const UI_H = h.getHeight ? h.getHeight() : 320;
  const UI_BOTTOM = UI_H - 34;
  const VIDEO_W = 385;
  const VIDEO_H = 320;
  const VIDEO_X = Math.max(0, Math.floor((UI_W - VIDEO_W) / 2));
  const VIDEO_Y = Math.max(0, Math.floor((UI_H - VIDEO_H) / 2));

  let mode = "root";
  let entries = [];
  let currentFolder = "";
  let scroller = null;
  let playing = false;
  let videoX = 0;
  let videoY = 0;
  let lastDebug = "";
  let wasFullscreen = false;
  let videoStopWatch = null;
  let playingPath = "";

  function enterVideoFullscreen() {
    wasFullscreen = true;
    try { Pip.CURRENT.fullscreen = true; } catch (e) {}
    try { Pip.stopTimers && Pip.stopTimers(["timeHeader"]); } catch (e) {}
    try {
      h.setClipRect(0, 0, UI_W - 1, UI_H - 1);
      h.clearRect(0, 0, UI_W - 1, UI_H - 1);
      h.setClipRect(0, 0, UI_W - 1, UI_H - 1);
    } catch (e) {
      try { h.clear(); } catch (_) {}
    }
    h.flip();
  }

  function leaveVideoFullscreen() {
    try { Pip.CURRENT.fullscreen = false; } catch (e) {}
    try { h.setClipRect(0, 0, UI_W - 1, UI_H - 1); } catch (e) {}
    try { Pip.renderHeader && Pip.renderHeader(); } catch (e) {}
    try { Pip.renderFooter && Pip.renderFooter(); } catch (e) {}
    wasFullscreen = false;
  }

  function clearVideoStopWatch() {
    if (videoStopWatch) {
      try { clearWatch(videoStopWatch); } catch (e) {}
      videoStopWatch = null;
    }
  }

  function join(a, b) {
    if (!a) return b || "";
    if (!b) return a || "";
    return a + "/" + b;
  }

  function readDir(path) {
    const tries = [path, "/" + path];
    for (let i = 0; i < tries.length; i++) {
      try {
        const r = fs.readdir(tries[i]).filter(function (f) {
          return f && f !== "." && f !== "..";
        }).sort();
        lastDebug = "READ " + tries[i] + " = " + r.length;
        return r;
      } catch (e) {
        lastDebug = "FAIL " + tries[i] + " : " + (e.message || e);
      }
    }
    return [];
  }

  function statPath(path) {
    const tries = [path, "/" + path];
    for (let i = 0; i < tries.length; i++) {
      try {
        return fs.statSync(tries[i]);
      } catch (e) {}
    }
    return null;
  }

  function isDir(path) {
    const s = statPath(path);
    return !!s && !!s.dir;
  }

  function isAVI(name) {
    return /\.avi$/i.test(name || "");
  }

  function shortName(name) {
    return (name || "").replace(/\.avi$/i, "");
  }

  function pathFor(file) {
    return currentFolder ? join(join(ROOT, currentFolder), file) : join(ROOT, file);
  }

  function trimText(txt, maxW) {
    txt = (txt || "").toString();
    if (!h.stringWidth || h.stringWidth(txt) <= maxW) return txt;
    const dots = "...";
    let out = txt;
    while (out.length > 0 && h.stringWidth(out + dots) > maxW) {
      out = out.slice(0, -1);
    }
    return out + dots;
  }

  function makeFolderItem(name) {
    return {
      type: "folder",
      txt: name,
      name: name,
      execute: function () {
        showFolder(name);
      }
    };
  }

  function makeVideoItem(name) {
    return {
      type: "video",
      txt: shortName(name),
      name: name,
      execute: function () {
        playVideo(name);
      }
    };
  }

  function makeBackItem() {
    return {
      type: "back",
      txt: "< Back",
      name: "",
      execute: function () {
        showRoot();
      }
    };
  }

  function makeNoneItem(txt) {
    return {
      type: "none",
      txt: txt,
      name: "",
      execute: function () {
        try { Pip.playSound("BACK"); } catch (e) {}
      }
    };
  }

  function scanRoot() {
    const names = readDir(ROOT);
    entries = [];

    names.forEach(function (n) {
      const p = join(ROOT, n);
      if (isDir(p)) entries.push(makeFolderItem(n));
      else if (isAVI(n)) entries.push(makeVideoItem(n));
    });

    if (!entries.length) {
      entries.push(makeNoneItem("NO VIDEO FOUND"));
    }
  }

  function scanFolder(folder) {
    currentFolder = folder || "";
    const names = readDir(join(ROOT, currentFolder));
    entries = [makeBackItem()];

    names.forEach(function (n) {
      if (isAVI(n)) entries.push(makeVideoItem(n));
    });

    if (entries.length === 1) {
      entries.push(makeNoneItem("NO AVI FILES"));
    }
  }

  function drawShell(title) {
    h.clearRect(BR)
      .setColor(2)
      .drawRect(8, 44, UI_W - 10, UI_BOTTOM)
      .drawLine(8, UI_BOTTOM - 30, UI_W - 10, UI_BOTTOM - 30)
      .setColor(3)
      .setFont("Monofonto16")
      .setFontAlign(-1, -1)
      .drawString(title, 24, 50)
      .setColor(2)
      .setFont("6x8", 1)
      .setFontAlign(1, -1)
      .drawString("ROBCO MEDIA MODULE", UI_W - 24, 58)
      .drawLine(24, 74, 232, 74)
      .drawLine(246, 74, UI_W - 24, 74)
      .setColor(3)
      .setFont("6x8", 2)
      .setFontAlign(0, -1)
      .drawString("VIDEO", UI_W / 2, 86);
  }

  function drawRight(item) {
    const panelX = 250;
    const panelY = 112;
    h.setColor(0).fillRect(panelX, panelY, UI_W - 24, UI_BOTTOM - 36)
      .setColor(2)
      .drawLine(panelX - 12, 82, panelX - 12, UI_BOTTOM - 38)
      .setFont("6x8", 2)
      .setFontAlign(-1, -1);

    if (!item) {
      h.setColor(2).drawString("SELECT A RECORD", panelX, panelY);
    } else if (item.type === "folder") {
      h.setColor(3).drawString("CHANNEL", panelX, panelY);
      h.setColor(2).drawString(trimText(item.txt, 190), panelX, panelY + 28);
      h.setColor(1).setFont("6x8", 1).drawString("OPEN FOLDER", panelX, panelY + 58);
    } else if (item.type === "video") {
      h.setColor(3).drawString("PLAYBACK READY", panelX, panelY);
      h.setColor(2).drawString(trimText(item.txt, 190), panelX, panelY + 28);
      h.setColor(1).setFont("6x8", 1).drawString("AVI / FULLSCREEN", panelX, panelY + 58);
    } else if (item.type === "back") {
      h.setColor(3).drawString("RETURN", panelX, panelY);
      h.setColor(2).drawString("VIDEO ROOT", panelX, panelY + 28);
    } else {
      h.setColor(3).drawString(item.txt || "EMPTY", panelX, panelY);
      h.setColor(2).setFont("6x8", 1).drawString("ADD AVI FILES TO /VIDEO", panelX, panelY + 30);
    }

    h.setColor(2)
      .setFont("6x8", 1)
      .setFontAlign(0, -1)
      .drawString(currentFolder ? trimText(currentFolder, 160) : "VIDEO ROOT", UI_W / 2, UI_BOTTOM - 22);
    h.flip();
  }

  function makeScroller(title, list, onClick) {
    if (scroller) {
      try { scroller.remove(); } catch (e) {}
      scroller = null;
    }

    drawShell(title);

    scroller = Pip.createScroller({
      width: 210,
      items: list,
      render: function (item) { drawRight(item); },
      onClick: onClick
    });
  }

  function showRoot() {
    mode = "root";
    currentFolder = "";
    scanRoot();

    makeScroller("Video", entries, function (idx) {
      const item = entries[idx];
      if (!item) return;
      if (item.type === "folder") {
        showFolder(item.name);
      } else if (item.type === "video") {
        playVideo(item.name);
      }
    });
  }

  function showFolder(folder) {
    mode = "folder";
    scanFolder(folder);

    makeScroller(folder || "Videos", entries, function (idx) {
      const item = entries[idx];
      if (!item) return;
      if (item.type === "back") showRoot();
      else if (item.type === "video") playVideo(item.name);
    });
  }

  function onVideoStopped() {
    playing = false;
    playingPath = "";
    clearVideoStopWatch();
    Pip.removeListener("videoStopped", onVideoStopped);
    leaveVideoFullscreen();
    h.clearRect(BR);
    if (currentFolder) showFolder(currentFolder);
    else showRoot();
  }

  function stopVideo(returnToMenu) {
    playing = false;
    playingPath = "";
    clearVideoStopWatch();
    try { if (Pip.videoStop) Pip.videoStop(); } catch (e) {}
    Pip.removeListener("videoStopped", onVideoStopped);
    if (wasFullscreen) leaveVideoFullscreen();
    if (returnToMenu) {
      h.clearRect(BR);
      if (currentFolder) showFolder(currentFolder);
      else showRoot();
    }
  }

  function playVideo(name) {
    if (!Pip.videoStart) {
      h.clearRect(BR).setFont("Monofonto16").setFontAlign(0,0).setColor(3)
        .drawString("NO VIDEO API", 240, 140).flip();
      return;
    }

    const p = pathFor(name);
    playing = true;
    playingPath = p;

    try {
      try { if (Pip.videoStop) Pip.videoStop(); } catch (_) {}
      enterVideoFullscreen();
      clearVideoStopWatch();
      try {
        if (typeof ENC1_PRESS !== "undefined") {
          videoStopWatch = setWatch(function () {
            if (playing) stopVideo(true);
          }, ENC1_PRESS, { repeat: true, edge: "rising", debounce: 80 });
        }
      } catch (_) {}
      Pip.on("videoStopped", onVideoStopped);
      Pip.videoStart(p, {
        x: VIDEO_X,
        y: VIDEO_Y,
        debug: false,
        repeat: false
      });
    } catch (e) {
      playing = false;
      playingPath = "";
      clearVideoStopWatch();
      Pip.removeListener("videoStopped", onVideoStopped);
      if (wasFullscreen) leaveVideoFullscreen();
      try { Pip.log("Video play error: " + p + " / " + (e.message || e), "errors.txt"); } catch (_) {}
      h.clearRect(BR)
        .setFont("Monofonto16")
        .setFontAlign(0, 0)
        .setColor(3)
        .drawString("PLAY ERROR", 240, 125)
        .setFont("Monofonto14")
        .setColor(2)
        .drawString(p, 240, 150)
        .drawString((e.message || e || "").toString().slice(0, 32), 240, 175)
        .flip();
      setTimeout(function () {
        if (currentFolder) showFolder(currentFolder);
        else showRoot();
      }, 2000);
    }
  }

  function onKnob1(dir) {
    if (playing && dir === 0) stopVideo(true);
  }

  function onKnob2(dir) {
    if (playing || !dir) return;
    try { Pip.playSound("HIGHLIGHT"); } catch (e) {}
  }

  function start() {
    h.clearRect(BR);
    Pip.on("knob1", onKnob1);
    Pip.onExclusive("knob2", onKnob2);
    showRoot();
  }

  start();

  return {
    id: "VIDEO",
    notDefault: true,
    fullscreen: false,
    remove: function () {
      stopVideo(false);
      if (scroller) {
        try { scroller.remove(); } catch (e) {}
      }
      Pip.removeListener("knob1", onKnob1);
      Pip.removeListener("knob2", onKnob2);
      Pip.removeListener("videoStopped", onVideoStopped);
    }
  };
});
