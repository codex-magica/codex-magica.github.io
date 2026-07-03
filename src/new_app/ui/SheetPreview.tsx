import React from "react";
import { Badge, Box, Divider, Heading, HStack, SimpleGrid, Text, VStack, Wrap, WrapItem } from "@chakra-ui/react";
import { DerivedCharacter } from "../engine/types";
import { STAT_KEYS, STAT_SHORT } from "../model/attributes";
import { CombatChannel, Pool } from "../model/effects";
import { VitalKey } from "../model/character";

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <HStack justify="space-between">
    <Text fontSize="sm" color="muted">{label}</Text>
    <Text fontSize="sm" fontWeight="bold">{value}</Text>
  </HStack>
);

const COMBAT: CombatChannel[] = ["KÉ", "TÉ", "VÉ", "CÉ"];
const DERIVED: ("Ép" | "Fp" | "MME" | "AME" | "Sebzésbónusz" | "Mozgás")[] = ["Ép", "Fp", "MME", "AME", "Sebzésbónusz", "Mozgás"];
const VITALS: VitalKey[] = ["Ép", "Fp", "Mana", "Psi", "Kegy"];

export const SheetPreview: React.FC<{ d: DerivedCharacter }> = ({ d }) => {
  const pools: Pool[] = ["Mana", "Psi", "Kegy"];
  return (
    <VStack align="stretch" spacing={4}>
      <Box>
        <Heading size="sm" mb={2}>Tulajdonságok (alap → effektív)</Heading>
        <SimpleGrid columns={2} spacingX={6}>
          {STAT_KEYS.map((s) => (
            <Row
              key={s}
              label={`${s} (${STAT_SHORT[s]})`}
              value={
                d.baseStats[s] === d.effectiveStats[s]
                  ? d.effectiveStats[s]
                  : `${d.baseStats[s]} → ${d.effectiveStats[s]}`
              }
            />
          ))}
        </SimpleGrid>
      </Box>

      <Divider />
      <Box>
        <Heading size="sm" mb={2}>Harcértékek</Heading>
        <SimpleGrid columns={4} spacing={2}>
          {COMBAT.map((c) => (
            <VStack key={c} spacing={0}>
              <Text fontSize="xs" color="muted">{c}</Text>
              <Text fontWeight="bold">{d.combat[c]}</Text>
            </VStack>
          ))}
        </SimpleGrid>
      </Box>

      <Divider />
      <Box>
        <Heading size="sm" mb={2}>Származtatott értékek</Heading>
        <SimpleGrid columns={2} spacingX={6}>
          {DERIVED.map((k) => (
            <Row key={k} label={k} value={d.derived[k]} />
          ))}
        </SimpleGrid>
      </Box>

      <Divider />
      <Box>
        <Heading size="sm" mb={2}>Életértékek</Heading>
        <SimpleGrid columns={2} spacingX={6}>
          {VITALS.map((v) => {
            const exists = v === "Ép" || v === "Fp" || d.pools.magic[v as Pool];
            if (!exists) return null;
            return <Row key={v} label={v} value={`${d.vitals[v].current} / ${d.vitals[v].max}`} />;
          })}
        </SimpleGrid>
      </Box>

      <Divider />
      <Box>
        <Heading size="sm" mb={2}>KAP / pontháztartás</Heading>
        <Row label="Szint" value={d.level} />
        <Row label="KAP bevétel / szint" value={d.pools.kapIncomeByLevel.join(", ") || "—"} />
        <Row label="KAP egyenleg / szint" value={d.pools.kapBalanceByLevel.join(", ") || "—"} />
        {pools.map((p) => (d.pools.magic[p] ? <Row key={p} label={`${p} tároló (max)`} value={d.pools.magic[p]!.max} /> : null))}
      </Box>

      <Divider />
      <Box>
        <Heading size="sm" mb={2}>Képzettségek ({d.skills.length})</Heading>
        <VStack align="stretch" spacing={0}>
          {d.skills.map((s, i) => (
            <HStack key={i} justify="space-between">
              <Text fontSize="sm">
                {s.skill}
                {s.subtype ? <Text as="span" color="muted"> ({s.subtype})</Text> : null}
              </Text>
              <Text fontSize="sm" fontWeight="bold">
                {s.percent != null ? `${s.percent}%` : `${s.fok}. fok`}
              </Text>
            </HStack>
          ))}
        </VStack>
      </Box>

      {d.spells.length > 0 && (
        <>
          <Divider />
          <Box>
            <Heading size="sm" mb={2}>Varázslatok</Heading>
            <VStack align="stretch" spacing={0}>
              {d.spells.map((sp, i) => (
                <HStack key={i} justify="space-between">
                  <Text fontSize="sm">{sp.name} <Text as="span" color="muted">({sp.pool} {sp.cost})</Text></Text>
                  <Badge colorScheme={sp.castableNow ? "green" : sp.known ? "yellow" : "gray"}>
                    {sp.castableNow ? "használható" : sp.known ? "ismert" : "zárt"}
                  </Badge>
                </HStack>
              ))}
            </VStack>
          </Box>
        </>
      )}

      {d.tags.length > 0 && (
        <>
          <Divider />
          <Box>
            <Heading size="sm" mb={2}>Tulajdonság-jegyek</Heading>
            <Wrap>
              {d.tags.map((t) => (
                <WrapItem key={t.name}><Badge>{t.name}</Badge></WrapItem>
              ))}
            </Wrap>
          </Box>
        </>
      )}
    </VStack>
  );
};
