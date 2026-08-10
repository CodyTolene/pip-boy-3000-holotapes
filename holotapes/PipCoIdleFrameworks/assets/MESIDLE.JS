(function (S, M, fs, h) {
  S.active = 1;
  S.preview = 0;
  S.mode = 3;
  try {
    let p = Pip.CURRENT;
    if (p && p.remove) p.remove();
    p = undefined;
    Pip.CURRENT = {
      id: 'PIPCOMESIDLE',
      fullscreen: true,
      notDefault: true,
      remove: function () {},
    };
    S.lastMenu = 'PIPCOMESIDLE';
  } catch (e) {}
  try {
    process.memory(true);
  } catch (e) {}
  try {
    E.defrag();
  } catch (e) {}
  let r;
  try {
    r = fs.readFileSync(M + S.mf);
    r = r.replace(/["']ram["']\s*;?/g, '').replace(/["']jit["']\s*;?/g, '');
    S.mo = eval(r)();
    r = undefined;
    if (!S.mo || !S.mo.draw) throw 0;
    if (S.mo.init) S.mo.init(0);
    h.reset();
    h.setClipRect(0, 0, 479, 319);
    h.clear();
    try {
      let o = Pip.blitOptions;
      Pip.blitOptions = { anim: [], idleIndex: 0, idleFilter: [307] };
      h.flip();
      Pip.blitOptions = o;
    } catch (x) {
      try {
        h.flip();
      } catch (y) {}
    }
    Pip.lastFlip = getTime();
  } catch (e) {
    r = undefined;
    S.mo = undefined;
    S.active = 0;
    S.mode = 0;
    S.last = getTime();
    try {
      process.memory(true);
    } catch (x) {}
    try {
      E.defrag();
    } catch (x) {}
    setTimeout(function () {
      try {
        Pip.changeMenu();
      } catch (x) {}
    }, 0);
    return;
  }
  function f() {
    if (!S.active || S.mode !== 3 || !S.mo) return;
    try {
      S.mo.draw(h);
      h.flip();
      Pip.lastFlip = getTime();
    } catch (e) {
      S.stop(0);
    }
  }
  f();
  S.loop = setInterval(f, 40);
});
