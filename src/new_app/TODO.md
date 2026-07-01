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
  clean it up (or keep as a guard) when the base choice becomes a real选择.
- A generic **"grant one of these skills" (choice) effect** would resolve every row above cleanly —
  like `weaponChoice`/`grantSkillChoice` but selecting among enumerated skill+subtype options.

## Softer / editorial (verify vs. book intent)

- `Fegyverhasználat (egykezes kardok)` is used as an editorial default on classes where the book
  leaves the starting weapon open (Tolvaj types, Bárd base/Aszisz, Boszorkánymester options, etc.).
- Background **point-levels** aren't modeled on grants (e.g. Harcművész / Udvari kardművész should get
  the **1-pont** Vagyon; data grants generic `bg("Vagyon")`).
- Boszorkánymester base teaches `Nyelvtudás`; the book's "Nyelvismeret" is a typo for it — OK as-is.
