// applyEffect — the generic Effect interpreter. Mutates the ctx accumulators; kinds that are only
// meaningful at activation/choice-resolution time surface as diagnostics instead of no-oping.

import { Effect } from "../../model/effects";
import { skillKey } from "../../model/common";
import { DeriveCtx } from "./ctx";
import { effSubtype } from "./helpers";

// `late` = applied AFTER the per-level fold (KM adjustments): per-level kinds can no longer take
// effect there, so they surface as diagnostics instead of silently no-oping.
export const applyEffect = (ctx: DeriveCtx, e: Effect, source: string, level: number, late = false) => {
  const { diag, addProv } = ctx;
  switch (e.kind) {
    case "grantSkill": {
      const key = skillKey(e.skill, e.subtype);
      const cur = ctx.owned[key];
      if (!cur || cur.fok < e.level) ctx.owned[key] = { skill: e.skill, subtype: effSubtype(ctx, e.skill, e.subtype), fok: e.level, percent: 0, origSubtype: e.subtype };
      ctx.grantedFokOf[key] = Math.max(ctx.grantedFokOf[key] ?? 0, e.level);
      break;
    }
    case "grantSkillPercent": {
      const key = skillKey(e.skill, e.subtype);
      const cur = ctx.owned[key];
      ctx.owned[key] = { skill: e.skill, subtype: effSubtype(ctx, e.skill, e.subtype), fok: 0, percent: (cur ? cur.percent : 0) + e.percent, origSubtype: e.subtype };
      break;
    }
    case "teachingDiscount":
      ctx.discounts.push({ skill: e.skill, subtype: e.subtype, category: e.category, allSkills: e.allSkills, uptoLevel: e.uptoLevel });
      break;
    case "skillCostMultiplier":
      ctx.costMultipliers.push({ skill: e.skill, category: e.category, allSkills: e.allSkills, factor: e.factor });
      break;
    case "forbidSkill":
      ctx.skillBans.push({ skill: e.skill, category: e.category, source });
      break;
    case "maxSkillFok":
      ctx.fokCaps.push({ skill: e.skill, category: e.category, fok: e.fok });
      break;
    case "poolAccess":
      ctx.poolExists[e.pool] = true;
      break;
    case "grantPoolPoints":
      ctx.poolExists[e.pool] = true;
      ctx.poolMax[e.pool] += e.amount;
      addProv(e.pool, source, e.amount);
      break;
    case "grantPoolFromStat":
      ctx.poolExists[e.pool] = true;
      ctx.poolMax[e.pool] += ctx.effective[e.stat]; // effective, so a granted +stat raises the pool too
      addProv(e.pool, `${source} (${e.stat})`, ctx.effective[e.stat]);
      break;
    case "statBonus":
      ctx.effective[e.stat] += e.amount;
      addProv(e.stat, source, e.amount);
      break;
    case "combatBonus":
      ctx.combatAcc[e.channel] += e.amount;
      addProv(e.channel, source, e.amount);
      break;
    case "derivedBonus":
      ctx.derivedBonus[e.target] += e.amount;
      addProv(e.target, source, e.amount);
      break;
    case "tag":
      // First grant wins (levels fold in order 1→N, so the earliest activation is recorded).
      if (!ctx.tags.some((t) => t.name === e.tag)) ctx.tags.push({ name: e.tag, source, atLevel: level > 1 ? level : undefined });
      break;
    case "grantEquipment":
      ctx.inventory.push({ name: e.item, qty: e.qty });
      break;
    case "grantMoney":
      ctx.money += e.amount;
      break;
    case "resourcePerLevel":
      if (late) diag("warn", `${source}: szintenkénti erőforrás (${e.resource}) KM-kiigazításként nem támogatott.`, level);
      else ctx.staticPerLevel.push({ resource: e.resource, amount: e.amount, fromLevel: level });
      break;
    case "derivedPerLevel":
      if (late) diag("warn", `${source}: szintenkénti bónusz (${e.target}) KM-kiigazításként nem támogatott.`, level);
      else ctx.staticDerivedPerLevel.push({ target: e.target, amount: e.amount, fromLevel: level });
      break;
    case "restriction":
      diag("info", `Megkötés: ${e.text}`, level);
      break;
    case "grantSkillChoice": {
      // A placeholder branch the player resolves (fő/másodfegyver). Reuses the subtype-override mechanism.
      // Keyed by the stable label; the override only sets the display.
      const eff = effSubtype(ctx, e.skill, e.label);
      const key = skillKey(e.skill, e.label);
      const cur = ctx.owned[key];
      if (!cur || cur.fok < e.level) ctx.owned[key] = { skill: e.skill, subtype: eff, fok: e.level, percent: 0, origSubtype: e.label, placeholder: !eff || eff === e.label };
      ctx.grantedFokOf[key] = Math.max(ctx.grantedFokOf[key] ?? 0, e.level);
      break;
    }
    case "allowSkill":
      ctx.allowedSkills.push({ skill: e.skill, subtype: e.subtype });
      break;
    case "removeSkill":
      // Drop a base-granted instance (a subclass that doesn't get it). Applied after the base grants.
      // Keys are original-stable, so a renamed grant is removable by its original subtype directly.
      delete ctx.owned[skillKey(e.skill, e.subtype)];
      break;
    case "note":
      diag("info", `${source}: ${e.text}`, level);
      break;
    case "grantBackground":
    case "resetTeaching":
      // Only meaningful at activation / choice-resolution time (pushActivation, resolveChoiceGrants);
      // reaching the generic interpreter (KM adjustment, perFok effect) would silently do nothing.
      diag("warn", `${source}: a(z) ${e.kind} hatás itt nem alkalmazható.`, level);
      break;
    case "classCostDelta": // consumed at class-activation time (adjusts the class KAP cost)
      break;
    default: {
      // Compile-time exhaustiveness: adding a new Effect kind without a case here is a type error.
      const unhandled: never = e;
      diag("warn", `Ismeretlen hatás: ${(unhandled as Effect).kind}`, level);
    }
  }
};
