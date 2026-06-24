import React from "react";
import {
  Box,
  Divider,
  Heading,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useCharacterBuilder } from "../state/useCharacterBuilder";
import { RACES, RACE_NAMES } from "../model/races";
import { CLASSES, CLASS_NAMES } from "../model/classes";
import { activeChoices, defaultSelections } from "../model/choices";
import { STAT_KEYS, Stat } from "../model/attributes";
import { AttributeEditor } from "./AttributeEditor";
import { SheetPreview } from "./SheetPreview";
import { DiagnosticsPanel } from "./DiagnosticsPanel";

const Panel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box borderWidth="1px" borderRadius="md" p={4} bg="white" boxShadow="sm">
    {children}
  </Box>
);

export const CharacterBuilder: React.FC = () => {
  const { record, derived, update, patchPointBuy, setSelection } = useCharacterBuilder();

  const onRaceChange = (race: string) => {
    const caps = RACES[race].statLimits;
    const clamped = { ...record.pointBuy };
    STAT_KEYS.forEach((s) => {
      if (clamped[s] > caps[s]) clamped[s] = caps[s];
    });
    update({ race, pointBuy: clamped });
  };

  const onClassChange = (cls: string) => {
    update({ class: cls, selections: defaultSelections(CLASSES[cls].choices) });
  };

  const klass = CLASSES[record.class];
  const choiceList = klass ? activeChoices(klass.choices, record.selections) : [];
  const raceAllowed = klass ? klass.allowedRaces.indexOf(record.race) >= 0 : true;

  return (
    <Box p={4} bg="gray.50" minH="100vh">
      <Heading size="md" mb={4}>
        Karakteralkotó <Text as="span" fontSize="sm" color="gray.500">(MVP)</Text>
      </Heading>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {/* ── Left: editor ── */}
        <VStack align="stretch" spacing={4}>
          <Panel>
            <Heading size="sm" mb={2}>Alapadatok</Heading>
            <VStack align="stretch" spacing={2}>
              <HStack>
                <Text w="90px" fontSize="sm">Név</Text>
                <Input size="sm" value={record.name} onChange={(e) => update({ name: e.target.value })} />
              </HStack>
              <HStack>
                <Text w="90px" fontSize="sm">Faj</Text>
                <Select size="sm" value={record.race} onChange={(e) => onRaceChange(e.target.value)}>
                  {RACE_NAMES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
              </HStack>
              <HStack>
                <Text w="90px" fontSize="sm">Kaszt</Text>
                <Select size="sm" value={record.class} onChange={(e) => onClassChange(e.target.value)}>
                  {CLASS_NAMES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </HStack>
              {choiceList.map((ch) => (
                <HStack key={ch.id}>
                  <Text w="90px" fontSize="sm">{ch.label}</Text>
                  <Select
                    size="sm"
                    value={record.selections[ch.id] || ""}
                    onChange={(e) => setSelection(ch.id, e.target.value)}
                  >
                    <option value="">— válassz —</option>
                    {ch.options.map((o) => (
                      <option key={o.name} value={o.name}>{o.name}</option>
                    ))}
                  </Select>
                </HStack>
              ))}
              {!raceAllowed && (
                <Text fontSize="sm" color="red.500">
                  A(z) {record.race} faj nem választható ehhez a kaszthoz.
                </Text>
              )}
              <Text fontSize="xs" color="gray.500">
                Kaszt költsége: {klass ? klass.cost : "?"} · Faj költsége: {RACES[record.race]?.cost ?? "?"}
              </Text>
            </VStack>
          </Panel>

          <Panel>
            <AttributeEditor record={record} onChange={(s: Stat, v: number) => patchPointBuy(s, v)} />
          </Panel>

          <Panel>
            <DiagnosticsPanel diagnostics={derived.diagnostics} />
          </Panel>
        </VStack>

        {/* ── Right: live sheet ── */}
        <Panel>
          <Heading size="sm" mb={3}>Karakterlap (élő)</Heading>
          <Divider mb={3} />
          <SheetPreview d={derived} />
        </Panel>
      </SimpleGrid>
    </Box>
  );
};

export default CharacterBuilder;
