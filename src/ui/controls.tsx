import React from "react";
import { Box, HStack, IconButton, useColorMode } from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { BTN_H } from "./tokens";

// Small shared controls reused across screens. Previously each was redefined per file.

// zone icons shown instead of the labels on phones
const ZONE_ICON: Record<string, React.ReactNode> = {
  karakter: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  kompendium: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5h6.5a3 3 0 0 1 3 3V20a2.4 2.4 0 0 0-2.4-2.4H4z" /><path d="M20 5.5h-6.5a3 3 0 0 0-3 3V20a2.4 2.4 0 0 1 2.4-2.4H20z" />
    </svg>
  ),
};

// The Karakter / Kompendium-style zone-switch pill. Shared by ZoneBar and AppShell's top bar.
// With a `kind`, phones show the zone icon instead of the label (the label stays as the tooltip).
export const ZoneBtn: React.FC<{ active: boolean; onClick: () => void; kind?: "karakter" | "kompendium"; children: React.ReactNode }> = ({ active, onClick, kind, children }) => (
  <Box as="button" type="button" onClick={onClick} title={typeof children === "string" ? children : undefined} aria-label={typeof children === "string" ? children : undefined}
    px={{ base: kind ? "13px" : "11px", md: "15px" }} py="7px" borderRadius="8px" fontWeight={700} fontSize="14px" whiteSpace="nowrap"
    display="inline-flex" alignItems="center" justifyContent="center" minH="30px"
    bg={active ? "accentSoft" : "transparent"} color={active ? "accentTx" : "muted"} transition="background .12s, color .12s">
    {kind ? (
      <>
        <Box as="span" display={{ base: "inline-flex", md: "none" }} lineHeight={0}>{ZONE_ICON[kind]}</Box>
        <Box as="span" display={{ base: "none", md: "inline" }}>{children}</Box>
      </>
    ) : (
      children
    )}
  </Box>
);

// The complete Karakter/Kompendium switch pill — shared by ZoneBar, AppShell and the compendium's
// merged mobile bar so the markup can't drift apart.
export const ZoneSwitch: React.FC<{ active: "karakter" | "kompendium"; onKarakter: () => void; onKompendium: () => void }> = ({ active, onKarakter, onKompendium }) => (
  <HStack gap="3px" bg="fieldBg" border="1px solid" borderColor="hair" borderRadius="10px" p="3px" flexShrink={0}>
    <ZoneBtn kind="karakter" active={active === "karakter"} onClick={onKarakter}>Karakter</ZoneBtn>
    <ZoneBtn kind="kompendium" active={active === "kompendium"} onClick={onKompendium}>Kompendium</ZoneBtn>
  </HStack>
);

// The dark-mode toggle icon button shared by every top bar.
export const DarkToggle: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <IconButton aria-label="Sötét mód váltása" size="sm" variant="ghost" color="muted" icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />} onClick={toggleColorMode} />
  );
};

// The small outlined "✕" remove button used by the creator panels (skills, point-buy).
export const DeleteButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Box as="button" type="button" h={BTN_H} minW={BTN_H} border="1px solid" borderColor="hair" borderRadius="8px" color="fgFaint" display="flex" alignItems="center" justifyContent="center" fontSize="15px" flexShrink={0} onClick={onClick}>
    ✕
  </Box>
);
