// ── 2/3. Collect background activations + flatten grants by level ───────────

import { Effect } from "../../model/effects";
import { resolveChoiceGrants } from "../../model/choices";
import { DeriveCtx } from "./ctx";

export function runActivations(ctx: DeriveCtx): void {
  const { db, rec, race, diag } = ctx;

  const pushActivation = (
    name: string | null,
    atLevel: number,
    cost: number,
    grants: { atLevel?: number; effect: Effect }[],
    source: string
  ) => {
    if (name) {
      if (ctx.seenBg[name]) return;
      ctx.seenBg[name] = true;
    }
    if (cost) ctx.bgCostAtLevel[atLevel] = (ctx.bgCostAtLevel[atLevel] || 0) + cost;
    grants.forEach((g) => {
      const lvl = g.atLevel != null ? g.atLevel : atLevel;
      if (g.effect.kind === "grantBackground") {
        const bgName = g.effect.background;
        const def = db.backgrounds[bgName];
        if (!def) {
          diag("warn", `Ismeretlen háttér: ${bgName}`, lvl);
          return;
        }
        ctx.grantedBg[bgName] = true;
        // A granted background with a level range uses the player's chosen level (free); else its min/cost.
        const bgLevel = rec.grantedBgLevels?.[bgName] ?? (def.costRange ? def.costRange[0] : def.cost);
        const grants = def.grantsFor ? def.grantsFor({ level: bgLevel }) : def.grants;
        pushActivation(bgName, lvl, 0, grants, `${bgName} (kapott)`);
      } else {
        ctx.perLevelEffects.push({ effect: g.effect, source, level: lvl });
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
    if (klass.sexRestriction && rec.identity.sex && rec.identity.sex !== klass.sexRestriction)
      diag("warn", `${rec.class}: csak ${klass.sexRestriction === "female" ? "nő" : "férfi"} lehet.`);
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
  if (ctx.adottsagPoints > 0) ctx.bgCostAtLevel[1] = (ctx.bgCostAtLevel[1] || 0) + ctx.adottsagPoints;
}
