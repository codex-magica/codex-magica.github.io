import React, { useState } from "react";
import { Box, Button, Flex, Heading, HStack, Text } from "@chakra-ui/react";
import { ModalShell, ModalCloseButton } from "../Modal";
import { ConfirmModal } from "../ConfirmModal";
import { FIST, WeaponRowView, masteryLabel } from "../../model/weaponUse";
import { FS_SUB } from "./primitives";

const wval = (v: number | string | undefined): string => (v == null || v === "" ? "0" : String(v));

// A compact label/value pair row (mirrors the companion card's StatTrio).
const StatTrio: React.FC<{ items: { label: string; value: React.ReactNode }[] }> = ({ items }) => (
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

// The weapon card: the row's chevron opens it. Read-only stats (the weapon's own values, the
// resolved training and what it contributes), plus the calculator launcher; removing the weapon
// from the sheet lives here, behind a confirm — the row itself stays clean.
export const WeaponDetailModal: React.FC<{
  row: WeaponRowView;
  onRemove?: () => void; // undefined = not removable (the built-in fist row)
  onCalc: () => void;
  onClose: () => void;
}> = ({ row, onRemove, onCalc, onClose }) => {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { w, use, dmg } = row;
  const isFist = w.name === FIST;
  const ranged = use.kind === "ranged";
  const untrained = use.fok === 0;
  const desc = Array.isArray(w.description) ? w.description : w.description ? [w.description] : [];

  return (
    <ModalShell onClose={onClose} width="min(430px, 100%)" maxH="86vh">
      <Box position="relative" px="20px" pt="18px" pb="12px" borderBottom="1px solid" borderColor="rule">
        <ModalCloseButton onClose={onClose} />
        <Heading as="h3" fontSize={{ base: "19px", md: "20px" }} fontWeight={700} color="fg" noOfLines={1} pr="36px">{w.name}</Heading>
        <Text fontFamily="ui" fontSize="12px" color="muted" mt="1px" noOfLines={1}>
          {w.subType} · {untrained ? "képzetlen (kockánként −1 Sp)" : masteryLabel(row)}
        </Text>
      </Box>

      <Box flex="1 1 auto" overflowY="auto" overflowX="hidden" px="20px" py="15px">
        <StatTrio items={[
          { label: "Sebzés", value: dmg },
          { label: "Időigény", value: w.attackDuration },
          ranged ? { label: "Lőtáv", value: w.range ?? "—" } : { label: "Súly", value: w.weight },
        ]} />

        {/* the weapon's own combat values — greyed context only until fok 2 unlocks them */}
        {!isFist && (
          <>
            <SubHead>A fegyver értékei{use.fok < 2 ? " — 2. foktól érvényesülnek" : ""}</SubHead>
            <StatTrio items={ranged
              ? [{ label: "KÉ", value: wval(w.KÉ) }, { label: "CÉ", value: wval(w.CÉ) }, { label: "VÉ", value: wval(w.VÉ) }]
              : [{ label: "KÉ", value: wval(w.KÉ) }, { label: "TÉ", value: wval(w.TÉ) }, { label: "VÉ", value: wval(w.VÉ) }]} />
          </>
        )}

        {/* what the training adds on top (fok 3+), itemized like the combat-info breakdowns */}
        {(use.masteryVals.ke !== 0 || use.masteryVals.te !== 0 || use.masteryVals.ve !== 0 || use.masteryVals.ce !== 0) && (
          <>
            <SubHead>Mesterfok bónusz ({use.fok}. fok)</SubHead>
            <StatTrio items={ranged
              ? [{ label: "KÉ", value: `+${use.masteryVals.ke}` }, { label: "CÉ", value: `+${use.masteryVals.ce}` }, { label: "VÉ", value: `+${use.masteryVals.ve}` }]
              : [{ label: "KÉ", value: `+${use.masteryVals.ke}` }, { label: "TÉ", value: `+${use.masteryVals.te}` }, { label: "VÉ", value: `+${use.masteryVals.ve}` }]} />
          </>
        )}
        {use.extras.map((e) => (
          <Text key={e.label} fontFamily="ui" fontSize="12.5px" color="accentTx" mt="7px" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {e.label}: KÉ +{e.vals.ke} · TÉ +{e.vals.te} · VÉ +{e.vals.ve}
          </Text>
        ))}

        {desc.length > 0 && (
          <>
            <SubHead>Leírás</SubHead>
            {desc.map((p, i) => (
              <Text key={i} fontSize="13px" color="fg" lineHeight="1.6" mb="8px">{p}</Text>
            ))}
          </>
        )}

        <Flex justify="space-between" align="center" gap="9px" mt="16px">
          {onRemove ? (
            <Button variant="ghost" size="sm" color="bad" px="8px" _hover={{ bg: "accentSoft" }} onClick={() => setConfirmRemove(true)}>Eltávolítás</Button>
          ) : <Box />}
          <Button size="sm" bg="accent" color="onAccent" _hover={{ opacity: 0.9 }} onClick={onCalc}>
            {ranged ? "Távolsági kalkulátor" : "Közelharci kalkulátor"}
          </Button>
        </Flex>
      </Box>

      {confirmRemove && onRemove && (
        <ConfirmModal title="Fegyver eltávolítása" confirmLabel="Eltávolítás"
          onConfirm={() => { onRemove(); onClose(); }} onClose={() => setConfirmRemove(false)}>
          Biztosan leveszed a(z) <b>{w.name}</b> fegyvert a lapról? Bármikor visszaveheted a „+” gombbal.
        </ConfirmModal>
      )}
    </ModalShell>
  );
};
