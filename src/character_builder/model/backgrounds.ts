// Backgrounds (hátterek). A background has a cost (reduces per-level KAP from the level it is
// acquired) and grants. Costs verified from chapter 02 ("## Háttér", line 921+).
//
// Static backgrounds use `grants`. Magnitude/option-dependent ones use `grantsFor({ level, option })`
// which returns the grants for the chosen magnitude (and sub-option, e.g. Adottság's attribute).

import { GrantEntry, grant } from "./effects";

export interface BackgroundDef {
  name: string;
  cost: number; // default/min KAP cost
  costRange?: [number, number];
  optionKind?: "stat"; // requires a sub-choice in the UI (e.g. which Tulajdonság)
  grants: GrantEntry[];
  grantsFor?: (sel: { level: number; option?: string }) => GrantEntry[];
  description?: string;
  exclusiveWith?: string[];
}

export const BACKGROUNDS: Record<string, BackgroundDef> = {
  "Mágikus fogékonyság": {
    name: "Mágikus fogékonyság",
    cost: 1,
    grants: [grant({ kind: "poolAccess", pool: "Mana" })],
    description: "Megnyitja a Mana (Mp) tárolót. A Mp-t a Tapasztalati/Magasmágia képzettség adja.",
  },
  "Pszi érzékenység": {
    name: "Pszi érzékenység",
    cost: 1,
    grants: [
      grant({ kind: "poolAccess", pool: "Psi" }),
      grant({ kind: "grantPoolFromStat", pool: "Psi", stat: "Intelligencia" }),
    ],
    description: "Megnyitja a Pszi (Ψp) tárolót; 1. szinten Int-nyi Pszi pontot ad. A Pszi képzettség előfeltétele.",
  },
  Kegyelt: {
    name: "Kegyelt",
    cost: 1,
    grants: [grant({ kind: "poolAccess", pool: "Kegy" })],
    description: "Megnyitja a Kegy tárolót; a Kegy pontokat a Vallásismeret képzettség adja. Szakrális mágiához Vallásismeret 3. fok kell.",
  },
  "Nemesi vér": {
    name: "Nemesi vér",
    cost: 1,
    grants: [grant({ kind: "teachingDiscount", category: "Szociális", uptoLevel: 4 })],
    description: "Nemesi származás. A Szociális képzettségeket 4. fokú oktató kedvezményével tanulja.",
  },
  Vagyon: {
    name: "Vagyon",
    cost: 1,
    costRange: [1, 3],
    grants: [grant({ kind: "grantMoney", amount: 30 })],
    grantsFor: ({ level }) => [grant({ kind: "grantMoney", amount: level >= 3 ? 250 : level === 2 ? 75 : 30 })],
    description: "Induló vagyon. 1: 20–40, 2: 50–100, 3: 200–300 arany.",
  },
  Adottság: {
    name: "Adottság",
    cost: 1,
    costRange: [1, 5],
    optionKind: "stat",
    grants: [],
    // Pontonként +1 a választott Tulajdonságra (faji max fölé is, de 20 fölé nem).
    grantsFor: ({ level, option }) => (option ? [grant({ kind: "statBonus", stat: option as any, amount: level })] : []),
    description: "Pontonként +1 egy választott Tulajdonságra (faji max fölé is, de 20 fölé nem).",
  },
  Rang: {
    name: "Rang",
    cost: 1,
    costRange: [1, 3],
    grants: [],
    description: "Befolyásos tagság (KM-hatáskör).",
  },
  Manalátó: {
    name: "Manalátó",
    cost: 2,
    costRange: [2, 3],
    grants: [grant({ kind: "tag", tag: "Manalátó" })],
    grantsFor: ({ level }) =>
      level >= 3
        ? [grant({ kind: "tag", tag: "Manalátó" }), grant({ kind: "note", text: "Megkülönbözteti a varázserő mennyiségét." })]
        : [grant({ kind: "tag", tag: "Manalátó" })],
    description: "Érzékeli a varázslatokat/imákat 20 láb körzetben (3 pont: a varázserő mennyiségét is).",
    exclusiveWith: ["Mágiatagadás"],
  },
  Mágiatagadás: {
    name: "Mágiatagadás",
    cost: 1,
    costRange: [1, 5],
    grants: [grant({ kind: "derivedPerLevel", target: "MME", amount: 1 }), grant({ kind: "derivedPerLevel", target: "AME", amount: 1 })],
    // Minden szinten +X TME (X = KAP). Tiltja a pszi/mana/kegy hátteret. (−X Asztrál-próba: KM-kezelés.)
    grantsFor: ({ level }) => [
      grant({ kind: "derivedPerLevel", target: "MME", amount: level }),
      grant({ kind: "derivedPerLevel", target: "AME", amount: level }),
      grant({ kind: "restriction", text: `Nem fogad be pszit/manát; −${level} minden Asztrál-alapú próbára.` }),
    ],
    description: "Elzárkózik a mágiától. Szintenként +X TME (X = KAP); tiltja a Pszi/Mágikus fogékonyság/Kegyelt hátteret.",
    exclusiveWith: ["Mágikus fogékonyság", "Pszi érzékenység", "Kegyelt", "Manalátó"],
  },
  "Szellemek jóindulata": {
    name: "Szellemek jóindulata",
    cost: 1,
    costRange: [1, 3],
    grants: [],
    // 2–3 pont: szintenként +1 az Asztrális és Mentális TME-hoz.
    grantsFor: ({ level }) =>
      level >= 2
        ? [grant({ kind: "derivedPerLevel", target: "MME", amount: 1 }), grant({ kind: "derivedPerLevel", target: "AME", amount: 1 })]
        : [],
    description: "Természetszellemek jóindulata. 2–3 pont: szintenként +1 Asztrális/Mentális TME.",
  },
  Sugallat: {
    name: "Sugallat",
    cost: 1,
    grants: [grant({ kind: "tag", tag: "Sugallat" })],
    description: "Időnként megmagyarázhatatlan megérzések (KM-vezérelt).",
  },
};

export const BACKGROUND_NAMES = Object.keys(BACKGROUNDS);
