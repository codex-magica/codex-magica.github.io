import React from "react";
import { Box, Heading, HStack, Text } from "@chakra-ui/react";
import { ModalShell } from "./Modal";

// A hard-confirm dialog: title, explanatory body, Mégse + a (danger) confirm button. Shared by the
// race/class change confirms and the logout confirm.
export const ConfirmModal: React.FC<{
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, confirmLabel, onConfirm, onClose, children }) => (
  <ModalShell onClose={onClose} width="min(440px, 100%)">
    <Box p="22px">
      <Heading fontSize="18px" fontWeight={700} color="fg" mb={2}>{title}</Heading>
      <Text fontSize="14px" color="muted" lineHeight="1.55" mb={4} as="div">
        {children}
      </Text>
      <HStack justify="flex-end" gap="9px">
        <Box as="button" type="button" onClick={onClose} px="15px" py="9px" borderRadius="9px" border="1px solid" borderColor="hair" bg="transparent" color="muted" fontWeight={600} fontSize="15px" _hover={{ borderColor: "accent" }}>
          Mégse
        </Box>
        <Box as="button" type="button" onClick={onConfirm} px="18px" py="9px" borderRadius="9px" border="1px solid" borderColor="bad" bg="bad" color="white" fontWeight={700} fontSize="15px">
          {confirmLabel}
        </Box>
      </HStack>
    </Box>
  </ModalShell>
);
