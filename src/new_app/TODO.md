# TODO — unresolved data/model items

## "Either/or" granted-skill choices (need a proper player-choice mechanism)

The book grants some starting skills as a choice ("X **vagy** Y N. fok"). The model has no
"grant one of N" mechanism yet, so these are currently hard-set to one side (editable by the
player after learning). Revisit once a proper choice grant exists.

| Class / subclass | Book | Currently set to | Notes |
|---|---|---|---|
| **Paplovag** (base) | Fegyverhasználat **vagy** Pajzshasználat 2. fok | Fegyverhasználat (`weaponChoice("másodfegyver",2)`) | See also Darton note below |
| **Fejvadász** / Felderítő | Vadonjárás (adott terep) **vagy** Szakma (Építészet) 2. fok | Vadonjárás (adott terep) | |
| **Paplovag** / Dreina | Szakma (Birtokigazgatás **vagy** Pénzügyek) 2. fok | `gs("Szakma",2,"birtokigazgatás vagy pénzügyek")` (editable placeholder) | Both subtypes taught via `teachSub` |
| **Bárd** / Vándorló dalnok | Fegyverhasználat (íjak **vagy** számszeríjak) 2. fok | íjak | editable |

## Follow-ups

- **Darton-paplovag** carries `remove("Pajzshasználat")` (book: Darton may not take Pajzshasználat).
  Now that the base grants Fegyverhasználat instead of Pajzshasználat, this `remove` is a no-op —
  clean it up (or keep as a guard) when the base choice becomes a real choice.
- A generic **"grant one of these skills" (choice) effect** would resolve every row above cleanly —
  like `weaponChoice`/`grantSkillChoice` but selecting among enumerated skill+subtype options.

## Softer / editorial (verify vs. book intent)

- `Fegyverhasználat (egykezes kardok)` is used as an editorial default on classes where the book
  leaves the starting weapon open (Tolvaj types, Bárd base/Aszisz, Boszorkánymester options, etc.).
- Background **point-levels** aren't modeled on grants (e.g. Harcművész / Udvari kardművész should get
  the **1-pont** Vagyon; data grants generic `bg("Vagyon")`).
- Boszorkánymester base teaches `Nyelvtudás`; the book's "Nyelvismeret" is a typo for it — OK as-is.

---

# Book proofread (2026-07) — unfixed items, chapters 01–25

Findings from the OCR proofread pass that could **not** be fixed confidently. Everything below
needs either the printed book / scan, or a rules-content decision. (All confident fixes were
applied directly to `src/book/*.md`.) Quotes are greppable in the chapter files.

## Content gaps — re-OCR / check the scan

- ~~**ch16 Harci láz**: fokok 2–5 missing~~ — **RESOLVED**: restored from app data (skillsText.ts
  lvl_2–lvl_5, legacy source had the full text).
- ~~**ch16 Pajzsfal**~~ — **settled against the scans (p140–143)**: the print has NO Pajzsfal entry
  either; Sün's "Hasonló, mint a pajzsfal" reference dangles in the original book. Nothing to restore.
- ~~**ch16 Lopódzás** Módosítók~~ — **RESOLVED, print-verified (p156)**: 6 rows — Teljes sötétség
  +20% / Kőpadló +10% / Vastag szőnyeg +20% / Száraz avar -20% / Kavicságy -10% / Nyikorgó fapadló
  -20%. Book md + skillsText.ts updated to the print values.
- ~~**ch11 Darton advantage I.**~~ — **RESOLVED from scan (p97)**: "…szférájából választják
  fohászaikat, valamint hozzáférhetnek uruk egyedi szakrális mágiájához is."
- ~~**ch21 pages 208–209**~~ — **RESOLVED from scans**: both are full-page illustration plates (the
  numbered weapon reference drawings 1–58 for FEGYVERLEÍRÁSOK); no body text lost. Comment added to md.
- ~~**ch22 `Alvás**` footnote~~ — **RESOLVED from scan (p218–219)**: both the missing ** footnote and
  the *-footnote's dropped continuation restored in md + magicRules6.ts.
