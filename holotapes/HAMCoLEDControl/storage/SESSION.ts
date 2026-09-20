(function (d: HamLedState | object | undefined) {
  'use strict';
  var svc: HamLedService | undefined,
    st: HamLedState,
    step = 0,
    timer = 0,
    native = Pip.fadeTo;

  function lim(v: number, a: number, b: number, z: number): number {
    v = v | 0;
    if (v < a || v > b) v = z;
    return v;
  }

  function bright(): number {
    var b = 1;
    try {
      if (typeof Pip.brightness === 'number') b = Pip.brightness;
    } catch (e) {}
    return b < 0 ? 0 : b > 1 ? 1 : b;
  }

  function clean(x?: HamLedState | object): HamLedState {
    let src = (x || {}) as HamLedState;
    return {
      enabled: src.enabled ? 1 : 0,
      fx: lim(src.fx, 0, 21, 1),
      ca: lim(src.ca, 0, 12, 0),
      cb: lim(src.cb, 0, 12, 3),
      spd: lim(src.spd, 0, 2, 1),
      level: Math.max(0.25, Math.min(1, Number(src.level) || 1)),
    };
  }

  function pin(a: Pin | undefined, b: Pin): boolean {
    try {
      return !!(a && b && a.toString() === b.toString());
    } catch (e) {
      return a === b;
    }
  }

  function rgb(c: number, i: number): void {
    var r = 1,
      g = 0.5,
      b = 0;
    if (c === 1) g = b = 0;
    else if (c === 2) {
      r = 0.1;
      g = 1;
      b = 0.05;
    } else if (c === 3) {
      r = 0;
      g = 0.25;
      b = 1;
    } else if (c === 4) {
      r = 0;
      g = b = 1;
    } else if (c === 5) {
      r = 0.65;
      g = 0;
      b = 1;
    } else if (c === 6) r = g = b = 1;
    else if (c === 7) {
      g = 0.75;
      b = 0.45;
    } else if (c === 8) {
      r = b = 0;
      g = 1;
    } else if (c === 9) {
      g = 0.35;
      b = 0;
    } else if (c === 10) {
      g = 0;
      b = 0.35;
    } else if (c === 11) {
      r = 0.45;
      g = 0.85;
      b = 1;
    } else if (c === 12) {
      g = 0.85;
      b = 0;
    }
    out(r, g, b, i);
  }

  function mix(a: number[], b: number[], x: number, i: number): void {
    var va = bright() * st.level * i;
    try {
      native([
        { pin: LED_RED, target: (a[0] + (b[0] - a[0]) * x) * va },
        { pin: LED_GREEN, target: (a[1] + (b[1] - a[1]) * x) * va },
        { pin: LED_BLUE, target: (a[2] + (b[2] - a[2]) * x) * va },
      ]);
    } catch (e) {}
  }

  function val(c: number): number[] {
    if (c === 1) return [1, 0, 0];
    if (c === 2) return [0.1, 1, 0.05];
    if (c === 3) return [0, 0.25, 1];
    if (c === 4) return [0, 1, 1];
    if (c === 5) return [0.65, 0, 1];
    if (c === 6) return [1, 1, 1];
    if (c === 8) return [0, 1, 0];
    if (c === 10) return [1, 0, 0.35];
    if (c === 11) return [0.45, 0.85, 1];
    if (c === 12) return [1, 0.85, 0];
    return [1, c === 7 ? 0.75 : c === 9 ? 0.35 : 0.5, c === 7 ? 0.45 : 0];
  }

  function out(r: number, g: number, b: number, i: number): void {
    var v = bright() * st.level * Math.max(0, Math.min(1, i));
    try {
      native([
        { pin: LED_RED, target: r * v },
        { pin: LED_GREEN, target: g * v },
        { pin: LED_BLUE, target: b * v },
      ]);
    } catch (e) {}
  }

  function stop(): void {
    if (timer) clearInterval(timer);
    timer = 0;
  }

  function offFade(x: LedFadeSpec[] | LedFadeSpec): boolean | 0 {
    var a: LedFadeSpec[] = x instanceof Array ? x : [x],
      hit = 0,
      max = 0,
      i!: number,
      t!: number,
      spec!: LedFadeSpec;
    for (i = 0; i < a.length; i++) {
      spec = a[i] || { pin: LED_RED, target: 0 };
      if (
        pin(spec.pin, LED_RED) ||
        pin(spec.pin, LED_GREEN) ||
        pin(spec.pin, LED_BLUE) ||
        pin(spec.pin, LED_DOWNFIRE)
      ) {
        hit = 1;
        t = Number(spec.target);
        if (!isNaN(t) && t > max) max = t;
      }
    }
    return hit && max <= 0.01 ? true : 0;
  }

  function patched(x: LedFadeSpec[]): void {
    if (offFade(x)) {
      restore(0);
      return native(x);
    }
    return native(x);
  }

  function frame(): void {
    var f = st.fx,
      q!: number,
      a!: number | number[],
      b!: number | number[];
    if (!st.enabled) return;
    q = step++;
    if (f === 0) rgb(st.ca, 1);
    else if (f === 1) {
      a = 28;
      b = (q / a) | 0;
      mix(val(b % 13), val((b + 1) % 13), (q % a) / (a - 1), 1);
    } else if (f === 2)
      out(q % 14 < 5 ? 1 : 0, 0, q % 14 > 6 && q % 14 < 12 ? 1 : 0, 1);
    else if (f === 3) {
      a = val(st.ca);
      b = val(st.cb);
      q %= 28;
      mix(a, b, q / 27, 1);
    } else if (f === 9 || f === 13 || f === 18 || f === 20)
      rgb(st.ca, q % 8 < 2 ? 1 : 0.05);
    else if (f === 4 || f === 6 || f === 11 || f === 15) {
      q %= 30;
      if (q > 15) q = 30 - q;
      rgb(st.ca, 0.15 + q / 16);
    } else {
      q = (q * (f + 7)) % 29;
      rgb(st.ca, q < 4 ? 1 : 0.12 + q / 40);
    }
  }

  function interval(): number {
    var d = st.fx === 2 || st.fx === 18 || st.fx === 20 ? 80 : 150;
    if (st.spd === 0) d *= 2;
    else if (st.spd === 2) d = 55;
    return d;
  }

  function restore(light: boolean | number): void {
    stop();
    st.enabled = 0;
    try {
      if (Pip.fadeTo === patched) Pip.fadeTo = native;
    } catch (e0) {}
    try {
      global.HAM_LED_SESSION = undefined;
    } catch (e1) {}
    if (light) {
      try {
        if (Pip.setBrightness && typeof Pip.brightness === 'number')
          Pip.setBrightness(Pip.brightness);
      } catch (e2) {}
      try {
        if (Pip.checkChargeStatus) Pip.checkChargeStatus(true);
      } catch (e3) {}
      out(1, 0.5, 0, 1);
    }
  }

  svc = global.HAM_LED_SESSION;
  if (!svc || svc.v !== 9) {
    st = clean();
    svc = {
      v: 9,
      state: st,
      apply: function (x: HamLedState | object): HamLedService {
        let self = svc as HamLedService;
        stop();
        st = self.state = clean(x);
        if (!st.enabled) {
          restore(1);
          return self;
        }
        step = 0;
        try {
          if (Pip.fadeTo !== patched) Pip.fadeTo = patched;
        } catch (e) {}
        frame();
        if (st.fx !== 0) timer = setInterval(frame, interval());
        global.HAM_LED_SESSION = self;
        return self;
      },
      restoreNative: restore,
      remove: function (passive?: boolean): void {
        restore(!passive);
      },
    };
  }
  return svc.apply(d || clean());
});
