# Design brief — MAGUS Character Builder, left (editor) panel

> For **Claude Design** (Anthropic Labs). Paste the "Prompt" section as the project prompt, point
> Claude Design at this repository (so it ingests the design system), and attach the screenshots
> listed under "What to attach". Everything below the Prompt is supporting detail.

---

## Prompt (paste this)

Redesign the **left "editor" column** of a tabletop-RPG **character builder** (the game is MAGUS, a
Hungarian fantasy system; all UI text is Hungarian). It's a React + Chakra UI app; reuse the
existing theme (Warnock Pro display font, light/dark color modes, the `muted` semantic token) and
component conventions you find in `src/character_builder/ui`. **Keep all the functionality and
information density intact — this is a re-skin and information-architecture pass, not a feature
change.** The builder is two columns: this left column is where you *edit* the character; the right
column is a live read-only character sheet (out of scope). The left column scrolls independently and
must work on **iPad (single-column, touch)** as well as desktop.

The left column is a vertical stack of six sections (Alapadatok, Tulajdonságok, Hátterek,
Képzettségek, Pontvásárlás, Ellenőrzés). It is currently functional but visually plain (stacked
bordered cards, lots of tiny `−/+` steppers, dense rows). Make it feel like a focused,
trustworthy **point-allocation / character-sheet tool**: clear hierarchy, scannable rows, obvious
"how many points do I have left" feedback, and calm use of the fantasy theme without sacrificing
legibility or density. Optimize the **stepper / add-remove / inline-edit** interactions for touch.

Deliver: a redesigned layout for the whole left column plus detailed treatments for the
**Tulajdonságok** (point-buy), **Képzettségek** (skills), and **Pontvásárlás** (point-buy of
HM/Mana/etc.) sections, in both light and dark mode, desktop and iPad widths.

---

## 1. Product context

- **App:** an in-browser character builder + live sheet for the MAGUS RPG. React 18 + TypeScript +
  **Chakra UI**, Warnock Pro font, light/dark mode (toggle in the header).
- **Module:** `src/character_builder/` — self-contained. UI lives in `src/character_builder/ui/`.
  Theme tokens in `src/theme.ts` (note the `muted` semantic color and the `md: 1200px` breakpoint:
  below 1200px the app is a single column).
- **Core mechanic:** the character is built by spending a shared **KAP** point pool (and a fixed
  135-point attribute budget). Almost every control is "spend points to raise a value." The central
  UX job is making point spending, the running balance, and validity **legible at a glance.**
- **Audience:** MAGUS players/GMs building characters — domain-literate, value information density
  and correctness over hand-holding. Many use an **iPad** at the table.

## 2. Experience goals

1. **Always answer "what can I spend, and on what?"** — running KAP balance and the 135-point
   attribute budget should be persistently visible and never ambiguous (red when overspent).
2. **Scannable, not noisy.** Today every line is a row of tiny `−/value/+` steppers; reduce visual
   weight, improve rhythm, group related rows.
3. **Touch-first steppers & inline edits.** Bigger hit targets; editable text fields that don't feel
   cramped; clear disabled states (we already moved `−` to outline so disabled reads — keep that).
4. **Calm fantasy flavor.** A bit of MAGUS character (the book uses Warnock Pro, parchment-ish warmth)
   without hurting contrast or density. Must look right in dark mode too.
5. **Progressive disclosure for rare actions.** Rare/expensive actions (e.g. raising an attribute for
   20 KAP) should be tucked away (an "add a row" affordance), not occupy permanent space.

## 3. The six sections (functional spec to preserve)

The column is a stack of cards, in this order. A sticky header above them holds the title
("Karakteralkotó") and the light/dark toggle.

1. **Alapadatok (Basics).** Name text field; Faj (race) select; Kaszt (class) select; then a
   *dynamic, recursive* set of selects for the class's specialization tree (e.g. "Iskola", or
   "Típus" + "Klán", and nested sub-choices like a priest's "irányzat" or a knight's "Arc" that
   appear only after the parent is chosen). A red inline warning if the race isn't allowed for the
   class. A small muted line: "Kaszt költsége: N · Faj költsége: N".

2. **Tulajdonságok (Attributes) — the 135-point buy.** Ten attributes (Erő, Gyorsaság, Ügyesség,
   Állóképesség, Egészség, Karizma, Intelligencia, Akaraterő, Asztrál, Érzékelés). Two columns per
   attribute: **ÉRTÉK** (base value, a `−/value/+` stepper, capped at the racial max, drawn from the
   135 budget) and **MAX (Adottság)** (a second `−/value/+` that raises the ceiling *above* the
   racial cap, up to 20, costing 1 KAP per point). A persistent "Alappont: N" remaining counter
   (green at 0). Effective value = base + Adottság. This is the densest, most-used section — make it
   excellent.