- ~~**ch19 herb table**~~ — **RESOLVED from scan (p185)**: first ailment is **Aranyér**; the Sebek
  block restored (separate "kelés, gyulladás" and "tályog" rows, corrected "égés" remedies,
  fekély "bürök"). Note: print itself has the typo "útilapuvél"; md keeps "útilapulevél".
- ~~**ch03**: "Harcművész iskolák" empty list~~ — **RESOLVED**: confirmed intentionally empty
  in the book; nothing to restore.
- **ch01**: `## A harc` heading sits over a section about what roleplaying is — heading likely wrong.
- **ch10**: chapter body opens "Papjai gondolkodásukban…" with no antecedent (lead-in sentence lost);
  orphan footnote asterisk "útján.*" with no footnote text.
- **ch12 / ch13**: both chapters open with sentence fragments (OCR lost the lead-ins).
- **ch13**: stray bold lines "**Pszi (pyarroni), 5 SEK**" between two tables — "5 SEK" is gibberish
  (layout remnant?).

## Stat / rules contradictions — need a rules call or the book

- ~~**ch02**: udvari ork Asztrál 16 vs 17~~ — **RESOLVED** by rules call: prose (**16**) is
  correct; race-maximum table fixed 17 → 16.
- ~~**ch04** amazon Fegyverismeret~~ — **RESOLVED from scan (p38)**: print says **2. fok** (empty
  Kp cell is correct); md fixed.
- ~~**ch05** lovag Kp 14 vs 27~~ — both genuinely printed (scan p47); **closed as not important**
  (sample-character sheet only, not modeled in the app). Weapon table matches print exactly
  and is internally consistent: lovagkard 3k6+2 = 3k6 (ch21 table, weapons.ts) + the character's
  +2 Erő damage bonus (fvn 1k6+2 shows the same +2) — the old "possibly 2k6+2" suspicion was wrong.
- ~~**ch06** items~~ — **RESOLVED from scans (p54/55/58)**: the 2. fok rows are bare in print
  ("Fegyverhasználat" / "2 Fegyverhasználat" — the weapon lists were OCR-duplicated; md fixed);
  Árnyékjáték is fine (10 láb radius, center up to 20 láb — no conflict); darkness bonus is
  **+30%** (sign fixed); "Kép-pont" is a misread of **"Kegy-pont"** (fixed).
- ~~**ch07** zsebes Csomózás~~ — **settled from scan (p61–62)**: print really has base tolvaj 2. fok
  and zsebes package 1. fok — the subclass table simply differs; as printed.
- **ch08** — **checked from scans (p68/69)**: the bare "Művészetek 3. fok" row is genuine print
  (a second, free-choice Művészetek — no qualifier lost); the weapon column labelled "tőr" in md is
  actually **"fvn"** in print (fixed — the CÉ 32 belongs to fegyver nélkül, mystery solved).
  Still open (not scanned): "Nyelvtudás (anyanyelv)" vs sample "(szülőföld)".
