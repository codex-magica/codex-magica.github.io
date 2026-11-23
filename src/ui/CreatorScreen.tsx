import React, { useState } from "react";
import { Box, Flex, Heading, HStack, Text } from "@chakra-ui/react";
import { CharacterBuilder } from "./CharacterBuilder";
import { ConfirmModal } from "./ConfirmModal";
import { useEscClose } from "./Modal";
import { useCharacterBuilder } from "../state/useCharacterBuilder";
import { CharacterRecord, emptyLevel } from "../model/character";

export type CreatorMode = "create" | "edit" | "levelup";

const SIDE = { base: "20px", md: "16px" };

const BackArrow = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
);

const headerFor = (mode: CreatorMode, r: CharacterRecord) => {
  const lvl = r.levels.length;
  if (mode === "create") return { title: "Új karakter", sub: "Karakteralkotó · 1. szint", primary: "Karakter létrehozása", primaryShort: "Létrehozás", commitAnyway: "Létrehozás mindenképp" };
  if (mode === "levelup") return { title: "Szintlépés", sub: `${lvl - 1}. szint → ${lvl}. szint`, primary: "Szintlépés véglegesítése", primaryShort: "Véglegesítés", commitAnyway: "Véglegesítés mindenképp" };
  return { title: "Karakter szerkesztése", sub: `${r.name} · ${r.race} ${r.class} · ${lvl}. szint`, primary: "Mentés", primaryShort: "Mentés", commitAnyway: "Mentés mindenképp" };
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

  // Closing throws the working copy away — confirm when it differs from what the screen opened with
  // (for level-up that baseline includes the freshly-added empty level, so an untouched level-up
  // still closes silently).
  const [initialJson] = useState(() => JSON.stringify(record));
  const [confirmClose, setConfirmClose] = useState(false);
  const requestClose = () => {
    if (JSON.stringify(record) !== initialJson) setConfirmClose(true);
    else onClose();
  };
  useEscClose(requestClose);

  // The Ellenőrzés findings live at the bottom of a long scroll — surface them at the moment of
  // commit: a count badge on the primary button, and a confirm listing them before committing.
  const issues: string[] = [
    ...api.derived.pools.kapBalanceByLevel.flatMap((bal, i) => (bal < 0 ? [`${i + 1}. szint: túlköltött KAP (${bal})`] : [])),
    ...api.derived.diagnostics.filter((d) => d.severity !== "info").map((d) => `${d.atLevel != null ? `${d.atLevel}. szint: ` : ""}${d.message}`),
  ];
  const [confirmCommit, setConfirmCommit] = useState(false);
  const requestCommit = () => {
    if (issues.length > 0) setConfirmCommit(true);
    else onCommit(record);
  };

  return (
    <Flex position="fixed" inset={0} zIndex={50} direction="column" bg="page" color="fg" fontFamily="'Crimson Pro', Georgia, serif">
      <Box flexShrink={0} borderBottom="1px solid" borderColor="hair" bg="page">
        <HStack maxW="980px" mx="auto" justify="space-between" gap={{ base: "10px", md: "14px" }} px={SIDE} py="12px">
          <HStack gap={{ base: "9px", md: "12px" }} minW={0} flex="1 1 auto">
            <Box as="button" type="button" onClick={requestClose} title="Vissza" w="38px" h="38px" flexShrink={0} display="inline-flex" alignItems="center" justifyContent="center" borderRadius="10px" border="1px solid" borderColor="hair" bg="fieldBg" color="muted" _hover={{ borderColor: "accent" }}>
              {BackArrow}
            </Box>
            <Box minW={0}>
              <Heading fontSize={{ base: "21px", md: "18px" }} fontWeight={700} color="fg" lineHeight="1.08" noOfLines={1}>{m.title}</Heading>
              <Text fontFamily="system-ui" fontSize="11.5px" color="fgFaint" noOfLines={1}>{m.sub}</Text>
            </Box>
          </HStack>
          <HStack gap="9px" flexShrink={0}>
            {/* phones: the back arrow is the cancel — the redundant Mégse only returns at md+ */}
            <Box as="button" type="button" onClick={requestClose} display={{ base: "none", md: "inline-flex" }} px={{ base: "12px", md: "15px" }} py="9px" borderRadius="9px" border="1px solid" borderColor="hair" bg="transparent" color="muted" fontWeight={600} fontSize={{ base: "15px", md: "15px" }} _hover={{ borderColor: "accent" }}>
              Mégse
            </Box>
            <Box as="button" type="button" onClick={requestCommit} position="relative" px={{ base: "14px", md: "18px" }} py="9px" borderRadius="9px" border="1px solid" borderColor="accent" bg="accent" color="white" fontWeight={700} fontSize={{ base: "15px", md: "15px" }} whiteSpace="nowrap">
              <Box as="span" display={{ base: "none", md: "inline" }}>{m.primary}</Box>
              <Box as="span" display={{ base: "inline", md: "none" }}>{m.primaryShort}</Box>
              {issues.length > 0 && (
                <Box as="span" title={`Ellenőrzés: ${issues.length} figyelmeztetés`} position="absolute" top="-7px" right="-7px" minW="19px" h="19px" px="4px" borderRadius="full" bg="bad" color="white" fontFamily="system-ui" fontSize="11px" fontWeight={700} display="inline-flex" alignItems="center" justifyContent="center" border="2px solid" borderColor="page" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {issues.length}
                </Box>
              )}
            </Box>
          </HStack>
        </HStack>
      </Box>
      {/* overflowX hidden: any accidentally-wide row clips instead of making the page pan sideways */}
      <Box flex="1 1 auto" minH={0} overflowY="auto" overflowX="hidden">
        <Box maxW="760px" mx="auto">
          <CharacterBuilder api={api} mode={mode} />
        </Box>
      </Box>

      {confirmCommit && (
        <ConfirmModal title={`Ellenőrzés — ${issues.length} figyelmeztetés`} confirmLabel={m.commitAnyway}
          onConfirm={() => { setConfirmCommit(false); onCommit(record); }} onClose={() => setConfirmCommit(false)}>
          <Text as="span" display="block" mb="10px">A karakter így is menthető, de az Ellenőrzés még az alábbiakat jelzi:</Text>
          <Box as="ul" pl="18px" m={0} maxH="240px" overflowY="auto">
            {issues.slice(0, 8).map((msg, i) => (
              <Box as="li" key={i} mb="6px">{msg}</Box>
            ))}
            {issues.length > 8 && <Box as="li">… és még {issues.length - 8} további.</Box>}
          </Box>
        </ConfirmModal>
      )}

      {confirmClose && (
        <ConfirmModal title="Nem mentett módosítások" confirmLabel="Kilépés mentés nélkül"
          onConfirm={() => { setConfirmClose(false); onClose(); }} onClose={() => setConfirmClose(false)}>
          {mode === "create"
            ? "A megkezdett karakter elvész, ha mentés nélkül lépsz ki. Biztosan kilépsz?"
            : "A módosításaid elvesznek, ha mentés nélkül lépsz ki. Biztosan kilépsz?"}
        </ConfirmModal>
      )}
    </Flex>
  );
};
