import React, { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  Input,
  Select,
  Text,
  VStack,
} from "@chakra-ui/react";
import { CharacterRecord } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { SKILLS, SKILL_BY_NAME } from "../model/skills";
import { SkillCategory } from "../model/common";
import { skillKpCost } from "../engine/skillCost";

interface Props {
  level: number;
  record: CharacterRecord;
  derived: DerivedCharacter;
  onUpsert: (level: number, skill: string, subtype: string | undefined, to: number) => void;
  onRemove: (level: number, skill: string, subtype: string | undefined) => void;
}

const CATEGORIES: SkillCategory[] = ["Harci", "Alvilági", "Világi", "Tudományos", "Szociális", "Misztikus"];
const keyOf = (skill: string, subtype?: string) => (subtype ? `${skill}|${subtype}` : skill);

export const SkillLevelPanel: React.FC<Props> = ({ level, record, derived, onUpsert, onRemove }) => {
  const [newSkill, setNewSkill] = useState<string>("");
  const [newSubtype, setNewSubtype] = useState<string>("");

  // Skills are paid straight from the shared KAP pool (1 Kp = 1 KAP) — no manual conversion.
  const kapRemaining = derived.pools.kapBalanceByLevel[level - 1] ?? 0;

  // floor (grant-only) lookups
  const floor: Record<string, number> = {};
  derived.grantedSkills.forEach((g) => {
    floor[keyOf(g.skill, g.subtype)] = g.percent != null ? g.percent : g.fok;
  });

  // Build the row list: owned instances + truly-unowned catalog skills.
  const ownedNames = new Set(derived.skills.map((s) => s.skill));
  type Row = { skill: string; subtype?: string; current: number; isPct: boolean };
  const rows: Row[] = [];
  derived.skills.forEach((s) =>
    rows.push({ skill: s.skill, subtype: s.subtype, current: s.percent != null ? s.percent : s.fok, isPct: s.percent != null })
  );
  SKILLS.forEach((d) => {
    if (!ownedNames.has(d.name)) rows.push({ skill: d.name, subtype: undefined, current: 0, isPct: d.cost === "percentage" });
  });

  const rowsByCat = (cat: SkillCategory) =>
    rows
      .filter((r) => SKILL_BY_NAME[r.skill]?.category === cat)
      .sort((a, b) => a.skill.localeCompare(b.skill, "hu") || (a.subtype || "").localeCompare(b.subtype || "", "hu"));

  const renderRow = (r: Row) => {
    const def = SKILL_BY_NAME[r.skill];
    if (!def) return null;
    const k = keyOf(r.skill, r.subtype);
    const fl = floor[k] || 0;
    const teacher = derived.teaching[r.skill] || 0;
    const rate = teacher > 0 ? 5 : 3;
    const step = r.isPct ? rate : 1;
    const nextTarget = r.current + step;
    const atMax = r.isPct ? r.current >= 100 : r.current >= 5;
    const cost = atMax ? 0 : skillKpCost(def, r.current, nextTarget, teacher, derived.effectiveStats).kp;
    const canAfford = cost <= kapRemaining;
    const canLower = r.current > fl;

    return (
      <HStack key={k} justify="space-between" spacing={2}>
        <HStack spacing={1} minW={0}>
          <Text fontSize="sm" noOfLines={1}>
            {r.skill}
            {r.subtype ? <Text as="span" color="muted"> ({r.subtype})</Text> : null}
          </Text>
          {teacher > 0 && <Badge fontSize="0.6em" colorScheme="purple">T{teacher}</Badge>}
          {fl > 0 && <Badge fontSize="0.6em" colorScheme="green">kapott</Badge>}
        </HStack>
        <HStack spacing={1}>
          <Button
            size="xs"
            variant="ghost"
            isDisabled={!canLower}
            onClick={() => {
              const prev = r.current - step;
              if (prev <= fl) onRemove(level, r.skill, r.subtype);
              else onUpsert(level, r.skill, r.subtype, prev);
            }}
          >
            −
          </Button>
          <Text w="48px" textAlign="center" fontWeight="bold" fontSize="sm">
            {r.isPct ? `${r.current}%` : `${r.current}.`}
          </Text>
          <Button
            size="xs"
            colorScheme="blue"
            variant="outline"
            isDisabled={atMax || !canAfford}
            title={atMax ? "Maximum" : `${cost} Kp`}
            onClick={() => onUpsert(level, r.skill, r.subtype, nextTarget)}
          >
            +{atMax ? "" : ` ${cost}Kp`}
          </Button>
        </HStack>
      </HStack>
    );
  };

  const learn = () => {
    if (!newSkill) return;
    const def = SKILL_BY_NAME[newSkill];
    const teacher = derived.teaching[newSkill] || 0;
    const start = def.cost === "percentage" ? (teacher > 0 ? 5 : 3) : 1;
    onUpsert(level, newSkill, newSubtype.trim() || undefined, start);
    setNewSubtype("");
  };

  return (
    <Box>
      <Heading size="sm" mb={1}>Képzettségek — {level}. szint</Heading>

      <Text fontSize="sm" mb={1}>
        KAP maradék: <b style={{ color: kapRemaining < 0 ? "#e53e3e" : "inherit" }}>{kapRemaining}</b>
        <Text as="span" color="muted"> · a képzettségek 1 Kp = 1 KAP-ot vonnak közvetlenül</Text>
      </Text>
      <Text fontSize="xs" color="muted" mb={2}>
        T{"{n}"} = elérhető oktató foka (olcsóbb tanulás). „kapott" = kaszt/faj adta kezdőérték (alá nem csökkenthető).
      </Text>

      {/* Learn new (with subtype) */}
      <HStack mb={2} spacing={1}>
        <Select size="xs" placeholder="Új képzettség…" value={newSkill} onChange={(e) => setNewSkill(e.target.value)}>
          {SKILLS.map((d) => (
            <option key={d.name} value={d.name}>{d.name}</option>
          ))}
        </Select>
        <Input size="xs" placeholder="altípus (pl. íjak)" value={newSubtype} onChange={(e) => setNewSubtype(e.target.value)} width="140px" />
        <Button size="xs" colorScheme="blue" onClick={learn} isDisabled={!newSkill}>Tanul</Button>
      </HStack>

      <Divider mb={2} />

      <Box>
        {CATEGORIES.map((cat) => {
          const list = rowsByCat(cat);
          if (list.length === 0) return null;
          return (
            <Box key={cat} mb={2}>
              <Text fontSize="xs" fontWeight="bold" color="muted" textTransform="uppercase">{cat}</Text>
              <VStack align="stretch" spacing={0}>{list.map(renderRow)}</VStack>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
