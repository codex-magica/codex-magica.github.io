import React, { useState } from "react";
import { Box, Heading, HStack, Select, Text } from "@chakra-ui/react";
import { CharacterRecord } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { CombatChannel, Pool, Resource } from "../model/effects";
import { STAT_KEYS, Stat } from "../model/attributes";
import { RACES } from "../model/races";
import { ATTR_KAP_COST, KAP_RATE } from "../engine/constants";
import { Stepper } from "./Stepper";

interface Props {
  level: number;
  record: CharacterRecord;
  derived: DerivedCharacter;
  onHm: (level: number, channel: CombatChannel, amount: number) => void;
  onResource: (level: number, target: Resource, points: number) => void;
  onStat: (level: number, stat: Stat, amount: number) => void;
}

const CHANNELS: CombatChannel[] = ["KÉ", "TÉ", "VÉ", "CÉ"];
const PSEUDO: { pool: Pool; label: string }[] = [
  { pool: "Mana", label: "Mana (Mp)" },
  { pool: "Psi", label: "Pszi (Ψp)" },
  { pool: "Kegy", label: "Kegy" },
];

const FS_NAME = { base: "19px", md: "16px" };
const ROW_PY = { base: "11px", md: "8px" };
const BTN_H = { base: "44px", md: "34px" };

const SubHeader: React.FC<{ children: React.ReactNode; trailing?: React.ReactNode }> = ({ children, trailing }) => (
  <HStack justify="space-between" mt="13px" mb="1px" align="center" minH="24px">
    <Text fontFamily="system-ui" fontSize="11px" fontWeight={700} letterSpacing=".11em" textTransform="uppercase" color="catTx">
      {children}
    </Text>
    {trailing}
  </HStack>
);

