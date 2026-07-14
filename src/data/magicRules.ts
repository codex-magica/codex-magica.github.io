// Rules prose (chapter-level + per-subcategory), extracted from the book's magic chapters and rendered
// as Markdown in a modal from the compendium. Keyed by the school's DISPLAY name (compNames[1..7]) and,
// within `sub`, by the exact table-block title used in the compendium.
import { magicRules1 } from "./magicRules1";
import { magicRules2 } from "./magicRules2";
import { magicRules3 } from "./magicRules3";
import { magicRules4 } from "./magicRules4";
import { magicRules5 } from "./magicRules5";
import { magicRules6 } from "./magicRules6";
import { magicRules7 } from "./magicRules7";

export interface SchoolRules {
  rules?: string; // whole-chapter rules
  sub?: Record<string, string>; // subcategory (block title) → its rules
}

export const MAGIC_RULES: Record<string, SchoolRules> = {
  "Bárdmágia": magicRules1,
  "Szakrális Mágia": magicRules2,
  "Boszorkánymágia": magicRules3,
  "Boszorkánymesteri mágia": magicRules4,
  "Tűzmágia": magicRules5,
  "Pszi": magicRules6,
  "Magasmágia": magicRules7,
};

// The modal shows the title separately, so drop a leading heading (any level) when its text matches
// the title — avoids a duplicate heading at the top of the modal body.
export const stripTitleHeading = (md: string, title: string): string => {
  const m = md.match(/^\s*#{1,6}\s+(.+?)\s*\n+/);
  if (m && m[1].trim().toLowerCase() === title.trim().toLowerCase()) return md.slice(m[0].length);
  return md;
};
