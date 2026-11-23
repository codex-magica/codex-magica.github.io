# Notices & credits

## M.A.G.U.S. game content

**Codex Magica is an independent, non-commercial fan project.** It is not an official M.A.G.U.S. product:
it is not published or endorsed by the owners of the M.A.G.U.S. trademarks or by the authors or publishers
of the books, and they are not responsible for its content.

The software in this repository is open source under the [MIT License](LICENSE). The game content it
presents is **not** covered by that license and remains the property of its respective rights holders.
That content is:

| Path | What it is |
|---|---|
| `src/data/` | Rules data transcribed and restructured from the rulebook for this project (a derivative work): the descriptions and rules text of skills, spells, prayers, psi disciplines and the magic schools, weapons, armor, items, poisons and combat situations |
| `src/model/abilities.ts`, `attributeInfo.ts`, `combatInfo.ts` | Short descriptions of class and race abilities, attributes and combat values, from the same source |
| everywhere | The names, terms and game mechanics of M.A.G.U.S. |

**The full rulebook text is not distributed.** Neither the scanned book nor the OCR output or the generated
per-page/per-chapter Markdown is in this repository or its history. The rest of the book (the text of the
introduction and character-creation chapters, the class chapters' prose, the world and lore, the gods, the
bestiary, the magic items and so on) is not included. The pipeline scripts in `source_material/build/` are
included so it can be run on your own copy; its chapter output goes to the gitignored `src/book/` folder
(see [`src/book/README.md`](src/book/README.md)), which the app does not read.

No illustrations, cover art or page layout from the printed book are included.

### Credits as printed in the book

For attribution, from the colophon of _M.A.G.U.S. Új Törvénykönyv_ (Tuan Kiadó, 2007,
ISBN 978-963-87672-1-9). This reproduces the 2007 edition and is not a statement about who holds which
rights today.

- The world of _M.A.G.U.S., avagy a kalandorok krónikái_: Gáspár András and Novák Csanád
- The original M.A.G.U.S. game system: Novák Csanád and Nyulászi Zsolt
- _Új Törvénykönyv_: written and system developed by Bayer Tibor and Kriston Dávid; edited by Mórocz
  Tibor; text editors Hajdú Éva and Lehet Csaba; rules reviewer Takács Gergely

### Takedown requests

If you hold rights to any of this material and would like something changed or removed, please
[open an issue](https://github.com/codex-magica/codex-magica/issues) or contact the maintainer through
GitHub. Requests will be handled promptly.

> **Magyarul:** A Codex Magica független, nem kereskedelmi célú rajongói projekt. Nem hivatalos
> M.A.G.U.S.-termék: nem a védjegyek tulajdonosai, illetve a könyvek szerzői vagy kiadói adták ki, és a
> tartalmáért nem ők felelnek. A forráskód MIT licenc alatt szabadon felhasználható. A szabálykönyvből
> átvett és újrarendezett adatok (származékos művek), valamint a játék nevei és fogalmai nem tartoznak e
> licenc alá, azok a jogosultak szellemi tulajdonát képezik. A szabálykönyv teljes szövegét a repó nem
> tartalmazza, ahogy a könyv illusztrációit és tördelését sem. Ha jogosultként bármit módosíttatnál vagy
> eltávolíttatnál, nyiss egy issue-t, és hamar intézzük.

## Fonts

- **[Crimson Pro](https://github.com/Fonthausen/CrimsonPro)** by Jacques Le Bailly, under the
  [SIL Open Font License 1.1](src/fonts/OFL.txt). The two static weights in `src/fonts/` are instances
  cut from the variable font.
- **[EB Garamond](https://github.com/octaviopardo/EBGaramond12)** by Georg Duffner and Octavio Pardo, under
  the [SIL Open Font License 1.1](src/fonts/OFL-EBGaramond.txt), for four characters Crimson Pro lacks
  (Ψ, ψ, ⅓, ⅔): `src/fonts/EBGaramond-Symbols-*.woff2` are subsets of instances of the variable font.

## Icons

The **app icon and logo** are an original design for this project (sources in [`docs/brand/`](docs/brand)):
a pentagram drawn as a woven knot inside a ring.

The companion-animal icons on the character sheet (`src/ui/sheet/animalIcons.tsx`) come from two
open-source icon libraries, under their licenses (full texts in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)).
A few interface icons are from Lucide too: the cloud of the Google Drive button and the backup/import arrows.

- **[Lucide](https://lucide.dev)** ([ISC](https://github.com/lucide-icons/lucide/blob/main/LICENSE)):
  `paw-print`, `dog`, `cat`, `rabbit`, `rat`, `squirrel`, `panda`, `bird`, `fish`, `turtle`, `snail`,
  `shell`, `shrimp`, `bug`, `worm`, `leaf`, `sprout`
- **[Tabler Icons](https://tabler.io/icons)** ([MIT](https://github.com/tabler/tabler-icons/blob/main/LICENSE)):
  `horse`, `deer`, `pig`, `bat`, `canary`, `spider`, `butterfly`, `horseshoe`, `feather`
- **Custom `bear`**: a derivative of Lucide's `panda` (ISC) with the eye-patches replaced by plain round
  eyes.

Path data was copied verbatim from each library's source SVGs and normalised to a shared 24×24 / 2px
stroke, `currentColor` outline style so the set reads as one family and themes with light/dark mode.

## Dependencies

npm dependencies are used under their own licenses (see `package.json` and `node_modules/*/LICENSE`).
