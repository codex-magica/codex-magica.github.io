import { grant } from "../effects";
import { choice, opt } from "../choices";
import { bg, capSkill, equip, gs, remove, restrict, tag, teach } from "../grantDsl";
import { ClassDef } from "./def";

// ── VARÁZSLÓ (additive: iskola; Lar-Dor → Pszi-csere) ──────────────────────
export const Varázsló: ClassDef = {
  name: "Varázsló",
  cost: 10,
  allowedRaces: ["Ember", "Elf", "Félelf", "Törpe", "Kyr Származék"],
  grants: [
    bg("Mágikus fogékonyság"),
    bg("Pszi érzékenység"),
    ...teach("Magasmágia", "Nekromancia", "Őselemi mágia", "Démonológia", "Drágakőmágia", "Rúnamágia", "Pszi", "Ősi nyelv", "Írás/olvasás", "Számtan/Mértan", "Történelem", "Legendaismeret", "Kultúra", "Nyelvtudás", "Élettan", "Herbalizmus", "Alkímia", "Építészet", "Lélektan", "Heraldika", "Orvoslás", "Politika/diplomácia", "Udvari etikett/intrika", "Szakma"),
  ],
  baseSkills: [
    gs("Magasmágia", 3),
    gs("Pszi", 4, "kyr"),
    gs("Nyelvtudás", 3, "anyanyelv"),
    gs("Nyelvtudás", 2, "második nyelv"),
    gs("Politika/diplomácia", 2),
    gs("Udvari etikett/intrika", 2),
    gs("Írás/olvasás", 3),
    gs("Ősi nyelv", 3),
    gs("Számtan/Mértan", 3),
    gs("Történelem", 2),
  ],
  choices: [
    choice("iskola", "Iskola", "additive", [
      opt("Lar-Dor", [...capSkill(2, "Nekromancia", "Démonológia"), gs("Pszi", 3, "Godoni Örökség"), remove("Pszi", "kyr"), restrict("Belsőszigeti/Északi: Pszi (kyr) helyett Pszi (Godoni Örökség) 3; Nekromancia/Démonológia max 2. fok.")]),
      opt("Pyarroni Varázslórend", [grant({ kind: "tag", tag: "Pyarroni varázslóbot" }, 3), restrict("3. Tsz+ rend; varázslóbot (E = Tsz/3); tiszta asztráltest.")]),
      opt("Doran", [tag("Dorani varázslóbot"), equip("Élő varázslóbot (1. Tsz)"), restrict("Nekromancia/Démonológia megengedett; a bot saját Pszivel/Mp-vel bír.")]),
    ]),
  ],
  suggestedAllocation: { HM: 0, Fp: 0, Kp: 15, Mana: 10 },
};
