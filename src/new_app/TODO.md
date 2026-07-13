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
- **ch16 Pajzsfal**: the Sün formation says "Hasonló mint a pajzsfal", but no Pajzsfal entry exists
  — missing from the app data too, so not reconstructable; needs the scan. (The Falkataktika
  half is fine: data agrees it's a paragraph under Tiadlani kettős, not its own entry.)
- ~~**ch16 Lopódzás**: Módosítók list truncated/signs dubious~~ — **RESOLVED**: reconstructed from
  the app data's coherent modifier table as +10% / +20% / -10% / -20% (Kőpadló / Vastag szőnyeg /
  Kavicságy / Száraz avar, nyikorgó fapadló) — verify magnitudes against the print.
- **ch11 Darton-paplovag, advantage I.**: truncated mid-sentence ("…hozzáférhetnek uruk egyedi") —
  rest lost in OCR.
- **ch21**: page comments jump `page 207` → `page 210`; pages 208–209 absent (illustrations?).
- **ch22**: regeneration table row `Alvás**` — the `**` footnote is missing (only `*` exists).
- **ch19 herb table**: first row lists "Benedekfű" as an *ailment* (it's a remedy) — the real
  ailment name was lost; the "Sebek" row appears merged with a lost "Kelés" row.
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
- **ch04**: sample amazon has Fegyverismeret 3. fok with empty Kp cell (base package grants 2. fok).
- **ch05**: lovag "Kp: 14 pont" vs itemized Kp column summing to 27; suspicious weapon table
  (fvn KÉ 31 vs lovagkard KÉ 36; lovagkard Sebzés 3k6+2, possibly 2k6+2).
- **ch06**: Orgyilkos and Felderítő starting-skill tables each have two consecutive rows with the
  *identical* weapon list at 2. and 1. fok; Árnyékjáték Hatótáv 10 vs 20 ynevi láb; Lopódzás/Rejtőzés
  "javítja a sötétség **-30%**-kal" self-contradictory; "Kép-pont: —" unclear label.
- **ch07**: sample zsebes Csomózás 1. fok vs base thief table 2. fok.
- **ch08**: bárd table has bare "Művészetek 3. fok" row (lost qualifier); "Nyelvtudás (anyanyelv)"
  vs sample character "(szülőföld)"; tőr CÉ 32 for a melee dagger.
- **ch09**: Shien-ka-to fegyver table: stílus KÉ 41 vs components 29+10=39; fvn Sebzés cell and
  hosszú bot Időigény cell empty; "(ireit)" opaque term.
- **ch13**: Vándorvillám mozaik "**Mana pont:** -15" — negative cost suspicious.
- **ch14**: lángtőr column missing Időigény value.
- **ch15**: varázslóbot rules II vs III contradict (Ψp/Mp "bónuszok nélkül" vs "teljesen a normális
  módon", near-duplicate sentences); "Pszi (kyr) 4. fok" (starting table) vs "3. fok" (lar-dori text).
- **ch16**: Kultúra/Nyelvtudás rows show nehézség I with IV-like Kp costs; "22-4 plusz Kp" and
  "1 és 4 évébe" garbled numbers in worked examples (skillsRules.ts mirrors the same text, so no
  independent witness). Resolved meanwhile: Vallásismeret entry III→**II** (table + data agree);
  "Képzetlen fegyverforgatás" ref fixed to **174.** oldal (ch17 heading sits on page 174);
  Hamisítás "nem" → "**kívánók**" (app data preserved the original word).
- **ch17**: "a 15-nél hosszabb varázslatokhoz" — unit missing (15 szegmens?); duplicated footnote
  blockquote after the reload table; 00-ás szabály "+3 Ép" unverified.
- **ch18 vs ch19**: Ép-regeneration onset — ch18 "1 nap pihenés / egyébként 5 nap" vs ch19 "3 nap /
  egy hét" (ch19 explicitly defers to ch18 yet differs). Fp values match.
- **ch18**: zuhanás paragraph — vért MGT "Ép veszteségként hozzáadódik" vs same paragraph "kizárólag
  Fp veszteséget okozhat"; 5-max-Ép vs "gyengébb" 8-max-Ép example internally inconsistent.
- **ch21**: ~~csatacsillag appears in both the Csatabárdok table and the Buzogányok table~~ —
  **RESOLVED** (per the description heading "Egykezes (7), kétkezes csatabárd (8), csatacsákány (9)"):
  the Csatabárdok-table row (2k6+2) was a misnamed **kétkezes csatabárd**; renamed in book + app.
  Consequently the 4. kategória "Nehéz csatabárd" row (5k6), which also said "kétkezes csatabárd",
  was renamed to **nehéz csatabárd** (matching its own section heading) — verify against the print.
- **ch22**: table-vs-body conflicts left unresolved — Fájdalomcsillapítás "1/2 Fp" vs "1 E = 1 Fp";
  Ébredés cost/ME; Felfedés meditáció idő; Levitáció + Tetszhalál listed 4. szint in table but under
  the 5. fokú body section; Kyr Metódus definition includes itself ("a Pyarroni Módszer és a Kyr
  Metódus azon darabjait" — one name likely wrong, Godoni Örökség?).
- **ch24**: ~~Tanulmány "Varázslás ideje: 3 perc" (entry) vs "Min. 3 perc" (table)~~ — **RESOLVED**
  (entry set to "Min. 3 perc", matching table + app data); "a Mágia dalával együtt alkalmazva"
  references a spell that doesn't exist in the chapter.
- **ch25**: Noir szférák cell "Lélek, Lélek vagy Halál" (duplicated?); Kígyótűz "1k6 Ep"
  (analogous fire prayers use Sp); Rettegés "VÉ: +10" in a penalty list. Resolved meanwhile:
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
- ch25: Kegy-pont maximum sentence ("…csak istenük vallásában való elmélyedéstől, hitüknek ereje,
  amit…"); Szélkeltés "Csak kisebb hajók tartós irányú sebbel alkalmas…".

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
