# MAGUS Character Builder — Data Model Plan

> Design plan for a from-scratch character data model + sheet. Goal: a builder that is
> **simple to use on first creation**, backed by a model that can represent **every legal edit
> and every level-up** the MAGUS rules allow, with full traceability.

---

## 1. The core decision: store *decisions*, not *results*

The existing model (`src/data/character.ts`) is a **snapshot**: it stores final `stats`, `vitals`,
and a flat `skills[]`. It cannot answer "*why* is TÉ 64?", "how much KAP is left this level?",
"is this skill order legal?", or "what happens when I level up?" — because the information that
produces those answers (the ordered sequence of choices and what each cost) was thrown away.

Almost every requirement you listed is fundamentally **about the derivation, not the result**:

| Requirement | Why a snapshot can't model it |
|---|---|
| 50 − Σ(background cost) KAP each level, spent on HM/Fp/Kp/Mana/Psi/Kegy | Needs the per-level budget + how it was spent |
| Skill A depends on B (strong = equal fok, weak = within 1 fok) | Legality depends on **what you owned at purchase time** → order matters |
| Unmet attribute requirement makes a skill cost more | Cost is a function of attributes **at the moment of purchase** |
| Reaching skill fok 4 grants +1 to a chosen attribute | A side-effect that itself changes later costs/requirements |
| Some skills grant Mana/Pszi/HM/Fp **every level including the 1st** | A recurring per-level contribution, not a one-time number |
| Each HM point is assigned to KÉ/TÉ/VÉ/CÉ by the player | The allocation is a decision that must be stored, not recomputed |
| KM grants bonuses for roleplay (e.g. +Kegy) | Out-of-band events with no formula |
| Level-ups | Appending more decisions |

### Recommendation — a **ledger + pure derivation engine**

Store the character as **identity + an ordered ledger of decisions** (creation = "level 1", then one
entry per level-up, plus a side-channel of KM adjustments). Compute the character sheet with a
**pure function** `derive(rulesDB, record) → DerivedCharacter` that replays the ledger.

```
RulesDB (static)  ─┐
                   ├──►  derive()  ──►  DerivedCharacter { stats, vitals, combat,
CharacterRecord ───┘                     skills, provenance, diagnostics }
   (persisted)
```

This is *event-sourcing scoped to one aggregate*. It gives us, for free:

- **Level-ups** = append a `LevelRecord`.
- **Edits** = mutate any ledger entry, then re-derive; the engine re-validates downstream.
- **Provenance** = every derived number carries the list of contributions that made it.
- **Validation** = the engine reports "overspent KAP", "dependency not met", "tier-4 choice
  missing", "over racial cap" as **diagnostics**, so the builder can guide without hard-blocking.
