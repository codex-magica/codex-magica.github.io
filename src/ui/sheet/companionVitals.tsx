import React from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { NumPadDialog } from "./NumPadDialog";

export const pct = (cur: number, max: number) => (max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0);
export const clampVital = (n: number, max: number) => Math.max(0, Math.min(n, max));

// A live Ép/Fp bar for a companion — same look as the character's vitals; tapping opens a heal/damage
// pad. `stop` guards the card case (a row click behind it that must not also fire).
export const VitalBar: React.FC<{ label: string; cur: number; max: number; token: string; onOpen: () => void; stop?: boolean }> = ({ label, cur, max, token, onOpen, stop }) => (
  <Box as="button" type="button" onClick={(e: React.MouseEvent) => { if (stop) e.stopPropagation(); onOpen(); }} w="100%" textAlign="left" display="block">
    <HStack justify="space-between" align="baseline" mb="3px" gap="8px">
      <Text fontFamily="system-ui" fontSize="10.5px" letterSpacing=".05em" color="muted">{label}</Text>
      <Text fontSize="12px" fontWeight={600} color={cur === 0 ? "fgFaint" : "fg"} sx={{ fontVariantNumeric: "tabular-nums" }}>{cur} / {max}</Text>
    </HStack>
    <Box h="7px" borderRadius="3px" bg="vitTrack" overflow="hidden"><Box h="100%" w={`${pct(cur, max)}%`} bg={token} borderRadius="3px" transition="width .3s" /></Box>
  </Box>
);

// Heal/damage pad for one of a companion's pools (reuses the shared vitals numpad).
export const VitalPad: React.FC<{ title: string; cur: number; max: number; token: string; onSet: (n: number) => void; onClose: () => void }> = ({ title, cur, max, token, onSet, onClose }) => {
  const set = (n: number) => onSet(clampVital(n, max));
  return (
    <NumPadDialog
      title={title}
      readout={<Text as="span" color={cur === 0 ? "bad" : "accentTx"}>{cur} / {max}</Text>}
      topContent={
        <Box h={{ base: "8px", md: "9px" }} borderRadius="3px" bg="vitTrack" overflow="hidden" mb={{ base: "10px", md: "14px" }}>
          <Box h="100%" w={`${pct(cur, max)}%`} bg={token} borderRadius="3px" transition="width .3s" />
        </Box>
      }
      upLabel="+ Gyógyítás" downLabel="− Sebzés"
      onUp={(a) => set(cur + a)} onDown={(a) => set(cur - a)}
      tertiaryLabel={() => "Teljes feltöltés"} onTertiary={() => set(max)}
      onClose={onClose}
    />
  );
};
