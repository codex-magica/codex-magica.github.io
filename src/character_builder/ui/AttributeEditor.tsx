import React from "react";
import { Box, Button, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { STAT_KEYS, STAT_SHORT, Stat, sumStats } from "../model/attributes";
import { RACES } from "../model/races";
import { POINT_BUY_TOTAL } from "../engine/constants";
import { CharacterRecord } from "../model/character";

interface Props {
  record: CharacterRecord;
  onChange: (stat: Stat, value: number) => void;
}

// 135-point-buy editor. Hard-constrains the total: + is disabled at the racial cap or when no
// points remain; − is disabled at the minimum.
export const AttributeEditor: React.FC<Props> = ({ record, onChange }) => {
  const caps = RACES[record.race]?.statLimits;
  const total = sumStats(record.pointBuy);
  const remaining = POINT_BUY_TOTAL - total;
  const MIN = 1;

  return (
    <Box>
      <HStack justify="space-between" mb={2}>
        <Heading size="sm">Tulajdonságok</Heading>
        <Text fontWeight="bold" color={remaining === 0 ? "green.500" : "orange.500"}>
          Felosztható: {remaining}
        </Text>
      </HStack>
      <VStack align="stretch" spacing={1}>
        {STAT_KEYS.map((stat) => {
          const value = record.pointBuy[stat];
          const cap = caps ? caps[stat] : 20;
          const atCap = value >= cap;
          return (
            <HStack key={stat} justify="space-between">
              <Text w="120px" fontSize="sm">
                {stat} <Text as="span" color="muted">({STAT_SHORT[stat]})</Text>
              </Text>
              <HStack>
                <Button size="xs" onClick={() => onChange(stat, value - 1)} isDisabled={value <= MIN}>
                  −
                </Button>
                <Text w="40px" textAlign="center" fontWeight="bold">
                  {value}
                </Text>
                <Button
                  size="xs"
                  onClick={() => onChange(stat, value + 1)}
                  isDisabled={atCap || remaining <= 0}
                  title={atCap ? `Faji maximum: ${cap}` : undefined}
                >
                  +
                </Button>
                <Text w="44px" fontSize="xs" color="muted" textAlign="right">
                  max {cap}
                </Text>
              </HStack>
            </HStack>
          );
        })}
      </VStack>
    </Box>
  );
};
