import React, { useMemo, useRef, useState } from "react";
import { Box, Flex, Heading, HStack, Input, Text } from "@chakra-ui/react";
import { ParchPanel, useParchmentHoverShadow } from "./ParchPanel";
import { ConfirmModal } from "./ConfirmModal";
import { ModalShell } from "./Modal";
import { QuietPopover } from "./QuietPopover";
import { useIsDesktop } from "./useIsDesktop";
import { ZoneBar } from "./ZoneBar";
import { FIELD_SX } from "./tokens";
import { CharacterRecord, VitalKey } from "../model/character";
import { rulesFor } from "../model/rulesVariants";
import { derive } from "../engine/derive";
import { exportBackupFile, exportRecordFile, loadLastBackupAt, parseImportFile } from "../state/transfer";
import { rosterStore } from "../state/rosterStore";
import { unreadableKeys } from "../state/storage";
import { DriveSyncApi } from "../state/useDriveSync";
import { CloudIcon, DriveSyncModal, driveStatusLine } from "./DriveSyncModal";

interface Props {
  records: CharacterRecord[];
  onOpenCharacter: (id: string) => void;
  onNew: () => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onImport: (records: CharacterRecord[]) => void;
  onRename: (id: string, name: string) => void;
  onOpenCompendium: () => void;
  onOpenCredits: () => void;
  drive: DriveSyncApi;
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
const ExportIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 8l5-5 5 5" /><path d="M12 3v12" /></svg>;
const BackupIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 8l5-5 5 5" /><path d="M12 3v12" /></svg>;

const DAY_MS = 24 * 3600 * 1000;
const BACKUP_STALE_DAYS = 14;
const daysAgo = (ts: number, now: number): string => {
  const d = Math.floor((now - ts) / DAY_MS);
  return d <= 0 ? "ma" : d === 1 ? "tegnap" : `${d} napja`;
};

const MenuItem: React.FC<{ icon: React.ReactNode; onClick: () => void; danger?: boolean; children: React.ReactNode }> = ({ icon, onClick, danger, children }) => (
  <Box as="button" type="button" onClick={onClick} display="flex" alignItems="center" gap="11px" w="100%" textAlign="left" px="13px" py="11px" borderRadius="9px" border="none" bg="transparent" color={danger ? "bad" : "fg"} fontWeight={600} fontSize="15px" _hover={{ bg: danger ? "badSoft" : "accentSoft" }}>
    {icon}{children}
  </Box>
);

export const WelcomeScreen: React.FC<Props> = ({ records, onOpenCharacter, onNew, onEdit, onDuplicate, onDelete, onImport, onRename, onOpenCompendium, onOpenCredits, drive }) => {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importInfo, setImportInfo] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(() => loadLastBackupAt());
  const [driveOpen, setDriveOpen] = useState(false);
  // saved data the app couldn't read at some point, kept aside (see storage.ts): offer it, never drop it
  const [aside, setAside] = useState(() => unreadableKeys());
  const [asideSaved, setAsideSaved] = useState(false);
  const saveAside = () => {
    setAsideSaved(true);
    for (const k of aside) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([localStorage.getItem(k) ?? ""], { type: "application/json" }));
      a.download = `codex-magica-serult-mentes-${k.split(".").pop()}.json`;
      a.click();
    }
  };
  const dropAside = () => {
    for (const k of aside) localStorage.removeItem(k);
    setAside([]);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hoverShadow = useParchmentHoverShadow();
  const [now] = useState(() => Date.now()); // render must stay pure: read the clock once per visit
  // with Google Drive sync on, the characters are not "only in this browser" any more
  const backupStale = !drive.enabled && (lastBackupAt === null || now - lastBackupAt > BACKUP_STALE_DAYS * DAY_MS);
  const driveLine = driveStatusLine(drive, now);

  const handleImportFile = (file: File | undefined) => {
    if (!file) return;
    const invalidFile = () => {
      setImportInfo(null);
      setImportError("Érvénytelen fájl — az alkalmazásból exportált karakter- vagy mentésfájl (.json) kell.");
    };
    if (file.size > 20 * 1024 * 1024) return invalidFile(); // far beyond any real roster
    void file.text().then((text) => {
      const result = parseImportFile(text, rosterStore().getState().records);
      if (!result) return invalidFile();
      setImportError(null);
      onImport(result.add);
      const damaged = result.invalid > 0 ? ` ${result.invalid} sérült bejegyzést kihagytunk.` : "";
      if (result.kind === "backup") {
        if (result.add.length > 0) setImportInfo(`${result.add.length} karakter visszaállítva${result.skipped > 0 ? `, ${result.skipped} már megvolt` : ""}.${damaged}`);
        else if (result.skipped > 0) setImportInfo(`Nincs új karakter a mentésben: ${result.skipped === 1 ? "a benne lévő karakter" : `mind a ${result.skipped}`} megvolt már.${damaged}`);
        else setImportInfo(`A mentésben nem volt visszaállítható karakter.${damaged}`);
      } else {
        setImportInfo(null);
      }
    }, invalidFile);
  };

  const handleBackup = () => {
    void exportBackupFile(records).then((saved) => {
      if (saved) setLastBackupAt(loadLastBackupAt());
    });
  };


  const views: CardView[] = useMemo(
    () =>
      records.map((r) => {
        const specs = Object.values(r.selections ?? {}).filter(Boolean).join(" · ");
        let pips: CardView["pips"] = [];
        try {
          const d = derive(rulesFor(r), r);
          pips = PIP_META.filter(([, key]) => d.vitals[key].max > 0)
            .map(([k, key, kind]) => ({ k, cur: d.vitals[key].current, max: d.vitals[key].max, kind }))
            .slice(0, 4);
        } catch {
          /* one character the rules engine can't handle must never take the roster down with it */
        }
        return { id: r.id, name: r.name, line: `${r.race} · ${r.class}${specs ? ` · ${specs}` : ""}`, level: r.levels.length, pips };
      }),
    [records]
  );
  const menuView = views.find((v) => v.id === menuId);
  const deleteView = views.find((v) => v.id === confirmDeleteId);
  // Desktop: the card menu is a quiet popover anchored at the kebab; phones keep the centred sheet.
  const menuAsPopover = useIsDesktop();

  const menuActions = (v: CardView) => (
    <>
      <MenuItem icon={PencilIcon} onClick={() => { setMenuId(null); onEdit(v.id); }}>Szerkesztés</MenuItem>
      <MenuItem icon={RenameIcon} onClick={() => { setMenuId(null); setRenameValue(v.name); setRenameId(v.id); }}>Átnevezés</MenuItem>
      <MenuItem icon={CopyIcon} onClick={() => { setMenuId(null); onDuplicate(v.id); }}>Másolat készítése</MenuItem>
      <MenuItem icon={ExportIcon} onClick={() => { const r = records.find((x) => x.id === v.id); setMenuId(null); if (r) void exportRecordFile(r); }}>Exportálás fájlba</MenuItem>
      <Box h="1px" bg="rule" mx="10px" my="6px" />
      <MenuItem icon={TrashIcon} onClick={() => { setMenuId(null); setConfirmDeleteId(v.id); }} danger>Törlés</MenuItem>
    </>
  );

  return (
    <Flex direction="column" h="100%" overflow="hidden" bg="page" color="fg" fontFamily="'Crimson Pro', Georgia, serif">
      <ZoneBar
        active="karakter"
        onKarakter={() => {}}
        onKompendium={onOpenCompendium}
      />
      <Box flex="1 1 auto" overflowY="auto" position="relative">
      <Box maxW="1080px" mx="auto" px={SIDE} pt={{ base: "32px", md: "30px" }} pb="90px">
        <Box textAlign="center" mb={{ base: "44px", md: "36px" }}>
          <Text fontFamily="system-ui" fontSize="11px" fontWeight={700} letterSpacing=".34em" textTransform="uppercase" color="accentTx" mb="14px">M · A · G · U · S</Text>
          <Heading as="h1" fontSize={{ base: "38px", sm: "52px", md: "44px" }} fontWeight={700} color="fg" lineHeight="1.04">Karakterek</Heading>
          <Text fontFamily="system-ui" fontSize={{ base: "15.5px", md: "14.5px" }} lineHeight="1.55" color="muted" maxW="46ch" mx="auto" mt="11px">
            Válassz egy hőst a folytatáshoz, vagy teremts újat.{" "}
            {drive.enabled
              ? "A karaktereid ezen az eszközön tárolódnak, és a Google Drive-oddal is szinkronizálódnak."
              : "A karaktereid ezen az eszközön, a böngészőben tárolódnak."}
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
            <Box key={c.id} position="relative">
            <ParchPanel as="button" onClick={() => onOpenCharacter(c.id)} display="flex" flexDirection="column" textAlign="left" cursor="pointer" w="100%" h="100%" transition="box-shadow .16s, border-color .16s" _hover={{ borderColor: "accentBd", boxShadow: hoverShadow }}>
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
            {menuAsPopover && menuId === c.id && (
              <QuietPopover onClose={() => setMenuId(null)} minW="228px" p="8px">
                {menuActions(c)}
              </QuietPopover>
            )}
            </Box>
          ))}
        </Box>

        {views.length === 0 && (
          <Text textAlign="center" fontFamily="system-ui" fontSize="13.5px" color="fgFaint" mt="40px">
            Még nincs mentett karakter. Kezdd az „Új karakter” gombbal.
          </Text>
        )}

        <HStack justify="center" columnGap="18px" rowGap="8px" mt="30px" fontFamily="system-ui" fontSize="12px" color="fgFaint" flexWrap="wrap">
          {records.length > 0 && (
            <>
              <Box as="button" type="button" onClick={handleBackup} display="inline-flex" alignItems="center" gap="6px" color="muted" fontSize="12px">{BackupIcon}Biztonsági mentés</Box>
              <Text as="span" opacity={0.5} display={{ base: "none", sm: "inline" }} aria-hidden="true">·</Text>
            </>
          )}
          <Box as="button" type="button" onClick={() => fileInputRef.current?.click()} display="inline-flex" alignItems="center" gap="6px" color="muted" fontSize="12px">{ImportIcon}Importálás fájlból</Box>
          {drive.available && (
            <>
              <Text as="span" opacity={0.5} display={{ base: "none", sm: "inline" }} aria-hidden="true">·</Text>
              <Box as="button" type="button" onClick={() => setDriveOpen(true)} display="inline-flex" alignItems="center" gap="6px" fontSize="12px"
                color={drive.status === "needsTap" || drive.status === "error" ? "accentTx" : "muted"} fontWeight={drive.status === "needsTap" ? 700 : undefined}>
                {CloudIcon}Google Drive
                {drive.pending.count > 0 && drive.status !== "syncing" && (
                  <Box as="span" role="img" aria-label={`${drive.pending.count} módosítás vár szinkronra`} w="7px" h="7px" borderRadius="50%" bg="accent" ml="-1px" />
                )}
              </Box>
            </>
          )}
          <Text as="span" opacity={0.5} display={{ base: "none", sm: "inline" }} aria-hidden="true">·</Text>
          <Box as="button" type="button" onClick={onOpenCredits} color="muted" fontSize="12px">Névjegy</Box>
        </HStack>
        {aside.length > 0 && (
          <Text textAlign="center" fontFamily="system-ui" fontSize="11.5px" color="warn" mt="8px" maxW="56ch" mx="auto">
            Ezen az eszközön van egy korábbi mentés, amelyet az alkalmazás nem tudott beolvasni; félretette, hogy ne vesszen el.{" "}
            <Box as="button" type="button" onClick={saveAside} textDecoration="underline" textUnderlineOffset="2px">Mentés fájlba</Box>
            {asideSaved && (
              <>
                {" · "}
                <Box as="button" type="button" onClick={dropAside} textDecoration="underline" textUnderlineOffset="2px">Törlés erről az eszközről</Box>
              </>
            )}
          </Text>
        )}
        {records.length > 0 && (
          <Text textAlign="center" fontFamily="system-ui" fontSize="11.5px" color={backupStale ? "warn" : "fgFaint"} mt="8px" maxW="52ch" mx="auto">
            {lastBackupAt === null ? "Még nem készült biztonsági mentés." : `Utolsó biztonsági mentés: ${daysAgo(lastBackupAt, now)}.`}
            {backupStale && " A karakterek csak ebben a böngészőben vannak meg, ezért érdemes menteni."}
          </Text>
        )}
        {driveLine && (
          <Text textAlign="center" fontFamily="system-ui" fontSize="11.5px" color={drive.status === "error" || driveLine.startsWith("Ezen az eszközön") ? "warn" : "fgFaint"} mt="4px" maxW="52ch" mx="auto">
            {driveLine}
          </Text>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={(e) => {
            handleImportFile(e.target.files?.[0]);
            e.target.value = ""; // allow re-picking the same file
          }}
        />

        {(importError || importInfo) && (
          <Text textAlign="center" fontFamily="system-ui" fontSize="11.5px" color={importError ? "bad" : "good"} mt="9px" maxW="52ch" mx="auto">
            {importError ?? importInfo}
          </Text>
        )}
      </Box>
      </Box>

      {driveOpen && <DriveSyncModal drive={drive} records={records} onClose={() => setDriveOpen(false)} />}

      {menuView && !menuAsPopover && (
        <ModalShell onClose={() => setMenuId(null)} width="min(340px, 100%)" zIndex={40} overlayPad="28px">
          <Box px="22px" pt="18px" pb="14px" borderBottom="1px solid" borderColor="rule" textAlign="center">
            <Text fontSize="20px" fontWeight={700} color="fg">{menuView.name}</Text>
            <Text fontFamily="system-ui" fontSize="12px" color="muted" mt="2px">{menuView.line} · {menuView.level}. szint</Text>
          </Box>
          <Box p="8px" overflowY="auto">
            {menuActions(menuView)}
          </Box>
        </ModalShell>
      )}

      {deleteView && (
        <ConfirmModal
          title="Karakter törlése"
          confirmLabel="Törlés"
          onConfirm={() => {
            const i = deleteView.id;
            setConfirmDeleteId(null);
            onDelete(i);
          }}
          onClose={() => setConfirmDeleteId(null)}
        >
          Biztosan törlöd <Text as="span" fontWeight={700} color="fg">{deleteView.name}</Text> karaktert?{" "}
          {!drive.enabled
            ? "Ez nem vonható vissza."
            : drive.backups
              ? "A törlés minden szinkronizált eszközödre átterjed. Az utolsó állapota biztonsági másolatként megmarad a Drive-on, onnan visszaállítható."
              : "A törlés minden szinkronizált eszközödre átterjed, és nem vonható vissza."}
        </ConfirmModal>
      )}

      {renameId && (
        <ModalShell onClose={() => setRenameId(null)} width="min(400px, 100%)">
          <Box p="22px">
            <Heading fontSize="18px" fontWeight={700} color="fg" mb={3}>Átnevezés</Heading>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = renameValue.trim();
                if (!name) return;
                const i = renameId;
                setRenameId(null);
                onRename(i, name);
              }}
            >
              <Input {...FIELD_SX} size="md" autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Karakter neve" />
              <HStack justify="flex-end" gap="9px" mt={4}>
                <Box as="button" type="button" onClick={() => setRenameId(null)} px="15px" py="9px" borderRadius="9px" border="1px solid" borderColor="hair" bg="transparent" color="muted" fontWeight={600} fontSize="15px" _hover={{ borderColor: "accent" }}>
                  Mégse
                </Box>
                <Box as="button" type="submit" px="18px" py="9px" borderRadius="9px" border="1px solid" borderColor="accent" bg="accentSoft" color="accentTx" fontWeight={700} fontSize="15px" opacity={renameValue.trim() ? 1 : 0.5}>
                  Mentés
                </Box>
              </HStack>
            </form>
          </Box>
        </ModalShell>
      )}

    </Flex>
  );
};
