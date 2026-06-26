import React from "react";
import { Box, Flex, Heading, HStack, Text } from "@chakra-ui/react";
import { CharacterBuilder } from "./CharacterBuilder";
import { identity } from "./sampleData";

export type CreatorMode = "create" | "edit" | "levelup";

const MODES: Record<CreatorMode, { title: string; sub: string; primary: string }> = {
  create: { title: "Új karakter", sub: "Karakteralkotó · 1. szint", primary: "Karakter létrehozása" },
  edit: { title: "Karakter szerkesztése", sub: `${identity.name} · ${identity.subLine}`, primary: "Mentés" },
  levelup: { title: "Szintlépés", sub: "1. szint → 2. szint", primary: "Szint megerősítése" },
};

const SIDE = { base: "20px", md: "16px" };

const BackArrow = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
);

// One full-screen creator used for create / edit / level-up — only the header text and the primary
// button label differ (driven by `mode`). Embeds the editor column in a centered reading column.
export const CreatorScreen: React.FC<{ mode: CreatorMode; onClose: () => void; onCommit: () => void }> = ({ mode, onClose, onCommit }) => {
  const m = MODES[mode];
  return (
    <Flex position="fixed" inset={0} zIndex={50} direction="column" bg="page" color="fg" fontFamily="Warnock, serif">
      <Box flexShrink={0} borderBottom="1px solid" borderColor="hair" bg="page">
        <HStack maxW="980px" mx="auto" justify="space-between" gap="14px" px={SIDE} py="12px">
          <HStack gap="12px" minW={0}>
            <Box as="button" type="button" onClick={onClose} title="Vissza" w="38px" h="38px" flexShrink={0} display="inline-flex" alignItems="center" justifyContent="center" borderRadius="10px" border="1px solid" borderColor="hair" bg="fieldBg" color="muted" _hover={{ borderColor: "accent" }}>
              {BackArrow}
            </Box>
            <Box minW={0}>
              <Heading fontSize={{ base: "21px", md: "18px" }} fontWeight={700} color="fg" lineHeight="1.08" noOfLines={1}>{m.title}</Heading>
              <Text fontFamily="system-ui" fontSize="11.5px" color="fgFaint" noOfLines={1}>{m.sub}</Text>
            </Box>
          </HStack>
          <HStack gap="9px" flexShrink={0}>
            <Box as="button" type="button" onClick={onClose} px="15px" py="9px" borderRadius="9px" border="1px solid" borderColor="hair" bg="transparent" color="muted" fontWeight={600} fontSize={{ base: "16px", md: "15px" }} _hover={{ borderColor: "accent" }}>
              Mégse
            </Box>
            <Box as="button" type="button" onClick={onCommit} px="18px" py="9px" borderRadius="9px" border="1px solid" borderColor="accent" bg="accent" color="white" fontWeight={700} fontSize={{ base: "16px", md: "15px" }} whiteSpace="nowrap">
              {m.primary}
            </Box>
          </HStack>
        </HStack>
      </Box>
      <Box flex="1 1 auto" minH={0} overflowY="auto">
        <Box maxW="760px" mx="auto">
          <CharacterBuilder />
        </Box>
      </Box>
    </Flex>
  );
};
