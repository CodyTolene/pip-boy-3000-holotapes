(function (params) {
  "use strict";

  var fs = require("fs");
  var FILE = "HOLO/HAMCO_LIGHT_CONTROL/LED.JSON";
  var W = h.getWidth ? h.getWidth() : 480;
  var H = h.getHeight ? h.getHeight() : 320;
  var dead = false;
  var index = 0;

  var NAMES = ["DEFAULT", "RED", "GREEN", "BLUE", "CYAN", "PURPLE", "AMBER", "WHITE", "OFF", "DISCO", "SLOW FADE", "PULSE", "WARNING FLASH", "RANDOM SPARK", "POLICE", "CANDLE FLICKER", "HEARTBEAT", "STROBE", "SCANNER", "TOXIC FLICKER"];
  var RGB = [
    [1, 0.5, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 1, 1],
    [0.65, 0, 1], [1, 0.34, 0], [1, 1, 1], [0, 0, 0]
  ];

  function readState() {
    try {
      var x = JSON.parse(fs.readFileSync(FILE));
      return [
        Math.max(0, Math.min(19, x.color | 0)),
        Math.max(0.25, Math.min(1, Number(x.level) || 1)),
        Math.max(0, Math.min(2, x.down | 0))
      ];
    } catch (e) { return [0, 1, 0]; }
  }

  function saveState() {
    try {
      var s = global.HAM_LED_STATE;
      fs.writeFileSync(FILE, JSON.stringify({ color: s[0], level: s[1], down: s[2] }));
    } catch (e) {}
  }

  function brightness() {
    var b = 1;
    try {
      if (Pip.settings && typeof Pip.settings.brightness === "number") b = Pip.settings.brightness;
      else if (typeof Pip.brightness === "number") b = Pip.brightness;
    } catch (e) {}
    return Math.max(0, Math.min(1, b));
  }

  function installPatch() {
    if (global.HAM_LED_PATCHED && global.HAM_LED_OLD_FADE) return;
    global.HAM_LED_OLD_FADE = Pip.fadeTo;
    global.HAM_LED_PATCHED = 1;

    var body = [
      "var G=global,S=G.HAM_LED_STATE,O=G.HAM_LED_OLD_FADE;",
      "if(!S||!O||(S[0]===0&&S[2]===0))return O(specs);",
      "var A=specs instanceof Array?specs:[specs],R=[],T=0,D=0,M=0,i,x,p;",
      "for(i=0;i<A.length;i++){x=A[i];p=x.pin;",
      "if(p===LED_RED||p===LED_GREEN||p===LED_BLUE){T=1;if(+x.target>M)M=+x.target;}",
      "else if(p===LED_DOWNFIRE){D=1;if(S[2]===0)R.push(x);}",
      "else R.push(x);}",
      "if(T){if(S[0]===0){for(i=0;i<A.length;i++){x=A[i];p=x.pin;if(p===LED_RED||p===LED_GREEN||p===LED_BLUE)R.push(x);}}",
      "else{var C=S[0]>=9?(G.HAM_LED_EFFECT_RGB||[1,0,0]):[[1,0.5,0],[1,0,0],[0,1,0],[0,0,1],[0,1,1],[.65,0,1],[1,.34,0],[1,1,1],[0,0,0]][S[0]],V=M*S[1];",
      "R.push({pin:LED_RED,target:V*C[0],stepFactor:1.1},{pin:LED_GREEN,target:V*C[1],stepFactor:1.1},{pin:LED_BLUE,target:V*C[2],stepFactor:1.1});}}",
      "if(D&&S[2])R.push({pin:LED_DOWNFIRE,target:S[2]===1?1:0,stepFactor:1.1});",
      "return O(specs instanceof Array?R:(R.length===1?R[0]:R));"
    ].join("");

    try { Pip.fadeTo = new Function("specs", body); }
    catch (e) {
      Pip.fadeTo = function (specs) { return global.HAM_LED_OLD_FADE(specs); };
      global.HAM_LED_PATCHED = 0;
    }
  }

  function stopEffect() {
    if (global.HAM_LED_EFFECT_TIMER) {
      try { clearInterval(global.HAM_LED_EFFECT_TIMER); } catch (e0) {}
      try { delete global.HAM_LED_EFFECT_TIMER; } catch (e1) { global.HAM_LED_EFFECT_TIMER = undefined; }
    }
    try {
      delete global.HAM_LED_EFFECT_RGB;
      delete global.HAM_LED_EFFECT_STEP;
      delete global.HAM_LED_EFFECT_PHASE;
    } catch (e2) {}
  }

  function startEffect(mode) {
    stopEffect();
    global.HAM_LED_EFFECT_STEP = 0;
    global.HAM_LED_EFFECT_PHASE = 0;
    global.HAM_LED_EFFECT_RGB = [1, 0, 0];

    var delay = mode === 10 ? 120 :
      (mode === 11 ? 80 :
      (mode === 12 ? 420 :
      (mode === 13 ? 180 :
      (mode === 14 ? 260 :
      (mode === 15 ? 110 :
      (mode === 16 ? 150 :
      (mode === 17 ? 70 :
      (mode === 18 ? 90 :
      (mode === 19 ? 140 : 280)))))))));
    var body = [
      "var G=global,S=G.HAM_LED_STATE,M=", String(mode), ";",
      "if(!S||S[0]!==M){if(G.HAM_LED_EFFECT_TIMER){clearInterval(G.HAM_LED_EFFECT_TIMER);G.HAM_LED_EFFECT_TIMER=undefined;}return;}",
      "var i=G.HAM_LED_EFFECT_STEP||0,p=G.HAM_LED_EFFECT_PHASE||0,C=[1,0,0],v=S[1],q;",
      "if(M===9){var A=[[1,0,0],[1,.35,0],[0,1,0],[0,1,1],[0,0,1],[.65,0,1],[1,0,.35]];C=A[i%A.length];i++;}",
      "else if(M===10){p=(p+.035)%6;var z=p|0,f=p-z;var A=[[1,f,0],[1-f,1,0],[0,1,f],[0,1-f,1],[f,0,1],[1,0,1-f]];C=A[z];}",
      "else if(M===11){p=(p+.12)%(Math.PI*2);q=.12+.88*((Math.sin(p)+1)/2);C=[0,q,1];}",
      "else if(M===12){q=(i%2)?0:1;C=[q,0,0];i++;}",
      "else if(M===13){q=Math.random();C=q<.33?[1,0,0]:(q<.66?[0,1,0]:[0,0,1]);v*=.35+Math.random()*.65;i++;}",
      "else if(M===14){C=(i%2)?[0,0,1]:[1,0,0];i++;}",
      "else if(M===15){q=.45+Math.random()*.55;C=[1,q*.45,0];v*=q;i++;}",
      "else if(M===16){var H=[1,.15,0,.75,.1,0,0,0];q=H[i%H.length];C=[1,0,0];v*=q;i++;}",
      "else if(M===17){q=(i%2)?0:1;C=[1,1,1];v*=q;i++;}",
      "else if(M===18){p=(p+.18)%(Math.PI*2);q=(Math.sin(p)+1)/2;C=[0,q,1-q*.65];v*=.2+.8*q;}",
      "else{q=.2+Math.random()*.8;C=[.15,1,.05];v*=q;i++;}",
      "G.HAM_LED_EFFECT_STEP=i;G.HAM_LED_EFFECT_PHASE=p;G.HAM_LED_EFFECT_RGB=C;",
      "var r=Math.max(0,Math.min(1,v*C[0])),g=Math.max(0,Math.min(1,v*C[1])),b=Math.max(0,Math.min(1,v*C[2]));",
      "try{analogWrite(LED_RED,r);analogWrite(LED_GREEN,g);analogWrite(LED_BLUE,b);}",
      "catch(e){try{LED_RED.write(r>.01);LED_GREEN.write(g>.01);LED_BLUE.write(b>.01);}catch(e2){}}"
    ].join("");
    try { global.HAM_LED_EFFECT_TIMER = setInterval(new Function(body), delay); } catch (e) {}
  }

  function applyNow() {
    var s = global.HAM_LED_STATE, c = s[0] >= 9 ? (global.HAM_LED_EFFECT_RGB || [1, 0, 0]) : RGB[s[0]], b = brightness() * s[1], f = global.HAM_LED_OLD_FADE || Pip.fadeTo;
    if (s[0] >= 9) startEffect(s[0]); else stopEffect();
    try {
      if (s[0] === 0) Pip.setBrightness(brightness());
      else f([
        { pin: LED_RED, target: b * c[0], stepFactor: 1.1 },
        { pin: LED_GREEN, target: b * c[1], stepFactor: 1.1 },
        { pin: LED_BLUE, target: b * c[2], stepFactor: 1.1 }
      ]);
    } catch (e0) {}
    try {
      if (s[2] === 0 && Pip.checkChargeStatus) Pip.checkChargeStatus(true);
      else f({ pin: LED_DOWNFIRE, target: s[2] === 1 ? brightness() : 0, stepFactor: 1.1 });
    } catch (e1) {}
  }

  function resetDefault() {
    stopEffect();
    global.HAM_LED_STATE = [0, 1, 0];
    saveState();
    try { if (global.HAM_LED_OLD_FADE) Pip.fadeTo = global.HAM_LED_OLD_FADE; } catch (e0) {}
    try { delete global.HAM_LED_OLD_FADE; delete global.HAM_LED_PATCHED; } catch (e1) {}
    try { Pip.setBrightness(brightness()); } catch (e2) {}
    try { if (Pip.checkChargeStatus) Pip.checkChargeStatus(true); } catch (e3) {}
  }

  global.HAM_LED_STATE = readState();
  installPatch();
  applyNow();

  var ITEMS = NAMES.concat(["BRIGHTNESS", "DOWNLIGHT", "RESET DEFAULT + EXIT", "EXIT / KEEP COLOR"]);

  function font(n) {
    try { if (n > 18) h.setFontMonofonto23(); else h.setFontMonofonto16(); }
    catch (e) { h.setFont("6x8", 2); }
    return h;
  }

  function draw() {
    var s = global.HAM_LED_STATE, start = Math.max(0, Math.min(ITEMS.length - 8, index - 3));
    var i, n, y, label;
    h.clear(1).setColor(3).setBgColor(0);
    font(23).setFontAlign(0, -1).drawString("HAMCo LIGHT CONTROL", W / 2, 10);
    h.drawLine(16, 40, W - 16, 40);
    for (i = 0; i < 8 && start + i < ITEMS.length; i++) {
      n = start + i; y = 57 + i * 27; label = ITEMS[n];
      if (n === index) h.fillRect(18, y - 2, W - 18, y + 21).setColor(0);
      font(16).setFontAlign(-1, -1).drawString(label, 30, y);
      if (n < NAMES.length && n === s[0]) h.setFontAlign(1, -1).drawString("ACTIVE", W - 28, y);
      else if (n === NAMES.length) h.setFontAlign(1, -1).drawString(Math.round(s[1] * 100) + "%", W - 28, y);
      else if (n === NAMES.length + 1) h.setFontAlign(1, -1).drawString(["DEFAULT", "ON", "OFF"][s[2]], W - 28, y);
      h.setColor(3).setBgColor(0);
    }
    h.drawLine(12, H - 30, W - 12, H - 30);
    font(16).setFontAlign(0, -1).drawString("RIGHT MOVE  |  LEFT PRESS SELECT", W / 2, H - 23);
    h.flip();
  }

  function sound(n) { try { Pip.playSound(n); } catch (e) {} }

  function move(d) {
    if (dead || !d) return;
    index = (index + (d > 0 ? 1 : -1) + ITEMS.length) % ITEMS.length;
    sound("NEXT"); draw();
  }

  function choose(d) {
    if (dead || d !== 0) return;
    var s = global.HAM_LED_STATE;
    if (index < NAMES.length) s[0] = index;
    else if (index === NAMES.length) { s[1] += 0.25; if (s[1] > 1) s[1] = 0.25; }
    else if (index === NAMES.length + 1) s[2] = (s[2] + 1) % 3;
    else if (index === NAMES.length + 2) { sound("OK"); resetDefault(); return exit(); }
    else { sound("OK"); saveState(); applyNow(); return exit(); }
    saveState(); applyNow(); sound("OK"); draw();
  }

  function cleanup() {
    if (dead) return;
    dead = true;
    try { Pip.removeListener("knob1", choose); } catch (e0) {}
    try { Pip.removeListener("knob2", move); } catch (e1) {}
    try { h.setClipRect(0, 0, W - 1, H - 1); } catch (e2) {}
    try {
      if (global.HAM_LED_UI_CLEANUP === cleanup) delete global.HAM_LED_UI_CLEANUP;
    } catch (e3) { global.HAM_LED_UI_CLEANUP = undefined; }
  }

  function exit() {
    cleanup();
    try { Pip.changeMenu(); } catch (e) {}
  }

  try { if (global.HAM_LED_UI_CLEANUP) global.HAM_LED_UI_CLEANUP(); } catch (eOld) {}
  global.HAM_LED_UI_CLEANUP = cleanup;
  try { Pip.onExclusive("knob1", choose); } catch (e0) { try { Pip.on("knob1", choose); } catch (e1) {} }
  try { Pip.onExclusive("knob2", move); } catch (e2) { try { Pip.on("knob2", move); } catch (e3) {} }
  draw();

  return { id: "HAMCO_LIGHT_CONTROL", notDefault: true, fullscreen: true, remove: cleanup };
})
