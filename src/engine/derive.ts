// derive(db, record) — the pure derivation engine. Replays the character's identity + background
// choices + per-level ledger into a full sheet, with provenance and (non-blocking) diagnostics.
// Nothing here throws on bad input; problems surface as diagnostics so the builder can warn.
//
// The phases live in ./derive/ and share a mutable DeriveCtx (see ./derive/ctx.ts):
//   1.   baseStats    — base attributes (point-buy vs racial caps, Adottság, age mods)
//   2/3. activations  — background/race/class activations flattened into per-level effects
//   4.   levelFold    — the per-level fold (allocations, stat buys, skill purchases, HM, resources)
//   5.   KM adjustments (below) — late applyEffect passes after the fold
//   6/7. finalize     — combat/derived/vitals/magic, skills projection, spells, the return object

import { RulesDB } from "../model/rulesDb";
import { CharacterRecord } from "../model/character";
import { MGT_STATS, armorByName, resolveArmorUse, resolveShieldUse, shieldByName } from "../model/armorUse";
import { DerivedCharacter } from "./types";
import { createCtx } from "./derive/ctx";
import { applyBaseStats } from "./derive/baseStats";
import { runActivations } from "./derive/activations";
import { applyEffect } from "./derive/effects";
import { runLevelFold } from "./derive/levelFold";
import { finalize } from "./derive/finalize";

export function derive(db: RulesDB, rec: CharacterRecord): DerivedCharacter {
  const ctx = createCtx(db, rec);
  applyBaseStats(ctx);
  runActivations(ctx);
  runLevelFold(ctx);

  // ── 5. KM adjustments ──────────────────────────────────────────────────────
  const N = Math.max(rec.levels.length, 1);
  rec.kmAdjustments.forEach((adj) => {
    const reason = adj.reason?.trim(); // optional-chained: an imported/legacy adjustment may lack the field
    // Provenance label for stat/pool grants and diagnostics — keeps the KM attribution visible in the
    // breakdown modals (and distinct from StatInfoModal's "Egyéb" residual row).
    const source = reason ? `KM: ${reason}` : "KM";
    // Tag grants instead group under this heading on the abilities panel, where a missing or
    // self-referential reason ("KM") would render a clumsy "KM" / "KM: KM" heading — those go under "Egyéb".
    const tagSource = reason && reason.toUpperCase() !== "KM" ? `KM: ${reason}` : "Egyéb";
    const at = adj.atLevel ?? 1; // default level 1 — consistent with the panel filter and kmKapAtLevel
    adj.effects.forEach((e) => applyEffect(ctx, e, e.kind === "tag" ? tagSource : source, at, true));
  });

  // ── 6. Vértezet + állapotok (play-state) ───────────────────────────────────
  // Last, so they see the finished character — and BEFORE finalize, so a moved attribute cascades
  // into the combat values, MME/AME, Ép/Fp max and Mozgás the same way any other stat bonus does.
  // The snapshot lets finalize re-base the BUILD ledger onto pre-play-state totals: "KÉ 64 → 68" is
  // what you bought, and must not shift because you donned a vért or are currently dazed.
  const conditions = (rec.conditions ?? []).filter((c) => c.active !== false && c.effects?.length);
  // A doffed piece (armorActive/shieldActive === false) stays on the sheet but applies nothing —
  // same toggle semantics as putting a weapon down.
  const armor = rec.armor && rec.armorActive !== false ? armorByName(rec.armor) : undefined;
  const shield = rec.shield && rec.shieldActive !== false ? shieldByName(rec.shield) : undefined;
  if (conditions.length > 0 || armor || shield) {
    ctx.preConditions = { effective: { ...ctx.effective }, combatAcc: { ...ctx.combatAcc }, derivedBonus: { ...ctx.derivedBonus } };
  }
  // Armor/shield first (a garment, not a condition): the effective MGT (book ch.21, relieved by
  // Vértviselet/Pajzshasználat) drags Ügyesség/Gyorsaság/Állóképesség down — but never below 5 —
  // and the shield's VÉ applies only when trained (Pajzshasználat 1+).
  const skillViews = Object.values(ctx.owned);
  const applyMgt = (mgt: number, source: string) => {
    for (const stat of MGT_STATS) {
      const amount = -Math.min(Math.max(ctx.effective[stat] - 5, 0), -mgt);
      if (amount < 0) applyEffect(ctx, { kind: "statBonus", stat, amount }, source, N, true);
    }
  };
  if (armor) applyMgt(resolveArmorUse(armor, skillViews).mgt, `Vért: ${armor.name}`);
  if (shield) {
    const use = resolveShieldUse(shield, skillViews);
    applyMgt(use.mgt, `Pajzs: ${shield.name}`);
    if (use.ve > 0) applyEffect(ctx, { kind: "combatBonus", channel: "VÉ", amount: use.ve }, `Pajzs: ${shield.name}`, N, true);
  }
  // A condition can be parked (active === false): it stays on the sheet — a psi shield you re-raise
  // every fight is worth keeping around — but contributes nothing until it's switched back on.
  conditions.forEach((c) => {
    c.effects!.forEach((e) => applyEffect(ctx, e, `Állapot: ${c.name}`, N, true));
  });

  return finalize(ctx);
}
