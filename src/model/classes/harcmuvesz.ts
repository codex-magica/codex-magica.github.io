import { choice, opt } from "../choices";
import { bg, equip, gp, gs, restrict, tag, teach, teachAt, teachCat, teachSub } from "../grantDsl";
import { ClassDef } from "./def";

// ── HARCMŰVÉSZ (additive: stílus) ──────────────────────────────────────────
export const Harcművész: ClassDef = {
  name: "Harcművész",
  cost: 10,
  allowedRaces: ["Ember", "Félelf", "Kyr Származék"],
  grants: [
    tag("Stílusharc"),
    bg("Pszi érzékenység"),
    ...teach("Harcművészet", "Harctéri gyakorlat", "Fájdalomtűrés", "Fegyverismeret", "Kétkezesharc", "Vakharc", "Vértviselet", "Pszi", "Élettan", "Orvoslás", "Herbalizmus", "Futás", "Akrobatika", "Esés", "Művészetek", "Nyelvtudás", "Kultúra", "Párbaj", "Udvari etikett/intrika", "Írás/olvasás"),
    equip("Az iskola hagyományos fegyvere(i)"),
    restrict("Merev fémpáncél sosem viselhető."),
  ],
  baseSkills: [
    gs("Pszi", 3, "slan"),
    gs("Írás/olvasás", 1),
    gs("Orvoslás", 2),
    gs("Élettan", 2),
    gs("Herbalizmus", 2),
    gp("Esés", 10),
    gp("Akrobatika", 10),
  ],
  choices: [
    choice("stilus", "Stílus / Irányzat", "additive", [
      opt("Shien-ka-to (Tűz)", [...teachCat(2, "Harci", "Alvilági", "Világi", "Tudományos", "Szociális"), gs("Harcművészet", 3, "Shien-ka-to"), gs("Harcművészet", 3, "hosszú bot"), restrict("Listán kívüli, nem misztikus képzettségek 2. fokú oktatói kedvezménnyel.")]),
      opt("Dart-nid-kinito (Víz)", [...teachAt(3, "Nekromancia", "Démonológia"), teachSub("Ősi nyelv", "kyr", 3), gs("Harcművészet", 3, "Dart-nid-kinito"), restrict("Fegyvertelen.")]),
      opt("Avad-ka-kinito (Föld)", [...teach("Hadvezetés", "Térképészet", "Számtan/Mértan", "Lélektan"), teachSub("Művészetek", "rajz"), gs("Harcművészet", 3, "Avad-ka-kinito"), gs("Harcművészet", 3, "választott alapfegyver"), gs("Harctéri gyakorlat", 2), gs("Vértviselet", 2), gs("Hadvezetés", 2), equip("Papír-szövet könnyű páncél (SFÉ 2)")]),
      opt("Nisen-nid-to (Levegő)", [...teach("Veszélyérzék", "Hadvezetés", "Lélektan", "Térképészet", "Számtan/Mértan", "Taktika"), teachSub("Művészetek", "rajz"), gs("Harcművészet", 3, "Nisen-nid-to"), gs("Harcművészet", 3, "Nisen-kard"), equip("Fegyverkabát (SFÉ 1)"), restrict("Csak Par-Elyában vagy DiMaremben tanulható.")]),
      opt("Udvari kardművész", [tag("Dhala-saan"), ...teachCat(3, "Szociális", "Tudományos"), ...teachAt(3, "Hadvezetés"), gs("Harcművészet", 3, "Slan kard"), gs("Harcművészet", 3, "Slan tőr"), bg("Nemesi vér"), bg("Vagyon"), equip("Kardművész vért (SFÉ 4)"), restrict("Dhala-saan technika.")]),
      opt("A harc útja", [tag("Shien-su"), ...teachCat(3, "Harci"), ...teachAt(3, "Lélektan", "Számtan/Mértan", "Térképészet", "Jog/törvénykezés", "Történelem", "Vallásismeret", "Állatismeret", "Lovaglás"), gs("Harcművészet", 3, "Slan kard"), gs("Harcművészet", 3, "Slan tőr"), equip("Kardművész vért (SFÉ 4)"), restrict("Shien-su technika.")]),
    ]),
  ],
  suggestedAllocation: { HM: 8, Fp: 7, Kp: 14, Psi: 3 },
};
