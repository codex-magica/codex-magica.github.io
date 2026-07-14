// Rules prose types + helpers for the magic chapters. The per-school prose modules (magicRules1–7)
// are attached to their tabs in the compendium tab registry (ui/compendiumData.ts TABS) — no
// display-name keying; within `sub`, keys are the exact table-block titles used in the compendium.

export interface SchoolRules {
  rules?: string; // whole-chapter rules
  sub?: Record<string, string>; // subcategory (block title) → its rules
}

// The modal shows the title separately, so drop a leading heading (any level) when its text matches
// the title — avoids a duplicate heading at the top of the modal body.
export const stripTitleHeading = (md: string, title: string): string => {
  const m = md.match(/^\s*#{1,6}\s+(.+?)\s*\n+/);
  if (m && m[1].trim().toLowerCase() === title.trim().toLowerCase()) return md.slice(m[0].length);
  return md;
};
