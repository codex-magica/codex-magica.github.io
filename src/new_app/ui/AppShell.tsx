import React, { useMemo, useState } from "react";
import { Box, Flex, HStack, IconButton, Spacer, Text, useColorMode } from "@chakra-ui/react";
import { EditIcon, ArrowUpIcon, ArrowBackIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import { CharacterSheet } from "./CharacterSheet";
import { Compendium } from "./Compendium";
import { DetailModal, ModalState } from "./DetailModal";
import { WeaponModal, WeaponModalState } from "./WeaponModal";
import { skillModalBody, skillModalSub, spellModalByName } from "./compendiumData";
import { CharacterRecord, VitalKey } from "../model/character";
import { RULES } from "../model/rulesDb";
import { derive } from "../engine/derive";
import { ZoneBtn } from "./controls";

interface AppShellProps {
  record: CharacterRecord;
  onBack: () => void; // back to the roster
  onEdit: () => void; // open the full-screen creator in edit mode
  onLevelup: () => void; // open it in level-up mode
  onPatchRecord: (record: CharacterRecord) => void; // persist play-state edits (vitals…)
}

const SIDE = { base: "20px", md: "16px" };

// action button: full label on md+, icon-only on phones (the title carries the label)
const ActBtn: React.FC<{ onClick: () => void; icon: React.ReactNode; accent?: boolean; label: string }> = ({ onClick, icon, accent, label }) => (
  <Box as="button" type="button" onClick={onClick} title={label} aria-label={label} display="inline-flex" alignItems="center" justifyContent="center" gap="7px"
    px={{ base: "10px", md: "13px" }} py="8px" minH="36px" borderRadius="9px"
    border="1px solid" borderColor="fieldBd" bg="transparent" color={accent ? "accentTx" : "fg"} fontWeight={600} fontSize="14px" whiteSpace="nowrap">
    {icon}<Box as="span" display={{ base: "none", md: "inline" }}>{label}</Box>
  </Box>
);

export const AppShell: React.FC<AppShellProps> = ({ record, onBack, onEdit, onLevelup, onPatchRecord }) => {
  const [view, setView] = useState<"sheet" | "compendium">("sheet");
  const [compTab, setCompTab] = useState(0);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [weaponModal, setWeaponModal] = useState<WeaponModalState | null>(null);
  const { colorMode, toggleColorMode } = useColorMode();

  const derived = useMemo(() => derive(RULES, record), [record]);
  const subLine = `${record.name} · ${record.race} ${record.class} · ${record.levels.length}. szint`;
  const setVital = (key: VitalKey, value: number) =>
    onPatchRecord({ ...record, vitalsState: { ...record.vitalsState, [key]: value } });
  const setInventoryText = (text: string) => onPatchRecord({ ...record, inventoryText: text });

  const isSheet = view === "sheet";
  const goComp = (tab?: number) => { setView("compendium"); if (tab != null) setCompTab(tab); setModal(null); };

  // Same modal content the compendium shows, plus a character-aware strip and (for fok skills) the
  // current fok so the modal greys out the levels the character hasn't reached yet.
  const openSkillModal = (name: string, fok: number, percent?: number | null) =>
    setModal({
      kind: "skill", name, sub: skillModalSub(name), body: skillModalBody(name),
      levelStrip: percent != null ? `A te értéked: ${percent}%` : fok > 0 ? `A te fokod: ${fok}. fok` : undefined,
      currentFok: percent == null && fok > 0 ? fok : undefined,
    });
  const openSpellModal = (name: string) => {
    const sp = spellModalByName(name);
    setModal({ kind: "spell", name, sub: sp?.sub, body: sp?.body || [] });
  };

  const darkToggle = (
    <IconButton aria-label="Sötét mód váltása" size="sm" variant="ghost" color="muted" icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />} onClick={toggleColorMode} />
  );

  return (
    <Flex direction="column" h="100vh" sx={{ "@supports (height: 100dvh)": { height: "100dvh" } }} overflow="hidden" bg="page" color="fg" fontFamily="Warnock, serif">
      {/* Top app bar */}
      <Box flexShrink={0} bg="page" borderBottom="1px solid" borderColor="hair">
        <HStack px={SIDE} py="9px" gap={{ base: "10px", md: "14px" }} flexWrap="wrap" align="center">
          <IconButton aria-label="Vissza a karakterekhez" title="Karakterek" size="sm" variant="outline" borderColor="hair" bg="fieldBg" color="muted" icon={<ArrowBackIcon boxSize="16px" />} onClick={onBack} flexShrink={0} _hover={{ borderColor: "accent" }} />
          <HStack gap="3px" bg="fieldBg" border="1px solid" borderColor="hair" borderRadius="10px" p="3px" flexShrink={0}>
            <ZoneBtn kind="karakter" active={isSheet} onClick={() => setView("sheet")}>Karakter</ZoneBtn>
            <ZoneBtn kind="kompendium" active={!isSheet} onClick={() => goComp()}>Kompendium</ZoneBtn>
          </HStack>
          {isSheet ? (
            <>
              <Text display={{ base: "none", md: "block" }} fontFamily="system-ui" fontSize="12px" color="fgFaint" whiteSpace="nowrap">{subLine}</Text>
              <Spacer />
              <HStack gap="8px">
                <ActBtn onClick={onEdit} icon={<EditIcon boxSize="14px" />} label="Szerkesztés" />
                <ActBtn onClick={onLevelup} icon={<ArrowUpIcon boxSize="16px" />} accent label="Szintlépés" />
                {darkToggle}
              </HStack>
            </>
          ) : (
            <>
              <Spacer />
              {darkToggle}
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
          onOpenSkill={(name, fok, percent) => openSkillModal(name, fok, percent)}
          onOpenSpell={(name) => openSpellModal(name)}
          onOpenWeapon={setWeaponModal}
        />
      ) : (
        <Compendium compTab={compTab} onSelectTab={setCompTab} onOpenModal={setModal} />
      )}

      {/* Detail modal — peek that never navigates */}
      <DetailModal modal={modal} onClose={() => setModal(null)} />

      {/* Weapon attack calculator (key forces a fresh state per weapon) */}
      {weaponModal && <WeaponModal key={`${weaponModal.kind}:${weaponModal.name}`} weapon={weaponModal} onClose={() => setWeaponModal(null)} />}
    </Flex>
  );
};

export default AppShell;
