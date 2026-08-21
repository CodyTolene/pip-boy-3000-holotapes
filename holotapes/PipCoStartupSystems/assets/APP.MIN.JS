(function() {
const fs = require("fs"), B = "HOLO/STARTUP_ANIMATIONS/", S = B + "SELECT.JSON";
const LOGFILE = "pipco.txt";
function log(msg) {
try { if (Pip.log) Pip.log("PIPCO: " + msg, LOGFILE); } catch (e) {}
}
function ex(p) {
try { return !!fs.statSync(p); } catch (e) { return false; }
}
const STARTUPS = [
{ file: "MISTER.AVI",         label: "Mister Handy",               cat: "special", fade: 6250,  hard: 15000, eventEnd: 1  },
{ file: "VAULTGIRL.AVI",      label: "Vault Girl",                 cat: "special", fade: 3500,  hard: 12000, eventEnd: 1  },
{ file: "DEATHCLAW.AVI",      label: "Deathclaw Vault Experiment", cat: "special", fade: 3500,  hard: 13000, eventEnd: 1  },
{ file: "YESMAN.AVI",         label: "YES MAN",                    cat: "npc",     fade: 4917,  hard: 16000, eventEnd: 1  },
{ file: "ENCLAVE.AVI",        label: "The Enclave",                cat: "faction", fade: 5500,  hard: 9015  },
{ file: "BOS.AVI",            label: "The Brotherhood of Steel",   cat: "faction", fade: 5500,  hard: 9015  },
{ file: "MOTHMAN.AVI",        label: "Mothman",                    cat: "faction", fade: 5500,  hard: 9015  },
{ file: "MINUTEMEN.AVI",      label: "The Minutemen",              cat: "faction", fade: 5500,  hard: 16500, eventEnd: 1  },
{ file: "ENCLAVE_PIPBOY.AVI", label: "Enclave PIP-BOY",            cat: "special", fade: 26000, hard: 30500 },
{ file: "MRHOUSE.AVI",          label: "Mr. House",                  cat: "npc",     fade: 7667,  hard: 11182 }
];
const CAT_SPECIAL = [0, 1, 2, 8];
const CAT_FACTION = [4, 5, 7, 6];
const CAT_NPC = [3, 9];
let c = 0, s = 0, t, page = 0, ic = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let ownVideo = 0, ownAudio = 0, aHook, bHook, suppressCRT = 0;
let TI = { title: { width: 176, height: 98, bpp: 1, transparent: 0, buffer: fs.readFileSync(B + "TITLE.BIN") } };
const LEGACY_GLOBALS = [
"__SA18CRT", "__SA18A", "__SA22CleanBoot", "__SA22CleanAudio",
"__startupAnimationsOriginalAudioStartV5", "__startupAnimationsOriginalAudioStartV6",
"__startupAnimationsOriginalAudioStartV7", "__startupAnimationsOriginalAudioStartV8",
"__startupAnimationsStockAudioStartV9", "__startupAnimationsStockAudioStartV12",
"__startupAnimationsStockAudioV14",
"__pipcoOrigBoot", "__pipcoOrigAudio", "__pipcoCleaned"
];
for (let i = 0; i < LEGACY_GLOBALS.length; i++) {
try { if (Pip[LEGACY_GLOBALS[i]] !== undefined) delete Pip[LEGACY_GLOBALS[i]]; } catch (e) {}
}
let stockBootFn, stockAudioFn;
function captureOriginals() {
try {
let f = Pip.bootAnimation;
if (!stockBootFn && typeof f === "function") {
if (f.__pipcoHook && typeof f.__pipcoOriginal === "function") stockBootFn = f.__pipcoOriginal;
else if (!f.__pipcoHook) stockBootFn = f.bind(Pip);
}
} catch (e) { log("capture bootAnimation failed: " + e); }
try {
let f = Pip.audioStart;
if (!stockAudioFn && typeof f === "function") {
if (f.__pipcoHook && typeof f.__pipcoOriginal === "function") stockAudioFn = f.__pipcoOriginal;
else if (!f.__pipcoHook) stockAudioFn = f.bind(Pip);
}
} catch (e) { log("capture audioStart failed: " + e); }
}
captureOriginals();
function sel() {
try {
let n = JSON.parse(fs.readFileSync(S)).startup | 0;
return n >= -2 && n < STARTUPS.length ? n : -2;
} catch (e) { return -2; }
}
function saveSel(n) {
try { fs.writeFileSync(S, '{"startup":' + n + '}'); return 1; }
catch (e) { log("saveSel(" + n + ") failed: " + e); return 0; }
}
function vf(n) { return B + STARTUPS[n].file; }
function fm(n) { return STARTUPS[n].fade; }
function hm(n) { return STARTUPS[n].hard; }
function valid(n) { return n >= 0 && n < STARTUPS.length && ex(vf(n)); }
function safeVersion() {
try { if (typeof VERSION !== "undefined") return VERSION; } catch (e) {}
try { if (process.env && process.env.VERSION) return process.env.VERSION; } catch (e) {}
return "UNKNOWN";
}
function stockBoot() {
let m = process.memory(false), v = safeVersion();
h.clear();
return Pip.typeText(
"\n\n§§§*************** PIP-OS(R) V5.0.1.4 ***************\n\n" +
"COPYRIGHT 2068 ROBCO(R) §\n" +
"LOADER V" + v + "\n" +
"EXEC VERSION " + v + " §\n" +
(m.total * m.blocksize / 1e3).toFixed(0) + "K RAM SYSTEM\n" +
(m.free * m.blocksize) + " BYTES FREE\n" +
"NO HOLOTAPE FOUND §\n" +
"LOAD ROM(1): DEITRIX 2040... COMPLETE §\n" +
"\n\n\n\n\n\n\n\n\n\n\n\n\n", 40, 0, 400, 240);
}
function originalAudio() { return stockAudioFn; }
function originalBoot() { return stockBootFn || stockBoot; }
function restore() {
let q = originalAudio(), b = originalBoot();
if (t) { clearTimeout(t); t = undefined; }
if (ownVideo) { Pip.videoStop(); ownVideo = 0; }
if (ownAudio) { Pip.audioStop(); ownAudio = 0; }
if (aHook && Pip.audioStart === aHook && q) Pip.audioStart = q;
if (bHook && Pip.bootAnimation === bHook) Pip.bootAnimation = b;
aHook = undefined; bHook = undefined;
}
function hook() {
captureOriginals();
let q = originalAudio();
suppressCRT = 0;
if (q) {
aHook = function(p) {
let n = sel();
if (!valid(n)) { restore(); return q.apply(Pip, arguments); }
if (suppressCRT && p === "SOUND/FX/CRT_ON2.WAV") { suppressCRT = 0; return; }
return q.apply(Pip, arguments);
};
aHook.__pipcoHook = 1;
aHook.__pipcoOriginal = q;
Pip.audioStart = aHook;
} else {
aHook = undefined;
log("audioStart stock function unavailable; CRT suppression hook skipped");
}
bHook = function() {
let n = sel();
if (!valid(n)) { restore(); return stockBoot(); }
return new Promise(function(done) {
let a, b, d, e, vs, x = 0, vStart;
function end(reason, natural) {
if (x) return;
x = 1;
if (a) clearTimeout(a);
if (b) clearTimeout(b);
if (d) clearTimeout(d);
if (e) clearTimeout(e);
if (vs) {
try { Pip.removeListener("videoStopped", vs); } catch (ignore) {}
vs = undefined;
}
if (!natural) {
if (ownVideo) { Pip.videoStop(); ownVideo = 0; }
if (ownAudio) { Pip.audioStop(); ownAudio = 0; }
} else {
ownVideo = 0;
ownAudio = 0;
}
h.reset();
suppressCRT = 1;
log("end n=" + n + " reason=" + reason + " elapsedSinceVideoStart=" + (vStart ? (getTime() - vStart) * 1000 : "n/a"));
setTimeout(done, 160);
}
function play() {
if (x) return;
if (!valid(n)) {
x = 1; restore();
try { stockBoot().then(done); } catch (e) { log("stockBoot fallback (play) failed: " + e); done(); }
return;
}
Pip.videoStop(); Pip.audioStop(); h.clear(); h.flip();
function startVideo() {
if (x) return;
E.defrag();
try {
Pip.videoStart(vf(n), { x: 0, y: 0 });
ownVideo = 1; ownAudio = 1;
vStart = getTime();
} catch (e) {
log("videoStart(" + vf(n) + ") failed: " + e);
restore(); x = 1;
try { stockBoot().then(done); } catch (z) { done(); }
return;
}
if (STARTUPS[n].eventEnd) {
vs = function() {
if (x) return;
end("videoStopped", 1);
};
Pip.on("videoStopped", vs);
} else {
b = setTimeout(function() { end("fade", 0); }, fm(n) + (n === 8 ? 420 : 180));
}
}
if (n === 8) { e = setTimeout(function() { e = undefined; startVideo(); }, 260); return; }
startVideo();
}
try {
a = setTimeout(play, sel() === 8 ? 2150 : 1895);
d = setTimeout(function() { end("hard-failsafe", 0); }, hm(n));
} catch (e) {
log("hook() scheduling failed: " + e);
restore();
try { stockBoot().then(done); } catch (z) { done(); }
}
});
};
bHook.__pipcoHook = 1;
bHook.__pipcoOriginal = originalBoot();
Pip.bootAnimation = bHook;
}
function header() {
h.clear().setColor(3).setFontMonofonto16().setFontAlign(0, -1);
h.drawImage(TI.title, (480 - TI.title.width) >> 1, 6);
}
function scanInstalled() { for (let n = 0; n < STARTUPS.length; n++) ic[n] = valid(n) ? 1 : 0; }
function installed(n) { return n >= 0 && n < STARTUPS.length && ic[n]; }
function entriesFor(ids) {
let a = [];
for (let i = 0; i < ids.length; i++) if (installed(ids[i])) a.push([STARTUPS[ids[i]].label, ids[i]]);
return a;
}
function specialEntries() { return entriesFor(CAT_SPECIAL); }
function factionEntries() { return entriesFor(CAT_FACTION); }
function npcEntries() { return entriesFor(CAT_NPC); }
function mainEntries() {
let a = [["Default Bootup", -1, 0]];
if (specialEntries().length) a.push(["Special Bootups", -10, 1]);
if (factionEntries().length) a.push(["Faction Bootups", -11, 2]);
if (npcEntries().length) a.push(["NPC Bootups", -12, 3]);
a.push(["< Back", -99, -1]);
return a;
}
function pageEntries() {
if (page === 1) return specialEntries();
if (page === 2) return factionEntries();
if (page === 3) return npcEntries();
return mainEntries();
}
function draw() {
let y = 112, n, a = pageEntries();
header();
if (page === 0) {
for (n = 0; n < a.length; n++) {
if (c === n) Pip.shadeBox(24, y - 4, 456, y + 22);
h.setColor(3).setFontAlign(-1, -1).drawString(a[n][0], 38, y);
if (a[n][1] === -1 && s === -1) h.setFontAlign(1, -1).drawString("ACTIVE", 442, y);
y += 36;
}
} else {
for (n = 0; n < a.length; n++) {
if (c === n) Pip.shadeBox(24, y - 4, 456, y + 22);
h.setColor(3).setFontAlign(-1, -1).drawString(a[n][0], 38, y);
if (s === a[n][1]) h.setFontAlign(1, -1).drawString("ACTIVE", 442, y);
y += 36;
}
if (c === a.length) Pip.shadeBox(24, y - 4, 456, y + 22);
h.setColor(3).setFontAlign(-1, -1).drawString("< Back", 38, y);
}
}
function maxRow() { let a = pageEntries(); return page === 0 ? a.length - 1 : a.length; }
function activateStartup(id) {
if (!saveSel(id)) return;
s = id;
if (t) clearTimeout(t);
t = setTimeout(function() { t = undefined; hook(); }, 0);
draw();
}
function knob(d) {
if (d) {
c += d > 0 ? 1 : -1;
let m = maxRow();
if (c < 0) c = m;
if (c > m) c = 0;
Pip.playSound("SCROLL");
draw();
return;
}
Pip.playSound("SELECT");
if (page === 0) {
let a = mainEntries(), e = a[c];
if (e[1] === -99) { Pip.changeMenu("MISC.JS"); return; }
if (e[1] === -1) {
if (!saveSel(-1)) return;
s = -1; restore(); draw();
return;
}
page = e[2]; c = 0; draw();
return;
}
let a = pageEntries();
if (c === a.length) {
let old = page; page = 0; c = 0;
let m = mainEntries(), i;
for (i = 0; i < m.length; i++) if (m[i][2] === old) { c = i; break; }
draw();
return;
}
if (c < a.length) activateStartup(a[c][1]);
}
try {
s = sel();
scanInstalled();
if (s >= 0 && !valid(s)) { saveSel(-1); s = -1; }
if (s === -2) s = -1;
c = 0;
Pip.onExclusive("knob1", knob);
draw();
if (s < 0) restore();
else t = setTimeout(function() { t = undefined; hook(); }, 0);
} catch (e) {
log("init failed: " + e);
}
return {
id: "STARTUPANIMATIONS",
notDefault: true,
fullscreen: true,
remove: function() {
if (t) clearTimeout(t);
Pip.removeListener("knob1", knob);
if (ownVideo) { Pip.videoStop(); ownVideo = 0; }
if (ownAudio) { Pip.audioStop(); ownAudio = 0; }
h.clear();
}
};
});
