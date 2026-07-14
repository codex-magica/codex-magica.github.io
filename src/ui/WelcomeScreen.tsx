import React, { useMemo, useState } from "react";
import { Box, Flex, Heading, HStack, IconButton, Text } from "@chakra-ui/react";
import { ParchPanel, useParchmentHoverShadow } from "./ParchPanel";
import { ZoneBar } from "./ZoneBar";
import { CharacterRecord, VitalKey } from "../model/character";
import { RULES } from "../model/rulesDb";
import { derive } from "../engine/derive";

interface Props {
  records: CharacterRecord[];
  onOpenCharacter: (id: string) => void;
  onNew: () => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenCompendium: () => void;
}

const SIDE = { base: "20px", sm: "32px" };
const VIT: Record<string, string> = { hp: "vitHp", fp: "vitFp", mana: "vitMana", kegy: "vitKegy", pszi: "vitPszi" };
const PIP_META: [string, VitalKey, string][] = [
  ["ÉP", "Ép", "hp"], ["FP", "Fp", "fp"], ["MANA", "Mana", "mana"], ["KEGY", "Kegy", "kegy"], ["PSZI", "Psi", "pszi"],
];

interface CardView { id: string; name: string; line: string; level: number; pips: { k: string; cur: number; max: number; kind: string }[] }

const PlusIcon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
const KebabIcon = <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>;
const PencilIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
const RenameIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M4 13.5V18a1 1 0 0 0 1 1h4.5L18 10.5a2.12 2.12 0 0 0-3-3z" /></svg>;
const CopyIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>;
const TrashIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>;
const ImportIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>;
const LogoutIcon = <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;

// Sign out: clear the id_token cookie (same attributes callback.html sets it with) and return to
// the root. With no cookie, the CloudFront edge gate redirects to the branded login page.
// The unique query string is a cache-buster: without it the browser can serve "/" from its cache
// without a network request, so the edge auth check is skipped and the redirect to login only
// happens on a later manual reload.
const logout = () => {
  document.cookie = "id_token=; Path=/; Secure; SameSite=Lax; Max-Age=0";
  window.location.replace(window.location.origin + "/?loggedout=" + Date.now());
};

const MenuItem: React.FC<{ icon: React.ReactNode; onClick: () => void; danger?: boolean; children: React.ReactNode }> = ({ icon, onClick, danger, children }) => (
  <Box as="button" type="button" onClick={onClick} display="flex" alignItems="center" gap="11px" w="100%" textAlign="left" px="13px" py="11px" borderRadius="9px" border="none" bg="transparent" color={danger ? "bad" : "fg"} fontWeight={600} fontSize="15px" _hover={{ bg: danger ? "badSoft" : "accentSoft" }}>
    {icon}{children}
  </Box>
);

