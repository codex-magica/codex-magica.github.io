// The user's app-level house-rules preference (one user usually plays one rules set). Drives the
// STANDALONE compendium's displayed variant and pre-fills the house-rules toggle for NEW characters.
// It never affects existing records — each character keeps the flag it was created with, and the
// in-character compendium follows the character, not this preference.

import { useState } from "react";
import { HouseRules } from "../model/character";

const KEY = "magus.houseRules.v1";

export function getRulesPreference(): HouseRules {
  try {
    return (JSON.parse(localStorage.getItem(KEY) || "{}") ?? {}) as HouseRules;
  } catch {
    return {};
  }
}

export function setRulesPreference(pref: HouseRules): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(pref));
  } catch {
    // storage unavailable (private mode) — the toggle still works for the session via state
  }
}

export function useRulesPreference(): [HouseRules, (pref: HouseRules) => void] {
  const [pref, setPref] = useState<HouseRules>(getRulesPreference);
  const set = (next: HouseRules) => {
    setRulesPreference(next);
    setPref(next);
  };
  return [pref, set];
}