- **Serialization** = the record is plain JSON (no functions, unlike today's `derivedStats`).

**Alternative considered — snapshot + modifier list** (extend `calcBonuses`/`Modifier`). Rejected:
it can show provenance but still can't validate ordering or the KAP economy, and "level-up" has no
natural representation. We keep the *idea* of `Modifier` but generalize it into the `Effect`
vocabulary below, emitted by the ledger rather than stored loose.

> The builder UI stays simple precisely **because** the model is strict: the wizard writes a
> well-formed ledger and the engine tells it what's legal/affordable at each step.

---

## 2. Three layers

```
┌─ Layer 1: RULES DB (static, read-only) ──────────────────────────────┐
│  races, classes, subclasses, backgrounds, skills, weapons, armor,    │
│  spells … each encodes its mechanical effects declaratively (Effect[])│
└──────────────────────────────────────────────────────────────────────┘
┌─ Layer 2: CHARACTER RECORD (persisted JSON) ─────────────────────────┐
│  identity + race/class/subclass/backgrounds + 135-pt buy +           │
│  levels: LevelRecord[] (the ledger) + kmAdjustments + inventory +    │
│  vitalsState (only "current" values)                                 │
└──────────────────────────────────────────────────────────────────────┘
┌─ Layer 3: DERIVATION ENGINE (pure, computed, memoized) ──────────────┐
│  derive(db, record) → { effectiveStats, derived combat, vital maxes, │
│  ownedSkills, resource pools, provenance, diagnostics }              │
└──────────────────────────────────────────────────────────────────────┘
```

Layer 1 reuses today's `src/data/*` data (skills, weapons, armor, magics) — those stay as the
reference catalog. We **extend** them with the mechanical metadata the model needs (§3) and add a
new `backgrounds` catalog. Layers 2 and 3 are new.

---

## 3. Layer 1 — Rules DB (designed fresh)

These types are designed from scratch for this model, not lifted from the current `src/data/*`. They
**keep** the few existing things that are already optimal — the `const XxxValues = {…}` +
`type Xxx = keyof typeof XxxValues` pattern (zero data/type drift), the 10-attribute `Stats` record,
and the per-fok prose with its `table:`/`small:` directives — and **replace** the rest. The existing
data files become a *source to migrate*, not a base to extend; while migrating, fix the drift the
audit found (one source of truth for race keys; a real `Class` union everywhere; no `as ClassInfo`
casts hiding the `FélElf`/`Félelf` mismatch).

### 3.1 The `Effect` vocabulary (the backbone)

Every rules source (race, class, subclass, background, *and each skill fok*) and every KM grant
emits a list of `Effect`s. The engine folds them. One vocabulary, many emitters:

```ts
type Resource = "Mana" | "Psi" | "Kegy" | "HM" | "Fp" | "Kp";
type CombatChannel = "KÉ" | "TÉ" | "VÉ" | "CÉ";

type Resource = "Mana" | "Psi" | "Kegy" | "HM" | "Fp" | "Kp";
type Pool = "Mana" | "Psi" | "Kegy";   // the three "spendable in play" resource pools
type CombatChannel = "KÉ" | "TÉ" | "VÉ" | "CÉ";

type Effect =
  | { kind: "grantSkill";        skill: Skill; subtype?: string; level: SkillFok }     // start owning at a fok
  | { kind: "grantSkillPercent"; skill: Skill; subtype?: string; percent: number }     // for %-skills
  | { kind: "teachingDiscount";  scope: SkillRef | SkillType; uptoLevel: SkillFok }    // oktatás: cheaper learning
  | { kind: "grantBackground";   background: Background; free: true }                   // e.g. guild → Mágikus fogékonyság
  | { kind: "resourcePerLevel";  resource: Resource; amount: number }                   // skill-driven per-level gains
  | { kind: "poolAccess";        pool: Pool }                                           // background → the pool EXISTS
  | { kind: "statBonus";         stat: Stat; amount: number }                           // flat attribute bonus
  | { kind: "combatBonus";       channel: CombatChannel; amount: number }
  | { kind: "derivedBonus";      target: DerivedStat; amount: number }                  // MME/AME/Ép/…
  | { kind: "tag";               tag: Tag }
  | { kind: "grantEquipment";    item: string; qty?: number }
  | { kind: "grantMoney";        amount: number; currency?: string }
  | { kind: "restriction";       text: string }
  | { kind: "note";              text: string };

// A grant can be scheduled for a later character level (see §3.3 — subclasses that confer a
// background mid-progression). Default atLevel = 1 (granted at creation).
type GrantEntry = { atLevel?: number; effect: Effect };
```

`resourcePerLevel` is how "some skills grant Mana/Pszi/HM/Fp every level" is modeled — it lives on
the relevant **skill fok** (e.g. Fájdalomtűrés fok 3 → `{resourcePerLevel: Fp +1}`) and the engine
applies it on every level the skill is owned at that fok (so timing/order is respected).

### Pools, skills, spells — who gates what

Three distinct things, each gated by exactly one source:

1. **Pool exists & accrues — gated by a BACKGROUND.** `Mágikus fogékonyság → Mana`,
   `Pszi érzékenység → Psi`, `Kegyelt → Kegy`. A class confers a pool *only* by granting the matching
   background (`grantBackground`). A character may hold **any combination** of the three pools — there
   is no single "resource model" or "magic system" field on a class.
2. **Spells you can learn/cast — gated by a SKILL.** A magic/psi skill (e.g. `Tapasztalati mágia`,
   the Magasmágia categories, `Pszi`) is what teaches spells; each spell declares which skill and fok
   it needs. Skills do **not** unlock pools.
3. **Casting a specific spell now — gated by POOL POINTS.** You can cast a spell iff you know its
   gating skill at the required fok **and** the relevant pool currently holds ≥ its cost.

So spells point *back* to their skill (no `isMagicSystem` flag needed):

```ts
interface SpellDef {
  name: string;
  pool: Pool;                              // Mana | Psi | Kegy
  cost: number | string;                   // points to cast (string for variable/leveled costs)
  requires: { skill: Skill; subtype?: string; fok: SkillFok }; // the gate
  // …existing per-school fields (range, duration, save, domains/level, description)…
}
```

This is the clean separation: **background ⇒ you have the pool; skill ⇒ you know the spells;
pool points ⇒ you can cast right now.** Today's `bardMagic.ts`/`prayers.ts`/`psi.ts` etc. migrate
into `SpellDef` by adding the `pool` + `requires` gate.

### 3.2 Skills — `SkillDef`

Designed fresh; it keeps the parts of today's `SkillInfo` that are already right (`hardReq`/`softReq`,
governing attributes, per-fok prose with the `table:`/`small:` directives) and drops what isn't.

