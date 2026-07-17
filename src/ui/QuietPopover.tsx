import React from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { useEscClose } from "./Modal";

// The app's quiet popover: a full-screen click-away backdrop plus a small card anchored under the
// trigger. The CALLER provides the `position="relative"` wrapper around the trigger and renders this
// next to it when open. Previously hand-rolled six times in SkillLevelPanel alone.
export const QuietPopover: React.FC<{
  onClose: () => void;
  title?: string;
  hint?: string; // small explainer line under the title
  align?: "left" | "right"; // which edge of the trigger the card hangs from (default right)
  minW?: any;
  maxW?: any;
  maxH?: string;
  p?: string;
  children: React.ReactNode;
}> = ({ onClose, title, hint, align = "right", minW = "max-content", maxW, maxH, p = "13px", children }) => {
  useEscClose(onClose);
  return (
  <>
    <Box position="fixed" inset={0} zIndex={29} onClick={onClose} />
    <Box position="absolute" top="calc(100% + 6px)" {...(align === "left" ? { left: 0 } : { right: 0 })} zIndex={30} bg="band" border="1px solid" borderColor="hair"
      borderRadius="12px" p={p} minW={minW} maxW={maxW} maxH={maxH} overflowY={maxH ? "auto" : undefined} boxShadow="popover">
      {title && (
        <Text textStyle="overline" color="muted" mb={hint ? "0" : "9px"} px={p === "8px" ? "8px" : undefined} py={p === "8px" ? "6px" : undefined} whiteSpace="nowrap">
          {title}
        </Text>
      )}
      {hint && (
        <Text fontFamily="ui" fontSize="11px" color="fgFaint" pb="7px" px={p === "8px" ? "8px" : undefined} maxW="240px">
          {hint}
        </Text>
      )}
      {children}
    </Box>
  </>
  );
};

// A row of option buttons for a QuietPopover (fok-4 attribute, Pszi path, attribute toggles…).
// `selected` may be a single value or a set (multi-toggle pickers like Művészetek attributes).
export const OptionButtons: React.FC<{
  options: readonly string[];
  selected?: string | readonly string[];
  onPick: (o: string) => void;
  size?: "md" | "sm";
  wrap?: boolean;
  labelOf?: (o: string) => string;
}> = ({ options, selected, onPick, size = "md", wrap, labelOf }) => (
  <HStack gap={size === "sm" ? "6px" : "7px"} flexWrap={wrap ? "wrap" : { base: "wrap", md: "nowrap" }}>
    {options.map((o) => {
      const active = Array.isArray(selected) ? selected.includes(o) : o === selected;
      return (
        <Box as="button" key={o} type="button" onClick={() => onPick(o)}
          px={size === "sm" ? "9px" : "12px"} h={size === "sm" ? "34px" : { base: "44px", md: "38px" }} borderRadius={size === "sm" ? "8px" : "9px"}
          border="1px solid" borderColor={active ? "accent" : "fieldBd"} bg={active ? "accentSoft" : "fieldBg"} color={active ? "accentTx" : "fg"}
          fontWeight={700} fontSize={size === "sm" ? "12.5px" : "14px"} display="flex" alignItems="center" justifyContent="center"
          whiteSpace="nowrap" _hover={{ borderColor: "accent" }}>
          {labelOf ? labelOf(o) : o}
        </Box>
      );
    })}
  </HStack>
);
