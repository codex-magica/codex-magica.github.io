import React from "react";
import { Box } from "@chakra-ui/react";
import { BTN_H } from "./tokens";

// Small shared controls reused across screens. Previously each was redefined per file.

// The Karakter / Kompendium-style zone-switch pill. Shared by ZoneBar and AppShell's top bar.
export const ZoneBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <Box as="button" type="button" onClick={onClick} px="15px" py="7px" borderRadius="8px" fontWeight={700} fontSize="14px" whiteSpace="nowrap"
    bg={active ? "accentSoft" : "transparent"} color={active ? "accentTx" : "muted"} transition="background .12s, color .12s">
    {children}
  </Box>
);

// The small outlined "✕" remove button used by the creator panels (skills, point-buy).
export const DeleteButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Box as="button" type="button" h={BTN_H} minW={BTN_H} border="1px solid" borderColor="hair" borderRadius="8px" color="fgFaint" display="flex" alignItems="center" justifyContent="center" fontSize="15px" flexShrink={0} onClick={onClick}>
    ✕
  </Box>
);
