import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DraftContext } from "./sheet/draftContext";
import { Box, Flex, HStack, IconButton, Spacer, Text } from "@chakra-ui/react";
import { EditIcon, ArrowUpIcon, ArrowBackIcon } from "@chakra-ui/icons";
import { CharacterSheet } from "./CharacterSheet";
import { Compendium } from "./Compendium";
import { DetailModal, ModalState } from "./DetailModal";
import { WeaponModal, WeaponModalState } from "./WeaponModal";
import { skillModalContent, spellModalByName } from "./compendiumData";
import { CharacterCondition, CharacterRecord, VitalKey } from "../model/character";
import { Companion } from "../model/companions";
import { isHomebrew, rulesFor } from "../model/rulesVariants";
import { derive } from "../engine/derive";
import { ZoneSwitch, DarkToggle } from "./controls";

interface AppShellProps {
  record: CharacterRecord;
  onBack: () => void; // back to the roster
  onEdit: () => void; // open the full-screen creator in edit mode
  onLevelup: () => void; // open it in level-up mode
  onPatchRecord: (record: CharacterRecord, base: CharacterRecord) => void; // persist play-state edits (vitals…); base = the version they were made from
  restore?: { view?: "sheet" | "compendium"; compTab?: number }; // back from a Google round trip
  onPlace?: (view: "sheet" | "compendium", compTab: number) => void; // where the user is, for that round trip
}

const SIDE = { base: "12px", md: "16px" }; // base matches the compendium's merged mobile bar

// action button: full label on md+, icon-only on phones (the title carries the label).
// Phones: quiet ghost icon, matching the roster bar's dark-mode toggle.
const ActBtn: React.FC<{ onClick: () => void; icon: React.ReactNode; accent?: boolean; label: string }> = ({ onClick, icon, accent, label }) => (
  <Box as="button" type="button" onClick={onClick} title={label} aria-label={label} display="inline-flex" alignItems="center" justifyContent="center" gap="7px"
    px={{ base: 0, md: "13px" }} py={{ base: 0, md: "8px" }} w={{ base: "40px", md: "auto" }} minH={{ base: "40px", md: "36px" }} borderRadius={{ base: "10px", md: "9px" }}
    border={{ base: "none", md: "1px solid" }} borderColor="fieldBd" bg="transparent" flexShrink={0}
    color={accent ? "accentTx" : { base: "muted", md: "fg" }} fontWeight={600} fontSize="14px" whiteSpace="nowrap" _active={{ bg: "accentSoft" }}>
    {icon}<Box as="span" display={{ base: "none", md: "inline" }}>{label}</Box>
  </Box>
);

