// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: DICE_ROLL.JS (scene)
//  Description: Rolls, moves, and scores dice for the selected mode
//  Notes:
//    Each die is [x, y, face, radius, x speed, y speed]
//    Press to roll and hold to keep the dice moving
// =============================================================================

(function (app) {
  const DICE_AUDIO = 'HOLO/VND/DICE_THROW.WAV';

  let animationInterval = null; // Dice movement loop
  let dice = []; // Current dice
  let frame = 0; // Frames since the roll started
  let holding = false; // Keep rolling while held
  let initializationTimeout = null;
  let polygon = []; // Base die shape points
  let polygonBuffer = []; // Die shape draw buffer
  let pressWatch = null; // Hardware press watch
  let selected = 1; // 0 is back and 1 is roll
  let settled = false; // Dice have stopped and scored

  /**
   * Start or restart a dice roll
   * @returns {void} Nothing
   */
  function begin() {
    settled = false;
    app.diceState[9] = 0;
    frame = 0;
    sound(DICE_AUDIO);

    if (animationInterval) {
      clearInterval(animationInterval);
    }

    animationInterval = setInterval(step, 50);
  }

  /**
   * Move two touching dice apart and bounce them
   * @param first The first die
   * @param second The second die
   * @returns {void} Nothing
   */
  function collision(first, second) {
    const x = second[0] - first[0];
    const y = second[1] - first[1];
    const radius = first[3] + second[3];
    const squared = x * x + y * y;

    if (squared >= radius * radius || squared <= 0) {
      return; // Skip dice that are not touching
    }

    const distance = Math.sqrt(squared);
    const normalX = x / distance; // Direction from the first die to the second
    const normalY = y / distance;
    const overlap = (radius - distance) / 2;

    // Move the dice so they only touch
    first[0] -= normalX * overlap;
    first[1] -= normalY * overlap;
    second[0] += normalX * overlap;
    second[1] += normalY * overlap;

    // Get speed along the hit direction
    const velocity =
      (second[4] - first[4]) * normalX + (second[5] - first[5]) * normalY;

    if (velocity < 0) {
      // Bounce dice moving toward each other
      const impulse = (-1.9 * velocity) / 2;

      first[4] -= impulse * normalX;
      first[5] -= impulse * normalY;
      second[4] += impulse * normalX;
      second[5] += impulse * normalY;
    }
  }

  /**
   * Get the dice count for the selected mode
   * @returns {number} The number of dice to roll
   */
  function diceCount() {
    return app.diceState[app.diceState[0] + 1];
  }

  /**
   * Draw the arena, dice, and result
   * @returns {void} Nothing
   */
  function drawArena() {
    h.setColor(0).fillRect(13, 65, app.W - 13, app.H - 21);
    h.setColor(2).drawRect(14, 66, app.W - 14, app.H - 22);
    h.setColor(3).setFontMonofonto14().setFontAlign(0, 0);

    for (let i = 0; i < dice.length; i++) {
      // Draw coins as circles and dice as shapes
      if (faces() === 2 && app.diceState[0] === 2) {
        h.drawCircle(dice[i][0], dice[i][1], dice[i][3]);
      } else {
        // Size and move the die shape
        for (let point = 0; point < polygon.length; point += 2) {
          polygonBuffer[point] = dice[i][0] + dice[i][3] * polygon[point];
          polygonBuffer[point + 1] =
            dice[i][1] + dice[i][3] * polygon[point + 1];
        }

        h.drawPoly(polygonBuffer, true);
      }

      // Draw the face value or coin side
      h.drawString(
        faces() === 2 && app.diceState[0] === 2
          ? dice[i][2] === 1
            ? 'H'
            : 'T'
          : '' + dice[i][2],
        dice[i][0],
        dice[i][1],
      );
    }

    if (settled) {
      // Clear and draw the result
      h.setColor(0).fillRect(15, app.H - 48, app.W - 15, app.H - 23);
      h.setColor(3)
        .setFontMonofonto18()
        .setFontAlign(0, 1)
        .drawString(summary(), app.W / 2, app.H - 26);
    }
  }

  /**
   * Draw the two top buttons
   * @returns {void} Nothing
   */
  function drawButtons() {
    const width = (app.W - 36) / 2;

    h.setColor(0).fillRect(0, 29, app.W, 61);

    for (let i = 0; i < 2; i++) {
      const left = 14 + i * (width + 8);

      if (selected === i) {
        h.setColor(3)
          .fillRect(left, 30, left + width, 60)
          .setColor(0);
      } else {
        h.setColor(2)
          .drawRect(left, 30, left + width, 60)
          .setColor(3);
      }

      h.setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString(i ? 'ROLL' : '< BACK', left + width / 2, 45);
    }
  }

  /**
   * Draw the full screen
   * @returns {void} Nothing
   */
  function drawInitial() {
    h.clear(0)
      .setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, -1)
      .drawString('DICE ROLLER', app.W / 2, 4);
    drawButtons();
    h.setColor(2).drawRect(14, 66, app.W - 14, app.H - 22);
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString('HOLD = KEEP ROLLING    R-KNOB SWITCH', app.W / 2, app.H - 6);
    h.flip();
    Pip.lastFlip = getTime();
  }

  /**
   * Get the face count for the selected mode
   * @returns {number} The number of faces on each die
   */
  function faces() {
    if (app.diceState[0] === 0) {
      return 20;
    }

    if (app.diceState[0] === 1) {
      return 6;
    }

    if (app.diceState[4] === 0) {
      return 2;
    }

    if (app.diceState[4] === 1) {
      return 4;
    }

    if (app.diceState[4] === 2) {
      return 6;
    }

    if (app.diceState[4] === 3) {
      return 8;
    }

    if (app.diceState[4] === 4) {
      return 10;
    }

    if (app.diceState[4] === 5) {
      return 12;
    }

    if (app.diceState[4] === 6) {
      return 20;
    }

    return 100;
  }

  /**
   * Give every die a random push
   * @returns {void} Nothing
   */
  function kick() {
    for (let i = 0; i < dice.length; i++) {
      dice[i][4] += randomDirection() * 15;
      dice[i][5] += randomDirection() * 15;
    }
  }

  /**
   * Handle the left scroll wheel input
   * @param direction The direction of the scroll wheel
   * @returns {void} Nothing
   */
  function onLeftScrollWheel(direction) {
    if (direction || pressWatch) {
      return;
    }

    if (Pip.playSound) {
      Pip.playSound('TAB');
    }

    if (!selected) {
      app.go(app.scenes.DICE_MENU);
    } else {
      kick();
      begin();
    }
  }

  /**
   * Handle both hardware press edges
   * @param event The hardware press event
   * @returns {void} Nothing
   */
  function onPress(event) {
    if (event.state) {
      // Handle press down
      if (Pip.playSound) {
        Pip.playSound('TAB');
      }

      if (selected) {
        holding = true; // Keep rolling until release
        kick();
        begin();
      }
    } else if (holding) {
      holding = false; // Let the dice settle
    } else if (!selected) {
      app.go(app.scenes.DICE_MENU); // Open the dice menu
    }
  }

  /**
   * Handle the right scroll wheel input
   * @param direction The direction of the scroll wheel
   * @returns {void} Nothing
   */
  function onRightScrollWheel(direction) {
    if (!direction) {
      return;
    }

    selected = E.clip(selected + (direction > 0 ? 1 : -1), 0, 1);

    if (Pip.playSound) {
      Pip.playSound('SCROLL');
    }

    drawButtons();
    Pip.blitOptions.y1 = 29;
    Pip.blitOptions.y2 = 61;
    h.flip();
    delete Pip.blitOptions.y1;
    delete Pip.blitOptions.y2;
    Pip.lastFlip = getTime();
  }

  /**
   * Get a random direction value
   * @returns {number} A value from -1 through 1
   */
  function randomDirection() {
    return (Math.randInt(2001) - 1000) / 1000;
  }

  function remove() {
    if (animationInterval) {
      clearInterval(animationInterval);
    }

    if (initializationTimeout) {
      clearTimeout(initializationTimeout);
    }

    if (pressWatch) {
      clearWatch(pressWatch);
    }

    Pip.removeListener('knob1', onLeftScrollWheel);
    Pip.removeListener('knob2', onRightScrollWheel);
    Pip.audioStop();
  }

  /**
   * Stop the dice and score the roll
   * @returns {void} Nothing
   */
  function settle() {
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }

    settled = true;
    app.diceState[7] = 0; // Main result
    app.diceState[8] = 0; // Second result

    const maximum = faces();

    for (let i = 0; i < dice.length; i++) {
      const rolled = Math.randInt(maximum) + 1; // Roll from 1 through the face count

      dice[i][2] = rolled; // Show the final face

      if (app.diceState[0] === 0) {
        // Score Fallout successes and problems
        app.diceState[7] +=
          rolled <= app.diceState[6] ? 2 : rolled <= app.diceState[5] ? 1 : 0;

        if (rolled === 20) {
          app.diceState[8]++;
        }
      } else if (app.diceState[0] === 1) {
        // Score combat damage and effects
        app.diceState[7] +=
          rolled === 1 ? 1 : rolled === 2 ? 2 : rolled >= 5 ? 1 : 0;

        if (rolled >= 5) {
          app.diceState[8]++;
        }
      } else if (maximum === 2) {
        // Count heads and tails
        if (rolled === 1) {
          app.diceState[7]++;
        } else {
          app.diceState[8]++;
        }
      } else {
        app.diceState[7] += rolled; // Add generic dice together
      }
    }

    app.diceState[9] = 1; // Mark the result ready
    Pip.audioStop();
    drawArena();
  }

  /**
   * Play a sound without stopping on file errors
   * @param path The sound file path
   * @returns {void} Nothing
   */
  function sound(path) {
    try {
      Pip.audioStart(path);
    } catch (error) {
      // Audio is optional, don't throw.
    }
  }

  /**
   * Build and place the dice for a new roll
   * @returns {void} Nothing
   */
  function spawn() {
    // Pick the number of sides used to draw each die
    let sides = 10;

    if (app.diceState[0] === 0) {
      sides = 8;
    } else if (app.diceState[0] === 1) {
      sides = 4;
    } else if (app.diceState[4] === 1) {
      sides = 3;
    } else if (app.diceState[4] === 2) {
      sides = 4;
    } else if (app.diceState[4] === 3) {
      sides = 5;
    } else if (app.diceState[4] === 4) {
      sides = 6;
    } else if (app.diceState[4] === 5) {
      sides = 7;
    } else if (app.diceState[4] === 6) {
      sides = 8;
    }

    polygon = [];
    polygonBuffer = [];

    // Build the die shape once and resize it while drawing
    if (!(faces() === 2 && app.diceState[0] === 2)) {
      for (let i = 0; i < sides; i++) {
        const angle = Math.PI / 2 + (i * 2 * Math.PI) / sides; // Start at the top

        polygon.push(Math.cos(angle), Math.sin(angle));
        polygonBuffer.push(0, 0);
      }
    }

    const count = diceCount();
    const radius = count > 5 ? 16 : 22; // Use smaller dice for large rolls

    dice = [];

    for (let i = 0; i < count; i++) {
      dice.push([
        14 + radius + Math.randInt(app.W - 28 - 2 * radius), // Start inside the arena
        66 + radius + Math.randInt(app.H - 88 - 2 * radius), // Start inside the arena
        Math.randInt(faces()) + 1, // Starting face
        radius,
        randomDirection() * 15, // Horizontal speed
        randomDirection() * 15, // Vertical speed
      ]);
    }
  }

  /**
   * Move and draw one frame of the roll
   * @returns {void} Nothing
   */
  function step() {
    frame++;

    let speedMaximum = 0;

    const maximum = faces();

    for (let i = 0; i < dice.length; i++) {
      const die = dice[i];

      die[0] += die[4]; // Move left or right
      die[1] += die[5];
      die[4] *= 0.92; // Slow horizontal speed
      die[5] *= 0.92;

      // Bounce off the arena walls
      if (die[0] < 14 + die[3]) {
        die[0] = 14 + die[3];
        die[4] = -die[4] * 0.9;
      } else if (die[0] > app.W - 14 - die[3]) {
        die[0] = app.W - 14 - die[3];
        die[4] = -die[4] * 0.9;
      }

      if (die[1] < 66 + die[3]) {
        die[1] = 66 + die[3];
        die[5] = -die[5] * 0.9;
      } else if (die[1] > app.H - 22 - die[3]) {
        die[1] = app.H - 22 - die[3];
        die[5] = -die[5] * 0.9;
      }

      const speed = Math.sqrt(die[4] * die[4] + die[5] * die[5]);

      if (speed > speedMaximum) {
        speedMaximum = speed; // Track the fastest die
      }

      if (!settled) {
        die[2] = Math.randInt(maximum) + 1; // Change the face while moving
      }
    }

    // Check each pair for a hit
    for (let first = 0; first < dice.length; first++) {
      for (let second = first + 1; second < dice.length; second++) {
        collision(dice[first], dice[second]);
      }
    }

    // Push slow dice while the button is held
    if (holding && speedMaximum < 6) {
      for (let i = 0; i < dice.length; i++) {
        dice[i][4] += randomDirection() * 4;
        dice[i][5] += randomDirection() * 4;
      }
    }

    // Settle slow dice or rolls that run too long
    if (!holding && (speedMaximum < 1.4 || frame > 60)) {
      settle();
    } else {
      drawArena();
    }
  }

  /**
   * Get the result line for the current mode
   * @returns {string} The result line
   */
  function summary() {
    if (app.diceState[0] === 0) {
      return (
        app.diceState[7] +
        ' SUCCESS' +
        (app.diceState[7] === 1 ? '' : 'ES') +
        '   ' +
        app.diceState[8] +
        ' COMPLICATION' +
        (app.diceState[8] === 1 ? '' : 'S')
      );
    }

    if (app.diceState[0] === 1) {
      return (
        app.diceState[7] +
        ' DAMAGE   ' +
        app.diceState[8] +
        ' EFFECT' +
        (app.diceState[8] === 1 ? '' : 'S')
      );
    }

    if (faces() === 2) {
      return app.diceState[7] + ' HEADS   ' + app.diceState[8] + ' TAILS';
    }

    return 'TOTAL ' + app.diceState[7];
  }

  Pip.onExclusive('knob1', onLeftScrollWheel);
  Pip.onExclusive('knob2', onRightScrollWheel);

  // Use the hardware press watch when available
  if (typeof ENC1_PRESS !== 'undefined') {
    pressWatch = setWatch(onPress, ENC1_PRESS, {
      debounce: 50,
      edge: 'both',
      repeat: true,
    });
  }

  // Defer the first roll by one tick
  initializationTimeout = setTimeout(function () {
    initializationTimeout = null;

    try {
      process.memory(true);
      E.defrag();
    } catch (error) {}

    spawn();
    drawInitial();
    begin();
  }, 0);

  return { remove: remove };
});
