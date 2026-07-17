import { choice, opt } from "../choices";
import { bg, equip, gs, remove, restrict, tag, teach, teachSub, weaponChoice } from "../grantDsl";
import { ClassDef } from "./def";

// ── PAPLOVAG (additive: rend) ──────────────────────────────────────────────
export const Paplovag: ClassDef = {
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
    weaponChoice("főfegyver", 3),
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
      opt("Sogron-paplovag", [tag("Tűzmágia Kegy-pontból"), ...teach("Hajózás", "Térképészet", "Tapasztalati mágia", "Csomózás", "Ősi nyelv", "Taktika"), gs("Tapasztalati mágia", 2, "tűzvarázsló"), gs("Taktika", 2), gs("Hadvezetés", 2), equip("Lángkard + acél pikkelyvértezet + kobra sisak"), restrict("Tűzmágia Kegy-pontból; Fegyverhasználat 3. fokon: lángkard.")]),
      opt("Uwel-paplovag", [...teach("Pusztítás", "Jog/törvénykezés"), gs("Térképészet", 2), gs("Jog/törvénykezés", 2), gs("Pusztítás", 2), gs("Számtan/Mértan", 2), gs("Élettan", 2), equip("Acél félvértezet + sisak")]),
    ]),
  ],
  suggestedAllocation: { HM: 9, Fp: 7, Kp: 10, Kegy: 6 },
};
