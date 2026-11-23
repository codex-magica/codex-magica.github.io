// ── 6/7. Effective stats, combat, derived, vitals, spells ──────────────────
// Final math over the folded accumulators, plus the skills projection, ledger re-basing and the
// assembly of the returned DerivedCharacter.

import { VitalKey } from "../../model/character";
import { CombatChannel, Pool } from "../../model/effects";
import { skillKey } from "../../model/common";
import { fixedSubtypesOf } from "../../model/skills";
import { COMBAT_INFO } from "../../model/combatInfo";
import { armorByName, resolveArmorUse, resolveShieldUse, shieldByName } from "../../model/armorUse";
import { FOK_CHECK_MOD, MAGIC_DEFENSE_OFFSET } from "../constants";
import { DerivedCharacter, OwnedSkill } from "../types";
import { DeriveCtx, POOLS, SkillSnapshot } from "./ctx";
import { attrChoiceFor, branchChildCat, instAttrs, reqMet } from "./helpers";

export function finalize(ctx: DeriveCtx): DerivedCharacter {
  const { db, rec, diag, owned, effective, derivedBonus, poolMax, poolExists, ledger } = ctx;

  // Formulas come from COMBAT_INFO (attribute components + fixed base) — the same data that renders
  // the sheet's clickable breakdown, so the two can't drift apart.
  const combatFrom = (ch: CombatChannel): number =>
    COMBAT_INFO[ch].stats.reduce((a, s) => a + effective[s], 0) + (COMBAT_INFO[ch].base?.value ?? 0) + ctx.combatAcc[ch];
  const combat: Record<CombatChannel, number> = {
    KÉ: combatFrom("KÉ"),
    TÉ: combatFrom("TÉ"),
    VÉ: combatFrom("VÉ"),
    CÉ: combatFrom("CÉ"),
  };

  const epMax = effective.Egészség + derivedBonus.Ép;
  const fpMax = effective.Állóképesség + effective.Akaraterő + ctx.fpGains + derivedBonus.Fp; // book: Fp = Áll + Akaraterő

  // Re-base alloc/HM deltas onto the actual affected number (base + buys), not the bought-only running
  // total — so the ledger shows e.g. Fp 26 → 29 and KÉ 64 → 68, not 0 → N. (Exact for the single-level
  // creator; for multi-level it pins to the final total.)
  // The ledger is the BUILD record, so it re-bases onto pre-condition totals: being dazed right now
  // must not rewrite the KÉ you bought three levels ago.
  const pre = ctx.preConditions;
  const ledgerCombat: Record<CombatChannel, number> = pre
    ? {
        KÉ: COMBAT_INFO.KÉ.stats.reduce((a, s) => a + pre.effective[s], 0) + (COMBAT_INFO.KÉ.base?.value ?? 0) + pre.combatAcc.KÉ,
        TÉ: COMBAT_INFO.TÉ.stats.reduce((a, s) => a + pre.effective[s], 0) + (COMBAT_INFO.TÉ.base?.value ?? 0) + pre.combatAcc.TÉ,
        VÉ: COMBAT_INFO.VÉ.stats.reduce((a, s) => a + pre.effective[s], 0) + (COMBAT_INFO.VÉ.base?.value ?? 0) + pre.combatAcc.VÉ,
        CÉ: COMBAT_INFO.CÉ.stats.reduce((a, s) => a + pre.effective[s], 0) + (COMBAT_INFO.CÉ.base?.value ?? 0) + pre.combatAcc.CÉ,
      }
    : combat;
  const ledgerFp = pre ? pre.effective.Állóképesség + pre.effective.Akaraterő + ctx.fpGains + pre.derivedBonus.Fp : fpMax;
  for (const en of ledger) {
    if (en.kind !== "alloc" && en.kind !== "hm") continue;
    const finalVal = en.kind === "hm" ? ledgerCombat[en.id as CombatChannel] : en.id === "Fp" ? ledgerFp : poolMax[en.id as Pool];
    if (finalVal == null) continue;
    const step = en.after - en.before;
    en.before = finalVal - step;
    en.after = finalVal;
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
    if ((fixedSubtypesOf(db.skills[o.skill])?.length ?? 0) > 0 && !o.subtype)
      diag("warn", `«${o.skill}»: altípust kell választani.`);
  }

  const skills: OwnedSkill[] = Object.keys(owned).map((k) => {
    const o = owned[k];
    const def = db.skills[o.skill];
    const isPct = def && def.cost === "percentage";
    const rAttrs = o.attrs ?? instAttrs(ctx, o.skill, o.subtype, o.parent, attrChoiceFor(ctx, o.skill, o.origSubtype ?? o.subtype, o.variantId));
    // Unmet governing attributes for the NEXT fok: a governing attr below 10 + (fok+1) means raising the
    // skill one more level is penalised. (No next level at fok 5.) Surfaced yellow in the UI.
    // attrsAny (alternative attrs, homebrew Mászás): one qualifying attribute clears the warning.
    const need = 11 + o.fok;
    const below = !def || isPct || o.fok >= 5 ? [] : rAttrs.filter((a) => effective[a] < need);
    const unmetAttrs = def?.attrsAny && below.length < rAttrs.length ? [] : below;
    // Percentage skills: untrained base % = the governing attribute; trained % adds on top, total capped
    // at attribute + 100 (book ch.16). `percent` stays the trained part; `checkMod` is the usable total.
    const pctBase = isPct && rAttrs.length ? effective[rAttrs[0]] : 0;
    return {
      skill: o.skill,
      subtype: o.subtype,
      origSubtype: o.origSubtype,
      variantId: o.variantId,
      parent: o.parent ?? branchChildCat(ctx, o.skill, o.subtype),
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

  // A kegyelt's effective szférák: the player's manual override if set (a Kegyelt + Vallásismeret 3
  // character needs no priesthood), otherwise the deity/rend defaults from the class grants.
  const effectiveSpheres = rec.sacredSpheres != null ? new Set(rec.sacredSpheres) : ctx.spheres;

  // Worn vért / carried pajzs resolved for the panel (their stat/VÉ effects were applied in derive()).
  const wornArmor = rec.armor ? armorByName(rec.armor) : undefined;
  const carriedShield = rec.shield ? shieldByName(rec.shield) : undefined;
  const skillViews = Object.values(owned);
  const armorUse = wornArmor ? { ...resolveArmorUse(wornArmor, skillViews), worn: rec.armorActive !== false } : undefined;
  const shieldUse = carriedShield ? { ...resolveShieldUse(carriedShield, skillViews), worn: rec.shieldActive !== false } : undefined;

  const spells = db.spells.map((sp) => {
    // Pool existence is the background proxy: a list is castable only if its pool (Mana/Pszi/Kegy)
    // exists — itself gated by Mágikus fogékonyság / Pszi érzékenység / Kegyelt háttér.
    const hasPool = vitals[sp.pool].max > 0;
    // ALL requirements must hold (e.g. Magasmágia 3 AND the category's governing skill 3).
    let known = hasPool && sp.requires.every((r) => reqMet(ctx, r));
    // Szakrális sphere-gate (book ch.25): a szférikus fohász — the Kis/Nagy Arkánum, whose `category`
    // IS its `source` — is castable only if it shares at least one sphere with the deity's grants.
    // Általános fohászok (all spheres) and a deity's egyedi prayers (own-deity, gated by the
    // Vallásismeret subtype requirement) are exempt. No spheres granted ⇒ only Általános remains.
    if (known && sp.school === "Szakrális" && (sp.category === "Kis Arkánum" || sp.category === "Nagy Arkánum")) {
      known = !!sp.domains && sp.domains.some((d) => effectiveSpheres.has(d));
    }
    const cur = vitals[sp.pool].current;
    return { name: sp.name, school: sp.school, category: sp.category, pool: sp.pool, cost: sp.cost, castingTime: sp.castingTime, known, castableNow: known && cur >= sp.cost, ...(sp.domains ? { domains: sp.domains } : {}) };
  });

  // Skills owned purely from grants (the level-up floor).
  const snapToFloor = (snap: SkillSnapshot) =>
    snap.map((o) => ({ skill: o.skill, subtype: o.subtype, origSubtype: o.origSubtype, fok: o.fok, percent: o.percent || undefined }));
  const grantedSkills = snapToFloor(ctx.grantedSkillsSnapshot);
  const floorByLevel = ctx.floorSnapshots.map(snapToFloor);

  return {
    level: rec.levels.length || 1,
    baseStats: ctx.base,
    effectiveStats: effective,
    combat,
    derived,
    vitals,
    pools: { kapIncomeByLevel: ctx.kapIncomeByLevel, kapBalanceByLevel: ctx.kapBalanceByLevel, hmGrantedByLevel: ctx.hmGrantedByLevel, magic },
    skills,
    allowedSkills: ctx.allowedSkills,
    grantedSkills,
    floorByLevel,
    redundantPurchases: ctx.redundantPurchases,
    teachingDiscounts: ctx.discounts,
    costMultipliers: ctx.costMultipliers,
    spells,
    tags: ctx.tags,
    spheres: Array.from(effectiveSpheres), // effective (override or default) — drives caption + filter
    sphereDefaults: Array.from(ctx.spheres), // the deity/rend grants — for the editor's "reset to default"
    ...(armorUse ? { armorUse } : {}),
    ...(shieldUse ? { shieldUse } : {}),
    grantedBackgrounds: Object.keys(ctx.grantedBg),
    money: ctx.money,
    inventory: ctx.inventory,
    provenance: ctx.provenance,
    diagnostics: ctx.diagnostics,
    ledger,
    resourceGrantsByLevel: ctx.resourceGrantsByLevel,
  };
}
