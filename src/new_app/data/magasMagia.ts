// Magasmágia (high magic) — scraped from book chapter 29 (not in the old app). Assembled from the
// six per-category parts, in book order. A few `###` headings in the source are examples / captions
// / empty grouping stubs rather than spells — filtered out here so the tables stay clean.
import { magas1 } from "./magas1";
import { magas2 } from "./magas2";
import { magas3 } from "./magas3";
import { magas4 } from "./magas4";
import { magas5 } from "./magas5";
import { magas6 } from "./magas6";

const NOISE = new Set([
  "Példa",
  "Példák",
  "Hatótáv",
  "Az újratöltés gyakorisága és az aktiválás módja",
  "Asztrális operációk",
]);

export const MagasMagiaValues = [...magas1, ...magas2, ...magas3, ...magas4, ...magas5, ...magas6].filter(
  (s) => !NOISE.has(s.name) && Array.isArray(s.description) && s.description.length > 0
);
