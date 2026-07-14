// Homebrew "képzettség-átdolgozás" (skill rework): every percentage skill becomes a normal fok-based
// skill, and Rejtekhelykutatás + Csapdakeresés + Veszélyérzék merge into the new Éberség (Világi, III).
// Source: the player's homebrew doc (Képzettségek.pdf). A pure copy-on-write transform over the base
// RulesDB — the base data modules are never touched, so base-rules behavior stays byte-identical.
// Selected per character via CharacterRecord.houseRules.skillRework (see rulesVariants.ts).

import { RulesDB } from "../rulesDb";
import { Raw, SkillDef, build } from "../skills";
import { Effect, GrantEntry } from "../effects";
import { ChoiceDef, OptionDef } from "../choices";
import { ClassDef } from "../classes/def";
import { SkillFok, SkillRef } from "../common";
import { taughtSkill } from "../skills";

export const MERGED_INTO_EBERSEG = ["Rejtekhelykutatás", "Csapdakeresés", "Veszélyérzék"];

// Kp costs come from the difficulty tier (doc: 1-3-8-15-25 = tier I, Éberség 2-8-15-30-45 = tier III).
const HOMEBREW_RAW: Raw[] = [
  { name: "Lopódzás", cat: "Alvilági", diff: "I", attrs: ["Ügy", "Érz"] },
  { name: "Rejtőzködés", cat: "Alvilági", diff: "I", attrs: ["Ügy", "Érz"] },
  { name: "Zárnyitás", cat: "Alvilági", diff: "I", attrs: ["Ügy", "Érz"] },
  { name: "Zsebmetszés", cat: "Alvilági", diff: "I", attrs: ["Ügy", "Érz"] },
  { name: "Éberség", cat: "Világi", diff: "III", attrs: ["Érz", "Int"] },
  { name: "Esés", cat: "Világi", diff: "I", attrs: ["Ügy"] },
  { name: "Mászás", cat: "Világi", diff: "I", attrs: ["Erő", "Ügy"], attrsAny: true }, // Erő VAGY Ügyesség
  { name: "Akrobatika", cat: "Világi", diff: "I", attrs: ["Ügy"] },
];

const isMerged = (skill: string | undefined): boolean => !!skill && MERGED_INTO_EBERSEG.indexOf(skill) >= 0;

// Threshold conversion for surviving percentage grants: 1–20% → 1. fok, 21–40% → 2 … 81%+ → 5.
export const pctToFok = (pct: number): SkillFok => Math.min(5, Math.max(1, Math.ceil(pct / 20))) as SkillFok;

// The doc's explicit Éberség placements. Grants and teaching both come ONLY from this list ("Éberséget
// az alábbi iskolák tanítják") — converted grants of the merged skills are dropped, not thresholded,
// because the list is exhaustive ("Bárd: CSAK az Aszisz énekmondó"). Keyed by class name + option name;
// EBERSEG_TEACH uses null for the class-level grant list (Tolvaj teaches it class-wide).
const EBERSEG_GRANTS: Record<string, Record<string, SkillFok>> = {
  Tolvaj: { Általános: 1, Zsebes: 1, Hamisító: 1, Besurranó: 2 },
  Fejvadász: { Harcos: 1, Orgyilkos: 1, Felderítő: 1, Testőr: 2 },
  Harcművész: { "Shien-ka-to (Tűz)": 1, "Nisen-nid-to (Levegő)": 2 }, // doc: Tűz-irányzat 1., Szél-irányzat 2. fok
  Bárd: { "Aszisz Énekmondó": 1 },
};
const EBERSEG_TEACH: Record<string, (string | null)[]> = {
  Tolvaj: [null],
  Fejvadász: ["Harcos", "Orgyilkos", "Felderítő", "Testőr"],
  Harcművész: ["Shien-ka-to (Tűz)", "Nisen-nid-to (Levegő)"],
  Bárd: ["Aszisz Énekmondó"],
};

