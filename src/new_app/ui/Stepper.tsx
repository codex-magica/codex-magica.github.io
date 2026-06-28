import React from "react";
import { Box } from "@chakra-ui/react";

interface StepperProps {
  value: React.ReactNode; // "12", "3.", "10%", "+2" …
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
  incDisabled?: boolean;
  incLabel?: string; // cost shown after the "+", e.g. "8" → "+ 8"
  fullWidth?: boolean; // fill the parent box (attribute columns) for column alignment
  valueMuted?: boolean; // Adottság column — secondary value color
  // "Locked by a dependency" — the − is NOT lowerable, but unlike `decDisabled` (greyed / at its floor)
  // it's accent-styled and tappable so the reason is reachable on touch (iPad) via `onDecBlocked`.
  decBlocked?: boolean;
  onDecBlocked?: () => void;
}

// Touch-friendly: 44/46px on iPad (base), 34px on desktop (md).
const H = { base: "44px", md: "34px" };
const W = { base: "46px", md: "34px" };
const FS = { base: "19px", md: "16px" };

// The connected inline stepper [ − | value | + ] used across every section.
export const Stepper: React.FC<StepperProps> = ({
  value,
  onDec,
  onInc,
  decDisabled,
  incDisabled,
  incLabel,
  fullWidth,
  valueMuted,
  decBlocked,
  onDecBlocked,
}) => (
  <Box
    display={fullWidth ? "flex" : "inline-flex"}
    w={fullWidth ? "100%" : undefined}
    flex={fullWidth ? undefined : "0 0 auto"}
    alignItems="stretch"
    h={H}
    border="1px solid"
    borderColor="fieldBd"
    borderRadius="9px"
    bg="fieldBg"
    overflow="hidden"
  >
    <Box
      as="button"
      type="button"
      onClick={decBlocked ? onDecBlocked : decDisabled ? undefined : onDec}
      disabled={decDisabled && !decBlocked}
      title={decBlocked ? "Egy ág innen ágazik" : undefined}
      minW={W}
      borderRight="1px solid"
      borderColor="fieldBd"
      bg={decBlocked ? "accentSoft" : "transparent"}
      fontSize="18px"
      color={decBlocked ? "accentTx" : decDisabled ? "fgFaint" : "muted"}
      opacity={decDisabled && !decBlocked ? 0.5 : 1}
      cursor={decBlocked || !decDisabled ? "pointer" : "default"}
      display="flex"
      alignItems="center"
      justifyContent="center"
      transition="background .12s, color .12s, opacity .12s"
    >
      −
    </Box>
    <Box
      flex={fullWidth ? "1 1 auto" : "0 0 auto"}
      minW={fullWidth ? undefined : "38px"}
      px="4px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontSize={FS}
      fontWeight={600}
      color={valueMuted ? "muted" : "fg"}
      sx={{ fontVariantNumeric: "tabular-nums" }}
    >
      {value}
    </Box>
    <Box
      as="button"
      type="button"
      onClick={incDisabled ? undefined : onInc}
      disabled={incDisabled}
      minW={W}
      px={incLabel ? "8px" : undefined}
      borderLeft="1px solid"
      borderColor="fieldBd"
      bg={incDisabled ? "transparent" : "accentSoft"}
      color={incDisabled ? "fgFaint" : "accentTx"}
      opacity={incDisabled ? 0.45 : 1}
      cursor={incDisabled ? "default" : "pointer"}
      fontWeight={700}
      fontSize="14px"
      whiteSpace="nowrap"
      display="flex"
      alignItems="center"
      justifyContent="center"
      transition="background .12s, color .12s, opacity .12s"
    >
      {incLabel ? `+ ${incLabel}` : "+"}
    </Box>
  </Box>
);