```ts
type SkillFok = 1 | 2 | 3 | 4 | 5;
type SkillDifficulty = "I" | "II" | "III" | "IV";  // drives Kp cost curve AND learning time/availability
type SkillCostModel = "tiered" | "percentage";
type SkillRef = { skill: Skill; subtype?: string };

interface SkillDef {
  name: Skill;
  category: SkillCategory;        // Harci | Alvilági | Világi | Tudományos | Szociális | Misztikus
  difficulty: SkillDifficulty;
  costModel: SkillCostModel;      // "percentage" skills (all difficulty I) use the % rule instead of tiers
  attrs: Stat[];                  // required/governing attributes (checks, fok-4 bonus, unmet-req penalty)
  hardReq: SkillRef[];            // strong prereq — must be owned at == target fok
  softReq: SkillRef[];            // weak prereq   — must be owned at >= target fok − 1
  perFokEffects?: Partial<Record<SkillFok, Effect[]>>; // e.g. fok3 → {resourcePerLevel: Fp +1}
  text: SkillText;               // description + lvl_1..lvl_5 + special (reuse existing renderer)
}
```

What got *removed* vs. the earlier draft, per your fixes:

- **No `grantsAttrBonusAtFok4` flag.** It's implicit: any **tiered** skill with `attrs.length > 0`
  grants +1 to a chosen governing attribute on reaching **fok 4** (book §16, line 55 — and you can't
  pick the same attribute twice from the *same* skill, e.g. Fegyverhasználat across weapons).
- **No subtype metadata.** A subtype is *only* an optional free-text `string` on the **owned** skill
  instance (§4). The catalog says nothing about it; owning a skill twice with different subtype
  strings is just two owned entries. No `multiple`/`requiredFromFok`/taxonomy.
- **No `unlocksPool` / `isMagicSystem`.** Skills don't gate pools (backgrounds do) and don't need a
  "magic system" flag — spells point *back* to the skill that teaches them (see resource model above).

