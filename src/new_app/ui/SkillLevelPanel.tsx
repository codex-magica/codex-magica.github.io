import React, { useState, useEffect } from "react";
import { Box, Heading, HStack, Input, Select, Text } from "@chakra-ui/react";
import { CharacterRecord, getLevelRecord } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { SKILLS, SKILL_BY_NAME } from "../model/skills";
import { SkillCategory, SKILL_CATEGORIES } from "../model/common";
import { skillKpCost } from "../engine/skillCost";
import { Stepper } from "./Stepper";
import { DeleteButton } from "./controls";
import { FS_NAME, ROW_PY } from "./tokens";

type View = "learned" | "taught" | "all";

interface Props {
  level: number;
  record: CharacterRecord;
  derived: DerivedCharacter;
  onUpsert: (level: number, skill: string, subtype: string | undefined, to: number) => void;
  onRemove: (level: number, skill: string, subtype: string | undefined) => void;
  onAddVariant: (level: number, skill: string) => void;
  onPatchVariant: (level: number, id: string, patch: Partial<{ subtype: string; from: number; to: number }>) => void;
  onRemoveVariant: (level: number, id: string) => void;
  onOverride: (originalKey: string, value: string) => void;
  onSetSubtype: (level: number, skill: string, oldSubtype: string | undefined, newSubtype: string | undefined) => void;
}

