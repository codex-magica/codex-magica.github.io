import React, { useState } from "react";
import { Box, Button, Flex, Heading, Text } from "@chakra-ui/react";
import { ModalShell, ModalCloseButton } from "../Modal";
import { ConfirmModal } from "../ConfirmModal";
import { BodyPart } from "../DetailModal";
import { ArmorUse, ShieldUse, signedNum } from "../../model/armorUse";
import { FS_SUB } from "./primitives";

// Compact label/value pairs (same shape as the weapon card's StatTrio).
const StatRow: React.FC<{ items: { label: string; value: React.ReactNode }[] }> = ({ items }) => (
  <Box display="grid" gridTemplateColumns={`repeat(${items.length}, 1fr)`} gap="10px">
    {items.map((it) => (
      <Box key={it.label} minW={0}>
        <Text fontFamily="ui" fontSize="11px" color="muted" mb="2px" noOfLines={1}>{it.label}</Text>
        <Text fontSize="13.5px" color="fg" noOfLines={1} sx={{ fontVariantNumeric: "tabular-nums" }}>{it.value === "" || it.value == null ? "—" : it.value}</Text>
      </Box>
    ))}
  </Box>
);

const SubHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em" mt="15px" mb="6px">{children}</Box>
);

// The vért/pajzs card: the row's chevron opens it. Effective values with the base + skill breakdown,
// the book description, and removal behind a confirm.
export const ArmorDetailModal: React.FC<{
  armorUse?: ArmorUse; // exactly one of the two is set
  shieldUse?: ShieldUse;
  onRemove: () => void;
  onClose: () => void;
}> = ({ armorUse, shieldUse, onRemove, onClose }) => {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const item = armorUse?.armor ?? shieldUse!.shield;
  const name = item.name;
  const doffed = (armorUse ?? shieldUse)!.worn === false;
  const sub = (armorUse
    ? `${armorUse.category} · ${armorUse.fok > 0 ? `Vértviselet ${armorUse.fok}. fok` : "Vértviselet nélkül"}`
    : `Pajzs · ${shieldUse!.fok > 0 ? `Pajzshasználat ${shieldUse!.fok}. fok` : "képzetlen"}`)
    + (doffed ? (armorUse ? " · levéve" : " · letéve") : "");
  const desc = Array.isArray(item.description) ? item.description : item.description ? [item.description] : [];

  return (
    <ModalShell onClose={onClose} width="min(430px, 100%)" maxH="86vh">
      <Box position="relative" px="20px" pt="18px" pb="12px" borderBottom="1px solid" borderColor="rule">
        <ModalCloseButton onClose={onClose} />
        <Heading as="h3" fontSize={{ base: "19px", md: "20px" }} fontWeight={700} color="fg" noOfLines={1} pr="36px">{name}</Heading>
        <Text fontFamily="ui" fontSize="12px" color="muted" mt="1px" noOfLines={1}>{sub}</Text>
      </Box>

      <Box flex="1 1 auto" overflowY="auto" overflowX="hidden" px="20px" py="15px">
        {armorUse && (
          <>
            <StatRow items={[
              { label: "SFÉ", value: armorUse.sfe },
              { label: "MGT", value: signedNum(armorUse.mgt) },
              { label: "STP", value: armorUse.armor.STP },
              { label: "Súly", value: armorUse.armor.weight },
            ]} />
            {(armorUse.sfe !== armorUse.baseSfe || armorUse.mgt !== armorUse.baseMgt) && (
              <Text fontFamily="ui" fontSize="12px" color="accentTx" mt="8px" sx={{ fontVariantNumeric: "tabular-nums" }}>
                Alapérték: SFÉ {armorUse.baseSfe} · MGT {signedNum(armorUse.baseMgt)} — a Vértviselet {armorUse.fok}. foka módosítja.
              </Text>
            )}
            {armorUse.untrained && (
              <Text fontFamily="ui" fontSize="12px" color="bad" mt="8px">
                Hiányzik a viseléséhez szükséges Vértviselet ({armorUse.category === "Rugalmas nehézvért" ? "1." : "2."} fok) —
                a képzetlen fegyverforgatás levonásai sújtják, és csak Állóképességnyi körig bírja.
              </Text>
            )}
          </>
        )}
        {shieldUse && (
          <>
            <StatRow items={[
              { label: "VÉ", value: shieldUse.veText },
              { label: "MGT", value: signedNum(shieldUse.mgt) },
              { label: "Súly", value: shieldUse.shield.weight },
            ]} />
            {shieldUse.mgt !== shieldUse.baseMgt && (
              <Text fontFamily="ui" fontSize="12px" color="accentTx" mt="8px" sx={{ fontVariantNumeric: "tabular-nums" }}>
                Alap MGT: {signedNum(shieldUse.baseMgt)} — a Pajzshasználat {shieldUse.fok}. fok módosítja.
              </Text>
            )}
            {shieldUse.untrained && (
              <Text fontFamily="ui" fontSize="12px" color="bad" mt="8px">
                Pajzshasználat nélkül a pajzs VÉ-je nem érvényesül — csak az MGT-je.
              </Text>
            )}
            {shieldUse.fok >= 3 && shieldUse.shield.damage && (
              <Text fontFamily="ui" fontSize="12px" color="muted" mt="8px">
                Pajzslökés (3. foktól): {shieldUse.shield.damage} + Sebzésbónusz.
              </Text>
            )}
          </>
        )}

        {desc.length > 0 && (
          <>
            <SubHead>Leírás</SubHead>
            {desc.map((p, i) => (
              <BodyPart key={i} text={p} />
            ))}
          </>
        )}

        <Flex justify="flex-start" mt="16px">
          {/* removal from the sheet — "levétel" (doffing) is the row tap, so this reads differently */}
          <Button variant="ghost" size="sm" color="bad" px="8px" _hover={{ bg: "accentSoft" }} onClick={() => setConfirmRemove(true)}>Eltávolítás</Button>
        </Flex>
      </Box>

      {confirmRemove && (
        <ConfirmModal title={armorUse ? "Vért eltávolítása" : "Pajzs eltávolítása"} confirmLabel="Eltávolítás"
          onConfirm={() => { onRemove(); onClose(); }} onClose={() => setConfirmRemove(false)}>
          Biztosan eltávolítod a(z) <b>{name}</b> {armorUse ? "vértet" : "pajzsot"} a lapról? Ha csak ideiglenesen veszed le, elég a sorára kattintanod — így a lapon marad.
        </ConfirmModal>
      )}
    </ModalShell>
  );
};
