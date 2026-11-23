// ── 1. Base attributes ─────────────────────────────────────────────────────
// pointBuy may exceed the racial cap: the part up to the cap spends the 135 base budget; the part
// above the cap (≤ 20) is Adottság — each such point costs 1 KAP (a Háttér, reducing per-level KAP).

import { STAT_KEYS } from "../../model/attributes";
import { ATTR_MAX, POINT_BUY_TOTAL } from "../constants";
import { DeriveCtx } from "./ctx";

export function applyBaseStats(ctx: DeriveCtx): void {
  const { rec, race, base, diag } = ctx;
  let baseBudget = 0;
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
      ctx.adottsagPoints += adott;
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
    diag("warn", `Az alappontok összege ${baseBudget}, de ${POINT_BUY_TOTAL} kell (a faji maximumig elosztva).`);
  }

  // Seed the fold's effective stats from the final base, and record the base provenance.
  ctx.effective = { ...base };
  STAT_KEYS.forEach((k) => ctx.addProv(k, "alap", base[k]));
}
