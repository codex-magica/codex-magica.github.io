import React from "react";
import { Box } from "@chakra-ui/react";

interface StepperProps {
  value: React.ReactNode; // "12", "3.", "10%", "+2" …
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
  incDisabled?: boolean;
  incLabel?: string; // cost shown after the "+", e.g. "8" → "+ 8"
  incWarn?: boolean; // amber "+" — raising one more level is penalised (unmet attribute requirement)
  fullWidth?: boolean; // fill the parent box (attribute columns) for column alignment
  fixed?: boolean; // constant total width regardless of value / +cost label (skill rows align)
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
const FS_PCT = { base: "15px", md: "13px" }; // percentages ("100%") — smaller so they fit the cell
// Fixed mode: all three cells are the same width as the − button (W). Value grows only for a rare
// percentage ("100%"); the + cell keeps tight padding so "+ 15" still fits.
const VAL_W = W;
const INC_W = W;

// The connected inline stepper [ − | value | + ] used across every section.
export const Stepper: React.FC<StepperProps> = ({
  value,
  onDec,
  onInc,
  decDisabled,
  incDisabled,
  incLabel,
  incWarn,
  fullWidth,
  fixed,
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
      w={fixed ? W : undefined}
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
      w={!fullWidth && fixed ? VAL_W : undefined}
      minW={fullWidth ? undefined : fixed ? undefined : "38px"}
      px={fixed ? "2px" : "4px"}
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontSize={typeof value === "string" && value.includes("%") ? FS_PCT : FS}
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
      w={fixed ? INC_W : undefined}
      minW={fixed ? undefined : W}
      px={fixed ? "2px" : incLabel ? "8px" : undefined}
      borderLeft="1px solid"
      borderColor="fieldBd"
      bg={incDisabled ? "transparent" : incWarn ? "warnSoft" : "accentSoft"}
      color={incDisabled ? "fgFaint" : incWarn ? "warn" : "accentTx"}
      opacity={incDisabled ? 0.45 : 1}
      cursor={incDisabled ? "default" : "pointer"}
      fontWeight={700}
      fontSize="14px"
      letterSpacing="-0.03em"
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
