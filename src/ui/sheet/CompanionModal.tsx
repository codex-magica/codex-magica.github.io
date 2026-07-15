import React, { useState } from "react";
import { Box, Button, Flex, Heading, HStack, Input, Text } from "@chakra-ui/react";
import { ModalShell, ModalCloseButton } from "../Modal";
import { ConfirmModal } from "../ConfirmModal";
import { Companion, CompanionStats, companionIconKey } from "../../model/companions";
import { CompanionIcon } from "./animalIcons";
import { IconPicker } from "./IconPicker";
import { QuietPopover } from "../QuietPopover";
import { FS_SUB } from "./primitives";

const field = {
  size: "sm" as const, bg: "fieldBg", borderColor: "fieldBd", borderRadius: "7px", color: "fg",
  fontSize: "13.5px", focusBorderColor: "accent",
};

// An editable stat as a tile (label above a big centred value) — reads like the sheet's combat tiles,
// but the value is a live field. `tone` swaps the accent for the Ép/Fp vitals.
const StatTile: React.FC<{ label: string; value: string; onChange: (v: string) => void; numeric?: boolean; tone?: "combat" | "vital" }> = ({ label, value, onChange, numeric, tone = "combat" }) => (
  <Box bg="accentSoft" borderRadius="10px" py="7px" px="6px" textAlign="center" border="1px solid" borderColor="transparent" _focusWithin={{ borderColor: "accent" }}>
    <Text fontFamily="ui" fontSize="10px" fontWeight={700} letterSpacing=".08em" textTransform="uppercase" color="accentTx" opacity={0.8}>{label}</Text>
    <Input value={value} onChange={(e) => onChange(e.target.value)} inputMode={numeric ? "numeric" : undefined}
      variant="unstyled" textAlign="center" fontWeight={700} color={tone === "vital" ? "fg" : "accentTx"}
      fontSize={numeric ? "20px" : "16px"} h="26px" mt="1px" sx={{ fontVariantNumeric: "tabular-nums" }} />
  </Box>
);

// A labelled secondary field (the less-glanced stats), compact.
const MiniField: React.FC<{ label: string; value: string; onChange: (v: string) => void; numeric?: boolean }> = ({ label, value, onChange, numeric }) => (
  <Box>
    <Text fontFamily="ui" fontSize="11px" color="muted" mb="3px">{label}</Text>
    <Input {...field} w="100%" value={value} inputMode={numeric ? "numeric" : undefined}
      onChange={(e) => onChange(e.target.value)} sx={numeric ? { fontVariantNumeric: "tabular-nums" } : undefined} />
  </Box>
);

