import React, { useState } from "react";
import { Badge, Box, Button, ButtonGroup, Heading, HStack, IconButton, Input, Text, VStack } from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { CharacterRecord } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { SKILLS, SKILL_BY_NAME } from "../model/skills";
import { SkillCategory } from "../model/common";
import { skillKpCost } from "../engine/skillCost";

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

  // Owned instances NOT backed by a user-added variant (granted + simple raises).
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

  // The skill-name cell (shown only on the first row of a skill; blank afterwards for alignment),
  // with the teacher badge and the "+ ág" branch button.
  const nameCell = (name: string, isFirst: boolean, showBranch: boolean) => (
    <HStack w="188px" flexShrink={0} spacing={1} minW={0}>
      {isFirst && (
        <>
          <Text fontSize="sm" fontWeight="semibold" noOfLines={2}>{name}</Text>
          {teacherOf(name) > 0 && <Badge fontSize="0.5em" colorScheme="purple" flexShrink={0}>T{teacherOf(name)}</Badge>}
          {showBranch && (
            <Button size="2xs" variant="ghost" colorScheme="purple" px={1} minW="auto" flexShrink={0} onClick={() => onAddVariant(level, name)}>+ág</Button>
          )}
        </>
      )}
    </HStack>
  );

  const valueControls = (cur: number, floor: number, isPct: boolean, atMax: boolean, cost: number, onDec: () => void, onInc: () => void) => (
    <>
      <Button size="xs" colorScheme="gray" variant="outline" flexShrink={0} isDisabled={cur <= floor} onClick={onDec}>−</Button>
      <Text w="38px" textAlign="center" fontWeight="bold" fontSize="sm" flexShrink={0}>{isPct ? `${cur}%` : `${cur}.`}</Text>
      <Button size="xs" colorScheme="blue" variant="outline" flexShrink={0} isDisabled={atMax || cost > kap} title={atMax ? "max" : `${cost} Kp`} onClick={onInc}>
        +{atMax ? "" : ` ${cost}`}
      </Button>
    </>
  );

  // ── a granted / simple owned instance — name + editable subtype + value, on one line ──
  const grantedLine = (inst: { skill: string; subtype?: string; origSubtype?: string; fok: number; percent?: number }, isFirst: boolean, showBranch: boolean) => {
    const isPct = inst.percent != null;
    const cur = isPct ? inst.percent! : inst.fok;
    const floor = grantedFloor[keyOf(inst.skill, inst.subtype)] || 0;
    const teacher = teacherOf(inst.skill);
    const step = isPct ? (teacher > 0 ? 5 : 3) : 1;
    const atMax = isPct ? cur >= 100 : cur >= 5;
    const cost = atMax ? 0 : stepCost(inst.skill, cur, cur + step);
    return (
      <HStack key={keyOf(inst.skill, inst.origSubtype) + ":g"} spacing={1}>
        {nameCell(inst.skill, isFirst, showBranch)}
        {inst.subtype && (
          <Input size="xs" w="120px" flexShrink={0} value={inst.subtype} onChange={(e) => onOverride(keyOf(inst.skill, inst.origSubtype), e.target.value)} />
        )}
        {floor > 0 && <Badge fontSize="0.5em" colorScheme="green" flexShrink={0}>kapott</Badge>}
        <Box flex="1" />
        {valueControls(cur, floor, isPct, atMax, cost,
          () => (cur - step <= floor ? onRemove(level, inst.skill, inst.subtype) : onUpsert(level, inst.skill, inst.subtype, cur - step)),
          () => onUpsert(level, inst.skill, inst.subtype, cur + step))}
      </HStack>
    );
  };

  // ── a user-added variant (editable subtype + branch fok) ──
  const variantLine = (p: { id?: string; skill: string; subtype?: string; from?: number; to: number }, isFirst: boolean, showBranch: boolean) => {
    const def = SKILL_BY_NAME[p.skill];
    const isPct = def.cost === "percentage";
    const from = p.from || 0;
    const teacher = teacherOf(p.skill);
    const step = isPct ? (teacher > 0 ? 5 : 3) : 1;
    const atMax = isPct ? p.to >= 100 : p.to >= 5;
    const cost = atMax ? 0 : stepCost(p.skill, p.to, p.to + step);
    return (
      <HStack key={p.id} spacing={1}>
        {nameCell(p.skill, isFirst, showBranch)}
        <Input size="xs" w="120px" flexShrink={0} placeholder="altípus" value={p.subtype || ""} onChange={(e) => onPatchVariant(level, p.id!, { subtype: e.target.value })} />
        <IconButton aria-label="specializáció törlése" size="xs" variant="ghost" colorScheme="red" flexShrink={0} icon={<DeleteIcon />} onClick={() => onRemoveVariant(level, p.id!)} />
        <Box flex="1" />
        <HStack spacing={0} flexShrink={0} title="ágazási fok (innen örökölt, ingyen)">
          <Text fontSize="2xs" color="muted">ág</Text>
          <Button size="xs" variant="ghost" px={1} minW="auto" isDisabled={from <= 0} onClick={() => onPatchVariant(level, p.id!, { from: from - 1 })}>−</Button>
          <Text fontSize="xs" w="12px" textAlign="center" color="purple.400">{from}</Text>
          <Button size="xs" variant="ghost" px={1} minW="auto" isDisabled={from >= Math.min(p.to, 5)} onClick={() => onPatchVariant(level, p.id!, { from: from + 1 })}>+</Button>
        </HStack>
        {valueControls(p.to, from, isPct, atMax, cost,
          () => onPatchVariant(level, p.id!, { to: p.to - step }),
          () => onPatchVariant(level, p.id!, { to: p.to + step }))}
      </HStack>
    );
  };

  return (
    <Box>
      <Heading size="sm" mb={1}>Képzettségek — {level}. szint</Heading>
      <HStack justify="space-between" mb={2}>
        <ButtonGroup size="xs" isAttached variant="outline">
          <Button isActive={view === "learned"} onClick={() => setView("learned")}>Tanult</Button>
          <Button isActive={view === "taught"} onClick={() => setView("taught")}>+ oktatott</Button>
          <Button isActive={view === "all"} onClick={() => setView("all")}>Mind</Button>
        </ButtonGroup>
        <Text fontSize="sm">
          KAP: <b style={{ color: kap < 0 ? "#e53e3e" : "inherit" }}>{kap}</b>
        </Text>
      </HStack>

      <Box>
        {CATEGORIES.map((cat) => {
          const skills = visibleInCat(cat);
          if (skills.length === 0) return null;
          return (
            <Box key={cat} mb={2}>
              <Text fontSize="xs" fontWeight="bold" color="muted" textTransform="uppercase">{cat}</Text>
              <VStack align="stretch" spacing={0.5} pl={1}>
                {skills.map((def) => {
                  const insts = ownedInstances.filter((s) => s.skill === def.name);
                  const vars = variants.filter((p) => p.skill === def.name);
                  const learned = insts.length > 0 || vars.length > 0;
                  // Specialization ("+ág" → a subtyped variant) is offered on any already-learned,
                  // non-percentage skill (percentage skills have no foks/subtypes to branch).
                  const showBranch = learned && def.cost !== "percentage";
                  if (!learned) {
                    // Not learned yet → a plain "learn" button: learns it to fok 1, no subtype.
                    return (
                      <HStack key={def.name} spacing={1}>
                        {nameCell(def.name, true, false)}
                        <Box flex="1" />
                        <Button size="2xs" variant="outline" colorScheme="blue" onClick={() => onUpsert(level, def.name, undefined, 1)}>+ tanul</Button>
                      </HStack>
                    );
                  }
                  let i = 0;
                  return (
                    <Box key={def.name}>
                      {insts.map((inst) => grantedLine(inst, i++ === 0, showBranch))}
                      {vars.map((p) => variantLine(p, i++ === 0, showBranch))}
                    </Box>
                  );
                })}
              </VStack>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