3. **Hátterek (Backgrounds).** A checklist of backgrounds (Mágikus fogékonyság, Pszi érzékenység,
   Kegyelt, Nemesi vér, Vagyon, Rang, Manalátó, Mágiatagadás, Sugallat…). Each shows its KAP cost and
   a one-line description. Backgrounds the class grants are **locked** with a "kaszt" badge. Ranged
   ones (Vagyon 1–3, Manalátó 2–3, Mágiatagadás 1–5) get a small magnitude dropdown when checked.

4. **Képzettségek (Skills) — the most complex section.** A **tri-state filter** (Tanult /
   +oktatott / Mind) and a running KAP figure. A long, category-grouped list (Harci, Alvilági,
   Világi, Tudományos, Szociális, Misztikus). Each owned skill is **one line**: skill name (shown on
   the first instance), an inline **editable subtype** text field (free text — e.g. "anyanyelv" →
   "pyarroni közös"), a "kapott" badge for class-granted floors, a teacher badge ("T4"), and a
   `−/fok/+` stepper showing the per-fok Kp cost on the `+`. Skills can be **specialized/branched**:
   a `+ág` button adds a variant row (its own editable subtype + a small "ág" branch-fok stepper +
   a delete icon). Unlearned skills (in +oktatott/Mind) show a `+ tanul` button instead. Percentage
   skills (Lopódzás, Mászás…) show a `%` value and can't branch. This section is information-dense and
   needs the clearest possible row rhythm and alignment.

5. **Pontvásárlás (Point-buy of derived stats).** Buy from the shared KAP pool: **HM** distributed to
   the four combat values (KÉ/TÉ/VÉ/CÉ — each a stepper showing the resulting combat number; some HM
   is granted free), **Fp**, and the magic pools the character actually has (Mana/Pszi/Kegy — hidden
   if none). Plus a collapsed **Tulajdonság (+1 · 20 KAP)** list: empty by default with a `+` that
   adds a row where you pick the attribute from a dropdown, then a `−/+/delete` row per bought stat.

6. **Ellenőrzés (Diagnostics).** A non-blocking list of warnings/info/errors (severity-colored
   badges) — e.g. "point-buy ≠ 135", "X HM unassigned", overspent KAP. Treat as an advisory feed.

## 4. Cross-cutting interaction patterns

- **The stepper** (`−  value  +`) is the workhorse — it appears dozens of times. Its `+` often carries
  a cost label ("+ 8" Kp / "+ 20" KAP) and disables when unaffordable or capped; `−` disables at a
  floor (e.g. a granted skill's level). Design one excellent, touch-friendly stepper and a clear
  disabled treatment; consider how a wall of them reads.
- **Inline editable text** (subtype fields) must keep focus while typing and read as editable.
- **Add / remove rows** (skill variants, attribute buys) — use a consistent add affordance and a
  consistent delete (currently a small trash icon).
- **Running totals** (KAP remaining, Alappont remaining) — make these anchor points the eye returns to.
- **Badges:** "kaszt" (granted/locked), "T4" (teacher level), severity (error/warn/info), "max".

## 5. Constraints & design system

- **Must build in Chakra UI** with the existing theme — reuse `src/theme.ts` (Warnock font, `muted`
  token, light/dark). Match the component patterns already in `src/character_builder/ui/`.
- **Responsive:** single column below 1200px; the left column gets the **full screen width on iPad**,
  so there's room — but everything must also work touch-first and in the two-column desktop layout
  (left column ≈ half width).
- **Both color modes** are first-class. Avoid hardcoded grays; everything must adapt.
- **All copy is Hungarian** — keep the existing labels.
- Independent vertical scroll for the column (it's tall).

## 6. Out of scope

- The **right column** (live character sheet) — not part of this task.
- The underlying rules/engine, data model, and what each control *does* — **don't change behavior**,
  only the look, layout, hierarchy, and interaction ergonomics.
- Multi-level / level-up flows (the panel currently targets level 1).

## 7. What good looks like (acceptance)

- A non-expert can glance at the column and immediately see **how many points remain** and where to
  spend them.
- The **Tulajdonságok** and **Képzettségek** sections feel calm and scannable despite their density;
  rows align; steppers don't read as visual noise.
- Touch targets are comfortable on iPad; nothing feels cramped; editable fields are obvious.
- Looks polished and a little thematic in **both** light and dark mode.
- It's clearly the same product family as the live sheet on the right.

## 8. What to attach to Claude Design

1. **This repository** (point Claude Design at the codebase) so it ingests `src/theme.ts`, the
   Warnock font, and the existing `src/character_builder/ui/*` components for the design system.
2. **Screenshots of the current left column** — capture: full column (light + dark), and close-ups of
   **Tulajdonságok**, **Képzettségek** (with a branched skill expanded), and **Pontvásárlás**, at both
   **desktop** and **iPad portrait** widths. (Run the app: `npm start`, then the builder is the
   default view.)
3. Optionally, **a page or two from the MAGUS rulebook** for thematic reference (parchment/serif feel)
   — but legibility and density win over flavor.

---

Sources on Claude Design's inputs/capabilities are listed in the chat message accompanying this file.