// The companion detail sheet — a proper little creature card: an emoji hero, the primary combat values
// and vitals as editable tiles, then the secondary stats in a compact grid. Every field is editable
// (the bestiary numbers are only guidelines). Saving clamps current Ép/Fp ≤ the new max.
export const CompanionModal: React.FC<{ companion: Companion; onSave: (c: Companion) => void; onDelete: () => void; onClose: () => void }> = ({ companion, onSave, onDelete, onClose }) => {
  const [name, setName] = useState(companion.name);
  const [note, setNote] = useState(companion.note ?? "");
  const [icon, setIcon] = useState(companionIconKey(companion));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [stats, setStats] = useState<CompanionStats>(companion.stats);
  const [epMax, setEpMax] = useState(String(companion.stats.epMax));
  const [fpMax, setFpMax] = useState(String(companion.stats.fpMax));
  const num = (k: keyof CompanionStats) => (v: string) => setStats((s) => ({ ...s, [k]: parseInt(v, 10) || 0 }));
  const txt = (k: keyof CompanionStats) => (v: string) => setStats((s) => ({ ...s, [k]: v }));

  const save = () => {
    const eMax = parseInt(epMax, 10) || 0;
    const fMax = parseInt(fpMax, 10) || 0;
    onSave({
      ...companion, name: name.trim() || companion.name, note: note.trim() || undefined, icon,
      stats: { ...stats, epMax: eMax, fpMax: fMax },
      ep: Math.min(companion.ep, eMax), fp: Math.min(companion.fp, fMax),
    });
    onClose();
  };

  return (
    <ModalShell onClose={onClose} width="min(430px, 100%)" maxH="86vh">
      {/* hero: emoji + species; the name is edited in the field below */}
      <Box position="relative" px="20px" pt="18px" pb="12px" borderBottom="1px solid" borderColor="rule">
        <ModalCloseButton onClose={onClose} />
        <HStack gap="11px" align="center">
          {/* tap the icon → emoji picker popover */}
          <Box position="relative" flexShrink={0}>
            <Flex as="button" type="button" onClick={() => setPickerOpen((o) => !o)} title="Ikon módosítása" aria-label="Ikon módosítása"
              align="center" justify="center" w="42px" h="42px" borderRadius="12px" bg="accentSoft" color="accentTx"
              border="1px solid" borderColor="transparent" _hover={{ borderColor: "accent" }}>
              <CompanionIcon iconKey={icon} size={26} />
            </Flex>
            {pickerOpen && (
              <QuietPopover align="left" title="Ikon" minW="272px" maxW="272px" onClose={() => setPickerOpen(false)}>
                <IconPicker value={icon} onChange={(k) => { setIcon(k); setPickerOpen(false); }} />
              </QuietPopover>
            )}
          </Box>
          <Box minW={0}>
            <Heading as="h3" fontSize={{ base: "18px", md: "19px" }} fontWeight={700} color="fg" noOfLines={1}>{companion.name}</Heading>
            <Text fontFamily="ui" fontSize="12px" color="muted" noOfLines={1}>{companion.species}</Text>
          </Box>
        </HStack>
      </Box>

      <Box flex="1 1 auto" overflowY="auto" overflowX="hidden" px="20px" py="16px">
        <Text fontFamily="ui" fontSize="12px" color="muted" mb="4px">Név</Text>
        <Input {...field} value={name} onChange={(e) => setName(e.target.value)} w="100%" mb="16px" />

        {/* Alapadatok — who the creature is: its Ép/Fp (glanceable tiles) + speed, mind, resistances */}
        <Box fontSize={FS_SUB} fontWeight={700} color="muted" pb="3px" mb="9px" borderBottom="1px solid" borderColor="hair">Alapadatok</Box>
        <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap="8px" mb="10px">
          <StatTile label="Ép" value={epMax} onChange={setEpMax} numeric tone="vital" />
          <StatTile label="Fp" value={fpMax} onChange={setFpMax} numeric tone="vital" />
        </Box>
        <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap="10px 12px" mb="16px">
          <MiniField label="Sebesség" value={stats.sebesseg} onChange={txt("sebesseg")} />
          <MiniField label="Intelligencia" value={stats.intelligencia} onChange={txt("intelligencia")} />
          <MiniField label="Méregellenállás" value={String(stats.meregEllenallas)} onChange={num("meregEllenallas")} numeric />
          <MiniField label="Mentál ME" value={String(stats.mentalME)} onChange={num("mentalME")} numeric />
          <MiniField label="Asztrál ME" value={String(stats.asztralME)} onChange={num("asztralME")} numeric />
        </Box>

        {/* Támadás — how it fights: its combat values (tiles) + timing, damage, size */}
        <Box fontSize={FS_SUB} fontWeight={700} color="muted" pb="3px" mb="9px" borderBottom="1px solid" borderColor="hair">Támadás</Box>
        <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap="8px" mb="10px">
          <StatTile label="KÉ" value={String(stats.ke)} onChange={num("ke")} numeric />
          <StatTile label="TÉ" value={String(stats.te)} onChange={num("te")} numeric />
          <StatTile label="VÉ" value={String(stats.ve)} onChange={num("ve")} numeric />
        </Box>
        <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap="10px 12px" mb="16px">
          <MiniField label="Időigény" value={stats.idoigeny} onChange={txt("idoigeny")} />
          <MiniField label="Sebzés" value={stats.sebzes} onChange={txt("sebzes")} />
          <MiniField label="Méretkategória" value={stats.meret} onChange={txt("meret")} />
        </Box>

        <Text fontFamily="ui" fontSize="12px" color="muted" mb="4px">Jegyzet</Text>
        <Input {...field} value={note} onChange={(e) => setNote(e.target.value)} placeholder="pl. sánta a bal hátsó lábára…" w="100%" mb="18px" />

        <Flex justify="space-between" align="center" gap="9px">
          <Button variant="ghost" size="sm" color="bad" px="8px" _hover={{ bg: "accentSoft" }} onClick={() => setConfirmDelete(true)}>Törlés</Button>
          <HStack gap="9px">
            <Button variant="outline" size="sm" borderColor="hair" color="muted" onClick={onClose}>Mégse</Button>
            <Button size="sm" bg="accent" color="onAccent" _hover={{ opacity: 0.9 }} onClick={save}>Mentés</Button>
          </HStack>
        </Flex>
      </Box>

      {confirmDelete && (
        <ConfirmModal title="Társ törlése" confirmLabel="Törlés"
          onConfirm={() => { onDelete(); onClose(); }} onClose={() => setConfirmDelete(false)}>
          Biztosan törlöd a(z) <b>{companion.name}</b> nevű társat? Ez nem visszavonható.
        </ConfirmModal>
      )}
    </ModalShell>
  );
};
