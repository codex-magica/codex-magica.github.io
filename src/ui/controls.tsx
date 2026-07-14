import React from "react";
import { Box, Heading, HStack, IconButton, Text, useColorMode } from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { BTN_H } from "./tokens";
import { OpenBookIcon } from "./icons";

// Small shared controls reused across screens. Previously each was redefined per file.

// zone icons shown instead of the labels on phones
const ZONE_ICON: Record<string, React.ReactNode> = {
  karakter: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  kompendium: <OpenBookIcon size={16} />,
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

// The uppercase section label inside a creator panel, with an optional right-aligned control.
// Previously copy-pasted into PointBuyPanel and LevelGainsPanel.
export const SubHeader: React.FC<{ children: React.ReactNode; trailing?: React.ReactNode }> = ({ children, trailing }) => (
  <HStack justify="space-between" mt="13px" mb="1px" align="center" minH="24px">
    <Text textStyle="overline" fontSize="11px" letterSpacing=".11em" color="catTx">{children}</Text>
    {trailing}
  </HStack>
);

// A creator panel's heading: title + optional "— N. szint" suffix + optional trailing (KAP chip).
export const PanelHeading: React.FC<{ title: string; level?: number; trailing?: React.ReactNode; mb?: number }> = ({ title, level, trailing, mb = 1 }) => (
  <HStack justify="space-between" mb={mb} align="center">
    <Heading fontSize={{ base: "23px", md: "20px" }} fontWeight={700} color="fg">
      {title}
      {level != null && <Text as="span" fontSize=".65em" fontWeight={500} color="fgFaint"> — {level}. szint</Text>}
    </Heading>
    {trailing}
  </HStack>
);

// The right-aligned "KAP: n" balance readout next to a panel heading.
export const KapReadout: React.FC<{ kap: number }> = ({ kap }) => (
  <Text fontFamily="ui" fontSize="13px" fontWeight={700} color={kap < 0 ? "bad" : "accentTx"} sx={{ fontVariantNumeric: "tabular-nums" }}>
    KAP: {kap}
  </Text>
);

// The small outlined "✕" remove button used by the creator panels (skills, point-buy).
export const DeleteButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Box as="button" type="button" h={BTN_H} minW={BTN_H} border="1px solid" borderColor="hair" borderRadius="8px" color="fgFaint" display="flex" alignItems="center" justifyContent="center" fontSize="15px" flexShrink={0} onClick={onClick}>
    ✕
  </Box>
);
