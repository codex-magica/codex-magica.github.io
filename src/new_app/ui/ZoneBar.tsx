import React from "react";
import { Box, HStack, IconButton, Spacer, useColorMode } from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";

// Shared top bar with the Karakter / Kompendium zone switch + dark-mode toggle. Used by the welcome
// (roster) screen and the standalone compendium screen so the compendium is reachable without a
// character open. (AppShell keeps its own richer bar for the in-character context.)
const SIDE = { base: "20px", md: "16px" };

const ZoneBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <Box as="button" type="button" onClick={onClick} px="15px" py="7px" borderRadius="8px" fontWeight={700} fontSize="14px" whiteSpace="nowrap"
    bg={active ? "accentSoft" : "transparent"} color={active ? "accentTx" : "muted"} transition="background .12s, color .12s">
    {children}
  </Box>
);

export const ZoneBar: React.FC<{
  active: "karakter" | "kompendium";
  onKarakter: () => void;
  onKompendium: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
}> = ({ active, onKarakter, onKompendium, left, right }) => {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <Box flexShrink={0} bg="page" borderBottom="1px solid" borderColor="hair">
      <HStack px={SIDE} py="9px" gap="14px" flexWrap="wrap" align="center">
        {left}
        <HStack gap="3px" bg="fieldBg" border="1px solid" borderColor="hair" borderRadius="10px" p="3px" flexShrink={0}>
          <ZoneBtn active={active === "karakter"} onClick={onKarakter}>Karakter</ZoneBtn>
          <ZoneBtn active={active === "kompendium"} onClick={onKompendium}>Kompendium</ZoneBtn>
        </HStack>
        <Spacer />
        {right}
        <IconButton aria-label="Sötét mód váltása" size="sm" variant="ghost" color="muted" icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />} onClick={toggleColorMode} />
      </HStack>
    </Box>
  );
};

export default ZoneBar;