- ~~**ch09** Shien-ka-to table~~ — **settled from scan (p77)**: table matches print cell-for-cell;
  the Stílus column is evidently NOT a plain fvn+components sum (TÉ and VÉ don't sum either), so
  KÉ 41 is not an error; the empty cells are genuinely blank in print. "(ireit)" remains opaque
  (lore term).
- ~~**ch13** Vándorvillám~~ — **RESOLVED from scan (p115)**: print says "Mana pont: **+15**"; md fixed.
- ~~**ch14** lángtőr Időigény~~ — **settled from scan (p118)**: the cell is genuinely blank in the
  print (printing gap in the book); all other lángtőr values verified correct.
- **ch15** — **checked from scans (p124–126, 129)**: (a) varázslóbot point II ("bónuszok nélkül")
  vs point III ("teljesen a normális módon") — genuine print conflict, RULES CALL still open (not
  modeled in the app; lean: II, the more restrictive non-duplicated wording). (b) ~~Pszi (kyr) 4 vs
  3 fok~~ — **RESOLVED** by rules call (2026-07-13): the tables win — base varázsló Pszi (kyr)
  **4. fok**; the Lar-Dor swap grants Godoni Örökség **3. fok** (prose says so twice). Only the
  prose's misstatement of the base fok was errata'd ("nem a Pszi (kyr) képzettség ~~3.~~ **4.**
  fokát…"). classes.ts already implemented exactly this.
- ~~**ch16** Kultúra/Nyelvtudás rows + worked examples~~ — **RESOLVED from scans (p132/134)**:
  both rows are the standard I-progression **1/3/8/15/25** (md fixed); the examples read
  "**2+2=4** plusz Kp" and "1 és **¾** évébe" (md + skillsRules.ts fixed). Earlier: Vallásismeret
  entry III→**II**; "Képzetlen fegyverforgatás" ref → 174. oldal; Hamisítás "nem" → "kívánók".
- ~~**ch17** items~~ — **RESOLVED from scans (p168/174/175)**: it's "az **1s-nél** hosszabb
  varázslatokhoz" (1 szegmens, not 15 — fixed); the footnote appears once in print (duplicate
  blockquote removed); 00-ás szabály "+3 Ép" **confirmed** as printed.
- ~~**ch18 vs ch19** Ép-regen onset~~ — **RESOLVED** by rules call (2026-07-13): **ch18 wins**
  (1 nap pihenés / egyébként 5 nap — the chapter that owns the rule, and ch19 explicitly defers to
  it); ch19's sentence errata'd from "3 nap / egy hét" to match. (Scans: p178 vs p184 — the
  contradiction was genuine print.)
- ~~**ch18** zuhanás~~ — **RESOLVED from scan (p178)**: print says MGT-je "**Fp** veszteségként
  hozzáadódik" (md's "Ép" was OCR) — paragraph is internally consistent now. Still open (not
  scanned): the 5-max-Ép vs "gyengébb" 8-max-Ép example.
- **ch21**: ~~csatacsillag appears in both the Csatabárdok table and the Buzogányok table~~ —
  **RESOLVED** (per the description heading "Egykezes (7), kétkezes csatabárd (8), csatacsákány (9)"):
  the Csatabárdok-table row (2k6+2) was a misnamed **kétkezes csatabárd**; renamed in book + app.
  Consequently the 4. kategória "Nehéz csatabárd" row (5k6), which also said "kétkezes csatabárd",
  was renamed to **nehéz csatabárd** (matching its own section heading). **Print checked (p198)**:
  the book genuinely prints "csatacsillag" twice (2k6+2 and 2k6) and "kétkezes csatabárd" under the
  "Nehéz csatabárd" heading — our renames stand as deliberate errata of a printed typo.
- ~~**ch22** table-vs-body cost conflicts~~ — **checked against the scans (pages 221/222/227/234;
  all genuine print, md faithful) and CLOSED by rules call (2026-07-13): the body text wins**, the
  app data already sided with it — Fájdalomcsillapítás Ψp 1 ("1 E-je 1 Fp"), Ébredés Ψp 1,
  Felfedés Ψp 3 + meditáció "Lásd a leírást!". No changes; the summary-table variants (1/2 Fp,
  1/E, 3/E + 1 szegmens) are treated as the erroneous side, left as printed. (Ébredés ME resolved
  separately: print table says **Mentális** — md fixed, data already had it.)
  - ~~Levitáció + Tetszhalál 4. vs 5. szint~~ — **settled**: table + psi.ts both say 4. szint;
    the print (p232) really does place them amid the 5. fokú entries — sloppy print layout, book
    left as printed. (Their psi.ts durations aligned to the print table: 1 kör / 1 óra; Kitérés
    "E kör" → "1 kör" likewise.)
  - ~~Kyr Metódus self-reference~~ — **settled from scan (p217)**: the print really says
    "a Pyarroni Módszer és a Kyr Metódus azon darabjait" — original wording, left as printed
    (mirror in magicRules6.ts likewise).
- **ch24**: ~~Tanulmány "Varázslás ideje: 3 perc" (entry) vs "Min. 3 perc" (table)~~ — **RESOLVED**
  (entry set to "Min. 3 perc", matching table + app data). ~~"a Mágia dalával" ghost reference~~ —
  **settled from scan (p243)**: the phrase is genuinely printed (original book quirk); the same
  scan showed md's "nem csak zene alapú mágia típusú" should be "nem **Dalmágia** típusú" (fixed;
  bardMagic.ts already had the correct reading).
