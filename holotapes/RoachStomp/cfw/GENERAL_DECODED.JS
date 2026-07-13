(function () {
  const e = 9220,
    r = player.getav("level") || 1,
    t = player.getav("karma") || 0;
  let n,
    o = null,
    a = !1;
  const i = NV
    ? (function () {
        n = E.openFile("DATA/REP.IMG", "r");
        const r = [
            "Idolized",
            "Liked",
            "Accepted",
            "Good-Natured Rascal",
            "Smiling Troublemaker",
            "Neutral",
            "Mixed",
            "Dark Hero",
            "Unpredictable",
            "Wild Child",
            "Soft-Hearted Devil",
            "Shunned",
            "Sneering Punk",
            "Merciful Thug",
            "Hated",
            "Vilified",
          ],
          t = [
            "Boomers",
            "Brotherhood of Steel",
            "Caesar's Legion",
            "Followers of the Apocalypse",
            "Freeside",
            "Goodsprings",
            "Great Khans",
            "NCR",
            "Novac",
            "Powder Gangers",
            "Primm",
            "The Strip",
            "White Glove Society",
          ],
          l = loadJSONWithDefaults(
            "SETTINGS/REP.JSON",
            Object.fromEntries(t.map((e) => [e, 5])),
          ),
          s = Pip.createScroller({
            width: 240,
            itemCount: t.length,
            getItem: (e) => ({ txt: t[e], n: e }),
            render: (t) => {
              try {
                (n.seek(e * t.n),
                  h
                    .drawImage(n.read(e), 280, 35)
                    .setFontAlign(0, -1)
                    .drawString(r[l[t.txt]], 366, 215)
                    .drawString(t.txt, 366, 240));
              } catch (e) {
                debug(`Error drawing faction image: ${e}`);
              }
            },
          });
        function d(e) {
          const r = t[s.selectedIndex],
            n = E.clip(l[r] + e, 0, 15);
          n != l[r] &&
            (Pip.playSound("HIGHLIGHT"), (l[r] = n), (a = !0), i.render());
        }
        return (
          Pip.onExclusive("knob2", d),
          (o = function () {
            (Pip.removeListener("knob2", d),
              a &&
                (debug("Writing to REP.JSON"),
                fs.writeFileSync("SETTINGS/REP.JSON", JSON.stringify(l))));
          }),
          s
        );
      })()
    : (function () {
        const i = loadJSONWithDefaults(
          "SETTINGS/GENERAL.JSON",
          "SETTINGS/DEFAULT/GENERAL.JSON",
        );
        let highscore;
        Object.entries({ "Atomic Command": "SETTINGS/ATOMIC.JSON" }).forEach(
          (e) =>
            (function (e, r) {
              try {
                const t = JSON.parse(fs.readFileSync(r));
                t.length > 0 && t[0].score && (i[e + " Score"] = t[0].score);
              } catch {
                debug("No scores");
              }
            })(e[0], e[1]),
        );
        (Object.entries({ "Roach Stomp": "SETTINGS/ROACHSTOMP.JSON" }).forEach(
          (e) =>
            (function (e, r) {
              try {
                const t = JSON.parse(fs.readFileSync(r));
                if (t.length > 0) {
                  let high = t[0].score;
                  for (let n = 1; n < t.length; n++) {
                    if (t[n].score > high) high = t[n].score;
                  }
                  i[e + " Score"] = high;
                }
              } catch {
                debug("No scores");
              }
            })(e[0], e[1]),
        ),
          (n = E.openFile("DATA/KARMA.IMG", "r")));
        const l = ["Evil", "Bad", "Neutral", "Good", "Saintly"],
          s = [
            "Vault Guardian",
            "Vault Martyr",
            "Sentinel",
            "Defender",
            "Dignitary",
            "Peacekeeper",
            "Ranger of the Wastes",
            "Protector",
            "Urban Avenger",
            "Exemplar",
            "Capitol Crusader",
            "Paladin",
            "Vault Legend",
            "Ambassador of Peace",
            "Urban Legend",
            "Hero of the Wastes",
            "Paragon",
            "Wasteland Savior",
            "Saint",
            "Last,Best Hope of Humanity",
            "Restorer of Faith",
            "Model of Selflessness",
            "Shepherd",
            "Friend of the People",
            "Champion of Justice",
            "Symbol of Order",
            "Herald of Tranquility",
            "Lightbringer",
            "Earthly Angel",
            "Messiah",
          ],
          d = [
            "Vault Delinquent",
            "Vault Outlaw",
            "Opportunist",
            "Plunderer",
            "Fat Cat",
            "Marauder",
            "Pirate of the Wastes",
            "Reaver",
            "Urban Invader",
            "Ne'er-do-well",
            "Capitol Crimelord",
            "Defiler",
            "Vault Boogeyman",
            "Harbinger of War",
            "Urban Superstition",
            "Villain of the Wastes",
            "Fiend",
            "Wasteland Destroyer",
            "Evil Incarnate",
            "Scourge of Humanity",
            "Architect of Doom",
            "Bringer of Sorrow",
            "Deceiver",
            "Consort of Discord",
            "Stuff of Nightmares",
            "Agent of Chaos",
            "Instrument of Ruin",
            "Soultaker",
            "Demon's Spawn",
            "Devil",
          ];
        let c = [
            "Vault Dweller",
            "Vault Renegade",
            "Seeker",
            "Wanderer",
            "Citizen",
            "Adventurer",
            "Vagabond of the Wastes",
            "Mercenary",
            "Urban Ranger",
            "Observer",
            "Capitol Councilor",
            "Keeper",
            "Vault Descendant",
            "Pinnacle of Survival",
            "Urban Myth",
            "Strider of the Wastes",
            "Beholder",
            "Wasteland Watcher",
            "Super-Human",
            "Paradigm of Humanity",
            "Soldier of Fortune",
            "Profiteer",
            "Egocentric",
            "Loner",
            "Hero for Hire",
            "Model of Apathy",
            "Person of Refinement",
            "Moneygrubber",
            "Gray Stranger",
            "True Mortal",
          ][Math.min(r - 1, 29)],
          u = 2;
        t > 249
          ? ((c = s[Math.min(r - 1, 29)]), (u = t > 749 ? 4 : 3))
          : t < -249 && ((c = d[Math.min(r - 1, 29)]), (u = t < -749 ? 0 : 1));
        const S = Pip.createScroller({
          width: 240,
          itemCount: Object.entries(i).length,
          getItem: (e) => {
            const r = Object.entries(i)[e];
            return { txt: r[0], rtxt: r[1] };
          },
        });
        try {
          (n.seek(e * u),
            h
              .drawImage(n.read(e), 280, 54)
              .setFontAlign(0, 1)
              .drawString(l[u], 366, 95)
              .setFontAlign(0, -1)
              .drawString(c, 366, 215));
        } catch (e) {
          debug(`Error drawing Karma image: ${e}`);
        }
        function f(e) {
          const r = Object.keys(i)[S.selectedIndex],
            t = E.clip(i[r] + e, 0, 9999);
          t != i[r] &&
            (Pip.playSound("HIGHLIGHT"), (i[r] = t), (a = !0), S.render());
        }
        return (
          Pip.onExclusive("knob2", f),
          (o = function () {
            (Pip.removeListener("knob2", f),
              a &&
                (debug("Writing to GENERAL.JSON"),
                fs.writeFileSync("SETTINGS/GENERAL.JSON", JSON.stringify(i))));
          }),
          S
        );
      })();
  return {
    id: "GENERAL",
    remove: () => {
      (i.remove(), n && n.close(), o && o());
    },
  };
});
