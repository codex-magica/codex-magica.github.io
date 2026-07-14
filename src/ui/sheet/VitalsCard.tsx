import React, { useState } from "react";
import { Box, Heading, HStack, Text } from "@chakra-ui/react";
import { VitalKey } from "../../model/character";
import { VIT_TOKEN } from "../../model/vitals";
import { ModalShell, ModalHeader } from "../Modal";
import { NumPad } from "../NumPad";
import { Card, SecHead, Empty } from "./primitives";

export interface VitalRow { key: VitalKey; label: string; kind: string; cur: number; max: number }

const pct = (cur: number, max: number) => (max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0);

// heal/damage (Ép, Fp) · use/gain (Mana, Kegy, Pszi) calculator
const VitalModal: React.FC<{ v: VitalRow; onSetCur: (n: number) => void; onClose: () => void }> = ({ v, onSetCur, onClose }) => {
  const [amount, setAmount] = useState("");
  const amt = parseInt(amount, 10) || 0;
  const healable = v.kind === "hp" || v.kind === "fp";
  const downLabel = healable ? "− Sebzés" : "− Felhasználás";
  const upLabel = healable ? "+ Gyógyítás" : "+ Visszanyerés";
  const set = (n: number) => onSetCur(Math.max(0, Math.min(n, v.max)));
  const apply = (mode: "heal" | "damage") => { if (amt <= 0) return; set(mode === "heal" ? v.cur + amt : v.cur - amt); setAmount(""); };

  return (
    <ModalShell onClose={onClose} width="min(360px, 100%)">
      <ModalHeader onClose={onClose} pt={{ base: "14px", md: "18px" }} pb={{ base: "10px", md: "13px" }}>
        <Heading as="h3" fontSize={{ base: "18px", md: "20px" }} fontWeight={700} color="fg">{v.label}</Heading>
        <Text mt="2px" fontSize={{ base: "19px", md: "22px" }} fontWeight={700} color={v.cur === 0 ? "bad" : "accentTx"} sx={{ fontVariantNumeric: "tabular-nums" }}>{v.cur} / {v.max}</Text>
      </ModalHeader>
      <Box flex="1 1 auto" overflowY="auto" px="20px" pt={{ base: "10px", md: "14px" }} pb={{ base: "14px", md: "20px" }}>
        <Box h={{ base: "8px", md: "9px" }} borderRadius="3px" bg="vitTrack" overflow="hidden" mb={{ base: "10px", md: "14px" }}><Box h="100%" w={`${pct(v.cur, v.max)}%`} bg={VIT_TOKEN[v.kind]} borderRadius="3px" transition="width .3s" /></Box>
        <NumPad value={amount} onChange={setAmount} />
        {/* decrease (damage/use) is the more common action → it sits on the right, under the thumb */}
        <HStack gap="9px" mt={{ base: "9px", md: "12px" }}>
          <Box as="button" type="button" onClick={() => apply("heal")} flex="1" py={{ base: "9px", md: "11px" }} borderRadius="9px" border="1px solid" borderColor="good" bg="transparent" color="good" fontWeight={700} fontSize="15px" opacity={amt > 0 ? 1 : 0.45} _hover={amt > 0 ? { bg: "accentSoft" } : undefined}>{upLabel}</Box>
          <Box as="button" type="button" onClick={() => apply("damage")} flex="1" py={{ base: "9px", md: "11px" }} borderRadius="9px" border="1px solid" borderColor="bad" bg="transparent" color="bad" fontWeight={700} fontSize="15px" opacity={amt > 0 ? 1 : 0.45} _hover={amt > 0 ? { bg: "accentSoft" } : undefined}>{downLabel}</Box>
        </HStack>
        <Box as="button" type="button" onClick={() => set(v.max)} w="100%" mt={{ base: "8px", md: "10px" }} py={{ base: "8px", md: "9px" }} borderRadius="9px" border="1px solid" borderColor="fieldBd" bg="fieldBg" color="accentTx" fontWeight={600} fontSize="14px" _hover={{ borderColor: "accent" }}>Teljes feltöltés</Box>
      </Box>
    </ModalShell>
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
