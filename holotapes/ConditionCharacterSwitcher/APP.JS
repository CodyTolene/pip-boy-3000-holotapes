(function () {
  var fs = require('fs'),
    BASE = 'HOLO/CHARSWITCHER/',
    CHARDIR = BASE + 'chars/',
    LIVE = 'JS/STATUS_CND.JS';
  var RENDERER = BASE + 'RENDERER.JS',
    // .boot0 always belongs to the Fallout companion app and is never
    // read or written here. Espruino on this device supports up to 4
    // boot-time Storage scripts (.boot0-.boot3, all run at boot), so
    // this app claims whichever of the other three is available instead
    // of fighting the companion app for .boot0.
    BOOT_SLOTS = ['.boot1', '.boot2', '.boot3'],
    BOOT_MARK = '"CNDMKV_BOOT_V1";',
    ACTIVEKEY = 'CNDMKV.active',
    RENDERKEY = 'CNDMKV.render';

  function read(path) {
    try {
      return fs.readFileSync(path);
    } catch (e) {
      return undefined;
    }
  }

  function readUint32LE(s, byteOffset) {
    return (
      s.charCodeAt(byteOffset) |
      (s.charCodeAt(byteOffset + 1) << 8) |
      (s.charCodeAt(byteOffset + 2) << 16) |
      (s.charCodeAt(byteOffset + 3) << 24)
    );
  }

  // "Limbs" character files (.char) are [4-byte manifest length][manifest
  // JSON][image table][image data] - reads only the small manifest prefix,
  // never the image data after it, matching RENDERER.JS's own
  // readLimbsManifest (including _imageTableOffset, which the preview
  // below needs to find the images without re-deriving this math itself).
  function readLimbsManifestHeader(path) {
    try {
      var f = E.openFile(path, 'r');
      var manifestLength = readUint32LE(f.read(4), 0);
      var manifestText = f.read(manifestLength);
      f.close();
      var manifest = JSON.parse(manifestText);
      manifest._imageTableOffset = 4 + manifestLength;
      return manifest;
    } catch (e) {
      return undefined;
    }
  }

  function listCharacters() {
    var entries,
      characters = [];
    try {
      entries = fs.readdir(CHARDIR.slice(0, -1));
    } catch (e) {
      entries = [];
    }
    for (var i = 0; i < entries.length; i++) {
      var filename = entries[i];
      if (filename.toUpperCase() === 'ACTIVE.JSON') continue;
      var isJSON = filename.slice(-5).toLowerCase() === '.json';
      var isChar = filename.slice(-5).toLowerCase() === '.char';
      if (!isJSON && !isChar) continue;
      var manifest;
      if (isChar) {
        manifest = readLimbsManifestHeader(CHARDIR + filename);
      } else {
        var data = read(CHARDIR + filename);
        if (!data) continue;
        try {
          manifest = JSON.parse(data);
        } catch (e) {
          continue;
        }
      }
      if (!manifest) continue;
      characters.push({ file: filename, name: manifest.name || filename });
    }
    return characters;
  }
  var CHARACTERS = listCharacters();

  function activeCharFile() {
    try {
      return require('Storage').read(ACTIVEKEY);
    } catch (e) {
      return undefined;
    }
  }

  // Finds whichever of BOOT_SLOTS currently holds OUR OWN patch (its
  // content starts with BOOT_MARK). At most one slot should ever match -
  // used to update in place on re-activate/switch, and to know exactly
  // what to erase on uninstall, without disturbing any other mod's slot.
  function findOwnSlot() {
    for (var i = 0; i < BOOT_SLOTS.length; i++) {
      var c = require('Storage').read(BOOT_SLOTS[i]);
      if (c && c.indexOf(BOOT_MARK) === 0) return BOOT_SLOTS[i];
    }
    return undefined;
  }

  // First slot with nothing in it yet (some other mod may already own one
  // of BOOT_SLOTS - that slot is left untouched and skipped over).
  function findFreeSlot() {
    for (var i = 0; i < BOOT_SLOTS.length; i++) {
      if (!require('Storage').read(BOOT_SLOTS[i])) return BOOT_SLOTS[i];
    }
    return undefined;
  }

  function activate(character) {
    try {
      var current = fs.readFileSync(RENDERER);
      if (require('Storage').read(RENDERKEY) !== current) {
        require('Storage').write(RENDERKEY, current);
      }
    } catch (e) {}
    var patch =
      BOOT_MARK +
      '(function(){var fs=require("fs"),D="' +
      CHARDIR +
      '";fs.writeFileSync(D+"ACTIVE.JSON",JSON.stringify({file:' +
      JSON.stringify(character.file) +
      '}));var orig=fs.readFileSync.bind(fs),L="' +
      LIVE +
      '",R="' +
      RENDERER +
      '",K="' +
      RENDERKEY +
      '";fs.readFileSync=function(p){if(p!==L)return orig(p);var s=require("Storage").read(K);return s!==undefined?s:orig(R);};})();';
    var slot = findOwnSlot() || findFreeSlot();
    if (!slot) {
      // .boot1-.boot3 are all in use by other mods and .boot0 is
      // reserved for the companion app - nothing safe to write to.
      console.log(
        'CHARSWITCHER: no free boot slot (.boot1-.boot3 all in use), character not activated',
      );
      return;
    }
    try {
      require('Storage').write(slot, patch);
      require('Storage').write(ACTIVEKEY, character.file);
    } catch (e) {}
  }

  function uninstall() {
    // Erases only the single slot this app claimed, if any - .boot0 and
    // any other mod's slot are never touched.
    try {
      var slot = findOwnSlot();
      if (slot) require('Storage').erase(slot);
      require('Storage').erase(ACTIVEKEY);
      require('Storage').erase(RENDERKEY);
    } catch (e) {}
  }

  // Right-side preview of whichever character the scroller's cursor is
  // currently on - a scaled-to-fit, single "healthy" pose snapshot, with
  // its condition bars (all shown full) and name/level tag, matching what
  // a freshly-activated character actually looks like on the real CND
  // screen. Animated packs show their first frame rather than actually
  // animating.
  var PREVIEW_X0 = 212,
    PREVIEW_Y0 = BR.y,
    PREVIEW_W = 480 - PREVIEW_X0,
    PREVIEW_H = BR.h;
  // Leaves a little breathing room and never scales a character up past its
  // native size even if its natural bbox is small.
  var PREVIEW_MARGIN = 0.92;

  // Matches RENDERER.JS's own LIMB_IMAGE_KEYS order exactly - needed here
  // only to walk the image table to the same offsets, not because a
  // preview draws every one of these.
  var LIMB_IMAGE_KEYS = [
    'head',
    'head_broken',
    'torso',
    'torso_broken',
    'left_arm',
    'left_arm_broken',
    'right_arm',
    'right_arm_broken',
    'left_leg',
    'left_leg_broken',
    'right_leg',
    'right_leg_broken',
    'face_00',
    'face_01',
    'face_02',
    'face_03',
    'face_04',
    'face_10',
  ];
  var DEFAULT_IMAGE_POSITIONS = {
    head: { x: 215, y: 70 },
    face: { x: 224, y: 88 },
    torso: { x: 205, y: 122 },
    left_arm: { x: 260, y: 122 },
    right_arm: { x: 150, y: 120 },
    left_leg: { x: 234, y: 175 },
    right_leg: { x: 182, y: 175 },
  };
  var DEFAULT_BAR_POSITIONS = {
    head: { x: 238, y: 60 },
    tors: { x: 238, y: 138 },
    rArm: { x: 160, y: 110, rightCap: 1 },
    lArm: { x: 315, y: 110, leftCap: 1 },
    rLeg: { x: 160, y: 208, rightCap: 1 },
    lLeg: { x: 315, y: 208, leftCap: 1 },
  };
  function imagePos(positions, key) {
    return (positions && positions[key]) || DEFAULT_IMAGE_POSITIONS[key];
  }
  function barPos(bars, key) {
    return (bars && bars[key]) || DEFAULT_BAR_POSITIONS[key];
  }

  function imgByte(img, i) {
    return typeof img === 'string' ? img.charCodeAt(i) : img[i];
  }

  function extendBbox(bbox, x1, y1, x2, y2) {
    bbox.minX = Math.min(bbox.minX, x1);
    bbox.minY = Math.min(bbox.minY, y1);
    bbox.maxX = Math.max(bbox.maxX, x2);
    bbox.maxY = Math.max(bbox.maxY, y2);
  }
  function barsBbox(bbox, bars) {
    for (var key in DEFAULT_BAR_POSITIONS) {
      var b = barPos(bars, key);
      extendBbox(
        bbox,
        b.x + (b.leftCap ? -30 : -19),
        b.y - 5,
        b.x + (b.rightCap ? 30 : 19),
        b.y + 4,
      );
    }
  }
  // Fits a natural-coordinate bbox into the preview slot. Draw any
  // natural-coordinate point (sx,sy) at (tx.tx + sx*tx.k, tx.ty + sy*tx.k).
  function fitPreview(bbox) {
    var bboxW = Math.max(1, bbox.maxX - bbox.minX),
      bboxH = Math.max(1, bbox.maxY - bbox.minY);
    var k = Math.min(
      1,
      PREVIEW_MARGIN * Math.min(PREVIEW_W / bboxW, PREVIEW_H / bboxH),
    );
    return {
      k: k,
      tx: PREVIEW_X0 + (PREVIEW_W - bboxW * k) / 2 - bbox.minX * k,
      ty: PREVIEW_Y0 + (PREVIEW_H - bboxH * k) / 2 - bbox.minY * k,
    };
  }

  // Same shape as RENDERER.JS's own bar(), with every offset scaled by k
  // too so the bar shrinks along with the character instead of looking
  // oversized next to it.
  function drawPreviewBar(x, y, leftCap, rightCap, k) {
    h.fillRect(x - 19 * k, y - 5 * k, x + 19 * k, y - 4 * k);
    if (leftCap)
      h.fillRect(x - 30 * k, y - 5 * k, x - 19 * k, y - 4 * k).fillPoly([
        x - 18 * k,
        y - 4 * k,
        x - 25 * k,
        y - 4 * k,
        x - 18 * k,
        y + 4 * k,
      ]);
    else h.fillRect(x - 19 * k, y - 4 * k, x - 18 * k, y + 4 * k);
    if (rightCap)
      h.fillRect(x + 19 * k, y - 5 * k, x + 30 * k, y - 4 * k).fillPoly([
        x + 18 * k,
        y - 4 * k,
        x + 25 * k,
        y - 4 * k,
        x + 18 * k,
        y + 4 * k,
      ]);
    else h.fillRect(x + 18 * k, y - 4 * k, x + 19 * k, y + 4 * k);
    h.fillRect(x - 16 * k, y - 2 * k, x + 16 * k, y + 4 * k);
  }
  function drawPreviewBars(bars, tx) {
    h.setColor(3);
    for (var key in DEFAULT_BAR_POSITIONS) {
      var b = barPos(bars, key);
      drawPreviewBar(
        tx.tx + b.x * tx.k,
        tx.ty + b.y * tx.k,
        b.leftCap,
        b.rightCap,
        tx.k,
      );
    }
  }
  function drawAnimatedPreview(path) {
    var manifest = JSON.parse(fs.readFileSync(path));
    var bbox = {
      minX: manifest.x,
      minY: manifest.y,
      maxX: manifest.x + manifest.frameW,
      maxY: manifest.y + manifest.frameH,
    };
    barsBbox(bbox, manifest.bars);
    var tx = fitPreview(bbox);
    var f = E.openFile(manifest.pack, 'r');
    try {
      f.seek(manifest.stateOffsets[0] * manifest.frameSize);
      var frame = f.read(manifest.frameSize);
      if (frame)
        h.drawImage(
          frame,
          Math.round(tx.tx + manifest.x * tx.k),
          Math.round(tx.ty + manifest.y * tx.k),
          { scale: tx.k },
        );
    } finally {
      f.close();
    }
    drawPreviewBars(manifest.bars, tx);
  }

  function drawLimbsPreview(path) {
    var manifest = readLimbsManifestHeader(path);
    if (!manifest) return;
    var decompress = require('heatshrink').decompress;
    var headerSize = LIMB_IMAGE_KEYS.length * 4;
    var f = E.openFile(path, 'r');
    try {
      f.seek(manifest._imageTableOffset);
      var header = f.read(headerSize);
      var offset = manifest._imageTableOffset + headerSize;
      var offsets = {},
        lens = {};
      for (var i = 0; i < LIMB_IMAGE_KEYS.length; i++) {
        var len = readUint32LE(header, i * 4);
        offsets[LIMB_IMAGE_KEYS[i]] = offset;
        lens[LIMB_IMAGE_KEYS[i]] = len;
        offset += len;
      }
      var parts = [
        'head',
        'face_00',
        'torso',
        'left_arm',
        'right_arm',
        'left_leg',
        'right_leg',
      ];
      var bbox = {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
      };
      parts.forEach(function (key) {
        f.seek(offsets[key]);
        var img = decompress(f.read(lens[key]));
        if (!img) return;
        var pos = imagePos(
          manifest.positions,
          key === 'face_00' ? 'face' : key,
        );
        // Decoded image format is [W,H,bpp|0x80,0,...] - see
        // RENDERER.JS/condition-editor.html's own decoders.
        extendBbox(
          bbox,
          pos.x,
          pos.y,
          pos.x + imgByte(img, 0),
          pos.y + imgByte(img, 1),
        );
      });
      barsBbox(bbox, manifest.bars);
      var tx = fitPreview(bbox);
      parts.forEach(function (key) {
        f.seek(offsets[key]);
        var img = decompress(f.read(lens[key]));
        if (!img) return;
        var pos = imagePos(
          manifest.positions,
          key === 'face_00' ? 'face' : key,
        );
        h.drawImage(
          img,
          Math.round(tx.tx + pos.x * tx.k),
          Math.round(tx.ty + pos.y * tx.k),
          { scale: tx.k },
        );
      });
      drawPreviewBars(manifest.bars, tx);
    } finally {
      f.close();
    }
  }

  function drawPreview(item) {
    h.setBgColor(0)
      .clearRect(PREVIEW_X0, PREVIEW_Y0, 480, PREVIEW_Y0 + PREVIEW_H)
      .setColor(3);
    if (!item.file) return; // "None" - nothing to preview
    try {
      if (/\.char$/i.test(item.file)) drawLimbsPreview(CHARDIR + item.file);
      else drawAnimatedPreview(CHARDIR + item.file);
    } catch (e) {}
  }

  // First list entry is the "revert to stock" option - not a real
  // character file, so it's kept out of CHARACTERS itself and only
  // spliced into the on-screen list. activeIndex follows the same
  // 0=None, 1..N=CHARACTERS[0..N-1] indexing the old settings-style menu
  // already used, just now also indexing LIST_ITEMS directly.
  var LIST_ITEMS = [{ file: undefined, name: 'None' }].concat(CHARACTERS);
  var activeIndex = 0;
  var startingActiveFile = activeCharFile();
  for (var charIndex = 0; charIndex < CHARACTERS.length; charIndex++) {
    if (CHARACTERS[charIndex].file === startingActiveFile) {
      activeIndex = charIndex + 1;
      break;
    }
  }

  h.clear().setColor(3).setBgColor(0).setFontMonofonto16().setFontAlign(0, -1);
  h.drawString('CND Character Switcher', 240, 10);
  h.drawLine(36, 34, 444, 34);

  // Pip.createScroller is the same scrollable-list widget stock uses for
  // inventory screens - handles highlight, knob1 scrolling/click,
  // and the up/down arrows + scrollbar once the list overflows on screen.
  var scroller = Pip.createScroller({
    itemCount: LIST_ITEMS.length,
    width: 185,
    hasEquipStates: true,
    scrollStart: 0,
    getItem: function (i) {
      return {
        txt: LIST_ITEMS[i].name,
        activ: i === activeIndex,
        file: LIST_ITEMS[i].file,
      };
    },
    render: drawPreview,
    onClick: function (i) {
      if (i === activeIndex) return;
      activeIndex = i;
      Pip.playSound('SELECT');
      if (i === 0) uninstall();
      else activate(CHARACTERS[i - 1]);
      scroller.updateItemCount(LIST_ITEMS.length);
    },
  });
  return {
    id: 'CHARSWITCHER',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      scroller.remove();
      h.clear();
      // Reclaims whatever activate()/uninstall() left as garbage this
      // session (Storage is journaling - see activate()'s own comment)
      // before rebooting, rather than letting it accumulate
      // across many separate sessions until Storage runs out.
      try {
        require('Storage').compact(true);
      } catch (e) {}
      E.reboot();
    },
  };
});
