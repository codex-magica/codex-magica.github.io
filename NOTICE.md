# Notices & credits

## M.A.G.U.S. game content

**Codex Magica is an unofficial, non-commercial fan project.** It is not affiliated with, endorsed by or
sponsored by the owners of the M.A.G.U.S. trademarks, or by the authors or publishers of the books.

The software in this repository is open source under the [MIT License](LICENSE). The game content it
presents is **not** covered by that license and remains the property of its respective rights holders.
That content is:

| Path | What it is |
|---|---|
| `src/data/` | Rules tables, spells, skills, weapons, armor, etc., transcribed and restructured from the rulebook for this project (a derivative work) |
| everywhere | The names, terms and game mechanics of M.A.G.U.S. |

**The full rulebook text is not distributed.** Neither the scanned book nor the OCR output or the generated
per-page/per-chapter Markdown is in this repository or its history. The pipeline scripts in
`source_material/build/` are included so it can be run on your own copy, and `src/book/` can hold a local,
gitignored copy of two chapters (see [`src/book/README.md`](src/book/README.md)).

The app icon (`public/logo*.png`, `public/favicon*.ico` and the recoloured copies in `docs/assets/`) is the
M.A.G.U.S. sigil as it appears in the rulebook. Apart from that, no illustrations, cover art or page layout
from the printed book are included.

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
[open an issue](https://github.com/marcigo36/codex-magica/issues) or contact the maintainer through
GitHub. Requests will be handled promptly.

> **Magyarul:** A Codex Magica nem hivatalos, nonprofit rajongói projekt, nem áll kapcsolatban a
> M.A.G.U.S. védjegyek tulajdonosaival, sem a könyvek szerzőivel vagy kiadóival. A forráskód MIT licenc
> alatt szabadon felhasználható. A szabálykönyvből átvett és újrarendezett adatok (származékos művek),
> valamint a játék nevei, fogalmai nem tartoznak e licenc alá, azok a mindenkori jogtulajdonosokat
> illetik. A szabálykönyv teljes szövegét a repó nem tartalmazza. Az alkalmazás
> ikonjául szolgáló M.A.G.U.S.-pecséten kívül a könyv illusztrációit és tördelését a repó nem
> tartalmazza. Ha jogtulajdonosként bármit módosítanál vagy eltávolíttatnál, nyiss egy issue-t, és
> hamar intézzük.

## Fonts

- **[Crimson Pro](https://github.com/Fonthausen/CrimsonPro)** by Jacques Le Bailly, under the
  [SIL Open Font License 1.1](src/fonts/OFL.txt). The two static weights in `src/fonts/` are instances
  cut from the variable font.

## Icons

The companion-animal icons on the character sheet (`src/ui/sheet/animalIcons.tsx`) come from two
open-source icon libraries. Neither requires attribution; they are credited here anyway.

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
