import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { ParchPanel } from "./ParchPanel";

export interface ModalState {
  kind: "skill" | "spell";
  name: string;
  sub?: string;
  levelStrip?: string; // character-aware strip ("A te fokod: 3. fok" / "Mana: 2 Mp · …")
  body: string[];
  compLink?: boolean; // show the quiet "Teljes leírás a kompendiumban →" escalation
}

interface Props {
  modal: ModalState | null;
  onClose: () => void;
  onOpenComp: () => void;
}

// A single reusable overlay that opens OVER the current screen and closes back to it — it never
// navigates. The compLink is the only opt-in escalation to the Kompendium zone.
export const DetailModal: React.FC<Props> = ({ modal, onClose, onOpenComp }) => {
  if (!modal) return null;
  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={40}
      bg="rgba(16,14,24,.55)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p="28px"
      onClick={onClose}
    >
      <ParchPanel
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        borderRadius="12px"
        p={0}
        w="min(660px, 100%)"
        maxH="86vh"
        display="flex"
        flexDirection="column"
        overflow="hidden"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,.42)" }}
      >
        <Box position="relative" px="28px" pt="22px" pb="15px" borderBottom="1px solid" borderColor="rule" textAlign="center">
          <Box
            as="button"
            type="button"
            onClick={onClose}
            position="absolute"
            top="14px"
            right="16px"
            w="32px"
            h="32px"
            borderRadius="8px"
            border="1px solid"
            borderColor="hair"
            bg="fieldBg"
            color="muted"
            fontSize="15px"
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
          >
            ✕
          </Box>
          <Heading as="h3" fontSize={{ base: "23px", md: "20px" }} fontWeight={700} color="fg">{modal.name}</Heading>
          {modal.sub && <Text mt="4px" fontSize="14.5px" fontWeight={600} color="muted">{modal.sub}</Text>}
          {modal.levelStrip && (
            <Box mt="9px" display="inline-flex" alignItems="center" gap="7px" px="12px" py="4px" borderRadius="8px" bg="accentSoft" color="accentTx" fontFamily="system-ui" fontSize="12px" fontWeight={700}>
              {modal.levelStrip}
            </Box>
          )}
        </Box>
        <Box flex="1 1 auto" overflowY="auto" px="28px" pt="20px" pb="26px">
          {modal.body.map((p, i) => (
            <Text key={i} mb="13px" fontSize={{ base: "17px", md: "15.5px" }} lineHeight="1.6" color="fg" textAlign="justify">
              {p}
            </Text>
          ))}
          {modal.compLink && (
            <Box as="button" type="button" onClick={onOpenComp} mt="4px" color="accentTx" fontFamily="system-ui" fontSize="13px" fontWeight={700}>
              Teljes leírás a kompendiumban →
            </Box>
          )}
        </Box>
      </ParchPanel>
    </Box>
  );
};
