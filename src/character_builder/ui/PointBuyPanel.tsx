import React, { useState } from "react";
import { Box, Button, Divider, Heading, HStack, IconButton, Select, Text, VStack } from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { CharacterRecord } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { CombatChannel, Pool, Resource } from "../model/effects";
import { STAT_KEYS, Stat } from "../model/attributes";
import { RACES } from "../model/races";
import { ATTR_KAP_COST, KAP_RATE } from "../engine/constants";

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

// One buy row: label, current amount, +/- with cost and a disabled state.
const BuyRow: React.FC<{
  label: React.ReactNode;
  value: number;
  cost: number;
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
  incDisabled?: boolean;
}> = ({ label, value, cost, onDec, onInc, decDisabled, incDisabled }) => (
  <HStack justify="space-between">
    <Text fontSize="sm" noOfLines={1} minW={0}>{label}</Text>
    <HStack spacing={1} flexShrink={0}>
      <Button size="xs" variant="outline" colorScheme="gray" onClick={onDec} isDisabled={decDisabled}>−</Button>
      <Text w="40px" textAlign="center" fontWeight="bold" fontSize="sm">{value}</Text>
      <Button size="xs" colorScheme="blue" variant="outline" onClick={onInc} isDisabled={incDisabled} title={`${cost} KAP`}>+ {cost}</Button>
    </HStack>
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

  // Attribute buy (rare, 20 KAP): an empty list you add rows to.
  const [adding, setAdding] = useState(false);
  const boughtStats = STAT_KEYS.filter((s) => statBuyOf(s) > 0);
  const availableForDraft = STAT_KEYS.filter((s) => statBuyOf(s) === 0 && !(caps && derived.effectiveStats[s] >= caps[s]));

  return (
    <Box>
      <Heading size="sm" mb={1}>Pontvásárlás — {level}. szint</Heading>
      <Text fontSize="xs" color="muted" mb={2}>
        Közös KAP-ból ({level === 1 ? "Int + 50" : "50"} − hátterek) a Képzettségek panellel. KAP maradék:{" "}
        <b style={{ color: kap < 0 ? "#e53e3e" : "inherit" }}>{kap}</b>
      </Text>

      {/* Harcérték (HM) — kapott HM ingyen, fölötte KAP_RATE.HM/pont */}
      <Text fontSize="xs" fontWeight="bold" color="muted" textTransform="uppercase" mb={1}>
        Harcérték (HM · {KAP_RATE.HM} KAP){hmGranted > 0 ? ` · ${hmGranted} kapott ingyen` : ""}
      </Text>
      <VStack align="stretch" spacing={0} mb={2}>
        {CHANNELS.map((c) => {
          const v = hmOf(c);
          const nextCost = hmAssigned < hmGranted ? 0 : KAP_RATE.HM;
          return (
            <BuyRow
              key={c}
              label={<>{c} <Text as="span" color="muted">(= {derived.combat[c]})</Text></>}
              value={v}
              cost={nextCost}
              onDec={() => onHm(level, c, Math.max(0, v - 1))}
              onInc={() => onHm(level, c, v + 1)}
              decDisabled={v <= 0}
              incDisabled={kap < nextCost}
            />
          );
        })}
        <BuyRow
          label={<>Fp <Text as="span" color="muted">(= {derived.derived.Fp})</Text></>}
          value={resOf("Fp")}
          cost={KAP_RATE.Fp}
          onDec={() => onResource(level, "Fp", Math.max(0, resOf("Fp") - 1))}
          onInc={() => onResource(level, "Fp", resOf("Fp") + 1)}
          decDisabled={resOf("Fp") <= 0}
          incDisabled={kap < KAP_RATE.Fp}
        />
      </VStack>

      {/* Mágikus pontok — only the pools the character actually has */}
      {existingPools.length > 0 && (
        <>
          <Divider mb={2} />
          <Text fontSize="xs" fontWeight="bold" color="muted" textTransform="uppercase" mb={1}>Mágikus pontok</Text>
          <VStack align="stretch" spacing={0} mb={2}>
            {existingPools.map(({ pool, label }) => (
              <BuyRow
                key={pool}
                label={label}
                value={resOf(pool)}
                cost={KAP_RATE[pool]}
                onDec={() => onResource(level, pool, Math.max(0, resOf(pool) - 1))}
                onInc={() => onResource(level, pool, resOf(pool) + 1)}
                decDisabled={resOf(pool) <= 0}
                incDisabled={kap < KAP_RATE[pool]}
              />
            ))}
          </VStack>
        </>
      )}

      <Divider mb={2} />

      {/* Tulajdonság (+1 · 20 KAP) — empty list; "+" adds a row where you pick the attribute */}
      <HStack justify="space-between" mb={1}>
        <Text fontSize="xs" fontWeight="bold" color="muted" textTransform="uppercase">Tulajdonság (+1 · {ATTR_KAP_COST} KAP)</Text>
        <Button size="xs" variant="outline" colorScheme="blue" isDisabled={adding || availableForDraft.length === 0 || kap < ATTR_KAP_COST} onClick={() => setAdding(true)}>+</Button>
      </HStack>
      <VStack align="stretch" spacing={1}>
        {boughtStats.map((s) => {
          const amount = statBuyOf(s);
          const atCap = caps ? derived.effectiveStats[s] >= caps[s] : false;
          return (
            <HStack key={s} spacing={1}>
              <Text fontSize="sm" flex="1" noOfLines={1}>{s} <Text as="span" color="muted">(= {derived.effectiveStats[s]})</Text></Text>
              <Button size="xs" variant="outline" colorScheme="gray" onClick={() => onStat(level, s, amount - 1)}>−</Button>
              <Text w="22px" textAlign="center" fontWeight="bold" fontSize="sm">+{amount}</Text>
              <Button size="xs" variant="outline" colorScheme="blue" isDisabled={atCap || kap < ATTR_KAP_COST} onClick={() => onStat(level, s, amount + 1)}>+</Button>
              <IconButton aria-label="törlés" size="xs" variant="ghost" colorScheme="red" icon={<DeleteIcon />} onClick={() => onStat(level, s, 0)} />
            </HStack>
          );
        })}
        {adding && (
          <HStack spacing={1}>
            <Select
              size="xs"
              flex="1"
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
            <IconButton aria-label="mégse" size="xs" variant="ghost" icon={<DeleteIcon />} onClick={() => setAdding(false)} />
          </HStack>
        )}
      </VStack>
    </Box>
  );
};