const keyOf = (skill: string, subtype?: string) => (subtype ? `${skill}|${subtype}` : skill);
// Shown when the user taps a − that's locked because a branch depends on that fok (touch-reachable note).
const BRANCH_NOTICE = "Egy ág innen ágazik — előbb csökkentsd vagy töröld az ágat.";

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
// The ↳ corner arrow that marks a branch row (in the from-pill and on granted-branch instances).
const BranchArrow: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 10 20 15 15 20" /><path d="M4 4v7a4 4 0 0 0 4 4h12" />
  </svg>
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
}) => {
  const [view, setView] = useState<View>("learned");
  // Skills whose general (no-subtype) primary the user is currently specialising — reveals its subtype input.
  const [specializing, setSpecializing] = useState<Set<string>>(new Set());
  // The variant id whose "branches from which fok?" popover is open (only one at a time), or null.
  const [fromOpen, setFromOpen] = useState<string | null>(null);
  // Transient note shown when a − is tapped that's locked by a dependent branch (auto-dismisses).
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  const kap = derived.pools.kapBalanceByLevel[level - 1] ?? 0;
  const lvl = getLevelRecord(record, level);
  const purchases = lvl?.skillPurchases ?? [];
  const variants = purchases.filter((p) => p.id);
  const variantKeys = new Set(variants.map((p) => keyOf(p.skill, p.subtype)));

  const grantedFloor: Record<string, number> = {};
  derived.grantedSkills.forEach((g) => {
    grantedFloor[keyOf(g.skill, g.subtype)] = g.percent != null ? g.percent : g.fok;
  });

  const ownedInstances = derived.skills.filter((s) => !variantKeys.has(keyOf(s.skill, s.subtype)));
  const teacherOf = (skill: string) => derived.teaching[skill] || 0;
  const stepCost = (skill: string, from: number, to: number) =>
    skillKpCost(SKILL_BY_NAME[skill], from, to, teacherOf(skill), derived.effectiveStats).kp;

  // Branch button: first press on a still-general skill specialises the EXISTING instance (reveals its
  // subtype input); only once that instance is specific does a further press add a separate branch.
  const branchClick = (name: string) => {
    const primary = ownedInstances.find((s) => s.skill === name);
    const enumerated = (SKILL_BY_NAME[name]?.subtypes?.length ?? 0) > 0;
    const general = primary && !primary.subtype && !primary.origSubtype && !enumerated;
    // First press on a general skill (learned OR granted) specialises the existing instance in place;
    // only once it's specific does a further press add a separate branch.
    if (general && !specializing.has(name)) setSpecializing((s) => new Set(s).add(name));
    else onAddVariant(level, name);
  };

  const skillHasContent = (name: string) =>
    ownedInstances.some((s) => s.skill === name) || variants.some((p) => p.skill === name);
  const visibleInCat = (cat: SkillCategory) =>
    SKILLS.filter((d) => d.category === cat).filter((d) => {
      if (view === "all") return true;
      if (view === "taught") return skillHasContent(d.name) || teacherOf(d.name) > 0;
      return skillHasContent(d.name);
    });

  // ── reusable controls ──
  const subtypeInput = (value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string) => (
    <Input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
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
  const subtypeControl = (skill: string, value: string, setValue: (v: string) => void) => {
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
    return subtypeInput(value, (e) => setValue(e.target.value), "altípus");
  };

  // Branch a skill (add a specialized variant) — the splitting-arrows icon from the design.
  const agButton = (name: string) => (
    <Box
      as="button"
      type="button"
      title="Ág hozzáadása"
      aria-label="Ág hozzáadása"
      color="accentTx"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      lineHeight={0}
      p="3px"
      borderRadius="6px"
      flexShrink={0}
      _hover={{ bg: "accentSoft" }}
      onClick={() => branchClick(name)}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 12H10" />
        <path d="M10 12 18.5 6.4" />
        <path d="M14.2 5.2 18.5 6.4 17.2 10.6" />
        <path d="M10 12 18.5 17.6" />
        <path d="M14.2 18.8 18.5 17.6 17.2 13.4" />
      </svg>
    </Box>
  );

  // Learn a skill — a quiet outline button with the open-book icon (signals "learn", not "selected").
  const tanulBtn = (name: string) => (
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
      onClick={() => onUpsert(level, name, undefined, 1)}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 5.5h6.5a3 3 0 0 1 3 3V20a2.4 2.4 0 0 0-2.4-2.4H2z" />
        <path d="M22 5.5h-6.5a3 3 0 0 0-3 3V20a2.4 2.4 0 0 1 2.4-2.4H22z" />
      </svg>
      Tanul
    </Box>
  );

  // Branch-fok selector: a pill showing "↳ N. foktól ▾" that opens a popover to pick which fok of the
  // parent the branch inherits from (1…parent fok, free). Picking a fok above the current target bumps
  // the target up so it never sits below its inherited floor.
  const branchFromPill = (p: { id?: string; from?: number; to: number }, from: number, maxFrom: number) => {
    const open = fromOpen === p.id;
    const pick = (n: number) => { onPatchVariant(level, p.id!, { from: n, to: Math.max(p.to, n) }); setFromOpen(null); };
    return (
      <Box position="relative" flexShrink={0}>
        <Box as="button" type="button" title="Hányadik foktól ágazik?" onClick={() => setFromOpen(open ? null : p.id!)}
          display="inline-flex" alignItems="center" gap="5px" px="10px" py="6px" borderRadius="8px"
          bg="accentSoft" color="accentTx" border="1px solid" borderColor="accentBd"
          fontFamily="system-ui" fontSize="12.5px" fontWeight={700} whiteSpace="nowrap"
          _hover={{ borderColor: "accent" }}>
          <BranchArrow />
          {from}. foktól
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Box>
        {open && (
          <>
            <Box position="fixed" inset={0} zIndex={29} onClick={() => setFromOpen(null)} />
            <Box position="absolute" top="calc(100% + 6px)" left={0} zIndex={30} bg="band" border="1px solid" borderColor="hair" borderRadius="12px" p="13px" minW="max-content" sx={{ boxShadow: "0 16px 40px rgba(0,0,0,.32)" }}>
              <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".09em" textTransform="uppercase" color="muted" mb="9px" whiteSpace="nowrap">
                Hányadik foktól ágazik?
              </Text>
              <HStack gap="7px">
                {Array.from({ length: maxFrom }, (_, i) => i + 1).map((n) => (
                  <Box as="button" key={n} type="button" onClick={() => pick(n)}
                    w={{ base: "46px", md: "42px" }} h={{ base: "46px", md: "42px" }} borderRadius="9px" border="1px solid"
                    borderColor={n === from ? "accent" : "fieldBd"} bg={n === from ? "accentSoft" : "fieldBg"}
                    color={n === from ? "accentTx" : "fg"} fontWeight={700} fontSize="17px"
                    display="flex" alignItems="center" justifyContent="center" sx={{ fontVariantNumeric: "tabular-nums" }}
                    _hover={{ borderColor: "accent" }}>
                    {n}.
                  </Box>
                ))}
              </HStack>
            </Box>
          </>
        )}
      </Box>
    );
  };

  const nameGroup = (name: string, showBranch: boolean) => {
    const teacher = teacherOf(name);
    return (
      <HStack spacing="7px" flex="0 1 auto" minW={0}>
        <Text fontSize={FS_NAME} fontWeight={600} color="fg" whiteSpace="nowrap">{name}</Text>
        {teacher > 0 && <TeacherBadge n={teacher} />}
        {showBranch && agButton(name)}
      </HStack>
    );
  };

  const rowShell = (
    key: string,
    isPrimary: boolean,
    left: React.ReactNode,
    subtype: React.ReactNode,
    kapott: React.ReactNode,
    stepper: React.ReactNode,
    trailing: React.ReactNode
  ) => (
    <HStack key={key} spacing="9px" py={ROW_PY} pl={isPrimary ? 0 : "26px"} borderBottom="1px solid" borderColor="hair" align="center">
      {left}
      {subtype}
      {trailing}
      {kapott}
      <Box flex="1 1 auto" minW="8px" />
      {stepper}
    </HStack>
  );

  // a granted / simple owned instance. `branchFloor` (= highest dependent branch's from + 1, or null) is
  // the fok the trunk must stay at. `mainFok`/`topCount` identify which instance actually sets that ceiling:
  // the UNIQUE highest one — lowering it drops the group max and orphans a branch, so block it (even if it's
  // a non-primary sibling). A tied-for-highest instance can be lowered freely (the max survives).
  const instRow = (inst: { skill: string; subtype?: string; origSubtype?: string; fok: number; percent?: number }, isPrimary: boolean, showBranch: boolean, mainFok: number, topCount: number, branchFloor: number | null) => {
    const isPct = inst.percent != null;
    const cur = isPct ? inst.percent! : inst.fok;
    const floor = grantedFloor[keyOf(inst.skill, inst.subtype)] || 0;
    const teacher = teacherOf(inst.skill);
    const step = isPct ? (teacher > 0 ? 5 : 3) : 1;
    const atMax = isPct ? cur >= 100 : cur >= 5;
    const cost = atMax ? 0 : stepCost(inst.skill, cur, cur + step);
    const decBlocked = !isPct && branchFloor != null && cur === mainFok && topCount === 1 && cur > floor && cur <= branchFloor;
    const left = isPrimary ? nameGroup(inst.skill, showBranch) : (
      <Box as="span" color="catTx" flexShrink={0} display="inline-flex" alignItems="center" lineHeight={0} title="Ág">
        <BranchArrow size={15} />
      </Box>
    );
    return rowShell(
      keyOf(inst.skill, inst.origSubtype) + ":g",
      isPrimary,
      left,
      // Show the editable subtype when this instance was originally subtyped (origSubtype set, even if
      // cleared), when the skill has a mandatory fixed subtype set, or when the user is specialising this
      // general skill via the branch button. Granted subtypes go through the override; a learned primary
      // edits its own purchase atomically.
      inst.subtype || inst.origSubtype || (SKILL_BY_NAME[inst.skill]?.subtypes?.length ?? 0) > 0 || (isPrimary && specializing.has(inst.skill))
        ? subtypeControl(inst.skill, inst.subtype || "", (v) =>
            // A subtyped grant edits via its origSubtype-keyed override; a general instance (learned,
            // granted, or both) goes through the combined setter that updates override + purchase at once.
            inst.origSubtype != null
              ? onOverride(keyOf(inst.skill, inst.origSubtype), v)
              : onSetSubtype(level, inst.skill, inst.subtype, v))
        : null,
      floor > 0 ? <KapottBadge /> : null,
      <Stepper
        value={isPct ? `${cur}%` : `${cur}.`}
        incLabel={atMax ? undefined : String(cost)}
        decDisabled={cur <= floor}
        decBlocked={decBlocked}
        onDecBlocked={() => setNotice(BRANCH_NOTICE)}
        incDisabled={atMax || cost > kap}
        onDec={() => (cur - step <= floor ? onRemove(level, inst.skill, inst.subtype) : onUpsert(level, inst.skill, inst.subtype, cur - step))}
        onInc={() => onUpsert(level, inst.skill, inst.subtype, cur + step)}
      />,
      // "Unspecialise" X — only for an in-place-specialised GENERAL skill (not a granted subtype, not a
      // mandatory enumerated one): clears the subtype back to general and hides the input.
      inst.origSubtype == null && (SKILL_BY_NAME[inst.skill]?.subtypes?.length ?? 0) === 0 && (inst.subtype || specializing.has(inst.skill))
        ? <DeleteButton onClick={() => {
            onSetSubtype(level, inst.skill, inst.subtype, undefined);
            setSpecializing((s) => {
              const n = new Set(s);
              n.delete(inst.skill);
              return n;
            });
          }} />
        : null
    );
  };

  // a user-added variant (editable subtype + branch fok + delete). `mainFok` is the trunk level (highest
  // instance of this skill); a branch diverges strictly below it, so it can branch from 1…(mainFok − 1).
  const varRow = (p: { id?: string; skill: string; subtype?: string; from?: number; to: number }, isPrimary: boolean, showBranch: boolean, mainFok: number, branchFloor: number | null) => {
    const def = SKILL_BY_NAME[p.skill];
    const isPct = def.cost === "percentage";
    const from = p.from || 0;
    const teacher = teacherOf(p.skill);
    const step = isPct ? (teacher > 0 ? 5 : 3) : 1;
    const atMax = isPct ? p.to >= 100 : p.to >= 5;
    const cost = atMax ? 0 : stepCost(p.skill, p.to, p.to + step);
    const maxFrom = Math.max(1, Math.min(5, (mainFok || p.to) - 1));
    // When this variant is itself the trunk (no owned instance), block lowering below a dependent branch.
    const decBlocked = isPrimary && branchFloor != null && p.to > from && p.to <= branchFloor;
    const left = isPrimary
      ? nameGroup(p.skill, showBranch)
      : branchFromPill(p, from, maxFrom);
    return rowShell(
      p.id!,
      isPrimary,
      left,
      subtypeControl(p.skill, p.subtype || "", (v) => onPatchVariant(level, p.id!, { subtype: v })),
      null,
      <Stepper
        value={isPct ? `${p.to}%` : `${p.to}.`}
        incLabel={atMax ? undefined : String(cost)}
        decDisabled={p.to <= from}
        decBlocked={decBlocked}
        onDecBlocked={() => setNotice(BRANCH_NOTICE)}
        incDisabled={atMax || cost > kap}
        onDec={() => onPatchVariant(level, p.id!, { to: p.to - step })}
        onInc={() => onPatchVariant(level, p.id!, { to: p.to + step })}
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

      <HStack spacing="2px" bg="band" border="1px solid" borderColor="hair" borderRadius="10px" p="3px" w="fit-content" mb={1}>
        {filterSeg("learned", "Tanult")}
        {filterSeg("taught", "+ oktatott")}
        {filterSeg("all", "Mind")}
      </HStack>

      <Box>
        {SKILL_CATEGORIES.map((cat) => {
          const skills = visibleInCat(cat);
          if (skills.length === 0) return null;
          return (
            <Box key={cat}>
              <Text fontFamily="system-ui" fontSize="11px" fontWeight={700} letterSpacing=".11em" textTransform="uppercase" color="catTx" mt="13px" mb="1px">
                {cat}
              </Text>
              {skills.map((def) => {
                const insts = ownedInstances.filter((s) => s.skill === def.name);
                const vars = variants.filter((p) => p.skill === def.name);
                const learned = insts.length > 0 || vars.length > 0;
                const showBranch = learned && def.cost !== "percentage";
                if (!learned) {
                  return (
                    <HStack key={def.name} spacing="9px" py={ROW_PY} borderBottom="1px solid" borderColor="hair" align="center">
                      <Text fontSize={FS_NAME} fontWeight={600} color="fg" whiteSpace="nowrap">{def.name}</Text>
                      <Box flex="1 1 auto" minW="8px" />
                      {tanulBtn(def.name)}
                    </HStack>
                  );
                }
                // Trunk level = highest owned (fok) instance (or the highest variant if none). Dependent
                // branches = the user variants (all of them when there's an owned trunk, else all but the
                // first). The trunk can't drop below the highest branch's `from` (+1); `topCount` is how many
                // instances tie at the top, so we only block the lone highest one.
                const ownedFoks = insts.filter((s) => s.percent == null).map((s) => s.fok);
                const mainFok = ownedFoks.length ? Math.max(...ownedFoks) : Math.max(0, ...vars.map((v) => v.to));
                const topCount = ownedFoks.filter((f) => f === mainFok).length;
                const branchVars = insts.length > 0 ? vars : vars.slice(1);
                const branchFloor = branchVars.length ? Math.max(...branchVars.map((v) => v.from || 0)) + 1 : null;
                let i = 0;
                return (
                  <Box key={def.name}>
                    {insts.map((inst) => instRow(inst, i++ === 0, showBranch, mainFok, topCount, branchFloor))}
                    {vars.map((p) => varRow(p, i++ === 0, showBranch, mainFok, branchFloor))}
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>

      {notice && (
        <Box position="fixed" bottom="20px" left="50%" transform="translateX(-50%)" zIndex={50}
          bg="band" border="1px solid" borderColor="accentBd" borderRadius="10px" px="16px" py="11px"
          maxW="min(380px, 90vw)" cursor="pointer" onClick={() => setNotice(null)}
          sx={{ boxShadow: "0 12px 32px rgba(0,0,0,.32)" }}>
          <Text fontFamily="system-ui" fontSize="13px" color="fg" lineHeight="1.45">{notice}</Text>
        </Box>
      )}
    </Box>
  );
};
