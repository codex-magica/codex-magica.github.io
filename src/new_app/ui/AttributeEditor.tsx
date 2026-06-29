import React from "react";
import { Box, Heading, HStack, Text } from "@chakra-ui/react";
import { STAT_KEYS, STAT_SHORT, Stat } from "../model/attributes";
import { RACES } from "../model/races";
import { ATTR_MAX, POINT_BUY_TOTAL } from "../engine/constants";
import { CharacterRecord } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { Stepper } from "./Stepper";
import { FS_NAME } from "./tokens";

interface Props {
  record: CharacterRecord;
  derived: DerivedCharacter;
  onChange: (stat: Stat, value: number) => void; // base point-buy (≤ racial cap)
  onAdottsag: (stat: Stat, value: number) => void; // raises the max above the racial cap (1 KAP each)
}

const STEPW = { base: "136px", md: "108px" };

// Two columns: the base value (135 point-buy, ≤ racial cap) and the maximum (racial cap, which the
// Adottság column raises — 1 KAP per point). Effective value = base + Adottság.
export const AttributeEditor: React.FC<Props> = ({ record, derived, onChange, onAdottsag }) => {
  const caps = RACES[record.race]?.statLimits;
  const capOf = (s: Stat) => (caps ? caps[s] : ATTR_MAX);
  const baseOf = (s: Stat) => Math.min(record.pointBuy[s], capOf(s));
  const adOf = (s: Stat) => record.adottsag?.[s] ?? 0;

  const baseUsed = STAT_KEYS.reduce((sum, s) => sum + baseOf(s), 0);
  const baseRemaining = POINT_BUY_TOTAL - baseUsed;
  const kap = derived.pools.kapBalanceByLevel[0] ?? 0;
  const MIN = 1;

  const colHead = (
    <HStack spacing={3} mb={1} align="flex-end">
      <Box flex="1" />
      <Text w={STEPW} flexShrink={0} textAlign="center" fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".1em" textTransform="uppercase" color="fgFaint">
        Érték
      </Text>
      <Text w={STEPW} flexShrink={0} textAlign="center" fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".1em" textTransform="uppercase" color="fgFaint">
        Max <Text as="span" fontWeight={500} textTransform="none" letterSpacing="0">(Adottság)</Text>
      </Text>
    </HStack>
  );

  return (
    <Box>
      <HStack justify="space-between" mb={1}>
        <Heading fontSize={{ base: "23px", md: "20px" }} fontWeight={700} color="fg">Tulajdonságok</Heading>
        <Text fontFamily="system-ui" fontSize="13px" fontWeight={700} color={baseRemaining === 0 ? "good" : baseRemaining < 0 ? "bad" : "muted"} sx={{ fontVariantNumeric: "tabular-nums" }}>
          Tulajdonságpontok: {baseRemaining}
        </Text>
      </HStack>
      <Text fontFamily="system-ui" fontSize="11.5px" color="fgFaint" mb={3} lineHeight="1.5">
        Az <b>Érték</b> a 135 alappontból nő (a faji maximumig); a <b>Max (Adottság)</b> a faji max fölé emel
        (max {ATTR_MAX}), pontonként 1 KAP, és a tényleges értéket is növeli.
      </Text>

      {colHead}

      <Box>
        {STAT_KEYS.map((stat) => {
          const cap = capOf(stat);
          const b = baseOf(stat);
          const ad = adOf(stat);
          const max = cap + ad;
          const value = Math.min(ATTR_MAX, b + ad); // effective value includes Adottság
          return (
            <HStack key={stat} spacing={3} py={{ base: "11px", md: "8px" }}>
              <Box flex="1" minW={0}>
                <Text fontSize={FS_NAME} fontWeight={600} color="fg" noOfLines={1}>
                  {stat} <Text as="span" color="fgFaint" fontSize=".82em">({STAT_SHORT[stat]})</Text>
                </Text>
              </Box>
              {/* ÉRTÉK — effective value; buttons edit the base part, drawn from the 135 budget */}
              <Box w={STEPW} flexShrink={0}>
                <Stepper
                  fullWidth
                  value={value}
                  onDec={() => onChange(stat, b - 1)}
                  onInc={() => onChange(stat, b + 1)}
                  decDisabled={b <= MIN}
                  incDisabled={b >= cap || baseRemaining <= 0}
                />
              </Box>
              {/* MAX — racial cap raised by Adottság (1 KAP each, also raises the value) */}
              <Box w={STEPW} flexShrink={0}>
                <Stepper
                  fullWidth
                  valueMuted
                  value={max}
                  onDec={() => onAdottsag(stat, ad - 1)}
                  onInc={() => onAdottsag(stat, ad + 1)}
                  decDisabled={ad <= 0}
                  incDisabled={max >= ATTR_MAX || kap < 1}
                />
              </Box>
            </HStack>
          );
        })}
      </Box>
    </Box>
  );
};
