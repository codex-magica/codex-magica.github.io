// ── 4. Per-level fold ── only the character's ACTUAL levels: a grant gated to a later level (atLevel >
// current level) must NOT apply yet — it activates when the character reaches that level.

import { LevelRecord, getLevelRecord } from "../../model/character";
import { Effect, Pool, Resource } from "../../model/effects";
import { findInstanceChoice, sameInstance, skillKey } from "../../model/common";
import { ATTR_KAP_COST, BASE_KAP_PER_LEVEL, KAP_RATE } from "../constants";
import { scopeMatches, skillStepCost, teachingUptoFor } from "../skillCost";
import { DeriveCtx } from "./ctx";
import { applyEffect } from "./effects";
import { attrChoiceFor, effSubtype, instAttrs, maxFok, origOf } from "./helpers";

function applyAllocations(ctx: DeriveCtx, L: number, lvlRec: LevelRecord): void {
  for (const a of lvlRec.allocations) {
    if (a.target === "Kp") continue; // skills draw KAP directly now — Kp allocations are obsolete
    if (a.target === "HM") continue; // HM cost is derived from assignments minus granted HM (below)
    const spend = a.points * KAP_RATE[a.target];
    ctx.kapBalance -= spend;
    const allocBefore = a.target === "Fp" ? ctx.fpGains : ctx.poolMax[a.target];
    ctx.ledger.push({ level: L, kind: "alloc", id: a.target, cost: spend, before: allocBefore, after: allocBefore + a.points });
    if (a.target === "Fp") ctx.fpGains += a.points;
    else {
      if (!ctx.poolExists[a.target]) ctx.diag("warn", `${a.target} vásárlása megfelelő háttér nélkül (${L}. szint).`, L);
      ctx.poolMax[a.target] += a.points;
    }
  }
}

// Attribute buys (and other stat increases) apply BEFORE skill purchases, so the boosted stats lower
// the unmet-attribute penalty on skills bought this level. (fok-4 bonuses are applied after, below.)
function applyStatIncreases(ctx: DeriveCtx, L: number, lvlRec: LevelRecord): void {
  const { race, effective } = ctx;
  for (const si of lvlRec.statIncreases) {
    const statBefore = effective[si.stat];
    effective[si.stat] += si.amount;
    ctx.addProv(si.stat as string, `${si.source} L${L}`, si.amount);
    const statCost = si.source === "kap" ? si.amount * ATTR_KAP_COST : 0;
    ctx.kapBalance -= statCost;
    ctx.ledger.push({ level: L, kind: "stat", id: `${si.stat}:${si.source}`, cost: statCost, before: statBefore, after: statBefore + si.amount });
    // Book: level-up raises may not exceed the racial maximum (Adottság lifts it, absolute cap 20).
    const raceCap = race ? Math.min(20, race.statLimits[si.stat] + (ctx.rec.adottsag?.[si.stat] ?? 0)) : 20;
    if (effective[si.stat] > raceCap)
      ctx.diag("warn", `${si.stat}: a faji maximum (${raceCap}) fölé nőtt (${effective[si.stat]}).`, L);
  }
}

