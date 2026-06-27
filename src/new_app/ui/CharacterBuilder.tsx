import React from "react";
import { Box, Heading, HStack, Input, Select, Text, VStack } from "@chakra-ui/react";
import { CharacterBuilderApi } from "../state/useCharacterBuilder";
import { RACES, RACE_NAMES } from "../model/races";
import { CLASSES, CLASS_NAMES } from "../model/classes";
import { activeChoices, defaultSelections } from "../model/choices";
import { STAT_KEYS, Stat } from "../model/attributes";
import { AttributeEditor } from "./AttributeEditor";
import { BackgroundSelector } from "./BackgroundSelector";
import { SkillLevelPanel } from "./SkillLevelPanel";
import { PointBuyPanel } from "./PointBuyPanel";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { ParchPanel } from "./ParchPanel";

// A balance chip in the sticky header (KAP maradék / Alappont) — the eye's anchor point.
const BalanceChip: React.FC<{ caption: string; value: number; numColor: string; bg: string; borderColor?: string }> = ({
  caption,
  value,
  numColor,
  bg,
  borderColor,
}) => (
  <Box bg={bg} border="1px solid" borderColor={borderColor || bg} borderRadius="9px" px="16px" py="6px" minW="78px" textAlign="center">
    <Text fontFamily="system-ui" fontSize="9.5px" fontWeight={700} letterSpacing=".13em" textTransform="uppercase" color="fgFaint">{caption}</Text>
    <Text fontSize="20px" fontWeight={700} lineHeight="1.15" color={numColor} sx={{ fontVariantNumeric: "tabular-nums" }}>{value}</Text>
  </Box>
);

// The character creator — the left editor column. Rendered inside the full-screen creator (which
// provides the scroll container, the header and the confirm button). Controlled by `api`.
export const CharacterBuilder: React.FC<{ api: CharacterBuilderApi }> = ({ api }) => {
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
    setLearnedSubtype,
    setResourceAllocation,
    setHmChannel,
    setStatBuy,
  } = api;

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

  // Header balance anchors.
  const kap = derived.pools.kapBalanceByLevel[0] ?? 0;
  const cap = RACES[record.race]?.statLimits;
  const baseUsed = STAT_KEYS.reduce((sum, s) => sum + Math.min(record.pointBuy[s], cap ? cap[s] : record.pointBuy[s]), 0);
  const alappont = 135 - baseUsed;
  const subLine = `${record.race} ${record.class} · ${record.levels.length}. szint`;

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
    <Box p={{ base: "16px", md: "14px" }} bg="page" color="fg">
      <VStack align="stretch" spacing="14px">
        {/* Sticky balance header — pins to the top of the drawer's scroll area */}
        <ParchPanel position="sticky" top="0" zIndex={6} py="12px">
          <HStack justify="space-between" gap="14px" flexWrap="wrap">
            <Box minW={0}>
              <Heading fontSize={{ base: "27px", md: "24px" }} fontWeight={700} color="fg" noOfLines={1}>
                {record.name || "Névtelen"}
              </Heading>
              <Text fontFamily="system-ui" fontSize="11px" color="fgFaint" letterSpacing=".04em">{subLine}</Text>
            </Box>
            <HStack gap="8px">
              <BalanceChip caption="KAP maradék" value={kap} numColor={kap < 0 ? "bad" : "accentTx"} bg="chipBg" borderColor="chipBd" />
              <BalanceChip caption="Alappont" value={alappont} numColor={alappont === 0 ? "good" : alappont < 0 ? "bad" : "fg"} bg="kapottBg" />
            </HStack>
          </HStack>
        </ParchPanel>

        <ParchPanel>
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
        </ParchPanel>

        <ParchPanel>
          <AttributeEditor record={record} derived={derived} onChange={(s: Stat, v: number) => patchPointBuy(s, v)} onAdottsag={setAdottsag} />
        </ParchPanel>

        <ParchPanel>
          <BackgroundSelector record={record} granted={derived.grantedBackgrounds} onToggle={toggleBackground} onLevel={setBackgroundLevel} onOption={setBackgroundOption} />
        </ParchPanel>

        <ParchPanel>
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
            onSetSubtype={setLearnedSubtype}
          />
        </ParchPanel>

        <ParchPanel>
          <PointBuyPanel level={1} record={record} derived={derived} onHm={setHmChannel} onResource={setResourceAllocation} onStat={setStatBuy} />
        </ParchPanel>

        <ParchPanel>
          <DiagnosticsPanel diagnostics={derived.diagnostics} />
        </ParchPanel>
      </VStack>
    </Box>
  );
};

export default CharacterBuilder;
