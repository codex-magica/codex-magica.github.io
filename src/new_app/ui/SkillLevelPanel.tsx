import React, { useState } from "react";
import { Box, Heading, HStack, Input, Text } from "@chakra-ui/react";
import { CharacterRecord } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { SKILLS, SKILL_BY_NAME } from "../model/skills";
import { SkillCategory } from "../model/common";
import { skillKpCost } from "../engine/skillCost";
import { Stepper } from "./Stepper";

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
}

const CATEGORIES: SkillCategory[] = ["Harci", "Alvilági", "Világi", "Tudományos", "Szociális", "Misztikus"];
const keyOf = (skill: string, subtype?: string) => (subtype ? `${skill}|${subtype}` : skill);

const FS_NAME = { base: "19px", md: "16px" };
const ROW_PY = { base: "11px", md: "8px" };
const SUBW = { base: "170px", md: "128px" };
const BTN_H = { base: "44px", md: "34px" };

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
}) => {
  const [view, setView] = useState<View>("learned");
  const kap = derived.pools.kapBalanceByLevel[level - 1] ?? 0;
  const lvl = record.levels.find((l) => l.level === level);
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
      onClick={() => onAddVariant(level, name)}
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

  const deleteBtn = (onClick: () => void) => (
    <Box as="button" type="button" h={BTN_H} minW={BTN_H} border="1px solid" borderColor="hair" borderRadius="8px" color="fgFaint" display="flex" alignItems="center" justifyContent="center" fontSize="15px" flexShrink={0} onClick={onClick}>
      ✕
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

  const agFromControl = (from: number, max: number, onDec: () => void, onInc: () => void) => (
    <HStack spacing="2px" flexShrink={0} align="center" title="ágazási fok (innen örökölt, ingyen)">
      <Box as="span" fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".06em" textTransform="uppercase" color="catTx">ág</Box>
      <Box as="button" type="button" px="3px" fontSize="15px" color="muted" opacity={from <= 0 ? 0.4 : 1} onClick={from <= 0 ? undefined : onDec}>−</Box>
      <Text fontSize="xs" w="12px" textAlign="center" color="accentTx" sx={{ fontVariantNumeric: "tabular-nums" }}>{from}</Text>
      <Box as="button" type="button" px="3px" fontSize="15px" color="muted" opacity={from >= max ? 0.4 : 1} onClick={from >= max ? undefined : onInc}>+</Box>
    </HStack>
  );

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

  // a granted / simple owned instance
  const instRow = (inst: { skill: string; subtype?: string; origSubtype?: string; fok: number; percent?: number }, isPrimary: boolean, showBranch: boolean) => {
    const isPct = inst.percent != null;
    const cur = isPct ? inst.percent! : inst.fok;
    const floor = grantedFloor[keyOf(inst.skill, inst.subtype)] || 0;
    const teacher = teacherOf(inst.skill);
    const step = isPct ? (teacher > 0 ? 5 : 3) : 1;
    const atMax = isPct ? cur >= 100 : cur >= 5;
    const cost = atMax ? 0 : stepCost(inst.skill, cur, cur + step);
    const left = isPrimary ? nameGroup(inst.skill, showBranch) : (
      <Box as="span" fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".06em" textTransform="uppercase" color="catTx" flexShrink={0}>ág</Box>
    );
    return rowShell(
      keyOf(inst.skill, inst.origSubtype) + ":g",
      isPrimary,
      left,
      // Show the editable subtype whenever this instance was originally subtyped (origSubtype set),
      // even if the player cleared the text — otherwise a granted branch can't be renamed back.
      inst.subtype || inst.origSubtype
        ? subtypeInput(inst.subtype || "", (e) => onOverride(keyOf(inst.skill, inst.origSubtype), e.target.value), "altípus")
        : null,
      floor > 0 ? <KapottBadge /> : null,
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

  // a user-added variant (editable subtype + branch fok + delete)
  const varRow = (p: { id?: string; skill: string; subtype?: string; from?: number; to: number }, isPrimary: boolean, showBranch: boolean) => {
    const def = SKILL_BY_NAME[p.skill];
    const isPct = def.cost === "percentage";
    const from = p.from || 0;
    const teacher = teacherOf(p.skill);
    const step = isPct ? (teacher > 0 ? 5 : 3) : 1;
    const atMax = isPct ? p.to >= 100 : p.to >= 5;
    const cost = atMax ? 0 : stepCost(p.skill, p.to, p.to + step);
    const left = isPrimary
      ? nameGroup(p.skill, showBranch)
      : agFromControl(from, Math.min(p.to, 5), () => onPatchVariant(level, p.id!, { from: from - 1 }), () => onPatchVariant(level, p.id!, { from: from + 1 }));
    return rowShell(
      p.id!,
      isPrimary,
      left,
      subtypeInput(p.subtype || "", (e) => onPatchVariant(level, p.id!, { subtype: e.target.value }), "altípus"),
      null,
      <Stepper
        value={isPct ? `${p.to}%` : `${p.to}.`}
        incLabel={atMax ? undefined : String(cost)}
        decDisabled={p.to <= from}
        incDisabled={atMax || cost > kap}
        onDec={() => onPatchVariant(level, p.id!, { to: p.to - step })}
        onInc={() => onPatchVariant(level, p.id!, { to: p.to + step })}
      />,
      deleteBtn(() => onRemoveVariant(level, p.id!))
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
        {CATEGORIES.map((cat) => {
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
                let i = 0;
                return (
                  <Box key={def.name}>
                    {insts.map((inst) => instRow(inst, i++ === 0, showBranch))}
                    {vars.map((p) => varRow(p, i++ === 0, showBranch))}
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