function applySkillPurchases(ctx: DeriveCtx, L: number, lvlRec: LevelRecord): void {
  const { db, rec, diag, owned } = ctx;
  for (let spIdx = 0; spIdx < lvlRec.skillPurchases.length; spIdx++) {
    const sp = lvlRec.skillPurchases[spIdx];
    const def = db.skills[sp.skill];
    if (!def) {
      diag("warn", `Ismeretlen képzettség: ${sp.skill}`, L);
      continue;
    }
    // Prerequisites only apply to what the player BUYS above the class/race-granted fok — granted skill
    // levels come without prereqs (book: class packages bypass the requirement lists).
    const grantedFok = sp.id != null ? 0 : ctx.grantedFokOf[skillKey(sp.skill, origOf(ctx, sp.skill, sp.subtype))] ?? 0;
    if (sp.to > grantedFok) {
      for (const r of def.hardReq) {
        if (maxFok(ctx, r.skill) < sp.to)
          diag("warn", `${sp.skill} ${sp.to}. fokához «${r.skill}» legalább ${sp.to}. foka kell (erős előfeltétel).`, L);
      }
      for (const r of def.softReq) {
        if (maxFok(ctx, r.skill) < sp.to - 1)
          diag("warn", `${sp.skill} ${sp.to}. fokához «${r.skill}» legalább ${sp.to - 1}. foka kell (gyenge előfeltétel).`, L);
      }
    }
    // A user-added branch (sp.id) is keyed by its id so it forms its own instance and never collides
    // with the general trunk or another branch — even before the player has typed a distinct subtype.
    // A purchase stores the instance's STABLE subtype (the granted original, or the display for a
    // specialised general grant) — origOf maps it onto the grant's original-keyed instance, so
    // renaming/clearing after a raise doesn't split the instance or reset the input.
    const hasOverride = sp.id == null && rec.subtypeOverrides?.[skillKey(sp.skill, sp.subtype)] != null;
    const effSub = sp.id == null ? effSubtype(ctx, sp.skill, sp.subtype) : sp.subtype;
    const key = sp.id != null ? `var:${sp.id}` : skillKey(sp.skill, origOf(ctx, sp.skill, sp.subtype));
    const cur = owned[key];
    const isPct = def.cost === "percentage";
    // a level the skill can't have (a hand-edited file, or a purchase from the other rules variant where
    // the skill is priced the other way): skipped, so it can't break the point totals
    if (!Number.isFinite(sp.to) || (isPct ? sp.to < 0 || sp.to > 100 : sp.to < 1 || sp.to > 5)) {
      diag("warn", `${sp.skill}: ${sp.to}${isPct ? "%" : ". fok"} nem lehetséges, ez a vásárlás nem számít bele.`, L);
      continue;
    }
    // A two-tier specific (Fegyverhasználat weapon) inherits its parent CATEGORY's fok as its floor;
    // otherwise `from` is whatever is already owned unless explicitly given.
    const parentFok = sp.parent != null ? owned[skillKey(sp.skill, origOf(ctx, sp.skill, sp.parent))]?.fok ?? 0 : undefined;
    const from = sp.from != null ? sp.from : parentFok != null ? parentFok : cur ? (isPct ? cur.percent : cur.fok) : 0;
    // Forced branching: a category node (Fegyverhasználat) may not exceed `branchAbove` — you must branch
    // to a concrete weapon for higher foks.
    const lvl0 = def.branch?.[0];
    if (lvl0?.branchAbove != null && sp.parent == null && lvl0.options?.some((o) => o.name === effSub) && sp.to > lvl0.branchAbove)
      diag("warn", `${sp.skill} (${effSub}): kategóriaként legfeljebb ${lvl0.branchAbove}. fokig tanulható, a magasabb fokhoz konkrét fegyvert kell választani.`, L);
    // A non-variant purchase that doesn't raise the fok is a phantom (e.g. an earlier level now reaches
    // it) — flag it for pruning and SKIP it: applying it would wrongly LOWER the skill to its stale
    // target (raise L1 to 5 while L2 still says "to 4" → fok must stay 5 until the prune removes it).
    if (sp.id == null && sp.to <= from) {
      ctx.redundantPurchases.push({ level: L, idx: spIdx, skill: sp.skill, subtype: sp.subtype });
      continue;
    }
    const rAttrs = instAttrs(ctx, sp.skill, effSub, sp.parent, attrChoiceFor(ctx, sp.skill, sp.subtype, sp.id));
    const tUpto = sp.teachingUpto != null ? sp.teachingUpto : teachingUptoFor(ctx.discounts, def, effSub);
    // Final price incl. the school cost penalty (e.g. Barbár ×1.5 Kp) — shared with the level-up UI.
    const cost = skillStepCost(def, from, sp.to, tUpto, ctx.effective, rAttrs, ctx.costMultipliers, effSub);
    const kp = cost.kp;
    ctx.kapBalance -= kp; // 1 Kp = 1 KAP, drawn directly from the shared pool
    // One entry per purchase, joined by position (`idx`) — two same-key ops in one level (raw +
    // renamed purchase resolving to one instance) each report their own spend and step.
    ctx.ledger.push({ level: L, kind: "skill", id: key, idx: spIdx, cost: kp, before: from, after: sp.to });
    if (cost.note) diag("info", cost.note, L);
    // Carry forward the granted subtype's stable key: raising a granted-subtyped skill must keep its
    // origSubtype, else it looks self-specialised (a spurious "unspecialise" ✕ that corrupts on click).
    // A purchase that itself resolves an override keeps the original as origSubtype for the same reason.
    const common = { skill: sp.skill, subtype: effSub, parent: sp.parent, attrs: rAttrs, origSubtype: cur?.origSubtype ?? (hasOverride ? sp.subtype : undefined), variantId: sp.id };
    owned[key] = isPct ? { ...common, fok: 0, percent: sp.to } : { ...common, fok: sp.to, percent: 0 };
  }
}

