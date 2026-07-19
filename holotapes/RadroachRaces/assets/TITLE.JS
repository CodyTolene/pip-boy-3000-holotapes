// =============================================================================
//  Name: Radroach Races
//  Author: Theeohn Megistus
//  License: MIT
//  Repository: https://github.com/Theeohn/Radroach-Races
// =============================================================================
//  File: TITLE.JS (scene)
//  Description: Draws the title screen using the full-screen TITLEIMG.JSON
//  bitmap as the backdrop, with a single map selector box on top. Knob1 and
//  knob2 both scroll through Random Map + Maps 1-20, wrapping in both
//  directions, and a press on either knob launches a race on the selected
//  map.
// =============================================================================

(function(app) {
  let selected = 0; // 0 = Random Map, 1-20 = Map 1-20

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

    selected = (selected + dir + 21) % 21;
    Pip.audioStart('HOLO/RADROACH_RACES/FLAP.WAV');
    drawSelector();
    h.flip();
    Pip.lastFlip = getTime();
  }

Pip.audioStart('HOLO/RADROACH_RACES/FLAP.WAV');
let file = E.openFile('HOLO/RADROACH_RACES/TITLEIMG.BIN', 'r');
let target = new Uint8Array(h.buffer);
let offset = target.length;
let chunk = file.read(256);

while (chunk) {
  offset -= chunk.length;
  target.set(chunk, offset);
  chunk = file.read(256);
}

file.close();
h.flip();

  h.setFont('Monofonto14')
    .setFontAlign(-1, 0)
    .setColor(1)
    .drawString('Art by', 10, 283)
    .drawString('The Nuka Lounge', 12, 298);

  h.setFont('Monofonto14')
    .setFontAlign(0, -1)
    .setColor(2)
    .drawString('v2.2.1', 444, 20);

  drawSelector();

  h.setFont('Monofonto14')
    .setFontAlign(0, -1)
    .setColor(3)
    .drawString('SELECT A MAP, PRESS LEFT WHEEL TO RACE!', 243, 290);

  h.flip();
  Pip.lastFlip = getTime();

  Pip.onExclusive('knob1', onKnob);
  Pip.onExclusive('knob2', onKnob);

  return {
    remove: function() {
      Pip.removeListener('knob1', onKnob);
      Pip.removeListener('knob2', onKnob);
    },
  };
});