# Third-party icons

The companion-animal icons on the character sheet (`src/ui/sheet/animalIcons.tsx`) are drawn from two
open-source icon libraries. Both are attribution-free, but they're credited here for good license
hygiene.

## Lucide

- Site: <https://lucide.dev>
- License: **ISC** — <https://github.com/lucide-icons/lucide/blob/main/LICENSE>
- Icons used: `paw-print`, `dog`, `cat`, `rabbit`, `rat`, `squirrel`, `panda`, `bird`, `fish`, `turtle`,
  `snail`, `shell`, `shrimp`, `bug`, `worm`, `leaf`, `sprout`

## Tabler Icons

- Site: <https://tabler.io/icons>
- License: **MIT** — <https://github.com/tabler/tabler-icons/blob/main/LICENSE>
- Icons used: `horse`, `deer`, `pig`, `bat`, `canary`, `spider`, `butterfly`, `horseshoe`, `feather`

## Custom

- `bear` — a derivative of Lucide's `panda` (ISC): identical head/ears/snout, with the two angled
  eye-patches replaced by plain round eyes so it reads as a general bear rather than a panda.

## Notes

- The exact path data was copied verbatim from each library's source SVGs and normalised to a shared
  24×24 / 2px-stroke, `currentColor` outline style so the set reads as one family and themes with
  light/dark mode.
- No icon was modified beyond stripping the outer `<svg>` wrapper (and Tabler's bounding-box path).
- Species with no free line-icon in either library (bear, wolf, fox, lion, snake, dragon, owl) fall back
  to the nearest available glyph in the palette.
