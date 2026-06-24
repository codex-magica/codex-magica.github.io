import React from "react";
import { Badge, Box, Button, Divider, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { CharacterRecord } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { CombatChannel, Pool, Resource } from "../model/effects";
import { STAT_KEYS, STAT_SHORT, Stat } from "../model/attributes";
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
  suffix?: string;
  cost: number;
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
  incDisabled?: boolean;
  note?: string;
}> = ({ label, value, suffix, cost, onDec, onInc, decDisabled, incDisabled, note }) => (
  <HStack justify="space-between">
    <HStack spacing={1} minW={0}>
      <Text fontSize="sm" noOfLines={1}>{label}</Text>
      {note && <Badge fontSize="0.6em" colorScheme="gray">{note}</Badge>}
    </HStack>
    <HStack spacing={1}>
      <Button size="xs" variant="ghost" onClick={onDec} isDisabled={decDisabled}>−</Button>
      <Text w="44px" textAlign="center" fontWeight="bold" fontSize="sm">{value}{suffix}</Text>
      <Button size="xs" colorScheme="blue" variant="outline" onClick={onInc} isDisabled={incDisabled} title={`${cost} KAP`}>
        + {cost}
      </Button>
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
          const nextCost = hmAssigned < hmGranted ? 0 : KAP_RATE.HM; // free until granted HM is used up
          return (
            <BuyRow
              key={c}
              label={
                <>
                  {c} <Text as="span" color="muted">(= {derived.combat[c]})</Text>
                </>
              }
              value={v}
              cost={nextCost}
              onDec={() => onHm(level, c, Math.max(0, v - 1))}
              onInc={() => onHm(level, c, v + 1)}
              decDisabled={v <= 0}
              incDisabled={kap < nextCost}
            />
          );
        })}
      </VStack>

      {/* Fájdalomtűrés (Fp) */}
      <Text fontSize="xs" fontWeight="bold" color="muted" textTransform="uppercase" mb={1}>Fájdalomtűrés (Fp · {KAP_RATE.Fp} KAP)</Text>
      <VStack align="stretch" spacing={0} mb={2}>
        {(() => {
          const v = resOf("Fp");
          return (
            <BuyRow
              label={<>Fp <Text as="span" color="muted">(= {derived.derived.Fp})</Text></>}
              value={v}
              cost={KAP_RATE.Fp}
              onDec={() => onResource(level, "Fp", Math.max(0, v - 1))}
              onInc={() => onResource(level, "Fp", v + 1)}
              decDisabled={v <= 0}
              incDisabled={kap < KAP_RATE.Fp}
            />
          );
        })()}
      </VStack>

      <Divider mb={2} />

      {/* Mágikus pontok */}
      <Text fontSize="xs" fontWeight="bold" color="muted" textTransform="uppercase" mb={1}>Mágikus pontok</Text>
      <VStack align="stretch" spacing={0} mb={2}>
        {PSEUDO.map(({ pool, label }) => {
          const v = resOf(pool);
          const exists = !!derived.pools.magic[pool];
          const cost = KAP_RATE[pool];
          return (
            <BuyRow
              key={pool}
              label={label}
              value={v}
              cost={cost}
              note={exists ? undefined : "nincs tároló"}
              onDec={() => onResource(level, pool, Math.max(0, v - 1))}
              onInc={() => onResource(level, pool, v + 1)}
              decDisabled={v <= 0}
              incDisabled={!exists || kap < cost}
            />
          );
        })}
      </VStack>

      <Divider mb={2} />

      {/* Tulajdonság +1 (20 KAP) */}
      <Text fontSize="xs" fontWeight="bold" color="muted" textTransform="uppercase" mb={1}>Tulajdonság (+1 · {ATTR_KAP_COST} KAP)</Text>
      <VStack align="stretch" spacing={0}>
        {STAT_KEYS.map((s) => {
          const v = statBuyOf(s);
          const atCap = caps ? derived.effectiveStats[s] >= caps[s] : false;
          return (
            <BuyRow
              key={s}
              label={
                <>
                  {s} <Text as="span" color="muted">({STAT_SHORT[s]} {derived.effectiveStats[s]})</Text>
                </>
              }
              value={v}
              cost={ATTR_KAP_COST}
              note={atCap ? "max" : undefined}
              onDec={() => onStat(level, s, Math.max(0, v - 1))}
              onInc={() => onStat(level, s, v + 1)}
              decDisabled={v <= 0}
              incDisabled={atCap || kap < ATTR_KAP_COST}
            />
          );
        })}
      </VStack>
    </Box>
  );
};
