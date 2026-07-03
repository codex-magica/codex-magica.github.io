// Character classes (kasztok) as flexible recursive choice trees — transcribed from chapters 03–15.
//
// Per class, specialization is modelled with ChoiceDef nodes (see model/choices.ts):
//   • OVERRIDE classes (a school = a whole new package): Harcos, Lovag, Bárd, Boszorkánymester.
//     class.baseSkills is empty; each option carries its full level-1 package; an "Általános"
//     option holds the no-school/base package.
//   • ADDITIVE classes (shared base + deltas): Pap, Paplovag, Harcművész, Boszorkány, Tűzvarázsló,
//     Varázsló. class.baseSkills holds the shared package; options add deltas.
//   • TYPE + CLAN (two axes): Fejvadász, Tolvaj. A "típus" choice (override) gives the package; a
//     "klán" choice (additive) overlays abilities.
// Nested sub-choices: Arel-pap → irányzat; Isten Kardja → Arc. The tree is fully recursive.

import { GrantEntry, grant, Resource } from "./effects";
import { taughtSkill } from "./skills";
import { SkillCategory, SkillFok } from "./common";
import { ChoiceDef, choice, opt } from "./choices";

export interface ClassDef {
  name: string;
  cost: number;
  allowedRaces: string[];
  sexRestriction?: "female" | "male";
  grants: GrantEntry[]; // universal — always applied (free backgrounds, magic skill, teaching…)
  baseSkills?: GrantEntry[]; // shared base skill package (additive classes)
  choices: ChoiceDef[];
  suggestedAllocation?: Partial<Record<Resource, number>>;
}

// ── compact grant helpers ────────────────────────────────────────────────────
const gs = (skill: string, level: number, subtype?: string): GrantEntry =>
  taughtSkill(skill, level as SkillFok, subtype);
const gp = (skill: string, percent: number, subtype?: string): GrantEntry =>
  grant({ kind: "grantSkillPercent", skill, subtype, percent });
// A weapon-choice placeholder (fő/másodfegyver): granted at a fok, but the player must resolve it to a
// concrete weapon category/weapon in the builder.
const weaponChoice = (label: string, level: number): GrantEntry =>
  grant({ kind: "grantSkillChoice", skill: "Fegyverhasználat", label, level: level as SkillFok });
// "May learn if the DM allows" — informational, not auto-granted (Bárd Pszi).
const allow = (skill: string, subtype?: string): GrantEntry =>
  grant({ kind: "allowSkill", skill, subtype });
// Teacher scoped to ONE branch of a skill, e.g. Művészetek(Rajz), Ősi nyelv(kyr). Default uptoLevel 4.
const teachSub = (skill: string, subtype: string, uptoLevel: SkillFok = 4): GrantEntry =>
  grant({ kind: "teachingDiscount", skill, subtype, uptoLevel });
// A subclass DROPS a base-granted skill it doesn't receive (Arel: Írás/olvasás; Lar-Dor: Pszi kyr).
const remove = (skill: string, subtype?: string): GrantEntry =>
  grant({ kind: "removeSkill", skill, subtype });
const bg = (background: string, atLevel?: number): GrantEntry =>
  grant({ kind: "grantBackground", background }, atLevel);
const teach = (...skills: string[]): GrantEntry[] =>
  skills.map((skill) => grant({ kind: "teachingDiscount", skill, uptoLevel: 4 }));
// For a subclass option that teaches its OWN list instead of the class's: discards the inherited teach
// list, then teaches only `skills`. (Plain `teach(...)` in an option EXTENDS what the class teaches.)
const teachOnly = (...skills: string[]): GrantEntry[] => [grant({ kind: "resetTeaching" }), ...teach(...skills)];
// Teaching variants for the school special-rules: a specific fok, whole categories, ALL skills, and
// level-gated forms (apply only from `fromLvl`). #2 ("any/all skills"): teachCat / teachAll.
const teachAt = (fok: SkillFok, ...skills: string[]): GrantEntry[] => skills.map((skill) => grant({ kind: "teachingDiscount", skill, uptoLevel: fok }));
const teachCat = (fok: SkillFok, ...cats: SkillCategory[]): GrantEntry[] => cats.map((category) => grant({ kind: "teachingDiscount", category, uptoLevel: fok }));
const teachAll = (fok: SkillFok): GrantEntry => grant({ kind: "teachingDiscount", allSkills: true, uptoLevel: fok });
// #1 level-gated ("X. szinttől"):
const teachFrom = (fromLvl: number, fok: SkillFok, ...skills: string[]): GrantEntry[] => skills.map((skill) => grant({ kind: "teachingDiscount", skill, uptoLevel: fok }, fromLvl));
const teachCatFrom = (fromLvl: number, fok: SkillFok, ...cats: SkillCategory[]): GrantEntry[] => cats.map((category) => grant({ kind: "teachingDiscount", category, uptoLevel: fok }, fromLvl));
const teachAllFrom = (fromLvl: number, fok: SkillFok): GrantEntry => grant({ kind: "teachingDiscount", allSkills: true, uptoLevel: fok }, fromLvl);
// #3 cost penalty, #4 bans (→ warnings), #5 fok caps (→ warnings):
const costMult = (factor: number, ...cats: SkillCategory[]): GrantEntry[] => cats.map((category) => grant({ kind: "skillCostMultiplier", category, factor }));
const forbidSkills = (...skills: string[]): GrantEntry[] => skills.map((skill) => grant({ kind: "forbidSkill", skill }));
const forbidCat = (...cats: SkillCategory[]): GrantEntry[] => cats.map((category) => grant({ kind: "forbidSkill", category }));
const capSkill = (fok: SkillFok, ...skills: string[]): GrantEntry[] => skills.map((skill) => grant({ kind: "maxSkillFok", skill, fok }));
const capCat = (fok: SkillFok, ...cats: SkillCategory[]): GrantEntry[] => cats.map((category) => grant({ kind: "maxSkillFok", category, fok }));
const tag = (t: string): GrantEntry => grant({ kind: "tag", tag: t }); // #6: school "ability"/sense, like Elf látás
const equip = (item: string): GrantEntry => grant({ kind: "grantEquipment", item });
const restrict = (text: string): GrantEntry => grant({ kind: "restriction", text });

const ALL = ["Ember", "Elf", "Félelf", "Udvari Ork", "Törpe", "Kyr Származék"];

