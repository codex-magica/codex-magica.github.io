// derive(db, record) — the pure derivation engine. Replays the character's identity + background
// choices + per-level ledger into a full sheet, with provenance and (non-blocking) diagnostics.
// Nothing here throws on bad input; problems surface as diagnostics so the builder can warn.

import { RulesDB } from "../model/rulesDb";
import { CharacterRecord, VitalKey } from "../model/character";
import { STAT_KEYS, Stats, sumStats } from "../model/attributes";
import { CombatChannel, Effect, Pool } from "../model/effects";
import { PERCENT_KP_RATE, PERCENT_KP_RATE_TAUGHT, SkillDef } from "../model/skills";
import { skillKey } from "../model/common";
import { resolveChoiceGrants } from "../model/choices";
import {
  ATTR_KAP_COST,
  BASE_KAP_PER_LEVEL,
  FOK_CHECK_MOD,
  KAP_RATE,
  MAGIC_DEFENSE_OFFSET,
  POINT_BUY_TOTAL,
  TEACHING_DISCOUNT_PER_FOK,
  VE_BASE,
} from "./constants";
import { Contribution, DerivedCharacter, Diagnostic, OwnedSkill, Severity } from "./types";

type OwnedMap = Record<string, { skill: string; subtype?: string; fok: number; percent: number }>;
type Discount = { skill?: string; category?: string; uptoLevel: number };

const POOLS: Pool[] = ["Mana", "Psi", "Kegy"];

