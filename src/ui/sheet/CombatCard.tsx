import React, { useState } from "react";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { DerivedCharacter } from "../../engine/types";
import { CombatKey, FIST, WeaponRowView, masteryLabel, weaponUseKey } from "../../model/weaponUse";
import { pierceFor, signedNum } from "../../model/armorUse";
import { Card, EditRow, PanelAddButton, PanelEditButton, FS, FS_SUB, ROWPY, SecHead, ValNum, rowProps } from "./primitives";
import { AddWeaponModal } from "./AddWeaponModal";
import { AddArmorModal } from "./AddArmorModal";
import { ArmorDetailModal } from "./ArmorDetailModal";
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
  onSetArmor: (name: string | null) => void;
  onSetShield: (name: string | null) => void;
  onToggleArmorWorn: () => void;
  onToggleShieldWorn: () => void;
  onOpenWeapon: (row: WeaponRowView) => void;
  onCombatInfo: (key: string) => void;
}> = ({ derived, weaponRows, activeRow, pinnedWeapons, onSetWeapons, onSetActiveWeapon, onSetArmor, onSetShield, onToggleArmorWorn, onToggleShieldWorn, onOpenWeapon, onCombatInfo }) => {
  const [addWeaponOpen, setAddWeaponOpen] = useState(false);
  // The chevron opens the weapon card (stats, mastery breakdown, calculator; removing lives there).
  const [detailName, setDetailName] = useState<string | null>(null);
  const detailRow = detailName ? weaponRows.find((r) => r.w.name === detailName) : undefined;
  // The header pencil flips the list into edit mode: add / delete / drag-reorder appear only there.
  const [editMode, setEditMode] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  // Vértezet: one vért + one pajzs slot; the chevron opens the gear card, the picker fills a slot.
  // Its own section with its own pencil — armor shouldn't hide behind the weapons' edit mode.
  const [gearPicker, setGearPicker] = useState<"armor" | "shield" | null>(null);
  const [gearDetail, setGearDetail] = useState<"armor" | "shield" | null>(null);
  const [gearEdit, setGearEdit] = useState(false);
  const [removingGear, setRemovingGear] = useState<"armor" | "shield" | null>(null);
  // The in-hand weapon's SFÉ-negation — only rendered when it exists (canPierce + training).
  const pierce = pierceFor(activeRow);

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
      // ml only: the tap-highlight may bleed left, but the chevron must end at the content edge
      <Flex key={w.name} align="stretch" gap="2px" ml="-5px">
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
                  title: t.icon ? (activeRow?.use.kind === "melee" ? "Közelharci kalkulátor" : "Távolsági harc kalkulátor") : "Miből adódik?",
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
            <Box key={k} as="button" type="button" onClick={() => onCombatInfo(k)} title="Miből adódik?"
              display="flex" alignItems="baseline" gap="5px" px="4px" mx="-4px" borderRadius="5px" _hover={{ bg: "accentSoft" }}>
              <Text fontFamily="ui" fontSize="10.5px" fontWeight={700} letterSpacing=".04em" color="muted">{k}</Text>
              <ValNum sx={{ fontVariantNumeric: "tabular-nums", ...INFO_UL }}>{derived.derived[k]}</ValNum>
            </Box>
          ))}
        </HStack>
      </Box>
      {derived.derived.Sebzésbónusz > 0 && (
        <Box as="button" type="button" w="100%" textAlign="left" onClick={() => onCombatInfo("Sebzésbónusz")} title="Miből adódik?"
          {...rowProps} display="flex" justifyContent="space-between" gap="14px" _hover={{ bg: "accentSoft", borderRadius: "7px" }}>
          <Text color="fg" fontSize={FS}>Sebzésbónusz</Text>
          <ValNum sx={{ fontVariantNumeric: "tabular-nums", ...INFO_UL }}>{`+${derived.derived.Sebzésbónusz}`}</ValNum>
        </Box>
      )}
      {/* the in-hand weapon's armor-piercing (book: fok 3/4/5 −1/−2/−3; bows: dice count) */}
      {pierce && (
        <Box {...rowProps} display="flex" justifyContent="space-between" gap="14px" title={pierce.hint}>
          <Text color="fg" fontSize={FS}>{pierce.label}</Text>
          <ValNum sx={{ fontVariantNumeric: "tabular-nums" }}>{pierce.value}</ValNum>
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

      {/* ── Vértezet: one vért + one pajzs slot. Their MGT/VÉ are already folded into the stats and
          tiles by the engine — these rows show the effective values and open the gear card. ── */}
      <Flex align="center" justify="space-between" gap="10px" mt="13px" mb="3px" pb="3px" borderBottom="1px solid" borderColor="hair">
        <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em">Vértezet</Box>
        <PanelEditButton editing={gearEdit} onToggle={() => setGearEdit(!gearEdit)} label="Vértezet szerkesztése" />
      </Flex>
      {!gearEdit && !derived.armorUse && !derived.shieldUse && (
        <Text fontFamily="ui" fontSize="11.5px" color="fgFaint" py="4px">
          Nincs viselt vért vagy pajzs.
        </Text>
      )}
      {([
        derived.armorUse && {
          kind: "armor" as const,
          name: derived.armorUse.armor.name,
          right: `SFÉ ${derived.armorUse.sfe}`,
          sub: derived.armorUse.worn === false
            ? "levéve — nem érvényesül"
            : derived.armorUse.untrained
              ? `${derived.armorUse.category} · képzetlen viselés!`
              // MGT 0 is the unremarkable case — only a real drag is worth a mention
              : `${derived.armorUse.category}${derived.armorUse.mgt !== 0 ? ` · MGT ${signedNum(derived.armorUse.mgt)}` : ""}${derived.armorUse.fok >= 3 ? ` · Vértviselet ${derived.armorUse.fok}. fok` : ""}`,
          warn: derived.armorUse.worn !== false && derived.armorUse.untrained,
          worn: derived.armorUse.worn !== false,
          onToggle: onToggleArmorWorn,
        },
        derived.shieldUse && {
          kind: "shield" as const,
          name: derived.shieldUse.shield.name,
          right: derived.shieldUse.untrained ? "VÉ —" : `VÉ +${derived.shieldUse.ve}`,
          sub: derived.shieldUse.worn === false
            ? "letéve — nem érvényesül"
            : derived.shieldUse.untrained
              ? "képzetlen — a VÉ nem érvényesül"
              // MGT 0 is the unremarkable case; the fok line keeps the sub from ever being empty
              : [derived.shieldUse.mgt !== 0 ? `MGT ${signedNum(derived.shieldUse.mgt)}` : "", `Pajzshasználat ${derived.shieldUse.fok}. fok`].filter(Boolean).join(" · "),
          warn: derived.shieldUse.worn !== false && derived.shieldUse.untrained,
          worn: derived.shieldUse.worn !== false,
          onToggle: onToggleShieldWorn,
        },
      ].filter(Boolean) as { kind: "armor" | "shield"; name: string; right: string; sub: string; warn: boolean; worn: boolean; onToggle: () => void }[]).map((g) =>
        gearEdit ? (
          <Box key={g.kind} mb="5px">
            <EditRow onDelete={() => setRemovingGear(g.kind)} deleteLabel={`${g.name} eltávolítása`} grip={null}>
              <HStack justify="space-between" align="baseline" gap="10px">
                <Text color="fg" fontSize={FS} noOfLines={1}>{g.name}</Text>
                <Text color="accentTx" fontSize={FS} fontWeight={600} flexShrink={0} sx={{ fontVariantNumeric: "tabular-nums" }}>{g.right}</Text>
              </HStack>
            </EditRow>
          </Box>
        ) : (
          // same shell as the weapon rows: body tap = felöltés/levétel toggle, chevron = the gear card.
          // Worn = accent BORDER only (no fill) — the filled box stays exclusive to the in-hand weapon,
          // so a fully equipped fighter's card doesn't drown in accent.
          <Flex key={g.kind} align="stretch" gap="2px" ml="-5px">
            <Box onClick={g.onToggle} role="button" tabIndex={0} cursor="pointer" flex="1 1 auto" minW={0}
              title={g.worn ? "Levétel — az értékei nem érvényesülnek" : "Felöltés — az értékei érvényesülnek"}
              py={ROWPY} px="5px" borderRadius="7px"
              border="1px solid" borderColor={g.worn ? "accentBd" : "transparent"} _hover={{ bg: "accentSoft" }}>
              <HStack justify="space-between" align="baseline" gap="10px">
                <Text color="fg" fontSize={FS} fontWeight={g.worn ? 600 : 400} noOfLines={1}>{g.name}</Text>
                <Text color={g.worn ? "accentTx" : "fgFaint"} fontSize={FS} fontWeight={600} flexShrink={0} sx={{ fontVariantNumeric: "tabular-nums" }}>{g.right}</Text>
              </HStack>
              <Text fontFamily="ui" fontSize="11.5px" mt="1px" color={g.warn ? "bad" : "muted"}>{g.sub}</Text>
            </Box>
            <Flex as="button" type="button" align="center" justify="center" w="22px" flexShrink={0}
              aria-label={`${g.name} részletei`} title="Részletek"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setGearDetail(g.kind); }}
              color="fgFaint" borderRadius="6px" _hover={{ color: "accentTx", bg: "accentSoft" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
            </Flex>
          </Flex>
        )
      )}
      {gearEdit && !derived.armorUse && (
        <PanelAddButton onClick={() => setGearPicker("armor")}>+ Vért felvétele</PanelAddButton>
      )}
      {gearEdit && !derived.shieldUse && (
        <PanelAddButton onClick={() => setGearPicker("shield")}>+ Pajzs felvétele</PanelAddButton>
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
      {gearPicker && (
        <AddArmorModal
          kind={gearPicker}
          onPick={(name) => { (gearPicker === "armor" ? onSetArmor : onSetShield)(name); setGearPicker(null); }}
          onClose={() => setGearPicker(null)}
        />
      )}
      {gearDetail === "armor" && derived.armorUse && (
        <ArmorDetailModal armorUse={derived.armorUse} onRemove={() => onSetArmor(null)} onClose={() => setGearDetail(null)} />
      )}
      {gearDetail === "shield" && derived.shieldUse && (
        <ArmorDetailModal shieldUse={derived.shieldUse} onRemove={() => onSetShield(null)} onClose={() => setGearDetail(null)} />
      )}
      {removing && (
        <ConfirmModal title="Fegyver eltávolítása" confirmLabel="Eltávolítás"
          onConfirm={() => { onSetWeapons(pinnedWeapons.filter((n) => n !== removing)); setRemoving(null); }}
          onClose={() => setRemoving(null)}>
          Biztosan leveszed a(z) <b>{removing}</b> fegyvert a lapról? Bármikor visszaveheted a szerkesztőben.
        </ConfirmModal>
      )}
      {removingGear && (
        <ConfirmModal title={removingGear === "armor" ? "Vért eltávolítása" : "Pajzs eltávolítása"} confirmLabel="Eltávolítás"
          onConfirm={() => { (removingGear === "armor" ? onSetArmor : onSetShield)(null); setRemovingGear(null); }}
          onClose={() => setRemovingGear(null)}>
          Biztosan eltávolítod a(z) <b>{removingGear === "armor" ? derived.armorUse?.armor.name : derived.shieldUse?.shield.name}</b> {removingGear === "armor" ? "vértet" : "pajzsot"} a lapról? Ha csak ideiglenesen veszed le, elég a sorára kattintanod — így a lapon marad.
        </ConfirmModal>
      )}
    </Card>
  );
};
