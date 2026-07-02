// Definitions + formula structure for the harcértékek (and magic-defense values) — used by the character
// sheet's clickable Harcértékek panel. Definitions are the book's glossary entries (ch. 01).

import { Stat, Stats } from "./attributes";

export interface CombatValueInfo {
  key: string; // KÉ | TÉ | VÉ | CÉ | MME | AME | Sebzésbónusz
  label: string;
  def: string; // book definition
  stats: Stat[]; // the attribute components of the formula
  base?: { label: string; value: number }; // fixed base term (VÉ: 60)
  residualLabel: string; // the remainder (HM + bonuses) label
}

export const COMBAT_INFO: Record<string, CombatValueInfo> = {
  "KÉ": {
    key: "KÉ",
    label: "Kezdeményező érték",
    def: "Azt mutatja meg, hogy egy adott harci szituációban kinek van nagyobb esélye először cselekedni. Minél nagyobb a KÉ, annál valószínűbb, hogy a karakter elsőként támadhat fegyverrel vagy anélkül. A Kezdeményező érték összetevői: Gyorsaság, Érzékelés. Harcban k10-es Kezdeményező dobás adódik hozzá; akinek a legnagyobb a Kezdeményezése, az cselekedhet először.",
    stats: ["Érzékelés", "Gyorsaság"],
    residualLabel: "HM és bónuszok",
  },
  "TÉ": {
    key: "TÉ",
    label: "Támadó érték",
    def: "A karakter egyik fő harci jellemzője. Azt mutatja meg, hogy valaki milyen jó fegyverforgató, mennyire gyakorlott a harcban — annak is a támadó részében. A TÉ főbb összetevői: Erő, Gyorsaság, Ügyesség, HM, a fegyver Támadó értéke és a fegyveres képzettségekből adódó bónuszok. A Támadó dobás k100-zal történik: ha az eredmény + TÉ eléri az ellenfél VÉ-jét, a támadás sikeres.",
    stats: ["Erő", "Gyorsaság", "Ügyesség"],
    residualLabel: "HM és bónuszok",
  },
  "VÉ": {
    key: "VÉ",
    label: "Védő érték",
    def: "A karakter egyik fő harci jellemzője. Arról árulkodik, hogy a karakter milyen hatékonysággal tudja kivédeni a rázúduló csapásokat, mennyire jó a védekezésben. A VÉ fő összetevői: VÉ alap, Ügyesség, Gyorsaság, HM, a fegyver Védő értéke, valamint a fegyveres képzettségekből eredő bónuszok.",
    stats: ["Ügyesség", "Gyorsaság"],
    base: { label: "VÉ alap", value: 60 },
    residualLabel: "HM és bónuszok",
  },
  "CÉ": {
    key: "CÉ",
    label: "Célzó érték",
    def: "A karakter harcértékének egyik összetevője. Azt fejezi ki, hogy távolsági fegyverekkel (hajító- és lőfegyverekkel) milyen könnyen tud eltalálni valamit — vagy valakit.",
    stats: ["Ügyesség", "Érzékelés"],
    residualLabel: "HM és bónuszok",
  },
  MME: {
    key: "MME",
    label: "Mentális Mágiaellenállás",
    def: "A Mágiaellenállás (ME) egy lénynek azon képessége, hogy ellenálljon a ráirányuló varázslatok hatásainak; értéke azt mutatja meg, mekkora erejű (E) mágikus hatásnak tud ellenállni. A mentális ME a tudatot érő mágia ellen véd — alapja a Tudatalatti Mágiaellenállás (Akaraterő), amit tárgyakból, hitből és szellemi diszciplínákból származó védettségek növelhetnek.",
    stats: ["Akaraterő"],
    residualLabel: "Statikus/egyéb védelem",
  },
  AME: {
    key: "AME",
    label: "Asztrális Mágiaellenállás",
    def: "A Mágiaellenállás (ME) egy lénynek azon képessége, hogy ellenálljon a ráirányuló varázslatok hatásainak; értéke azt mutatja meg, mekkora erejű (E) mágikus hatásnak tud ellenállni. Az asztrális ME az érzelmeket érő mágia ellen véd — alapja a Tudatalatti Mágiaellenállás (Asztrál), amit tárgyakból, hitből és szellemi diszciplínákból származó védettségek növelhetnek.",
    stats: ["Asztrál"],
    residualLabel: "Statikus/egyéb védelem",
  },
  "Sebzésbónusz": {
    key: "Sebzésbónusz",
    label: "Sebzésbónusz",
    def: "A karakter kiemelkedő ereje vagy különleges képzettsége nyomán a fegyveres sebzéséhez hozzáadódó bónusz.",
    stats: [],
    residualLabel: "Bónuszok összege",
  },
};

// The formula parts with substituted values: attribute terms, optional fixed base, then the tracked
// bonus sources from the engine's provenance — HM allocations grouped into one line, every other source
// (race/class combatBonus, e.g. "Faj: Elf" CÉ) itemized by name. Any untracked remainder goes to the
// residual line (MME/AME statikus védelem), so the sum always reconciles with the final value.
export function combatBreakdown(
  info: CombatValueInfo,
  stats: Stats,
  total: number,
  contributions: { source: string; amount: number }[] = []
): { label: string; value: number }[] {
  const parts: { label: string; value: number }[] = info.stats.map((s) => ({ label: s, value: stats[s] }));
  if (info.base) parts.push({ label: info.base.label, value: info.base.value });
  let hm = 0;
  for (const c of contributions) {
    if (c.source.startsWith("HM ")) hm += c.amount; // "HM (vett) L2" / "HM (kapott) L3" → one grouped line
    else parts.push({ label: c.source, value: c.amount });
  }
  if (hm !== 0) parts.push({ label: "HM elosztás", value: hm });
  const residual = total - parts.reduce((a, p) => a + p.value, 0);
  if (residual !== 0 || parts.length === 0) parts.push({ label: info.residualLabel, value: residual });
  return parts;
}
