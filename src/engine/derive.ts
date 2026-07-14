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
    adj.effects.forEach((e) => applyEffect(ctx, e, `KM: ${adj.reason}`, adj.atLevel || N, true));
  });

  return finalize(ctx);
}