function applyFok4AndPaths(ctx: DeriveCtx, L: number): void {
  const { db, rec, diag, owned, effective } = ctx;
  // Fok-4 bonus: a fok-based skill with attribute requirements grants +1 to one of its attributes the
  // first level it reaches fok 4 (by purchase OR grant — e.g. a wizard's granted Pszi 4). Single-attr
  // skills auto-target it; multi-attr use the player's stored choice (rec.fok4Bonuses, matched per
  // INSTANCE). Applied after this level's purchases so it lowers the cost of skills priced at later
  // levels. Once per instance via `fok4Bonused`; an instance dropped below fok 4 isn't seen here, so its
  // bonus disappears (no phantom +1).
  for (const k of Object.keys(owned)) {
    const o = owned[k];
    const def = db.skills[o.skill];
    const rAttrs = o.attrs ?? instAttrs(ctx, o.skill, o.subtype, o.parent);
    if (!def || def.cost === "percentage" || rAttrs.length === 0 || o.fok < 4 || ctx.fok4Bonused.has(k)) continue;
    ctx.fok4Bonused.add(k);
    const idSub = o.origSubtype ?? o.subtype; // stable identity — survives renaming a granted subtype
    const choice = rAttrs.length === 1
      ? rAttrs[0]
      : findInstanceChoice(rec.fok4Bonuses, { skill: o.skill, subtype: idSub, variantId: o.variantId })?.stat;
    if (choice) {
      // Book: relearning the same skill may not raise the SAME attribute again — warn (not blocked).
      const used = ctx.fok4StatOfSkill[o.skill] ?? (ctx.fok4StatOfSkill[o.skill] = new Set());
      if (used.has(choice)) diag("warn", `${o.skill}: a 4. fok +1 nem növelheti újra ugyanazt a tulajdonságot (${choice}).`, L);
      used.add(choice);
      effective[choice] += 1;
      ctx.addProv(choice as string, `skillFok4 (${o.skill}) L${L}`, 1);
    } else {
      diag("info", `${o.skill}: 4. fok elérve — válaszd ki, melyik tulajdonság kapjon +1-et (${rAttrs.join(", ")}).`, L);
    }
  }

  // Path trigger (Pszi tudat/test at fok 3): once an instance reaches the trigger fok it MUST commit to
  // a path; warn until the player has chosen (rec.pathChoices). The magic layer consumes the choice.
  for (const k of Object.keys(owned)) {
    const o = owned[k];
    const trig = db.skills[o.skill]?.fokTriggers?.find((t) => t.kind === "path");
    if (!trig || trig.kind !== "path" || o.fok < trig.atFok) continue;
    const chosen = rec.pathChoices?.find((c) => sameInstance(c, { skill: o.skill, subtype: o.origSubtype ?? o.subtype, variantId: o.variantId }) && c.trigger === trig.label);
    if (!chosen) diag("warn", `${o.skill}${o.subtype ? ` (${o.subtype})` : ""}: ${trig.atFok}. fokon választani kell (${trig.label}: ${trig.options.join(" / ")}).`, L);
  }
}

