// Dev-time referential-integrity check over the rules data. Skill / background / race / ability names
// in classes.ts, races.ts, backgrounds.ts and spells.ts are raw strings transcribed from a scanned
// book — a typo compiles fine and silently produces a ghost skill row (difficulty "?") or a dead
// grant. This walks every reference and reports the ones that don't resolve. Run at startup in dev
// (see index.tsx) and from tests; production builds never load it.

import { RulesDB } from "./rulesDb";
import { Effect, GrantEntry } from "./effects";
import { ChoiceDef } from "./choices";
import { ABILITIES } from "./abilities";
import { SkillInfo, SkillValues } from "../data/skillsText";

const skillRefsOf = (e: Effect): string[] => {
  switch (e.kind) {
    case "grantSkill":
    case "grantSkillPercent":
    case "grantSkillChoice":
    case "allowSkill":
    case "removeSkill":
      return [e.skill];
    case "teachingDiscount":
    case "skillCostMultiplier":
    case "forbidSkill":
    case "maxSkillFok":
      return e.skill ? [e.skill] : [];
    default:
      return [];
  }
};

// `prose` is the prose catalog joined to db.skills by name — the base SkillValues by default, the
// homebrew overlay for the variant (rulesVariants.homebrewProse()).
export function validateRules(db: RulesDB, prose: SkillInfo[] = SkillValues): string[] {
  const problems: string[] = [];
  const raceNames = new Set(Object.keys(db.races));
  const dbSkills = Object.keys(db.skills).map((name) => db.skills[name]);

  const checkGrants = (grants: GrantEntry[] | undefined, where: string) => {
    for (const g of grants ?? []) {
      const e = g.effect;
      for (const s of skillRefsOf(e)) {
        if (!db.skills[s]) problems.push(`${where}: ismeretlen képzettség «${s}» (${e.kind})`);
      }
      if (e.kind === "grantBackground" && !db.backgrounds[e.background])
        problems.push(`${where}: ismeretlen háttér «${e.background}»`);
      if (e.kind === "tag" && !ABILITIES[e.tag])
        problems.push(`${where}: tag «${e.tag}» nem szerepel az ABILITIES táblában`);
    }
  };
  const walkChoices = (choices: ChoiceDef[] | undefined, where: string) => {
    for (const c of choices ?? []) {
      for (const o of c.options) {
        checkGrants(o.grants, `${where} → ${c.label}/${o.name}`);
        walkChoices(o.choices, `${where} → ${c.label}/${o.name}`);
      }
    }
  };

  for (const name of Object.keys(db.classes)) {
    const k = db.classes[name];
    for (const r of k.allowedRaces) if (!raceNames.has(r)) problems.push(`Kaszt ${name}: ismeretlen faj «${r}»`);
    checkGrants(k.grants, `Kaszt ${name}`);
    checkGrants(k.baseSkills, `Kaszt ${name} (baseSkills)`);
    walkChoices(k.choices, `Kaszt ${name}`);
  }
  for (const name of Object.keys(db.races)) checkGrants(db.races[name].grants, `Faj ${name}`);
  for (const name of Object.keys(db.backgrounds)) {
    const b = db.backgrounds[name];
    checkGrants(b.grants, `Háttér ${name}`);
    if (b.grantsFor) {
      // Sample the magnitude range's two ends (the shape is the same in between).
      const [lo, hi] = b.costRange ?? [b.cost, b.cost];
      for (const level of lo === hi ? [lo] : [lo, hi]) {
        try {
          checkGrants(b.grantsFor({ level }), `Háttér ${name} (grantsFor ${level})`);
        } catch (err) {
          problems.push(`Háttér ${name}: grantsFor(${level}) hibát dobott: ${err}`);
        }
      }
    }
  }
  for (const s of dbSkills) {
    for (const r of [...s.hardReq, ...s.softReq])
      if (!db.skills[r.skill]) problems.push(`Képzettség ${s.name}: ismeretlen előfeltétel «${r.skill}»`);
  }
  for (const sp of db.spells) {
    for (const r of sp.requires)
      if (!db.skills[r.skill]) problems.push(`Varázslat ${sp.name} (${sp.school}): ismeretlen képzettség «${r.skill}»`);
  }

  // The mechanics catalog (model/skills.ts) and the prose catalog (data/skillsText.ts) are joined by
  // raw name equality — a drifted name silently shows "leírás hamarosan" in the modal.
  const proseNames = new Set(prose.map((s) => s.name as string));
  for (const s of dbSkills) if (!proseNames.has(s.name)) problems.push(`Képzettség ${s.name}: nincs leírás a skillsText.ts-ben`);
  const mechNames = new Set(dbSkills.map((s) => s.name));
  for (const n of Array.from(proseNames)) if (!mechNames.has(n)) problems.push(`skillsText ${n}: nincs ilyen képzettség a katalógusban`);

  return problems;
}
