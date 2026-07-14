import React, { useState } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { VitalKey } from "../../model/character";
import { VIT_TOKEN } from "../../model/vitals";
import { NumPadDialog } from "./NumPadDialog";
import { Card, SecHead, Empty } from "./primitives";

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

export const VitalsCard: React.FC<{ rows: VitalRow[]; onSetVital: (key: VitalKey, value: number) => void }> = ({ rows, onSetVital }) => {
  const [editing, setEditing] = useState<number | null>(null);
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
        {rows.length === 0 && <Empty>Nincs életerő-tároló.</Empty>}
      </Card>
      {editing !== null && rows[editing] && (
        <VitalModal v={rows[editing]} onSetCur={(n) => onSetVital(rows[editing].key, n)} onClose={() => setEditing(null)} />
      )}
    </>
  );
};