```ts
// Cumulative Kp to reach each fok, BY DIFFICULTY — verbatim from chapter 16 (lines 146–211).
// To raise a skill you pay the difference: cost(from→to) = TIER_COST[difficulty][to] − […][from].
const TIER_COST: Record<SkillDifficulty, [number, number, number, number, number]> = {
  I:   [1,  3,  8, 15, 25],
  II:  [1,  5, 10, 20, 30],
  III: [2,  8, 15, 30, 45],
  IV:  [3, 10, 20, 35, 55],
};
const PERCENT_KP_RATE = 3;        // 1 Kp = 3%  (percentage skills — all difficulty I)
const PERCENT_KP_RATE_TAUGHT = 5; // 1 Kp = 5%  with oktatás / a qualified teacher
```

The percentage skills (Lopódzás, Rejtőzködés, Mászás, Akrobatika, Esés, Zárnyitás, Zsebmetszés,
Csapdakeresés, Veszélyérzék, Rejtekhely-kutatás) are `costModel: "percentage"`; base value = the
governing attribute, max = 100 + attribute (book lines 29–33).

**Teaching/oktatás** discounts apply **per increment**: `teachingDiscount{ uptoLevel }` lowers the
Kp cost of *every* fok step it covers by 2 (min 1), up to fok 4 (book line 91); for percentage skills
it switches the rate to 5%/Kp (line 93). The engine subtracts it on each covered increment.

**Unmet attribute requirement** (book lines 61–66): to learn fok *n* each governing attribute must be
≥ 10 + n; if short, add the total deficit as extra Kp (e.g. fok 4 needs 14/14, you have 12/12 → +4 Kp).

### 3.3 Races, Classes, Subclasses, Backgrounds — unify under "background"

You said it directly: **race and class are backgrounds**, and a class can grant *other* backgrounds
for free. So model a single `Background` notion and let race/class be specializations of it.

```ts
interface BackgroundInfo {
  cost: number;          // points that reduce per-level KAP — but only from the level it is acquired (see below)
  grants: GrantEntry[];  // skills, tags, pool access, equipment, money… each optionally level-timed
  exclusiveWith?: Background[];
}

interface RaceInfo extends BackgroundInfo {  // race IS a background (cost 0 or 1)
  statLimits: Stats;     // racial caps (already present)
  ageCategories: AgeCategory[];  // each with stat modifiers + lifespan band
}

interface ClassInfo extends BackgroundInfo {  // class IS a background (cost = today's kapCost, 5–10)
  allowedRaces: Race[];
  sexRestriction?: "female";          // Boszorkány
  subclasses: Record<string, SubclassInfo>;
  // NO magicSystem / resourceModel fields. A class's "magic system" is simply one of its default
  // granted skills (the skill that spells point back to). Pools come from granted backgrounds. A class
  // may end up with any mix of Mana/Psi/Kegy via the backgrounds + skills it grants.
}

interface SubclassInfo extends BackgroundInfo {  // layers ON TOP of the class
  // deity/order/school: extra granted skills, teaching bonuses, free backgrounds,
  // starting equipment, magic sphere/school access, restrictions — all as grants[].
  // Some grants are LEVEL-TIMED, e.g. { atLevel: 5, effect: {grantBackground:"Vagyon", free:true} }.
}
```

So a mage guild that gives you Mana = its `grants` includes
`{ effect: { kind:"grantBackground", background:"Mágikus fogékonyság", free:true } }` (the pool) **and**
`{ effect: { kind:"grantSkill", skill:"Tapasztalati mágia", subtype:"bárd", level:3 } }` (the
usability gate). Granted skills / oktatás bonuses are just `grantSkill` / `grantSkillPercent` /
`teachingDiscount` entries in `grants`.

**Level-timed grants & cost timing.** A grant with `atLevel: N` applies only when the character
reaches level N. Crucially, a **background gained at level N reduces KAP income only from level N
onward — never retroactively.** So per-level KAP income is *not constant*; it steps down each time a
new background becomes active. (Earlier levels keep the KAP they already spent.)

