// =============================================================================
//  Name: G.O.A.T. Test
//  Author: Theeohn Megistus
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/Theeohn/The-G.O.A.T.-3000a-
// =============================================================================

(function() {
  const Q = [
    ["A frenzied Vault scientist yells, \"I'm going to put my quantum harmonizer in your photonic resonation chamber!\" What's your response?",
      ["\"But Doctor, wouldn't that cause a parabolic destabilization of the fission singularity?\"","\"Yeah? Up yours too, buddy!\"","Say nothing, grab a nearby pipe, and hit the scientist in the head to knock him out.","Say nothing, but slip away before the scientist can continue his rant."],
      ["Science","Speech","Melee Weapons","Sneak"]],
    ["A patient with a strange infection on his foot stumbles into the Clinic. It's spreading fast, but the doctor stepped out. What do you do?",
      ["Amputate the foot before the infection spreads.","Scream for help.","Medicate the infected area to the best of your abilities.","Restrain the patient, and merely observe as the infection spreads."],
      ["Melee Weapons","Speech","Medicine","Science"]],
    ["You find a young boy lost in the lower levels. He's hungry and frightened, and has stolen property on him. What do you do?",
      ["Give the boy a hug and tell him everything will be okay.","Confiscate the property by force, and leave him there as punishment.","Pick the boy's pocket to take the property for yourself, and leave him to his fate.","Lead the boy to safety, then turn him over to the Overseer."],
      ["Speech","Unarmed","Sneak",""]],
    ["You made one of the Vault 101 baseball teams! Which position do you prefer?",
      ["Pitcher","Catcher","Designated Hitter","None, you wish the Vault had a soccer team."],
      ["Explosives","Big Guns","Melee Weapons","Unarmed"]],
    ["Your grandmother invites you to tea, but gives you a pistol and orders you to kill another Vault resident. What do you do?",
      ["Obey your elder and kill the resident with the pistol.","Offer your most prized possession for the resident's life.","Ask Granny for a minigun instead. After all, you don't want to miss.","Throw your tea in Granny's face."],
      ["Small Guns","Barter","Big Guns","Explosives"]],
    ["Old Mr. Abernathy has locked himself in his quarters again, and you've been ordered to get him out. How do you proceed?",
      ["Use a bobby pin to pick the lock on the door.","Trade a Vault hoodlum for his cherry bomb and blow open the lock.","Go to the armory, retrieve a laser pistol, and blow the lock off.","Walk away, and let the old coot rot."],
      ["Lockpick","Explosives","Energy Weapons","Repair"]],
    ["You've been exposed to radiation, and a mutated hand has grown out of your stomach! What's the best course of treatment?",
      ["A bullet to the brain.","Large doses of anti-mutagen agent.","Prayer. Maybe God will spare you in exchange for a life of pious devotion.","Removal of the mutated tissue with a precision laser."],
      ["Small Guns","Medicine","Barter","Energy Weapons"]],
    ["A fellow resident has a Grognak the Barbarian comic book, issue number 1. You want it. What's the best way to obtain it?",
      ["Trade the comic book for one of your own valuable possessions.","Steal the comic book at gunpoint.","Sneak into his quarters, and steal it from his desk.","Slip knock-out drops into his Nuka-Cola, and take it when he's unconscious."],
      ["Barter","Small Guns","Sneak","Medicine"]],
    ["You decide to play a prank on your father. You sneak into his private restroom when no one is looking, and...",
      ["Loosen some bolts on the pipes. When the sink turns on, the room will flood.","Put a firecracker in the toilet. That's sure to cause some chaos.","Break into the medicine cabinet and replace his blood pressure pills with sugar pills.","Manipulate the wattage on his razor, so he'll get a shock next time he shaves."],
      ["Repair","Explosives","Medicine","Lockpick"]],
    ["Who is indisputably the most important person in Vault 101: he who shelters us from the harshness of the atomic wasteland?",
      ["The Overseer","The Overseer","The Overseer","The Overseer"],
      ["","","",""]]
  ];
  const R = {
    Barter:["VAULT CHAPLAIN","They say the G.O.A.T. never lies. According to this, you're slated to be the next Vault... Chaplain. God help us all."],
    "Big Guns":["LAUNDRY CANNON OPERATOR","Well, according to this, you're in line to be trained as a Laundry Cannon Operator. First time for everything, indeed."],
    "Energy Weapons":["PEDICURIST","It's nice to know I can still be surprised. Pedicurist! I might have guessed Manicurist, or even Masseuse. But apparently you're a foot person."],
    Explosives:["WASTE MANAGEMENT SPECIALIST","It says here you're perfectly suited for a career as a Waste Management Specialist. A specialist, mind you, not just a dabbler. Congratulations!"],
    Lockpick:["VAULT LOYALTY INSPECTOR","Huh. \"Vault Loyalty Inspector\"... I thought that had been phased out decades ago. Well, sounds like a job right up your alley, hmm?"],
    Medicine:["CLINICAL TEST SUBJECT","Interesting. \"Clinical Test Subject\"... sounds like something you should excel at. I guess you and your dad will be working together."],
    "Melee Weapons":["FRY COOK","Looks like the diner's going to get a new Fry Cook. I'll just say this once: hold the mustard, extra pickles. Ha ha ha."],
    Repair:["JUKEBOX TECHNICIAN","Thank goodness. We're finally getting a new Jukebox Technician. That thing hasn't worked right since old Joe Palmer passed."],
    Science:["PIP-BOY PROGRAMMER","Well, well. Pip-Boy Programmer, eh? Stanley will finally have someone to talk shop with."],
    "Small Guns":["TATTOO ARTIST","Huh. I wonder who will be brave enough to be your first customer as the Vault's new Tattoo Artist? I promise it won't be me."],
    Sneak:["SHIFT SUPERVISOR","Apparently you're management material. You're going to be trained as a Shift Supervisor. Could I be talking to the next Overseer? Stranger things have happened."],
    Speech:["MARRIAGE COUNSELOR","Wow. Wow. Says here you're going to be the Vault's Marriage Counselor. Almost makes me want to get married, just to be able to avail myself of your services."],
    Unarmed:["LITTLE LEAGUE COACH","I always thought you'd have a career in professional sports. You're the new Vault Little League coach! Congratulations."]
  };
  let scores = {}, qi = -1, sel = 0, wrapCache;

  function drawBorder() {
    h.setColor(3);
    h.drawRect(18, 18, 461, 301).drawRect(20, 20, 459, 299).fillRect(180, 18, 300, 22).fillRect(180, 297, 300, 301).fillRect(18, 120, 22, 200).fillRect(457, 120, 461, 200);
  }

  function drawTitle() {
    h.clear(0);
    drawBorder();
    h.setColor(3).setFontMonofonto23().setFontAlign(0, 0).drawString("The", 240, 56).setFontMonofonto36().setFontAlign(0, 0).drawString("G.O.A.T.", 247, 94).setFontMonofonto18().setFontAlign(0, 0);
    h.drawString("Press the left wheel to begin your test!", 240, 160);
    h.drawRect(45, 140, 435, 180);
    h.setColor(3).setFontMonofonto23().setFontAlign(0, 0);
    h.drawString("Generalized Occupational", 240, 225);
    h.drawString("Aptitude Test", 240, 255);
  }

  function wrap(i) {
    if (wrapCache && wrapCache.i === i) return wrapCache;
    const q = h.setFontMonofonto16().wrapString(Q[i][0], 410);
    const a = Q[i][1].map((t) => h.setFontMonofonto14().wrapString(t, 390));
    wrapCache = { i: i, q: q, a: a };
    return wrapCache;
  }

  function drawQuestion() {
    h.clear(0);
    drawBorder();
    const w = wrap(qi), c = w.q;

    // Draw Question Header box
    h.setColor(0).fillRect(25, 25, 148, 50);
    h.setColor(3).drawRect(25, 25, 148, 50);
    h.setFontMonofonto14().setFontAlign(-1, -1).drawString("QUESTION " + (qi + 1) + " OF 10", 30, 32);

    h.setColor(3).setFontMonofonto16().setFontAlign(-1, -1);
    let y = 66;
    // Draw Question text
    for (let i = 0; i < c.length; i++) { h.drawString(c[i], 40, y); y += 18; }
    y += 10;
    // Draw Answers
    for (let i = 0; i < 4; i++) {
      const rows = w.a[i], rh = 15 * rows.length + 8;
      if (i === sel) Pip.shadeBox(40, y, 440, y + rh);
      h.setColor(i === sel ? 3 : 2).setFontMonofonto14().setFontAlign(-1, -1);
      for (let r = 0; r < rows.length; r++) h.drawString(rows[r], 50, y + 4 + r * 15);
      y += rh + 5;
    }
  }

  function drawResult() {
    let best = "", top = -1;
    const keys = Object.keys(scores).sort();
    for (let k = 0; k < keys.length; k++) if (scores[keys[k]] > top) { top = scores[keys[k]]; best = keys[k]; }
    const job = R[best];
    h.clear(0);
    drawBorder();
    
    // Calculate box for Job Title
    const m = h.setFontMonofonto23().stringMetrics(job[0]);
    const lx = 240 - (m.width / 2) - 10, rx = 240 + (m.width / 2) + 10;
    
    h.setColor(1).setFontMonofonto28().setFontAlign(0, -1).drawString("G.O.A.T. RESULTS", 240, 60);
    
    // Draw Border around Job Title
    h.setColor(3).drawRect(lx, 100, rx, 140).setFontMonofonto23().setFontAlign(0, -1).drawString(job[0], 240, 110);
    
    const flav = h.setFontMonofonto16().wrapString(job[1], 400);
    h.setColor(2).setFontMonofonto16().setFontAlign(0, -1);
    let y = 160;
    for (let i = 0; i < flav.length; i++) { h.drawString(flav[i], 240, y); y += 20; }
    h.setColor(3).setFontMonofonto14().setFontAlign(0, 1).drawString("Press left wheel to retake the test.", 240, 280);
  }

  function nextQuestion() {
    qi++;
    if (qi >= 10) { drawResult(); return; }
    sel = 0;
    drawQuestion();
  }

  function onKnob1(dir) {
    if (qi < 0) {
      if (dir === 0) { Pip.playSound("TAB"); scores = {}; nextQuestion(); }
      return;
    }
    if (qi >= 10) {
      if (dir === 0) { Pip.playSound("TAB"); qi = -1; drawTitle(); }
      return;
    }
    if (dir) {
      sel = E.clip(sel + dir, 0, 3);
      Pip.playSound("SCROLL");
      drawQuestion();
    } else {
      Pip.playSound("TAB");
      const skill = Q[qi][2][sel];
      if (skill) scores[skill] = (scores[skill] || 0) + 1;
      nextQuestion();
    }
  }

  Pip.onExclusive("knob1", onKnob1);
  drawTitle();

  return {
    id: "GOATTEST",
    notDefault: true,
    fullscreen: true,
    remove: function() {
      Pip.removeListener("knob1", onKnob1);
      Pip.audioStop();
      h.clear();
    }
  };
});