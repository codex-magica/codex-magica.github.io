import React, { useState } from "react";
import { Box, Heading, HStack, Input, Text, VStack } from "@chakra-ui/react";
import { ModalShell } from "./Modal";
import { CharacterBuilderApi } from "../state/useCharacterBuilder";
import { derive } from "../engine/derive";
import { RULES } from "../model/rulesDb";
import { RACES } from "../model/races";
import { CLASSES } from "../model/classes";
import { activeChoices, defaultSelections, ChoiceDef } from "../model/choices";
import { STAT_KEYS, Stat } from "../model/attributes";
import { AttributeEditor } from "./AttributeEditor";
import { BackgroundSelector } from "./BackgroundSelector";
import { SkillLevelPanel } from "./SkillLevelPanel";
import { PointBuyPanel } from "./PointBuyPanel";
import { LevelGainsPanel } from "./LevelGainsPanel";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { LedgerPanel } from "./LedgerPanel";
import { RaceClassPicker, SpecPicker } from "./RaceClassPicker";
import { ParchPanel } from "./ParchPanel";
import { FIELD_SX } from "./tokens";

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
export const CharacterBuilder: React.FC<{ api: CharacterBuilderApi; mode: "create" | "edit" | "levelup" }> = ({ api, mode }) => {
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
    setSkillFok4Stat,
    setGrantedHmChannel,
  } = api;

  const [selectedLevel, setSelectedLevel] = useState(1); // which level the editor targets (edit mode)
  const [pendingClass, setPendingClass] = useState<string | null>(null); // class change awaiting hard confirm
  const [picker, setPicker] = useState<"race" | "class" | null>(null); // open race/class browser modal
  const [specChoice, setSpecChoice] = useState<ChoiceDef | null>(null); // open specialization browser modal

  const onRaceChange = (race: string) => {
    const caps = RACES[race].statLimits;
    const clamped = { ...record.pointBuy };
    STAT_KEYS.forEach((s) => {
      if (clamped[s] > caps[s]) clamped[s] = caps[s];
    });
    update({ race, pointBuy: clamped });
  };

  const applyClassChange = (cls: string) =>
    update({ class: cls, selections: defaultSelections(CLASSES[cls].choices) });
  // Class drives grants/backgrounds/choices, so changing it on a character with progress can invalidate
  // later levels — gate it behind a hard confirm. A fresh level-1 character has nothing to lose, so skip it.
  const hasProgress =
    record.levels.length > 1 ||
    record.levels.some((l) => l.skillPurchases.length || l.allocations.length || l.hmAssignments.length || l.statIncreases.length || (l.grantedHmAssignments?.length ?? 0));
  const onClassChange = (cls: string) => (hasProgress ? setPendingClass(cls) : applyClassChange(cls));

  const klass = CLASSES[record.class];
  const choiceList = klass ? activeChoices(klass.choices, record.selections) : [];
  const raceAllowed = klass ? klass.allowedRaces.indexOf(record.race) >= 0 : true;

  // Header balance anchor. (The base point-buy budget lives on the Tulajdonságok panel itself.)
  // Level-up edits the freshly-added last level and hides the level-1-only panels (race/class, attribute
  // point-buy, backgrounds). Create/edit work level 1 with everything shown.
  const isLevelup = mode === "levelup";
  const activeLevel = isLevelup ? record.levels.length : Math.min(selectedLevel, record.levels.length);
  const showBase = activeLevel === 1; // creation panels (race/class/attrs/backgrounds) live on level 1 only
  const showSwitcher = !isLevelup && record.levels.length > 1; // pick which level to edit
  const levelHasConflict = (L: number) =>
    (derived.pools.kapBalanceByLevel[L - 1] ?? 0) < 0 || derived.diagnostics.some((d) => d.atLevel === L && d.severity !== "info");
  const kap = derived.pools.kapBalanceByLevel[activeLevel - 1] ?? 0;
  const subLine = `${record.race} ${record.class} · ${record.levels.length}. szint`;

  // The per-level panels must show skills/pools AS OF the level being edited (not the final state) — else
  // raising a skill at an earlier level would start from its level-N value. Re-derive the record truncated
  // to the active level; for the last level (and level-up) that's the full derived already.
  const editDerived = activeLevel >= record.levels.length
    ? derived
    : derive(RULES, { ...record, levels: record.levels.slice(0, activeLevel) });

  const fieldRow = (label: string, control: React.ReactNode, last?: boolean) => (
    <HStack align="center" py="9px" borderBottom={last ? undefined : "1px solid"} borderColor="hair" spacing={3}>
      <Text w="88px" flexShrink={0} fontSize="sm" color="muted">{label}</Text>
      {control}
    </HStack>
  );
  const selectProps = { ...FIELD_SX, size: "sm" as const };

  // A select-styled button that opens the race/class browser modal.
  const pickerButton = (value: string, onClick: () => void) => (
    <Box as="button" type="button" onClick={onClick} flex="1" h="32px" px="10px" bg="fieldBg" border="1px solid" borderColor="fieldBd" borderRadius="9px" color="fg" display="flex" alignItems="center" justifyContent="space-between" _hover={{ borderColor: "accent" }}>
      <Text fontSize="14px" noOfLines={1}>{value}</Text>
      <Text fontSize="10px" color="muted" ml="6px">▾</Text>
    </Box>
  );

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
            </HStack>
          </HStack>
          {showSwitcher && (
            <HStack gap="6px" mt="11px" flexWrap="wrap">
              <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".09em" textTransform="uppercase" color="fgFaint" mr="2px">Szint</Text>
              {record.levels.map((l) => {
                const active = l.level === activeLevel;
                const conflict = levelHasConflict(l.level);
                return (
                  <Box as="button" key={l.level} type="button" onClick={() => setSelectedLevel(l.level)}
                    position="relative" minW="32px" h="29px" px="9px" borderRadius="8px" border="1px solid"
                    borderColor={active ? "accent" : "fieldBd"} bg={active ? "accentSoft" : "fieldBg"}
                    color={active ? "accentTx" : "muted"} fontWeight={700} fontSize="13px" fontFamily="system-ui"
                    display="inline-flex" alignItems="center" justifyContent="center" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {l.level}
                    {conflict && <Box position="absolute" top="-3px" right="-3px" w="9px" h="9px" borderRadius="full" bg="bad" border="1.5px solid" borderColor="page" />}
                  </Box>
                );
              })}
            </HStack>
          )}
        </ParchPanel>

        {showBase && (
        <ParchPanel>
          <Heading fontSize={{ base: "23px", md: "20px" }} fontWeight={700} mb={2} color="fg">Alapadatok</Heading>
          <Box>
            {fieldRow("Név", <Input {...selectProps} value={record.name} onChange={(e) => update({ name: e.target.value })} />)}
            {fieldRow("Faj", pickerButton(record.race, () => setPicker("race")))}
            {fieldRow("Kaszt", pickerButton(record.class, () => setPicker("class")), choiceList.length === 0)}
            {choiceList.map((ch, i) =>
              fieldRow(
                ch.label,
                pickerButton(record.selections[ch.id] || "— válassz —", () => setSpecChoice(ch)),
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
        )}

        {showBase && (
        <ParchPanel>
          <BackgroundSelector record={record} granted={derived.grantedBackgrounds} onToggle={toggleBackground} onLevel={setBackgroundLevel} onOption={setBackgroundOption} />
        </ParchPanel>
        )}

        {showBase && (
        <ParchPanel>
          <AttributeEditor record={record} derived={derived} onChange={(s: Stat, v: number) => patchPointBuy(s, v)} onAdottsag={setAdottsag} />
        </ParchPanel>
        )}

        <ParchPanel>
          <SkillLevelPanel
            level={activeLevel}
            record={record}
            derived={editDerived}
            onUpsert={upsertSkillPurchase}
            onRemove={removeSkillPurchase}
            onAddVariant={addSkillVariant}
            onPatchVariant={patchPurchaseById}
            onRemoveVariant={removePurchaseById}
            onOverride={setSubtypeOverride}
            onSetSubtype={setLearnedSubtype}
            onSetFok4Stat={setSkillFok4Stat}
          />
        </ParchPanel>

        <ParchPanel>
          <LevelGainsPanel level={activeLevel} record={record} derived={editDerived} onGrantedHm={setGrantedHmChannel} />
        </ParchPanel>

        <ParchPanel>
          <PointBuyPanel level={activeLevel} record={record} derived={editDerived} onHm={setHmChannel} onResource={setResourceAllocation} onStat={setStatBuy} />
        </ParchPanel>

        <ParchPanel>
          <LedgerPanel record={record} derived={derived} />
        </ParchPanel>

        <ParchPanel>
          <DiagnosticsPanel diagnostics={derived.diagnostics} />
        </ParchPanel>
      </VStack>

      {picker && (
        <RaceClassPicker
          kind={picker}
          selected={picker === "race" ? record.race : record.class}
          onPick={picker === "race" ? onRaceChange : onClassChange}
          onClose={() => setPicker(null)}
        />
      )}

      {specChoice && (
        <SpecPicker
          choice={specChoice}
          className={record.class}
          selected={record.selections[specChoice.id] || ""}
          onPick={(name) => setSelection(specChoice.id, name)}
          onClose={() => setSpecChoice(null)}
        />
      )}

      {pendingClass && (
        <ModalShell onClose={() => setPendingClass(null)} width="min(440px, 100%)">
          <Box p="22px">
            <Heading fontSize="18px" fontWeight={700} color="fg" mb={2}>Kaszt módosítása</Heading>
            <Text fontSize="14px" color="muted" lineHeight="1.55" mb={4}>
              A kaszt <b>{record.class}</b> → <b>{pendingClass}</b> módosítása megváltoztatja a kapott
              képzettségeket, hátteret és a kaszthoz kötött választásokat. A magasabb szinteken elköltött
              pontok érvénytelenné válhatnak: a fölöslegessé vált képzettségvásárlások automatikusan
              törlődnek, a túlköltött szinteket pedig jelöljük. Folytatod?
            </Text>
            <HStack justify="flex-end" gap="9px">
              <Box as="button" type="button" onClick={() => setPendingClass(null)} px="15px" py="9px" borderRadius="9px" border="1px solid" borderColor="hair" bg="transparent" color="muted" fontWeight={600} fontSize="15px" _hover={{ borderColor: "accent" }}>
                Mégse
              </Box>
              <Box as="button" type="button" onClick={() => { applyClassChange(pendingClass); setPendingClass(null); }} px="18px" py="9px" borderRadius="9px" border="1px solid" borderColor="bad" bg="bad" color="white" fontWeight={700} fontSize="15px">
                Kaszt módosítása
              </Box>
            </HStack>
          </Box>
        </ModalShell>
      )}
    </Box>
  );
};

export default CharacterBuilder;