> The progression-table numbers (HM +10, Fp +7, Kp +15 …) are **recommendations only** — they do
> *not* go in the rules data as constraints. We store them separately as
> `suggestedAllocation` per class, used purely to seed the builder's defaults.

---

## 4. Layer 2 — The Character Record (persisted)

```ts
interface CharacterRecord {
  schemaVersion: number;           // for migrations
  id: string;
  name: string;
  player?: string;
  concept?: string;
  notes?: string;

  identity: {
    alignment: Alignment;          // Élet/Halál/Rend/Káosz
    secondaryAlignment?: Alignment;
    religion?: string;             // deity (gates priest/paladin spheres)
    homeland?: string;
    sex?: "male" | "female";       // gates Boszorkány
    ageCategory: AgeCategoryKey;   // affects base stats
  };

  race: Race;
  class: Class;
  subclass?: string;
  backgrounds: ChosenBackground[]; // optional extras; class-granted ones flagged source:"granted"

  pointBuy: Stats;                 // the 135-point allocation (each ≤ racial cap)

  levels: LevelRecord[];           // THE LEDGER — index i = character level i+1
  kmAdjustments: Adjustment[];     // out-of-band effects (roleplay rewards, story events)

  inventory: InventoryItem[];
  vitalsState: Partial<Record<VitalKey, number>>; // only CURRENT values; max is derived
}

interface ChosenBackground {
  background: Background;
  source: "chosen" | "granted";
  acquiredAtLevel: number;   // 1 = at creation; >1 = gained mid-game (cost applies from here on only)
}

interface LevelRecord {
  level: number;
  allocations: KapAllocation[];    // how this level's KAP was spent
  skillPurchases: SkillPurchase[]; // ORDERED — order is significant
  hmAssignments: HmAssignment[];   // every available HM point → a combat channel
  statIncreases: StatIncrease[];   // KAP-bought raises + fok-4 bonus choices
  notes?: string;
}

interface KapAllocation { target: Resource; points: number; } // KAP spent = points × RATE[target]
const KAP_RATE: Record<Resource, number> = { Kp:1, Fp:1, HM:2, Psi:2, Mana:3, Kegy:3 };

interface SkillPurchase {
  skill: Skill; subtype?: string;
  from: SkillFok | number;   // 0 = not previously owned; number for %-skills
  to:   SkillFok | number;
  teaching?: { uptoLevel: SkillFok }; // oktatás applied (from a teacher/clan grant)
}

interface HmAssignment { channel: CombatChannel; amount: number; }

interface StatIncrease {
  stat: Stat; amount: number;
  source: "kap" | "skillFok4" | "km" | "age" | "race";
  ref?: SkillRef;            // for skillFok4: which skill triggered it
}

interface Adjustment {       // KM grants, not bound to the KAP economy
  atLevel?: number; effects: Effect[]; reason: string; date?: string;
}
```

Notes:
- **`vitalsState` stores only `current`.** The `max` of every pool (Ép, Fp, Mana, Kegy, Psi) is
  derived. This kills the bug where `BardSpellsPanel`/`CombatValuesPanel` hardcode `maxMana=24` etc.
- **Carry-over is always legal.** Unspent KAP/Kp accumulates into a running balance the character
  can draw on in a later level (there are legitimate cases for saving up and mid-level spending). The
  engine tracks a running pool per resource; a level may spend more than that level's income as long
  as the cumulative balance stays ≥ 0. No flag — it's the rule.
- A character at "just created" is simply `levels.length === 1`.

---

## 5. Layer 3 — The derivation engine (pipeline)

`derive(db, record): DerivedCharacter` runs as an ordered, pure pipeline. Each stage appends
**provenance** entries and **diagnostics** (never throws — invalid input yields warnings/errors).