export const AppShell: React.FC<AppShellProps> = ({ record, onBack, onEdit, onLevelup, onPatchRecord, restore, onPlace }) => {
  const [view, setView] = useState<"sheet" | "compendium">(() => restore?.view ?? "sheet");
  const [compTab, setCompTab] = useState(() => restore?.compTab ?? 0);
  useEffect(() => {
    onPlace?.(view, compTab);
  }, [view, compTab, onPlace]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [weaponModal, setWeaponModal] = useState<WeaponModalState | null>(null);

  // While an editor with a draft is open, changes are saved against the character as it was when it
  // opened (see sheet/draftContext.ts); otherwise against what's on screen now.
  const recordRef = useRef(record);
  useLayoutEffect(() => {
    recordRef.current = record; // before the editors' effects run (layout effects come first)
  });
  const drafts = useRef(0);
  const draftBase = useRef<CharacterRecord | null>(null);
  const openDraft = useCallback(() => {
    if (drafts.current++ === 0) draftBase.current = recordRef.current;
  }, []);
  const closeDraft = useCallback(() => {
    if (--drafts.current <= 0) {
      drafts.current = 0;
      draftBase.current = null;
    }
  }, []);
  const draftApi = useMemo(() => ({ open: openDraft, close: closeDraft }), [openDraft, closeDraft]);
  const patch = (next: CharacterRecord) => {
    onPatchRecord(next, draftBase.current ?? record);
    if (draftBase.current) draftBase.current = next; // the editor's own saves move its starting point along
  };

  const derived = useMemo(() => derive(rulesFor(record), record), [record]);
  const subLine = `${record.name} · ${record.race} ${record.class} · ${record.levels.length}. szint${isHomebrew(record) ? " · házi szabály" : ""}`;
  const setVital = (key: VitalKey, value: number) =>
    patch({ ...record, vitalsState: { ...record.vitalsState, [key]: value } });
  const setInventoryText = (text: string) => patch({ ...record, inventoryText: text });
  const setConditions = (conditions: CharacterCondition[]) => patch({ ...record, conditions });
  const setCompanions = (companions: Companion[]) => patch({ ...record, companions });
  // Unpinning the in-hand weapon also clears the selection (one atomic patch — two patches would race).
  const setWeapons = (weapons: string[]) =>
    patch({ ...record, weapons, activeWeapon: record.activeWeapon && weapons.includes(record.activeWeapon) ? record.activeWeapon : undefined });
  const setActiveWeapon = (name: string | null) => patch({ ...record, activeWeapon: name ?? undefined });
  // Picking or removing a piece also resets its worn flag — a fresh pick is equipped immediately.
  const setArmor = (name: string | null) => patch({ ...record, armor: name ?? undefined, armorActive: undefined });
  const setShield = (name: string | null) => patch({ ...record, shield: name ?? undefined, shieldActive: undefined });
  const toggleArmorWorn = () => patch({ ...record, armorActive: record.armorActive === false ? undefined : false });
  const toggleShieldWorn = () => patch({ ...record, shieldActive: record.shieldActive === false ? undefined : false });

  const isSheet = view === "sheet";
  const goComp = (tab?: number) => { setView("compendium"); if (tab != null) setCompTab(tab); setModal(null); };

  // Same modal content the compendium shows, plus a character-aware strip and (for fok skills) the
  // current fok so the modal greys out the levels the character hasn't reached yet.
  const openSkillModal = (name: string, fok: number, percent?: number | null) =>
    setModal(skillModalContent(name, { fok, percent }, isHomebrew(record)));
  const openSpellModal = (name: string, school?: string) => {
    const sp = spellModalByName(name, school);
    setModal({ kind: "spell", name, sub: sp?.sub, body: sp?.body || [] });
  };

  const backBtn = (
    // phones: sized/rounded like the zone pill and the compendium bar's icon buttons; md: original compact form
    <IconButton aria-label="Vissza a karakterekhez" title="Karakterek" size="sm" variant="outline" borderColor="hair" bg="fieldBg" color="muted"
      w={{ base: "40px", md: "32px" }} h={{ base: "40px", md: "32px" }} minW={{ base: "40px", md: "32px" }} borderRadius={{ base: "10px", md: "md" }}
      icon={<ArrowBackIcon boxSize="16px" />} onClick={onBack} flexShrink={0} _hover={{ borderColor: "accent" }} />
  );
  const zoneSwitch = (
    <ZoneSwitch active={isSheet ? "karakter" : "kompendium"} onKarakter={() => setView("sheet")} onKompendium={() => goComp()} />
  );

  return (
    <DraftContext.Provider value={draftApi}>
    <Flex direction="column" h="100%" overflow="hidden" bg="page" color="fg" fontFamily="'Crimson Pro', Georgia, serif">
      {/* Top app bar — on phones the compendium view hosts its own merged bar instead */}
      <Box display={{ base: isSheet ? "block" : "none", md: "block" }} flexShrink={0} bg="page" borderBottom="1px solid" borderColor="hair">
        <HStack px={SIDE} py={{ base: 0, md: "9px" }} h={{ base: "54px", md: "auto" }} gap={{ base: "10px", md: "14px" }} flexWrap="wrap" align="center">
          {backBtn}
          {zoneSwitch}
          {isSheet ? (
            <>
              <Text display={{ base: "none", md: "block" }} fontFamily="system-ui" fontSize="12px" color="fgFaint" whiteSpace="nowrap">{subLine}</Text>
              <Spacer />
              <HStack gap="8px">
                <ActBtn onClick={onEdit} icon={<EditIcon boxSize="14px" />} label="Szerkesztés" />
                <ActBtn onClick={onLevelup} icon={<ArrowUpIcon boxSize="16px" />} accent label="Szintlépés" />
                {/* phones: dark mode stays reachable on the roster's bar — here it just eats space */}
                <Box display={{ base: "none", md: "block" }}><DarkToggle /></Box>
              </HStack>
            </>
          ) : (
            <>
              <Spacer />
              <DarkToggle />
            </>
          )}
        </HStack>
      </Box>

      {/* Body */}
      {isSheet ? (
        <CharacterSheet
          record={record}
          derived={derived}
          onSetVital={setVital}
          onSetInventory={setInventoryText}
          onSetConditions={setConditions}
          onSetCompanions={setCompanions}
          onSetWeapons={setWeapons}
          onSetActiveWeapon={setActiveWeapon}
          onSetArmor={setArmor}
          onSetShield={setShield}
          onToggleArmorWorn={toggleArmorWorn}
          onToggleShieldWorn={toggleShieldWorn}
          onOpenSkill={(name, fok, percent) => openSkillModal(name, fok, percent)}
          onOpenSpell={(name, school) => openSpellModal(name, school)}
          onOpenWeapon={setWeaponModal}
        />
      ) : (
        <Compendium
          compTab={compTab}
          onSelectTab={setCompTab}
          onOpenModal={setModal}
          mobileLeading={<>{backBtn}{zoneSwitch}</>}
          homebrew={isHomebrew(record)}
        />
      )}

      {/* Detail modal — peek that never navigates */}
      <DetailModal modal={modal} onClose={() => setModal(null)} />

      {/* Weapon attack calculator (key forces a fresh state per weapon) */}
      {weaponModal && <WeaponModal key={`${weaponModal.kind}:${weaponModal.name}`} weapon={weaponModal} onClose={() => setWeaponModal(null)} />}
    </Flex>
    </DraftContext.Provider>
  );
};

export default AppShell;
