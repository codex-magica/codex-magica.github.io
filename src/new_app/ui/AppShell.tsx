import React, { useMemo, useState } from "react";
import { Box, Flex, HStack, IconButton, Spacer, Text, useColorMode } from "@chakra-ui/react";
import { EditIcon, ArrowUpIcon, ArrowBackIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import { CharacterSheet } from "./CharacterSheet";
import { Compendium } from "./Compendium";
import { DetailModal, ModalState } from "./DetailModal";
import { WeaponModal, WeaponModalState } from "./WeaponModal";
import { compNames, skillBody, spellBody } from "./sampleData";
import { CharacterRecord, VitalKey } from "../model/character";
import { RULES } from "../model/rulesDb";
import { derive } from "../engine/derive";

interface AppShellProps {
  record: CharacterRecord;
  onBack: () => void; // back to the roster
  onEdit: () => void; // open the full-screen creator in edit mode
  onLevelup: () => void; // open it in level-up mode
  onPatchRecord: (record: CharacterRecord) => void; // persist play-state edits (vitals…)
}

const SIDE = { base: "20px", md: "16px" };

const ZoneBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <Box as="button" type="button" onClick={onClick} px="15px" py="7px" borderRadius="8px" fontWeight={700} fontSize="14px" whiteSpace="nowrap"
    bg={active ? "accentSoft" : "transparent"} color={active ? "accentTx" : "muted"} transition="background .12s, color .12s">
    {children}
  </Box>
);

const PillBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <Box as="button" type="button" onClick={onClick} px="13px" py="6px" borderRadius="8px" fontWeight={600} fontSize="13.5px" whiteSpace="nowrap"
    bg={active ? "accentSoft" : "transparent"} color={active ? "accentTx" : "muted"} transition="background .12s, color .12s">
    {children}
  </Box>
);

const ActBtn: React.FC<{ onClick: () => void; icon: React.ReactNode; accent?: boolean; children: React.ReactNode }> = ({ onClick, icon, accent, children }) => (
  <Box as="button" type="button" onClick={onClick} display="inline-flex" alignItems="center" gap="7px" px="13px" py="8px" borderRadius="9px"
    border="1px solid" borderColor="fieldBd" bg="transparent" color={accent ? "accentTx" : "fg"} fontWeight={600} fontSize="14px" whiteSpace="nowrap">
    {icon}{children}
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

  const isSheet = view === "sheet";
  const goComp = (tab?: number) => { setView("compendium"); if (tab != null) setCompTab(tab); setModal(null); };

  const openSkillModal = (name: string, sub: string, level: number) =>
    setModal({ kind: "skill", name, sub, levelStrip: level > 0 ? `A te fokod: ${level}. fok` : undefined, body: skillBody(name), compLink: level > 0 });
  const openSpellModal = (name: string, school: string, mana: number | null, time: string) =>
    setModal({ kind: "spell", name, sub: `Bárdmágia · ${school}`, levelStrip: mana != null ? `Mana: ${mana} Mp · Időigény: ${time}` : undefined, body: spellBody(name), compLink: mana != null });

  const darkToggle = (
    <IconButton aria-label="Sötét mód váltása" size="sm" variant="ghost" color="muted" icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />} onClick={toggleColorMode} />
  );

  return (
    <Flex direction="column" h="100vh" overflow="hidden" bg="page" color="fg" fontFamily="Warnock, serif">
      {/* Top app bar */}
      <Box flexShrink={0} bg="page" borderBottom="1px solid" borderColor="hair">
        <HStack px={SIDE} py="9px" gap="14px" flexWrap="wrap" align="center">
          <IconButton aria-label="Vissza a karakterekhez" title="Karakterek" size="sm" variant="outline" borderColor="hair" bg="fieldBg" color="muted" icon={<ArrowBackIcon boxSize="16px" />} onClick={onBack} flexShrink={0} _hover={{ borderColor: "accent" }} />
          <HStack gap="3px" bg="fieldBg" border="1px solid" borderColor="hair" borderRadius="10px" p="3px" flexShrink={0}>
            <ZoneBtn active={isSheet} onClick={() => setView("sheet")}>Karakter</ZoneBtn>
            <ZoneBtn active={!isSheet} onClick={() => goComp()}>Kompendium</ZoneBtn>
          </HStack>
          {isSheet ? (
            <>
              <Text fontFamily="system-ui" fontSize="12px" color="fgFaint" whiteSpace="nowrap">{subLine}</Text>
              <Spacer />
              <HStack gap="8px">
                <ActBtn onClick={onEdit} icon={<EditIcon boxSize="14px" />}>Szerkesztés</ActBtn>
                <ActBtn onClick={onLevelup} icon={<ArrowUpIcon boxSize="16px" />} accent>Szintlépés</ActBtn>
                {darkToggle}
              </HStack>
            </>
          ) : (
            <>
              <Box flex="1 1 auto" display="flex" justifyContent="center">
                <HStack flexWrap="wrap" justify="center" gap="3px" bg="fieldBg" border="1px solid" borderColor="hair" borderRadius="11px" p="4px">
                  {compNames.map((n, i) => (
                    <PillBtn key={n} active={i === compTab} onClick={() => setCompTab(i)}>{n}</PillBtn>
                  ))}
                </HStack>
              </Box>
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
          onOpenSkill={(name, level) => openSkillModal(name, "", level)}
          onOpenSpell={(name, school, mana, time) => openSpellModal(name, school, mana, time)}
          onOpenWeapon={setWeaponModal}
        />
      ) : (
        <Compendium compTab={compTab} onOpenModal={setModal} />
      )}

      {/* Detail modal — peek that never navigates */}
      <DetailModal modal={modal} onClose={() => setModal(null)} onOpenComp={() => { goComp(modal?.kind === "spell" ? 1 : 0); }} />

      {/* Weapon attack calculator (key forces a fresh state per weapon) */}
      {weaponModal && <WeaponModal key={`${weaponModal.kind}:${weaponModal.name}`} weapon={weaponModal} onClose={() => setWeaponModal(null)} />}
    </Flex>
  );
};

export default AppShell;
