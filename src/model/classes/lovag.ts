import { GrantEntry, grant } from "../effects";
import { choice, opt } from "../choices";
import {
  bg, gs, restrict, tag, teach, teachCat, teachOnly, teachSub, weaponChoice,
} from "../grantDsl";
import { ClassDef } from "./def";

// ── LOVAG (override: rend; Isten Kardja → nested Arc) ──────────────────────
export const Lovag: ClassDef = {
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
