import React, { useState } from "react";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { CharacterCondition, VitalKey } from "../../model/character";
import { VIT_TOKEN } from "../../model/vitals";
import { conditionSummary } from "../../model/conditions";
import { NumPadDialog } from "./NumPadDialog";
import { AddConditionModal } from "./AddConditionModal";
import { ConfirmModal } from "../ConfirmModal";
import { Card, SecHead, Empty, FS, FS_SUB, ROWPY } from "./primitives";

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
  // Deleting is destructive (a custom condition's modifiers are gone for good) — confirm it. Switching
  // one OFF is the reversible way to stop it applying, so the dialog says so.
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

        {/* Állapotok — most of the time there are none, so this collapses to a single "+" line and the
            card keeps its size. Each active condition is already folded into the derived values. */}
        <Flex align="center" justify="space-between" gap="10px" mt="13px" mb="3px" pb="3px" borderBottom="1px solid" borderColor="hair">
          <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em">Állapotok</Box>
          <Box as="button" type="button" onClick={() => setAdding(true)}
            title="Állapot hozzáadása" aria-label="Állapot hozzáadása"
            display="inline-flex" alignItems="center" justifyContent="center" w="26px" h="22px" flexShrink={0}
            borderRadius="6px" border="1px solid" borderColor="fieldBd" color="accentTx"
            _hover={{ borderColor: "accent", bg: "accentSoft" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </Box>
        </Flex>
        {conditions.length === 0 ? (
          <Text fontFamily="ui" fontSize="11.5px" color="fgFaint" py="3px">Nincs aktív állapot.</Text>
        ) : (
          conditions.map((c) => {
            const on = c.active !== false;
            return (
              // No control of its own: the whole badge IS the toggle. In force = normal weight, accent
              // modifiers, a faint rule down its left edge; switched off = greyed and struck through.
              // Tap anywhere on the row to flip it; the ✕ (stops propagation) removes it for good.
              <Box key={c.id} role="button" tabIndex={0} cursor="pointer"
                title={on ? "Kikapcsolás" : "Bekapcsolás"} aria-pressed={on}
                onClick={() => onSetConditions(conditions.map((x) => (x.id === c.id ? { ...x, active: !on } : x)))}
                py={ROWPY} pl="8px" pr="5px" ml="-5px" mr="-5px" borderRadius="6px"
                borderLeft="1px solid" borderColor={on ? "hair" : "transparent"} _hover={{ bg: "accentSoft" }}>
                <HStack justify="space-between" align="center" gap="8px">
                  <Text color={on ? "fg" : "fgFaint"} fontSize={FS} noOfLines={1} title={c.note} minW={0}
                    sx={{ textDecoration: on ? undefined : "line-through" }}>{c.name}</Text>
                  <Box as="button" type="button" aria-label={`${c.name} eltávolítása`} title="Eltávolítás"
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setRemoving(c); }}
                    color="fgFaint" fontSize="13px" lineHeight="1" px="3px" flexShrink={0} _hover={{ color: "bad" }}>✕</Box>
                </HStack>
                {conditionSummary(c.effects ?? []) && (
                  <Text fontFamily="ui" fontSize="11.5px" mt="1px" color={on ? "accentTx" : "fgFaint"} noOfLines={2}
                    title={conditionSummary(c.effects ?? [])}
                    sx={{ fontVariantNumeric: "tabular-nums", textDecoration: on ? undefined : "line-through" }}>
                    {conditionSummary(c.effects ?? [])}
                  </Text>
                )}
              </Box>
            );
          })
        )}
      </Card>
      {editing !== null && rows[editing] && (
        <VitalModal v={rows[editing]} onSetCur={(n) => onSetVital(rows[editing].key, n)} onClose={() => setEditing(null)} />
      )}
      {adding && (
        <AddConditionModal onAdd={(c) => onSetConditions([...conditions, c])} onClose={() => setAdding(false)} />
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
