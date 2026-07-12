// =============================================================================
//  Name: Radroach Races
//  Author: Theeohn Megistus
//  License: MIT
//  Repository: https://github.com/Theeohn/Radroach-Races
// =============================================================================
//  File: TITLE.JS (scene)
//  Description: Draws the title screen with a single map selector box.
//  Knob1 and knob2 both scroll through Random Map + Maps 1-16, wrapping in
//  both directions, and a press on either knob launches a race on the
//  selected map.
// =============================================================================

(function (app) {
  let selected = 0; // 0 = Random Map, 1-16 = Map 1-16

  /**
   * @returns {void}
   */
  function drawSelector() {
    h.setColor(0)
      .fillRect(130, 238, 350, 270)
      .setColor(3)
      .drawRect(132, 240, 348, 268);

    h.setFont('Monofonto18')
      .setFontAlign(-1, 0)
      .drawString('<', 144, 254)
      .setFontAlign(1, 0)
      .drawString('>', 336, 254)
      .setFont('Monofonto23')
      .setFontAlign(0, 0)
      .drawString(
        selected === 0
          ? 'Random Map'
          : 'Map ' + (selected < 10 ? '0' + selected : selected),
        240,
        255,
      );
  }

  /**
   * @param dir
   * @returns {void}
   */
  function onKnob(dir) {
    if (dir === 0) {
      Pip.audioStart('HOLO/RADROACH_RACES/BUGLE.WAV');
      app.go(app.scenes.RACE, { mapId: selected });
      return;
    }

    selected = (selected + dir + 17) % 17;
    Pip.playSound('SCROLL');
    drawSelector();
    h.flip();
    Pip.lastFlip = getTime();
  }

  h.setColor(0).fillRect(0, 0, 480, 320).setColor(2).drawRect(18, 18, 465, 298);

  h.setFont('Monofonto36')
    .setFontAlign(0, -1)
    .setColor(3)
    .drawString('RADROACH RACES', 240, 52)
    .setFont('Monofonto18')
    .setFontAlign(0, -1)
    .setColor(2)
    .drawString('by Theeohn', 360, 94)
    .setFont('Monofonto14')
    .setFontAlign(0, -1)
    .setColor(2)
    .drawString('v2.0.1', 444, 282);

  h.setColor(2).drawLine(55, 180, 425, 180).drawLine(55, 200, 425, 200);
  for (let fx = 75; fx < 425; fx += 35) {
    h.fillRect(fx, 150, fx + 15, 230);
  }

  for (let gx = 35; gx < 445; gx += 12) {
    h.drawLine(gx, 230, gx - 4, 210).drawLine(gx + 3, 230, gx + 6, 205);
  }

  h.setColor(3)
    .fillEllipse(200, 165, 280, 215)
    .fillCircle(240, 150, 18)
    .drawLine(236, 138, 205, 105)
    .drawLine(244, 138, 275, 105)
    .drawPoly([205, 165, 180, 175, 165, 200], false)
    .drawPoly([200, 190, 175, 200, 160, 230], false)
    .drawPoly([275, 165, 300, 175, 315, 200], false)
    .drawPoly([280, 190, 305, 200, 320, 230], false);

  drawSelector();

  h.setFont('Monofonto14')
    .setFontAlign(0, -1)
    .setColor(3)
    .drawString('PRESS LEFT WHEEL TO RACE!', 241, 278);

  h.flip();
  Pip.lastFlip = getTime();

  Pip.onExclusive('knob1', onKnob);
  Pip.onExclusive('knob2', onKnob);

  return {
    remove: function () {
      Pip.removeListener('knob1', onKnob);
      Pip.removeListener('knob2', onKnob);
    },
  };
});
