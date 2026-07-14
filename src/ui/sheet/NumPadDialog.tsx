import React, { useState } from "react";
import { Box, Heading, HStack, Text } from "@chakra-ui/react";
import { ModalShell, ModalHeader } from "../Modal";
import { NumPad } from "../NumPad";

// The shared numpad calculator dialog: title + big readout, optional content above the pad, a
// green/red action pair, and a full-width tertiary button. VitalModal (heal/damage) and the
// inventory quantity modal are both thin configurations of this.
export const NumPadDialog: React.FC<{
  title: string;
  readout: React.ReactNode; // the big number line under the title (already colored/formatted)
  width?: string;
  topContent?: React.ReactNode; // e.g. the vitals progress bar
  upLabel: string;
  downLabel: string;
  onUp: (amt: number) => void;
  onDown: (amt: number) => void;
  tertiaryLabel: (amount: string) => React.ReactNode;
  tertiaryEnabled?: (amount: string) => boolean; // default: always
  onTertiary: (amt: number) => void;
  onClose: () => void;
}> = ({ title, readout, width = "min(360px, 100%)", topContent, upLabel, downLabel, onUp, onDown, tertiaryLabel, tertiaryEnabled, onTertiary, onClose }) => {
  const [amount, setAmount] = useState("");
  const amt = parseInt(amount, 10) || 0;
  const applyStep = (fn: (amt: number) => void) => { if (amt <= 0) return; fn(amt); setAmount(""); };
  const tertiaryOn = tertiaryEnabled ? tertiaryEnabled(amount) : true;
  return (
    <ModalShell onClose={onClose} width={width}>
      <ModalHeader onClose={onClose} pt={{ base: "14px", md: "18px" }} pb={{ base: "10px", md: "13px" }}>
        <Heading as="h3" fontSize={{ base: "18px", md: "20px" }} fontWeight={700} color="fg" noOfLines={1} px="28px">{title}</Heading>
        <Text mt="2px" fontSize={{ base: "19px", md: "22px" }} fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>{readout}</Text>
      </ModalHeader>
      <Box flex="1 1 auto" overflowY="auto" px="20px" pt={{ base: "10px", md: "14px" }} pb={{ base: "14px", md: "20px" }}>
        {topContent}
        <NumPad value={amount} onChange={setAmount} />
        {/* decrease (damage/use) is the more common action → it sits on the right, under the thumb */}
        <HStack gap="9px" mt={{ base: "9px", md: "12px" }}>
          <Box as="button" type="button" onClick={() => applyStep(onUp)} flex="1" py={{ base: "9px", md: "11px" }} borderRadius="9px" border="1px solid" borderColor="good" bg="transparent" color="good" fontWeight={700} fontSize="15px" opacity={amt > 0 ? 1 : 0.45} _hover={amt > 0 ? { bg: "accentSoft" } : undefined}>{upLabel}</Box>
          <Box as="button" type="button" onClick={() => applyStep(onDown)} flex="1" py={{ base: "9px", md: "11px" }} borderRadius="9px" border="1px solid" borderColor="bad" bg="transparent" color="bad" fontWeight={700} fontSize="15px" opacity={amt > 0 ? 1 : 0.45} _hover={amt > 0 ? { bg: "accentSoft" } : undefined}>{downLabel}</Box>
        </HStack>
        <Box as="button" type="button" onClick={() => tertiaryOn && onTertiary(amt)} w="100%" mt={{ base: "8px", md: "10px" }} py={{ base: "8px", md: "9px" }} borderRadius="9px" border="1px solid" borderColor="fieldBd" bg="fieldBg" color="accentTx" fontWeight={600} fontSize="14px" opacity={tertiaryOn ? 1 : 0.45} _hover={tertiaryOn ? { borderColor: "accent" } : undefined}>{tertiaryLabel(amount)}</Box>
      </Box>
    </ModalShell>
  );
};
