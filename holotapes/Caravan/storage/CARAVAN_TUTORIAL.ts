/*
 * CARAVAN - CARAVAN_TUTORIAL.JS
 * Compact timer-free tutorial. No production renderer dependency.
 * Safe to leave open indefinitely; redraws happen only on user input.
 */
(function (api: CaravanTutorialApi): CaravanMenuModule {
  const pages =
    "STARTING HAND^Start with 8 cards.|All 3 caravans begin empty.|Opening: play A-10 once|into EACH empty caravan.~CHOOSE A CARAVAN^After choosing Play Card,|turn EITHER wheel.|Choose one of 3 caravans.|LEFT press places the card.~CURRENT SCROLLING^Turn EITHER wheel through your hand.|From card 1, turn LEFT -> tracks.|Scroll all 3 caravan tracks.|Past track 3 -> cards again.~OPENING RULE^Only A-10 may open a caravan.|Play one number into each first.|Occupied opening lane = INVALID.|Discard/redraw is allowed.~ACE^Ace is worth 1 point.|It counts as a number card.|It can open an empty caravan.~KING^Attach King to any number card.|It doubles that card's value.|Kings can target either board.~QUEEN^Attach Queen to a number card.|On the lead card it changes suit|and reverses caravan direction.~JACK^Attach Jack to any number card.|It removes that number card|and all face cards attached to it.|Jacks can target either board.~JOKER^Joker on Ace removes its suit.|Joker on 2-10 removes that rank.|Jokers can target either board.~CARD ACTION^Select a card in your hand.|LEFT press opens its action menu.|Choose Play Card, Discard,|or Cancel with either wheel.~DISCARD CARD^Choose Discard Card to throw away|the selected card and redraw.|LEFT press confirms the action.~TRACK ACTION^From card 1, scroll LEFT to tracks.|Scroll among all 3 caravan tracks.|LEFT press: Disband / Cancel.|Past track 3 returns to hand.~FACE CARD TARGETING^Play a face card, then choose|YOUR board or the opponent board.|Either wheel scrolls targets.|LEFT press places the face card.~SOLD AND WINNING^A caravan total of 21-26 is SOLD.|Higher SOLD total wins that lane.|Win at least 2 of the 3 lanes.|Equal totals remain tied.~DECK EXHAUSTION^If your deck AND hand are empty,|you lose unless that last move|already won the match.~CURRENT END FLOW^Bet: Auto-Match / Raise / Accept.|Win: music fades, then Game Over Win.|Results follows the win sound.|Cap animation follows cap audio.~ZERO-CAP STATES^You at 0: Not enough caps...CLICK HERE!|Opponent at 0: GET OUT! then menu.|Next Play says opponent has no caps.|CLICK HERE resets both bankrolls.~TUTORIAL COMPLETE^Current scrolling, face cards,|Results flow, and zero-cap states|are covered. Deals are randomized.|LEFT press returns to Caravan.";
  let step = 0,
    removed = 0,
    knob1Attached = 0,
    knob2Attached = 0;

  function drawPage(): void {
    let start = 0,
      end = 0,
      separator = 0,
      lineEnd = 0,
      row = 0,
      page = '';
    for (let index = 0; index < step; index++) {
      start = pages.indexOf('~', start) + 1;
    }
    end = pages.indexOf('~', start);
    if (end < 0) end = pages.length;
    page = pages.substring(start, end);
    separator = page.indexOf('^');
    h.clear()
      .setColor(3)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString('CARAVAN - TUTORIAL', 240, 9)
      .drawLine(18, 34, 462, 34)
      .setFontMonofonto14()
      .drawString('PAGE ' + (step + 1) + ' / 18', 240, 42)
      .setFontMonofonto23()
      .drawString(page.substring(0, separator), 240, 64)
      .drawLine(48, 94, 432, 94)
      .setFontMonofonto16()
      .setFontAlign(-1, -1);
    start = separator + 1;
    while (start <= page.length && row < 6) {
      lineEnd = page.indexOf('|', start);
      if (lineEnd < 0) lineEnd = page.length;
      h.drawString(page.substring(start, lineEnd), 42, 112 + row * 27);
      row++;
      if (lineEnd >= page.length) break;
      start = lineEnd + 1;
    }
    h.setFont('6x8', 1)
      .setFontAlign(0, -1)
      .drawLine(42, 280, 438, 280)
      .drawString(
        step === 17
          ? 'LEFT PRESS: RETURN     TURN: REVIEW'
          : 'LEFT PRESS: CONTINUE     TURN: REVIEW',
        240,
        292,
      )
      .setFontMonofonto16()
      .setFontAlign(-1, -1);
    h.flip();
    Pip.lastFlip = getTime();
    page = '';
    process.memory(true);
  }

  function detach(): void {
    if (knob1Attached) {
      Pip.removeListener('knob1', onKnob1);
      knob1Attached = 0;
    }
    if (knob2Attached) {
      Pip.removeListener('knob2', onKnob2);
      knob2Attached = 0;
    }
  }

  function attach(): void {
    Pip.onExclusive('knob1', onKnob1);
    knob1Attached = 1;
    try {
      Pip.onExclusive('knob2', onKnob2);
      knob2Attached = 1;
    } catch (error) {
      Pip.removeListener('knob1', onKnob1);
      knob1Attached = 0;
      throw error;
    }
  }

  function exitDemo(): void {
    if (removed) return;
    removed = 1;
    detach();
    if (api.onExit) api.onExit();
  }

  function move(direction: KnobDirection): void {
    const previous = step;
    step += direction > 0 ? 1 : -1;
    if (step < 0) step = 17;
    if (step > 17) step = 0;
    if (step !== previous) {
      Pip.playSound('SCROLL');
      drawPage();
    }
  }

  function onKnob1(direction: KnobDirection): void {
    if (removed) return;
    if (direction) {
      move(direction);
      return;
    }
    Pip.playSound('SELECT');
    if (step === 17) {
      exitDemo();
      return;
    }
    step++;
    drawPage();
  }

  function onKnob2(direction: KnobDirection): void {
    if (!removed && direction) move(direction);
  }

  function removeDemo(): void {
    if (removed) return;
    removed = 1;
    detach();
  }

  drawPage();
  attach();
  return {
    id: 'CARAVANDEMO',
    remove: removeDemo,
  };
});
