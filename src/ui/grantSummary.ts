// Grant effects bucketed into readable groups. Shared by the race/class picker's detail panes and the
// compendium's Karakteralkotás tables, so both describe a race or class the same way.
import { GrantEntry } from "../model/effects";

// display names for the magic pools (the model keys them as Mana / Psi / Kegy)
const POOL_LABEL: Record<string, string> = { Mana: "Mana", Psi: "Pszi", Kegy: "Kegy" };

export const summarize = (entries: GrantEntry[]) => {
  const b = { backgrounds: [] as string[], skills: [] as string[], teaches: [] as { skill: string; level: number }[], allows: [] as string[], tags: [] as { name: string; atLevel?: number }[], combat: [] as string[], other: [] as string[], specials: [] as string[], forbidden: [] as string[] };
  // A skill/branch label: "minden képzettség" | "<Kategória> (kat.)" | "<Skill>" | "<Skill> (<altípus>)".
  const catName = (e: { skill?: string; subtype?: string; category?: string; allSkills?: boolean }) =>
    e.allSkills ? "minden képzettség" : e.category ? `${e.category} (kat.)` : `${e.skill ?? ""}${e.subtype ? ` (${e.subtype})` : ""}`;
  for (const { effect: e, atLevel } of entries) {
    switch (e.kind) {
      case "grantBackground": b.backgrounds.push(e.background); break;
      case "grantSkill": b.skills.push(`${e.skill}${e.subtype ? ` (${e.subtype})` : ""} ${e.level}. fok`); break;
      case "grantSkillPercent": b.skills.push(`${e.skill} ${e.percent}%`); break;
      case "grantSkillChoice": b.skills.push(`${e.skill} (${e.label}) ${e.level}. fok`); break; // választható fegyver stb.
      case "allowSkill": b.allows.push(`${e.skill}${e.subtype ? ` (${e.subtype})` : ""}`); break;
      case "teachingDiscount": {
        const nm = catName(e);
        if (!nm) break;
        if (atLevel != null && atLevel > 1) b.specials.push(`${atLevel}. szinttől: ${nm} (${e.uptoLevel}. fokig)`);
        else b.teaches.push({ skill: nm, level: e.uptoLevel });
        break;
      }
      case "skillCostMultiplier": b.specials.push(`${catName(e)} ×${e.factor} Kp`); break;
      case "forbidSkill": b.forbidden.push(catName(e)); break;
      case "maxSkillFok": b.specials.push(`${catName(e)} max ${e.fok}. fok`); break;
      case "classCostDelta": b.specials.push(`Iskolaköltség ${e.amount > 0 ? "+" : ""}${e.amount} KAP`); break;
      case "tag": b.tags.push({ name: e.tag, atLevel: atLevel != null && atLevel > 1 ? atLevel : undefined }); break;
      case "combatBonus": b.combat.push(`${e.channel} +${e.amount}`); break;
      case "statBonus": b.other.push(`${e.stat} +${e.amount}`); break;
      case "poolAccess": b.other.push(`${POOL_LABEL[e.pool] ?? e.pool} használata`); break;
      case "grantPoolFromStat": b.other.push(`${e.pool} = ${e.stat}`); break;
      case "grantEquipment": b.other.push(e.item); break;
      case "restriction": b.other.push(e.text); break;
      default: break;
    }
  }
  return b;
};
