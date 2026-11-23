import React, { useState } from "react";
import { Box, Heading, HStack, Text } from "@chakra-ui/react";
import { STAT_KEYS, STAT_SHORT, Stat } from "../model/attributes";
import { RACES } from "../model/races";
import { ATTR_MAX, POINT_BUY_TOTAL } from "../engine/constants";
import { CharacterRecord } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { Stepper } from "./Stepper";
import { FS_NAME } from "./tokens";
import { StatInfoModal } from "./InfoModals";

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
  // Clicked attribute name → book-description modal (text only; no calculation in the creator).
  const [statInfo, setStatInfo] = useState<Stat | null>(null);
  const capOf = (s: Stat) => (caps ? caps[s] : ATTR_MAX);
  const baseOf = (s: Stat) => Math.min(record.pointBuy[s], capOf(s));
  const adOf = (s: Stat) => record.adottsag?.[s] ?? 0;

  const baseUsed = STAT_KEYS.reduce((sum, s) => sum + baseOf(s), 0);
  const baseRemaining = POINT_BUY_TOTAL - baseUsed;
  const kap = derived.pools.kapBalanceByLevel[0] ?? 0;
  const MIN = 1;

  // md+ only — on phones each stepper carries its own caption inside the (wrapped) row instead
  const colHead = (
    <HStack display={{ base: "none", md: "flex" }} spacing={3} mb={1} align="flex-end">
      <Box flex="1" />
      <Text w={STEPW} flexShrink={0} textAlign="center" fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".1em" textTransform="uppercase" color="fgFaint">
        Érték
      </Text>
      <Text w={STEPW} flexShrink={0} textAlign="center" fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".1em" textTransform="uppercase" color="fgFaint">
        Max <Text as="span" fontWeight={500} textTransform="none" letterSpacing="0">(Adottság)</Text>
      </Text>
    </HStack>
  );

  // caption over a stepper, phones only
  const stepCaption = (label: React.ReactNode) => (
    <Text display={{ base: "block", md: "none" }} textAlign="center" fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".1em" textTransform="uppercase" color="fgFaint" mb="4px">
      {label}
    </Text>
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
        Az <b>Érték</b> a 135 alappontból emelhető, a faji maximumig; a <b>Max (Adottság)</b> a felső határt a faji
        maximum fölé emeli (legfeljebb {ATTR_MAX}-ig), pontonként 1 KAP-ért, és a tényleges értéket is növeli.
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
            // phones: the name takes the first line, the two captioned steppers share the second
            <HStack key={stat} spacing={3} py={{ base: "11px", md: "8px" }} flexWrap={{ base: "wrap", md: "nowrap" }} rowGap="7px">
              <Box flex={{ base: "1 1 100%", md: "1" }} minW={0}>
                <Box as="button" type="button" onClick={() => setStatInfo(stat)} title="Mit jelent ez a tulajdonság?" textAlign="left" maxW="100%">
                  <Text fontSize={FS_NAME} fontWeight={600} color="fg" noOfLines={1} _hover={{ color: "accentTx", textDecoration: "underline" }}>
                    {stat} <Text as="span" color="fgFaint" fontSize=".82em">({STAT_SHORT[stat]})</Text>
                  </Text>
                </Box>
              </Box>
              {/* ÉRTÉK — effective value; buttons edit the base part, drawn from the 135 budget */}
              <Box flex={{ base: "1 1 0", md: "0 0 auto" }} w={{ base: "auto", md: STEPW.md }} minW={0}>
                {stepCaption("Érték")}
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
              <Box flex={{ base: "1 1 0", md: "0 0 auto" }} w={{ base: "auto", md: STEPW.md }} minW={0}>
                {stepCaption(<>Max <Text as="span" fontWeight={500} textTransform="none" letterSpacing="0">(Adottság)</Text></>)}
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

      {statInfo && <StatInfoModal stat={statInfo} onClose={() => setStatInfo(null)} />}
    </Box>
  );
};
