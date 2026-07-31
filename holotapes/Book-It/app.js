// =============================================================================
//  Name: Book-It
//  Author: Theeohn Megistus
//  License: MIT
//  Repository: https://github.com/Theeohn/Book-It-3000a
// =============================================================================

(function() {
  let fs = require("fs");
  let state = 0; // 0 = Browser, 1 = Reader
  let currentFolder = null;
  let listItems = [];
  let listIdx = 0;
  let scrollOff = 0;

  let curFile = "";
  let pageOffs = [0];
  let curPage = 0;
  let lines = [];
  let isEOF = false;

  let brightness = 1.0;
  let lastKnob = 0;

  const subtitles = eval(require("fs").readFileSync("HOLO/BOOK_IT/subs.js"));
  let curSubtitle = subtitles[0];

  function pathJoin(a, b) {
    if (!a) return b;
    if (!b) return a;
    return a + '/' + b;
  }

  function isDirectory(path) {
    try {
      const st = fs.statSync('/' + path);
      return !!st && !!st.dir;
    } catch (e) {
      return false;
    }
  }

  function readDir(path) {
    try {
      return fs
        .readdir('/' + path)
        .filter(function (n) {
          return n !== '.' && n !== '..';
        })
        .sort();
    } catch (e) {
      try {
        E.defrag();
        return fs
          .readdir('/' + path)
          .filter(function (n) {
            return n !== '.' && n !== '..';
          })
          .sort();
      } catch (e2) {
        return [];
      }
    }
  }

  function init() {
    try {
      let all = fs.readdir("TXT");
      if (!all) {
        fs.mkdir("TXT");
      }
    } catch(e) {
      try { fs.mkdir("TXT"); } catch(ex) {}
    }
    curSubtitle = subtitles[Math.randInt(subtitles.length)];
    loadBrowser();
    draw();
  }

  function loadBrowser() {
    listItems = [];
    try {
      let targetDir = currentFolder ? pathJoin("TXT", currentFolder) : "TXT";
      let all = readDir(targetDir);

      if (currentFolder !== null) {
        listItems.push({ type: 'back', label: 'BACK' });
      }

      let subfolders = [];
      let txtFiles = [];

      for (let i = 0; i < all.length; i++) {
        let f = all[i];
        let fullPath = pathJoin(targetDir, f);
        if (isDirectory(fullPath)) {
          subfolders.push(f);
        } else if (f.length > 4 && f.slice(-4).toLowerCase() === ".txt") {
          txtFiles.push(f);
        }
      }

      subfolders.sort();
      txtFiles.sort();

      for (let i = 0; i < subfolders.length; i++) {
        listItems.push({ type: 'folder', name: subfolders[i], label: subfolders[i] });
      }
      for (let i = 0; i < txtFiles.length; i++) {
        listItems.push({ type: 'file', name: txtFiles[i], label: txtFiles[i] });
      }
    } catch(e) {
      E.defrag();
    }

    if (listIdx >= listItems.length) listIdx = Math.max(0, listItems.length - 1);
    if (scrollOff > listIdx) scrollOff = listIdx;
    if (scrollOff < listIdx - 7) scrollOff = Math.max(0, listIdx - 7);
  }

  function loadSave() {
    pageOffs = [0];
    curPage = 0;
    try {
      let saveName = "TXT/" + curFile + ".sav";
      let d = fs.readFileSync(saveName);
      if (d) {
        let j = JSON.parse(E.toString(d));
        if (j && j.o && j.p !== undefined) {
          pageOffs = j.o;
          curPage = j.p;
        }
      }
    } catch(e) {}
  }

  function writeSave() {
    try {
      let saveName = "TXT/" + curFile + ".sav";
      fs.writeFileSync(saveName, JSON.stringify({ p: curPage, o: pageOffs }));
    } catch(e) {}
  }

  function fetchPage(pIdx) {
    if (pIdx < 0) pIdx = 0;
    let offset = pageOffs[pIdx];
    if (offset === undefined) return;

    let f;
    try { f = E.openFile("TXT/" + curFile, "r"); }
    catch(e) { return; }

    let skipped = 0;
    while (skipped < offset) {
      let chunk = f.read(Math.min(offset - skipped, 1024));
      if (!chunk) break;
      skipped += chunk.length;
    }

    let dump = f.read(1500);
    let text = dump ? E.toString(dump) : "";
    f.close();

    let wrapped = h.setFontMonofonto16().wrapString(text, 416);
    
    lines = wrapped.slice(0, 15);
    isEOF = (wrapped.length <= 15);

    if (!isEOF && pageOffs.length === pIdx + 1) {
      let consumed = 0;
      for (let i = 0; i < lines.length; i++) {
        let idx = text.indexOf(lines[i], consumed);
        if (idx !== -1) {
          consumed = idx + lines[i].length;
        } else {
          consumed += lines[i].length;
        }
      }
      pageOffs.push(offset + consumed);
    }
  }

  function drawBrowser() {  "ram";
    h.clear(0);

    h.setColor(3).setFontMonofonto36().setFontAlign(0, 0).drawString("BOOK-IT", 240, 28);
    h.setColor(2).setFontMonofonto16().setFontAlign(0, 0).drawString(curSubtitle, 242, 65);
    
    h.setColor(0);
    h.fillRect(24, 84, 456, 296);
    h.setColor(2);
    h.drawRect(25, 85, 455, 295);
    h.drawRect(26, 86, 454, 294);

    if (listItems.length === 0) {
      h.setColor(3).setFontMonofonto23().setFontAlign(0, 0).drawString("Place a .txt file in the\nTXT folder, or a sub-folder\nwith files to start reading!", 240, 190)
      h.flip();
      Pip.lastFlip = getTime();
      return;
    }

    h.setFontMonofonto16().setFontAlign(-1, -1);
    let end = Math.min(scrollOff + 8, listItems.length);

    for (let i = scrollOff; i < end; i++) {
      let y = 96 + (i - scrollOff) * 24;
      let item = listItems[i];
      let label = "";
      if (item.type === 'back') {
        label = "< " + item.label;
      } else if (item.type === 'folder') {
        label = "/" + item.label + "/";
      } else {
      label = item.label.slice(0, -4);
      }

      if (label.length > 45) label = label.slice(0, 42) + "...";
      let tw = h.stringWidth(label);
      
      if (i === listIdx) {
        h.setColor(3);
        h.drawRect(34, y - 2, 34 + tw + 6, y + 16);
        h.drawRect(33, y - 3, 34 + tw + 7, y + 17);
        h.setColor(3);
      } else {
        h.setColor(3);
      }
      
      h.drawString(label, 37, y);
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  function drawReader() {  "ram";
    h.clear(0);
    h.setColor(3).setFontMonofonto16();

    h.setFontAlign(0, -1);
    let displayName = curFile.slice(curFile.lastIndexOf('/') + 1);
    let dotIdx = displayName.lastIndexOf('.');
    if (dotIdx !== -1) displayName = displayName.slice(0, dotIdx);
    if (displayName.length > 40) displayName = displayName.slice(0, 37) + "...";
    h.drawString(displayName, 240, 4);

    h.setColor(3);
    h.drawRect(19, 24, 461, 298);
    h.drawRect(20, 25, 460, 297);

    h.setColor(3).setFontMonofonto16().setFontAlign(-1, -1);
    for (let i = 0; i < lines.length; i++) {
      h.drawString(lines[i], 28, 27 + (i * 18));
    }

    h.setFontMonofonto14().setFontAlign(0, 0).setColor(2);
    h.drawString("Page " + (curPage + 1), 240, 310);

    h.flip();
    Pip.lastFlip = getTime();
  }

  function draw() {
    if (state === 0) drawBrowser();
    else drawReader();
  }

  function browserMove(dir) {  "ram";
    if (dir) {
      listIdx += dir;
      if (listIdx < 0) listIdx = 0;
      if (listIdx >= listItems.length) listIdx = Math.max(0, listItems.length - 1);

      if (listIdx < scrollOff) scrollOff = listIdx;
      if (listIdx >= scrollOff + 8) scrollOff = listIdx - 7;
      draw();
      if (Pip.playSound) Pip.playSound("HIGHLIGHT");
    } else {
      if (listItems.length > 0) {
        let item = listItems[listIdx];
        if (item.type === 'back') {
          currentFolder = null;
          loadBrowser();
          listIdx = 0;
          scrollOff = 0;
          draw();
          if (Pip.playSound) Pip.playSound("TAB");
        } else if (item.type === 'folder') {
          currentFolder = item.name;
          loadBrowser();
          listIdx = 0;
          scrollOff = 0;
          draw();
          if (Pip.playSound) Pip.playSound("SELECT");
        } else if (item.type === 'file') {
          curFile = currentFolder ? pathJoin(currentFolder, item.name) : item.name;
          loadSave();
          fetchPage(curPage);
          state = 1;
          draw();
          if (Pip.playSound) Pip.playSound("SELECT");
        }
      }
    }
  }

  function onKnob1(dir, long) {  "ram";
    let now = getTime();
    if (now - lastKnob < 0.03) return; 
    lastKnob = now;

    if (state === 0) {
      browserMove(dir);
    } else {
      if (dir) {
        brightness = E.clip(brightness + (dir > 0 ? -0.05 : 0.05), 0.1, 1.0);
        if (Pip.setBrightness) Pip.setBrightness(brightness);
      } else {
        state = 0;
        curSubtitle = subtitles[Math.randInt(subtitles.length)];
        loadBrowser();
        draw();
        if (Pip.playSound) Pip.playSound("TAB");
      }
    }
  }

  function onKnob2(dir) {  "ram";
    if (dir === 0) return;
    let now = getTime();
    if (now - lastKnob < 0.03) return;
    lastKnob = now;

    if (state === 0) {
      browserMove(dir);
    } else {
      let oldPage = curPage;
      if (dir > 0 && !isEOF) {
        curPage++;
      } else if (dir < 0 && curPage > 0) {
        curPage--;
      }

      if (curPage !== oldPage) {
        fetchPage(curPage);
        writeSave();
        draw();
        if (Pip.playSound) Pip.playSound("SCROLL");
      }
    }
  }

  setTimeout(init, 0);

  Pip.onExclusive("knob1", onKnob1);
  Pip.onExclusive("knob2", onKnob2);
  
  if (Pip.audioStop) Pip.audioStop();

  return {
    id: "BOOK_IT",
    notDefault: true,
    fullscreen: true,
    remove: function() {
      Pip.removeListener("knob1", onKnob1);
      Pip.removeListener("knob2", onKnob2);
      h.clear();
      h.flip();
    }
  };
});