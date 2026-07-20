import React from "react";
import { Box, Checkbox, Heading, HStack, Select, Text } from "@chakra-ui/react";
import { BACKGROUNDS } from "../model/backgrounds";
import { CharacterRecord } from "../model/character";
import { STAT_KEYS } from "../model/attributes";
import { FS_NAME, ROW_PY } from "./tokens";

interface Props {
  record: CharacterRecord;
  granted: string[]; // backgrounds conferred free by race/class (locked)
  onToggle: (name: string) => void;
  onLevel: (name: string, level: number) => void;
  onOption: (name: string, option: string) => void;
  kegyeltExtra?: React.ReactNode; // szféra editor — rendered under the Kegyelt row's description when active
}

const costLabel = (cost: number, range?: [number, number]): string =>
  range ? `${range[0]}–${range[1]} KAP` : `${cost} KAP`;

const rangeValues = (range: [number, number]): number[] => {
  const out: number[] = [];
  for (let i = range[0]; i <= range[1]; i++) out.push(i);
  return out;
};

const pillStyle = {
  size: "xs" as const,
  bg: "fieldBg",
  borderColor: "fieldBd",
  borderRadius: "7px",
  color: "fg",
  fontFamily: "system-ui",
  focusBorderColor: "accent",
};

export const BackgroundSelector: React.FC<Props> = ({ record, granted, onToggle, onLevel, onOption, kegyeltExtra }) => {
  const chosenEntry = (name: string) =>
    record.backgrounds.find((b) => b.background === name && b.source === "chosen");

  return (
    <Box>
      <Heading fontSize={{ base: "23px", md: "20px" }} fontWeight={700} mb={1} color="fg">Hátterek</Heading>
      <Text fontFamily="system-ui" fontSize="11.5px" color="fgFaint" mb={2} lineHeight="1.5">
        Minden választott háttér csökkenti a szintenkénti KAP-ot. A kaszt által adottak zároltak.
      </Text>
      <Box sx={{ "& > *:last-child": { borderBottom: "none" } }}>
        {Object.keys(BACKGROUNDS).map((name) => {
          const bg = BACKGROUNDS[name];
          const isGranted = granted.indexOf(name) >= 0;
          const entry = chosenEntry(name);
          const isChosen = !!entry;
          const checked = isGranted || isChosen;
          const showLevel = (isChosen || isGranted) && bg.costRange; // granted backgrounds can also be levelled (free, e.g. Barbár Mágiatagadás)
          const levelValue = isGranted ? record.grantedBgLevels?.[name] ?? bg.costRange?.[0] : entry?.level ?? bg.costRange?.[0];
          const showOption = isChosen && !isGranted && bg.optionKind === "stat";
          return (
            <HStack key={name} align="start" spacing="11px" py={ROW_PY} borderBottom="1px solid" borderColor="hair">
              <Checkbox
                isChecked={checked}
                isDisabled={isGranted}
                onChange={() => onToggle(name)}
                size="lg"
                mt="1px"
                flexShrink={0}
                sx={{
                  ".chakra-checkbox__control": {
                    borderRadius: "6px",
                    borderColor: "fieldBd",
                    bg: "fieldBg",
                  },
                  ".chakra-checkbox__control[data-checked]": {
                    bg: "accent",
                    borderColor: "accent",
                    color: "accentFg",
                  },
                  ".chakra-checkbox__control[data-checked][data-hover]": {
                    bg: "accent",
                    borderColor: "accent",
                  },
                }}
              />
              {/* dim only the row's own text when granted — the Kegyelt szféra editor below stays full-strength */}
              <Box flex="1" minW={0}>
                <HStack spacing="6px" flexWrap="wrap" align="center" opacity={isGranted ? 0.62 : 1}>
                  <Text fontSize={FS_NAME} fontWeight={600} color={isGranted ? "fgFaint" : "fg"}>{name}</Text>
                  <Text as="span" fontSize=".85em" color="fgFaint">({costLabel(bg.cost, bg.costRange)})</Text>
                  {isGranted && (
                    <Box as="span" fontFamily="system-ui" fontSize="9px" fontWeight={700} letterSpacing=".08em" textTransform="uppercase" px="6px" py="2px" borderRadius="5px" bg="kapottBg" color="kapottTx">
                      kaszt
                    </Box>
                  )}
                  {showOption && (
                    <Select {...pillStyle} width="96px" placeholder="tul." value={entry!.option ?? ""} onChange={(e) => onOption(name, e.target.value)}>
                      {STAT_KEYS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                  )}
                  {showLevel && bg.costRange && (
                    <Select {...pillStyle} width="78px" value={levelValue} onChange={(e) => onLevel(name, Number(e.target.value))}>
                      {rangeValues(bg.costRange).map((v) => (
                        <option key={v} value={v}>{v}{isGranted ? ". szint" : " KAP"}</option>
                      ))}
                    </Select>
                  )}
                </HStack>
                {bg.description && (
                  <Text fontFamily="system-ui" fontSize="11.5px" color="fgFaint" lineHeight="1.4" mt="2px" opacity={isGranted ? 0.62 : 1}>{bg.description}</Text>
                )}
                {name === "Kegyelt" && kegyeltExtra}
              </Box>
            </HStack>
          );
        })}
      </Box>
    </Box>
  );
};
