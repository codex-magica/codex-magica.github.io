import React from "react";
import {
  Box,
  BoxProps,
  Divider,
  Heading,
  HStack,
  IconButton,
  Input,
  Select,
  SimpleGrid,
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

const useCardShadow = () =>
  useColorModeValue("0 1px 3px rgba(70,55,25,0.13)", "0 1px 2px rgba(0,0,0,0.32)");

const Panel: React.FC<BoxProps> = ({ children, ...rest }) => {
  const shadow = useCardShadow();
  return (
    <Box bg="sheet" border="1px solid" borderColor="hair" borderRadius="14px" boxShadow={shadow} p={{ base: "24px", md: "18px" }} {...rest}>
      {children}
    </Box>
  );
};

// A balance chip in the sticky header (KAP maradék / Alappont) — the eye's anchor point.
const BalanceChip: React.FC<{ caption: string; value: number; numColor: string; bg: string; borderColor?: string }> = ({
  caption,
  value,
  numColor,
  bg,
  borderColor,
}) => (
  <Box bg={bg} border="1px solid" borderColor={borderColor || bg} borderRadius="13px" px="16px" py="7px" minW="78px" textAlign="center">
    <Text fontFamily="system-ui" fontSize="9.5px" fontWeight={700} letterSpacing=".13em" textTransform="uppercase" color="fgFaint">{caption}</Text>
    <Text fontSize="20px" fontWeight={700} lineHeight="1.15" color={numColor} sx={{ fontVariantNumeric: "tabular-nums" }}>{value}</Text>
  </Box>
);

export const CharacterBuilder: React.FC = () => {
  const {
    record,
    derived,
    update,
    patchPointBuy,
    setAdottsag,
    setSelection,
    toggleBackground,
    setBackgroundLevel,
    setBackgroundOption,
    upsertSkillPurchase,
    removeSkillPurchase,
    addSkillVariant,
    patchPurchaseById,
    removePurchaseById,
    setSubtypeOverride,
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
  const shadow = useCardShadow();

  // Header balance anchors.
  const kap = derived.pools.kapBalanceByLevel[0] ?? 0;
  const cap = RACES[record.race]?.statLimits;
  const baseUsed = STAT_KEYS.reduce((sum, s) => sum + Math.min(record.pointBuy[s], cap ? cap[s] : record.pointBuy[s]), 0);
  const alappont = 135 - baseUsed;
  const subLine = `${record.race} ${record.class} · ${record.levels.length}. szint`;

  // A row in Alapadatok: 88px muted label + tokenized control.
  const fieldRow = (label: string, control: React.ReactNode, last?: boolean) => (
    <HStack align="center" py="9px" borderBottom={last ? undefined : "1px solid"} borderColor="hair" spacing={3}>
      <Text w="88px" flexShrink={0} fontSize="sm" color="muted">{label}</Text>
      {control}
    </HStack>
  );
  const selectProps = {
    size: "sm" as const,
    bg: "fieldBg",
    borderColor: "fieldBd",
    borderRadius: "9px",
    color: "fg",
    focusBorderColor: "accent",
  };

  return (
    <Box px={{ base: "14px", md: "14px" }} py="14px" bg="page" minH="100vh" color="fg">
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing="14px" alignItems="start">
        {/* ── Left: editor (scrolls as one column) ── */}
        <VStack
          align="stretch"
          spacing="14px"
          maxH={{ base: "none", md: "calc(100vh - 28px)" }}
          overflowY={{ base: "visible", md: "auto" }}
          pb={{ base: 0, md: "96px" }}
          pr={{ base: 0, md: 2 }}
        >
          {/* Sticky balance header — pins to the top of the scroll area */}
          <Box
            position="sticky"
            top="0"
            zIndex={6}
            bg="sheet"
            border="1px solid"
            borderColor="hair"
            borderRadius="14px"
            boxShadow={shadow}
            px={{ base: "24px", md: "18px" }}
            py="12px"
          >
            <HStack justify="space-between" gap="14px" flexWrap="wrap">
              <Box minW={0}>
                <Heading fontSize={{ base: "27px", md: "26px" }} fontWeight={700} color="fg" noOfLines={1}>
                  {record.name || "Névtelen"}
                </Heading>
                <Text fontFamily="system-ui" fontSize="11px" color="fgFaint" letterSpacing=".04em">{subLine}</Text>
              </Box>
              <HStack gap="8px">
                <BalanceChip caption="KAP maradék" value={kap} numColor={kap < 0 ? "bad" : "accentTx"} bg="chipBg" borderColor="chipBd" />
                <BalanceChip caption="Alappont" value={alappont} numColor={alappont === 0 ? "good" : alappont < 0 ? "bad" : "fg"} bg="kapottBg" />
                <IconButton
                  aria-label="Sötét mód váltása"
                  size="sm"
                  variant="ghost"
                  color="muted"
                  icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                  onClick={toggleColorMode}
                />
              </HStack>
            </HStack>
          </Box>

          <Panel>
            <Heading fontSize={{ base: "23px", md: "20px" }} fontWeight={700} mb={2} color="fg">Alapadatok</Heading>
            <Box>
              {fieldRow("Név", <Input {...selectProps} value={record.name} onChange={(e) => update({ name: e.target.value })} />)}
              {fieldRow(
                "Faj",
                <Select {...selectProps} value={record.race} onChange={(e) => onRaceChange(e.target.value)}>
                  {RACE_NAMES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
              )}
              {fieldRow(
                "Kaszt",
                <Select {...selectProps} value={record.class} onChange={(e) => onClassChange(e.target.value)}>
                  {CLASS_NAMES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>,
                choiceList.length === 0
              )}
              {choiceList.map((ch, i) =>
                fieldRow(
                  ch.label,
                  <Select {...selectProps} value={record.selections[ch.id] || ""} onChange={(e) => setSelection(ch.id, e.target.value)}>
                    <option value="">— válassz —</option>
                    {ch.options.map((o) => (
                      <option key={o.name} value={o.name}>{o.name}</option>
                    ))}
                  </Select>,
                  i === choiceList.length - 1
                )
              )}
              {!raceAllowed && (
                <Text fontSize="sm" color="bad" mt={2}>
                  A(z) {record.race} faj nem választható ehhez a kaszthoz.
                </Text>
              )}
              <Text fontFamily="system-ui" fontSize="11.5px" color="fgFaint" mt={2}>
                Kaszt költsége: {klass ? klass.cost : "?"} · Faj költsége: {RACES[record.race]?.cost ?? "?"}
              </Text>
            </Box>
          </Panel>

          <Panel>
            <AttributeEditor
              record={record}
              derived={derived}
              onChange={(s: Stat, v: number) => patchPointBuy(s, v)}
              onAdottsag={setAdottsag}
            />
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
              onAddVariant={addSkillVariant}
              onPatchVariant={patchPurchaseById}
              onRemoveVariant={removePurchaseById}
              onOverride={setSubtypeOverride}
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

        {/* ── Right: live sheet (scrolls independently) ── */}
        <Panel maxH={{ base: "none", md: "calc(100vh - 28px)" }} overflowY={{ base: "visible", md: "auto" }}>
          <Heading fontSize={{ base: "23px", md: "20px" }} fontWeight={700} mb={3} color="fg">Karakterlap (élő)</Heading>
          <Divider mb={3} borderColor="hair" />
          <SheetPreview d={derived} />
        </Panel>
      </SimpleGrid>
    </Box>
  );
};

export default CharacterBuilder;
