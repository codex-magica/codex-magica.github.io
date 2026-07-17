import React, { useState } from "react";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { CharacterCondition, VitalKey } from "../../model/character";
import { VIT_TOKEN } from "../../model/vitals";
import { conditionSummary } from "../../model/conditions";
import { NumPadDialog } from "./NumPadDialog";
import { AddConditionModal } from "./AddConditionModal";
import { ConditionModal } from "./ConditionModal";
import { ReorderList } from "./ReorderList";
import { ConfirmModal } from "../ConfirmModal";
import { Card, SecHead, Empty, EditRow, PanelAddButton, PanelEditButton, QuietSwitch, FS, FS_SUB, ROWPY } from "./primitives";

export interface VitalRow { key: VitalKey; label: string; kind: string; cur: number; max: number }

const pct = (cur: number, max: number) => (max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0);

// heal/damage (Ép, Fp) · use/gain (Mana, Kegy, Pszi) calculator
const VitalModal: React.FC<{ v: VitalRow; onSetCur: (n: number) => void; onClose: () => void }> = ({ v, onSetCur, onClose }) => {
  const healable = v.kind === "hp" || v.kind === "fp";
  const set = (n: number) => onSetCur(Math.max(0, Math.min(n, v.max)));
  return (
    <NumPadDialog
      title={v.label}
      readout={<Text as="span" color={v.cur === 0 ? "bad" : "accentTx"}>{v.cur} / {v.max}</Text>}
      topContent={
        <Box h={{ base: "8px", md: "9px" }} borderRadius="3px" bg="vitTrack" overflow="hidden" mb={{ base: "10px", md: "14px" }}>
          <Box h="100%" w={`${pct(v.cur, v.max)}%`} bg={VIT_TOKEN[v.kind]} borderRadius="3px" transition="width .3s" />
        </Box>
      }
      upLabel={healable ? "+ Gyógyítás" : "+ Visszanyerés"}
      downLabel={healable ? "− Sebzés" : "− Felhasználás"}
      onUp={(amt) => set(v.cur + amt)}
      onDown={(amt) => set(v.cur - amt)}
      tertiaryLabel={() => "Teljes feltöltés"}
      onTertiary={() => set(v.max)}
      onClose={onClose}
    />
  );
};

