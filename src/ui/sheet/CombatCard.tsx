import React, { useState } from "react";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { DerivedCharacter } from "../../engine/types";
import { CombatKey, FIST, WeaponRowView, masteryLabel, weaponUseKey } from "../../model/weaponUse";
import { Card, EditRow, PanelAddButton, PanelEditButton, FS, FS_SUB, ROWPY, SecHead, ValNum, rowProps } from "./primitives";
import { AddWeaponModal } from "./AddWeaponModal";
import { WeaponDetailModal } from "./WeaponDetailModal";
import { ReorderList } from "./ReorderList";
import { ConfirmModal } from "../ConfirmModal";

// Calculator-tile icons — crossed swords (közelharc) / crosshair (célzás, távolsági).
const SwordsIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
    <line x1="13" y1="19" x2="19" y2="13" /><line x1="16" y1="16" x2="20" y2="20" /><line x1="19" y1="21" x2="21" y2="19" />
    <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 10" />
    <line x1="5" y1="14" x2="9" y2="18" /><line x1="7" y1="17" x2="4" y2="20" /><line x1="3" y1="19" x2="5" y2="21" />
  </svg>
);
const CrosshairIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="1.5" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22.5" />
    <line x1="1.5" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22.5" y2="12" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

// Dotted underline on a number = "tap for the breakdown" — the affordance for the info modals.
export const INFO_UL = {
  textDecoration: "underline dotted",
  textDecorationColor: "var(--chakra-colors-fgFaint)",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

type Tile = { label: string; value: React.ReactNode; small?: boolean; icon?: boolean; onClick?: () => void };

// The Harcértékek card: the in-hand weapon's adjusted combat tiles, MME/AME, Sebzésbónusz, and the
// pinned-weapon list (tap = take in hand). The weapon math itself lives in model/weaponUse.
export const CombatCard: React.FC<{
  derived: DerivedCharacter;
  weaponRows: WeaponRowView[];
  activeRow?: WeaponRowView;
  pinnedWeapons: string[];
  onSetWeapons: (weapons: string[]) => void;
  onSetActiveWeapon: (name: string | null) => void;
  onOpenWeapon: (row: WeaponRowView) => void;
  onCombatInfo: (key: string) => void;
}> = ({ derived, weaponRows, activeRow, pinnedWeapons, onSetWeapons, onSetActiveWeapon, onOpenWeapon, onCombatInfo }) => {
  const [addWeaponOpen, setAddWeaponOpen] = useState(false);
  // The chevron opens the weapon card (stats, mastery breakdown, calculator; removing lives there).
  const [detailName, setDetailName] = useState<string | null>(null);
  const detailRow = detailName ? weaponRows.find((r) => r.w.name === detailName) : undefined;
  // The header pencil flips the list into edit mode: add / delete / drag-reorder appear only there.
  const [editMode, setEditMode] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const combatTile = (k: CombatKey): Tile => ({
    label: k,
    value: derived.combat[k] + (activeRow ? activeRow.use[weaponUseKey(k)] : 0),
    onClick: () => onCombatInfo(k),
  });
  // With a weapon in hand the 4th tile is the calculator launcher (its icon = melee/ranged). Sebzés
  // isn't tiled — it's already on every weapon row below, and the calculator wants the prime slot.
  const calcTile: Tile | null = activeRow
    ? {
        label: "Kalkulátor",
        value: activeRow.use.kind === "melee" ? SwordsIcon : CrosshairIcon,
        icon: true,
        onClick: () => onOpenWeapon(activeRow),
      }
    : null;
  const tiles: Tile[] = !activeRow || !calcTile
    ? (["KÉ", "TÉ", "VÉ", "CÉ"] as CombatKey[]).map(combatTile)
    : activeRow.use.kind === "melee"
      ? [combatTile("KÉ"), combatTile("TÉ"), combatTile("VÉ"), calcTile]
      // ranged: CÉ replaces TÉ, but VÉ stays — being shot at doesn't stop you being attacked in melee
      : [combatTile("KÉ"), combatTile("CÉ"), combatTile("VÉ"), calcTile];
  const tilesCaption = activeRow ? `${activeRow.w.name} · ${masteryLabel(activeRow)}` : "Alapértékek";

  // One weapon row: tap = take in hand (the tiles switch to it); the chevron opens the weapon card.
  const weaponRow = (row: WeaponRowView) => {
    const { w, use, dmg } = row;
    const fixed = w.name === FIST; // the built-in default — not removable, selecting it = bare hands
    const selected = activeRow?.w.name === w.name;
    return (
      <Flex key={w.name} align="stretch" gap="2px" mx="-5px">
        <Box onClick={() => onSetActiveWeapon(fixed || selected ? null : w.name)} role="button" tabIndex={0} cursor="pointer" flex="1 1 auto" minW={0}
          title={fixed ? "Puszta kéz — alapértelmezett" : selected ? "Letétel (puszta kéz)" : "Kézbevétel — a fenti értékek erre váltanak"}
          py={ROWPY} px="5px" borderRadius="7px" bg={selected ? "accentSoft" : undefined}
          border="1px solid" borderColor={selected ? "accentBd" : "transparent"} _hover={{ bg: "accentSoft" }}>
          <HStack justify="space-between" align="baseline" gap="10px">
            <Text color={selected ? "accentTx" : "fg"} fontSize={FS} fontWeight={selected ? 600 : 400} noOfLines={1}>{w.name}</Text>
            <Text color="accentTx" fontSize={FS} fontWeight={600} maxW="110px" flexShrink={0} isTruncated title={dmg} sx={{ fontVariantNumeric: "tabular-nums" }}>{dmg}</Text>
          </HStack>
          {/* skill state only — the accumulated modifiers show up in the tiles on selection */}
          <Text fontFamily="ui" fontSize="11.5px" mt="1px" color="muted">
            {use.fok === 0 ? "képzetlen (kockánként −1 Sp)" : masteryLabel(row)}
          </Text>
        </Box>
        <Flex as="button" type="button" align="center" justify="center" w="22px" flexShrink={0}
          aria-label={`${w.name} részletei`} title="Részletek"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDetailName(w.name); }}
          color="fgFaint" borderRadius="6px" _hover={{ color: "accentTx", bg: "accentSoft" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
        </Flex>
      </Flex>
    );
  };

  return (
    <Card>
      <SecHead>Harcértékek</SecHead>
      {/* the four tiles: the in-hand weapon's ADJUSTED values (+ the calculator) — the caption names the mode */}
      <Text fontFamily="ui" fontSize="11px" color="fgFaint" mt="2px" mb="7px">{tilesCaption}</Text>
      <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap="8px">
        {tiles.map((t) => (
          <Box key={t.label}
            {...(t.onClick
              ? {
                  as: "button" as const,
                  type: "button",
                  onClick: t.onClick,
                  title: t.icon ? (activeRow?.use.kind === "melee" ? "Közelharci kalkulátor" : "Távolsági harc kalkulátor") : "Hogyan számolódik?",
                  _hover: { borderColor: "accent" },
                }
              : {})}
            bg="accentSoft" borderRadius="9px" py="8px" px="6px" textAlign="center"
            border="1px solid" borderColor="transparent">
            <Text fontFamily="ui" fontSize="10px" fontWeight={700} letterSpacing=".1em" textTransform="uppercase" color="accentTx" opacity={0.8}>{t.label}</Text>
            {t.icon ? (
              <Flex justify="center" align="center" h="30px" color="accentTx">{t.value}</Flex>
            ) : (
              <Text fontSize={t.small ? "16.5px" : "24px"} fontWeight={700} color="accentTx" lineHeight={t.small ? "1.8" : "1.25"} isTruncated
                title={t.small && typeof t.value === "string" ? t.value : undefined}
                sx={{ fontVariantNumeric: "tabular-nums", ...(t.onClick ? INFO_UL : {}) }}>{t.value}</Text>
            )}
          </Box>
        ))}
      </Box>
      <Box {...rowProps} justifyContent="space-between" gap="14px" mt="7px">
        <Text color="fg" fontSize={FS}>Mágiaellenállás</Text>
        <HStack gap="12px" flexShrink={0}>
          {(["MME", "AME"] as const).map((k) => (
            <Box key={k} as="button" type="button" onClick={() => onCombatInfo(k)} title="Hogyan számolódik?"
              display="flex" alignItems="baseline" gap="5px" px="4px" mx="-4px" borderRadius="5px" _hover={{ bg: "accentSoft" }}>
              <Text fontFamily="ui" fontSize="10.5px" fontWeight={700} letterSpacing=".04em" color="muted">{k}</Text>
              <ValNum sx={{ fontVariantNumeric: "tabular-nums", ...INFO_UL }}>{derived.derived[k]}</ValNum>
            </Box>
          ))}
        </HStack>
      </Box>
      {derived.derived.Sebzésbónusz > 0 && (
        <Box as="button" type="button" w="100%" textAlign="left" onClick={() => onCombatInfo("Sebzésbónusz")} title="Hogyan számolódik?"
          {...rowProps} display="flex" justifyContent="space-between" gap="14px" _hover={{ bg: "accentSoft", borderRadius: "7px" }}>
          <Text color="fg" fontSize={FS}>Sebzésbónusz</Text>
          <ValNum sx={{ fontVariantNumeric: "tabular-nums", ...INFO_UL }}>{`+${derived.derived.Sebzésbónusz}`}</ValNum>
        </Box>
      )}
      {/* subhead: the pencil flips the list into edit mode (add / delete / drag-reorder) */}
      <Flex align="center" justify="space-between" gap="10px" mt="13px" mb="3px" pb="3px" borderBottom="1px solid" borderColor="hair">
        <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em">Fegyverek</Box>
        <PanelEditButton editing={editMode} onToggle={() => setEditMode(!editMode)} label="Fegyverek szerkesztése" />
      </Flex>
      {!editMode && weaponRows.map((row) => weaponRow(row))}
      {editMode && (
        <>
          {/* the fist row is fixed — shown for context, but it can't be moved or removed */}
          {weaponRows.filter((r) => r.w.name === FIST).map((row) => (
            <Box key={row.w.name} opacity={0.55} py="7px" px="9px" mb="5px">
              <Text color="fg" fontSize={FS} noOfLines={1}>{row.w.name}</Text>
            </Box>
          ))}
          <ReorderList
            items={pinnedWeapons}
            keyOf={(n) => n}
            onReorder={onSetWeapons}
            row={(name, grip) => {
              const row = weaponRows.find((r) => r.w.name === name);
              return row ? (
                <EditRow onDelete={() => setRemoving(name)} deleteLabel={`${name} eltávolítása`} grip={grip}>
                  <HStack justify="space-between" align="baseline" gap="10px">
                    <Text color="fg" fontSize={FS} noOfLines={1}>{name}</Text>
                    <Text color="accentTx" fontSize={FS} fontWeight={600} maxW="110px" flexShrink={0} isTruncated sx={{ fontVariantNumeric: "tabular-nums" }}>{row.dmg}</Text>
                  </HStack>
                </EditRow>
              ) : null;
            }}
          />
          <PanelAddButton onClick={() => setAddWeaponOpen(true)}>+ Fegyver hozzáadása</PanelAddButton>
        </>
      )}
      {detailRow && (
        <WeaponDetailModal
          row={detailRow}
          onRemove={detailRow.w.name === FIST ? undefined : () => onSetWeapons(pinnedWeapons.filter((n) => n !== detailRow.w.name))}
          onCalc={() => { setDetailName(null); onOpenWeapon(detailRow); }}
          onClose={() => setDetailName(null)}
        />
      )}
      {addWeaponOpen && (
        <AddWeaponModal
          pinned={pinnedWeapons}
          onAdd={(name) => { onSetWeapons([...pinnedWeapons, name]); setAddWeaponOpen(false); }}
          onClose={() => setAddWeaponOpen(false)}
        />
      )}
      {removing && (
        <ConfirmModal title="Fegyver eltávolítása" confirmLabel="Eltávolítás"
          onConfirm={() => { onSetWeapons(pinnedWeapons.filter((n) => n !== removing)); setRemoving(null); }}
          onClose={() => setRemoving(null)}>
          Biztosan leveszed a(z) <b>{removing}</b> fegyvert a lapról? Bármikor visszaveheted a szerkesztőben.
        </ConfirmModal>
      )}
    </Card>
  );
};
