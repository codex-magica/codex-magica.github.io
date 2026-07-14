import React from "react";
import { Box, HStack, Spacer } from "@chakra-ui/react";
import { ZoneSwitch, DarkToggle } from "./controls";

// Shared top bar with the Karakter / Kompendium zone switch + dark-mode toggle. Used by the welcome
// (roster) screen and the standalone compendium screen so the compendium is reachable without a
// character open. (AppShell keeps its own richer bar for the in-character context.)
// base matches the compendium's merged mobile bar (54px tall, 12px inset) so switching zones
// doesn't shift the pill
const SIDE = { base: "12px", md: "16px" };

export const ZoneBar: React.FC<{
  active: "karakter" | "kompendium";
  onKarakter: () => void;
  onKompendium: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
}> = ({ active, onKarakter, onKompendium, left, right }) => (
  <Box flexShrink={0} bg="page" borderBottom="1px solid" borderColor="hair">
    <HStack px={SIDE} py={{ base: 0, md: "9px" }} h={{ base: "54px", md: "auto" }} gap="14px" flexWrap="wrap" align="center">
      {left}
      <ZoneSwitch active={active} onKarakter={onKarakter} onKompendium={onKompendium} />
      <Spacer />
      {right}
      <DarkToggle />
    </HStack>
  </Box>
);

export default ZoneBar;