export const WelcomeScreen: React.FC<Props> = ({ records, onOpenCharacter, onNew, onEdit, onDuplicate, onDelete, onOpenCompendium }) => {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const hoverShadow = useParchmentHoverShadow();

  const views: CardView[] = useMemo(
    () =>
      records.map((r) => {
        const d = derive(RULES, r);
        const specs = Object.values(r.selections).filter(Boolean).join(" · ");
        const pips = PIP_META.filter(([, key]) => d.vitals[key].max > 0)
          .map(([k, key, kind]) => ({ k, cur: d.vitals[key].current, max: d.vitals[key].max, kind }))
          .slice(0, 4);
        return { id: r.id, name: r.name, line: `${r.race} · ${r.class}${specs ? ` · ${specs}` : ""}`, level: r.levels.length, pips };
      }),
    [records]
  );
  const menuView = views.find((v) => v.id === menuId);

  return (
    <Flex direction="column" h="100vh" sx={{ "@supports (height: 100dvh)": { height: "100dvh" } }} overflow="hidden" bg="page" color="fg" fontFamily="Warnock, serif">
      <ZoneBar
        active="karakter"
        onKarakter={() => {}}
        onKompendium={onOpenCompendium}
        right={
          <IconButton
            aria-label="Kijelentkezés"
            title="Kijelentkezés"
            size="sm"
            variant="ghost"
            color="muted"
            icon={LogoutIcon}
            onClick={() => setConfirmLogout(true)}
          />
        }
      />
      <Box flex="1 1 auto" overflowY="auto" position="relative">
      <Box maxW="1080px" mx="auto" px={SIDE} pt={{ base: "32px", md: "30px" }} pb="90px">
        <Box textAlign="center" mb={{ base: "44px", md: "36px" }}>
          <Text fontFamily="system-ui" fontSize="11px" fontWeight={700} letterSpacing=".34em" textTransform="uppercase" color="accentTx" mb="14px">M · A · G · U · S</Text>
          <Heading as="h1" fontSize={{ base: "38px", sm: "52px", md: "44px" }} fontWeight={700} color="fg" lineHeight="1.04">Karakterek</Heading>
          <Text fontFamily="system-ui" fontSize={{ base: "15.5px", md: "14.5px" }} lineHeight="1.55" color="muted" maxW="46ch" mx="auto" mt="11px">
            Válassz egy hőst a folytatáshoz, vagy teremts újat. A karaktereid helyben, ezen az eszközön tárolódnak.
          </Text>
        </Box>

        <HStack align="baseline" justify="space-between" gap="14px" mb="13px" px="2px">
          <Heading as="h2" fontFamily="system-ui" fontSize="11.5px" fontWeight={700} letterSpacing=".13em" textTransform="uppercase" color="fgFaint">
            Mentett karakterek <Text as="span" color="muted">· {records.length}</Text>
          </Heading>
          <Box as="button" type="button" onClick={onNew} display="inline-flex" alignItems="center" gap="7px" px="13px" py="7px" borderRadius="9px" border="1px solid" borderColor="accent" bg="accentSoft" color="accentTx" fontWeight={700} fontSize="13.5px" whiteSpace="nowrap">
            {PlusIcon}Új karakter
          </Box>
        </HStack>

        <Box display="grid" gridTemplateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(auto-fill, minmax(300px, 1fr))" }} gap={{ base: "14px", sm: "20px", md: "16px" }}>
          {views.map((c) => (
            <ParchPanel key={c.id} as="button" onClick={() => onOpenCharacter(c.id)} display="flex" flexDirection="column" textAlign="left" cursor="pointer" w="100%" transition="box-shadow .16s, border-color .16s" _hover={{ borderColor: "accentBd", boxShadow: hoverShadow }}>
              <HStack align="flex-start" justify="space-between" gap="10px">
                <Box minW={0} textAlign="left">
                  <Text fontSize={{ base: "23px", md: "20px" }} fontWeight={700} color="fg" lineHeight="1.12" noOfLines={2}>{c.name}</Text>
                  <Text fontFamily="system-ui" fontSize="12.5px" color="muted" mt="3px">{c.line}</Text>
                </Box>
                <Box flexShrink={0} display="inline-flex" flexDirection="column" alignItems="center" justifyContent="center" w="46px" h="46px" borderRadius="11px" bg="accentSoft" border="1px solid" borderColor="accentBd">
                  <Text fontFamily="system-ui" fontSize="8.5px" fontWeight={700} letterSpacing=".08em" textTransform="uppercase" color="accentTx" lineHeight="1">Szint</Text>
                  <Text fontWeight={700} fontSize="19px" color="accentTx" lineHeight="1.1" sx={{ fontVariantNumeric: "tabular-nums" }}>{c.level}</Text>
                </Box>
              </HStack>

              <Box h="1px" bg="rule" my="13px" />

              <HStack gap="7px" mb="3px" align="stretch">
                {c.pips.map((p) => {
                  const pct = p.max > 0 ? Math.max(4, Math.min(100, (p.cur / p.max) * 100)) : 0;
                  return (
                    <Box key={p.k} flex="1 1 0" minW={0}>
                      <HStack justify="space-between" align="baseline" gap="4px" mb="4px">
                        <Text fontFamily="system-ui" fontSize="9px" fontWeight={700} letterSpacing=".04em" color="fgFaint">{p.k}</Text>
                        <Text fontFamily="system-ui" fontSize="10.5px" fontWeight={600} color="muted" sx={{ fontVariantNumeric: "tabular-nums" }}>{p.cur}/{p.max}</Text>
                      </HStack>
                      <Box h="4px" borderRadius="3px" bg="vitTrack" overflow="hidden"><Box h="100%" w={`${pct}%`} bg={VIT[p.kind]} borderRadius="3px" /></Box>
                    </Box>
                  );
                })}
              </HStack>

              <HStack justify="flex-end" mt="11px">
                <Box as="span" role="button" tabIndex={0} onClick={(e: React.MouseEvent) => { e.stopPropagation(); setMenuId(c.id); }} title="További műveletek" display="inline-flex" alignItems="center" justifyContent="center" w="30px" h="30px" mr="-5px" borderRadius="8px" color="fgFaint" cursor="pointer" _hover={{ bg: "accentSoft", color: "fg" }}>
                  {KebabIcon}
                </Box>
              </HStack>
            </ParchPanel>
          ))}
        </Box>

        {views.length === 0 && (
          <Text textAlign="center" fontFamily="system-ui" fontSize="13.5px" color="fgFaint" mt="40px">
            Még nincs mentett karakter. Kezdd az „Új karakter” gombbal.
          </Text>
        )}

        <HStack justify="center" gap="18px" mt="30px" fontFamily="system-ui" fontSize="12px" color="fgFaint">
          <Box as="button" type="button" display="inline-flex" alignItems="center" gap="6px" color="muted" fontSize="12px">{ImportIcon}Karakter importálása</Box>
          <Text as="span" opacity={0.5}>·</Text>
          <Text as="span">{records.length} / 12 hely felhasználva</Text>
        </HStack>
      </Box>
      </Box>

      {menuView && (
        <Flex position="fixed" inset={0} zIndex={40} bg="rgba(16,14,24,.5)" align="center" justify="center" p="28px" onClick={() => setMenuId(null)}>
          <ParchPanel onClick={(e: React.MouseEvent) => e.stopPropagation()} borderRadius="12px" p={0} w="min(340px, 100%)" overflow="hidden" style={{ boxShadow: "0 22px 60px rgba(0,0,0,.4)" }}>
            <Box px="22px" pt="18px" pb="14px" borderBottom="1px solid" borderColor="rule" textAlign="center">
              <Text fontSize="20px" fontWeight={700} color="fg">{menuView.name}</Text>
              <Text fontFamily="system-ui" fontSize="12px" color="muted" mt="2px">{menuView.line} · {menuView.level}. szint</Text>
            </Box>
            <Box p="8px">
              <MenuItem icon={PencilIcon} onClick={() => { const i = menuView.id; setMenuId(null); onEdit(i); }}>Szerkesztés</MenuItem>
              <MenuItem icon={RenameIcon} onClick={() => setMenuId(null)}>Átnevezés</MenuItem>
              <MenuItem icon={CopyIcon} onClick={() => { const i = menuView.id; setMenuId(null); onDuplicate(i); }}>Másolat készítése</MenuItem>
              <Box h="1px" bg="rule" mx="10px" my="6px" />
              <MenuItem icon={TrashIcon} onClick={() => { const i = menuView.id; setMenuId(null); onDelete(i); }} danger>Törlés</MenuItem>
            </Box>
          </ParchPanel>
        </Flex>
      )}

      {confirmLogout && (
        <Flex position="fixed" inset={0} zIndex={50} bg="rgba(16,14,24,.5)" align="center" justify="center" p="28px" onClick={() => setConfirmLogout(false)}>
          <ParchPanel onClick={(e: React.MouseEvent) => e.stopPropagation()} borderRadius="12px" p="24px" w="min(360px, 100%)" style={{ boxShadow: "0 22px 60px rgba(0,0,0,.4)" }}>
            <Text fontSize="20px" fontWeight={700} color="fg" textAlign="center">Kijelentkezés</Text>
            <Text fontFamily="system-ui" fontSize="14px" color="muted" mt="8px" mb="22px" textAlign="center">Biztosan ki szeretnél jelentkezni?</Text>
            <HStack gap="10px">
              <Box as="button" type="button" onClick={() => setConfirmLogout(false)} flex="1 1 0" px="16px" py="10px" borderRadius="9px" border="1px solid" borderColor="rule" bg="transparent" color="fg" fontWeight={600} fontSize="14px" _hover={{ bg: "accentSoft" }}>
                Mégse
              </Box>
              <Box as="button" type="button" onClick={logout} flex="1 1 0" px="16px" py="10px" borderRadius="9px" border="1px solid" borderColor="bad" bg="badSoft" color="bad" fontWeight={700} fontSize="14px" _hover={{ bg: "bad", color: "accentFg" }}>
                Kijelentkezés
              </Box>
            </HStack>
          </ParchPanel>
        </Flex>
      )}
    </Flex>
  );
};