// Skill-driven + static per-level resources (apply at the current fok / from their level).
// Collected into a flat delta list, then applied with plain for-loops (no functions-in-loop).
// Returns this level's free HM from skills (consumed by applyHm below).
function applyPerFokResources(ctx: DeriveCtx, L: number): number {
  const { db, owned } = ctx;
  let hmFromSkills = 0;
  const resourceDeltas: { resource: string; amount: number }[] = [];
  // This level's skill-fok resource grants — the amount scales with the skill's CURRENT fok, so it differs
  // per level as the skill is raised. Indexed by level below (resourceGrantsByLevel).
  const levelGrants: { source: string; resource: Resource; amount: number }[] = [];
  for (const k of Object.keys(owned)) {
    const o = owned[k];
    const def = db.skills[o.skill];
    if (!def || !def.perFokEffects) continue;
    const effs = (def.perFokEffects as Partial<Record<number, Effect[]>>)[o.fok];
    if (!effs) continue;
    for (const e of effs) {
      if (e.kind === "resourcePerLevel") {
        resourceDeltas.push({ resource: e.resource, amount: e.amount });
        levelGrants.push({ source: `${o.skill}${o.subtype ? ` (${o.subtype})` : ""} ${o.fok}. fok`, resource: e.resource, amount: e.amount });
      } else if (e.kind === "derivedPerLevel") ctx.derivedBonus[e.target] += e.amount;
    }
  }
  ctx.resourceGrantsByLevel[L - 1] = levelGrants;
  for (const s of ctx.staticPerLevel) {
    if (s.fromLevel <= L) resourceDeltas.push({ resource: s.resource, amount: s.amount });
  }
  for (const s of ctx.staticDerivedPerLevel) {
    if (s.fromLevel <= L) ctx.derivedBonus[s.target] += s.amount;
  }
  for (const d of resourceDeltas) {
    if (d.resource === "HM") hmFromSkills += d.amount;
    else if (d.resource === "Fp") ctx.fpGains += d.amount;
    else if (d.resource === "Kp") ctx.kapBalance += d.amount; // skill-granted Kp = bonus KAP
    else if (d.resource === "Mana" || d.resource === "Psi" || d.resource === "Kegy") {
      if (ctx.poolExists[d.resource as Pool]) ctx.poolMax[d.resource as Pool] += d.amount;
    }
  }
  return hmFromSkills;
}

// HM is allocated from two distinct sources (each targeting KÉ/TÉ/VÉ/CÉ):
//  • grantedHmAssignments — the free HM skills grant (distributed in the Szintlépési nyereségek panel),
//  • hmAssignments        — extra HM bought with KAP in the Pontvásárlás panel, paid per point.
function applyHm(ctx: DeriveCtx, L: number, lvlRec: LevelRecord | undefined, hmFromSkills: number): void {
  const { diag, combatAcc } = ctx;
  let grantedAssigned = 0;
  if (lvlRec?.grantedHmAssignments) {
    lvlRec.grantedHmAssignments.forEach((h) => {
      const before = combatAcc[h.channel];
      combatAcc[h.channel] += h.amount;
      ctx.addProv(h.channel, `HM (kapott) L${L}`, h.amount);
      ctx.ledger.push({ level: L, kind: "ghm", id: h.channel, cost: 0, before, after: before + h.amount }); // free
      grantedAssigned += h.amount;
    });
  }
  if (lvlRec) {
    lvlRec.hmAssignments.forEach((h) => {
      const before = combatAcc[h.channel];
      combatAcc[h.channel] += h.amount;
      ctx.addProv(h.channel, `HM (vett) L${L}`, h.amount);
      ctx.ledger.push({ level: L, kind: "hm", id: h.channel, cost: h.amount * KAP_RATE.HM, before, after: before + h.amount });
      ctx.kapBalance -= h.amount * KAP_RATE.HM;
    });
  }
  ctx.hmGrantedByLevel.push(hmFromSkills);
  if (grantedAssigned > hmFromSkills)
    diag("warn", `${L}. szint: ${grantedAssigned - hmFromSkills} HM-mel több van elosztva, mint amennyi jár (${hmFromSkills} kapott HM).`, L);
  else if (grantedAssigned < hmFromSkills)
    diag("info", `${L}. szint: ${hmFromSkills - grantedAssigned} kapott HM még nincs elosztva (KÉ/TÉ/VÉ/CÉ).`, L);
}