1. **Base attributes** — `pointBuy` must sum to **exactly 135** (hard rule, enforced at the attribute
   screen — see §6); clamp each to racial `statLimits`; apply `ageCategory` modifiers → `baseStats`.
   Later attribute gains (fok-4, KAP-bought, KM) are **not** part of the 135 and stack on top.
2. **Background accounting (per level, not a constant)** — for each character level `L`,
   `kapIncome(L) = 50 − Σ cost of backgrounds with acquiredAtLevel ≤ L`. Backgrounds gained mid-game
   step the income *down from their acquisition level onward only*. (Race + class are
   `acquiredAtLevel: 1`. A subclass `atLevel`-timed `grantBackground` adds a `ChosenBackground` at
   that level, including the level-timed pool unlocks.)
3. **Grants are applied at their `atLevel`** — collect `grants[]` from race + class + subclass +
   backgrounds. Each `GrantEntry` fires at its `atLevel` (default 1) during the per-level fold:
   `grantSkill`/`grantSkillPercent` (starting skills at their fok), `tag`, `poolAccess`,
   `grantBackground` (adds a `ChosenBackground` at that level), `grantEquipment`, `grantMoney`,
   register `teachingDiscount`s. Level-1 grants seed the freshly created character.
4. **Per-level fold** (level 1 → N), each level `L`:
   0. apply any `GrantEntry` with `atLevel === L` (new backgrounds, skills, pools, teaching bonuses).
   1. budget = `kapIncome(L)` (+ any KM `Adjustment` KAP for this level).
   2. **Skill purchases, in order**: for each,
      - check **dependencies** vs skills owned *so far* (prior levels + earlier this level):
        `hardReq` (strong) ⇒ prereq fok ≥ target fok; `softReq` (weak) ⇒ prereq fok ≥ target−1.
      - compute **Kp cost**: tiered → `TIER_COST[to] − TIER_COST[from]` (cumulative curve);
        %-skill → `(to−from)/rate`. Apply `teachingDiscount` **per increment** across the foks it
        covers (and use the 5%/Kp rate for covered %-skill steps). Add **unmet-requirement penalty**:
        for each governing `stat` where `statValue − 10 < to`, add the deficit to the cost.
      - if `to === 4` and the skill is tiered with `attrs.length > 0`: require a matching
        `statIncrease{source:"skillFok4"}` choosing one of `attrs`; enforce "can't raise the same
        attribute twice from the same skill".
   3. **Skill-driven resources**: for every owned skill, apply its fok's `resourcePerLevel`
      effects → adds to this level's Mana/Psi/HM/Fp/Kegy gains.
   4. **HM**: `availableHM = boughtHM(from allocations) + grantedHM(from skills)`; assert
      `Σ hmAssignments.amount === availableHM`; add each to its KÉ/TÉ/VÉ/CÉ accumulator.
   5. **Resource pools**: a pool (Mana/Psi/Kegy) exists & accrues only if its enabling background is
      active (`poolAccess` granted by then); add bought + granted points to that pool's running max.
      Buying pool points without the background = `warn` diagnostic. (Which *spells* are known/castable
      is computed separately in step 7 from the gating skills + current pool — not here.)
   6. **Validate spend against the running balance**: maintain a cumulative pool per resource.
      This level's income (`budget`) is added to the carried balance; spend (`Σ alloc.points × KAP_RATE`,
      Kp paid out to skills) draws it down. Legal as long as the **cumulative balance stays ≥ 0** —
      so saving up across levels and mid-level spending are both fine. Kp is bought from KAP (rate 1),
      then skills are paid from the Kp pool.
