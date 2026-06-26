import React, { useState } from "react";
import { Box, Flex, Heading, HStack, IconButton, Spacer, Text, useColorMode } from "@chakra-ui/react";
import { EditIcon, ArrowUpIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import { CharacterSheet } from "./CharacterSheet";
import { Compendium } from "./Compendium";
import { CharacterBuilder } from "./CharacterBuilder";
import { DetailModal, ModalState } from "./DetailModal";
import { WeaponModal, WeaponModalState } from "./WeaponModal";
import { identity, compNames, skillBody, spellBody } from "./sampleData";

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

export const AppShell: React.FC = () => {
  const [view, setView] = useState<"sheet" | "compendium">("sheet");
  const [compTab, setCompTab] = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [weaponModal, setWeaponModal] = useState<WeaponModalState | null>(null);
  const { colorMode, toggleColorMode } = useColorMode();

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
          <HStack gap="3px" bg="fieldBg" border="1px solid" borderColor="hair" borderRadius="10px" p="3px" flexShrink={0}>
            <ZoneBtn active={isSheet} onClick={() => setView("sheet")}>Karakter</ZoneBtn>
            <ZoneBtn active={!isSheet} onClick={() => goComp()}>Kompendium</ZoneBtn>
          </HStack>
          {isSheet ? (
            <>
              <Text fontFamily="system-ui" fontSize="12px" color="fgFaint" whiteSpace="nowrap">{identity.name} · {identity.subLine}</Text>
              <Spacer />
              <HStack gap="8px">
                <ActBtn onClick={() => setCreatorOpen(true)} icon={<EditIcon boxSize="14px" />}>Szerkesztés</ActBtn>
                <ActBtn onClick={() => setCreatorOpen(true)} icon={<ArrowUpIcon boxSize="16px" />} accent>Szintlépés</ActBtn>
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
          onOpenSkill={(name, level) => openSkillModal(name, "", level)}
          onOpenSpell={(name, school, mana, time) => openSpellModal(name, school, mana, time)}
          onOpenWeapon={setWeaponModal}
        />
      ) : (
        <Compendium
          compTab={compTab}
          onOpenSkill={(name, sub) => openSkillModal(name, sub, 0)}
          onOpenSpell={(name, school, time) => openSpellModal(name, school, null, time)}
          onOpenWeapon={setWeaponModal}
        />
      )}

      {/* Creator drawer (Szerkesztés / Szintlépés) */}
      {creatorOpen && (
        <Box position="fixed" inset={0} zIndex={50} bg="rgba(16,14,24,.5)" display="flex" justifyContent="flex-end" onClick={() => setCreatorOpen(false)}>
          <Flex direction="column" onClick={(e: React.MouseEvent) => e.stopPropagation()} w="min(760px, 100%)" h="100%" bg="page" boxShadow="-8px 0 44px rgba(0,0,0,.42)" overflow="hidden">
            <HStack flexShrink={0} justify="space-between" gap="12px" px="18px" py="11px" borderBottom="1px solid" borderColor="hair">
              <HStack gap="9px" minW={0}>
                <Heading fontSize={{ base: "21px", md: "18px" }} fontWeight={700} color="fg">Karakteralkotó</Heading>
                <Text fontFamily="system-ui" fontSize="11.5px" color="fgFaint" noOfLines={1}>Karakter szerkesztése</Text>
              </HStack>
              <Box as="button" type="button" onClick={() => setCreatorOpen(false)} display="inline-flex" alignItems="center" gap="7px" px="14px" py="7px" borderRadius="9px" border="1px solid" borderColor="accent" bg="accent" color="white" fontWeight={700} fontSize="14px" flexShrink={0}>
                Kész
              </Box>
            </HStack>
            <Box flex="1 1 auto" minH={0} overflowY="auto">
              <CharacterBuilder />
            </Box>
          </Flex>
        </Box>
      )}

      {/* Detail modal — peek that never navigates */}
      <DetailModal modal={modal} onClose={() => setModal(null)} onOpenComp={() => { goComp(modal?.kind === "spell" ? 1 : 0); }} />

      {/* Weapon attack calculator (key forces a fresh state per weapon) */}
      {weaponModal && <WeaponModal key={`${weaponModal.kind}:${weaponModal.name}`} weapon={weaponModal} onClose={() => setWeaponModal(null)} />}
    </Flex>
  );
};

export default AppShell;