export const VitalsCard: React.FC<{
  rows: VitalRow[];
  onSetVital: (key: VitalKey, value: number) => void;
  conditions: CharacterCondition[];
  onSetConditions: (conditions: CharacterCondition[]) => void;
}> = ({ rows, onSetVital, conditions, onSetConditions }) => {
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  // Tapping a row opens the condition card (view / edit / toggle / delete live there); keyed by id
  // so the modal follows live edits to the same condition.
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = conditions.find((c) => c.id === viewingId);
  // The header pencil flips the list into edit mode: add / delete / drag-reorder appear only there,
  // so the resting rows stay clean.
  const [editMode, setEditMode] = useState(false);
  const [removing, setRemoving] = useState<CharacterCondition | null>(null);
  return (
    <>
      <Card>
        <SecHead>Életerő</SecHead>
        {rows.map((v, i) => {
          const empty = v.cur === 0;
          return (
            <Box as="button" type="button" key={v.key} onClick={() => setEditing(i)} w="100%" textAlign="left" display="block" mb="9px" px="5px" mx="-5px" py="2px" borderRadius="6px" _hover={{ bg: "accentSoft" }}>
              <HStack justify="space-between" align="baseline" mb="5px" gap="8px">
                <Text fontFamily="system-ui" fontSize="11px" letterSpacing=".05em" color="muted">{v.label}</Text>
                <Text fontSize="13.5px" fontWeight={600} color={empty ? "fgFaint" : "fg"} sx={{ fontVariantNumeric: "tabular-nums" }}>{v.cur} / {v.max}</Text>
              </HStack>
              <Box h={{ base: "11px", md: "8px" }} borderRadius="3px" bg="vitTrack" overflow="hidden"><Box h="100%" w={`${pct(v.cur, v.max)}%`} bg={VIT_TOKEN[v.kind]} borderRadius="3px" transition="width .3s" /></Box>
            </Box>
          );
        })}
        {rows.length === 0 && <Empty>Nincsenek életerő-pontok.</Empty>}

        {/* Állapotok — most of the time there are none, so this collapses to a single line and the
            card keeps its size. Each active condition is already folded into the derived values.
            Resting rows are clean (tap = the condition card); the pencil opens edit mode with
            add / delete / drag-reorder. */}
        <Flex align="center" justify="space-between" gap="10px" mt="13px" mb="3px" pb="3px" borderBottom="1px solid" borderColor="hair">
          <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em">Állapotok</Box>
          <PanelEditButton editing={editMode} onToggle={() => setEditMode(!editMode)} label="Állapotok szerkesztése" />
        </Flex>
        {conditions.length === 0 && !editMode && (
          <Text fontFamily="ui" fontSize="11.5px" color="fgFaint" py="3px">Nincs aktív állapot.</Text>
        )}
        {!editMode && conditions.map((c) => {
          const on = c.active !== false;
          return (
            // Tap the row for the condition card; the switch (its own control, outside the tap area)
            // flips it in force / suspended. In force = accent modifiers, a faint rule down the left
            // edge; suspended = greyed and struck through.
            <Flex key={c.id} align="stretch" gap="4px" ml="-5px" mr="-5px">
              <Box role="button" tabIndex={0} cursor="pointer" title="Részletek" flex="1 1 auto" minW={0}
                onClick={() => setViewingId(c.id)}
                py={ROWPY} pl="8px" pr="3px" borderRadius="6px"
                borderLeft="1px solid" borderColor={on ? "hair" : "transparent"} _hover={{ bg: "accentSoft" }}>
                <Text color={on ? "fg" : "fgFaint"} fontSize={FS} noOfLines={1} minW={0}
                  sx={{ textDecoration: on ? undefined : "line-through" }}>{c.name}</Text>
                {conditionSummary(c.effects ?? []) && (
                  <Text fontFamily="ui" fontSize="11.5px" mt="1px" color={on ? "accentTx" : "fgFaint"} noOfLines={2}
                    title={conditionSummary(c.effects ?? [])}
                    sx={{ fontVariantNumeric: "tabular-nums", textDecoration: on ? undefined : "line-through" }}>
                    {conditionSummary(c.effects ?? [])}
                  </Text>
                )}
              </Box>
              <Flex align="center" flexShrink={0}>
                <QuietSwitch checked={on}
                  label={on ? `${c.name} kikapcsolása` : `${c.name} bekapcsolása`}
                  onToggle={() => onSetConditions(conditions.map((x) => (x.id === c.id ? { ...x, active: !on } : x)))} />
              </Flex>
            </Flex>
          );
        })}
        {editMode && (
          <>
            <ReorderList
              items={conditions}
              keyOf={(c) => c.id}
              onReorder={onSetConditions}
              row={(c, grip) => {
                const on = c.active !== false;
                return (
                  <EditRow onDelete={() => setRemoving(c)} deleteLabel={`${c.name} eltávolítása`} grip={grip}>
                    <Text color={on ? "fg" : "fgFaint"} fontSize={FS} noOfLines={1}
                      sx={{ textDecoration: on ? undefined : "line-through" }}>{c.name}</Text>
                  </EditRow>
                );
              }}
            />
            <PanelAddButton onClick={() => setAdding(true)}>+ Állapot hozzáadása</PanelAddButton>
          </>
        )}
      </Card>
      {editing !== null && rows[editing] && (
        <VitalModal v={rows[editing]} onSetCur={(n) => onSetVital(rows[editing].key, n)} onClose={() => setEditing(null)} />
      )}
      {adding && (
        <AddConditionModal onAdd={(c) => onSetConditions([...conditions, c])} onClose={() => setAdding(false)} />
      )}
      {viewing && (
        <ConditionModal
          condition={viewing}
          onSave={(c) => onSetConditions(conditions.map((x) => (x.id === c.id ? c : x)))}
          onDelete={() => onSetConditions(conditions.filter((x) => x.id !== viewing.id))}
          onClose={() => setViewingId(null)}
        />
      )}
      {removing && (
        <ConfirmModal title="Állapot eltávolítása" confirmLabel="Eltávolítás"
          onConfirm={() => { onSetConditions(conditions.filter((x) => x.id !== removing.id)); setRemoving(null); }}
          onClose={() => setRemoving(null)}>
          Biztosan törlöd a(z) <b>{removing.name}</b> állapotot? Ha csak ideiglenesen nem hat, elég kikapcsolnod — úgy a lapon marad.
        </ConfirmModal>
      )}
    </>
  );
};
