import React from "react";
import { Badge, Box, Checkbox, Heading, HStack, Select, Text, VStack } from "@chakra-ui/react";
import { BACKGROUNDS } from "../model/backgrounds";
import { CharacterRecord } from "../model/character";
import { STAT_KEYS } from "../model/attributes";

interface Props {
  record: CharacterRecord;
  granted: string[]; // backgrounds conferred free by race/class (locked)
  onToggle: (name: string) => void;
  onLevel: (name: string, level: number) => void;
  onOption: (name: string, option: string) => void;
}

const costLabel = (cost: number, range?: [number, number]): string =>
  range ? `${range[0]}–${range[1]} KAP` : `${cost} KAP`;

const rangeValues = (range: [number, number]): number[] => {
  const out: number[] = [];
  for (let i = range[0]; i <= range[1]; i++) out.push(i);
  return out;
};

export const BackgroundSelector: React.FC<Props> = ({ record, granted, onToggle, onLevel, onOption }) => {
  const chosenEntry = (name: string) =>
    record.backgrounds.find((b) => b.background === name && b.source === "chosen");

  return (
    <Box>
      <Heading size="sm" mb={1}>Hátterek</Heading>
      <Text fontSize="xs" color="muted" mb={2}>
        Minden választott háttér csökkenti a szintenkénti KAP-ot. A kaszt által adottak zároltak.
      </Text>
      <VStack align="stretch" spacing={1}>
        {Object.keys(BACKGROUNDS).map((name) => {
          const bg = BACKGROUNDS[name];
          const isGranted = granted.indexOf(name) >= 0;
          const entry = chosenEntry(name);
          const isChosen = !!entry;
          const showLevel = isChosen && !isGranted && bg.costRange;
          const showOption = isChosen && !isGranted && bg.optionKind === "stat";
          return (
            <HStack key={name} justify="space-between" align="start">
              <Checkbox
                isChecked={isGranted || isChosen}
                isDisabled={isGranted}
                onChange={() => onToggle(name)}
                alignItems="start"
              >
                <Box>
                  <Text fontSize="sm" lineHeight="1.2">
                    {name}{" "}
                    <Text as="span" color="muted">({costLabel(bg.cost, bg.costRange)})</Text>
                  </Text>
                  {bg.description && (
                    <Text fontSize="xs" color="muted" lineHeight="1.2">{bg.description}</Text>
                  )}
                </Box>
              </Checkbox>
              <HStack spacing={1}>
                {showOption && (
                  <Select
                    size="xs"
                    width="92px"
                    placeholder="tul."
                    value={entry!.option ?? ""}
                    onChange={(e) => onOption(name, e.target.value)}
                  >
                    {STAT_KEYS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                )}
                {showLevel && bg.costRange && (
                  <Select
                    size="xs"
                    width="64px"
                    value={entry!.level ?? bg.costRange[0]}
                    onChange={(e) => onLevel(name, Number(e.target.value))}
                  >
                    {rangeValues(bg.costRange).map((v) => (
                      <option key={v} value={v}>{v} KAP</option>
                    ))}
                  </Select>
                )}
                {isGranted && <Badge colorScheme="green">kaszt</Badge>}
              </HStack>
            </HStack>
          );
        })}
      </VStack>
    </Box>
  );
};
