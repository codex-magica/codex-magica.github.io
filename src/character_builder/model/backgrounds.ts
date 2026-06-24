// Backgrounds (hátterek). A background has a cost (reduces per-level KAP from the level it is
// acquired) and grants. The three pool-enabling backgrounds are what make Mana/Psi/Kegy exist.
//
// Costs verified from chapter 02 ("## Háttér", line 921+): the parenthetical value after each
// háttér IS its KAP cost. The three pool-enablers each cost 1; some backgrounds have a range.
// Normally backgrounds are bought at 1st level only — a clan/rend may grant one at a later level.

import { GrantEntry, grant } from "./effects";

export interface BackgroundDef {
  name: string;
  cost: number; // default/min KAP cost; ranged backgrounds note the range in `costRange`
  costRange?: [number, number];
  grants: GrantEntry[];
  description?: string;
  exclusiveWith?: string[];
}

export const BACKGROUNDS: Record<string, BackgroundDef> = {
  "Mágikus fogékonyság": {
    name: "Mágikus fogékonyság",
    cost: 1,
    grants: [grant({ kind: "poolAccess", pool: "Mana" })],
    description: "Megnyitja a Mana (Mp) tárolót. Mágiahasználathoz szükséges háttér.",
  },
  "Pszi érzékenység": {
    name: "Pszi érzékenység",
    cost: 1,
    grants: [grant({ kind: "poolAccess", pool: "Psi" })],
    description: "Megnyitja a Pszi (Ψp) tárolót. A Pszi képzettség előfeltétele.",
  },
  Kegyelt: {
    name: "Kegyelt",
    cost: 1,
    grants: [grant({ kind: "poolAccess", pool: "Kegy" })],
    description: "Megnyitja a Kegy (Kegypont) tárolót. Papok, paplovagok háttere. Szakrális mágiához Vallásismeret 3. fok kell.",
  },
  "Nemesi vér": {
    name: "Nemesi vér",
    cost: 1,
    grants: [],
    description: "Nemesi származás; szociális képzettségeket kedvezményesen tanul.",
  },
  Vagyon: {
    name: "Vagyon",
    cost: 1,
    costRange: [1, 3],
    grants: [grant({ kind: "grantMoney", amount: 30 })],
    description: "Induló vagyon és jövedelem. 1 pont: 20–40 arany induláskor.",
  },
  Adottság: {
    name: "Adottság",
    cost: 1,
    grants: [],
    description: "Pontonként +1 egy választott Tulajdonságra (faji max fölé is, de 20 fölé nem).",
  },
  Rang: {
    name: "Rang",
    cost: 1,
    costRange: [1, 3],
    grants: [],
    description: "Befolyásos tagság egy szervezetben/államban.",
  },
  Manalátó: {
    name: "Manalátó",
    cost: 2,
    costRange: [2, 3],
    grants: [grant({ kind: "tag", tag: "Manalátó" })],
    description: "Érzékeli a varázslatokat/imákat 20 láb körzetben.",
    exclusiveWith: ["Mágiatagadás"],
  },
  Mágiatagadás: {
    name: "Mágiatagadás",
    cost: 1,
    costRange: [1, 5],
    grants: [
      grant({ kind: "restriction", text: "Nem fogad be pszit/manát; tiltja a Pszi/Mágikus fogékonyság/Kegyelt hátteret." }),
    ],
    description: "Az elme elzárkózik a mágiától. +X TME minden szinten, de −X minden Asztrál-alapú próbára (X = KAP).",
    exclusiveWith: ["Mágikus fogékonyság", "Pszi érzékenység", "Kegyelt", "Manalátó"],
  },
  Sugallat: {
    name: "Sugallat",
    cost: 1,
    grants: [grant({ kind: "tag", tag: "Sugallat" })],
    description: "Időnként megmagyarázhatatlan megérzések, látomások (KM-vezérelt).",
  },
};

export const BACKGROUND_NAMES = Object.keys(BACKGROUNDS);
