(function (S, M, fs, h) {
  S.active = 1;
  S.mode = 3;
  E.defrag();
  try {
    S.mo = eval(fs.readFileSync(M + (S.previewFile || S.mf)))();
    if (!S.mo || !S.mo.draw) throw new Error('Invalid Mesmetron module');
    if (S.mo.init) S.mo.init(0);
    if (S.mo.remove) S.mo.remove();
    if (S.attachInputs) S.attachInputs();
    h.reset().setClipRect(0, 0, 479, 319).clear();
  } catch (e) {
    if (S.attachInputs) S.attachInputs();
    S.mo = undefined;
    S.active = 0;
    S.mode = 0;
    S.last = getTime();
    setTimeout(function () {
      Pip.changeMenu();
    }, 0);
    return;
  }

  function frame() {
    'ram';
    if (!S.active || S.mode !== 3 || !S.mo) return;
    try {
      S.mo.draw(h);
      h.flip();
      Pip.lastFlip = getTime();
    } catch (e) {
      S.stop(1);
    }
  }

  frame();
  S.loop = setInterval(frame, 40);
});
