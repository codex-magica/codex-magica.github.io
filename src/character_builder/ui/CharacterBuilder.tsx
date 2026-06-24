import React from "react";
import {
  Box,
  Divider,
  Heading,
  HStack,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Spacer,
  Text,
  useColorMode,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { useCharacterBuilder } from "../state/useCharacterBuilder";
import { RACES, RACE_NAMES } from "../model/races";
import { CLASSES, CLASS_NAMES } from "../model/classes";
import { activeChoices, defaultSelections } from "../model/choices";
import { STAT_KEYS, Stat } from "../model/attributes";
import { AttributeEditor } from "./AttributeEditor";
import { BackgroundSelector } from "./BackgroundSelector";
import { SkillLevelPanel } from "./SkillLevelPanel";
import { PointBuyPanel } from "./PointBuyPanel";
import { SheetPreview } from "./SheetPreview";
import { DiagnosticsPanel } from "./DiagnosticsPanel";

const Panel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const bg = useColorModeValue("white", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  return (
    <Box borderWidth="1px" borderColor={borderColor} borderRadius="md" p={4} bg={bg} boxShadow="sm">
      {children}
    </Box>
  );
};

export const CharacterBuilder: React.FC = () => {
  const {
    record,
    derived,
    update,
    patchPointBuy,
    setSelection,
    toggleBackground,
    setBackgroundLevel,
    setBackgroundOption,
    upsertSkillPurchase,
    removeSkillPurchase,
    setResourceAllocation,
    setHmChannel,
    setStatBuy,
  } = useCharacterBuilder();

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
  const { colorMode, toggleColorMode } = useColorMode();
  const pageBg = useColorModeValue("gray.50", "gray.900");

  return (
    <Box p={4} bg={pageBg} minH="100vh">
      <HStack mb={4}>
        <Heading size="md">
          Karakteralkotó <Text as="span" fontSize="sm" color="muted">(MVP)</Text>
        </Heading>
        <Spacer />
        <IconButton
          aria-label="Sötét mód váltása"
          size="sm"
          variant="ghost"
          icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
          onClick={toggleColorMode}
        />
      </HStack>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} alignItems="start">
        {/* ── Left: editor (scrolls as one column) ── */}
        <VStack
          align="stretch"
          spacing={4}
          maxH={{ base: "none", md: "calc(100vh - 96px)" }}
          overflowY={{ base: "visible", md: "auto" }}
          pr={{ base: 0, md: 2 }}
        >
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
              <Text fontSize="xs" color="muted">
                Kaszt költsége: {klass ? klass.cost : "?"} · Faj költsége: {RACES[record.race]?.cost ?? "?"}
              </Text>
            </VStack>
          </Panel>

          <Panel>
            <AttributeEditor record={record} onChange={(s: Stat, v: number) => patchPointBuy(s, v)} />
          </Panel>

          <Panel>
            <BackgroundSelector
              record={record}
              granted={derived.grantedBackgrounds}
              onToggle={toggleBackground}
              onLevel={setBackgroundLevel}
              onOption={setBackgroundOption}
            />
          </Panel>

          <Panel>
            <SkillLevelPanel
              level={1}
              record={record}
              derived={derived}
              onUpsert={upsertSkillPurchase}
              onRemove={removeSkillPurchase}
            />
          </Panel>

          <Panel>
            <PointBuyPanel
              level={1}
              record={record}
              derived={derived}
              onHm={setHmChannel}
              onResource={setResourceAllocation}
              onStat={setStatBuy}
            />
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
