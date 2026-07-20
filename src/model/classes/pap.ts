import { grant } from "../effects";
import { choice, opt } from "../choices";
import { bg, gs, remove, restrict, sphere, spheres, teach, teachSub } from "../grantDsl";
import { ClassDef } from "./def";

// ── PAP (additive: rend; Arel-pap → nested irányzat) ───────────────────────
export const Pap: ClassDef = {
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
      opt("Domvik-pap", [...teach("Hadvezetés", "Oktatás"), teachSub("Ősi nyelv", "lingua domini"), teachSub("Ősi nyelv", "godoni"), gs("Jog/törvénykezés", 2), gs("Ősi nyelv", 3, "lingua domini"), gs("Herbalizmus", 2), gs("Orvoslás", 2), gs("Élettan", 2), ...spheres("Élet", "Lélek", "Természet"), restrict("Szférák: Élet, Lélek, Természet + Domvik.")]),
      opt("Ranagol-pap", [...teach("Alkímia", "Kínzás", "Művészetek"), teachSub("Ősi nyelv", "aquir"), gs("Ősi nyelv", 2, "aquir"), gs("Pszi", 3, "pyarroni"), gs("Kínzás", 2), gs("Élettan", 2), gs("Méregkeverés/semlegesítés", 2), gs("Alkímia", 1), gs("Herbalizmus", 1), ...spheres("Halál", "Lélek", "Természet"), restrict("Szférák: Halál, Lélek, Természet + Ranagol.")]),
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
          sphere("Természet"), // közös Arel-szféra; az irányzat adja a másodikat
          restrict("Nincs Írás/olvasás 3 és nincs kezdő Pszi."),
        ],
        [
          choice("iranyzat", "Arel irányzat", "additive", [
            opt("Sólyomszív", [sphere("Lélek"), restrict("Szférák: Természet + Lélek.")]),
            opt("Sólyomcsőr", [sphere("Élet"), restrict("Szférák: Természet + Élet.")]),
            opt("Sólyomkarom", [sphere("Halál"), restrict("Szférák: Természet + Halál.")]),
          ]),
        ]
      ),
      opt("Kyel-pap", [...teach("Fegyverismeret", "Hadvezetés", "Harctéri gyakorlat", "Pajzshasználat", "Pusztítás", "Vértviselet"), bg("Pszi érzékenység"), gs("Vértviselet", 2), gs("Pajzshasználat", 2), gs("Pusztítás", 2), gs("Jog/törvénykezés", 3), gs("Pszi", 2, "pyarroni"), gs("Hadvezetés", 1), gs("Harctéri gyakorlat", 1), gs("Élettan", 1), ...spheres("Élet", "Halál", "Lélek"), restrict("Csak férfi; fegyver csak buzogány; szférák: Élet, Halál, Lélek + Kyel.")]),
      opt("Sogron-pap", [grant({ kind: "tag", tag: "Tűzvarázslói beavatás" }, 5), grant({ kind: "tag", tag: "Godoni pszi" }, 10), ...teach("Hadvezetés", "Vértviselet"), teachSub("Tapasztalati mágia", "tűzvarázsló"), gs("Hadvezetés", 2), gs("Vértviselet", 1), gs("Őselemi mágia", 2, "tűz"), gs("Ősi nyelv", 2, "kyr"), ...spheres("Élet", "Természet", "Lélek"), restrict("Fegyver: lángkard/lángtőr; szférák: Élet, Természet, Lélek + Sogron.")]),
      opt("Tharr-pap", [...teach("Alkímia", "Kínzás", "Méregkeverés/semlegesítés", "Orvtámadás"), gs("Élettan", 2), gs("Kínzás", 2), gs("Politika/diplomácia", 2), gs("Orvtámadás", 2), gs("Méregkeverés/semlegesítés", 2), gs("Udvari etikett/intrika", 2), gs("Herbalizmus", 1), gs("Alkímia", 1), ...spheres("Lélek", "Halál"), restrict("Szférák: Lélek, Halál + Tharr.")]),
    ]),
  ],
  suggestedAllocation: { HM: 6, Fp: 3, Kp: 10, Kegy: 8 },
};
