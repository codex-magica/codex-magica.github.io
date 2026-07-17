import React, { useState } from "react";
import { Box, Heading, Input, Text } from "@chakra-ui/react";
import { ModalShell, ModalHeader } from "../Modal";
import { weaponPickerGroups } from "../../model/weaponUse";
import { FIELD_SX } from "../tokens";
import { FS, FS_SUB } from "./primitives";

// accent-insensitive match, so "ij" finds "íj" and "szablya" finds "szablya"
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Add-weapon picker: grouped by weapon family; tap adds and closes. The list is ~70 items, so a
// filter box sits on top; groups with no match drop out.
export const AddWeaponModal: React.FC<{
  pinned: string[]; // already-pinned weapon names (excluded from the picker)
  onAdd: (name: string) => void;
  onClose: () => void;
}> = ({ pinned, onAdd, onClose }) => {
  const [filter, setFilter] = useState("");
  const q = norm(filter.trim());
  const groups = weaponPickerGroups(pinned)
    .map((g) => ({ ...g, items: q ? g.items.filter((w) => norm(w.name).includes(q)) : g.items }))
    .filter((g) => g.items.length > 0);
  return (
    <ModalShell onClose={onClose} width="min(420px, 100%)" maxH="82vh">
      <ModalHeader onClose={onClose} pt="16px" pb="10px">
        <Heading as="h3" fontSize={{ base: "18px", md: "19px" }} fontWeight={700} color="fg">Fegyver hozzáadása</Heading>
      </ModalHeader>
      <Box px="20px" pt="12px" flexShrink={0}>
        <Input {...FIELD_SX} size="sm" autoFocus value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Szűrés név szerint…" />
      </Box>
      <Box flex="1 1 auto" overflowY="auto" px="20px" pb="18px">
        {groups.map((g) => (
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
        {groups.length === 0 && (
          <Text fontFamily="ui" fontSize="12.5px" color="fgFaint" textAlign="center" py="16px">
            Nincs találat a(z) „{filter.trim()}” szűrésre.
          </Text>
        )}
      </Box>
    </ModalShell>
  );
};
