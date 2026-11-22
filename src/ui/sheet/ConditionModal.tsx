import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Flex, Heading, HStack, Input, Text } from "@chakra-ui/react";
import { ModalShell, ModalCloseButton } from "../Modal";
import { ConfirmModal } from "../ConfirmModal";
import { CharacterCondition } from "../../model/character";
import { Effect } from "../../model/effects";
import { CONDITION_PRESETS, conditionSummary } from "../../model/conditions";
import { CustomModsEditor, ModRow, effectsToRows, rowsToEffects } from "./AddConditionModal";
import { FS_SUB, QuietSwitch } from "./primitives";

const field = {
  size: "sm" as const, bg: "fieldBg", borderColor: "fieldBd", borderRadius: "7px", color: "fg",
  fontSize: "13.5px", focusBorderColor: "accent",
};

const sign = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);

// The full, itemized effects of a condition — the row's one-line summary, unrolled so nothing
// truncates. Bonus effects become label/value lines; `note` effects (book fine print) become text.
const EffectList: React.FC<{ effects: Effect[] }> = ({ effects }) => {
  const bonuses = effects.filter((e) => e.kind !== "note");
  const notes = effects.filter((e) => e.kind === "note");
  return (
    <Box mb="4px">
      {bonuses.length === 0 && notes.length === 0 && (
        <Text fontFamily="ui" fontSize="12.5px" color="fgFaint" py="2px">Nincs módosító — csak emlékeztető.</Text>
      )}
      {bonuses.map((e, i) => {
        const label = e.kind === "combatBonus" ? e.channel : e.kind === "derivedBonus" ? e.target : e.kind === "statBonus" ? e.stat : "";
        const amount = e.kind === "combatBonus" || e.kind === "derivedBonus" || e.kind === "statBonus" ? e.amount : 0;
        return (
          <HStack key={i} justify="space-between" py="3px" borderBottom="1px solid" borderColor="hairSoft">
            <Text fontSize="13px" color="muted">{label}</Text>
            <Text fontSize="13.5px" fontWeight={600} color={amount < 0 ? "bad" : "good"} sx={{ fontVariantNumeric: "tabular-nums" }}>{sign(amount)}</Text>
          </HStack>
        );
      })}
      {notes.map((e, i) => (
        <Text key={i} fontFamily="ui" fontSize="12.5px" color="fg" fontStyle="italic" mt="7px">
          {e.kind === "note" ? e.text : ""}
        </Text>
      ))}
    </Box>
  );
};

