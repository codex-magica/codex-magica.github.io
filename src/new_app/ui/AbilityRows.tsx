import React, { useState } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { abilityText } from "../model/abilities";
import { ModalShell } from "./Modal";
import { FS, FS_SUB, ROWPY } from "./sheet/primitives";

// Special-ability rows for the character sheet's Képességek panel. Abilities are grouped by their
// source (Faj, Kaszt, Háttér, …) and rendered as full-width rows — matching the Képzettségek panel.
// A row is clickable when the ability has rules text (model/abilities.ts): tapping opens a reader modal.
// Level-gated abilities show their activation level on the right. (The picker panes still use AbilityChips.)
export type AbilityTag = { name: string; source: string; atLevel?: number };

export const AbilityRows: React.FC<{ tags: AbilityTag[] }> = ({ tags }) => {
  const [open, setOpen] = useState<string | null>(null);
  const def = open ? abilityText(open) : undefined;

  // Group by source, preserving first-seen order (Faj → Kaszt → Háttér, as folded in the engine).
  const groups: { source: string; items: AbilityTag[] }[] = [];
  for (const t of tags) {
    let g = groups.find((x) => x.source === t.source);
    if (!g) groups.push((g = { source: t.source, items: [] }));
    g.items.push(t);
  }

  return (
    <>
      {groups.map((g) => (
        <Box key={g.source}>
          <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em" pb="3px" mt="12px" mb="2px" borderBottom="1px solid" borderColor="hair">
            {g.source}
          </Box>
          {g.items.map((t) => {
            const has = !!abilityText(t.name);
            const note = t.atLevel ? `${t.atLevel}. szinttől` : undefined;
            const row = (
              <>
                <Text color="fg" fontSize={FS}>{t.name}</Text>
                {note && <Text color="fgFaint" fontSize="11.5px" flexShrink={0} whiteSpace="nowrap">{note}</Text>}
              </>
            );
            return has ? (
              <Box as="button" type="button" key={t.name} onClick={() => setOpen(t.name)}
                display="flex" alignItems="baseline" justifyContent="space-between" w="100%" textAlign="left"
                gap="14px" py={ROWPY} px="5px" mx="-5px" borderRadius="5px" _hover={{ bg: "accentSoft" }}>
                {row}
              </Box>
            ) : (
              <Box key={t.name} display="flex" alignItems="baseline" justifyContent="space-between"
                gap="14px" py={ROWPY} px="5px" mx="-5px">
                {row}
              </Box>
            );
          })}
        </Box>
      ))}
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
