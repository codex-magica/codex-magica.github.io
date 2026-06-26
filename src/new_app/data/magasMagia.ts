// Magasmágia (high magic) — scraped from book chapter 29 (not in the old app). Assembled from the
// six per-category parts (descriptions) plus three table parts (the markdown tables the description
// scrape dropped), merged onto each spell by name. A few `###` headings in the source are examples /
// captions / empty grouping stubs rather than spells — filtered out here.
import { magas1 } from "./magas1";
import { magas2 } from "./magas2";
import { magas3 } from "./magas3";
import { magas4 } from "./magas4";
import { magas5 } from "./magas5";
import { magas6 } from "./magas6";
import { magasTablesA } from "./magasTablesA";
import { magasTablesB } from "./magasTablesB";
import { magasTablesC } from "./magasTablesC";

const NOISE = new Set([
  "Példa",
  "Példák",
  "Hatótáv",
  "Az újratöltés gyakorisága és az aktiválás módja",
  "Asztrális operációk",
]);

// spell name → its table strings ("table:H\tH…\n\nc\tc…")
const tableMap = new Map<string, string[]>();
for (const t of [...magasTablesA, ...magasTablesB, ...magasTablesC]) {
  tableMap.set(t.spell, (tableMap.get(t.spell) || []).concat(t.tables));
}

const base = [...magas1, ...magas2, ...magas3, ...magas4, ...magas5, ...magas6].filter(
  (s) => !NOISE.has(s.name) && Array.isArray(s.description) && s.description.length > 0
);

// Merge each spell's table(s) onto its description by name. Tables keyed to a non-spell heading
// (e.g. the Mentálfonál operations grid, a category overview) have no spell home and are dropped —
// Mentálfonál et al. are concepts/sections, not spells, so they must not appear in the list.
export const MagasMagiaValues = base.map((s) => {
  const t = tableMap.get(s.name);
  return t ? { ...s, description: [...s.description, ...t] } : s;
});
