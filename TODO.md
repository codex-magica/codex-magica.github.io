# TODO

Open items in the rules data and the engine.

## "Either/or" granted skills

The book grants some starting skills as a choice ("X **vagy** Y N. fok"). The model has no "grant one of
these" effect yet, so each is set to one side, and the player can change it after creation:

| Class / subclass | Book | Set to now |
|---|---|---|
| Paplovag (base) | Fegyverhasználat **vagy** Pajzshasználat 2. fok | Fegyverhasználat (`weaponChoice("másodfegyver", 2)`) |
| Fejvadász / Felderítő | Vadonjárás (adott terep) **vagy** Szakma (Építészet) 2. fok | Vadonjárás (adott terep) |
| Paplovag / Dreina | Szakma (Birtokigazgatás **vagy** Pénzügyek) 2. fok | one editable "birtokigazgatás vagy pénzügyek" entry |
| Bárd / Vándorló dalnok | Fegyverhasználat (íjak **vagy** számszeríjak) 2. fok | íjak |

A generic choice effect (like `weaponChoice` / `grantSkillChoice`, but picking among listed skills and
subtypes) would solve all four. Once it exists, Darton-paplovag's `remove("Pajzshasználat")`
(`src/model/classes/paplovag.ts`) becomes meaningful again: today the base grants Fegyverhasználat, so
it removes nothing.

## Smaller data questions

- **Background point levels on grants** aren't modelled: e.g. Harcművész / Udvari kardművész should get
  Vagyon at 1 point; the data grants a plain `bg("Vagyon")`.
- **Default starting weapon:** `Fegyverhasználat (egykezes kardok)` is used where the book leaves the weapon
  open (Tolvaj types, Bárd base and Aszisz, Boszorkánymester options…). Check against the book's intent.
- **A second check of the long description texts** (bard, witch, warlock, fire magic, prayers, psi, skills,
  weapons, armor) against the book: the first cross-check was a single pass.

## Sync

- Device files of browsers that are no longer used stay in the player's Drive and are read on each page
  load's first sync. Harmless, but a cleanup of files that hold nothing new would save a little time.