// null = drop the entry. Teaching of merged skills is dropped (Éberség teaching is injected from the
// explicit list); grants of merged skills are dropped likewise; surviving percentage grants convert.
const mapEffect = (e: Effect): Effect | null => {
  switch (e.kind) {
    case "grantSkillPercent":
      if (isMerged(e.skill)) return null;
      return { kind: "grantSkill", skill: e.skill, subtype: e.subtype, level: pctToFok(e.percent) };
    case "teachingDiscount":
      return isMerged(e.skill) ? null : e;
    case "grantSkill":
    case "grantSkillChoice":
    case "allowSkill":
    case "removeSkill":
    case "forbidSkill":
    case "skillCostMultiplier":
    case "maxSkillFok":
      // Defensive: no base data grants the merged skills fok-based today.
      return isMerged(e.skill) ? { ...e, skill: "Éberség" } as Effect : e;
    default:
      return e;
  }
};

const mapGrants = (grants: GrantEntry[]): GrantEntry[] =>
  grants.reduce<GrantEntry[]>((out, g) => {
    const e = mapEffect(g.effect);
    if (e) out.push(e === g.effect ? g : { ...g, effect: e });
    return out;
  }, []);

// Append the doc's explicit Éberség grant/teach entries for this location (class level = null option).
// Appending last keeps them after any resetTeaching in the same option.
const injectEberseg = (grants: GrantEntry[], klass: string, option: string | null): GrantEntry[] => {
  const out = grants.slice();
  const fok = option ? EBERSEG_GRANTS[klass]?.[option] : undefined;
  if (fok) out.push(taughtSkill("Éberség", fok));
  const teachLocs = EBERSEG_TEACH[klass];
  if (teachLocs && teachLocs.indexOf(option) >= 0) out.push({ effect: { kind: "teachingDiscount", skill: "Éberség", uptoLevel: 4 } });
  return out;
};

const mapOption = (klass: string, o: OptionDef): OptionDef => ({
  ...o,
  grants: o.grants ? injectEberseg(mapGrants(o.grants), klass, o.name) : injectEberseg([], klass, o.name),
  choices: o.choices ? o.choices.map((c) => mapChoice(klass, c)) : undefined,
});
const mapChoice = (klass: string, c: ChoiceDef): ChoiceDef => ({ ...c, options: c.options.map((o) => mapOption(klass, o)) });

const mapRefs = (refs: SkillRef[]): SkillRef[] => refs.map((r) => (isMerged(r.skill) ? { ...r, skill: "Éberség" } : r));

export function buildSkillReworkRules(base: RulesDB): RulesDB {
  // Same-named reworked defs replace the base def IN PLACE (insertion order drives the UI lists);
  // the three merged names drop; the one genuinely new skill (Éberség) appends.
  const reworked: Record<string, SkillDef> = {};
  for (const raw of HOMEBREW_RAW) reworked[raw.name] = build(raw);
  const skills: Record<string, SkillDef> = {};
  for (const name of Object.keys(base.skills)) {
    if (isMerged(name)) continue;
    if (reworked[name]) {
      skills[name] = reworked[name];
      continue;
    }
    const def = base.skills[name];
    skills[name] = { ...def, hardReq: mapRefs(def.hardReq), softReq: mapRefs(def.softReq) };
  }
  for (const raw of HOMEBREW_RAW) if (!skills[raw.name]) skills[raw.name] = reworked[raw.name];

  const classes: Record<string, ClassDef> = {};
  for (const name of Object.keys(base.classes)) {
    const k = base.classes[name];
    classes[name] = {
      ...k,
      grants: injectEberseg(mapGrants(k.grants), k.name, null),
      baseSkills: k.baseSkills ? mapGrants(k.baseSkills) : undefined,
      choices: k.choices.map((c) => mapChoice(k.name, c)),
    };
  }

  const races: RulesDB["races"] = {};
  for (const name of Object.keys(base.races)) {
    const r = base.races[name];
    races[name] = { ...r, grants: mapGrants(r.grants) };
  }

  const backgrounds: RulesDB["backgrounds"] = {};
  for (const name of Object.keys(base.backgrounds)) {
    const b = base.backgrounds[name];
    backgrounds[name] = {
      ...b,
      grants: mapGrants(b.grants),
      grantsFor: b.grantsFor ? (sel: { level: number; option?: string }) => mapGrants(b.grantsFor!(sel)) : undefined,
    };
  }

  return { skills, classes, races, backgrounds, spells: base.spells };
}
