import React, { useState } from "react";
import { Box, Heading, HStack, Text } from "@chakra-ui/react";
import { abilityText } from "../model/abilities";
import { ModalShell } from "./Modal";

// Special-ability chips (tags): clickable when the ability has rules text (model/abilities.ts) — opens a
// small reader modal. Level-gated abilities show their activation level. Used by the race/class picker
// detail panes and the character sheet's Képességek panel.
export const AbilityChips: React.FC<{ tags: { name: string; atLevel?: number }[] }> = ({ tags }) => {
  const [open, setOpen] = useState<string | null>(null);
  const def = open ? abilityText(open) : undefined;
  return (
    <>
      <HStack flexWrap="wrap" gap="6px">
        {tags.map((t, i) => {
          const has = !!abilityText(t.name);
          const label = t.atLevel ? `${t.name} (${t.atLevel}. szinttől)` : t.name;
          return has ? (
            <Box key={i} as="button" type="button" onClick={() => setOpen(t.name)}
              px="9px" py="4px" borderRadius="7px" border="1px solid" borderColor="accentBd" bg="accentSoft" color="accentTx"
              fontFamily="system-ui" fontSize="12.5px" fontWeight={600} whiteSpace="nowrap" _hover={{ borderColor: "accent" }}>
              {label}
            </Box>
          ) : (
            <Box key={i} as="span" px="9px" py="4px" borderRadius="7px" border="1px solid" borderColor="hair" bg="fieldBg" color="fg"
              fontFamily="system-ui" fontSize="12.5px" fontWeight={600} whiteSpace="nowrap">
              {label}
            </Box>
          );
        })}
      </HStack>
      {def && (
        <ModalShell onClose={() => setOpen(null)} width="min(520px, 100%)" maxH="76vh" zIndex={60} overlayPad="28px">
          <Box p="20px 22px">
            <Heading fontSize="17px" fontWeight={700} color="fg" mb="2px">{def.name}</Heading>
            {def.level != null && def.level > 1 && <Text fontSize="11.5px" color="fgFaint" mb="8px">{def.level}. szinttől</Text>}
            <Text fontSize="13.5px" color="fg" lineHeight="1.65" mt="8px" whiteSpace="pre-wrap">{def.text}</Text>
          </Box>
        </ModalShell>
      )}
    </>
  );
};