export const CLASSES: Record<string, ClassDef> = {
  // ── HARCOS (override: iskola) ──────────────────────────────────────────────
  Harcos: {
    name: "Harcos",
    cost: 5,
    allowedRaces: ALL,
    grants: [...teach("Fegyverhasználat", "Fegyverismeret", "Fájdalomtűrés", "Harctéri gyakorlat", "Hadvezetés", "Harci láz", "Pajzshasználat", "Pusztakezes harc", "Taktika", "Vértviselet", "Lélektan", "Lovaglás", "Állatismeret", "Futás", "Úszás", "Számtan/Mértan", "Térképészet", "Mászás", "Esés", "Akrobatika"), teachSub("Művészetek", "Rajz")],
    choices: [
      choice("iskola", "Iskola", "override", [
        opt("Általános (iskolázatlan)", [
          weaponChoice("fő fegyver", 3),
          weaponChoice("másodfegyver", 2),
          weaponChoice("harmadik fegyver", 2),
          weaponChoice("negyedik fegyver", 2),
          gs("Fegyverismeret", 2),
          gs("Fájdalomtűrés", 2),
          gs("Harctéri gyakorlat", 2),
          gs("Pajzshasználat", 2),
          gs("Állatismeret", 1, "hátas állatok"),
          gs("Lovaglás", 2),
          gs("Futás", 2),
          gp("Mászás", 15),
          gp("Esés", 15),
          gp("Akrobatika", 15),
        ]),
        opt("Amazon", [
          tag("Hazugságérzék"),
          grant({ kind: "tag", tag: "A Földanya Szolgálója" }, 6),
          grant({ kind: "resetTeaching" }),
          ...teachCat(4, "Harci", "Alvilági", "Világi", "Szociális"),
          restrict("Bármely nem Misztikus/Tudományos képzettség 4. fokú oktatóval, KM döntése és törzsi tudás szerint. 5. Tsz feletti próba után: Vallásismeret tanulható + Kegyelt háttér."),
          gs("Fegyverhasználat", 3, "emrelin kard"),
          gs("Fegyverhasználat", 2, "hajítófegyverek"),
          gs("Fegyverhasználat", 2, "íjak"),
          gs("Fegyverismeret", 2),
          gs("Fájdalomtűrés", 2),
          gs("Harctéri gyakorlat", 2),
          gs("Vadonjárás", 2, "mérsékelt égövi erdő"),
          gs("Herbalizmus", 2),
          gs("Állatismeret", 2),
          gs("Időjóslás", 2),
          gs("Lélektan", 1),
          gs("Udvari etikett/intrika", 1),
          gs("Futás", 2),
          gs("Úszás", 2),
          gp("Mászás", 10),
          gp("Esés", 10),
          gp("Akrobatika", 10),
          restrict("Csak nő."),
        ]),
        opt("Barbár", [
          grant({ kind: "tag", tag: "A sámánok kiválasztottja" }, 6),
          grant({ kind: "tag", tag: "Varázslátás" }, 11),
          grant({ kind: "resetTeaching" }),
          ...teachCat(4, "Harci", "Alvilági", "Világi", "Szociális", "Tudományos"),
          ...costMult(1.5, "Szociális", "Alvilági", "Tudományos"),
          ...forbidCat("Misztikus"),
          weaponChoice("fő fegyver", 3),
          weaponChoice("másodfegyver", 2),
          weaponChoice("harmadik fegyver", 2),
          gs("Fájdalomtűrés", 3),
          gs("Harctéri gyakorlat", 3),
          gs("Harci láz", 2),
          gs("Pusztakezes harc", 2),
          gs("Fegyverismeret", 2),
          gs("Vadonjárás", 2, "keleti sztyeppék"),
          gs("Herbalizmus", 2),
          gs("Állatismeret", 2),
          gs("Szakma", 2, "vadászat"),
          gs("Futás", 2),
          gs("Úszás", 2),
          bg("Mágiatagadás"),
          restrict("Szociális/Alvilági/Tudományos 1,5× Kp; Misztikus tilos; nem civilizált."),
        ]),
        opt("Erigowi számszeríjász", [
          ...teachOnly("Akrobatika", "Csapdaállítás", "Esés", "Fájdalomtűrés", "Fegyverhasználat", "Fegyverismeret", "Futás", "Hadvezetés", "Harctéri gyakorlat", "Jelbeszéd", "Lélektan", "Mászás", "Mechanika", "Nyomolvasás", "Számtan/Mértan", "Taktika", "Térképészet", "Úszás", "Vadonjárás"),
          teachSub("Művészetek", "Rajz"),
          gs("Fegyverhasználat", 3, "vadász számszeríj"),
          gs("Fegyverhasználat", 2, "egykezes kardok"),
          gs("Fegyverismeret", 2),
          gs("Csapdaállítás", 1),
          gs("Vadonjárás", 2, "mérsékelt égövi erdő"),
          gs("Nyomolvasás", 2),
          gs("Kocsmai verekedés", 1),
          gs("Jelbeszéd", 1),
          gs("Futás", 2),
          gs("Úszás", 2),
          gp("Lopódzás", 25),
          gp("Rejtőzködés", 25),
          equip("Szegecselt bőrvért + vadász számszeríj + rövid kard"),
        ]),
        opt("Gorviki siedon", [
          ...teachOnly("Akrobatika", "Álcázás/álruha", "Csapdakeresés", "Csomózás", "Élettan", "Esés", "Fájdalomtűrés", "Fegyverhasználat", "Fegyverismeret", "Harctéri gyakorlat", "Heraldika", "Írás/olvasás", "Kétkezesharc", "Kultúra", "Lopódzás", "Mászás", "Orvtámadás", "Párbaj", "Rejtekhelykutatás", "Rejtőzködés", "Szabadulóművészet", "Udvari etikett/intrika", "Vértviselet", "Zárnyitás"),
          gs("Fegyverhasználat", 3, "ramiera"),
          gs("Fegyverhasználat", 2, "tőr jellegű fegyverek"),
          gs("Fegyverhasználat", 2, "egykezes kardok"),
          gs("Orvtámadás", 2),
          gs("Fegyverismeret", 2),
          gs("Élettan", 1),
          gs("Udvari etikett/intrika", 2),
          gs("Heraldika", 1),
          gs("Párbaj", 2),
          gs("Írás/olvasás", 2),
          gs("Fájdalomtűrés", 2),
          gs("Úszás", 2),
          gp("Lopódzás", 15),
          bg("Nemesi vér"),
          equip("Ramiera (ura ajándéka)"),
        ]),
        opt("Predoci vértes", [
          ...teachOnly("Állatismeret", "Esés", "Fájdalomtűrés", "Fegyverhasználat", "Fegyverismeret", "Hadvezetés", "Harctéri gyakorlat", "Heraldika", "Idomítás", "Írás/olvasás", "Kultúra", "Lélektan", "Lovaglás", "Mászás", "Párbaj", "Számtan/Mértan", "Taktika", "Térképészet", "Udvari etikett/intrika", "Úszás", "Vértviselet"),
          teachSub("Művészetek", "Rajz"),
          teachSub("Művészetek", "Irodalom"),
          gs("Fegyverhasználat", 3, "nehézlovas kopja"),
          gs("Fegyverhasználat", 2, "egykezes kardok"),
          gs("Fegyverhasználat", 2, "tőr jellegű fegyverek"),
          gs("Fegyverismeret", 2),
          gs("Harctéri gyakorlat", 2),
          gs("Pajzshasználat", 2),
          gs("Vértviselet", 3),
          gs("Taktika", 2),
          gs("Lovaglás", 3),
          gs("Heraldika", 2),
          gs("Udvari etikett/intrika", 2),
          gs("Állatismeret", 2, "hátas állatok"),
          bg("Nemesi vér"),
          equip("Predoci rákozott vért + nehézlovas kopja + egyeneskard + telivér mén"),
          restrict("Nincs kezdő CÉ; sosem fejleszthet Célzóértéket."),
        ]),
      ]),
    ],
    suggestedAllocation: { HM: 10, Fp: 7, Kp: 15 },
  },

  // ── LOVAG (override: rend; Isten Kardja → nested Arc) ──────────────────────
  Lovag: {
    name: "Lovag",
    cost: 6,
    allowedRaces: ["Ember", "Félelf", "Kyr Származék"],
    grants: [
      bg("Nemesi vér"),
      ...teach("Fegyverhasználat", "Fegyverismeret", "Hadvezetés", "Harctéri gyakorlat", "Heraldika", "Lovaglás", "Párbaj", "Pajzshasználat", "Taktika", "Vértviselet", "Udvari etikett/intrika", "Történelem", "Lélektan", "Állatismeret", "Írás/olvasás", "Kultúra", "Nyelvtudás", "Számtan/Mértan", "Térképészet", "Élettan", "Esés", "Fájdalomtűrés"),
      teachSub("Művészetek", "Rajz"),
      restrict("Célzófegyvert és nemtelen hajítófegyvert elutasít."),
    ],
    choices: [
      choice("rend", "Lovagrend", "override", [
        opt("Általános lovag", [...lovagBase(), gs("Vértviselet", 3), gs("Párbaj", 2), gs("Állatismeret", 2, "hátas állatok"), weaponChoice("harmadik fegyver", 2)]),
        opt("Feketerendek", [
          grant({ kind: "tag", tag: "Ranagol beavatottja" }, 6),
          ...teachOnly("Állatismeret", "Élettan", "Esés", "Fájdalomtűrés", "Fegyverhasználat", "Fegyverismeret", "Hadvezetés", "Harctéri gyakorlat", "Heraldika", "Írás/olvasás", "Kultúra", "Lélektan", "Lovaglás", "Művészetek", "Nyelvtudás", "Ősi nyelv", "Pajzshasználat", "Párbaj", "Pszi", "Pusztítás", "Számtan/Mértan", "Taktika", "Térképészet", "Történelem", "Udvari etikett/intrika", "Vértviselet"),
          ...lovagBase(),
          gs("Vértviselet", 3),
          gs("Párbaj", 1),
          gs("Pajzshasználat", 2),
          gs("Fájdalomtűrés", 2),
          gs("Vallásismeret", 3, "Ranagol"),
          gs("Ősi nyelv", 1, "aquir"),
          bg("Vagyon"),
        ]),
        opt("Marico con Rabora", [
          tag("Borotvaéles pajzs"),
          ...teachOnly("Állatismeret", "Esés", "Fájdalomtűrés", "Fegyverhasználat", "Fegyverismeret", "Hadvezetés", "Harctéri gyakorlat", "Heraldika", "Írás/olvasás", "Kultúra", "Legendaismeret", "Lélektan", "Lovaglás", "Művészetek", "Nyelvtudás", "Pajzshasználat", "Párbaj", "Pszi", "Számtan/Mértan", "Taktika", "Térképészet", "Történelem", "Udvari etikett/intrika", "Vallásismeret", "Vértviselet"),
          ...teachCat(3, "Tudományos", "Alvilági"),
          ...lovagBase(),
          gs("Vértviselet", 2),
          gs("Párbaj", 1),
          gs("Pajzshasználat", 3),
          gs("Vallásismeret", 3, "Ranagol"),
          restrict("Pikkelyvértnél nehezebb páncél tilos; Tudományos/Alvilági 3. fokú kedvezmény."),
        ]),
        opt(
          "Isten Kardja lovagrend",
          [
            tag("Laikus testvér"),
            grant({ kind: "tag", tag: "Egyházi beavatás" }, 11),
            ...teachOnly("Állatismeret", "Esés", "Fájdalomtűrés", "Fegyverhasználat", "Fegyverismeret", "Hadvezetés", "Harctéri gyakorlat", "Heraldika", "Írás/olvasás", "Kultúra", "Legendaismeret", "Lélektan", "Lovaglás", "Művészetek", "Nyelvtudás", "Ősi nyelv", "Pajzshasználat", "Párbaj", "Pszi", "Számtan/Mértan", "Taktika", "Térképészet", "Történelem", "Udvari etikett/intrika", "Vallásismeret", "Vértviselet"),
            ...lovagBase(),
            gs("Vértviselet", 3),
            gs("Párbaj", 1),
            gs("Pajzshasználat", 2),
            gs("Vallásismeret", 3, "Domvik"),
            gs("Ősi nyelv", 2, "lingua domini"),
          ],
          [
            choice("arc", "Domvik Arca", "additive", [
              opt("1. Arc — Élet Teremtője", [gs("Orvoslás", 2), gs("Élettan", 2), gs("Herbalizmus", 2), gs("Lélektan", 2)]),
              opt("2. Arc — Jóság Forrása", [gs("Lélektan", 3), gs("Szakma", 2, "pénzügyek"), gs("Számtan/Mértan", 2)]),
              opt("3. Arc — Hit Védelmezője", [gs("Pusztítás", 3), gs("Élettan", 3)]),
              opt("4. Arc — Gyógyító", [gs("Orvoslás", 3), gs("Élettan", 3), gs("Herbalizmus", 3)]),
              opt("5. Arc — Tanító", [gs("Oktatás", 3), gs("Lélektan", 2)]),
              opt("6. Arc — Eretnekek Ostora", [gs("Lélektan", 3), gs("Vallásismeret", 3, "Ranagol")]),
            ]),
          ]
        ),
        opt("Erigowi Krad lovagrend", [
          ...teachOnly("Állatismeret", "Esés", "Fájdalomtűrés", "Fegyverhasználat", "Fegyverismeret", "Hadvezetés", "Harctéri gyakorlat", "Heraldika", "Írás/olvasás", "Kultúra", "Legendaismeret", "Lélektan", "Lovaglás", "Művészetek", "Pajzshasználat", "Párbaj", "Pszi", "Számtan/Mértan", "Taktika", "Térképészet", "Történelem", "Udvari etikett/intrika", "Vallásismeret", "Vértviselet"),
          ...teachCat(3, "Tudományos", "Misztikus"),
          ...lovagBase(),
          gs("Vértviselet", 3),
          gs("Párbaj", 1),
          gs("Hadvezetés", 3),
          gs("Lélektan", 2),
          gs("Történelem", 3),
          gs("Számtan/Mértan", 2),
          gs("Térképészet", 2),
          restrict("Tudományos/Misztikus 3. fokú kedvezmény."),
        ]),
      ]),
    ],
    suggestedAllocation: { HM: 12, Fp: 6, Kp: 10 },
  },

  // ── FEJVADÁSZ (típus override + klán additive) ─────────────────────────────
  Fejvadász: {
    name: "Fejvadász",
    cost: 7,
    allowedRaces: ["Ember", "Félelf", "Kyr Származék"],
    grants: [
      bg("Pszi érzékenység"),
      // No class-level teach list: each base TYPE carries its own (the book gives no general fejvadász list).
    ],
    choices: [
      choice("tipus", "Típus", "override", [
        opt("Harcos", [
          ...teachOnly("Akrobatika", "Álcázás/álruha", "Csapdaállítás", "Csapdakeresés", "Csomózás", "Élettan", "Esés", "Fájdalomtűrés", "Fegyverhasználat", "Fegyverismeret", "Harcművészet", "Harctéri gyakorlat", "Írás/olvasás", "Jelbeszéd", "Kétkezesharc", "Kínzás", "Kultúra", "Lopódzás", "Mászás", "Mechanika", "Nyomolvasás", "Orvtámadás", "Pszi", "Pusztakezes harc", "Pusztítás", "Rejtekhelykutatás", "Rejtőzködés", "Szabadulóművészet", "Számtan/Mértan", "Színészet", "Taktika", "Vakharc", "Vértviselet", "Zárnyitás"),
          gs("Fegyverhasználat", 3, "klán fegyvere"),
          weaponChoice("másodfegyver", 2),
          weaponChoice("fegyvercsoport", 1),
          gs("Pusztakezes harc", 2),
          gs("Fájdalomtűrés", 2),
          gs("Fegyverismeret", 2),
          gs("Álcázás/álruha", 2),
          gs("Orvtámadás", 2),
          gs("Élettan", 2),
          gs("Futás", 2),
          gs("Úszás", 2),
          gs("Pszi", 2, "pyarroni"),
          gs("Írás/olvasás", 1),
          gp("Lopódzás", 20),
          gp("Rejtőzködés", 20),
          gp("Csapdakeresés", 10),
          gp("Mászás", 10),
          gp("Esés", 10),
          gp("Akrobatika", 10),
        ]),
        opt("Orgyilkos", [
          ...teachOnly("Akrobatika", "Álcázás/álruha", "Csapdaállítás", "Csapdakeresés", "Csomózás", "Élettan", "Esés", "Fájdalomtűrés", "Fegyverhasználat", "Fegyverismeret", "Harcművészet", "Harctéri gyakorlat", "Írás/olvasás", "Jelbeszéd", "Kétkezesharc", "Kínzás", "Kultúra", "Lopódzás", "Mászás", "Mechanika", "Nyomolvasás", "Orvtámadás", "Pszi", "Pusztakezes harc", "Pusztítás", "Rejtekhelykutatás", "Rejtőzködés", "Szabadulóművészet", "Számtan/Mértan", "Színészet", "Taktika", "Vakharc", "Vértviselet", "Zárnyitás"),
          restrict("Hagyományos/nagy rendekben Magasmágia, Ősi nyelv, Rúnamágia, Tapasztalati mágia, Vallásismeret 3. fokig is tanulható."),
          gs("Fegyverhasználat", 3, "klán fegyvere"),
          weaponChoice("fegyvercsoport", 2),
          weaponChoice("fegyvercsoport", 1),
          gs("Pusztakezes harc", 1),
          gs("Fájdalomtűrés", 1),
          gs("Fegyverismeret", 1),
          gs("Álcázás/álruha", 3),
          gs("Színészet", 2),
          gs("Lélektan", 2),
          gs("Orvtámadás", 3),
          gs("Élettan", 2),
          gs("Futás", 2),
          gs("Úszás", 2),
          gs("Pszi", 2, "pyarroni"),
          gs("Írás/olvasás", 2),
          gp("Lopódzás", 30),
          gp("Rejtőzködés", 30),
          gp("Csapdakeresés", 10),
          gp("Mászás", 30),
          gp("Esés", 10),
          gp("Akrobatika", 10),
        ]),
        opt("Felderítő", [
          ...teachOnly("Akrobatika", "Álcázás/álruha", "Csapdaállítás", "Csapdakeresés", "Csomózás", "Élettan", "Esés", "Fájdalomtűrés", "Fegyverhasználat", "Fegyverismeret", "Harcművészet", "Harctéri gyakorlat", "Írás/olvasás", "Jelbeszéd", "Kétkezesharc", "Kínzás", "Kultúra", "Lélektan", "Lopódzás", "Mászás", "Mechanika", "Művészetek", "Nyomolvasás", "Orvtámadás", "Pszi", "Rejtekhelykutatás", "Rejtőzködés", "Szabadulóművészet", "Szakma", "Számtan/Mértan", "Színészet", "Taktika", "Vakharc", "Zárnyitás"),
          weaponChoice("fegyvercsoport", 2),
          weaponChoice("második fegyvercsoport", 2),
          weaponChoice("harmadik fegyvercsoport", 1),
          gs("Fájdalomtűrés", 1),
          gs("Fegyverismeret", 2),
          gs("Álcázás/álruha", 3),
          gs("Színészet", 2),
          gs("Lélektan", 2),
          gs("Orvtámadás", 1),
          gs("Élettan", 1),
          gs("Futás", 2),
          gs("Úszás", 2),
          gs("Pszi", 2, "pyarroni"),
          gs("Térképészet", 2),
          gs("Nyomolvasás", 2),
          gs("Vadonjárás", 2, "adott terep"),
          gs("Művészetek", 2, "rajz"),
          gs("Számtan/Mértan", 2),
          gp("Lopódzás", 25),
          gp("Rejtőzködés", 25),
          gp("Csapdakeresés", 10),
          gp("Mászás", 20),
          gp("Akrobatika", 10),
          gp("Veszélyérzék", 10),
          gp("Zárnyitás", 20),
        ]),
        opt("Testőr", [
          ...teachOnly("Akrobatika", "Álcázás/álruha", "Csapdaállítás", "Csapdakeresés", "Csomózás", "Élettan", "Esés", "Fájdalomtűrés", "Fegyverhasználat", "Fegyverismeret", "Harcművészet", "Harctéri gyakorlat", "Írás/olvasás", "Jelbeszéd", "Kétkezesharc", "Kínzás", "Kultúra", "Lopódzás", "Mászás", "Mechanika", "Művészetek", "Nyomolvasás", "Orvtámadás", "Pszi", "Pusztakezes harc", "Pusztítás", "Rejtekhelykutatás", "Rejtőzködés", "Szabadulóművészet", "Számtan/Mértan", "Színészet", "Taktika", "Vakharc", "Vértviselet", "Zárnyitás"),
          gs("Fegyverhasználat", 3, "klán fegyvere"),
          weaponChoice("másodfegyver", 2),
          weaponChoice("fegyvercsoport", 1),
          gs("Fájdalomtűrés", 2),
          gs("Vértviselet", 2),
          gs("Fegyverismeret", 2),
          gs("Harctéri gyakorlat", 2),
          gs("Hadvezetés", 2),
          gs("Taktika", 1, "kisebb egységes formációk"),
          gs("Lélektan", 2),
          gs("Térképészet", 1),
          gs("Orvtámadás", 1),
          gs("Élettan", 1),
          gs("Futás", 2),
          gs("Úszás", 2),
          gs("Pszi", 2, "pyarroni"),
          gp("Lopódzás", 10),
          gp("Rejtőzködés", 10),
          gp("Csapdakeresés", 20),
          gp("Esés", 10),
          gp("Akrobatika", 15),
          gp("Veszélyérzék", 20),
        ]),
      ]),
      choice("klan", "Klán", "additive", [
        opt("Gorviki Vértestvériség", [...teach("Heraldika", "Politika/diplomácia", "Udvari etikett/intrika"), equip("Fejvadászkard + klán felszerelés")]),
        opt("Anat-Akhan", [equip("Sequor / mara-se-quor"), restrict("5. Tsz+: meridián-specializáció (Cascadis/Mediator/Transceps).")]),
        opt("Toroni Ikrek", [grant({ kind: "tag", tag: "Fürkész" }, 5), grant({ kind: "tag", tag: "Ouars (Árnymágia)" }, 10), restrict("5. Tsz+: Fürkész; 8–10. Tsz: Ouars árnymágia.")]),
        opt("Embervadászok", [...teachCatFrom(11, 3, "Tudományos", "Misztikus"), restrict("5. Tsz+: Slan Pszi (max 4. fok); 10. Tsz+ a Sigranomói Egyetemen Tudományos/Misztikus képzettségek 3. fokú oktatóval.")]),
      ]),
    ],
    suggestedAllocation: { HM: 10, Fp: 7, Kp: 15, Psi: 2 },
  },

  // ── TOLVAJ (típus override + klán additive) ────────────────────────────────
  Tolvaj: {
    name: "Tolvaj",
    cost: 6,
    allowedRaces: ["Ember", "Félelf", "Udvari Ork", "Törpe", "Kyr Származék"],
    grants: teach("Fegyverhasználat", "Álcázás/álruha", "Hamisítás", "Jelbeszéd", "Kétkezesharc", "Orvtámadás", "Szabadulóművészet", "Szerencsejáték", "Csomózás", "Értékbecslés", "Mechanika", "Lélektan", "Ékesszólás", "Heraldika", "Helyismeret", "Kultúra", "Legendaismeret", "Számtan/Mértan", "Színészet", "Nyomolvasás", "Udvari etikett/intrika", "Lopódzás", "Rejtőzködés", "Rejtekhelykutatás", "Zárnyitás", "Zsebmetszés", "Csapdakeresés", "Mászás", "Esés", "Akrobatika", "Élettan", "Építészet", "Művészetek", "Írás/olvasás", "Kocsmai verekedés"),
    choices: [
      choice("tipus", "Típus", "override", [
        opt("Általános", [
          gs("Fegyverhasználat", 2, "egykezes kardok"),
          gs("Lélektan", 1),
          gs("Csomózás", 2),
          gs("Értékbecslés", 2),
          gs("Álcázás/álruha", 2),
          gs("Jelbeszéd", 1),
          gs("Orvtámadás", 1),
          gs("Szabadulóművészet", 1),
          gs("Szerencsejáték", 1),
          gs("Mechanika", 2),
          gs("Számtan/Mértan", 2),
          gp("Rejtekhelykutatás", 15),
          gp("Zárnyitás", 15),
          gp("Zsebmetszés", 15),
          gp("Lopódzás", 15),
          gp("Rejtőzködés", 15),
          gp("Mászás", 15),
          gp("Esés", 15),
          gp("Akrobatika", 15),
          gp("Csapdakeresés", 15),
        ]),
        opt("Zsebes", [
          gs("Fegyverhasználat", 2, "egykezes kardok"),
          gs("Álcázás/álruha", 2),
          gs("Mechanika", 2),
          gs("Számtan/Mértan", 2),
          gs("Értékbecslés", 2),
          gs("Orvtámadás", 1),
          gs("Jelbeszéd", 1),
          gs("Szabadulóművészet", 1),
          gs("Csomózás", 1),
          gs("Szerencsejáték", 1),
          gs("Lélektan", 1),
          gp("Rejtekhelykutatás", 15),
          gp("Zárnyitás", 15),
          gp("Zsebmetszés", 45),
          gp("Lopódzás", 30),
          gp("Rejtőzködés", 15),
          gp("Mászás", 15),
          gp("Akrobatika", 15),
        ]),
        opt("Hamisító", [
          gs("Fegyverhasználat", 2, "egykezes kardok"),
          gs("Hamisítás", 3),
          gs("Mechanika", 2),
          gs("Számtan/Mértan", 2),
          gs("Értékbecslés", 3),
          gs("Ékesszólás", 2),
          gs("Szakma", 2, "választható"),
          gs("Csomózás", 1),
          gs("Lélektan", 1),
          gs("Heraldika", 2),
          gs("Művészetek", 2),
          gs("Írás/olvasás", 3),
          gp("Rejtekhelykutatás", 10),
          gp("Zárnyitás", 10),
          gp("Lopódzás", 10),
          gp("Rejtőzködés", 10),
          gp("Mászás", 10),
          gp("Esés", 10),
          gp("Akrobatika", 10),
        ]),
        opt("Besurranó", [
          gs("Fegyverhasználat", 2, "egykezes kardok"),
          gs("Álcázás/álruha", 2),
          gs("Mechanika", 2),
          gs("Számtan/Mértan", 2),
          gs("Értékbecslés", 3),
          gs("Orvtámadás", 1),
          gs("Jelbeszéd", 1),
          gs("Szabadulóművészet", 1),
          gs("Csomózás", 1),
          gs("Lélektan", 1),
          gp("Rejtekhelykutatás", 30),
          gp("Zárnyitás", 30),
          gp("Zsebmetszés", 10),
          gp("Lopódzás", 30),
          gp("Rejtőzködés", 30),
          gp("Mászás", 30),
          gp("Esés", 15),
          gp("Akrobatika", 30),
          gp("Csapdakeresés", 20),
          gp("Veszélyérzék", 15),
        ]),
      ]),
      choice("klan", "Klán", "additive", [
        opt("Kobrák", [tag("A Család gondoskodása"), grant({ kind: "tag", tag: "Démon-esszencia" }, 11), ...teachCatFrom(6, 3, "Tudományos"), ...teachCatFrom(11, 3, "Misztikus"), restrict("5. Tsz+: Tudományos 3. fokú oktatóval; 10. Tsz+: Misztikus + démon-esszencia.")]),
        opt("Talavrai Csodaművesek", [teachAll(2), restrict("Minden képzettség 2. fokú oktatói kedvezménnyel.")]),
        opt("Szürkecsuklyások", [...teachCatFrom(6, 3, "Szociális", "Tudományos"), restrict("5. Tsz+: Szociális/Tudományos 3. fokú oktatóval; 10. Tsz+: ingyen Vagyon 3 + Rang 2.")]),
      ]),
    ],
    suggestedAllocation: { HM: 6, Fp: 3, Kp: 17 },
  },

  // ── BÁRD (override: iskola; Magányos mester = base) ────────────────────────
  Bárd: {
    name: "Bárd",
    cost: 6,
    allowedRaces: ["Ember", "Elf", "Félelf", "Kyr Származék"],
    grants: [
      tag("Főhangszer köteléke"),
      grant({ kind: "tag", tag: "Mágikus tárgyak érzékelése" }, 3),
      bg("Mágikus fogékonyság"),
      gs("Tapasztalati mágia", 3, "bárd"),
      ...teach("Tapasztalati mágia", "Művészetek", "Nyelvtudás", "Kultúra", "Legendaismeret", "Ékesszólás", "Lélektan", "Szexuális kultúra", "Színészet", "Történelem", "Udvari etikett/intrika", "Párbaj", "Heraldika", "Értékbecslés", "Fegyverhasználat", "Írás/olvasás", "Lopódzás", "Rejtőzködés", "Rejtekhelykutatás", "Zárnyitás", "Álcázás/álruha", "Szerencsejáték", "Kocsmai verekedés"),
      equip("Főhangszer (mágikus hangszer)"),
      allow("Pszi", "pyarroni"), // a bárd Pszi-t is tanulhat, ha a KM engedi
      restrict("Nehéz páncél és nehéz kétkezes fegyver tilos; pajzs ritka."),
    ],
    choices: [
      choice("iskola", "Iskola", "override", [
        opt("Magányos mester", [
          gs("Fegyverhasználat", 2, "egykezes kardok"),
          gs("Szexuális kultúra", 2),
          gs("Művészetek", 3, "ének/zene"),
          gs("Művészetek", 3, "második művészet"),
          gs("Nyelvtudás", 4, "anyanyelv"),
          gs("Kultúra", 4, "saját"),
          gs("Legendaismeret", 3),
          gp("Lopódzás", 10),
          gp("Rejtőzködés", 10),
        ]),
        opt("Aszisz Énekmondó", [
          ...teachOnly("Akrobatika", "Álcázás/álruha", "Csapdakeresés", "Csomózás", "Értékbecslés", "Fegyverhasználat", "Hamisítás", "Heraldika", "Írás/olvasás", "Kocsihajtás", "Kocsmai verekedés", "Kultúra", "Legendaismeret", "Lélektan", "Lopódzás", "Művészetek", "Rejtekhelykutatás", "Rejtőzködés", "Szabadulóművészet", "Szerencsejáték", "Szexuális kultúra", "Színészet", "Tapasztalati mágia", "Történelem", "Zárnyitás", "Zsebmetszés"),
          gs("Fegyverhasználat", 2, "egykezes kardok"),
          gs("Fegyverhasználat", 2, "dobófegyverek"),
          gs("Kocsmai verekedés", 2),
          gs("Értékbecslés", 1),
          gs("Szerencsejáték", 2),
          gs("Legendaismeret", 1),
          gs("Művészetek", 1, "éneklés"),
          gs("Művészetek", 1, "zenélés"),
          gs("Szexuális kultúra", 2),
          gs("Lélektan", 1),
          gp("Akrobatika", 10),
          gp("Lopódzás", 10),
          gp("Rejtőzködés", 10),
          gp("Zsebmetszés", 10),
          gp("Csapdakeresés", 10),
          gp("Rejtekhelykutatás", 10),
        ]),
        opt("Lombhullás Árvái", [
          ...teachOnly("Akrobatika", "Értékbecslés", "Fegyverhasználat", "Heraldika", "Írás/olvasás", "Legendaismeret", "Lélektan", "Lopódzás", "Művészetek", "Nyelvtudás", "Rejtekhelykutatás", "Rejtőzködés", "Szerencsejáték", "Szexuális kultúra", "Színészet", "Tapasztalati mágia", "Történelem"),
          ...forbidSkills("Kocsmai verekedés", "Orvtámadás", "Méregkeverés/semlegesítés", "Zsebmetszés", "Szakma"),
          gs("Fegyverhasználat", 2, "egykezes kardok"),
          gs("Fegyverhasználat", 2, "tőr jellegű fegyverek"),
          gs("Művészetek", 3, "éneklés"),
          gs("Művészetek", 2, "zenélés"),
          gs("Művészetek", 2, "színészet"),
          gs("Művészetek", 2, "irodalom"),
          gs("Párbaj", 2),
          gs("Udvari etikett/intrika", 1),
          gs("Heraldika", 2),
          gs("Írás/olvasás", 2),
          bg("Nemesi vér"),
          restrict("Sosem tanulhat: Kocsmai verekedés, Orvtámadás, Méregkeverés, Zsebmetszés, Szakma."),
        ]),
        opt("Vándorló dalnok", [
          tag("Farkaslélek"),
          ...teachOnly("Akrobatika", "Állatismeret", "Csomózás", "Értékbecslés", "Esés", "Fegyverhasználat", "Hangutánzás", "Harctéri gyakorlat", "Herbalizmus", "Idomítás", "Kocsmai verekedés", "Kultúra", "Legendaismeret", "Lélektan", "Lopódzás", "Lovaglás", "Mászás", "Párbaj", "Rejtőzködés", "Szexuális kultúra", "Tapasztalati mágia", "Vadonjárás"),
          teachSub("Művészetek", "éneklés"),
          teachSub("Művészetek", "zenélés"),
          ...forbidSkills("Kínzás", "Pusztítás", "Orvtámadás", "Méregkeverés/semlegesítés", "Zsebmetszés"),
          gs("Fegyverhasználat", 2, "egykezes kardok"),
          gs("Fegyverhasználat", 2, "íjak"),
          gs("Lovaglás", 3),
          gs("Idomítás", 2),
          gs("Állatismeret", 2),
          gs("Vadonjárás", 2, "mérsékelt égövi erdő"),
          gs("Nyomolvasás", 2),
          gs("Herbalizmus", 1),
          gs("Legendaismeret", 2),
          gs("Művészetek", 2, "éneklés"),
          gs("Művészetek", 2, "zenélés"),
          gp("Mászás", 10),
          gp("Esés", 10),
          gp("Akrobatika", 10),
          restrict("Sosem tanulhat: Kínzás, Pusztítás, Orvtámadás, Méregkeverés, Zsebmetszés."),
        ]),
        opt("Sötét bárd", [
          ...teachOnly("Álcázás/álruha", "Élettan", "Fegyverhasználat", "Írás/olvasás", "Kétkezesharc", "Kínzás", "Kultúra", "Legendaismeret", "Lélektan", "Lopódzás", "Művészetek", "Orvtámadás", "Rejtőzködés", "Színészet", "Tapasztalati mágia", "Történelem", "Udvari etikett/intrika", "Vallásismeret"),
          gs("Fegyverhasználat", 2, "egykezes kardok"),
          gs("Fegyverhasználat", 2, "tőr jellegű fegyverek"),
          gs("Kínzás", 2),
          gs("Orvtámadás", 2),
          gs("Élettan", 2),
          gs("Írás/olvasás", 2),
          gs("Udvari etikett/intrika", 2),
          gs("Lélektan", 1),
          gs("Vallásismeret", 1, "Ranagol"),
          gs("Álcázás/álruha", 2),
          gs("Művészetek", 2, "éneklés"),
          gs("Művészetek", 2, "zenélés"),
          gs("Művészetek", 1, "szobrászat"),
          gs("Művészetek", 1, "irodalom"),
          gp("Lopódzás", 10),
          gp("Rejtőzködés", 10),
        ]),
      ]),
    ],
    suggestedAllocation: { HM: 6, Fp: 4, Kp: 14, Mana: 5 },
  },

  // ── HARCMŰVÉSZ (additive: stílus) ──────────────────────────────────────────
  Harcművész: {
    name: "Harcművész",
    cost: 10,
    allowedRaces: ["Ember", "Félelf", "Kyr Származék"],
    grants: [
      tag("Stílusharc"),
      bg("Pszi érzékenység"),
      ...teach("Harcművészet", "Harctéri gyakorlat", "Fájdalomtűrés", "Fegyverismeret", "Kétkezesharc", "Vakharc", "Vértviselet", "Pszi", "Élettan", "Orvoslás", "Herbalizmus", "Futás", "Akrobatika", "Esés", "Művészetek", "Nyelvtudás", "Kultúra", "Párbaj", "Udvari etikett/intrika", "Írás/olvasás"),
      equip("Iskola hagyományos fegyvere (irei)"),
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
        opt("Shien-ka-to (Tűz)", [...teachCat(2, "Harci", "Alvilági", "Világi", "Tudományos", "Szociális"), gs("Harcművészet", 3, "Shien-ka-to"), gs("Harcművészet", 3, "hosszú bot"), restrict("Listán kívüli, nem-misztikus képzettségek 2. fokú oktatói kedvezménnyel.")]),
        opt("Dart-nid-kinito (Víz)", [...teachAt(3, "Nekromancia", "Démonológia"), teachSub("Ősi nyelv", "kyr", 3), gs("Harcművészet", 3, "Dart-nid-kinito"), restrict("Fegyvertelen.")]),
        opt("Avad-ka-kinito (Föld)", [...teach("Hadvezetés", "Térképészet", "Számtan/Mértan", "Lélektan"), teachSub("Művészetek", "Rajz"), gs("Harcművészet", 3, "Avad-ka-kinito"), gs("Harcművészet", 3, "választott alapfegyver"), gs("Harctéri gyakorlat", 2), gs("Vértviselet", 2), gs("Hadvezetés", 2), equip("Papír-szövet könnyű páncél (SFÉ 2)")]),
        opt("Nisen-nid-to (Levegő)", [...teach("Veszélyérzék", "Hadvezetés", "Lélektan", "Térképészet", "Számtan/Mértan", "Taktika"), teachSub("Művészetek", "Rajz"), gs("Harcművészet", 3, "Nisen-nid-to"), gs("Harcművészet", 3, "Nisen-kard"), equip("Fegyverkabát (SFÉ 1)"), restrict("Csak Par-Elyában vagy DiMaremben tanulható.")]),
        opt("Udvari kardművész", [tag("Dhala-saan"), ...teachCat(3, "Szociális", "Tudományos"), ...teachAt(3, "Hadvezetés"), gs("Harcművészet", 3, "Slan kard"), gs("Harcművészet", 3, "Slan tőr"), bg("Nemesi vér"), bg("Vagyon"), equip("Kardművész vért (SFÉ 4)"), restrict("Dhala-saan technika.")]),
        opt("A harc útja", [tag("Shien-su"), ...teachCat(3, "Harci"), ...teachAt(3, "Lélektan", "Számtan/Mértan", "Térképészet", "Jog/törvénykezés", "Történelem", "Vallásismeret", "Állatismeret", "Lovaglás"), gs("Harcművészet", 3, "Slan kard"), gs("Harcművészet", 3, "Slan tőr"), equip("Kardművész vért (SFÉ 4)"), restrict("Shien-su technika.")]),
      ]),
    ],
    suggestedAllocation: { HM: 8, Fp: 7, Kp: 14, Psi: 3 },
  },

  // ── PAP (additive: rend; Arel-pap → nested irányzat) ───────────────────────
  Pap: {
    name: "Pap",
    cost: 7,
    allowedRaces: ["Ember", "Elf", "Félelf", "Törpe", "Kyr Származék"],
    grants: [
      bg("Kegyelt"),
      ...teach("Vallásismeret", "Ékesszólás", "Élettan", "Fegyverhasználat", "Heraldika", "Herbalizmus", "Írás/olvasás", "Jog/törvénykezés", "Kultúra", "Legendaismeret", "Lélektan", "Művészetek", "Nyelvtudás", "Orvoslás", "Ősi nyelv", "Politika/diplomácia", "Pszi", "Számtan/Mértan", "Térképészet", "Történelem", "Udvari etikett/intrika"),
    ],
    baseSkills: [
      gs("Vallásismeret", 3),
      gs("Fegyverhasználat", 2, "egykezes kardok"),
      gs("Lélektan", 2),
      gs("Ékesszólás", 2),
      gs("Írás/olvasás", 3),
      gs("Nyelvtudás", 3, "anyanyelv"),
      gs("Nyelvtudás", 2, "második nyelv"),
      gs("Történelem", 2),
      gs("Legendaismeret", 1),
    ],
    choices: [
      choice("rend", "Istenség / Rend", "additive", [
        opt("Domvik-pap", [...teach("Hadvezetés", "Oktatás"), teachSub("Ősi nyelv", "lingua domini"), teachSub("Ősi nyelv", "godoni"), gs("Jog/törvénykezés", 2), gs("Ősi nyelv", 3, "lingua domini"), gs("Herbalizmus", 2), gs("Orvoslás", 2), gs("Élettan", 2), restrict("Szférák: Élet, Lélek, Természet + Domvik.")]),
        opt("Ranagol-pap", [...teach("Alkímia", "Kínzás", "Művészetek"), teachSub("Ősi nyelv", "aquir"), gs("Ősi nyelv", 2, "aquir"), gs("Pszi", 3, "pyarroni"), gs("Kínzás", 2), gs("Élettan", 2), gs("Méregkeverés/semlegesítés", 2), gs("Alkímia", 1), gs("Herbalizmus", 1), restrict("Szférák: Halál, Lélek, Természet + Ranagol.")]),
        opt(
          "Arel-pap",
          [
            ...teach("Állatismeret", "Hadvezetés", "Harci láz", "Harctéri gyakorlat", "Fájdalomtűrés", "Fegyverismeret", "Idomítás", "Kocsmai verekedés", "Lovaglás", "Nyomolvasás", "Szakma", "Szerencsejáték", "Vadonjárás"),
            gs("Fegyverhasználat", 3, "íjak"),
            gs("Harctéri gyakorlat", 2),
            gs("Lovaglás", 3),
            gs("Vadonjárás", 2, "választott terep"),
            gs("Herbalizmus", 2),
            gs("Állatismeret", 2),
            gs("Idomítás", 2),
            gs("Szakma", 3, "vadászat"),
            remove("Írás/olvasás"),
            restrict("Nincs Írás/olvasás 3 és nincs kezdő Pszi."),
          ],
          [
            choice("iranyzat", "Arel irányzat", "additive", [
              opt("Sólyomszív", [restrict("Szférák: Természet + Lélek.")]),
              opt("Sólyomcsőr", [restrict("Szférák: Természet + Élet.")]),
              opt("Sólyomkarom", [restrict("Szférák: Természet + Halál.")]),
            ]),
          ]
        ),
        opt("Kyel-pap", [...teach("Fegyverismeret", "Hadvezetés", "Harctéri gyakorlat", "Pajzshasználat", "Pusztítás", "Vértviselet"), bg("Pszi érzékenység"), gs("Vértviselet", 2), gs("Pajzshasználat", 2), gs("Pusztítás", 2), gs("Jog/törvénykezés", 3), gs("Pszi", 2, "pyarroni"), gs("Hadvezetés", 1), gs("Harctéri gyakorlat", 1), gs("Élettan", 1), restrict("Csak férfi; fegyver csak buzogány; szférák: Élet, Halál, Lélek + Kyel.")]),
        opt("Sogron-pap", [grant({ kind: "tag", tag: "Tűzvarázslói beavatás" }, 5), grant({ kind: "tag", tag: "Godoni pszi" }, 10), ...teach("Hadvezetés", "Vértviselet"), teachSub("Tapasztalati mágia", "tűzvarázsló"), gs("Hadvezetés", 2), gs("Vértviselet", 1), gs("Őselemi mágia", 2, "tűz"), gs("Ősi nyelv", 2, "kyr"), restrict("Fegyver: lángkard/lángtőr; szférák: Élet, Természet, Lélek + Sogron.")]),
        opt("Tharr-pap", [...teach("Alkímia", "Kínzás", "Méregkeverés/semlegesítés", "Orvtámadás"), gs("Élettan", 2), gs("Kínzás", 2), gs("Politika/diplomácia", 2), gs("Orvtámadás", 2), gs("Méregkeverés/semlegesítés", 2), gs("Udvari etikett/intrika", 2), gs("Herbalizmus", 1), gs("Alkímia", 1), restrict("Szférák: Lélek, Halál + Tharr.")]),
      ]),
    ],
    suggestedAllocation: { HM: 6, Fp: 3, Kp: 10, Kegy: 8 },
  },

  // ── PAPLOVAG (additive: rend) ──────────────────────────────────────────────
  Paplovag: {
    name: "Paplovag",
    cost: 6,
    allowedRaces: ["Ember", "Félelf", "Kyr Származék"],
    grants: [
      bg("Kegyelt"), // book: csak Kegyelt + rendi fegyverzet — Nemesi vér NEM jár (a könyv nem-nemes paplovagot is enged)
      ...teach("Vallásismeret", "Fegyverhasználat", "Fegyverismeret", "Hadvezetés", "Harctéri gyakorlat", "Heraldika", "Lovaglás", "Pajzshasználat", "Vértviselet", "Fájdalomtűrés", "Lélektan", "Állatismeret", "Ékesszólás", "Herbalizmus", "Írás/olvasás", "Kultúra", "Legendaismeret", "Művészetek", "Nyelvtudás", "Orvoslás", "Pszi", "Számtan/Mértan", "Térképészet", "Történelem", "Udvari etikett/intrika"),
      equip("Rendi vértezet + fegyver (istenség szerint)"),
      restrict("Célzófegyver becstelennek számít."),
    ],
    baseSkills: [
      gs("Vallásismeret", 3),
      weaponChoice("fő fegyver", 3),
      weaponChoice("másodfegyver", 2), // book: "Fegyverhasználat vagy Pajzshasználat" — set to Fegyverhasználat (TODO)
      gs("Fájdalomtűrés", 2),
      gs("Hadvezetés", 2),
      gs("Harctéri gyakorlat", 2),
      gs("Vértviselet", 3),
      gs("Állatismeret", 2, "hátas állatok"),
      gs("Lovaglás", 3),
      gs("Heraldika", 2),
      gs("Lélektan", 2),
      gs("Udvari etikett/intrika", 2),
      gs("Írás/olvasás", 2),
      gs("Történelem", 2),
    ],
    choices: [
      choice("rend", "Paplovagrend", "additive", [
        opt("Darton-paplovag (Maremita)", [...teach("Kocsmai verekedés", "Élettan", "Pusztakezes harc", "Pusztítás", "Szerencsejáték"), gs("Harctéri gyakorlat", 3), gs("Pusztítás", 2), gs("Pusztakezes harc", 2), gs("Kocsmai verekedés", 2), gs("Élettan", 2), gs("Szerencsejáték", 2), remove("Pajzshasználat"), equip("Acél teljesvértezet + nyílt sisak"), restrict("Nincs Pajzshasználat; mágikus gyógyítás tilos.")]),
        opt("Domvik-paplovag (Isten Kardja)", [...teach("Élettan", "Jog/törvénykezés", "Politika/diplomácia", "Ősi nyelv"), gs("Ékesszólás", 2), gs("Politika/diplomácia", 2), gs("Herbalizmus", 2), gs("Orvoslás", 2), gs("Ősi nyelv", 2, "lingua domini"), gs("Élettan", 2), equip("Acél teljesvértezet, nagy sisak, acélpajzs, lovagkard")]),
        opt("Dreina-paplovag (Oroszlánszív)", [...teach("Értékbecslés", "Jog/törvénykezés", "Politika/diplomácia"), teachSub("Szakma", "birtokigazgatás"), teachSub("Szakma", "pénzügyek"), gs("Számtan/Mértan", 2), gs("Szakma", 2, "birtokigazgatás vagy pénzügyek"), gs("Jog/törvénykezés", 2), gs("Politika/diplomácia", 2), gs("Kultúra", 2, "saját"), gs("Nyelvtudás", 2, "második nyelv"), equip("Acél teljesvértezet, sisak, acélpajzs, lovagkard")]),
        opt("Krad-paplovag (Aranykör lovag)", [...teach("Jog/törvénykezés", "Térképészet"), gs("Írás/olvasás", 3), gs("Történelem", 3), gs("Térképészet", 2), gs("Legendaismeret", 2), gs("Számtan/Mértan", 2), gs("Kultúra", 2, "saját"), gs("Nyelvtudás", 2, "második nyelv"), equip("Acél félvértezet, sisak, acélpajzs, hosszúkard")]),
        opt("Ranagol-paplovag", [...teach("Méregkeverés/semlegesítés", "Alkímia", "Orvtámadás", "Kínzás"), gs("Fegyverhasználat", 2, "nyeles fegyverek"), gs("Élettan", 2), gs("Kínzás", 2), gs("Orvtámadás", 2), gs("Méregkeverés/semlegesítés", 2), gs("Herbalizmus", 1), gs("Alkímia", 1), equip("Acél félvértezet, acélpajzs, lovagkard, nehézlovas kopja")]),
        opt("Sogron-paplovag", [tag("Tűzmágia Kegy-pontból"), ...teach("Hajózás", "Térképészet", "Tapasztalati mágia", "Csomózás", "Ősi nyelv", "Taktika"), gs("Tapasztalati mágia", 2, "tűzvarázsló"), gs("Taktika", 2), gs("Hadvezetés", 2), equip("Lángkard + acél pikkelyvértezet + kobra sisak"), restrict("Tűzmágia Kegy pontból; 3. fok fegyver: lángkard.")]),
        opt("Uwel-paplovag", [...teach("Pusztítás", "Jog/törvénykezés"), gs("Térképészet", 2), gs("Jog/törvénykezés", 2), gs("Pusztítás", 2), gs("Számtan/Mértan", 2), gs("Élettan", 2), equip("Acél félvértezet + sisak")]),
      ]),
    ],
    suggestedAllocation: { HM: 9, Fp: 7, Kp: 10, Kegy: 6 },
  },

  // ── BOSZORKÁNY (additive: rend) ────────────────────────────────────────────
  Boszorkány: {
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
  },

  // ── BOSZORKÁNYMESTER (override: céh) ───────────────────────────────────────
  Boszorkánymester: {
    name: "Boszorkánymester",
    cost: 6,
    allowedRaces: ["Ember", "Udvari Ork", "Kyr Származék"],
    grants: [
      tag("Hatalom Itala"),
      bg("Mágikus fogékonyság"),
      bg("Pszi érzékenység"),
      ...teach("Tapasztalati mágia", "Nekromancia", "Alkímia", "Élettan", "Herbalizmus", "Méregkeverés/semlegesítés", "Orvtámadás", "Orvoslás", "Írás/olvasás", "Számtan/Mértan", "Nyelvtudás", "Kultúra", "Legendaismeret", "Történelem", "Pszi", "Szakma", "Fegyverhasználat", "Heraldika", "Ősi nyelv", "Rúnamágia", "Démonológia"),
      restrict("Varázserő a Hatalom Italából (−4 Egészség/adag)."),
    ],
    choices: [
      choice("ceh", "Céh", "override", [
        opt("Általános", [
          gs("Tapasztalati mágia", 3, "boszorkánymester"),
          gs("Nekromancia", 2),
          gs("Fegyverhasználat", 2, "tőr jellegű fegyverek"),
          gs("Nyelvtudás", 2, "anyanyelv"),
          gs("Alkímia", 2),
          gs("Élettan", 2),
          gs("Herbalizmus", 2),
          gs("Írás/olvasás", 2),
          gs("Méregkeverés/semlegesítés", 2),
          gs("Számtan/Mértan", 2),
          gs("Pszi", 2, "pyarroni"),
        ]),
        opt("Aszisz Vérkelyhesek", [
          ...teach("Udvari etikett/intrika", "Politika/diplomácia", "Történelem"),
          gs("Tapasztalati mágia", 3, "boszorkánymester"),
          gs("Fegyverhasználat", 2, "tőr jellegű fegyverek"),
          gs("Herbalizmus", 3),
          gs("Alkímia", 3),
          gs("Méregkeverés/semlegesítés", 3),
          gs("Írás/olvasás", 2),
          gs("Számtan/Mértan", 3),
          gs("Pszi", 2, "pyarroni"),
          gs("Nekromancia", 2),
          gs("Élettan", 2),
          gs("Nyelvtudás", 2, "anyanyelv"),
          gs("Politika/diplomácia", 3),
          gs("Udvari etikett/intrika", 3),
          gs("Történelem", 3),
        ]),
        opt("Ascens Morga", [
          grant({ kind: "tag", tag: "Méregvarázs" }, 5),
          ...teach("Udvari etikett/intrika", "Politika/diplomácia", "Történelem", "Térképészet", "Lélektan", "Hadvezetés", "Taktika", "Művészetek", "Rúnamágia", "Színészet"),
          gs("Tapasztalati mágia", 3, "boszorkánymester"),
          gs("Fegyverhasználat", 2, "tőr jellegű fegyverek"),
          weaponChoice("másodfegyver", 2),
          gs("Herbalizmus", 3),
          gs("Alkímia", 3),
          gs("Méregkeverés/semlegesítés", 3),
          gs("Írás/olvasás", 2),
          gs("Számtan/Mértan", 3),
          gs("Pszi", 2, "pyarroni"),
          gs("Nekromancia", 1),
          gs("Élettan", 2),
          gs("Orvtámadás", 2),
          gs("Politika/diplomácia", 1),
          gs("Udvari etikett/intrika", 2),
          gs("Történelem", 2),
        ]),
        opt("Hergoli Villámmesterek", [
          tag("Villámmesterség"),
          tag("Vándorvillám"),
          tag("Villámmágnes"),
          ...forbidSkills("Nekromancia", "Démonológia"),
          gs("Tapasztalati mágia", 3, "boszorkánymester"),
          gs("Fegyverhasználat", 2, "tőr jellegű fegyverek"),
          gs("Herbalizmus", 2),
          gs("Alkímia", 2),
          gs("Méregkeverés/semlegesítés", 2),
          gs("Írás/olvasás", 2),
          gs("Számtan/Mértan", 2),
          gs("Pszi", 2, "pyarroni"),
          gs("Politika/diplomácia", 2),
          gs("Csomózás", 2),
          gs("Értékbecslés", 2),
          gs("Hajózás", 2),
          restrict("Villámmágia specializáció; villám elnyelése/tárolása."),
        ]),
      ]),
    ],
    suggestedAllocation: { HM: 6, Fp: 4, Kp: 13, Mana: 7 },
  },

  // ── TŰZVARÁZSLÓ (additive: rend) ───────────────────────────────────────────
  Tűzvarázsló: {
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
      choice("rend", "Ordani ág", "additive", [
        opt("Tűz Hordozói", [restrict("Alapértelmezett ág 5. Tsz alatt; Tűzmágia tudósai.")]),
        opt("Tűz Táplálói", [restrict("Vallási/oktató ág; Sogron Útja (5+ Tsz).")]),
        opt("Tűz Harcosai", [restrict("Harci/védelmi ág; Lángőrök — belépéskor Tapasztalati mágia / Ősi nyelv / Pszi kiképzés.")]),
        opt("Aschaon Tűzmesterei", [tag("Hatalom Itala"), grant({ kind: "tag", tag: "Lángtetoválás" }, 3), teachSub("Tapasztalati mágia", "Boszorkánymesteri", 3), restrict("Nincs Magasiskola; Mana csak Hatalom Italából; Tapasztalati mágia (Boszorkánymesteri) 3. fokú oktatóval; nőket is felvesz.")]),
      ]),
      choice("iranyzat", "Sogron misztériumának irányzata", "additive", [
        opt("Nincs külön irányzat", [restrict("Az irányzatok jellemzően 5. Tapasztalati szinttől választhatók.")]),
        opt("A Pusztító Tűz Útja", [...teachCatFrom(5, 4, "Harci", "Tudományos", "Világi"), restrict("5. Tsz+: bármely Harci/Tudományos/Világi képzettség 4. fokú oktatói kedvezménnyel — a pusztító erő növelésére.")]),
        opt("Sogron Útja", [grant({ kind: "tag", tag: "Sogron pappá szentelés" }, 5), restrict("5. Tsz+: Sogron-pappá válhat (Kegyelt háttér, Vallásismeret 3. fok); nem-isteni mana-módszereit elveszti.")]),
        opt("A Fény Ösvénye", [grant({ kind: "teachingDiscount", skill: "Pszi", subtype: "Godoni Ösvény", uptoLevel: 3 }, 5), restrict("5. Tsz+: Pszi (Godoni Ösvény) 3. fokú oktatói kedvezménnyel.")]),
        opt("Sogronita szerafisták", [grant({ kind: "tag", tag: "Szeráfi alku" }, 10), ...teachFrom(6, 4, "Démonológia"), restrict("6.–10. Tsz közti képzés alatt Démonológia sajátítható el; 10. Tsz-re legalább 3. fok kell.")]),
        opt("Renegátok", [grant({ kind: "classCostDelta", amount: -1 }), restrict("−1 KAP iskolaköltség; nincs fegyver-/vértkorlát; nem tanulhat Godoni Örökséget vagy Tűzmágia magasiskolát; nem lehet szerafista.")]),
      ]),
    ],
    suggestedAllocation: { HM: 7, Fp: 5, Kp: 10, Mana: 6 },
  },

  // ── VARÁZSLÓ (additive: iskola; Lar-Dor → Pszi-csere) ──────────────────────
  Varázsló: {
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
        opt("Doran", [tag("Dorani varázslóbot"), equip("Élő varázslóbot (1. Tsz)"), restrict("Nekromancia/Démonidézés engedett; bot saját Pszi/Mp-vel.")]),
      ]),
    ],
    suggestedAllocation: { HM: 0, Fp: 0, Kp: 15, Mana: 10 },
  },
};

// The shared base for Lovag schools (override class — each school is base + signature deltas).
function lovagBase(): GrantEntry[] {
  return [
    weaponChoice("fő fegyver", 3),
    weaponChoice("másodfegyver", 2),
    gs("Harctéri gyakorlat", 2),
    gs("Fegyverismeret", 2),
    gs("Hadvezetés", 1),
    gs("Lovaglás", 3),
    gs("Udvari etikett/intrika", 2),
    gs("Heraldika", 2),
    gs("Történelem", 2),
    gs("Írás/olvasás", 2),
  ];
  // Vértviselet, Párbaj and Állatismeret vary by order → granted per-option, not here.
}

export const CLASS_NAMES = Object.keys(CLASSES);
