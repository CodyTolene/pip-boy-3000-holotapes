(function (api: CaseApi): CaseOptions {
  // The options box over the right-hand panel: the main menu and its two
  // sub-menus, plus carrying a tape up or down the list. Loaded by APP.ts
  // only while the options are open, so the case uses less memory the rest
  // of the time.
  const MENUS = [
    [
      'PLAY HOLOTAPE',
      'MOVE IN LIST',
      'FAVOURITE',
      'MISC',
      'SORT THE CASE >',
      'HIDE OR SHOW ALL >',
      'BACK',
    ],
    ['A TO Z', 'FAVOURITES TO THE TOP', 'HIDDEN TO THE BOTTOM', 'BACK'],
    [
      'HIDE ALL BUT FAVOURITES',
      'HIDE ALL CUSTOM HOLOTAPES',
      'SHOW ALL IN MISC',
      'BACK',
    ],
  ];
  const TITLES = ['', 'SORT THE CASE', 'HIDE OR SHOW ALL'];
  // Keep in step with APP.ts.
  const HIDE = 1;
  const FAV = 2;
  // Height of the list area the firmware scrolls through.
  const LIST_H = 216;
  const PX = api.px;
  const s = api.s;
  const k = api.tape;

  let menu = 0;
  let act = 0;
  // Tape being carried up or down the list, or -1.
  let moving = -1;
  let moveList: PipScroller | undefined;

  function draw(): void {
    let i = 0;
    let label = '';
    const items = MENUS[menu];
    api.clearPanel();
    h.setColor(3)
      .drawRect(PX + 4, 52, 470, 270)
      .setFontMonofonto14()
      .setFontAlign(-1, -1)
      .drawString(
        menu ? TITLES[menu] : api.nameOf(k).substr(0, 28),
        PX + 12,
        60,
      );
    for (i = 0; i < items.length; i++) {
      label = items[i];
      if (menu === 0 && i === 2)
        label = s.flags[k] & FAV ? 'REMOVE FAVOURITE' : 'MAKE FAVOURITE';
      if (menu === 0 && i === 3) {
        label = s.flags[k] & HIDE ? 'SHOW IN ITEMS > MISC' : 'HIDE FROM MISC';
      }
      if (i === act) Pip.shadeBox(PX + 10, 80 + i * 27, 464, 102 + i * 27);
      h.setColor(3).drawString(label, PX + 18, 85 + i * 27);
    }
    h.flip();
  }

  function openMenu(m: number, at: number): void {
    menu = m;
    act = at;
    Pip.playSound('TAB');
    draw();
  }

  function choose(): void {
    let i = 0;
    const name = s.files[k];
    let saved = false;
    let sorted = false;
    if (menu === 0) {
      if (act === 0) {
        // Stays on the options if the tape has nowhere to load from.
        api.launch(k);
        return;
      }
      if (act === 1) {
        startMove();
        return;
      }
      if (act === 4) return openMenu(1, 0);
      if (act === 5) return openMenu(2, 0);
      if (act === 2) {
        s.flags[k] ^= FAV;
        saved = true;
      } else if (act === 3) {
        api.setHidden(k, !(s.flags[k] & HIDE));
      }
    } else if (menu === 1) {
      if (act === 3) return openMenu(0, 4);
      if (act === 0) {
        // By the name shown in the list.
        const names: string[] = [];
        for (i = 0; i < s.files.length; i++) {
          names.push(api.nameOf(i).toUpperCase());
        }
        api.reorder(function (j: number): string {
          return names[j];
        });
      } else if (act === 1) {
        api.reorder(function (j: number): number {
          return s.flags[j] & FAV ? 0 : 1;
        });
      } else if (act === 2) {
        api.reorder(function (j: number): number {
          return s.flags[j] & HIDE ? 1 : 0;
        });
      }
      sorted = true;
    } else {
      if (act === 3) return openMenu(0, 5);
      if (act === 0) {
        for (i = 0; i < s.files.length; i++) {
          api.setHidden(i, !(s.flags[i] & FAV));
        }
      } else if (act === 1) {
        // Everything in APPINFO was installed from pip-boy.com; the Pip-Boy's
        // own MISC items come from its data files and stay. The case is not
        // in the list, so it always stays too.
        for (i = 0; i < s.files.length; i++) api.setHidden(i, true);
      } else {
        for (i = 0; i < s.files.length; i++) api.setHidden(i, false);
      }
    }
    if (s.changed || saved) api.saveLists();
    if (sorted) api.saveOrder();
    api.close(name, -1);
  }

  function onKnob(dir: KnobDirection): void {
    if (moving >= 0) return onMove(dir);
    if (dir) {
      act = E.clip(act + dir, 0, MENUS[menu].length - 1);
      Pip.playSound('SCROLL');
      draw();
      return;
    }
    choose();
  }

  // Height of a list row, the way the firmware's list measures it.
  function rowH(j: number): number {
    return (
      10 +
      14 *
        h.setFontMonofonto14().wrapString(api.nameOf(j), api.listW - 40).length
    );
  }

  function drawMovePanel(): void {
    api.clearPanel();
    h.setColor(3)
      .setFontMonofonto14()
      .setFontAlign(-1, -1)
      .drawString('MOVING', PX + 10, 120)
      .drawString(api.nameOf(moving).substr(0, 28), PX + 10, 140)
      .setColor(2)
      .drawString('TURN TO MOVE IT', PX + 10, 190)
      .drawString('PRESS TO PUT IT HERE', PX + 10, 208);
    h.flip();
  }

  // Carries the tape up or down the list. The firmware's list draws the
  // rows; the options keep the left wheel while the tape is moving.
  function startMove(): void {
    moving = k;
    Pip.playSound('TAB');
    Pip.removeListener('knob1', onKnob);
    moveList = api.openList(k);
    moveList.remove();
    Pip.onExclusive('knob1', onKnob);
    drawMovePanel();
  }

  function onMove(dir: KnobDirection): void {
    const l = moveList;
    if (!l) return;
    if (!dir) {
      const name = s.files[moving];
      const top = l.scrollIndex;
      moving = -1;
      api.saveOrder();
      api.close(name, top);
      return;
    }
    const j = moving + dir;
    if (j < 0 || j >= s.files.length) return;
    const f = s.files[j];
    const g = s.flags[j];
    s.files[j] = s.files[moving];
    s.flags[j] = s.flags[moving];
    s.files[moving] = f;
    s.flags[moving] = g;
    moving = j;
    Pip.playSound('SCROLL');
    // Forget the drawn rows, then keep the moving tape on screen.
    l.updateItemCount(s.files.length);
    l.selectedIndex = j;
    l.scrollY = 0;
    if (j < l.scrollIndex) {
      l.scrollIndex = j;
    } else {
      let i = 0;
      let sum = 0;
      for (i = l.scrollIndex; i <= j; i++) sum += rowH(i);
      while (sum > LIST_H && l.scrollIndex < j) {
        sum -= rowH(l.scrollIndex);
        l.scrollIndex++;
      }
    }
    l.render({ listOnly: true });
  }

  // Init.
  Pip.onExclusive('knob1', onKnob);
  draw();

  return {
    remove: function (): void {
      Pip.removeListener('knob1', onKnob);
    },
  };
});
