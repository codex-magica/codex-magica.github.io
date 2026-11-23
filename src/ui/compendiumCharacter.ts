// The compendium's "Karakteralkotás" tab: reference tables generated from the same rules data the engine
// and the character builder use (attributes, races, classes, backgrounds, costs), so the reference can never disagree
// with what the builder actually does. No rulebook prose.
import type { TableBlock, TableRow } from "./compendiumData";
import { summarize } from "./grantSummary";
import { STAT_KEYS, STAT_SHORT, Stat } from "../model/attributes";
import { ATTRIBUTE_INFO } from "../model/attributeInfo";
import { RACES, RACE_NAMES } from "../model/races";
import { CLASSES, CLASS_NAMES } from "../model/classes";
import { BACKGROUNDS } from "../model/backgrounds";
import { abilityText } from "../model/abilities";
import { Resource } from "../model/effects";
import { ATTR_KAP_COST, ATTR_MAX, BASE_KAP_PER_LEVEL, KAP_RATE, POINT_BUY_TOTAL } from "../engine/constants";

export const creationIntro =
  "A karakteralkotás számai: tulajdonságok, fajok, kasztok, hátterek és pontelosztás. A karakteralkotó is ezekkel az értékekkel számol.";

const paras = (text: string): string[] => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
// What each attribute is used for, in one line. Curated from the engine's formulas (derive/finalize.ts:
// Ép, Fp, MME/AME, Sebzésbónusz, Mozgás; levelFold.ts: level-1 KAP; Pszi érzékenység: Pszi = Int), the
// combat values in model/combatInfo.ts, the skills' governing attributes in model/skills.ts and the
// attribute descriptions. Kept variant-neutral (no skill names the homebrew rules merge away).
const USAGE: Record<Stat, string> = {
  Erő: "TÉ; 15 felett pontonként +1 sebzés közelharcban. Teherbírás: huzamosan Erő×3 fontot cipel (fölötte minden megkezdett 5 font 1 MGT), legfeljebb Erő×10 fontot mozdít meg. Fegyver- és pajzshasználat, vértviselet, mászás, úszás.",
  Gyorsaság: "KÉ, TÉ, VÉ. Mozgás: körönként Gy×5 láb, szegmensenként Gy/2 láb. Kétkezes harc, harctéri gyakorlat.",
  Ügyesség: "TÉ, VÉ, CÉ. A legtöbb alvilági képzettség (zárnyitás, zsebmetszés, lopódzás, rejtőzködés, hamisítás), akrobatika, lovaglás, mechanika; több százalékos képzettség alapértéke.",
  Állóképesség: "Fp (Áks + Akr). Kitartás: futás, úszás, fájdalomtűrés, harci láz.",
  Egészség: "Ép (= Egészség). A 10 feletti része véd a mérgek és betegségek ellen (Egészségpróba).",
  Karizma: "Egyik képletben sem szerepel: az első benyomásban, a tekintélyben és a meggyőzésben, főleg a szerepjátékban számít. Ékesszólás, színészet, politika/diplomácia, udvari etikett, hadvezetés.",
  Intelligencia: "Az 1. szinten +Int KAP; Pszi érzékenységgel Int-nyi Pszi pont. Tudományos képzettségek (alkímia, orvoslás, írás/olvasás, történelem), minden mágiaforma és a Pszi.",
  Akaraterő: "MME: tudatalatti védelem a mentális mágia ellen. Fp (Áks + Akr). Szerepe van a mágiaformákban, a Psziben és a fájdalomtűrésben.",
  Asztrál: "AME: tudatalatti védelem az asztrális (érzelmi) mágia ellen. Idomítás, színészet, lélektan; a Pszi és a tapasztalati mágia is épít rá.",
  Érzékelés: "KÉ, CÉ. Észlelés: csapdák, rejtekhelyek, veszély és nyomok felfedezése; vadonjárás, taktika, vakharc; több százalékos képzettség alapértéke.",
};
const costLabel = (lo: number, hi?: number): string => (hi != null && hi !== lo ? `${lo}–${hi}` : String(lo));

// "Név (N. szinttől): szabályszöveg" paragraphs for a list of ability tags.
const abilityParas = (tags: { name: string; atLevel?: number }[]): string[] =>
  tags.map((t) => {
    const lvl = t.atLevel ? ` (${t.atLevel}. szinttől)` : "";
    const text = abilityText(t.name)?.text;
    return text ? `**${t.name}**${lvl}: ${text}` : `**${t.name}**${lvl}`;
  });
const listPara = (label: string, items: string[]): string[] => (items.length ? [`**${label}:** ${items.join(", ")}`] : []);
// "N. fokig: a, b, c" — taught skills grouped by teacher level, highest first
const teachPara = (label: string, teaches: { skill: string; level: number }[]): string[] => {
  if (!teaches.length) return [];
  const by = new Map<number, string[]>();
  for (const t of teaches) (by.get(t.level) ?? by.set(t.level, []).get(t.level)!).push(t.skill);
  const parts = Array.from(by.keys()).sort((a, b) => b - a).map((l) => `${l}. fokig: ${by.get(l)!.join(", ")}`);
  return [`**${label}:** ${parts.join("; ")}`];
};

// ── Karakteralkotás ───────────────────────────────────────────────────────────
const RESOURCE_LABEL: Record<Resource, string> = {
  Kp: "Képzettségpont (Kp)",
  Fp: "Fájdalompont (Fp)",
  HM: "Harcérték-módosító (HM)",
  Psi: "Pszi-pont (Ψp)",
  Mana: "Mana-pont (Mp)",
  Kegy: "Kegypont",
};
const RESOURCE_ORDER: Resource[] = ["Kp", "Fp", "HM", "Psi", "Mana", "Kegy"];
const COST_FOOTER = `A faj, a kaszt és a hátterek költsége minden szinten csökkenti a szintenként járó KAP-ot (${BASE_KAP_PER_LEVEL}).`;

