// Per-spell governing-skill fok overrides for Magasmágia (default elsewhere = 3), keyed by the
// GOVERNING SKILL so a same-named spell in a different category (e.g. "Aura" in Elemi vs Asztrál)
// gets the right tier. From the book; line references point into the Magasmágia chapter source.
export const FOK_BY_GOV: Record<string, Record<string, number>> = {
  // Elemi mágia / Formázás (governing skill: Őselemi mágia).
  "Őselemi mágia": {
    "Szabad Elemi Forma": 5,
    "Szabad Elemi Formák": 5,
    "Szabad Elemi Formák kapcsolása": 5,
  },
  // Természetes Anyagok Mágiája (governing skill: Alkímia). No per-spell fok override.
  // The only candidate was Transzmutáció (anyagcsoport 2→4), but that's a CONDITIONAL casting mode
  // (which material group you convert), not a whole-spell minimum — so it stays at the base Alkímia 3.
  "Alkímia": {},
  // Asztrál-/Mentálmágia (governing skill: Lélektan).
  "Lélektan": {
    // Asztrálmágia — Formázások above Érintés require avatott Lélektan (4. fok); see line 880.
    "Hullám": 4,
    "Szőnyeg, Fal": 4,
    // Aura requires 5. fok Lélektan (asztrális sík mastery); see line 903.
    "Aura": 5,
  },
  "Rúnamágia": {
    // Végrehajtó varázskör — book: "bírnak a Rúnamágia képzettség 4. fokával"; see line 1476.
    "Végrehajtó varázskör": 4,
    // Kisugárzó varázsjel — book: "Az efféle varázsjel elkészítéséhez 5. fokú Rúnamágia képzettség szükséges"; see line 1579.
    "Kisugárzó varázsjel": 5,
  },
  // Nekromancia / Démonológia. No per-spell fok override — verified against the book.
  // Each section states only TWO fok rules: the base (Nekromancia 3 / Démonológia 3, lines 1714 / 2036)
  // and a single CONDITIONAL fok-4 (lines 1730 / 2048): casting Asztrál/Mentál mosaics ONTO normally-immune
  // undead/demons needs fok 4 + a varázstiszta gem — a casting-mode capability, not a per-spell minimum.
  // There is NO fok-5 statement anywhere in either section, so all these spells stay at the base fok 3.
  "Nekromancia": {},
  "Démonológia": {},
  // Idő-/Térmágia (governing skill: Számtan/Mértan).
  "Számtan/Mértan": {
    "Időugrás": 4,
    "Öregedés": 5,
    "Lassítás": 5,
    "Gyorsítás": 5,
  },
};
