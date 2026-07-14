import { grant } from "../effects";
import { choice, opt } from "../choices";
import { bg, gs, remove, restrict, tag, teach, teachAt, teachFrom, teachSub } from "../grantDsl";
import { ClassDef } from "./def";

// ── BOSZORKÁNY (additive: rend) ────────────────────────────────────────────
export const Boszorkány: ClassDef = {
  name: "Boszorkány",
  cost: 5,
  allowedRaces: ["Ember", "Félelf", "Kyr Származék"],
  sexRestriction: "female",
  grants: [
    tag("Hatalom Itala"),
    bg("Mágikus fogékonyság"),
    bg("Pszi érzékenység"),
    gs("Tapasztalati mágia", 3, "boszorkány"),
    ...teach("Tapasztalati mágia", "Alkímia", "Herbalizmus", "Méregkeverés/semlegesítés", "Lélektan", "Művészetek", "Nyelvtudás", "Szexuális kultúra", "Udvari etikett/intrika", "Írás/olvasás", "Legendaismeret", "Pszi", "Vallásismeret", "Ékesszólás", "Élettan", "Értékbecslés", "Heraldika", "Idomítás", "Időjóslás", "Kultúra", "Orvoslás", "Szakma", "Számtan/Mértan", "Történelem", "Állatismeret", "Fegyverhasználat"),
  ],
  baseSkills: [
    gs("Lélektan", 2),
    gs("Művészetek", 2),
    gs("Nyelvtudás", 3, "anyanyelv"),
    gs("Szexuális kultúra", 2),
    gs("Udvari etikett/intrika", 2),
    gs("Alkímia", 2),
    gs("Herbalizmus", 3),
    gs("Írás/olvasás", 2),
    gs("Legendaismeret", 2),
    gs("Pszi", 2, "pyarroni"),
  ],
  choices: [
    choice("rend", "Szekta", "additive", [
      opt("Liviniai Gyülekezet", [grant({ kind: "tag", tag: "Morgena beavatás" }, 10), tag("Mágia elleplezése"), ...teachAt(2, "Politika/diplomácia", "Jog/törvénykezés", "Színészet", "Szakma", "Rúnamágia", "Drágakőmágia"), teachSub("Ősi nyelv", "kyr", 2), restrict("10. Tsz+: Morgena → Kegyelt; egyedi 'Mágia elleplezése'.")]),
      opt("Maida Saluguas", [...teachAt(2, "Politika/diplomácia", "Jog/törvénykezés", "Színészet", "Rúnamágia"), teachSub("Ősi nyelv", "aquir", 2), teachSub("Ősi nyelv", "godoni", 2), tag("Bármely Alvilági képzettség oktató nélkül tanulható"), restrict("Kráni kötődés.")]),
      opt("Stella Prosylens", [grant({ kind: "tag", tag: "Noir beavatás" }, 5), bg("Sugallat"), restrict("5. Tsz+: Noir → Kegyelt.")]),
      opt("Alidaxi Boszorkányrend", [...teachFrom(4, 3, "Rúnamágia", "Drágakőmágia"), grant({ kind: "teachingDiscount", skill: "Ősi nyelv", subtype: "kyr", uptoLevel: 3 }, 4), grant({ kind: "teachingDiscount", skill: "Ősi nyelv", subtype: "crantai", uptoLevel: 3 }, 4), grant({ kind: "teachingDiscount", skill: "Ősi nyelv", subtype: "óelf", uptoLevel: 3 }, 4), restrict("3. Tsz+ a fenti kedvezmény; mágikus tárgy ajándék.")]),
      opt("Ezer Fátyol Nővérei", [tag("Ezer fátyol tánca"), tag("Táncmágia erősítése"), tag("Varázstárolás fátylakban"), remove("Szexuális kultúra"), restrict("Nincs kezdő Szexuális kultúra; Táncmágia, fátyol-tárolás.")]),
    ]),
  ],
  suggestedAllocation: { HM: 3, Fp: 3, Kp: 15, Mana: 8 },
};