// Sum the KM-granted raw KAP targeted at level L. A KM adjustment with no atLevel defaults to level 1,
// so the grant is spendable from character creation; a set level makes it available from that level on.
function kmKapAtLevel(ctx: DeriveCtx, L: number): number {
  let sum = 0;
  for (const adj of ctx.rec.kmAdjustments) {
    if ((adj.atLevel ?? 1) !== L) continue;
    for (const e of adj.effects) if (e.kind === "grantKap") sum += e.amount;
  }
  return sum;
}

export function runLevelFold(ctx: DeriveCtx): void {
  const { rec, diag } = ctx;
  const N = Math.max(rec.levels.length, 1);

  for (let L = 1; L <= N; L++) {
    ctx.perLevelEffects.filter((p) => p.level === L).forEach((p) => applyEffect(ctx, p.effect, p.source, L));
    const floorSnap = Object.keys(ctx.owned).map((k) => ({ ...ctx.owned[k] }));
    ctx.floorSnapshots[L - 1] = floorSnap;
    if (L === 1) ctx.grantedSkillsSnapshot = floorSnap;
    ctx.cumulativeBgCost += ctx.bgCostAtLevel[L] || 0;
    // Level 1 only folds the starting Kp (= Intelligencia) into the shared KAP pool; later level-ups
    // get the flat 50 − backgrounds. The Int pool funds skills or HM/Mana/Pszi/Kegy/Tulajdonság.
    // KM grantKap adjustments add spendable build points at their target level (default 1).
    const income = BASE_KAP_PER_LEVEL + (L === 1 ? ctx.effective.Intelligencia : 0) - ctx.cumulativeBgCost + kmKapAtLevel(ctx, L); // effective Int (grants count)
    ctx.kapBalance += income;
    ctx.kapIncomeByLevel.push(income);

    const lvlRec = getLevelRecord(rec, L);

    if (lvlRec) {
      applyAllocations(ctx, L, lvlRec);
      applyStatIncreases(ctx, L, lvlRec);
      applySkillPurchases(ctx, L, lvlRec);
    }

    // NOTE: the fok-4 and path scans run OUTSIDE the lvlRec guard — they're grant-driven (a level-gated
    // grant can push an instance to fok 4 on a level with no ledger record).
    applyFok4AndPaths(ctx, L);

    const hmFromSkills = applyPerFokResources(ctx, L);

    applyHm(ctx, L, lvlRec, hmFromSkills);
    if (ctx.kapBalance < 0) diag("warn", `${L}. szint: a KAP egyenleg negatív (${ctx.kapBalance}).`, L);

    ctx.kapBalanceByLevel.push(ctx.kapBalance);
  }

  // Ban / fok-cap warnings: the chosen school forbids or caps certain skills (e.g. Bárd subclasses banning
  // skills, Lar-Dor capping Nekromancia/Démonológia at fok 2). Not hard-blocked — surfaced so the player notices.
  for (const k of Object.keys(ctx.owned)) {
    const o = ctx.owned[k];
    const def = ctx.db.skills[o.skill];
    if (!def) continue;
    if (ctx.skillBans.some((b) => scopeMatches(b, def)))
      diag("warn", `${o.skill}${o.subtype ? ` (${o.subtype})` : ""}: a választott iskola/rend nem engedi ezt a képzettséget.`);
    const cap = ctx.fokCaps.find((c) => scopeMatches(c, def) && o.fok > c.fok);
    if (cap) diag("warn", `${o.skill}${o.subtype ? ` (${o.subtype})` : ""}: a választott iskola szerint legfeljebb ${cap.fok}. fok (jelenleg ${o.fok}).`);
  }
}
