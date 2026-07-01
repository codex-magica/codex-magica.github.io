import React, { useState } from "react";
import { Box, Heading, HStack, Input, Select, Text } from "@chakra-ui/react";
import { CharacterRecord, getLevelRecord } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { SKILLS, SKILL_BY_NAME } from "../model/skills";
import { Stat, STAT_SHORT, STAT_KEYS } from "../model/attributes";
import { SkillCategory, SKILL_CATEGORIES } from "../model/common";
import { skillKpCost, teachingUptoFor } from "../engine/skillCost";
import { Stepper } from "./Stepper";
import { DeleteButton } from "./controls";
import { DetailModal, ModalState } from "./DetailModal";
import { skillModalSub, skillModalBody } from "./compendiumData";
import { FS_NAME, ROW_PY } from "./tokens";

type View = "meglevo" | "tanult" | "egyeb"; // meglévő = megszerzett · tanult = van rá oktató · egyéb = a többi

interface Props {
  level: number;
  record: CharacterRecord;
  derived: DerivedCharacter;
  onUpsert: (level: number, skill: string, subtype: string | undefined, to: number) => void;
  onRemove: (level: number, skill: string, subtype: string | undefined) => void;
  onAddVariant: (level: number, skill: string, parent?: string) => void;
  onPatchVariant: (level: number, id: string, patch: Partial<{ subtype: string; from: number; to: number; parent: string }>) => void;
  onRemoveVariant: (level: number, id: string) => void;
  onOverride: (originalKey: string, value: string) => void;
  onSetSubtype: (level: number, skill: string, oldSubtype: string | undefined, newSubtype: string | undefined) => void;
  onSetFok4Stat: (skill: string, subtype: string | undefined, variantId: string | undefined, stat: Stat | null) => void;
  onSetPathChoice: (skill: string, subtype: string | undefined, variantId: string | undefined, trigger: string, value: string | null) => void;
  onSetChosenAttrs: (level: number, skill: string, subtype: string | undefined, variantId: string | undefined, attrs: Stat[]) => void;
}

const keyOf = (skill: string, subtype?: string) => (subtype ? `${skill}|${subtype}` : skill);

const SUBW = { base: "170px", md: "128px" };