const raceRow = (name: string): TableRow => {
  const r = RACES[name];
  const g = summarize(r.grants);
  const classes = CLASS_NAMES.filter((cn) => CLASSES[cn].allowedRaces.includes(name));
  return {
    name,
    cells: [String(r.cost), ...STAT_KEYS.map((s) => String(r.statLimits[s]))],
    open: "modal",
    modalSub: `Faj · háttérköltség ${r.cost}`,
    body: [
      `stats:${STAT_KEYS.map((s) => `${STAT_SHORT[s]}: ${r.statLimits[s]}`).join(" · ")}`,
      ...listPara("Választható kasztok", classes),
      ...listPara("Tanult képzettségek", g.skills),
      ...teachPara("Kedvezményes oktatás", g.teaches),
      ...listPara("Tanulható a KM engedélyével", g.allows),
      ...listPara("Faji kedvezmények", [...g.combat, ...g.other]),
      ...abilityParas(g.tags),
    ],
  };
};

const classRow = (name: string): TableRow => {
  const c = CLASSES[name];
  const g = summarize([...(c.grants || []), ...(c.baseSkills || [])]);
  const sex = c.sexRestriction === "female" ? "csak nő" : c.sexRestriction === "male" ? "csak férfi" : undefined;
  return {
    name: sex ? `${name} (${sex})` : name,
    cells: [String(c.cost), ...RACE_NAMES.map((r) => (c.allowedRaces.includes(r) ? "✓" : "—"))],
    open: "modal",
    modalSub: `Kaszt · ${c.cost} KAP`,
    body: [
      ...listPara("Választható fajok", c.allowedRaces),
      ...(sex ? [`**Megkötés:** ${sex} választhatja.`] : []),
      ...listPara("Kapott hátterek", g.backgrounds),
      ...listPara("Kapott képzettségek", g.skills),
      ...teachPara("Tanított képzettségek", g.teaches),
      ...listPara("Szinthez kötött / speciális", g.specials),
      ...listPara("Tiltott képzettségek", g.forbidden),
      ...listPara("Tanulható a KM engedélyével", g.allows),
      ...c.choices.map((ch) => `**${ch.label}:** ${ch.options.map((o) => o.name).join(", ")}`),
      ...listPara("Megkötések / egyéb", [...g.combat, ...g.other]),
      ...abilityParas(g.tags),
    ],
  };
};

export function creationBlocks(): TableBlock[] {
  return [
    {
      title: "Tulajdonságok",
      nameLabel: "Tulajdonság",
      columns: [{ label: "Mire hat", align: "left", grow: 4 }],
      rows: STAT_KEYS.map((s) => ({
        name: STAT_SHORT[s] === s ? s : `${s} (${STAT_SHORT[s]})`,
        cells: [USAGE[s]],
        open: "modal" as const,
        modalSub: "Tulajdonság",
        body: paras(ATTRIBUTE_INFO[s]),
      })),
    },
    {
      title: "Fajok",
      nameLabel: "Faj",
      dense: true,
      columns: [{ label: "Ktg." }, ...STAT_KEYS.map((s) => ({ label: STAT_SHORT[s] }))],
      footer: `A Ktg. a faj háttérköltsége, a többi oszlop a tulajdonságok faji maximuma. Ennél magasabbra csak Adottságként lehet emelni: pontonként 1 KAP-ért, legfeljebb ${ATTR_MAX}-ig.`,
      rows: RACE_NAMES.map(raceRow),
    },
    {
      title: "Kasztok",
      nameLabel: "Kaszt",
      columns: [{ label: "Költség" }, ...RACE_NAMES.map((r) => ({ label: r }))],
      footer: `${COST_FOOTER} ✓ = a faj választhatja a kasztot.`,
      rows: CLASS_NAMES.map(classRow),
    },
    {
      title: "Hátterek",
      nameLabel: "Háttér",
      columns: [{ label: "Költség" }],
      footer: COST_FOOTER,
      rows: Object.values(BACKGROUNDS).map((b) => {
        const cost = b.costRange ? costLabel(b.costRange[0], b.costRange[1]) : String(b.cost);
        const body = [
          ...(b.description ? [b.description] : []),
          ...listPara("Nem választható mellé", b.exclusiveWith ?? []),
        ];
        return { name: b.name, cells: [cost], open: "modal" as const, modalSub: `Háttér · ${cost} KAP`, ...(body.length ? { body } : {}) };
      }),
    },
    {
      title: "Pontelosztás és KAP",
      nameLabel: "Szabály",
      columns: [{ label: "Érték" }],
      rows: [
        { name: "Elosztható tulajdonságpont", cells: [String(POINT_BUY_TOTAL)] },
        { name: "KAP szintenként", cells: [`${BASE_KAP_PER_LEVEL}, a háttérköltségekkel csökkentve`] },
        { name: "KAP az 1. szinten", cells: ["+ Intelligencia"] },
        { name: "Tulajdonság növelése (+1) a későbbi szinteken", cells: [`${ATTR_KAP_COST} KAP`] },
        ...RESOURCE_ORDER.map((k) => ({ name: RESOURCE_LABEL[k], cells: [`${KAP_RATE[k]} KAP / pont`] })),
      ].map((r) => ({ ...r, open: "modal" as const })),
    },
  ];
}