export function derive(db: RulesDB, rec: CharacterRecord): DerivedCharacter {
  const diagnostics: Diagnostic[] = [];
  const provenance: Record<string, Contribution[]> = {};
  const diag = (severity: Severity, message: string, atLevel?: number) =>
    diagnostics.push({ severity, message, atLevel });
  const addProv = (key: string, source: string, amount: number) => {
    if (!provenance[key]) provenance[key] = [];
    provenance[key].push({ source, amount });
  };

  // ── 1. Base attributes ─────────────────────────────────────────────────────
  const race = db.races[rec.race];
  const base: Stats = { ...rec.pointBuy };
  const sum = sumStats(base);
  if (sum !== POINT_BUY_TOTAL) {
    diag("warn", `A pontvásárlás összege ${sum}, a szükséges ${POINT_BUY_TOTAL}.`);
  }
  if (!race) {
    diag("error", `Ismeretlen faj: ${rec.race}`);
  } else {
    STAT_KEYS.forEach((k) => {
      const cap = race.statLimits[k];
      if (base[k] > cap) {
        diag("warn", `${k} (${base[k]}) meghaladja a faji maximumot (${cap}).`);
        base[k] = cap;
      }
    });
    const ageCat = race.ageCategories.find((a) => a.name === rec.identity.ageCategory);
    if (ageCat) {
      STAT_KEYS.forEach((k) => {
        const m = ageCat.statMods[k];
        if (m) base[k] += m;
      });
    }
  }

  // ── 2/3. Collect background activations + flatten grants by level ───────────
  const perLevelEffects: { effect: Effect; source: string; level: number }[] = [];
  const bgCostAtLevel: Record<number, number> = {};
  const staticPerLevel: { resource: string; amount: number; fromLevel: number }[] = [];
  const seenBg: Record<string, boolean> = {};

  const pushActivation = (
    name: string | null,
    atLevel: number,
    cost: number,
    grants: { atLevel?: number; effect: Effect }[],
    source: string
  ) => {
    if (name) {
      if (seenBg[name]) return;
      seenBg[name] = true;
    }
    if (cost) bgCostAtLevel[atLevel] = (bgCostAtLevel[atLevel] || 0) + cost;
    grants.forEach((g) => {
      const lvl = g.atLevel != null ? g.atLevel : atLevel;
      if (g.effect.kind === "grantBackground") {
        const bgName = g.effect.background;
        const def = db.backgrounds[bgName];
        if (!def) {
          diag("warn", `Ismeretlen háttér: ${bgName}`, lvl);
          return;
        }
        pushActivation(bgName, lvl, 0, def.grants, `${bgName} (kapott)`);
      } else {
        perLevelEffects.push({ effect: g.effect, source, level: lvl });
      }
    });
  };

  if (race) pushActivation(null, 1, race.cost, race.grants, `Faj: ${rec.race}`);
  const klass = db.classes[rec.class];
  if (klass) {
    // Resolve the class's specialization choice tree (override/additive + nested) into grants.
    const classGrants = resolveChoiceGrants(klass.grants, klass.baseSkills, klass.choices, rec.selections);
    pushActivation(null, 1, klass.cost, classGrants, `Kaszt: ${rec.class}`);
  } else {
    diag("error", `Ismeretlen kaszt: ${rec.class}`);
  }
  rec.backgrounds.forEach((bg) => {
    const def = db.backgrounds[bg.background];
    if (!def) {
      diag("warn", `Ismeretlen háttér: ${bg.background}`);
      return;
    }
    const cost = bg.source === "granted" ? 0 : def.cost;
    pushActivation(bg.background, bg.acquiredAtLevel, cost, def.grants, `Háttér: ${bg.background}`);
  });

  // ── Accumulators for the per-level fold ────────────────────────────────────
  const effective: Stats = { ...base };
  STAT_KEYS.forEach((k) => addProv(k, "alap", base[k]));
  const combatAcc: Record<CombatChannel, number> = { KÉ: 0, TÉ: 0, VÉ: 0, CÉ: 0 };
  const derivedBonus: Record<string, number> = { Ép: 0, Fp: 0, MME: 0, AME: 0, Sebzésbónusz: 0 };
  let fpGains = 0;
  const poolMax: Record<Pool, number> = { Mana: 0, Psi: 0, Kegy: 0 };
  const poolExists: Record<Pool, boolean> = { Mana: false, Psi: false, Kegy: false };
  const owned: OwnedMap = {};
  const tags: Record<string, boolean> = {};
  let money = 0;
  const inventory = rec.inventory.slice();
  const discounts: Discount[] = [];
  let kapBalance = 0;
  let kpBalance = 0;
  const kapIncomeByLevel: number[] = [];
  const kapBalanceByLevel: number[] = [];
  let cumulativeBgCost = 0;

  const applyEffect = (e: Effect, source: string, level: number) => {
    switch (e.kind) {
      case "grantSkill": {
        const key = skillKey(e.skill, e.subtype);
        const cur = owned[key];
        if (!cur || cur.fok < e.level) owned[key] = { skill: e.skill, subtype: e.subtype, fok: e.level, percent: 0 };
        break;
      }
      case "grantSkillPercent": {
        const key = skillKey(e.skill, e.subtype);
        const cur = owned[key];
        owned[key] = { skill: e.skill, subtype: e.subtype, fok: 0, percent: (cur ? cur.percent : 0) + e.percent };
        break;
      }
      case "teachingDiscount":
        discounts.push({ skill: e.skill, category: e.category, uptoLevel: e.uptoLevel });
        break;
      case "poolAccess":
        poolExists[e.pool] = true;
        break;
      case "grantPoolPoints":
        poolExists[e.pool] = true;
        poolMax[e.pool] += e.amount;
        addProv(e.pool, source, e.amount);
        break;
      case "statBonus":
        effective[e.stat] += e.amount;
        addProv(e.stat, source, e.amount);
        break;
      case "combatBonus":
        combatAcc[e.channel] += e.amount;
        addProv(e.channel, source, e.amount);
        break;
      case "derivedBonus":
        derivedBonus[e.target] += e.amount;
        addProv(e.target, source, e.amount);
        break;
      case "tag":
        tags[e.tag] = true;
        break;
      case "grantEquipment":
        inventory.push({ name: e.item, qty: e.qty });
        break;
      case "grantMoney":
        money += e.amount;
        break;
      case "resourcePerLevel":
        staticPerLevel.push({ resource: e.resource, amount: e.amount, fromLevel: level });
        break;
      case "restriction":
        diag("info", `Megkötés: ${e.text}`, level);
        break;
      case "note":
        break;
    }
  };

  const maxFok = (skill: string): number => {
    let m = 0;
    Object.keys(owned).forEach((k) => {
      const o = owned[k];
      if (o.skill === skill && o.fok > m) m = o.fok;
    });
    return m;
  };

  const discountApplies = (def: SkillDef, f: number, teachingUpto?: number): boolean => {
    if (f > 4) return false;
    if (teachingUpto != null && f <= teachingUpto) return true;
    return discounts.some((d) => (d.skill ? d.skill === def.name : d.category === def.category) && f <= d.uptoLevel);
  };

  const skillKpCost = (
    def: SkillDef,
    from: number,
    to: number,
    teachingUpto: number | undefined
  ): { kp: number; note?: string } => {
    if (def.cost === "percentage") {
      const taught = teachingUpto != null || discounts.some((d) => (d.skill ? d.skill === def.name : d.category === def.category));
      const rate = taught ? PERCENT_KP_RATE_TAUGHT : PERCENT_KP_RATE;
      const delta = Math.max(0, to - from);
      return { kp: Math.ceil(delta / rate) };
    }
    const cum = def.cost;
    let kp = 0;
    for (let f = from + 1; f <= to; f++) {
      const inc = cum[f - 1] - (f > 1 ? cum[f - 2] : 0);
      const disc = discountApplies(def, f, teachingUpto) ? TEACHING_DISCOUNT_PER_FOK : 0;
      kp += Math.max(1, inc - disc);
    }
    let penalty = 0;
    def.attrs.forEach((a) => {
      const need = 10 + to;
      if (effective[a] < need) penalty += need - effective[a];
    });
    return { kp: kp + penalty, note: penalty > 0 ? `${def.name}: tulajdonság-hiány miatt +${penalty} Kp.` : undefined };
  };

  // ── 4. Per-level fold ──────────────────────────────────────────────────────
  let maxGrantLevel = 1;
  perLevelEffects.forEach((p) => (maxGrantLevel = Math.max(maxGrantLevel, p.level)));
  const N = Math.max(rec.levels.length, maxGrantLevel, 1);

  for (let L = 1; L <= N; L++) {
    perLevelEffects.filter((p) => p.level === L).forEach((p) => applyEffect(p.effect, p.source, L));
    cumulativeBgCost += bgCostAtLevel[L] || 0;
    const income = BASE_KAP_PER_LEVEL - cumulativeBgCost;
    kapBalance += income;
    kapIncomeByLevel.push(income);

    const lvlRec = rec.levels.find((l) => l.level === L);
    let hmFromAlloc = 0;

    if (lvlRec) {
      for (const a of lvlRec.allocations) {
        const spend = a.points * KAP_RATE[a.target];
        kapBalance -= spend;
        if (a.target === "Kp") kpBalance += a.points;
        else if (a.target === "Fp") fpGains += a.points;
        else if (a.target === "HM") hmFromAlloc += a.points;
        else {
          if (!poolExists[a.target]) diag("warn", `${a.target} vásárlása megfelelő háttér nélkül (${L}. szint).`, L);
          poolMax[a.target] += a.points;
        }
      }

      for (const sp of lvlRec.skillPurchases) {
        const def = db.skills[sp.skill];
        if (!def) {
          diag("warn", `Ismeretlen képzettség: ${sp.skill}`, L);
          continue;
        }
        for (const r of def.hardReq) {
          if (maxFok(r.skill) < sp.to)
            diag("warn", `${sp.skill} ${sp.to}. fok: erős előfeltétel «${r.skill}» legalább ${sp.to}. fok.`, L);
        }
        for (const r of def.softReq) {
          if (maxFok(r.skill) < sp.to - 1)
            diag("warn", `${sp.skill} ${sp.to}. fok: gyenge előfeltétel «${r.skill}» legalább ${sp.to - 1}. fok.`, L);
        }
        const cost = skillKpCost(def, sp.from, sp.to, sp.teachingUpto);
        kpBalance -= cost.kp;
        if (cost.note) diag("info", cost.note, L);
        const key = skillKey(sp.skill, sp.subtype);
        if (def.cost === "percentage") {
          owned[key] = { skill: sp.skill, subtype: sp.subtype, fok: 0, percent: sp.to };
        } else {
          owned[key] = { skill: sp.skill, subtype: sp.subtype, fok: sp.to, percent: 0 };
          if (sp.to >= 4 && sp.from < 4 && def.attrs.length > 0) {
            const has = lvlRec.statIncreases.some((si) => si.source === "skillFok4" && si.refSkill === sp.skill);
            if (!has) diag("info", `${sp.skill}: 4. fok elérve — válassz +1 Tulajdonságot (${def.attrs.join(", ")}).`, L);
          }
        }
      }

      for (const si of lvlRec.statIncreases) {
        effective[si.stat] += si.amount;
        addProv(si.stat as string, `${si.source}${si.refSkill ? ` (${si.refSkill})` : ""} L${L}`, si.amount);
        if (si.source === "kap") kapBalance -= si.amount * ATTR_KAP_COST;
      }
    }

    // Skill-driven + static per-level resources (apply at the current fok / from their level).
    // Collected into a flat delta list, then applied with plain for-loops (no functions-in-loop).
    let hmFromSkills = 0;
    const resourceDeltas: { resource: string; amount: number }[] = [];
    for (const k of Object.keys(owned)) {
      const o = owned[k];
      const def = db.skills[o.skill];
      if (!def || !def.perFokEffects) continue;
      const effs = (def.perFokEffects as Partial<Record<number, Effect[]>>)[o.fok];
      if (!effs) continue;
      for (const e of effs) {
        if (e.kind === "resourcePerLevel") resourceDeltas.push({ resource: e.resource, amount: e.amount });
      }
    }
    for (const s of staticPerLevel) {
      if (s.fromLevel <= L) resourceDeltas.push({ resource: s.resource, amount: s.amount });
    }
    for (const d of resourceDeltas) {
      if (d.resource === "HM") hmFromSkills += d.amount;
      else if (d.resource === "Fp") fpGains += d.amount;
      else if (d.resource === "Kp") kpBalance += d.amount;
      else if (d.resource === "Mana" || d.resource === "Psi" || d.resource === "Kegy") {
        if (poolExists[d.resource as Pool]) poolMax[d.resource as Pool] += d.amount;
      }
    }

    const hmAvailable = hmFromAlloc + hmFromSkills;
    let assigned = 0;
    if (lvlRec) {
      lvlRec.hmAssignments.forEach((h) => {
        combatAcc[h.channel] += h.amount;
        addProv(h.channel, `HM L${L}`, h.amount);
        assigned += h.amount;
      });
    }
    if (hmAvailable !== assigned)
      diag("warn", `${L}. szint: ${hmAvailable} HM érhető el, de ${assigned} lett elosztva (KÉ/TÉ/VÉ/CÉ).`, L);
    if (kapBalance < 0) diag("warn", `${L}. szint: a KAP egyenleg negatív (${kapBalance}).`, L);

    kapBalanceByLevel.push(kapBalance);
  }

  // ── 5. KM adjustments ──────────────────────────────────────────────────────
  rec.kmAdjustments.forEach((adj) => {
    adj.effects.forEach((e) => applyEffect(e, `KM: ${adj.reason}`, adj.atLevel || N));
  });
  if (kpBalance < 0) diag("info", `A teljes Kp-egyenleg negatív (${kpBalance}) — túlköltött képzettségek.`);

  // ── 6/7. Effective stats, combat, derived, vitals, spells ──────────────────
  const combat: Record<CombatChannel, number> = {
    KÉ: effective.Érzékelés + effective.Gyorsaság + combatAcc.KÉ,
    TÉ: effective.Erő + effective.Gyorsaság + effective.Ügyesség + combatAcc.TÉ,
    VÉ: effective.Ügyesség + effective.Gyorsaság + VE_BASE + combatAcc.VÉ,
    CÉ: effective.Ügyesség + effective.Érzékelés + combatAcc.CÉ,
  };

  const epMax = effective.Egészség + derivedBonus.Ép;
  const fpMax = effective.Állóképesség + effective.Egészség + fpGains + derivedBonus.Fp;
  const derived = {
    Ép: epMax,
    Fp: fpMax,
    MME: effective.Akaraterő + MAGIC_DEFENSE_OFFSET + derivedBonus.MME,
    AME: effective.Asztrál + MAGIC_DEFENSE_OFFSET + derivedBonus.AME,
    Sebzésbónusz: Math.max(effective.Erő - 15, 0) + derivedBonus.Sebzésbónusz,
    Mozgás: effective.Gyorsaság * 5,
  };

  const vital = (key: VitalKey, max: number) => {
    const stored = rec.vitalsState[key];
    return { current: stored != null ? Math.max(0, Math.min(stored, max)) : max, max };
  };
  const vitals: Record<VitalKey, { current: number; max: number }> = {
    Ép: vital("Ép", epMax),
    Fp: vital("Fp", fpMax),
    Mana: vital("Mana", poolExists.Mana ? poolMax.Mana : 0),
    Psi: vital("Psi", poolExists.Psi ? poolMax.Psi : 0),
    Kegy: vital("Kegy", poolExists.Kegy ? poolMax.Kegy : 0),
  };

  const magic: Partial<Record<Pool, { max: number }>> = {};
  POOLS.forEach((p) => {
    if (poolExists[p]) magic[p] = { max: poolMax[p] };
  });

  const skills: OwnedSkill[] = Object.keys(owned).map((k) => {
    const o = owned[k];
    const def = db.skills[o.skill];
    const isPct = def && def.cost === "percentage";
    return {
      skill: o.skill,
      subtype: o.subtype,
      fok: o.fok,
      percent: isPct ? o.percent : undefined,
      checkMod: isPct ? o.percent : FOK_CHECK_MOD[o.fok] || 0,
      difficulty: def ? def.difficulty : "?",
    };
  });
  skills.sort((a, b) => a.skill.localeCompare(b.skill, "hu"));

  const spells = db.spells.map((sp) => {
    const known = maxFok(sp.requires.skill) >= sp.requires.fok;
    const cur = vitals[sp.pool].current;
    return { name: sp.name, pool: sp.pool, cost: sp.cost, known, castableNow: known && cur >= sp.cost };
  });

  return {
    level: rec.levels.length || 1,
    baseStats: base,
    effectiveStats: effective,
    combat,
    derived,
    vitals,
    pools: { kapIncomeByLevel, kapBalanceByLevel, kpBalance, magic },
    skills,
    spells,
    tags: Object.keys(tags),
    money,
    inventory,
    provenance,
    diagnostics,
  };
}
