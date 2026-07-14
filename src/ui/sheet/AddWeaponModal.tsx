import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { ModalShell, ModalHeader } from "../Modal";
import { weaponPickerGroups } from "../../model/weaponUse";
import { FS, FS_SUB } from "./primitives";

// Add-weapon picker: grouped by weapon family; tap adds and closes. (The picker is used rarely — no
// reason to keep a select in the Harcértékek panel.)
export const AddWeaponModal: React.FC<{
  pinned: string[]; // already-pinned weapon names (excluded from the picker)
  onAdd: (name: string) => void;
  onClose: () => void;
}> = ({ pinned, onAdd, onClose }) => (
  <ModalShell onClose={onClose} width="min(420px, 100%)" maxH="82vh">
    <ModalHeader onClose={onClose} pt="16px" pb="10px">
      <Heading as="h3" fontSize={{ base: "18px", md: "19px" }} fontWeight={700} color="fg">Fegyver hozzáadása</Heading>
    </ModalHeader>
    <Box flex="1 1 auto" overflowY="auto" px="20px" pb="18px">
      {weaponPickerGroups(pinned).map((g) => (
        <Box key={g.group}>
          <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em" pb="3px" mt="11px" mb="3px" borderBottom="1px solid" borderColor="hair">{g.group}</Box>
          {g.items.map((w) => (
            <Box key={w.name} as="button" type="button" w="100%" textAlign="left"
              onClick={() => onAdd(w.name)}
              display="flex" alignItems="baseline" justifyContent="space-between" gap="12px"
              py="6px" px="7px" mx="-7px" borderRadius="6px" _hover={{ bg: "accentSoft" }}>
              <Text color="fg" fontSize={FS} noOfLines={1}>{w.name}</Text>
              <Text color="muted" fontFamily="ui" fontSize="12px" flexShrink={0} maxW="120px" isTruncated title={w.damage} sx={{ fontVariantNumeric: "tabular-nums" }}>{w.damage}</Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  </ModalShell>
);
