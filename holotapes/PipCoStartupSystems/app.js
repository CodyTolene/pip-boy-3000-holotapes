(function() {
  const fs = require("fs"),
    basePath = "HOLO/STARTUP_ANIMATIONS/",
    selectionPath = basePath + "SELECT.JSON",
    bootupFiles = [
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
      "DOGMEAT.AVI",
      "Custom_Bootup.AVI",
      "Custom_Bootup_2.AVI",
      "Custom_Bootup_3.AVI",
      "Custom_Bootup_4.AVI",
      "Custom_Bootup_5.AVI"
    ],
    bootupLabels = [
      "Mister Handy",
      "Vault Girl",
      "Deathclaw Vault Experiment",
      "YES MAN",
      "The Enclave",
      "The Brotherhood of Steel",
      "Mothman",
      "The Minutemen",
      "Enclave PIP-BOY",
      "Mr. House",
      "Classic Mr. House",
      "Classic Mr. House Animated",
      "Classic Mr. House Fully Animated",
      "Dogmeat",
      "Custom Bootup",
      "Custom Bootup 2",
      "Custom Bootup 3",
      "Custom Bootup 4",
      "Custom Bootup 5"
    ],
    categoryMembers = [
      [0, 1, 2, 8],
      [4, 5, 7, 6],
      [3, 9, 10, 11, 12, 13],
      [14, 15, 16, 17, 18]
    ];

  let installedBootups = new Uint8Array(19),
    activeStartup = -1,
    currentCategory = 0,
    selectedRow = 0,
    firstVisibleRow = 0,
    closed = 0,
    inputAttached = 0,
    titleImage;

  function ignoreError(message) {}

  function stopLegacyRuntime() {
    try {
      if (global.__PipCoStartupRuntimeV202) {
        global.__PipCoStartupRuntimeV202.restore();
      }
    } catch (error) {
      ignoreError("legacy runtime V202 restore failed: " + error);
    }
    try {
      if (global.__PipCoStartupRuntimeV2) {
        global.__PipCoStartupRuntimeV2.restore();
      }
    } catch (error) {
      ignoreError("legacy runtime V2 restore failed: " + error);
    }
    try {
      if (global.__PIPCO_RT) global.__PIPCO_RT.restore();
    } catch (error) {
      ignoreError("legacy runtime restore failed: " + error);
    }
  }

  function cancelWakeWatcher() {
    try {
      if (global.__PipCoStartupWakeV210) {
        global.__PipCoStartupWakeV210.cancel();
      }
    } catch (error) {
      ignoreError("wake cancel failed: " + error);
    }
  }

  function readSelection() {
    try {
      let startupIndex = JSON.parse(fs.readFileSync(selectionPath)).startup | 0;
      return startupIndex >= -1 && startupIndex < 19 ? startupIndex : -1;
    } catch (error) {
      return -1;
    }
  }

  function saveSelection(startupIndex) {
    try {
      fs.writeFileSync(selectionPath, '{"startup":' + startupIndex + "}");
      activeStartup = startupIndex;
      return 1;
    } catch (error) {
      ignoreError("selection save failed: " + error);
      return 0;
    }
  }

  function scanInstalledBootups() {
    let startupIndex;
    for (startupIndex = 0; startupIndex < 19; startupIndex++) {
      installedBootups[startupIndex] = fs.statSync(basePath + bootupFiles[startupIndex]) ? 1 : 0;
    }
  }

  function countInstalledInCategory(categoryNumber) {
    let members = categoryMembers[categoryNumber - 1],
      memberIndex,
      count = 0;
    for (memberIndex = 0; memberIndex < members.length; memberIndex++) {
      if (installedBootups[members[memberIndex]]) count++;
    }
    return count;
  }

  function startupIndexAt(categoryNumber, visibleIndex) {
    let members = categoryMembers[categoryNumber - 1],
      memberIndex,
      installedIndex = 0;
    for (memberIndex = 0; memberIndex < members.length; memberIndex++) {
      if (installedBootups[members[memberIndex]]) {
        if (installedIndex === visibleIndex) return members[memberIndex];
        installedIndex++;
      }
    }
    return -1;
  }

  function mainMenuCount() {
    let count = 2,
      categoryNumber;
    for (categoryNumber = 1; categoryNumber < 5; categoryNumber++) {
      if (countInstalledInCategory(categoryNumber)) count++;
    }
    return count;
  }

  function mainMenuCategoryAt(rowIndex) {
    let cursor = 0;
    if (rowIndex === cursor++) return -1;
    if (countInstalledInCategory(1) && rowIndex === cursor++) return 1;
    if (countInstalledInCategory(2) && rowIndex === cursor++) return 2;
    if (countInstalledInCategory(3) && rowIndex === cursor++) return 3;
    if (countInstalledInCategory(4) && rowIndex === cursor++) return 4;
    return 0;
  }

  function mainMenuLabel(categoryNumber) {
    if (categoryNumber === -1) return "Default Bootup";
    if (categoryNumber === 1) return "Special Bootups";
    if (categoryNumber === 2) return "Faction Bootups";
    if (categoryNumber === 3) return "NPC Bootups";
    if (categoryNumber === 4) return "Custom Bootups";
    return "< Back";
  }

  function shadeRow(y) {
    Pip.shadeBox(24, y - 4, 456, y + 22);
  }

  function drawScroller(totalRows, firstRow, visibleRows) {
    if (totalRows <= visibleRows) return;
    let trackTop = 108,
      trackBottom = 294,
      trackHeight = trackBottom - trackTop,
      thumbHeight = Math.max(18, Math.floor(trackHeight * visibleRows / totalRows)),
      scrollRange = totalRows - visibleRows,
      thumbY = trackTop;
    if (scrollRange > 0) {
      thumbY += Math.floor((trackHeight - thumbHeight) * firstRow / scrollRange);
    }
    h.setColor(3)
      .drawRect(466, trackTop, 470, trackBottom)
      .fillRect(467, thumbY + 1, 469, thumbY + thumbHeight - 1);
  }

  function drawHeader() {
    h.clear().setColor(3).setFontMonofonto16();
    if (titleImage) h.drawImage(titleImage, 152, 6);
  }

  function drawMenu() {
    let rowY = 112,
      rowIndex,
      categoryNumber,
      categoryItemCount,
      totalRows,
      visibleRow,
      startupIndex;

    drawHeader();
    if (!currentCategory) {
      totalRows = mainMenuCount();
      for (rowIndex = 0; rowIndex < totalRows; rowIndex++) {
        categoryNumber = mainMenuCategoryAt(rowIndex);
        if (selectedRow === rowIndex) shadeRow(rowY);
        h.setColor(3)
          .setFontAlign(-1, -1)
          .drawString(mainMenuLabel(categoryNumber), 38, rowY);
        if (categoryNumber === -1 && activeStartup === -1) {
          h.setFontAlign(1, -1).drawString("ACTIVE", 442, rowY);
        }
        rowY += 36;
      }
      return;
    }

    categoryItemCount = countInstalledInCategory(currentCategory);
    totalRows = categoryItemCount + 1;
    if (selectedRow < firstVisibleRow) firstVisibleRow = selectedRow;
    if (selectedRow >= firstVisibleRow + 5) firstVisibleRow = selectedRow - 4;
    firstVisibleRow = E.clip(firstVisibleRow, 0, Math.max(0, totalRows - 5));

    for (visibleRow = 0; visibleRow < 5 && firstVisibleRow + visibleRow < totalRows; visibleRow++) {
      rowIndex = firstVisibleRow + visibleRow;
      if (selectedRow === rowIndex) shadeRow(rowY);
      h.setColor(3).setFontAlign(-1, -1);
      if (rowIndex < categoryItemCount) {
        startupIndex = startupIndexAt(currentCategory, rowIndex);
        h.drawString(bootupLabels[startupIndex], 38, rowY);
        if (activeStartup === startupIndex) {
          h.setFontAlign(1, -1).drawString("ACTIVE", 442, rowY);
        }
      } else {
        h.drawString("< Back", 38, rowY);
      }
      rowY += 36;
    }
    drawScroller(totalRows, firstVisibleRow, 5);
  }

  function loadWakeWatcher() {
    let sourceCode = 0,
      wakeFactory = 0;
    if (activeStartup < 0 || global.__PipCoStartupRuntimeV210) return;
    try {
      process.memory(true);
      E.defrag();
      sourceCode = fs.readFileSync(basePath + "STARTUP_WAKE.JS");
      wakeFactory = eval(sourceCode);
      sourceCode = 0;
      wakeFactory();
      wakeFactory = 0;
      process.memory(true);
    } catch (error) {
      sourceCode = wakeFactory = 0;
      ignoreError("wake load failed: " + error);
    }
  }

  function onKnob1(direction) {
    let lastRow,
      categoryNumber,
      categoryItemCount,
      previousCategory,
      rowIndex,
      startupIndex;

    if (direction) {
      lastRow = currentCategory ? countInstalledInCategory(currentCategory) : mainMenuCount() - 1;
      selectedRow += direction > 0 ? 1 : -1;
      if (selectedRow < 0) selectedRow = lastRow;
      if (selectedRow > lastRow) selectedRow = 0;
      Pip.playSound("SCROLL");
      drawMenu();
      return;
    }

    Pip.playSound("SELECT");
    if (!currentCategory) {
      categoryNumber = mainMenuCategoryAt(selectedRow);
      if (!categoryNumber) {
        Pip.changeMenu("MISC.JS");
        return;
      }
      if (categoryNumber === -1) {
        if (saveSelection(-1)) {
          cancelWakeWatcher();
          if (global.__PipCoStartupRuntimeV210) {
            global.__PipCoStartupRuntimeV210.restore();
          }
          drawMenu();
        }
        return;
      }
      currentCategory = categoryNumber;
      selectedRow = 0;
      firstVisibleRow = 0;
      drawMenu();
      return;
    }

    categoryItemCount = countInstalledInCategory(currentCategory);
    if (selectedRow === categoryItemCount) {
      previousCategory = currentCategory;
      currentCategory = 0;
      selectedRow = 0;
      for (rowIndex = 0; rowIndex < mainMenuCount(); rowIndex++) {
        if (mainMenuCategoryAt(rowIndex) === previousCategory) {
          selectedRow = rowIndex;
          break;
        }
      }
      firstVisibleRow = 0;
      drawMenu();
      return;
    }

    startupIndex = startupIndexAt(currentCategory, selectedRow);
    if (startupIndex >= 0 && saveSelection(startupIndex)) drawMenu();
  }

  function removeApp() {
    if (closed) return;
    closed = 1;
    if (inputAttached) {
      Pip.removeListener("knob1", onKnob1);
      inputAttached = 0;
    }
    h.clear();
    installedBootups = undefined;
    titleImage = undefined;
    process.memory(true);
    E.defrag();
    if (activeStartup >= 0 && !global.__PipCoStartupRuntimeV210) loadWakeWatcher();
  }

  let coldSession = !(
    global.__PipCoStartupSessionV214 ||
    global.__PipCoStartupRuntimeV210 ||
    global.__PipCoStartupWakeV210
  );

  global.__PipCoStartupSessionV214 = 1;
  cancelWakeWatcher();
  stopLegacyRuntime();
  activeStartup = readSelection();
  if (coldSession && activeStartup !== -1) saveSelection(-1);
  scanInstalledBootups();
  if (activeStartup >= 0 && !installedBootups[activeStartup]) saveSelection(-1);

  try {
    titleImage = {
      width: 176,
      height: 98,
      bpp: 1,
      transparent: 0,
      buffer: fs.readFileSync(basePath + "TITLE.BIN")
    };
  } catch (error) {
    titleImage = undefined;
  }

  try {
    Pip.onExclusive("knob1", onKnob1);
    inputAttached = 1;
    drawMenu();
  } catch (error) {
    if (inputAttached) {
      Pip.removeListener("knob1", onKnob1);
      inputAttached = 0;
    }
    ignoreError("UI initialization failed: " + error);
    Pip.errorBox("PIP-CO Startup Systems\nUI INIT FAILED");
  }

  return {
    id: "STARTUPANIMATIONS",
    notDefault: true,
    fullscreen: true,
    remove: removeApp
  };
});