5. **KM adjustments** — apply non-level `Adjustment.effects` (e.g. `derivedBonus Kegy +5` for roleplay).
6. **Effective stats** — `baseStats` + Σ `statBonus` (fok-4, magic, KM); re-clamp where the rules cap.
7. **Derived combat & vitals**:
   - `KÉ = Érz + Gy + Σ HM→KÉ + Σ combatBonus(KÉ)` (and TÉ/VÉ/CÉ analogously; keep today's base
     formulas, but HM now flows from assignments instead of a stub).
   - `Ép = Egészség (+ derivedBonus)`, `Fp_max = Áks + Egs + Σ Fp gains`, `MME/AME`,
     `SebzésBónusz = max(Erő−15,0)`, carrying = Erő×10 / Erő×3, movement = Gy×5.
   - Vital `max` from above; `current` from `vitalsState` clamped to `[0,max]`.
   - **Spells view**: for each `SpellDef`, `known` = the character owns `requires.skill` at
     `requires.fok`; `castableNow` = `known && pool[spell.pool].current ≥ cost`.
8. **Output**: `DerivedCharacter` = the full sheet + `provenance: Record<Target, Contribution[]>`
   + `diagnostics: Diagnostic[]` (`severity: error|warn|info`, message, ref).

```ts
interface DerivedCharacter {
  baseStats: Stats; effectiveStats: Stats;
  combat: Record<CombatChannel, number>;
  derived: Record<DerivedStat, number>;
  vitals: Record<VitalKey, { current: number; max: number }>;
  pools: {
    kapIncomeByLevel: number[];                  // varies as backgrounds are gained
    kapBalanceByLevel: number[];                 // running carry-over balance after each level
    magic: Partial<Record<Pool, { max: number }>>; // only pools whose background is active exist
  };
  skills: OwnedSkill[];                 // resolved fok/%/subtype + each one's check modifier
  spells: { name: string; known: boolean; castableNow: boolean }[];
  tags: Tag[]; equipment: InventoryItem[]; money: number;
  provenance: Record<string, Contribution[]>;
  diagnostics: Diagnostic[];
}
```

Memoize on `record` identity; for big sheets, memoize per-level fold so editing level *k* only
recomputes *k…N*.

---

## 6. How the builder stays simple

The builder only ever **writes a well-formed `CharacterRecord`**; the engine makes it safe.

- **Creation wizard** (linear, opinionated): Concept → Alignment → Race → Class → Subclass →
  Backgrounds → 135-point buy → auto-fill level-1 granted skills → spend level-1 KAP. The class's
  `suggestedAllocation` pre-fills the KAP split and the recommended starting skills, so a new user
  can click "use recommended" and get a legal character; power users tweak.
- **Live affordability**: the wizard calls `derive()` on every change and reads `diagnostics` +
  `pools` to grey out unaffordable buys, flag unmet dependencies, and prompt the fok-4 attribute
  choice — no bespoke validation logic in the components.
- **Level-up flow**: "Add level" appends a `LevelRecord` seeded from `suggestedAllocation`; same
  spend UI as creation step's last page.
- **Warnings, not walls.** Every editor surface — wizard spend pages and the advanced ledger —
  reports `diagnostics` but **never hard-blocks** (overspending, unmet deps, missing fok-4 choice all
  render as warnings; a KM can deliberately leave a character "illegal"). The **one exception** is the
  **attribute (point-buy) screen**, which *always* hard-constrains `pointBuy` to **sum to exactly 135**
  (counting only the base allocation, never later progression) — `+` disables at the cap / racial
  limit, just like today's `StatsEditor`, but enforcing the exact total rather than just a ceiling.
- **Advanced/free editing**: a ledger view exposes every `LevelRecord` for direct edits;
  re-derivation + diagnostics keep it honest (warnings only). Same data path as the wizard.
- **KM panel**: append `Adjustment`s (e.g. +Kegy for good roleplay), shown distinctly on the sheet.

---

## 7. Persistence, versioning, migration

- **Format**: `CharacterRecord` serializes to plain JSON as-is (no functions). `derivedStats` is
  never persisted — it's recomputed. Start with `localStorage` (a `characters` array + active id);
  the shape is backend-ready later.
- **`schemaVersion`** + a `migrations[]` pipeline (`vN → vN+1`). Cheap now, essential once real
  characters exist.
