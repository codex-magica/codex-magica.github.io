import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
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
