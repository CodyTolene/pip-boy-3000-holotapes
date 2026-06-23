// =============================================================================
//  Name: Vaults & Deathclaws
//  Author: @CodyTolene
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/CodyTolene/pip-boy-3000-holotapes
// =============================================================================
//  File: CONFIRM.JS (utility, not a scene)
//  Descriotion: A reusable confirmation dialog with CANCEL / DELETE buttons.
// =============================================================================

(function (app, options) {
  const BUTTONS = {
    count: 2,
    gap: 16,
    height: 30,
    labels: ['CANCEL', 'DELETE'],
    top: 190,
    width: 180,
  };

  let selectedAction = 0; // 0 = CANCEL, 1 = DELETE.
  let leftKnobPressed = false;
  let pressWatch = null;

  function clipText(text, maximumWidth) {
    if (h.stringWidth(text) <= maximumWidth) {
      return text;
    }

    while (text.length && h.stringWidth(text + '..') > maximumWidth) {
      text = text.slice(0, -1);
    }

    return text + '..';
  }

  function drawConfirmation() {
    h.clear(0);
    h.setColor(3)
      .setFontMonofonto28()
      .setFontAlign(0, -1)
      .drawString('DELETE SHEET?', app.W / 2, 24);
    h.setColor(2)
      .setFontMonofonto18()
      .setFontAlign(0, -1)
      .drawString(
        clipText(options.name || 'THIS SHEET', app.W - 40),
        app.W / 2,
        84,
      );
    h.setColor(1)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString('This permanently removes the', app.W / 2, 122)
      .drawString('sheet. This cannot be undone.', app.W / 2, 144);

    // Center buttons
    const firstButtonLeft =
      (app.W -
        (BUTTONS.width * BUTTONS.count + BUTTONS.gap * (BUTTONS.count - 1))) /
      2;

    for (let buttonIndex = 0; buttonIndex < BUTTONS.count; buttonIndex++) {
      const buttonLeft =
        firstButtonLeft + buttonIndex * (BUTTONS.width + BUTTONS.gap);

      // Selected button styling
      if (selectedAction === buttonIndex) {
        h.setColor(3).fillRect(
          buttonLeft,
          BUTTONS.top,
          buttonLeft + BUTTONS.width,
          BUTTONS.top + BUTTONS.height,
        );
        h.setColor(0);
      } else {
        h.setColor(2).drawRect(
          buttonLeft,
          BUTTONS.top,
          buttonLeft + BUTTONS.width,
          BUTTONS.top + BUTTONS.height,
        );
        h.setColor(3);
      }

      h.setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString(
          BUTTONS.labels[buttonIndex],
          buttonLeft + BUTTONS.width / 2,
          BUTTONS.top + BUTTONS.height / 2,
        );
    }

    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString('R-KNOB SWITCH    L-KNOB SELECT', app.W / 2, app.H - 6);
    h.flip();
    Pip.lastFlip = getTime();
  }

  /**
   * Handle the end of a hardware press
   * @param event The hardware press event
   * @returns {void} Nothing
   */
  function handlePressWatch(event) {
    if (event.state) {
      leftKnobPressed = true;
    } else if (leftKnobPressed) {
      leftKnobPressed = false;
      selectAction();
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

    selectedAction = E.clip(
      selectedAction + (direction > 0 ? 1 : -1),
      0,
      BUTTONS.count - 1,
    );

    if (Pip.playSound) {
      Pip.playSound('SCROLL');
    }

    drawConfirmation();
  }

  function remove() {
    if (pressWatch) {
      clearWatch(pressWatch);
      pressWatch = null;
    }

    Pip.removeListener('knob2', onRightScrollWheel);
  }

  /**
   * Run the selected button action
   * @returns {void} Nothing
   */
  function selectAction() {
    if (Pip.playSound) {
      Pip.playSound('TAB');
    }

    if (selectedAction === 1) {
      options.onConfirm();
    } else {
      options.onCancel();
    }
  }

  Pip.onExclusive('knob2', onRightScrollWheel);
  // Use ENC1_PRESS to avoid button hold issue on enter dialog
  pressWatch = setWatch(handlePressWatch, ENC1_PRESS, {
    debounce: 50,
    edge: 'both',
    repeat: true,
  });

  drawConfirmation();

  return { remove: remove };
});