// ── shared inline bits (tokenized to the "Kódex" system) ──
const TeacherBadge: React.FC<{ n: number }> = ({ n }) => (
  <Box as="span" fontFamily="system-ui" fontSize="10px" fontWeight={700} px="5px" borderRadius="5px" bg="teacherBg" color="teacherTx" lineHeight="1.4" flexShrink={0}>
    T{n}
  </Box>
);
const KapottBadge: React.FC<{ text?: string }> = ({ text = "kapott" }) => (
  <Box as="span" fontFamily="system-ui" fontSize="9px" fontWeight={700} letterSpacing=".08em" textTransform="uppercase" px="6px" py="2px" borderRadius="5px" bg="kapottBg" color="kapottTx" whiteSpace="nowrap" flexShrink={0}>
    {text}
  </Box>
);
export const SkillLevelPanel: React.FC<Props> = ({
  level,
  record,
  derived,
  onUpsert,
  onRemove,
  onAddVariant,
  onPatchVariant,
  onRemoveVariant,
  onOverride,
  onSetSubtype,
  onSetFok4Stat,
  onSetPathChoice,
  onSetChosenAttrs,
}) => {
  const [view, setView] = useState<View>("meglevo");
  // Whether the "relearn a skill" picker (add another instance of an already-learned branchable skill) is open.
  const [relearnOpen, setRelearnOpen] = useState(false);
  // The skill name whose fok-4 "+1 attribute" popover is open, or null.
  const [fok4Open, setFok4Open] = useState<string | null>(null);
  // The instance key whose Pszi-path popover is open, or null.
  const [pathOpen, setPathOpen] = useState<string | null>(null);
  // The instance key whose "choose attributes" popover is open (Művészetek), or null.
  const [attrsOpen, setAttrsOpen] = useState<string | null>(null);
  // Skill-details modal (same content as the compendium / sheet), opened by clicking a skill name.
  const [skillModal, setSkillModal] = useState<ModalState | null>(null);
  const openSkillModal = (name: string) => {
    const owned = derived.skills.filter((s) => s.skill === name);
    const isPct = owned.some((s) => s.percent != null);
    const percent = isPct ? Math.max(0, ...owned.map((s) => s.percent ?? 0)) : null;
    const fok = isPct ? 0 : Math.max(0, ...owned.map((s) => s.fok));
    setSkillModal({
      kind: "skill",
      name,
      sub: skillModalSub(name),
      body: skillModalBody(name),
      levelStrip: percent != null ? `A te értéked: ${percent}%` : fok > 0 ? `A te fokod: ${fok}. fok` : undefined,
      currentFok: percent == null && fok > 0 ? fok : undefined,
    });
  };
  const kap = derived.pools.kapBalanceByLevel[level - 1] ?? 0;
  const lvl = getLevelRecord(record, level);
  const purchases = lvl?.skillPurchases ?? [];
  const variants = purchases.filter((p) => p.id);

  const grantedFloor: Record<string, number> = {};
  derived.grantedSkills.forEach((g) => {
    grantedFloor[keyOf(g.skill, g.subtype)] = g.percent != null ? g.percent : g.fok;
  });
  // The dec floor on THIS level: grants + everything bought in PRIOR levels (can't un-learn past progress).
  // floorByLevel[level-1] is the snapshot at the start of this level — equals grants at level 1.
  const inheritedFloor: Record<string, number> = {};
  (derived.floorByLevel[level - 1] ?? derived.grantedSkills).forEach((g) => {
    inheritedFloor[keyOf(g.skill, g.subtype)] = g.percent != null ? g.percent : g.fok;
  });

  // User-added branches carry a variantId in the derived list; everything else is a "real" owned instance
  // (trunk / grant). This is collision-proof — an unnamed branch no longer masquerades as the trunk.
  const ownedInstances = derived.skills.filter((s) => s.variantId == null);
  // Teacher (oktatás) level for a specific INSTANCE — subtype-aware, so a branch-scoped teacher (e.g. Elf's
  // Vadonjárás(erdő)) only counts for that branch.
  const teacherOf = (skill: string, subtype?: string) => teachingUptoFor(derived.teachingDiscounts, SKILL_BY_NAME[skill], subtype);
  // Is the WHOLE skill taught (a general / category / all-skills teacher, not a branch-scoped one)?
  const generallyTaught = (skill: string) => {
    const def = SKILL_BY_NAME[skill];
    return derived.teachingDiscounts.some((d) => !d.subtype && (d.allSkills || (d.skill ? d.skill === skill : d.category === def.category)));
  };
  // Distinct subtypes of a skill that have a dedicated (branch-scoped) teacher, e.g. Vadonjárás → ["erdő"].
  const taughtBranchesOf = (skill: string) =>
    Array.from(new Set(derived.teachingDiscounts.filter((d) => d.subtype && d.skill === skill).map((d) => d.subtype!)));
  const stepCost = (skill: string, from: number, to: number, subtype?: string, attrs?: Stat[]) =>
    skillKpCost(SKILL_BY_NAME[skill], from, to, teacherOf(skill, subtype), derived.effectiveStats, attrs).kp;
  // Datalist suggestions for an open free-text branch: the subtypes already learned for this skill, plus any
  // branch the character has an oktató for (e.g. Vadonjárás erdő). Free text still allowed.
  const subtypeSuggestions = (skill: string): string[] =>
    Array.from(
      new Set([
        ...derived.skills.filter((s) => s.skill === skill && s.subtype).map((s) => s.subtype!),
        ...derived.teachingDiscounts.filter((d) => d.subtype && d.skill === skill).map((d) => d.subtype!),
      ])
    );

  // Skills that can be RE-learned (added as another independent row): branchable AND already learned/owned.
  const relearnable = SKILLS.filter(
    (d) => d.branch != null && (ownedInstances.some((s) => s.skill === d.name) || variants.some((p) => p.skill === d.name))
  );

  const skillHasContent = (name: string) =>
    ownedInstances.some((s) => s.skill === name) || variants.some((p) => p.skill === name);
  // A list row: a skill, optionally pinned to a taught BRANCH (subtype) — so "Vadonjárás (erdő)" can sit in
  // Tanult while the general "Vadonjárás" sits in Egyéb.
  type Entry = { skill: string; subtype?: string };
  const entriesInCat = (cat: SkillCategory): Entry[] => {
    const defs = SKILLS.filter((d) => d.category === cat);
    if (view === "meglevo") return defs.filter((d) => skillHasContent(d.name)).map((d) => ({ skill: d.name }));
    if (view === "egyeb")
      // Not owned AND the whole skill isn't taught. A branch-scoped teacher does NOT pull the general skill out.
      return defs.filter((d) => !skillHasContent(d.name) && !generallyTaught(d.name)).map((d) => ({ skill: d.name }));
    // tanult: generally-taught skills as-is, plus a pinned entry per branch-scoped taught branch.
    const entries: Entry[] = [];
    for (const d of defs) {
      if (generallyTaught(d.name)) entries.push({ skill: d.name });
      else for (const sub of taughtBranchesOf(d.name)) entries.push({ skill: d.name, subtype: sub });
    }
    return entries;
  };

  // ── reusable controls ──
  const subtypeInput = (value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, list?: string) => (
    <Input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      list={list}
      w={SUBW}
      flexShrink={0}
      size="sm"
      bg="fieldBg"
      borderColor="fieldBd"
      borderRadius="7px"
      color="fg"
      fontStyle="italic"
      fontSize="13.5px"
      focusBorderColor="accent"
      _focus={{ borderColor: "accent", boxShadow: "0 0 0 2px var(--chakra-colors-accentSoft)" }}
    />
  );

  // Subtype editor: a closed dropdown when the skill declares a fixed `subtypes` set, else free text.
  // For enumerated skills the subtype is MANDATORY — an empty one is flagged invalid (red).
  // For a two-tier skill (Fegyverhasználat) at a fok ABOVE the category cap, the instance is a specific
  // weapon — offer a datalist of all weapons rather than the category dropdown.
  const subtypeControl = (skill: string, value: string, setValue: (v: string) => void, fok?: number) => {
    const lvl0 = SKILL_BY_NAME[skill]?.branch?.[0];
    if (lvl0?.branchAbove != null && fok != null && fok > lvl0.branchAbove) {
      const all = lvl0.options?.flatMap((o) => o.children ?? []) ?? [];
      const listId = `wl-all-${skill}`.replace(/[^a-zA-Z0-9]+/g, "-");
      return (
        <Box flexShrink={0} w={SUBW}>
          {subtypeInput(value, (e) => setValue(e.target.value), "konkrét fegyver…", all.length ? listId : undefined)}
          {all.length > 0 && <datalist id={listId}>{Array.from(new Set(all)).map((c) => <option key={c} value={c} />)}</datalist>}
        </Box>
      );
    }
    const opts = SKILL_BY_NAME[skill]?.subtypes;
    if (opts && opts.length) {
      const invalid = !value;
      return (
        <Select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="altípus kötelező…"
          isInvalid={invalid}
          errorBorderColor="bad"
          w={SUBW}
          flexShrink={0}
          size="sm"
          bg="fieldBg"
          borderColor={invalid ? "bad" : "fieldBd"}
          borderRadius="7px"
          color="fg"
          fontSize="13.5px"
          focusBorderColor="accent"
        >
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      );
    }
    const sugg = subtypeSuggestions(skill);
    const listId = `sub-${skill}`.replace(/[^a-zA-Z0-9]+/g, "-");
    return (
      <Box flexShrink={0} w={SUBW}>
        {subtypeInput(value, (e) => setValue(e.target.value), "altípus", sugg.length ? listId : undefined)}
        {sugg.length > 0 && <datalist id={listId}>{sugg.map((c) => <option key={c} value={c} />)}</datalist>}
      </Box>
    );
  };

  // Learn a skill — a quiet outline button with the open-book icon (signals "learn", not "selected"). A
  // `subtype` pre-specialises the learn (e.g. a taught branch: Vadonjárás(erdő)).
  const tanulBtn = (name: string, subtype?: string) => (
    <Box
      as="button"
      type="button"
      title="Képzettség tanulása"
      border="1px solid"
      borderColor="fieldBd"
      bg="transparent"
      color="accentTx"
      px="13px"
      py="7px"
      borderRadius="9px"
      fontWeight={600}
      fontSize={{ base: "16.5px", md: "15px" }}
      whiteSpace="nowrap"
      flexShrink={0}
      display="inline-flex"
      alignItems="center"
      gap="7px"
      _hover={{ borderColor: "accent", bg: "accentSoft" }}
      onClick={() => onUpsert(level, name, subtype, 1)}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 5.5h6.5a3 3 0 0 1 3 3V20a2.4 2.4 0 0 0-2.4-2.4H2z" />
        <path d="M22 5.5h-6.5a3 3 0 0 0-3 3V20a2.4 2.4 0 0 1 2.4-2.4H22z" />
      </svg>
      Tanul
    </Box>
  );

  // The player's stored fok-4 +1 choice for a specific INSTANCE (a branch by variantId, else skill+subtype).
  const fok4Stat = (skill: string, subtype?: string, variantId?: string): Stat | undefined =>
    record.fok4Bonuses?.find((b) =>
      variantId != null ? b.variantId === variantId : b.variantId == null && b.skill === skill && (b.subtype ?? "") === (subtype ?? "")
    )?.stat as Stat | undefined;

  // The "4. fok: +1 tulajdonság" badge for one fok-4 instance (identified by skill+subtype, or variantId for
  // a branch). Single-attr → a quiet info chip (auto-applied by the engine); multi-attr → a popover picker,
  // loud (red) until a choice is made. Every fok-4 instance carries its own.
  const fok4Badge = (skill: string, subtype?: string, variantId?: string, instAttrs?: Stat[]) => {
    const attrs = instAttrs && instAttrs.length ? instAttrs : SKILL_BY_NAME[skill]?.attrs ?? [];
    if (attrs.length === 0) return null;
    if (attrs.length === 1) {
      return (
        <Box as="span" fontFamily="system-ui" fontSize="9px" fontWeight={700} letterSpacing=".04em" px="6px" py="2px" borderRadius="5px" bg="accentSoft" color="accentTx" whiteSpace="nowrap" flexShrink={0} title={`4. fok: +1 ${attrs[0]}`}>
          +1 {STAT_SHORT[attrs[0]]}
        </Box>
      );
    }
    const openKey = variantId ? `v:${variantId}` : `s:${keyOf(skill, subtype)}`;
    const chosen = fok4Stat(skill, subtype, variantId);
    const open = fok4Open === openKey;
    return (
      <Box position="relative" flexShrink={0}>
        <Box as="button" type="button" title="4. fok: válassz +1 tulajdonságot" onClick={() => setFok4Open(open ? null : openKey)}
          display="inline-flex" alignItems="center" gap="4px" px="7px" py="3px" borderRadius="6px" border="1px solid"
          fontFamily="system-ui" fontSize="9.5px" fontWeight={700} letterSpacing=".04em" whiteSpace="nowrap"
          bg={chosen ? "accentSoft" : "badSoft"} color={chosen ? "accentTx" : "bad"} borderColor={chosen ? "accentBd" : "bad"}>
          {chosen ? `+1 ${STAT_SHORT[chosen]}` : "+1 tul."}
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </Box>
        {open && (
          <>
            <Box position="fixed" inset={0} zIndex={29} onClick={() => setFok4Open(null)} />
            <Box position="absolute" top="calc(100% + 6px)" right={0} zIndex={30} bg="band" border="1px solid" borderColor="hair" borderRadius="12px" p="13px" minW="max-content" sx={{ boxShadow: "0 16px 40px rgba(0,0,0,.32)" }}>
              <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".09em" textTransform="uppercase" color="muted" mb="9px" whiteSpace="nowrap">+1 tulajdonság (4. fok)</Text>
              <HStack gap="7px">
                {attrs.map((a) => (
                  <Box as="button" key={a} type="button" onClick={() => { onSetFok4Stat(skill, subtype, variantId, a); setFok4Open(null); }}
                    px="12px" h={{ base: "44px", md: "38px" }} borderRadius="9px" border="1px solid"
                    borderColor={a === chosen ? "accent" : "fieldBd"} bg={a === chosen ? "accentSoft" : "fieldBg"} color={a === chosen ? "accentTx" : "fg"}
                    fontWeight={700} fontSize="14px" display="flex" alignItems="center" justifyContent="center" whiteSpace="nowrap" _hover={{ borderColor: "accent" }}>
                    {a}
                  </Box>
                ))}
              </HStack>
            </Box>
          </>
        )}
      </Box>
    );
  };

  // Pszi-style committing path badge (tudat/test at fok 3). Loud (red) until the player commits; forced.
  const pathChoiceVal = (skill: string, subtype: string | undefined, variantId: string | undefined, trigger: string): string | undefined =>
    record.pathChoices?.find((c) => (variantId != null ? c.variantId === variantId : c.variantId == null && c.skill === skill && (c.subtype ?? "") === (subtype ?? "")) && c.trigger === trigger)?.value;
  const pathBadge = (skill: string, subtype: string | undefined, variantId: string | undefined, fok: number) => {
    const trig = SKILL_BY_NAME[skill]?.fokTriggers?.find((t) => t.kind === "path");
    if (!trig || trig.kind !== "path" || fok < trig.atFok) return null;
    const openKey = (variantId ? `v:${variantId}` : `s:${keyOf(skill, subtype)}`) + `|${trig.label}`;
    const chosen = pathChoiceVal(skill, subtype, variantId, trig.label);
    const open = pathOpen === openKey;
    return (
      <Box position="relative" flexShrink={0}>
        <Box as="button" type="button" title={`${trig.atFok}. fok: válassz utat`} onClick={() => setPathOpen(open ? null : openKey)}
          display="inline-flex" alignItems="center" gap="4px" px="7px" py="3px" borderRadius="6px" border="1px solid"
          fontFamily="system-ui" fontSize="9.5px" fontWeight={700} letterSpacing=".04em" whiteSpace="nowrap"
          bg={chosen ? "accentSoft" : "badSoft"} color={chosen ? "accentTx" : "bad"} borderColor={chosen ? "accentBd" : "bad"}>
          {chosen ?? trig.label + "?"}
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </Box>
        {open && (
          <>
            <Box position="fixed" inset={0} zIndex={29} onClick={() => setPathOpen(null)} />
            <Box position="absolute" top="calc(100% + 6px)" right={0} zIndex={30} bg="band" border="1px solid" borderColor="hair" borderRadius="12px" p="13px" minW="max-content" sx={{ boxShadow: "0 16px 40px rgba(0,0,0,.32)" }}>
              <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".09em" textTransform="uppercase" color="muted" mb="9px" whiteSpace="nowrap">{trig.label} ({trig.atFok}. fok)</Text>
              <HStack gap="7px">
                {trig.options.map((o) => (
                  <Box as="button" key={o} type="button" onClick={() => { onSetPathChoice(skill, subtype, variantId, trig.label, o === chosen ? null : o); setPathOpen(null); }}
                    px="12px" h={{ base: "44px", md: "38px" }} borderRadius="9px" border="1px solid"
                    borderColor={o === chosen ? "accent" : "fieldBd"} bg={o === chosen ? "accentSoft" : "fieldBg"} color={o === chosen ? "accentTx" : "fg"}
                    fontWeight={700} fontSize="14px" display="flex" alignItems="center" justifyContent="center" whiteSpace="nowrap" _hover={{ borderColor: "accent" }}>
                    {o}
                  </Box>
                ))}
              </HStack>
            </Box>
          </>
        )}
      </Box>
    );
  };

  // Choose-attributes badge for an open branch (Művészetek): the player toggles which attributes govern it.
  const attrsBadge = (skill: string, subtype: string | undefined, variantId: string | undefined, current: Stat[]) => {
    if (!SKILL_BY_NAME[skill]?.branch?.some((b) => b.chooseAttrs)) return null;
    const openKey = (variantId ? `v:${variantId}` : `s:${keyOf(skill, subtype)}`) + "|attrs";
    const open = attrsOpen === openKey;
    const toggle = (a: Stat) => onSetChosenAttrs(level, skill, subtype, variantId, current.includes(a) ? current.filter((x) => x !== a) : current.concat([a]));
    return (
      <Box position="relative" flexShrink={0}>
        <Box as="button" type="button" title="Válaszd meg a tulajdonság-igényt" onClick={() => setAttrsOpen(open ? null : openKey)}
          display="inline-flex" alignItems="center" gap="4px" px="7px" py="3px" borderRadius="6px" border="1px solid"
          fontFamily="system-ui" fontSize="9.5px" fontWeight={700} letterSpacing=".04em" whiteSpace="nowrap"
          bg={current.length ? "accentSoft" : "fieldBg"} color={current.length ? "accentTx" : "muted"} borderColor={current.length ? "accentBd" : "fieldBd"}>
          {current.length ? current.map((a) => STAT_SHORT[a]).join("·") : "tul.?"}
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </Box>
        {open && (
          <>
            <Box position="fixed" inset={0} zIndex={29} onClick={() => setAttrsOpen(null)} />
            <Box position="absolute" top="calc(100% + 6px)" right={0} zIndex={30} bg="band" border="1px solid" borderColor="hair" borderRadius="12px" p="13px" w="max-content" maxW="280px" sx={{ boxShadow: "0 16px 40px rgba(0,0,0,.32)" }}>
              <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".09em" textTransform="uppercase" color="muted" mb="9px">Tulajdonság-igény</Text>
              <HStack gap="6px" flexWrap="wrap">
                {STAT_KEYS.map((a) => (
                  <Box as="button" key={a} type="button" onClick={() => toggle(a)}
                    px="9px" h="34px" borderRadius="8px" border="1px solid"
                    borderColor={current.includes(a) ? "accent" : "fieldBd"} bg={current.includes(a) ? "accentSoft" : "fieldBg"} color={current.includes(a) ? "accentTx" : "fg"}
                    fontWeight={700} fontSize="12.5px" display="flex" alignItems="center" justifyContent="center" _hover={{ borderColor: "accent" }}>
                    {STAT_SHORT[a]}
                  </Box>
                ))}
              </HStack>
            </Box>
          </>
        )}
      </Box>
    );
  };

  const nameGroup = (name: string, teacher: number) => (
    <HStack spacing="7px" flex="0 1 auto" minW={0}>
      <Box as="button" type="button" onClick={() => openSkillModal(name)} title="Részletek" textAlign="left" fontSize={FS_NAME} fontWeight={600} color="fg" whiteSpace="nowrap" _hover={{ color: "accentTx", textDecoration: "underline" }}>{name}</Box>
      {teacher > 0 && <TeacherBadge n={teacher} />}
    </HStack>
  );

  const rowShell = (
    key: string,
    left: React.ReactNode,
    subtype: React.ReactNode,
    kapott: React.ReactNode,
    stepper: React.ReactNode,
    trailing: React.ReactNode
  ) => (
    <HStack key={key} spacing="9px" py={ROW_PY} borderBottom="1px solid" borderColor="hair" align="center">
      {left}
      {subtype}
      {trailing}
      {kapott}
      <Box flex="1 1 auto" minW="8px" />
      {stepper}
    </HStack>
  );

  // A granted or first-learned instance (no variant id) — an independent row. A branchable skill always
  // shows its subtype control (fixed dropdown / free text / fok-aware weapon); its subtype edits go through
  // the origSubtype-keyed override (grants) or the combined learned setter.
  const instRow = (inst: { skill: string; subtype?: string; origSubtype?: string; fok: number; percent?: number; attrs?: Stat[]; placeholder?: boolean }) => {
    const isPct = inst.percent != null;
    const cur = isPct ? inst.percent! : inst.fok;
    const grantFloor = grantedFloor[keyOf(inst.skill, inst.subtype)] || 0;
    const floor = inheritedFloor[keyOf(inst.skill, inst.subtype)] || 0;
    const teacher = teacherOf(inst.skill, inst.subtype);
    const step = isPct ? (teacher > 0 ? 5 : 3) : 1;
    const atMax = isPct ? cur >= 100 : cur >= 5;
    const cost = atMax ? 0 : stepCost(inst.skill, cur, cur + step, inst.subtype, inst.attrs);
    const showFok4 = !isPct && cur >= 4;
    const branchable = SKILL_BY_NAME[inst.skill]?.branch != null;
    return rowShell(
      keyOf(inst.skill, inst.origSubtype) + ":g",
      nameGroup(inst.skill, teacher),
      branchable
        ? subtypeControl(inst.skill, inst.subtype || "", (v) =>
            inst.origSubtype != null
              ? onOverride(keyOf(inst.skill, inst.origSubtype), v)
              : onSetSubtype(level, inst.skill, inst.subtype, v), cur)
        : null,
      <>{grantFloor > 0 && <KapottBadge />}{inst.placeholder && <KapottBadge text="válassz" />}{attrsBadge(inst.skill, inst.subtype, undefined, inst.attrs ?? [])}{showFok4 && fok4Badge(inst.skill, inst.subtype, undefined, inst.attrs)}{pathBadge(inst.skill, inst.subtype, undefined, cur)}</>,
      <Stepper
        value={isPct ? `${cur}%` : `${cur}.`}
        incLabel={atMax ? undefined : String(cost)}
        decDisabled={cur <= floor}
        incDisabled={atMax || cost > kap}
        onDec={() => (cur - step <= floor ? onRemove(level, inst.skill, inst.subtype) : onUpsert(level, inst.skill, inst.subtype, cur - step))}
        onInc={() => onUpsert(level, inst.skill, inst.subtype, cur + step)}
      />,
      null
    );
  };

  // A RE-learned instance (its own variant id): an independent extra row — subtype + fok + delete. Only
  // ever branchable skills (the relearn picker offers only those), so never a percentage skill.
  const varRow = (p: { id?: string; skill: string; subtype?: string; to: number }) => {
    const atMax = p.to >= 5;
    const vAttrs = derived.skills.find((s) => s.variantId === p.id)?.attrs;
    const cost = atMax ? 0 : stepCost(p.skill, p.to, p.to + 1, p.subtype, vAttrs);
    const showFok4 = p.to >= 4;
    return rowShell(
      p.id!,
      nameGroup(p.skill, teacherOf(p.skill, p.subtype)),
      subtypeControl(p.skill, p.subtype || "", (v) => onPatchVariant(level, p.id!, { subtype: v }), p.to),
      <>{attrsBadge(p.skill, p.subtype, p.id, vAttrs ?? [])}{showFok4 && fok4Badge(p.skill, p.subtype, p.id, vAttrs)}{pathBadge(p.skill, p.subtype, p.id, p.to)}</>,
      <Stepper
        value={`${p.to}.`}
        incLabel={atMax ? undefined : String(cost)}
        decDisabled={p.to <= 1}
        incDisabled={atMax || cost > kap}
        onDec={() => onPatchVariant(level, p.id!, { to: p.to - 1 })}
        onInc={() => onPatchVariant(level, p.id!, { to: p.to + 1 })}
      />,
      <DeleteButton onClick={() => onRemoveVariant(level, p.id!)} />
    );
  };

  const filterSeg = (v: View, label: string) => (
    <Box
      as="button"
      type="button"
      key={v}
      px="12px"
      py="6px"
      borderRadius="8px"
      fontFamily="system-ui"
      fontSize="13px"
      fontWeight={600}
      whiteSpace="nowrap"
      bg={view === v ? "accentSoft" : "transparent"}
      color={view === v ? "accentTx" : "muted"}
      transition="background .12s, color .12s"
      onClick={() => setView(v)}
    >
      {label}
    </Box>
  );

  return (
    <Box>
      <HStack justify="space-between" mb={2} align="center">
        <Heading fontSize={{ base: "23px", md: "20px" }} fontWeight={700} color="fg">
          Képzettségek <Text as="span" fontSize=".65em" fontWeight={500} color="fgFaint">— {level}. szint</Text>
        </Heading>
        <Text fontFamily="system-ui" fontSize="13px" fontWeight={700} color={kap < 0 ? "bad" : "accentTx"} sx={{ fontVariantNumeric: "tabular-nums" }}>
          KAP: {kap}
        </Text>
      </HStack>

      <HStack justify="space-between" align="center" mb={1} spacing="8px">
        <HStack spacing="2px" bg="band" border="1px solid" borderColor="hair" borderRadius="10px" p="3px" w="fit-content">
          {filterSeg("meglevo", "Meglévő")}
          {filterSeg("tanult", "Tanult")}
          {filterSeg("egyeb", "Egyéb")}
        </HStack>
        {relearnable.length > 0 && (
          <Box position="relative" flexShrink={0}>
            <Box as="button" type="button" title="Egy már tanult, ágazható képzettség újratanulása"
              onClick={() => setRelearnOpen((o) => !o)}
              display="inline-flex" alignItems="center" gap="5px" px="11px" py="7px" borderRadius="9px"
              border="1px solid" borderColor="fieldBd" bg="transparent" color="accentTx" fontWeight={600}
              fontFamily="system-ui" fontSize="13px" whiteSpace="nowrap" _hover={{ borderColor: "accent", bg: "accentSoft" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Újratanulás
            </Box>
            {relearnOpen && (
              <>
                <Box position="fixed" inset={0} zIndex={29} onClick={() => setRelearnOpen(false)} />
                <Box position="absolute" top="calc(100% + 6px)" right={0} zIndex={30} bg="band" border="1px solid" borderColor="hair" borderRadius="12px" p="8px" minW="220px" maxH="320px" overflowY="auto" sx={{ boxShadow: "0 16px 40px rgba(0,0,0,.32)" }}>
                  <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".09em" textTransform="uppercase" color="muted" px="8px" py="6px">
                    Melyiket tanulod újra?
                  </Text>
                  {relearnable.map((d) => (
                    <Box as="button" key={d.name} type="button" w="100%" textAlign="left" px="8px" py="8px" borderRadius="8px"
                      fontFamily="system-ui" fontSize="14px" fontWeight={600} color="fg" _hover={{ bg: "accentSoft", color: "accentTx" }}
                      onClick={() => { onAddVariant(level, d.name); setRelearnOpen(false); }}>
                      {d.name}
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Box>
        )}
      </HStack>

      <Box sx={{
        // separators between items only — drop the trailing one (the deepest last leaf row, whether the
        // last category's last skill is a plain row or a trunk+branches group).
        "& > div:last-child > :last-child": { borderBottom: "none" },
        "& > div:last-child > :last-child > :last-child": { borderBottom: "none" },
      }}>
        {SKILL_CATEGORIES.map((cat) => {
          const entries = entriesInCat(cat);
          if (entries.length === 0) return null;
          return (
            <Box key={cat}>
              <Text fontFamily="system-ui" fontSize="11px" fontWeight={700} letterSpacing=".11em" textTransform="uppercase" color="catTx" mt="13px" mb="1px">
                {cat}
              </Text>
              {entries.map((e) => {
                // A branch-pinned entry (e.subtype) matches only that subtype's instances; a plain entry matches all.
                const match = <T extends { subtype?: string }>(x: T) => e.subtype == null || (x.subtype ?? "") === e.subtype;
                const insts = ownedInstances.filter((s) => s.skill === e.skill && match(s));
                const vars = variants.filter((p) => p.skill === e.skill && match(p));
                const key = `${e.skill}|${e.subtype ?? ""}`;
                if (insts.length === 0 && vars.length === 0) {
                  const label = e.subtype ? `${e.skill} (${e.subtype})` : e.skill;
                  return (
                    <HStack key={key} spacing="9px" py={ROW_PY} borderBottom="1px solid" borderColor="hair" align="center">
                      <Box as="button" type="button" onClick={() => openSkillModal(e.skill)} title="Részletek" textAlign="left" fontSize={FS_NAME} fontWeight={600} color="fg" whiteSpace="nowrap" _hover={{ color: "accentTx", textDecoration: "underline" }}>{label}</Box>
                      {teacherOf(e.skill, e.subtype) > 0 && <TeacherBadge n={teacherOf(e.skill, e.subtype)} />}
                      <Box flex="1 1 auto" minW="8px" />
                      {tanulBtn(e.skill, e.subtype)}
                    </HStack>
                  );
                }
                // Each learning is an independent row (grants + first-learn, then any re-learned instances).
                return (
                  <Box key={key}>
                    {insts.map((inst) => instRow(inst))}
                    {vars.map((p) => varRow(p))}
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>

      {derived.allowedSkills.length > 0 && (
        <Box mt="16px" pt="12px" borderTop="1px solid" borderColor="hair">
          <Text fontFamily="system-ui" fontSize="11px" fontWeight={700} letterSpacing=".11em" textTransform="uppercase" color="catTx" mb="6px">
            Tanulható — KM engedélyével
          </Text>
          <HStack flexWrap="wrap" gap="7px">
            {derived.allowedSkills.map((a, i) => (
              <Box key={i} as="span" fontFamily="system-ui" fontSize="12.5px" fontWeight={600} px="9px" py="4px" borderRadius="7px" bg="fieldBg" border="1px dashed" borderColor="fieldBd" color="muted" whiteSpace="nowrap">
                {a.skill}{a.subtype ? ` (${a.subtype})` : ""}
              </Box>
            ))}
          </HStack>
        </Box>
      )}

      <DetailModal modal={skillModal} onClose={() => setSkillModal(null)} />
    </Box>
  );
};