// The condition card. Opens read-only: name, the full effects list, the rule note. Editable
// conditions (a preset with a strength, or a fully custom one) get a pencil: the strength re-opens
// the magnitude input, a custom condition gets the same modifier-row editor it was built with.
// Edits persist live (like the companion card); delete lives here, behind a confirm.
export const ConditionModal: React.FC<{
  condition: CharacterCondition;
  onSave: (c: CharacterCondition) => void;
  onDelete: () => void;
  onClose: () => void;
}> = ({ condition, onSave, onDelete, onClose }) => {
  const preset = CONDITION_PRESETS.find((p) => p.key === condition.preset);
  const kind: "magnitude" | "custom" | "fixed" = preset?.magnitude ? "magnitude" : !condition.preset ? "custom" : "fixed";

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(condition.name);
  const [mag, setMag] = useState(String(condition.magnitude ?? preset?.magnitude?.default ?? 1));
  const [rows, setRows] = useState<ModRow[]>(() => (kind === "custom" ? effectsToRows(condition.effects ?? []) : []));

  const assemble = (): CharacterCondition => {
    if (kind === "magnitude" && preset) {
      const n = Math.max(preset.magnitude!.min ?? 0, parseInt(mag, 10) || 0);
      return { ...condition, magnitude: n, effects: preset.effects(n) };
    }
    if (kind === "custom") return { ...condition, name: name.trim() || condition.name, effects: rowsToEffects(rows) };
    return condition;
  };
  const draft = assemble();

  // Persist live on any change (matches the companion card). The ref keeps the effect from re-firing
  // on a re-created onSave; the first render is skipped (nothing changed yet).
  const saveRef = useRef(onSave); saveRef.current = onSave;
  const first = useRef(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (first.current) { first.current = false; return; } saveRef.current(assemble()); }, [name, mag, rows]);

  const note = condition.note ?? preset?.note;
  const sub = preset ? preset.group : "Egyedi állapot";
  const active = condition.active !== false;

  return (
    <ModalShell onClose={onClose} width="min(400px, 100%)" maxH="82vh">
      <Box position="relative" px="20px" pt="18px" pb="12px" borderBottom="1px solid" borderColor="rule">
        <ModalCloseButton onClose={onClose} />
        <Heading as="h3" fontSize={{ base: "19px", md: "20px" }} fontWeight={700} color="fg" noOfLines={1} pr="36px">{draft.name}</Heading>
        <Text fontFamily="ui" fontSize="12px" color="muted" mt="1px">{sub}</Text>
      </Box>

      <Box flex="1 1 auto" overflowY="auto" overflowX="hidden" px="20px" py="15px">
        {mode === "view" ? (
          <>
            {/* in force / suspended — suspending keeps the condition on the sheet without applying it */}
            <HStack justify="space-between" pb="9px" mb="10px" borderBottom="1px solid" borderColor="hair">
              <Text fontSize="13.5px" color="fg">{active ? "Aktív — a módosítók érvényben" : "Kikapcsolva — nem hat"}</Text>
              <QuietSwitch checked={active}
                label={active ? "Kikapcsolás" : "Bekapcsolás"}
                onToggle={() => onSave({ ...assemble(), active: !active })} />
            </HStack>
            <Box fontSize={FS_SUB} fontWeight={700} color="muted" pb="3px" mb="5px" borderBottom="1px solid" borderColor="hair">Módosítók</Box>
            <EffectList effects={draft.effects ?? []} />
            {kind === "magnitude" && preset && (
              <HStack justify="space-between" py="3px" mt="6px">
                <Text fontSize="13px" color="muted">{preset.magnitude!.label}</Text>
                <Text fontSize="13.5px" fontWeight={600} color="fg" sx={{ fontVariantNumeric: "tabular-nums" }}>{draft.magnitude}</Text>
              </HStack>
            )}
            {note && (
              <Box mt="13px" bg="accentSoft" borderRadius="8px" px="12px" py="9px">
                <Text fontFamily="ui" fontSize="12.5px" color="fg" fontStyle="italic">{note}</Text>
              </Box>
            )}
            <Flex justify="space-between" align="center" gap="9px" mt="18px">
              <Button variant="ghost" size="sm" color="bad" px="8px" _hover={{ bg: "accentSoft" }} onClick={() => setConfirmDelete(true)}>Törlés</Button>
              {kind !== "fixed" && (
                <Button size="sm" bg="accent" color="onAccent" _hover={{ opacity: 0.9 }} onClick={() => setMode("edit")}>Szerkesztés</Button>
              )}
            </Flex>
          </>
        ) : (
          <>
            {kind === "custom" && (
              <>
                <Text fontFamily="ui" fontSize="12px" color="muted" mb="4px">Név</Text>
                <Input {...field} value={name} onChange={(e) => setName(e.target.value)} w="100%" mb="14px" />
                <CustomModsEditor rows={rows} onRows={setRows} />
              </>
            )}
            {kind === "magnitude" && preset && (
              <>
                <Text fontFamily="ui" fontSize="12px" color="muted" mb="4px">{preset.magnitude!.label}</Text>
                <Input {...field} value={mag} onChange={(e) => setMag(e.target.value)} inputMode="numeric" autoFocus w="100%" mb="10px"
                  sx={{ fontVariantNumeric: "tabular-nums" }} />
              </>
            )}
            <Text fontFamily="ui" fontSize="12.5px" color="accentTx" minH="18px" mb="12px" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {conditionSummary(draft.effects ?? []) || "Nincs módosító — csak emlékeztető."}
            </Text>
            <Flex justify="space-between" align="center" gap="9px">
              <Button variant="ghost" size="sm" color="bad" px="8px" _hover={{ bg: "accentSoft" }} onClick={() => setConfirmDelete(true)}>Törlés</Button>
              <Button size="sm" bg="accent" color="onAccent" _hover={{ opacity: 0.9 }} onClick={() => setMode("view")}>Kész</Button>
            </Flex>
          </>
        )}
      </Box>

      {confirmDelete && (
        <ConfirmModal title="Állapot eltávolítása" confirmLabel="Eltávolítás"
          onConfirm={() => { onDelete(); onClose(); }} onClose={() => setConfirmDelete(false)}>
          Biztosan törlöd a(z) <b>{draft.name}</b> állapotot? Ha csak ideiglenesen nem hat, elég kikapcsolnod — úgy a lapon marad.
        </ConfirmModal>
      )}
    </ModalShell>
  );
};