- **Existing data**: `src/data/*` stays as the rules catalog (extended per §3). `src/legacy_data/*`
  is dead (no imports) — leave as reference or delete. `defaultCharacter.ts` is a *snapshot*; it
  can't be losslessly reversed into a ledger, so either re-author it as a `CharacterRecord` by hand
  (good test fixture) or drop it.

---

## 8. Fixes to fold in while rebuilding

- One source of truth for `Race` keys; delete the `FélElf`/`Félelf`, `UdvariOrk`/`Udvari Ork`
  mismatch in `class.ts` (the `as ClassInfo` casts currently hide it).
- `Character.class` becomes the `Class` union, not `string`.
- Model the fields that are currently hardcoded JSX on the sheet: name, alignment, religion,
  homeland, equipment, and the combat-value rows (drive `CombatValuesPanel` from `derive()`).
- Replace `calcBonuses(): 0` and the loose `Modifier`/`TagValues` scaffolding with the `Effect`
  fold. Tags become `{kind:"tag"}` effects; their mechanical riders become other effects.

---

## 9. Suggested module layout

```
src/rules/            # Layer 1 (extended data + lookups)   ── re-home src/data/* here over time
  effects.ts          # Effect union + helpers
  skills.ts weapons.ts armor.ts magic/*  races.ts classes.ts backgrounds.ts
src/character/
  model.ts            # Layer 2 types (CharacterRecord, LevelRecord, …)
  derive/             # Layer 3 engine
    index.ts          # derive(db, record)
    stages/*.ts       # base-stats, kap, skills, hm, vitals, …
    provenance.ts diagnostics.ts memo.ts
  migrations.ts persistence.ts
src/components/character/{wizard,editor,sheet}/   # UI writes records, reads DerivedCharacter
```

---

## 10. Phased implementation

1. **Types + engine skeleton** — `Effect`, `CharacterRecord`, `derive()` computing base/derived
   stats from `pointBuy`+race+age (no ledger yet). Re-author `defaultCharacter` as a record fixture.
2. **KAP economy + HM** — per-level budget, allocations, HM→channel assignments, vital maxes,
   diagnostics. Replaces the hardcoded combat/mana numbers.
3. **Skills** — cost curves, %-skills, dependency ordering, unmet-req penalty, fok-4 bonus,
   `resourcePerLevel`. Encode skill cost metadata.
4. **Rules grants** — populate race/class/subclass/background `grants[]`; auto-fill starting skills;
   `suggestedAllocation`.
5. **Builder wizard** (simple path) + **level-up** + **KM panel**, then the advanced ledger editor.
6. **Persistence + migrations**.

---

## 11. Decisions — resolved

1. **Carry-over** — ✅ always legal; cumulative balance per resource, mid-level/saved-up spending fine.
2. **Skill cost** — ✅ cumulative, **four curves keyed by difficulty I/II/III/IV** (exact numbers from
   chapter-16 table, encoded in `TIER_COST`); `cost = curve[to] − curve[from]`; teaching discount −2/increment
   (min 1, up to fok 4); unmet-attribute penalty = Σ deficits.
3. **Point-buy** — ✅ 135-point buy, hard-enforced to sum to exactly 135 on the attribute screen
   (base only); no dice-roll path.
4. **Subtypes** — ✅ plain free-text string on owned skills; catalog models nothing about them.
5. **Edit legality** — ✅ warnings only everywhere, except the 135 point-buy constraint.
6. **Resource gating** — ✅ background ⇒ pool exists; skill ⇒ spells known; pool points ⇒ castable now.
7. **Fok-4 attribute bonus** — ✅ implicit for any tiered skill with required attributes (no flag).

Architecture and all open questions are now settled — nothing left but data entry (encoding each
skill/class/background's `attrs`, `grants`, `perFokEffects`, and each spell's `pool`+`requires`).