- **ch25**: ~~Noir szférák~~ — **RESOLVED from scan (p259)**: cell reads "**Élet, Lélek vagy
  Lélek, Halál**" (two alternative szféra-pairs; md + magicRules2.ts fixed). ~~Rettegés "VÉ: +10"~~
  — **settled from scan (p267)**: the plus sign is unmistakable in print; genuinely printed inside
  the negative-modifier list, left as printed. ~~Kígyótűz "1k6 Ep"~~ — **RESOLVED against the scan
  (p280)**: print says "1k6 **Fp**-t sebez"; md fixed, prayers.ts already had Fp. Also print-verified
  here: Kegy-pont sentence restored ("csakis az istenük vallásában való elmélyedéstől, hitüknek
  erejétől függ" — md + magicRules2.ts fixed); Patkányidézés "30+5k10" confirmed. Resolved meanwhile:
  Csapás table 3 szegmens/E → **1 szegmens/E** (entry + app data agree); Patkányidézés →
  **30+5k10** (rules call, both sources corrected).

## Cross-chapter terminology — decide once, normalize book-wide

- ~~**Rejtőzés vs Rejtőzködés**~~ — **RESOLVED**: normalized to **Rejtőzködés** book-wide
  (22 occurrences; app model name is the canon) and in witchMagic.ts prose; ch08's stale
  "Kínokozás" → Kínzás and "Hátbaszúrás" → Orvtámadás also normalized.
- **Closing quote mark**: most chapters use „…" (straight closer); ch06 uses „…” — pick one.
- **"P.sz." vs "P. sz."** spacing (ch12 vs ch13 and others).
- **Weapon-name spacing** table-vs-prose: hosszú kard/Hosszúkard, rövid kard/Rövidkard,
  Nehéz kardok/Nehézkardok, fejvadászkard/Fejvadász kard, kardművész vért/kardművészvért (ch21).
- **Abbreviation suffixes**: "Fp-ik / Kp-i / Fp-jeik" mixed across ch04/06/11.
- **"Tapasztalati mágia (tűzvarázsló)" vs "(tűzmágia)"** within ch14.
- Class-name capitalization (Harcos/harcos, Lovag/lovag, Fejvadász/fejvadász) — book itself is
  inconsistent; normalize or accept.

## Lore / canon flags — verify against canon sources

- **ch08**: Alborne called "istennő" ("a két istennő papjává"); Kai-Syah (2×) vs Kai-Ahnar (1×).
- **ch12 vs ch13**: ch12 narrates a P.sz. **3694** battle as past history; ch13 sets the present at
  P.sz. **3692**. Also Livina vs Livinia city spelling.
- **ch15**: founders "Ouirin Dan Jeir" and "Rielon Ouar" — "Ou" is a classic OCR misread of "Qu";
  also "Ewiramtó" (Ewiram-tó?).
- ~~**ch02**: "Doar-don-hegység"~~ — already reads "Doardon-hegység" in the current text; done.
- **ch03**: "Feketerendek" (plural among singular order names); "Isten Kardja" listed both as
  Lovagrend and as Domvik-paplovag rend; exotic names (Marico con Rabora, Maida Saluquas, Stella
  Prosylens, Ascens Morga) unverifiable.
- **ch05**: sidebar comment `<!-- sidebar: Ynevel -->` garbled; **ch22**: sidebar comment
  "The Kyr Method" is in English.

## Unreconstructable garbles — need the scan (greppable quotes)

Scan-checked 2026-07-13 (see sections above): the ch16 examples, ch17 "1s-nél", ch19 herb rows,
ch22 footnotes and ch25 Kegy-pont sentence were all recovered from the page images.

- ch04: "árnyótócsákon átszökkenve", "a később-választottja", "ugyanolyan fekete forgatnak"
  (noun lost after "fekete").
- ch05: "indítottak a vér jogán" (object missing); the Ranagol-rend broken parentheticals
  ("bosszú beteljesítése egy szakadár dartonita vezéren"; "akkor egy teljes holdhónapig és …
  imát intézni").
- ch06: "meridiánok közvetlen alárendeltjeik" hierarchy sentence; "sérült formálható emberanyagot".
- ch07: "magukat is ők valónak tettetve".
- ch08: "Száz, hogy esik egy útszéli fogadóban…" (opening garbled).
- ch10: "Belső szerkezetének vázát a kvalitheia-besorolás…" (verb structure broken);
  "kvalitheitáival" vs "kvalitheia".
- ~~ch16 Pusztítás, Szexuális kultúra 5. fok~~ — **RESOLVED** from app data ("Csakis 3-as, vagy
  nagyobb méretkategóriájú fegyverekre vehető fel. Az egyéb kategória tagjaival…"; "olyan szinten
  **őrjítik** meg szeretőit").
- ch21: egykezes kardok intro last sentence (no predicate). Settled: "pénz- és hamisítóverés
  jogát" is as printed in the book; the emrelin sentence is verbatim in the legacy app data —
  both are original phrasing.
- ch22: Kitérés sentence **settled** (legacy data identical — original phrasing);
  ~~Érzékélesítés~~ — **RESOLVED** from app data ("1 E = 10%, illetve **-1** módosító").
- ~~ch25: Kegy-pont maximum sentence~~ — **RESOLVED from scan (p257)** ("csakis az istenük
  vallásában való elmélyedéstől, hitüknek erejétől függ, amit…"); Szélkeltés was already fixed
  from app data earlier.

---

# Book ↔ app data cross-check (2026-07) — remaining items

The confident fixes from the 32-agent data audit were applied and committed ("a lot of book vs
data cross check"). App conventions settled along the way: spell ranges stay in **meters**; plain
`N/E` cost suffixes stay **omitted** (E-scaling by cost multiplication is implied — keep only
informative notations like `1/2 E`, `12 - 4/E`, `6/hasonmás`, formulas, `Lásd a leírást!`).
What's left:

## Undecided — data and book conflict, need the print or a rules call

- ~~**witchMagic / Csábítás** ±5 E~~ — **RESOLVED** by rules call (2026-07-13): it's **+5 E**;
  book corrected, data was already right.
- ~~**skillsText / Fegyverhasználat** csatacsillag category~~ — **RESOLVED**: the finding had it
  backwards; the data's table was right (Buzogányok incl. csatacsillag under 3. méretkategória,
  matching ch21). Book ch16's mangled lines fixed instead: 3. kat "- Csatacsillag stb." →
  "- Buzogányok (tollas buzogány, harci kalapács, csatacsillag stb.)", 4. kat Buzogányok →
  "(kétkezes buzogány, láncos buzogány stb.)" — verify against the print.

Resolved by rules call (2026-07-13, applied to book + data): **Távoli tűz** = "közöljön" (book
corrected); **Patkányidézés** = "30+5k10" (both sources corrected, plus the entry's OCR junk:
parancsainak, Tharr, 2k10); **Sárkány tánca** duration = "1 kör" (data set to the table value;
book entry still says "Lásd a leírást!" — book-internal conflict only); **Emlékbevésés/
Emlékfelidézés** split stays as-is (both castingTime "1 kör").

## Optional polish — equivalent values, book is just more explicit (1 kör = 10 s)

- ~~prayers/witch dual time forms~~ — **RESOLVED**: adopted the book's explicit forms
  ("30 kör (5 perc)" etc.) for Vízlélegzés, Vérgyűjtés, Vérzés, Szélkeltés, Istenalak, Jósálom.

## Structural / coverage

- ~~magicRules6.ts missing "Godoni Örökség" prose~~ — **RESOLVED**: copied the ch22 section in as
  `sub["Godoni örökség"]` (compendium keys sub-rules by the psi type name). Still open: the
  mirrored Kyr self-reference sentence ("a Pyarroni Módszer és a Kyr Metódus azon darabjait") —
  see the ch22 bullet above; if the book gets corrected, mirror it in magicRules6.ts.
- **skillsText.ts descriptions are partially app-adapted**, not verbatim this-book text
  (Akrobatika is fully rewritten and requires Erő+Ügyesség where the book header says only
  Ügyesség). Decide per skill whether to track this book edition or keep the adapted text; don't
  blindly "correct" stats against the book.
- The audit was a single pass with cheap agents over the legacy-migrated files (bard/witch/
  warlock/fire/prayers/psi/skills/weapons/armor); entries reported as matching were not
  double-checked. A second sweep of the long description texts could catch stragglers.
  (magas*, poisons, and the magicRules prose files verified clean — transcribed from this edition.)
