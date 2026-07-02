// derive(db, record) — the pure derivation engine. Replays the character's identity + background
// choices + per-level ledger into a full sheet, with provenance and (non-blocking) diagnostics.
// Nothing here throws on bad input; problems surface as diagnostics so the builder can warn.

import { RulesDB } from "../model/rulesDb";
import { CharacterRecord, VitalKey, getLevelRecord } from "../model/character";
import { STAT_KEYS, Stat, Stats } from "../model/attributes";
import { CombatChannel, Effect, Pool, Resource } from "../model/effects";
import { skillKey } from "../model/common";
import { resolveChoiceGrants } from "../model/choices";
import {
  ATTR_KAP_COST,
  ATTR_MAX,
  BASE_KAP_PER_LEVEL,
  FOK_CHECK_MOD,
  KAP_RATE,
  MAGIC_DEFENSE_OFFSET,
  POINT_BUY_TOTAL,
  VE_BASE,
} from "./constants";
import { Discount, skillKpCost, teachingUptoFor } from "./skillCost";
import { Contribution, DerivedCharacter, Diagnostic, OwnedSkill, Severity } from "./types";

type OwnedMap = Record<string, { skill: string; subtype?: string; parent?: string; attrs?: Stat[]; placeholder?: boolean; fok: number; percent: number; origSubtype?: string; variantId?: string }>;

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
  // pointBuy may exceed the racial cap: the part up to the cap spends the 135 base budget; the part
  // above the cap (≤ 20) is Adottság — each such point costs 1 KAP (a Háttér, reducing per-level KAP).
  const race = db.races[rec.race];
  const base: Stats = { ...rec.pointBuy };
  let baseBudget = 0;
  let adottsagPoints = 0;
  if (!race) {
    diag("error", `Ismeretlen faj: ${rec.race}`);
  } else {
    STAT_KEYS.forEach((k) => {
      const cap = race.statLimits[k];
      const pbBase = Math.min(rec.pointBuy[k], cap); // 135-budget part (≤ racial cap)
      // Above-cap part: explicit Adottság + any pointBuy beyond the cap (legacy), to ATTR_MAX.
      const adott = Math.min(ATTR_MAX - cap, (rec.adottsag?.[k] || 0) + Math.max(0, rec.pointBuy[k] - cap));
      base[k] = pbBase + adott;
      baseBudget += pbBase;
      adottsagPoints += adott;
    });
    const ageCat = race.ageCategories.find((a) => a.name === rec.identity.ageCategory);
    if (ageCat) {
      STAT_KEYS.forEach((k) => {
        const m = ageCat.statMods[k];
        if (m) base[k] += m;
      });
    }
  }
  if (baseBudget !== POINT_BUY_TOTAL) {
    diag("warn", `Az alappontok összege ${baseBudget}, a szükséges ${POINT_BUY_TOTAL} (faji max alatti rész).`);
  }

  // ── 2/3. Collect background activations + flatten grants by level ───────────
  const perLevelEffects: { effect: Effect; source: string; level: number }[] = [];
  const bgCostAtLevel: Record<number, number> = {};
  const staticPerLevel: { resource: string; amount: number; fromLevel: number }[] = [];
  const staticDerivedPerLevel: { target: string; amount: number; fromLevel: number }[] = [];
  const seenBg: Record<string, boolean> = {};
  const grantedBg: Record<string, boolean> = {}; // backgrounds conferred via grantBackground (race/class)

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
        grantedBg[bgName] = true;
        // A granted background with a level range uses the player's chosen level (free); else its min/cost.
        const bgLevel = rec.grantedBgLevels?.[bgName] ?? (def.costRange ? def.costRange[0] : def.cost);
        const grants = def.grantsFor ? def.grantsFor({ level: bgLevel }) : def.grants;
        pushActivation(bgName, lvl, 0, grants, `${bgName} (kapott)`);
      } else {
        perLevelEffects.push({ effect: g.effect, source, level: lvl });
      }
    });
  };

  // Universal free skills — every character starts with these at fok 3 (book ch.02); class grants of the
  // same instance merge by max, so e.g. a Bárd's Kultúra (saját) 4 simply wins.
  pushActivation(null, 1, 0, [
    { effect: { kind: "grantSkill", skill: "Nyelvtudás", subtype: "anyanyelv", level: 3 as const } },
    { effect: { kind: "grantSkill", skill: "Kultúra", subtype: "saját", level: 3 as const } },
    { effect: { kind: "grantSkill", skill: "Helyismeret", subtype: "szülőföld", level: 3 as const } },
  ], "Alapképzettségek");

  if (race) pushActivation(null, 1, race.cost, race.grants, `Faj: ${rec.race}`);
  const klass = db.classes[rec.class];
  if (klass) {
    // Resolve the class's specialization choice tree (override/additive + nested) into grants.
    const classGrants = resolveChoiceGrants(klass.grants, klass.baseSkills, klass.choices, rec.selections);
    // A subclass may change the class's KAP cost (Renegát tűzvarázsló −1).
    const costDelta = classGrants.reduce((a, g) => a + (g.effect.kind === "classCostDelta" ? g.effect.amount : 0), 0);
    pushActivation(null, 1, Math.max(0, klass.cost + costDelta), classGrants, `Kaszt: ${rec.class}`);
  } else {
    diag("error", `Ismeretlen kaszt: ${rec.class}`);
  }
  rec.backgrounds.forEach((bg) => {
    const def = db.backgrounds[bg.background];
    if (!def) {
      diag("warn", `Ismeretlen háttér: ${bg.background}`);
      return;
    }
    const magnitude = bg.level != null && def.costRange
      ? Math.max(def.costRange[0], Math.min(bg.level, def.costRange[1]))
      : def.costRange
        ? def.costRange[0]
        : def.cost;
    const cost = bg.source === "granted" ? 0 : magnitude;
    const grants = def.grantsFor ? def.grantsFor({ level: magnitude, option: bg.option }) : def.grants;
    pushActivation(bg.background, bg.acquiredAtLevel, cost, grants, `Háttér: ${bg.background}`);
  });
  // Adottság: every attribute point above the racial cap is a 1-KAP Háttér point (level-1 cost).
  if (adottsagPoints > 0) bgCostAtLevel[1] = (bgCostAtLevel[1] || 0) + adottsagPoints;

  // ── Accumulators for the per-level fold ────────────────────────────────────
  const effective: Stats = { ...base };
  STAT_KEYS.forEach((k) => addProv(k, "alap", base[k]));
  const combatAcc: Record<CombatChannel, number> = { KÉ: 0, TÉ: 0, VÉ: 0, CÉ: 0 };
  const derivedBonus: Record<string, number> = { Ép: 0, Fp: 0, MME: 0, AME: 0, Sebzésbónusz: 0 };
  let fpGains = 0;
  const poolMax: Record<Pool, number> = { Mana: 0, Psi: 0, Kegy: 0 };
  const poolExists: Record<Pool, boolean> = { Mana: false, Psi: false, Kegy: false };
  const owned: OwnedMap = {};
  const grantedFokOf: Record<string, number> = {}; // key → highest GRANTED fok (grants don't need prereqs)
  const tags: Record<string, boolean> = {};
  let money = 0;
  const inventory = rec.inventory.slice();
  const discounts: Discount[] = [];
  const costMultipliers: { skill?: string; category?: string; allSkills?: boolean; factor: number }[] = []; // e.g. ×1.5 Kp
  const skillBans: { skill?: string; category?: string; source: string }[] = []; // schools that can't learn X → warning
  const fokCaps: { skill?: string; category?: string; fok: number }[] = []; // schools that cap X at a fok → warning
  const allowedSkills: { skill: string; subtype?: string }[] = []; // "may learn if DM allows" (allowSkill)
  let kapBalance = 0; // skills (1 Kp = 1 KAP), HM/Fp/Mana/Psi/Kegy and attribute buys all draw from this
  const kapIncomeByLevel: number[] = [];
  const kapBalanceByLevel: number[] = [];
  const hmGrantedByLevel: number[] = []; // free HM (from skills) per level — assignable at no cost
  const ledgerCosts: Record<string, number> = {}; // KAP charged per ledger op, keyed `L:kind:id` (for the ledger view)
  const ledgerDelta: Record<string, { before: number; after: number }> = {}; // running value before→after per op
  const resourceGrantsByLevel: { source: string; resource: Resource; amount: number }[][] = []; // skill-fok grants per level
  let cumulativeBgCost = 0;

  // A granted subtype may be renamed by the player (placeholders like "anyanyelv"/"szülőföld").
  // The override is keyed by the ORIGINAL granted subtype (stable); `origSubtype` is kept so the UI
  // can keep editing it.
  // Displayed subtype: an empty override stays EMPTY (?? only fills undefined) — so the input can be cleared
  // and retyped.
  const effSubtype = (skill: string, orig?: string): string | undefined =>
    rec.subtypeOverrides?.[skillKey(skill, orig)] ?? orig;
  // Owned-map keys use the ORIGINAL subtype — a rename only changes the display, so two granted instances
  // renamed to the SAME text (fő + másodfegyver → the same weapon category) stay distinct instead of one
  // swallowing the other. A purchase (or a variant's `parent`) may still address an instance by its DISPLAY
  // name — a specialised GENERAL grant stores the display — so resolve that back to the stable original.
  const origOf = (skill: string, sub?: string): string | undefined => {
    if (!sub) return undefined;
    if (owned[skillKey(skill, sub)]) return sub; // already a stable original
    const ov = rec.subtypeOverrides;
    if (ov) {
      if (ov[skill] === sub) return undefined; // specialised general grant → the bare-skill instance
      const pfx = skill + "|";
      for (const k of Object.keys(ov)) if (k.startsWith(pfx) && ov[k] === sub) return k.slice(pfx.length);
    }
    return sub;
  };

  const applyEffect = (e: Effect, source: string, level: number) => {
    switch (e.kind) {
      case "grantSkill": {
        const key = skillKey(e.skill, e.subtype);
        const cur = owned[key];
        if (!cur || cur.fok < e.level) owned[key] = { skill: e.skill, subtype: effSubtype(e.skill, e.subtype), fok: e.level, percent: 0, origSubtype: e.subtype };
        grantedFokOf[key] = Math.max(grantedFokOf[key] ?? 0, e.level);
        break;
      }
      case "grantSkillPercent": {
        const key = skillKey(e.skill, e.subtype);
        const cur = owned[key];
        owned[key] = { skill: e.skill, subtype: effSubtype(e.skill, e.subtype), fok: 0, percent: (cur ? cur.percent : 0) + e.percent, origSubtype: e.subtype };
        break;
      }
      case "teachingDiscount":
        discounts.push({ skill: e.skill, subtype: e.subtype, category: e.category, allSkills: e.allSkills, uptoLevel: e.uptoLevel });
        break;
      case "skillCostMultiplier":
        costMultipliers.push({ skill: e.skill, category: e.category, allSkills: e.allSkills, factor: e.factor });
        break;
      case "forbidSkill":
        skillBans.push({ skill: e.skill, category: e.category, source });
        break;
      case "maxSkillFok":
        fokCaps.push({ skill: e.skill, category: e.category, fok: e.fok });
        break;
      case "poolAccess":
        poolExists[e.pool] = true;
        break;
      case "grantPoolPoints":
        poolExists[e.pool] = true;
        poolMax[e.pool] += e.amount;
        addProv(e.pool, source, e.amount);
        break;
      case "grantPoolFromStat":
        poolExists[e.pool] = true;
        poolMax[e.pool] += effective[e.stat]; // effective, so a granted +stat raises the pool too
        addProv(e.pool, `${source} (${e.stat})`, effective[e.stat]);
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
      case "derivedPerLevel":
        staticDerivedPerLevel.push({ target: e.target, amount: e.amount, fromLevel: level });
        break;
      case "restriction":
        diag("info", `Megkötés: ${e.text}`, level);
        break;
      case "grantSkillChoice": {
        // A placeholder branch the player resolves (fő/másodfegyver). Reuses the subtype-override mechanism.
        // Keyed by the stable label; the override only sets the display.
        const eff = effSubtype(e.skill, e.label);
        const key = skillKey(e.skill, e.label);
        const cur = owned[key];
        if (!cur || cur.fok < e.level) owned[key] = { skill: e.skill, subtype: eff, fok: e.level, percent: 0, origSubtype: e.label, placeholder: !eff || eff === e.label };
        grantedFokOf[key] = Math.max(grantedFokOf[key] ?? 0, e.level);
        break;
      }
      case "allowSkill":
        allowedSkills.push({ skill: e.skill, subtype: e.subtype });
        break;
      case "removeSkill":
        // Drop a base-granted instance (a subclass that doesn't get it). Applied after the base grants.
        // Keys are original-stable, so a renamed grant is removable by its original subtype directly.
        delete owned[skillKey(e.skill, e.subtype)];
        break;
      case "classCostDelta": // consumed at class-activation time (adjusts the class KAP cost)
      case "note":
        break;
    }
  };

  // Resolved attribute requirements for an instance: player-chosen (open branches) → the branch category's
  // own attrs (Fegyverhasználat: ranged = Ügy+Érz) → the skill default.
  const branchSegAttrs = (skill: string, seg?: string): Stat[] | undefined =>
    seg ? db.skills[skill]?.branch?.[0]?.options?.find((o) => o.name === seg)?.attrs : undefined;
  // A specific weapon (Fegyverhasználat fok 3+) may name the weapon directly; find the category listing it
  // as a child so its attributes still resolve.
  const branchChildCat = (skill: string, seg?: string): string | undefined =>
    seg ? db.skills[skill]?.branch?.[0]?.options?.find((o) => o.children?.includes(seg))?.name : undefined;
  const instAttrs = (skill: string, subtype?: string, parent?: string, chosen?: Stat[]): Stat[] => {
    if (chosen && chosen.length) return chosen;
    const seg = parent ?? subtype;
    return branchSegAttrs(skill, seg) ?? branchSegAttrs(skill, branchChildCat(skill, seg)) ?? db.skills[skill]?.attrs ?? [];
  };
  // Player-chosen attribute requirements (Művészetek), keyed by instance (branch by variantId, else skill+subtype).
  const attrChoiceFor = (skill: string, subtype?: string, variantId?: string): Stat[] | undefined =>
    rec.skillAttrChoices?.find((c) => (variantId != null ? c.variantId === variantId : c.variantId == null && c.skill === skill && (c.subtype ?? "") === (subtype ?? "")))?.attrs as Stat[] | undefined;

  const maxFok = (skill: string): number => {
    let m = 0;
    Object.keys(owned).forEach((k) => {
      const o = owned[k];
      if (o.skill === skill && o.fok > m) m = o.fok;
    });
    return m;
  };

  // Spell-gating requirement check, INSTANCE-aware: a single owned instance must satisfy the subtype
  // (e.g. Tapasztalati mágia "bárd" — subtype-less reqs match any instance), the fok, AND — for fok-3+
  // Pszi disciplines (req.path) — that same instance's committed tudat/test path. An instance that
  // hasn't committed yet doesn't unlock path-gated disciplines (the path-choice warning nags for it).
  const reqMet = (req: { skill: string; subtype?: string; fok: number; path?: string }): boolean => {
    for (const k of Object.keys(owned)) {
      const o = owned[k];
      if (o.skill !== req.skill || o.fok < req.fok) continue;
      if (req.subtype != null && o.subtype !== req.subtype) continue;
      if (req.path != null) {
        const chosen = rec.pathChoices?.find((c) =>
          o.variantId != null ? c.variantId === o.variantId : c.variantId == null && c.skill === o.skill && (c.subtype ?? "") === ((o.origSubtype ?? o.subtype) ?? "")
        );
        if (chosen?.value !== req.path) continue;
      }
      return true;
    }
    return false;
  };

  // ── 4. Per-level fold ── only the character's ACTUAL levels: a grant gated to a later level (atLevel >
  // current level) must NOT apply yet — it activates when the character reaches that level.
  const N = Math.max(rec.levels.length, 1);

  // Snapshot of skills owned purely from grants at level 1 (the floor the level-up UI can't go below).
  let grantedSkillsSnapshot: { skill: string; subtype?: string; origSubtype?: string; fok: number; percent: number }[] = [];
  // Owned skills at the START of EACH level (grants + every PRIOR level's purchases). Editing level L can't
  // reduce a skill below floorSnapshots[L-1] — you can't un-learn what earlier levels already locked in.
  const floorSnapshots: (typeof grantedSkillsSnapshot)[] = [];
  // Non-variant skill purchases that raise nothing (to ≤ inherited fok) — phantom no-ops to be auto-pruned.
  // `idx` = position within the level's skillPurchases: the prune must target exactly this entry — two
  // same-key purchases can coexist (subtype renamed onto a twin), and only the no-op one may be dropped.
  const redundantPurchases: { level: number; idx: number; skill: string; subtype?: string }[] = [];
  // Skills that already received their one-time fok-4 attribute bonus (so it applies exactly once).
  const fok4Bonused = new Set<string>();
  const fok4StatOfSkill: Record<string, Set<string>> = {}; // per skill: stats already +1'd (repeat = warning)

  for (let L = 1; L <= N; L++) {
    perLevelEffects.filter((p) => p.level === L).forEach((p) => applyEffect(p.effect, p.source, L));
    const floorSnap = Object.keys(owned).map((k) => ({ ...owned[k] }));
    floorSnapshots[L - 1] = floorSnap;
    if (L === 1) grantedSkillsSnapshot = floorSnap;
    cumulativeBgCost += bgCostAtLevel[L] || 0;
    // Level 1 only folds the starting Kp (= Intelligencia) into the shared KAP pool; later level-ups
    // get the flat 50 − backgrounds. The Int pool funds skills or HM/Mana/Pszi/Kegy/Tulajdonság.
    const income = BASE_KAP_PER_LEVEL + (L === 1 ? effective.Intelligencia : 0) - cumulativeBgCost; // effective Int (grants count)
    kapBalance += income;
    kapIncomeByLevel.push(income);

    const lvlRec = getLevelRecord(rec, L);

    if (lvlRec) {
      for (const a of lvlRec.allocations) {
        if (a.target === "Kp") continue; // skills draw KAP directly now — Kp allocations are obsolete
        if (a.target === "HM") continue; // HM cost is derived from assignments minus granted HM (below)
        const spend = a.points * KAP_RATE[a.target];
        kapBalance -= spend;
        ledgerCosts[`${L}:alloc:${a.target}`] = spend;
        const allocBefore = a.target === "Fp" ? fpGains : poolMax[a.target];
        ledgerDelta[`${L}:alloc:${a.target}`] = { before: allocBefore, after: allocBefore + a.points };
        if (a.target === "Fp") fpGains += a.points;
        else {
          if (!poolExists[a.target]) diag("warn", `${a.target} vásárlása megfelelő háttér nélkül (${L}. szint).`, L);
          poolMax[a.target] += a.points;
        }
      }

      // Attribute buys (and other stat increases) apply BEFORE skill purchases, so the boosted stats lower
      // the unmet-attribute penalty on skills bought this level. (fok-4 bonuses are applied after, below.)
      for (const si of lvlRec.statIncreases) {
        const statBefore = effective[si.stat];
        effective[si.stat] += si.amount;
        ledgerDelta[`${L}:stat:${si.stat}:${si.source}`] = { before: statBefore, after: statBefore + si.amount };
        addProv(si.stat as string, `${si.source} L${L}`, si.amount);
        if (si.source === "kap") {
          const c = si.amount * ATTR_KAP_COST;
          kapBalance -= c;
          ledgerCosts[`${L}:stat:${si.stat}:${si.source}`] = c;
        }
        // Book: level-up raises may not exceed the racial maximum (Adottság lifts it, absolute cap 20).
        const raceCap = race ? Math.min(20, race.statLimits[si.stat] + (rec.adottsag?.[si.stat] ?? 0)) : 20;
        if (effective[si.stat] > raceCap)
          diag("warn", `${si.stat}: a faji maximum (${raceCap}) fölé nőtt (${effective[si.stat]}).`, L);
      }

      for (let spIdx = 0; spIdx < lvlRec.skillPurchases.length; spIdx++) {
        const sp = lvlRec.skillPurchases[spIdx];
        const def = db.skills[sp.skill];
        if (!def) {
          diag("warn", `Ismeretlen képzettség: ${sp.skill}`, L);
          continue;
        }
        // Prerequisites only apply to what the player BUYS above the class/race-granted fok — granted skill
        // levels come without prereqs (book: class packages bypass the requirement lists).
        const grantedFok = sp.id != null ? 0 : grantedFokOf[skillKey(sp.skill, origOf(sp.skill, sp.subtype))] ?? 0;
        if (sp.to > grantedFok) {
          for (const r of def.hardReq) {
            if (maxFok(r.skill) < sp.to)
              diag("warn", `${sp.skill} ${sp.to}. fok: erős előfeltétel «${r.skill}» legalább ${sp.to}. fok.`, L);
          }
          for (const r of def.softReq) {
            if (maxFok(r.skill) < sp.to - 1)
              diag("warn", `${sp.skill} ${sp.to}. fok: gyenge előfeltétel «${r.skill}» legalább ${sp.to - 1}. fok.`, L);
          }
        }
        // A user-added branch (sp.id) is keyed by its id so it forms its own instance and never collides
        // with the general trunk or another branch — even before the player has typed a distinct subtype.
        // A purchase stores the instance's STABLE subtype (the granted original, or the display for a
        // specialised general grant) — origOf maps it onto the grant's original-keyed instance, so
        // renaming/clearing after a raise doesn't split the instance or reset the input.
        const hasOverride = sp.id == null && rec.subtypeOverrides?.[skillKey(sp.skill, sp.subtype)] != null;
        const effSub = sp.id == null ? effSubtype(sp.skill, sp.subtype) : sp.subtype;
        const key = sp.id != null ? `var:${sp.id}` : skillKey(sp.skill, origOf(sp.skill, sp.subtype));
        const cur = owned[key];
        const isPct = def.cost === "percentage";
        // A two-tier specific (Fegyverhasználat weapon) inherits its parent CATEGORY's fok as its floor;
        // otherwise `from` is whatever is already owned unless explicitly given.
        const parentFok = sp.parent != null ? owned[skillKey(sp.skill, origOf(sp.skill, sp.parent))]?.fok ?? 0 : undefined;
        const from = sp.from != null ? sp.from : parentFok != null ? parentFok : cur ? (isPct ? cur.percent : cur.fok) : 0;
        // Forced branching: a category node (Fegyverhasználat) may not exceed `branchAbove` — you must branch
        // to a concrete weapon for higher foks.
        const lvl0 = def.branch?.[0];
        if (lvl0?.branchAbove != null && sp.parent == null && lvl0.options?.some((o) => o.name === effSub) && sp.to > lvl0.branchAbove)
          diag("warn", `${sp.skill} (${effSub}): a kategória legfeljebb ${lvl0.branchAbove}. fok — a magasabb fokhoz konkrét fegyverre kell ágazni.`, L);
        // A non-variant purchase that doesn't raise the fok is a phantom (e.g. an earlier level now reaches
        // it) — flag it for pruning and SKIP it: applying it would wrongly LOWER the skill to its stale
        // target (raise L1 to 5 while L2 still says "to 4" → fok must stay 5 until the prune removes it).
        if (sp.id == null && sp.to <= from) {
          redundantPurchases.push({ level: L, idx: spIdx, skill: sp.skill, subtype: sp.subtype });
          continue;
        }
        const rAttrs = instAttrs(sp.skill, effSub, sp.parent, attrChoiceFor(sp.skill, sp.subtype, sp.id));
        const tUpto = sp.teachingUpto != null ? sp.teachingUpto : teachingUptoFor(discounts, def, effSub);
        const cost = skillKpCost(def, from, sp.to, tUpto, effective, rAttrs);
        // School cost penalty (e.g. Barbár: Szociális/Alvilági/Tudományos ×1.5 Kp).
        let mult = 1;
        for (const m of costMultipliers) if (m.allSkills || m.skill === sp.skill || (m.category != null && m.category === def.category)) mult = Math.max(mult, m.factor);
        const kp = mult === 1 ? cost.kp : Math.ceil(cost.kp * mult);
        kapBalance -= kp; // 1 Kp = 1 KAP, drawn directly from the shared pool
        // Accumulate — two same-key ops in one level (e.g. raw + renamed purchase resolving to one
        // instance) must not under-report the spend; the delta keeps the first `before`, last `after`.
        ledgerCosts[`${L}:skill:${key}`] = (ledgerCosts[`${L}:skill:${key}`] ?? 0) + kp;
        const prevDelta = ledgerDelta[`${L}:skill:${key}`];
        ledgerDelta[`${L}:skill:${key}`] = { before: prevDelta?.before ?? from, after: sp.to };
        if (cost.note) diag("info", cost.note, L);
        // Carry forward the granted subtype's stable key: raising a granted-subtyped skill must keep its
        // origSubtype, else it looks self-specialised (a spurious "unspecialise" ✕ that corrupts on click).
        // A purchase that itself resolves an override keeps the original as origSubtype for the same reason.
        const common = { skill: sp.skill, subtype: effSub, parent: sp.parent, attrs: rAttrs, origSubtype: cur?.origSubtype ?? (hasOverride ? sp.subtype : undefined), variantId: sp.id };
        owned[key] = isPct ? { ...common, fok: 0, percent: sp.to } : { ...common, fok: sp.to, percent: 0 };
      }
    }

    // NOTE: the fok-4 and path scans run OUTSIDE the lvlRec guard — they're grant-driven (a level-gated
    // grant can push an instance to fok 4 on a level with no ledger record).
    {
      // Fok-4 bonus: a fok-based skill with attribute requirements grants +1 to one of its attributes the
      // first level it reaches fok 4 (by purchase OR grant — e.g. a wizard's granted Pszi 4). Single-attr
      // skills auto-target it; multi-attr use the player's stored choice (rec.fok4Bonuses, matched per
      // INSTANCE). Applied after this level's purchases so it lowers the cost of skills priced at later
      // levels. Once per instance via `fok4Bonused`; an instance dropped below fok 4 isn't seen here, so its
      // bonus disappears (no phantom +1).
      for (const k of Object.keys(owned)) {
        const o = owned[k];
        const def = db.skills[o.skill];
        const rAttrs = o.attrs ?? instAttrs(o.skill, o.subtype, o.parent);
        if (!def || def.cost === "percentage" || rAttrs.length === 0 || o.fok < 4 || fok4Bonused.has(k)) continue;
        fok4Bonused.add(k);
        const idSub = o.origSubtype ?? o.subtype; // stable identity — survives renaming a granted subtype
        const choice = rAttrs.length === 1
          ? rAttrs[0]
          : rec.fok4Bonuses?.find((b) => (o.variantId != null ? b.variantId === o.variantId : b.variantId == null && b.skill === o.skill && (b.subtype ?? "") === (idSub ?? "")))?.stat;
        if (choice) {
          // Book: relearning the same skill may not raise the SAME attribute again — warn (not blocked).
          const used = fok4StatOfSkill[o.skill] ?? (fok4StatOfSkill[o.skill] = new Set());
          if (used.has(choice)) diag("warn", `${o.skill}: a 4. fok +1 nem növelheti újra ugyanazt a tulajdonságot (${choice}).`, L);
          used.add(choice);
          effective[choice] += 1;
          addProv(choice as string, `skillFok4 (${o.skill}) L${L}`, 1);
        } else {
          diag("info", `${o.skill}: 4. fok elérve — válassz +1 tulajdonságot (${rAttrs.join(", ")}).`, L);
        }
      }

      // Path trigger (Pszi tudat/test at fok 3): once an instance reaches the trigger fok it MUST commit to
      // a path; warn until the player has chosen (rec.pathChoices). The magic layer consumes the choice.
      for (const k of Object.keys(owned)) {
        const o = owned[k];
        const trig = db.skills[o.skill]?.fokTriggers?.find((t) => t.kind === "path");
        if (!trig || trig.kind !== "path" || o.fok < trig.atFok) continue;
        const chosen = rec.pathChoices?.find((c) => (o.variantId != null ? c.variantId === o.variantId : c.variantId == null && c.skill === o.skill && (c.subtype ?? "") === ((o.origSubtype ?? o.subtype) ?? "")) && c.trigger === trig.label);
        if (!chosen) diag("warn", `${o.skill}${o.subtype ? ` (${o.subtype})` : ""}: ${trig.atFok}. fokon választani kell (${trig.label}: ${trig.options.join(" / ")}).`, L);
      }
    }

    // Skill-driven + static per-level resources (apply at the current fok / from their level).
    // Collected into a flat delta list, then applied with plain for-loops (no functions-in-loop).
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
        } else if (e.kind === "derivedPerLevel") derivedBonus[e.target] += e.amount;
      }
    }
    resourceGrantsByLevel[L - 1] = levelGrants;
    for (const s of staticPerLevel) {
      if (s.fromLevel <= L) resourceDeltas.push({ resource: s.resource, amount: s.amount });
    }
    for (const s of staticDerivedPerLevel) {
      if (s.fromLevel <= L) derivedBonus[s.target] += s.amount;
    }
    for (const d of resourceDeltas) {
      if (d.resource === "HM") hmFromSkills += d.amount;
      else if (d.resource === "Fp") fpGains += d.amount;
      else if (d.resource === "Kp") kapBalance += d.amount; // skill-granted Kp = bonus KAP
      else if (d.resource === "Mana" || d.resource === "Psi" || d.resource === "Kegy") {
        if (poolExists[d.resource as Pool]) poolMax[d.resource as Pool] += d.amount;
      }
    }

    // HM is allocated from two distinct sources (each targeting KÉ/TÉ/VÉ/CÉ):
    //  • grantedHmAssignments — the free HM skills grant (distributed in the Szintlépési nyereségek panel),
    //  • hmAssignments        — extra HM bought with KAP in the Pontvásárlás panel, paid per point.
    let grantedAssigned = 0;
    if (lvlRec?.grantedHmAssignments) {
      lvlRec.grantedHmAssignments.forEach((h) => {
        const before = combatAcc[h.channel];
        combatAcc[h.channel] += h.amount;
        ledgerDelta[`${L}:ghm:${h.channel}`] = { before, after: before + h.amount };
        addProv(h.channel, `HM (kapott) L${L}`, h.amount);
        ledgerCosts[`${L}:ghm:${h.channel}`] = 0; // free
        grantedAssigned += h.amount;
      });
    }
    if (lvlRec) {
      lvlRec.hmAssignments.forEach((h) => {
        const before = combatAcc[h.channel];
        combatAcc[h.channel] += h.amount;
        ledgerDelta[`${L}:hm:${h.channel}`] = { before, after: before + h.amount };
        addProv(h.channel, `HM (vett) L${L}`, h.amount);
        ledgerCosts[`${L}:hm:${h.channel}`] = h.amount * KAP_RATE.HM;
        kapBalance -= h.amount * KAP_RATE.HM;
      });
    }
    hmGrantedByLevel.push(hmFromSkills);
    if (grantedAssigned > hmFromSkills)
      diag("warn", `${L}. szint: ${grantedAssigned - hmFromSkills} HM túl van osztva (csak ${hmFromSkills} kapott HM jár).`, L);
    else if (grantedAssigned < hmFromSkills)
      diag("info", `${L}. szint: ${hmFromSkills - grantedAssigned} kapott HM még nincs elosztva (KÉ/TÉ/VÉ/CÉ).`, L);
    if (kapBalance < 0) diag("warn", `${L}. szint: a KAP egyenleg negatív (${kapBalance}).`, L);

    kapBalanceByLevel.push(kapBalance);
  }

  // Ban / fok-cap warnings: the chosen school forbids or caps certain skills (e.g. Bárd subclasses banning
  // skills, Lar-Dor capping Nekromancia/Démonológia at fok 2). Not hard-blocked — surfaced so the player notices.
  for (const k of Object.keys(owned)) {
    const o = owned[k];
    const def = db.skills[o.skill];
    if (!def) continue;
    if (skillBans.some((b) => b.skill === o.skill || (b.category != null && b.category === def.category)))
      diag("warn", `${o.skill}${o.subtype ? ` (${o.subtype})` : ""}: a választott iskola/rend nem engedi ezt a képzettséget.`);
    const cap = fokCaps.find((c) => (c.skill === o.skill || (c.category != null && c.category === def.category)) && o.fok > c.fok);
    if (cap) diag("warn", `${o.skill}${o.subtype ? ` (${o.subtype})` : ""}: a választott iskola szerint legfeljebb ${cap.fok}. fok (jelenleg ${o.fok}).`);
  }

  // ── 5. KM adjustments ──────────────────────────────────────────────────────
  rec.kmAdjustments.forEach((adj) => {
    adj.effects.forEach((e) => applyEffect(e, `KM: ${adj.reason}`, adj.atLevel || N));
  });

  // ── 6/7. Effective stats, combat, derived, vitals, spells ──────────────────
  const combat: Record<CombatChannel, number> = {
    KÉ: effective.Érzékelés + effective.Gyorsaság + combatAcc.KÉ,
    TÉ: effective.Erő + effective.Gyorsaság + effective.Ügyesség + combatAcc.TÉ,
    VÉ: effective.Ügyesség + effective.Gyorsaság + VE_BASE + combatAcc.VÉ,
    CÉ: effective.Ügyesség + effective.Érzékelés + combatAcc.CÉ,
  };

  const epMax = effective.Egészség + derivedBonus.Ép;
  const fpMax = effective.Állóképesség + effective.Akaraterő + fpGains + derivedBonus.Fp; // book: Fp = Áll + Akaraterő

  // Re-base alloc/HM deltas onto the actual affected number (base + buys), not the bought-only running
  // total — so the ledger shows e.g. Fp 26 → 29 and KÉ 64 → 68, not 0 → N. (Exact for the single-level
  // creator; for multi-level it pins to the final total.)
  for (const k of Object.keys(ledgerDelta)) {
    const [, kind, ...rest] = k.split(":");
    if (kind !== "alloc" && kind !== "hm") continue;
    const id = rest.join(":");
    const finalVal = kind === "hm" ? combat[id as CombatChannel] : id === "Fp" ? fpMax : poolMax[id as Pool];
    if (finalVal == null) continue;
    const d = ledgerDelta[k];
    ledgerDelta[k] = { before: finalVal - (d.after - d.before), after: finalVal };
  }
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

  // Enumerated-subtype skills (Tapasztalati mágia, Pszi, Vallásismeret…) require a chosen subtype.
  for (const k of Object.keys(owned)) {
    const o = owned[k];
    if ((db.skills[o.skill]?.subtypes?.length ?? 0) > 0 && !o.subtype)
      diag("warn", `«${o.skill}» — kötelező altípust választani.`);
  }

  const skills: OwnedSkill[] = Object.keys(owned).map((k) => {
    const o = owned[k];
    const def = db.skills[o.skill];
    const isPct = def && def.cost === "percentage";
    const rAttrs = o.attrs ?? instAttrs(o.skill, o.subtype, o.parent, attrChoiceFor(o.skill, o.origSubtype ?? o.subtype, o.variantId));
    // Unmet governing attributes for the NEXT fok: a governing attr below 10 + (fok+1) means raising the
    // skill one more level is penalised. (No next level at fok 5.) Surfaced yellow in the UI.
    const need = 11 + o.fok;
    const unmetAttrs = !def || isPct || o.fok >= 5 ? [] : rAttrs.filter((a) => effective[a] < need);
    // Percentage skills: untrained base % = the governing attribute; trained % adds on top, total capped
    // at attribute + 100 (book ch.16). `percent` stays the trained part; `checkMod` is the usable total.
    const pctBase = isPct && rAttrs.length ? effective[rAttrs[0]] : 0;
    return {
      skill: o.skill,
      subtype: o.subtype,
      origSubtype: o.origSubtype,
      variantId: o.variantId,
      parent: o.parent ?? branchChildCat(o.skill, o.subtype),
      attrs: rAttrs,
      unmetAttrs,
      placeholder: o.placeholder,
      fok: o.fok,
      percent: isPct ? o.percent : undefined,
      checkMod: isPct ? pctBase + Math.min(o.percent ?? 0, 100) : FOK_CHECK_MOD[o.fok] || 0,
      difficulty: def ? def.difficulty : "?",
    };
  });
  skills.sort((a, b) => a.skill.localeCompare(b.skill, "hu"));

  // Duplicate instances (re-learned variants sharing the trunk's / each other's subtype text) are ALLOWED —
  // they stay independent rows — but almost certainly a naming slip, so surface a warning per duplicate group.
  {
    const seenInst: Record<string, { skill: string; subtype?: string; n: number }> = {};
    for (const s of skills) {
      const k = skillKey(s.skill, s.subtype);
      (seenInst[k] ?? (seenInst[k] = { skill: s.skill, subtype: s.subtype, n: 0 })).n++;
    }
    for (const k of Object.keys(seenInst)) {
      const d = seenInst[k];
      if (d.n > 1)
        diag(
          "warn",
          d.subtype
            ? `«${d.skill} (${d.subtype})» ${d.n}× szerepel ugyanazzal az altípussal — megengedett, de érdemes megkülönböztetni az ágakat.`
            : `«${d.skill}» ${d.n}× szerepel altípus nélkül — adj az ágaknak megkülönböztető altípust.`
        );
    }
  }

  const spells = db.spells.map((sp) => {
    // Pool existence is the background proxy: a list is castable only if its pool (Mana/Pszi/Kegy)
    // exists — itself gated by Mágikus fogékonyság / Pszi érzékenység / Kegyelt háttér.
    const hasPool = vitals[sp.pool].max > 0;
    // ALL requirements must hold (e.g. Magasmágia 3 AND the category's governing skill 3).
    const known = hasPool && sp.requires.every(reqMet);
    const cur = vitals[sp.pool].current;
    return { name: sp.name, school: sp.school, category: sp.category, pool: sp.pool, cost: sp.cost, castingTime: sp.castingTime, known, castableNow: known && cur >= sp.cost };
  });

  // Skills owned purely from grants (the level-up floor) + the teacher level available per skill.
  const snapToFloor = (snap: typeof grantedSkillsSnapshot) =>
    snap.map((o) => ({ skill: o.skill, subtype: o.subtype, origSubtype: o.origSubtype, fok: o.fok, percent: o.percent || undefined }));
  const grantedSkills = snapToFloor(grantedSkillsSnapshot);
  const floorByLevel = floorSnapshots.map(snapToFloor);
  const teaching: Record<string, number> = {};
  Object.keys(db.skills).forEach((name) => {
    const u = teachingUptoFor(discounts, db.skills[name]);
    if (u > 0) teaching[name] = u;
  });

  return {
    level: rec.levels.length || 1,
    baseStats: base,
    effectiveStats: effective,
    combat,
    derived,
    vitals,
    pools: { kapIncomeByLevel, kapBalanceByLevel, hmGrantedByLevel, magic },
    skills,
    allowedSkills,
    grantedSkills,
    floorByLevel,
    redundantPurchases,
    teaching,
    teachingDiscounts: discounts,
    costMultipliers,
    spells,
    tags: Object.keys(tags),
    grantedBackgrounds: Object.keys(grantedBg),
    money,
    inventory,
    provenance,
    diagnostics,
    ledgerCosts,
    ledgerDelta,
    resourceGrantsByLevel,
  };
}
