(function () {
  const n = h.getWidth(),
    t = h.getHeight(),
    o = n / 2,
    i = 178,
    e = 70,
    r = 52,
    l = 20,
    a = 5,
    s = 5,
    c = 16,
    u = 8,
    d = {};

  for (let n = 0; n < 8; n++) d[2 * n] = n;

  function f(n) {
    return -Math.PI / 2 + n * ((2 * Math.PI) / c);
  }

  function L(n) {
    const t = (2 * Math.PI) / c,
      e = f(n),
      r = 0.42 * t,
      l = 0.22 * t,
      a = 66,
      s = 84;
    return {
      a: e,
      outerR: s,
      x0: o + a * Math.cos(e - r),
      y0: i + a * Math.sin(e - r),
      x1: o + a * Math.cos(e + r),
      y1: i + a * Math.sin(e + r),
      x2: o + s * Math.cos(e + l),
      y2: i + s * Math.sin(e + l),
      x3: o + s * Math.cos(e - l),
      y3: i + s * Math.sin(e - l),
    };
  }

  function C(n) {
    const t = 5 * -Math.sin(n),
      e = 5 * Math.cos(n),
      l = o + 18 * Math.cos(n),
      a = i + 18 * Math.sin(n),
      s = o + r * Math.cos(n),
      c = i + r * Math.sin(n);
    (h.setColor(1),
      h.fillPoly([l + t, a + e, s + t, c + e, s - t, c - e, l - t, a - e]));
    (h.setColor(2), h.fillCircle(l, a, 5), h.fillCircle(s, c, 5));
  }

  let M = 'idle',
    T = [],
    p = 0,
    w = 0,
    S = 0,
    y = -1,
    P = 'HOLD LEFT WHEEL TO START',
    R = null;

  function v() {
    const o = 6,
      i = 10;
    (h.setColor(1),
      h.drawLine(6, 6, n - 6, 6),
      h.drawLine(n - 6, 6, n - 6, t - 6),
      h.drawLine(n - 6, t - 6, 6, t - 6),
      h.drawLine(6, t - 6, 6, 6),
      h.drawLine(i, i, n - i, i),
      h.drawLine(n - i, i, n - i, t - i),
      h.drawLine(n - i, t - i, i, t - i),
      h.drawLine(i, t - i, i, i));
    const e = 14;
    (h.drawLine(6, 20, 20, 6),
      h.drawLine(n - 6, 20, n - 6 - e, 6),
      h.drawLine(6, t - 6 - e, 20, t - 6),
      h.drawLine(n - 6, t - 6 - e, n - 6 - e, t - 6),
      h.drawLine(0.18 * n, 48, 0.82 * n, 48),
      h.drawLine(0.18 * n, t - 22, 0.82 * n, t - 22));
  }

  function A() {
    (h.setColor(1).fillCircle(o, i, e), h.setColor(0).fillCircle(o, i, r));
    for (const n in d) C(f(Number(n)));
    for (let n = 0; n < c; n++) {
      const t = d[n],
        e = void 0 !== t,
        r = void 0,
        l = void 0,
        a =
          (e && 'playback' === M && y === t) || (e && 'input' === M && S === t),
        s = L(n);
      if (
        (h.setColor(e ? (a ? 3 : 2) : 1),
        h.fillPoly([s.x0, s.y0, s.x1, s.y1, s.x2, s.y2, s.x3, s.y3]),
        e)
      ) {
        const n = o + 96 * Math.cos(s.a),
          e = i + 96 * Math.sin(s.a);
        h.setColor(a ? 3 : 2)
          .setFontMonofonto16()
          .setFontAlign(0, 0)
          .drawString(String(t + 1), n, e);
      }
    }
    h.setColor(1).fillCircle(o, i, l);
    h.setColor(2).drawCircle(o, i, l);
    h.setColor(3)
      .setFontMonofonto16()
      .setFontAlign(0, 0)
      .drawString('101', o, i);
  }

  function O() {
    h.clear(0);
    v();
    h.setColor(3)
      .setFontMonofonto28()
      .setFontAlign(0, 0)
      .drawString('SIGNAL MATCH', n / 2, 18)
      .setFontMonofonto16()
      .drawString('VAULT-TEC LOCK - ROUND ' + p, n / 2, 38)
      .drawString(P, n / 2, t - 14);
    A();
  }

  function F() {
    null !== R && (clearTimeout(R), (R = null));
  }

  function m(n) {
    if (n >= T.length)
      return (
        (M = 'input'),
        (w = 0),
        (S = 0),
        (P = 'TURN EITHER WHEEL, TAP LEFT TO CONFIRM'),
        O(),
        void 0
      );
    ((y = T[n]), Pip.playSound('SCROLL'), O());
    R = setTimeout(function () {
      ((y = -1), O());
      R = setTimeout(function () {
        m(n + 1);
      }, 180);
    }, 450);
  }

  function x() {
    p++;
    T.push(Math.randInt(8));
    ((M = 'playback'), (P = 'WATCH THE PATTERN'), O());
    R = setTimeout(function () {
      m(0);
    }, 600);
  }

  function H() {
    F();
    ((T = []), (p = 0), (w = 0), (S = 0), (y = -1));
    M = 'playback';
    x();
  }

  function b(n) {
    n === T[w]
      ? (Pip.playSound('TAB'),
        w++,
        w === T.length
          ? ((P = 'CORRECT!'), (M = 'idle'), O(), (R = setTimeout(x, 800)))
          : O())
      : ((M = 'gameover'),
        (P = 'WRONG - SCORE ' + (p - 1) + ' - HOLD LEFT TO RETRY'),
        O());
  }

  function I(n) {
    'input' === M && ((S = (S + n + 8) % 8), Pip.playSound('SCROLL'), O());
  }

  function N(n, t) {
    return n
      ? (I(n), void 0)
      : t
        ? (H(), void 0)
        : ('input' === M && b(S), void 0);
  }

  function k(n) {
    n && I(n);
  }

  Pip.audioStop();
  Pip.onExclusive('knob1', N);
  Pip.onExclusive('knob2', k);
  O();

  return {
    id: 'SIGNALMATCH',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      F();
      Pip.removeListener('knob1', N);
      Pip.removeListener('knob2', k);
      Pip.audioStop();
      h.clear();
    },
  };
});
