import React from "react";
import { Box, Button, Heading, HStack, Spacer, Text, VStack } from "@chakra-ui/react";
import { STAT_KEYS, STAT_SHORT, Stat } from "../model/attributes";
import { RACES } from "../model/races";
import { ATTR_MAX, POINT_BUY_TOTAL } from "../engine/constants";
import { CharacterRecord } from "../model/character";
import { DerivedCharacter } from "../engine/types";

interface Props {
  record: CharacterRecord;
  derived: DerivedCharacter;
  onChange: (stat: Stat, value: number) => void; // base point-buy (≤ racial cap)
  onAdottsag: (stat: Stat, value: number) => void; // raises the max above the racial cap (1 KAP each)
}

// Two columns: the base value (135 point-buy, ≤ racial cap) and the maximum (racial cap, which the
// Adottság buttons raise — 1 KAP per point). Effective value = base + Adottság.
export const AttributeEditor: React.FC<Props> = ({ record, derived, onChange, onAdottsag }) => {
  const caps = RACES[record.race]?.statLimits;
  const capOf = (s: Stat) => (caps ? caps[s] : ATTR_MAX);
  const baseOf = (s: Stat) => Math.min(record.pointBuy[s], capOf(s));
  const adOf = (s: Stat) => record.adottsag?.[s] ?? 0;

  const baseUsed = STAT_KEYS.reduce((sum, s) => sum + baseOf(s), 0);
  const baseRemaining = POINT_BUY_TOTAL - baseUsed;
  const adottsagTotal = STAT_KEYS.reduce((sum, s) => sum + adOf(s), 0);
  const kap = derived.pools.kapBalanceByLevel[0] ?? 0;
  const MIN = 1;

  return (
    <Box>
      <HStack justify="space-between" mb={1}>
        <Heading size="sm">Tulajdonságok</Heading>
        <Text fontWeight="bold" color={baseRemaining === 0 ? "green.500" : "orange.500"}>
          Alappont: {baseRemaining}
        </Text>
      </HStack>
      <Text fontSize="xs" color="muted" mb={2}>
        Érték: 135 alappont (faji maxig). Max: Adottsággal a faji max fölé (max {ATTR_MAX}), pontonként 1 KAP.
        {adottsagTotal > 0 ? ` · Adottság: ${adottsagTotal} (${adottsagTotal} KAP)` : ""}
      </Text>

      {/* column headers */}
      <HStack spacing={3} mb={1}>
        <Spacer />
        <Text w="96px" textAlign="left" fontSize="xs" fontWeight="bold" color="muted">ÉRTÉK</Text>
        <Text w="96px" textAlign="left" fontSize="xs" fontWeight="bold" color="muted">MAX</Text>
      </HStack>

      <VStack align="stretch" spacing={1}>
        {STAT_KEYS.map((stat) => {
          const cap = capOf(stat);
          const b = baseOf(stat);
          const ad = adOf(stat);
          const max = cap + ad;
          const value = Math.min(ATTR_MAX, b + ad); // current value includes Adottság
          return (
            <HStack key={stat} spacing={3}>
              <Text fontSize="sm" noOfLines={1}>
                {stat} <Text as="span" color="muted">({STAT_SHORT[stat]})</Text>
              </Text>
              <Spacer />

              {/* ÉRTÉK — effective value (base point-buy + Adottság); buttons edit the base part */}
              <HStack w="96px" justify="flex-start" spacing={1}>
                <Button size="xs" onClick={() => onChange(stat, b - 1)} isDisabled={b <= MIN}>−</Button>
                <Text w="26px" textAlign="center" fontWeight="bold" fontSize="sm">{value}</Text>
                <Button size="xs" onClick={() => onChange(stat, b + 1)} isDisabled={b >= cap || baseRemaining <= 0}>+</Button>
              </HStack>

              {/* MAX — racial cap, raised by Adottság (1 KAP each; also raises the value) */}
              <HStack w="96px" justify="flex-start" spacing={1}>
                <Button size="xs" variant="ghost" colorScheme="purple" onClick={() => onAdottsag(stat, ad - 1)} isDisabled={ad <= 0}>−</Button>
                <Text w="26px" textAlign="center" fontWeight="bold" fontSize="sm" color={ad > 0 ? "purple.400" : undefined}>{max}</Text>
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="purple"
                  onClick={() => onAdottsag(stat, ad + 1)}
                  isDisabled={max >= ATTR_MAX || kap < 1}
                  title="Adottság: 1 KAP"
                >
                  +
                </Button>
              </HStack>
            </HStack>
          );
        })}
      </VStack>
    </Box>
  );
};