export const PointBuyPanel: React.FC<Props> = ({ level, record, derived, onHm, onResource, onStat }) => {
  const lvl = record.levels.find((l) => l.level === level);
  const kap = derived.pools.kapBalanceByLevel[level - 1] ?? 0;

  const hmOf = (c: CombatChannel) => lvl?.hmAssignments.find((h) => h.channel === c)?.amount ?? 0;
  const resOf = (t: Resource) => lvl?.allocations.find((a) => a.target === t)?.points ?? 0;
  const statBuyOf = (s: Stat) => lvl?.statIncreases.find((si) => si.stat === s && si.source === "kap")?.amount ?? 0;
  const caps = RACES[record.race]?.statLimits;
  const hmGranted = derived.pools.hmGrantedByLevel[level - 1] ?? 0;
  const hmAssigned = lvl ? lvl.hmAssignments.reduce((s, h) => s + h.amount, 0) : 0;
  const existingPools = PSEUDO.filter(({ pool }) => derived.pools.magic[pool]);

  const [adding, setAdding] = useState(false);
  const boughtStats = STAT_KEYS.filter((s) => statBuyOf(s) > 0);
  const availableForDraft = STAT_KEYS.filter((s) => statBuyOf(s) === 0 && !(caps && derived.effectiveStats[s] >= caps[s]));

  const buyRow = (
    key: string,
    label: React.ReactNode,
    value: React.ReactNode,
    incLabel: string,
    onDec: () => void,
    onInc: () => void,
    decDisabled: boolean,
    incDisabled: boolean,
    trailing?: React.ReactNode
  ) => (
    <HStack key={key} py={ROW_PY} borderBottom="1px solid" borderColor="hair" align="center" spacing="9px">
      <Text fontSize={FS_NAME} color="fg" noOfLines={1}>{label}</Text>
      <Box flex="1" minW="8px" />
      <Stepper value={value} incLabel={incLabel} onDec={onDec} onInc={onInc} decDisabled={decDisabled} incDisabled={incDisabled} />
      {trailing}
    </HStack>
  );

  const deleteBtn = (onClick: () => void) => (
    <Box as="button" type="button" h={BTN_H} minW={BTN_H} border="1px solid" borderColor="hair" borderRadius="8px" color="fgFaint" display="flex" alignItems="center" justifyContent="center" fontSize="15px" flexShrink={0} onClick={onClick}>
      ✕
    </Box>
  );

  const selectStyle = {
    size: "sm" as const,
    bg: "fieldBg",
    borderColor: "fieldBd",
    borderRadius: "9px",
    color: "fg",
    focusBorderColor: "accent",
  };

  return (
    <Box>
      <Heading fontSize={{ base: "23px", md: "20px" }} fontWeight={700} color="fg" mb={1}>
        Pontvásárlás <Text as="span" fontSize=".65em" fontWeight={500} color="fgFaint">— {level}. szint</Text>
      </Heading>
      <Text fontFamily="system-ui" fontSize="12px" lineHeight="1.5" color="fgFaint" mb={2} maxW="62ch">
        Közös KAP-ból (Int + 50 − hátterek) a Képzettségek panellel. KAP maradék:{" "}
        <Text as="b" color={kap < 0 ? "bad" : "accentTx"} sx={{ fontVariantNumeric: "tabular-nums" }}>{kap}</Text>
      </Text>

      {/* Harcérték (HM) + Fp */}
      <SubHeader>
        Harcérték (HM · {KAP_RATE.HM} KAP){hmGranted > 0 ? ` · ${hmGranted} kapott ingyen` : ""}
      </SubHeader>
      {CHANNELS.map((c) => {
        const v = hmOf(c);
        const nextCost = hmAssigned < hmGranted ? 0 : KAP_RATE.HM;
        return buyRow(
          c,
          <>{c} <Text as="span" color="fgFaint">(= {derived.combat[c]})</Text></>,
          v,
          String(nextCost),
          () => onHm(level, c, Math.max(0, v - 1)),
          () => onHm(level, c, v + 1),
          v <= 0,
          kap < nextCost
        );
      })}
      {buyRow(
        "Fp",
        <>Fp <Text as="span" color="fgFaint">(= {derived.derived.Fp})</Text></>,
        resOf("Fp"),
        String(KAP_RATE.Fp),
        () => onResource(level, "Fp", Math.max(0, resOf("Fp") - 1)),
        () => onResource(level, "Fp", resOf("Fp") + 1),
        resOf("Fp") <= 0,
        kap < KAP_RATE.Fp
      )}

      {/* Mágikus pontok — only pools the character has */}
      {existingPools.length > 0 && (
        <>
          <SubHeader>Mágikus pontok</SubHeader>
          {existingPools.map(({ pool, label }) =>
            buyRow(
              pool,
              label,
              resOf(pool),
              String(KAP_RATE[pool]),
              () => onResource(level, pool, Math.max(0, resOf(pool) - 1)),
              () => onResource(level, pool, resOf(pool) + 1),
              resOf(pool) <= 0,
              kap < KAP_RATE[pool]
            )
          )}
        </>
      )}

      {/* Tulajdonság (+1 · 20 KAP) — progressively disclosed list */}
      <SubHeader
        trailing={
          <Box
            as="button"
            type="button"
            w="34px"
            h="34px"
            border="1px solid"
            borderColor="accent"
            bg="accentSoft"
            color="accentTx"
            borderRadius="9px"
            fontWeight={700}
            fontSize="18px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            opacity={adding || availableForDraft.length === 0 || kap < ATTR_KAP_COST ? 0.45 : 1}
            onClick={() => !(adding || availableForDraft.length === 0 || kap < ATTR_KAP_COST) && setAdding(true)}
          >
            +
          </Box>
        }
      >
        Tulajdonság (+1 · {ATTR_KAP_COST} KAP)
      </SubHeader>
      {boughtStats.map((s) => {
        const amount = statBuyOf(s);
        const atCap = caps ? derived.effectiveStats[s] >= caps[s] : false;
        return buyRow(
          s,
          <>{s} <Text as="span" color="fgFaint">(= {derived.effectiveStats[s]})</Text></>,
          `+${amount}`,
          String(ATTR_KAP_COST),
          () => onStat(level, s, amount - 1),
          () => onStat(level, s, amount + 1),
          amount <= 1,
          atCap || kap < ATTR_KAP_COST,
          deleteBtn(() => onStat(level, s, 0))
        );
      })}
      {adding && (
        <HStack py={ROW_PY} borderBottom="1px solid" borderColor="hair" align="center" spacing="9px">
          <Select
            {...selectStyle}
            placeholder="válassz tulajdonságot…"
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onStat(level, e.target.value as Stat, 1);
                setAdding(false);
              }
            }}
          >
            {availableForDraft.map((o) => (
              <option key={o} value={o}>{o} ({derived.effectiveStats[o]})</option>
            ))}
          </Select>
          <Box flex="1" minW="8px" />
          {deleteBtn(() => setAdding(false))}
        </HStack>
      )}
    </Box>
  );
};
