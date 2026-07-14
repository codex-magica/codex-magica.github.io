// Shared derived helpers — pure lookups over the ctx (owned map, record choices, skill DB). Used by
// the effect interpreter, the per-level fold and the finalize phase.

import { Stat } from "../../model/attributes";
import { findInstanceChoice, skillKey } from "../../model/common";
import { DeriveCtx } from "./ctx";

// A granted subtype may be renamed by the player (placeholders like "anyanyelv"/"szülőföld").
// The override is keyed by the ORIGINAL granted subtype (stable); `origSubtype` is kept so the UI
// can keep editing it.
// Displayed subtype: an empty override stays EMPTY (?? only fills undefined) — so the input can be cleared
// and retyped.
export const effSubtype = (ctx: DeriveCtx, skill: string, orig?: string): string | undefined =>
  ctx.rec.subtypeOverrides?.[skillKey(skill, orig)] ?? orig;

// Owned-map keys use the ORIGINAL subtype — a rename only changes the display, so two granted instances
// renamed to the SAME text (fő + másodfegyver → the same weapon category) stay distinct instead of one
// swallowing the other. A purchase (or a variant's `parent`) may still address an instance by its DISPLAY
// name — a specialised GENERAL grant stores the display — so resolve that back to the stable original.
export const origOf = (ctx: DeriveCtx, skill: string, sub?: string): string | undefined => {
  if (!sub) return undefined;
  if (ctx.owned[skillKey(skill, sub)]) return sub; // already a stable original
  const ov = ctx.rec.subtypeOverrides;
  if (ov) {
    if (ov[skill] === sub) return undefined; // specialised general grant → the bare-skill instance
    const pfx = skill + "|";
    for (const k of Object.keys(ov)) if (k.startsWith(pfx) && ov[k] === sub) return k.slice(pfx.length);
  }
  return sub;
};

// Resolved attribute requirements for an instance: player-chosen (open branches) → the branch category's
// own attrs (Fegyverhasználat: ranged = Ügy+Érz) → the skill default.
export const branchSegAttrs = (ctx: DeriveCtx, skill: string, seg?: string): Stat[] | undefined =>
  seg ? ctx.db.skills[skill]?.branch?.[0]?.options?.find((o) => o.name === seg)?.attrs : undefined;

// A specific weapon (Fegyverhasználat fok 3+) may name the weapon directly; find the category listing it
// as a child so its attributes still resolve.
export const branchChildCat = (ctx: DeriveCtx, skill: string, seg?: string): string | undefined =>
  seg ? ctx.db.skills[skill]?.branch?.[0]?.options?.find((o) => o.children?.includes(seg))?.name : undefined;

export const instAttrs = (ctx: DeriveCtx, skill: string, subtype?: string, parent?: string, chosen?: Stat[]): Stat[] => {
  if (chosen && chosen.length) return chosen;
  const seg = parent ?? subtype;
  return branchSegAttrs(ctx, skill, seg) ?? branchSegAttrs(ctx, skill, branchChildCat(ctx, skill, seg)) ?? ctx.db.skills[skill]?.attrs ?? [];
};

// Player-chosen attribute requirements (Művészetek), keyed by instance (SkillInstanceRef).
export const attrChoiceFor = (ctx: DeriveCtx, skill: string, subtype?: string, variantId?: string): Stat[] | undefined =>
  findInstanceChoice(ctx.rec.skillAttrChoices, { skill, subtype, variantId })?.attrs as Stat[] | undefined;

export const maxFok = (ctx: DeriveCtx, skill: string): number => {
  let m = 0;
  Object.keys(ctx.owned).forEach((k) => {
    const o = ctx.owned[k];
    if (o.skill === skill && o.fok > m) m = o.fok;
  });
  return m;
};

// Spell-gating requirement check, INSTANCE-aware: a single owned instance must satisfy the subtype
// (e.g. Tapasztalati mágia "bárd" — subtype-less reqs match any instance), the fok, AND — for fok-3+
// Pszi disciplines (req.path) — that same instance's committed tudat/test path. An instance that
// hasn't committed yet doesn't unlock path-gated disciplines (the path-choice warning nags for it).
export const reqMet = (ctx: DeriveCtx, req: { skill: string; subtype?: string; fok: number; path?: string }): boolean => {
  for (const k of Object.keys(ctx.owned)) {
    const o = ctx.owned[k];
    if (o.skill !== req.skill || o.fok < req.fok) continue;
    if (req.subtype != null && o.subtype !== req.subtype) continue;
    if (req.path != null) {
      const chosen = findInstanceChoice(ctx.rec.pathChoices, { skill: o.skill, subtype: o.origSubtype ?? o.subtype, variantId: o.variantId });
      if (chosen?.value !== req.path) continue;
    }
    return true;
  }
  return false;
};
