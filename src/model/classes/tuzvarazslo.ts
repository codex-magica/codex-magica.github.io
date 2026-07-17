import { grant } from "../effects";
import { choice, opt } from "../choices";
import {
  bg, equip, gs, restrict, tag, teach, teachCatFrom, teachFrom, teachSub,
} from "../grantDsl";
import { ClassDef } from "./def";

// ── TŰZVARÁZSLÓ (additive: rend) ───────────────────────────────────────────
export const Tűzvarázsló: ClassDef = {
  name: "Tűzvarázsló",
  cost: 6,
  allowedRaces: ["Ember", "Kyr Származék"],
  grants: [
    tag("Mananyerés tűzből"),
    bg("Mágikus fogékonyság"),
    bg("Pszi érzékenység"),
    ...teach("Tapasztalati mágia", "Őselemi mágia", "Fegyverhasználat", "Hadvezetés", "Hajózás", "Heraldika", "Időjóslás", "Írás/olvasás", "Kultúra", "Lélektan", "Művészetek", "Nyelvtudás", "Ősi nyelv", "Politika/diplomácia", "Pszi", "Rúnamágia", "Számtan/Mértan", "Térképészet", "Történelem", "Udvari etikett/intrika", "Úszás", "Vallásismeret", "Csomózás"),
    equip("Lángkard + lángtőr + pikkelyvértezet (SFÉ 3)"),
    restrict("Fegyver: egykezes kard / tőr; Ordani szabályok."),
  ],
  baseSkills: [
    gs("Tapasztalati mágia", 3, "tűzmágia"),
    gs("Őselemi mágia", 2, "tűz"),
    gs("Fegyverhasználat", 2, "egykezes kardok"),
    gs("Fegyverhasználat", 2, "tőr jellegű fegyverek"),
    gs("Nyelvtudás", 3, "anyanyelv"),
    gs("Írás/olvasás", 3),
    gs("Ősi nyelv", 3, "godoni"),
    gs("Vallásismeret", 2, "Sogron"),
    gs("Pszi", 3, "pyarroni"),
  ],
  choices: [
    // Renegátok sits on this (school) axis, NOT among the irányzatok: per the book renegades are the
    // students of renegade teachers outside Ordan — an alternative to the Ordani branches, so filing it
    // here rules out book-illegal combos like "Tűz Harcosai + Renegátok".
    choice("rend", "Rend / iskola", "additive", [
      opt("Tűz Hordozói", [restrict("Alapértelmezett ág 5. Tsz alatt; Tűzmágia tudósai.")]),
      opt("Tűz Táplálói", [restrict("Vallási/oktató ág; Sogron Útja (5+ Tsz).")]),
      opt("Tűz Harcosai", [restrict("Harci/védelmi ág; Lángőrök — belépéskor Tapasztalati mágia / Ősi nyelv / Pszi kiképzés.")]),
      opt("Aschaon Tűzmesterei", [tag("Hatalom Itala"), grant({ kind: "tag", tag: "Lángtetoválás" }, 3), teachSub("Tapasztalati mágia", "boszorkánymester", 3), restrict("Nincs Magasiskola; Mana csak Hatalom Italából; Tapasztalati mágia (boszorkánymester) 3. fokú oktatóval; nőket is felvesz.")]),
      opt("Renegátok", [grant({ kind: "classCostDelta", amount: -1 }), restrict("−1 KAP iskolaköltség; nincs fegyver-/vértkorlát; nem tanulhat Godoni Örökséget vagy Tűzmágia magasiskolát; nem lehet szerafista, és irányzatot sem választhat.")]),
    ]),
    choice("iranyzat", "Sogron misztériumának irányzata", "additive", [
      opt("Nincs külön irányzat", [restrict("Az irányzatok jellemzően 5. Tapasztalati szinttől választhatók.")]),
      opt("A Pusztító Tűz Útja", [...teachCatFrom(5, 4, "Harci", "Tudományos", "Világi"), restrict("5. Tsz+: bármely Harci/Tudományos/Világi képzettség 4. fokú oktatói kedvezménnyel — a pusztító erő növelésére.")]),
      opt("Sogron Útja", [grant({ kind: "tag", tag: "Sogron pappá szentelés" }, 5), restrict("5. Tsz+: Sogron-pappá válhat (Kegyelt háttér, Vallásismeret 3. fok); nem-isteni mana-módszereit elveszti.")]),
      opt("A Fény Ösvénye", [grant({ kind: "teachingDiscount", skill: "Pszi", subtype: "Godoni Ösvény", uptoLevel: 3 }, 5), restrict("5. Tsz+: Pszi (Godoni Ösvény) 3. fokú oktatói kedvezménnyel.")]),
      opt("Sogronita szerafisták", [grant({ kind: "tag", tag: "Szeráfi alku" }, 10), ...teachFrom(6, 4, "Démonológia"), restrict("6.–10. Tsz közti képzés alatt Démonológia sajátítható el; 10. Tsz-re legalább 3. fok kell.")]),
    ]),
  ],
  suggestedAllocation: { HM: 7, Fp: 5, Kp: 10, Mana: 6 },
};
