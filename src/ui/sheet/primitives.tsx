import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { CheckIcon, EditIcon } from "@chakra-ui/icons";
import { ParchPanel } from "../ParchPanel";

// Shared presentational atoms + type scale for the character sheet and its cards. The sheet uses a
// tighter scale than the creator panels, so these intentionally differ from ui/tokens.ts.

export const FS = { base: "16px", md: "14.5px" };
export const FS_NAME = { base: "17px", md: "15.5px" };
export const FS_SEC = { base: "21px", md: "18px" };
export const FS_SUB = { base: "14px", md: "12.5px" };
export const ROWPY = { base: "5px", md: "3.5px" };
export const GAP = { base: "16px", md: "14px" };

export const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => <ParchPanel flex="0 0 auto">{children}</ParchPanel>;

export const SecHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading as="h2" fontSize={FS_SEC} fontWeight={700} color="fg" pb="6px" mb="6px" borderBottom="1px solid" borderColor="rule">{children}</Heading>
);

export const SubHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em" pb="3px" mt="13px" mb="3px" borderBottom="1px solid" borderColor="hair">{children}</Box>
);

export const ValNum: React.FC<{ children: React.ReactNode } & Record<string, unknown>> = ({ children, ...rest }) => (
  <Text fontWeight={600} color="fg" fontSize={FS_NAME} flexShrink={0} sx={{ fontVariantNumeric: "tabular-nums" }} {...rest}>{children}</Text>
);

// An independently scrolling sheet column. md+: fixed-width, several side by side. base (phones):
// a full-width snap page — the sheet container snaps horizontally between columns.
export const Col: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box flex={{ base: "0 0 100%", md: "1 1 268px" }} minW={{ base: "100%", md: "246px" }} maxW={{ base: "100%", md: "392px" }}
    h="100%" overflowY="auto" display="flex" flexDirection="column" gap={GAP}
    pb={{ base: "calc(48px + env(safe-area-inset-bottom))", md: "36px" }}
    sx={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}>{children}</Box>
);

export const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text fontFamily="system-ui" fontSize="12.5px" color="fgFaint" py="6px">{children}</Text>
);

export const rowProps = { display: "flex", alignItems: "baseline", py: ROWPY } as const;

// The header pencil that flips a list panel into edit mode (add / delete / reorder live there) —
// the same affordance the Felszerelés card established. Check = done.
export const PanelEditButton: React.FC<{ editing: boolean; onToggle: () => void; label: string }> = ({ editing, onToggle, label }) => (
  <Box as="button" type="button" onClick={onToggle}
    title={editing ? "Kész" : label} aria-label={editing ? "Kész" : label}
    display="inline-flex" alignItems="center" justifyContent="center" w="26px" h="22px" flexShrink={0}
    borderRadius="6px" border="1px solid" borderColor={editing ? "accent" : "fieldBd"} bg={editing ? "accentSoft" : "transparent"}
    color={editing ? "accentTx" : "muted"} _hover={{ borderColor: "accent", bg: "accentSoft", color: "accentTx" }}>
    {editing ? <CheckIcon boxSize="10px" /> : <EditIcon boxSize="11px" />}
  </Box>
);

// The edit-mode "add" row at a list's end.
export const PanelAddButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <Box as="button" type="button" onClick={onClick} w="100%" mt="7px" py="7px" borderRadius="7px"
    border="1px dashed" borderColor="fieldBd" color="accentTx" fontWeight={600} fontSize="13px"
    _hover={{ borderColor: "accent", bg: "accentSoft" }}>
    {children}
  </Box>
);

// The quiet mini-switch: a squarish on/off toggle in the sheet's own materials (fieldBg/hair off,
// accentSoft/accent on) instead of the stock rounded pill — same affordance, native look.
export const QuietSwitch: React.FC<{ checked: boolean; onToggle: () => void; label: string }> = ({ checked, onToggle, label }) => (
  <Box as="button" type="button" role="switch" aria-checked={checked} aria-label={label} title={label}
    onClick={onToggle}
    position="relative" w="28px" h="16px" flexShrink={0} borderRadius="5px"
    border="1px solid" borderColor={checked ? "accent" : "fieldBd"}
    bg={checked ? "accentSoft" : "fieldBg"}
    transition="background .15s, border-color .15s"
    _focusVisible={{ boxShadow: "0 0 0 2px var(--chakra-colors-accentSoft)" }}>
    <Box position="absolute" top="2px" left="2px" w="10px" h="10px" borderRadius="3px"
      bg={checked ? "accentTx" : "fgFaint"}
      transform={checked ? "translateX(12px)" : "translateX(0)"}
      transition="transform .15s, background .15s" />
  </Box>
);

// An edit-mode list row: [delete ✕] [content] [drag grip]. Opaque so the row reads as a movable
// object (and so the drag lift never blends into the rows under it).
export const EditRow: React.FC<{ onDelete: () => void; deleteLabel: string; grip: React.ReactNode; children: React.ReactNode }> = ({ onDelete, deleteLabel, grip, children }) => (
  // no margin here — the row gap is the ReorderList item's padding, so drag measurements stay contiguous
  <Box display="flex" alignItems="stretch" gap="4px" px="5px" bg="band" border="1px solid" borderColor="hair" borderRadius="7px">
    <Box as="button" type="button" aria-label={deleteLabel} title={deleteLabel}
      onClick={onDelete} flexShrink={0} px="4px" color="fgFaint" fontSize="14px" lineHeight="1"
      display="inline-flex" alignItems="center" _hover={{ color: "bad" }}>✕</Box>
    <Box flex="1 1 auto" minW={0} py="7px">{children}</Box>
    {grip}
  </Box>
);
