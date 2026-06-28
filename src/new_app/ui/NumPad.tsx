import React from "react";
import { Box, Text } from "@chakra-ui/react";

// The calculator keypad shared by the vitals (heal/damage, use/regain) and inventory-quantity modals.
// Controlled: the parent owns the typed `value` string (so it can read the parsed amount for its own
// apply buttons) while this component owns the display + key grid.

const PadKey: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <Box as="button" type="button" onClick={onClick} h={{ base: "52px", md: "44px" }} borderRadius="9px" border="1px solid" borderColor="fieldBd" bg="fieldBg" color="fg" fontSize="20px" fontWeight={600} display="flex" alignItems="center" justifyContent="center" _hover={{ borderColor: "accent", bg: "accentSoft" }} _active={{ bg: "accentSoft" }} sx={{ fontVariantNumeric: "tabular-nums" }}>{children}</Box>
);

export const NumPad: React.FC<{ value: string; onChange: (v: string) => void; maxLen?: number }> = ({ value, onChange, maxLen = 4 }) => {
  const amt = parseInt(value, 10) || 0;
  const press = (d: string) => onChange(value === "0" ? d : (value + d).slice(0, maxLen));
  return (
    <>
      <Box bg="fieldBg" border="1px solid" borderColor="fieldBd" borderRadius="9px" py="9px" px="14px" textAlign="center" mb="10px">
        <Text fontSize="26px" fontWeight={700} color={amt > 0 ? "fg" : "fgFaint"} sx={{ fontVariantNumeric: "tabular-nums" }}>{value || "0"}</Text>
      </Box>
      <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap="7px">
        {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((d) => <PadKey key={d} onClick={() => press(d)}>{d}</PadKey>)}
        <PadKey onClick={() => onChange("")}>C</PadKey>
        <PadKey onClick={() => press("0")}>0</PadKey>
        <PadKey onClick={() => onChange(value.slice(0, -1))}>⌫</PadKey>
      </Box>
    </>
  );
};
