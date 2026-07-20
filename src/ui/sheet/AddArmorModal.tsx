import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { ModalShell, ModalHeader } from "../Modal";
import { ArmorValues, ShieldValues } from "../../data/armor";
import { armorCategory, signedNum } from "../../model/armorUse";
import { FS, FS_SUB } from "./primitives";

// Vért/pajzs picker: one slot each, so tapping a row selects it and closes. The armor list is
// grouped by weight category; both lists are short — no filter needed.
export const AddArmorModal: React.FC<{
  kind: "armor" | "shield";
  onPick: (name: string) => void;
  onClose: () => void;
}> = ({ kind, onPick, onClose }) => {
  const groups =
    kind === "shield"
      ? [{ group: "Pajzsok", rows: ShieldValues.map((s) => ({ name: s.name, right: `VÉ ${s.VÉ} · MGT ${signedNum(s.MGT)}` })) }]
      : (["Könnyűvértezet", "Rugalmas nehézvért", "Merev nehézvért"] as const).map((cat) => ({
          group: cat,
          rows: ArmorValues.filter((a) => armorCategory(a.name) === cat).map((a) => ({
            name: a.name,
            right: `SFÉ ${a.SFÉ} · MGT ${signedNum(a.MGT)}`,
          })),
        }));
  return (
    <ModalShell onClose={onClose} width="min(420px, 100%)" maxH="82vh">
      <ModalHeader onClose={onClose} pt="16px" pb="10px">
        <Heading as="h3" fontSize={{ base: "18px", md: "19px" }} fontWeight={700} color="fg">
          {kind === "shield" ? "Pajzs felvétele" : "Vért felvétele"}
        </Heading>
      </ModalHeader>
      <Box flex="1 1 auto" overflowY="auto" px="20px" pb="18px">
        {groups.map((g) => (
          <Box key={g.group}>
            <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em" pb="3px" mt="11px" mb="3px" borderBottom="1px solid" borderColor="hair">{g.group}</Box>
            {g.rows.map((r) => (
              <Box key={r.name} as="button" type="button" w="100%" textAlign="left"
                onClick={() => onPick(r.name)}
                display="flex" alignItems="baseline" justifyContent="space-between" gap="12px"
                py="6px" px="7px" mx="-7px" borderRadius="6px" _hover={{ bg: "accentSoft" }}>
                <Text color="fg" fontSize={FS} noOfLines={1}>{r.name}</Text>
                <Text color="muted" fontFamily="ui" fontSize="12px" flexShrink={0} sx={{ fontVariantNumeric: "tabular-nums" }}>{r.right}</Text>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </ModalShell>
  );
};
