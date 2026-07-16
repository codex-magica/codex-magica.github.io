import React, { useMemo, useState } from "react";
import { Box, Heading, HStack, Input, Switch, Text, VStack } from "@chakra-ui/react";
import { ConfirmModal } from "./ConfirmModal";
import { CharacterBuilderApi } from "../state/useCharacterBuilder";
import { derive } from "../engine/derive";
import { isHomebrew, rulesFor } from "../model/rulesVariants";
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
import { CustomClassModal } from "./CustomClassModal";
import { customClassActive } from "../model/customClass";
import { ClassDef } from "../model/classes/def";
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
  <Box bg={bg} border="1px solid" borderColor={borderColor || bg} borderRadius="9px" px={{ base: "11px", md: "16px" }} py={{ base: "4px", md: "6px" }} minW={{ base: "62px", md: "78px" }} textAlign="center">
    <Text fontFamily="system-ui" fontSize={{ base: "8.5px", md: "9.5px" }} fontWeight={700} letterSpacing=".13em" textTransform="uppercase" color="fgFaint">{caption}</Text>
    <Text fontSize={{ base: "17px", md: "20px" }} fontWeight={700} lineHeight="1.15" color={numColor} sx={{ fontVariantNumeric: "tabular-nums" }}>{value}</Text>
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
    setSkillPathChoice,
    setSkillChosenAttrs,
    setGrantedHmChannel,
    setKmAdjustments,
  } = api;

  const [selectedLevel, setSelectedLevel] = useState(1); // which level the editor targets (edit mode)
  const [pendingClass, setPendingClass] = useState<string | null>(null); // class change awaiting hard confirm
  const [pendingCustomClass, setPendingCustomClass] = useState<ClassDef | null>(null); // custom-class switch awaiting confirm
  const [pendingRace, setPendingRace] = useState<string | null>(null); // race change awaiting hard confirm
  const [picker, setPicker] = useState<"race" | "class" | null>(null); // open race/class browser modal
  const [specChoice, setSpecChoice] = useState<ChoiceDef | null>(null); // open specialization browser modal
  const [customClassOpen, setCustomClassOpen] = useState(false); // open the custom-class builder modal

  const applyRaceChange = (race: string) => {
    const caps = RACES[race].statLimits;
    const clamped = { ...record.pointBuy };
    STAT_KEYS.forEach((s) => {
      if (clamped[s] > caps[s]) clamped[s] = caps[s];
    });
    update({ race, pointBuy: clamped });
  };

  // Class drives grants/backgrounds/choices, so changing it resets what hangs off the OLD class: the
  // specialization selections, the granted-subtype renames (they key off old grant labels) and the granted
  // background levels. Purchases made redundant by the new class's grants are auto-pruned = DELETED.
  const applyClassChange = (cls: string) =>
    update({ class: cls, customClass: undefined, selections: defaultSelections(CLASSES[cls].choices), subtypeOverrides: {}, grantedBgLevels: {} });
  // Changing race/class on a character with progress can invalidate (and via auto-prune, delete) later
  // work — gate both behind a hard confirm. A fresh level-1 character has nothing to lose, so skip it.
  const hasProgress =
    record.levels.length > 1 ||
    record.levels.some((l) => l.skillPurchases.length || l.allocations.length || l.hmAssignments.length || l.statIncreases.length || (l.grantedHmAssignments?.length ?? 0));
  const onClassChange = (cls: string) => {
    if (customClassActive(record)?.name === cls) return; // re-picking the active custom class — no change
    return hasProgress ? setPendingClass(cls) : applyClassChange(cls);
  };
  const onRaceChange = (race: string) => (hasProgress ? setPendingRace(race) : applyRaceChange(race));

  // Commit a KM custom class: carry the whole ClassDef on the record and point `class` at its name, so
  // derive resolves it (see customClassActive). Clears the old class's specialization-linked state.
  const commitCustomClass = (def: ClassDef) =>
    update({ class: def.name, customClass: def, selections: {}, subtypeOverrides: {}, grantedBgLevels: {} });
  // Saving from the builder: refining the ACTIVE custom class in place is safe (no class switch), but
  // switching TO a custom class (from a built-in or a renamed one) can auto-prune purchases like any class
  // change — so gate that behind the same hard confirm on a character with progress.
  const onSaveCustomClass = (def: ClassDef) => {
    setCustomClassOpen(false);
    const switching = customClassActive(record)?.name !== def.name;
    if (hasProgress && switching) setPendingCustomClass(def);
    else commitCustomClass(def);
  };

  // The record's rules variant: option grants shown in the spec-picker reflect the house rules.
  // (Choice STRUCTURE — ids, labels, option names — is identical across variants.) A custom class on the
  // record wins over the catalog lookup.
  const klass = customClassActive(record) ?? rulesFor(record).classes[record.class];
  const choiceList = klass ? activeChoices(klass.choices, record.selections) : [];
  const raceAllowed = klass ? klass.allowedRaces.indexOf(record.race) >= 0 : true;

  // House rule (skill rework): set at creation only. Flipping mid-creation prunes purchases that name
  // skills absent from the target catalog (e.g. Veszélyérzék ↔ Éberség) so no orphan entries linger.
  const setSkillRework = (on: boolean) => {
    const target = rulesFor({ houseRules: { skillRework: on } });
    const levels = record.levels.map((l) => ({ ...l, skillPurchases: l.skillPurchases.filter((p) => target.skills[p.skill]) }));
    update({ houseRules: { ...record.houseRules, skillRework: on }, levels });
  };
  const showHomebrewToggle = mode === "create";

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
  const subLine = `${record.race} ${record.class} · ${record.levels.length}. szint${isHomebrew(record) ? " · házi szabály" : ""}`;

  // The per-level panels must show skills/pools AS OF the level being edited (not the final state) — else
  // raising a skill at an earlier level would start from its level-N value. Re-derive the record truncated
  // to the active level; for the last level (and level-up) that's the full derived already.
  const isLastLevel = activeLevel >= record.levels.length;
  const truncDerived = useMemo(
    () => (isLastLevel ? null : derive(rulesFor(record), { ...record, levels: record.levels.slice(0, activeLevel) })),
    [isLastLevel, record, activeLevel]
  );
  const editDerived = truncDerived ?? derived;

  const fieldRow = (label: string, control: React.ReactNode, last?: boolean) => (
    <HStack key={label} align="center" py="9px" borderBottom={last ? undefined : "1px solid"} borderColor="hair" spacing={3}>
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
    <Box py={{ base: "12px", md: "14px" }} px={{ base: "4px", md: "14px" }} pb={{ base: "24px", md: "14px" }} bg="page" color="fg">
      <VStack align="stretch" spacing="14px">
        {/* Sticky balance header — pins to the top of the drawer's scroll area */}
        <ParchPanel position="sticky" top="0" zIndex={6} py={{ base: "9px", md: "12px" }} px={{ base: "14px", md: "16px" }}>
          <HStack justify="space-between" gap={{ base: "10px", md: "14px" }} flexWrap={{ base: "nowrap", md: "wrap" }}>
            <Box minW={0}>
              <Heading fontSize={{ base: "19px", md: "24px" }} fontWeight={700} color="fg" noOfLines={1}>
                {record.name || "Névtelen"}
              </Heading>
              <Text fontFamily="system-ui" fontSize="11px" color="fgFaint" letterSpacing=".04em" noOfLines={1}>{subLine}</Text>
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
            {fieldRow("Kaszt", pickerButton(record.class, () => setPicker("class")), choiceList.length === 0 && !showHomebrewToggle)}
            {choiceList.map((ch, i) =>
              fieldRow(
                ch.label,
                pickerButton(record.selections[ch.id] || "— válassz —", () => setSpecChoice(ch)),
                i === choiceList.length - 1 && !showHomebrewToggle
              )
            )}
            {showHomebrewToggle &&
              fieldRow(
                "Házi szabály",
                <HStack spacing={3} align="center" minW={0}>
                  <Switch isChecked={isHomebrew(record)} onChange={(e) => setSkillRework(e.target.checked)} colorScheme="orange" />
                  <Box minW={0}>
                    <Text fontSize="14px" color="fg">Képzettség-átdolgozás</Text>
                    <Text fontFamily="system-ui" fontSize="11px" color="fgFaint" lineHeight="1.4">
                      Százalékos képzettségek fokossá alakítva · Rejtekhelykutatás + Csapdakeresés + Veszélyérzék → Éberség
                    </Text>
                  </Box>
                </HStack>,
                true
              )}
            {!showHomebrewToggle && isHomebrew(record) && (
              <Text fontFamily="system-ui" fontSize="11.5px" color="accentTx" mt={2}>
                Házi szabály aktív: képzettség-átdolgozás (karakteralkotáskor rögzítve)
              </Text>
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
            onSetPathChoice={setSkillPathChoice}
            onSetChosenAttrs={setSkillChosenAttrs}
          />
        </ParchPanel>

        <ParchPanel>
          <LevelGainsPanel level={activeLevel} record={record} derived={editDerived} onGrantedHm={setGrantedHmChannel} onKmChange={setKmAdjustments} />
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
          key={picker} // remount when switching between the race and class browser — no stale view state
          kind={picker}
          selected={picker === "race" ? record.race : record.class}
          onPick={picker === "race" ? onRaceChange : onClassChange}
          onClose={() => setPicker(null)}
          onCustom={() => { setPicker(null); setCustomClassOpen(true); }}
          customLabel={customClassActive(record) ? "✎ Egyedi kaszt szerkesztése" : "＋ Egyedi kaszt…"}
          customClass={customClassActive(record)}
        />
      )}

      {customClassOpen && (
        <CustomClassModal initial={customClassActive(record)} onSave={onSaveCustomClass} onClose={() => setCustomClassOpen(false)} />
      )}

      {specChoice && (
        <SpecPicker
          key={specChoice.id}
          choice={specChoice}
          className={record.class}
          classDef={klass}
          selected={record.selections[specChoice.id] || ""}
          onPick={(name) => setSelection(specChoice.id, name)}
          onClose={() => setSpecChoice(null)}
        />
      )}

      {pendingClass && (
        <ConfirmModal title="Kaszt módosítása" confirmLabel="Kaszt módosítása"
          onConfirm={() => { applyClassChange(pendingClass); setPendingClass(null); }} onClose={() => setPendingClass(null)}>
          A kaszt <b>{record.class}</b> → <b>{pendingClass}</b> módosítása megváltoztatja a kapott
          képzettségeket, hátteret és a kaszthoz kötött választásokat. A magasabb szinteken elköltött
          pontok érvénytelenné válhatnak: a fölöslegessé vált képzettségvásárlások automatikusan
          törlődnek, a túlköltött szinteket pedig jelöljük. Folytatod?
        </ConfirmModal>
      )}

      {pendingCustomClass && (
        <ConfirmModal title="Egyedi kaszt beállítása" confirmLabel="Beállítás"
          onConfirm={() => { commitCustomClass(pendingCustomClass); setPendingCustomClass(null); }} onClose={() => setPendingCustomClass(null)}>
          A kaszt <b>{record.class}</b> → <b>{pendingCustomClass.name}</b> módosítása megváltoztatja a kapott
          képzettségeket és a kaszthoz kötött választásokat. A fölöslegessé vált képzettségvásárlások
          automatikusan törlődnek. Folytatod?
        </ConfirmModal>
      )}

      {pendingRace && (
        <ConfirmModal title="Faj módosítása" confirmLabel="Faj módosítása"
          onConfirm={() => { applyRaceChange(pendingRace); setPendingRace(null); }} onClose={() => setPendingRace(null)}>
          A faj <b>{record.race}</b> → <b>{pendingRace}</b> módosítása megváltoztatja a faji
          képességeket, tulajdonság-maximumokat és bónuszokat. A magasabb szinteken elköltött pontok
          érvénytelenné válhatnak: a fölöslegessé vált vásárlások automatikusan törlődnek, a
          tulajdonság-pontokat pedig újra az új maximumokhoz kell igazítani. Folytatod?
        </ConfirmModal>
      )}
    </Box>
  );
};

export default CharacterBuilder;
