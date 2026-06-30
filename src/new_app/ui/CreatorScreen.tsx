import React, { useState } from "react";
import { Box, Flex, Heading, HStack, Text } from "@chakra-ui/react";
import { CharacterBuilder } from "./CharacterBuilder";
import { useCharacterBuilder } from "../state/useCharacterBuilder";
import { CharacterRecord, emptyLevel } from "../model/character";

export type CreatorMode = "create" | "edit" | "levelup";

const SIDE = { base: "20px", md: "16px" };

const BackArrow = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
);

const headerFor = (mode: CreatorMode, r: CharacterRecord) => {
  const lvl = r.levels.length;
  if (mode === "create") return { title: "Új karakter", sub: "Karakteralkotó · 1. szint", primary: "Karakter létrehozása" };
  if (mode === "levelup") return { title: "Szintlépés", sub: `${lvl - 1}. szint → ${lvl}. szint`, primary: "Szint megerősítése" };
  return { title: "Karakter szerkesztése", sub: `${r.name} · ${r.race} ${r.class} · ${lvl}. szint`, primary: "Mentés" };
};

// One full-screen creator used for create / edit / level-up — only the header text and the primary
// button label differ. Owns the working record; commits it on the primary action.
export const CreatorScreen: React.FC<{
  mode: CreatorMode;
  initialRecord: CharacterRecord;
  onClose: () => void;
  onCommit: (record: CharacterRecord) => void;
}> = ({ mode, initialRecord, onClose, onCommit }) => {
  // Level-up adds a fresh empty level to spend this level's KAP into; create/edit work the record as-is.
  const [record, setRecord] = useState<CharacterRecord>(() =>
    mode === "levelup"
      ? { ...initialRecord, levels: [...initialRecord.levels, emptyLevel(initialRecord.levels.length + 1)] }
      : initialRecord
  );
  const api = useCharacterBuilder(record, setRecord);
  const m = headerFor(mode, record);

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
            <Box as="button" type="button" onClick={() => onCommit(record)} px="18px" py="9px" borderRadius="9px" border="1px solid" borderColor="accent" bg="accent" color="white" fontWeight={700} fontSize={{ base: "16px", md: "15px" }} whiteSpace="nowrap">
              {m.primary}
            </Box>
          </HStack>
        </HStack>
      </Box>
      <Box flex="1 1 auto" minH={0} overflowY="auto">
        <Box maxW="760px" mx="auto">
          <CharacterBuilder api={api} mode={mode} />
        </Box>
      </Box>
    </Flex>
  );
};
