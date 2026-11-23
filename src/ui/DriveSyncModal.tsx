import React, { useCallback, useEffect, useState } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { ModalShell } from "./Modal";
import { DriveSyncApi } from "../state/useDriveSync";
import { BackupMeta, DriveAuthError } from "../state/googleDrive";
import { CharacterRecord } from "../model/character";

export const CloudIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </svg>
);

// "3 perce", "2 órája", "tegnap"… for the last successful sync
export const syncedAgo = (ts: number, now: number): string => {
  const min = Math.floor((now - ts) / 60_000);
  if (min < 1) return "az imént";
  if (min < 60) return `${min} perce`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} órája`;
  const d = Math.floor(h / 24);
  return d === 1 ? "tegnap" : `${d} napja`;
};

const STALE_PENDING_MS = 3 * 3600_000;

// One-line status (null while sync is off). On the roster the button to tap is "Google Drive"; inside the
// window it's "Szinkronizálás most".
export const driveStatusLine = (drive: DriveSyncApi, now: number, inWindow = false): string | null => {
  if (!drive.enabled) return null;
  const button = inWindow ? "a „Szinkronizálás most” gombra" : "a Google Drive gombra";
  if (drive.status === "syncing") return "Szinkronizálás a Google Drive-val…";
  // changes stuck on this device for hours: say so before the user picks up another device
  if (drive.status !== "idle" && drive.pending.count > 0 && drive.pending.oldest !== null && now - drive.pending.oldest > STALE_PENDING_MS)
    return `Ezen az eszközön vannak még fel nem töltött módosítások (${drive.pending.count}). Kattints ${button}, mielőtt másik eszközön folytatod.`;
  if (drive.status === "needsTap") return `Google Drive: a következő szinkronhoz kattints ${button}.`;
  if (drive.status === "error") return "Google Drive: a legutóbbi szinkron nem sikerült.";
  return drive.lastSyncAt ? `Google Drive: szinkronizálva ${syncedAgo(drive.lastSyncAt, now)}.` : "Google Drive: bekapcsolva.";
};

const btn = {
  as: "button" as const,
  type: "button" as const,
  px: "16px",
  py: "9px",
  borderRadius: "9px",
  fontWeight: 700,
  fontSize: "15px",
};

// An accessible on/off switch in the app's style.
const Toggle: React.FC<{ on: boolean; onChange: (on: boolean) => void; label: string }> = ({ on, onChange, label }) => (
  <Box as="button" type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} flexShrink={0} w="40px" h="24px" borderRadius="12px" p="3px"
    bg={on ? "accent" : "fieldBd"} transition="background .15s" display="flex" alignItems="center" justifyContent={on ? "flex-end" : "flex-start"}>
    <Box w="18px" h="18px" borderRadius="50%" bg="sheet" boxShadow="0 1px 2px rgba(0,0,0,.25)" />
  </Box>
);

const BackupsChoice: React.FC<{ on: boolean; onChange: (on: boolean) => void }> = ({ on, onChange }) => (
  <Box display="flex" gap="14px" alignItems="flex-start" border="1px solid" borderColor="rule" borderRadius="10px" p="12px 14px" mb="12px">
    <Box flex="1">
      <Text fontFamily="system-ui" fontSize="14px" fontWeight={700} color="fg" mb="3px">
        Napi biztonsági másolat a Drive-on
      </Text>
      <Text fontFamily="system-ui" fontSize="12.5px" color="muted" lineHeight="1.5">
        Ha egy karaktert egy későbbi napon módosítasz, megmarad az előző napi állapota, ha pedig törlöd, a törlés előtti
        állapota. Bármikor visszaállíthatod őket. A fájlok aprók, egyenként néhány kilobájtosak.
      </Text>
    </Box>
    <Toggle on={on} onChange={onChange} label="Napi biztonsági másolat a Drive-on" />
  </Box>
);

const dayLabel = (day: string) => {
  const [y, m, d] = day.split("-");
  return `${y}. ${m}. ${d}.`;
};

// Browsing and restoring the Drive backups. Restoring always adds a new character; nothing is replaced.
const BackupsView: React.FC<{ drive: DriveSyncApi; records: CharacterRecord[] }> = ({ drive, records }) => {
  const [state, setState] = useState<{ kind: "loading" } | { kind: "needsTap" } | { kind: "error" } | { kind: "list"; items: BackupMeta[] }>({ kind: "loading" });
  const [restored, setRestored] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const { listBackups } = drive;

  const fetchList = useCallback(
    () =>
      listBackups().then(
        (items) => setState({ kind: "list", items }),
        (e) => setState({ kind: e instanceof DriveAuthError ? "needsTap" : "error" })
      ),
    [listBackups]
  );
  useEffect(() => {
    void fetchList(); // the view starts in "loading"
  }, [fetchList]);
  const load = () => {
    setState({ kind: "loading" });
    void fetchList();
  };

  const restore = (b: BackupMeta) => {
    setBusy(b.id);
    drive.restoreBackup(b).then(
      (rec) => setRestored((r) => ({ ...r, [b.id]: rec.name })),
      () => setRestored((r) => ({ ...r, [b.id]: "" }))
    ).finally(() => setBusy(null));
  };

  if (state.kind === "loading") return <Text fontFamily="system-ui" fontSize="14px" color="muted">Betöltés…</Text>;
  if (state.kind === "needsTap")
    return (
      <Box fontFamily="system-ui" fontSize="14px" color="muted">
        <Text mb="10px">A biztonsági másolatok betöltéséhez újra kapcsolódni kell a Google-hoz.</Text>
        <Box {...btn} fontSize="14px" onClick={() => void drive.connect().then((ok) => ok && load())} border="1px solid" borderColor="accent" bg="accentSoft" color="accentTx">
          Kapcsolódás
        </Box>
      </Box>
    );
  if (state.kind === "error")
    return (
      <Box fontFamily="system-ui" fontSize="14px" color="muted">
        <Text mb="10px">Nem sikerült betölteni a biztonsági másolatokat. Van internetkapcsolat?</Text>
        <Box {...btn} fontSize="14px" onClick={load} border="1px solid" borderColor="hair" color="fg">
          Újra
        </Box>
      </Box>
    );
  if (state.items.length === 0)
    return (
      <Text fontFamily="system-ui" fontSize="14px" color="muted" lineHeight="1.55">
        Még nincs biztonsági másolat. Akkor készül, amikor egy karaktert egy későbbi napon módosítasz, vagy amikor törölsz egyet.
      </Text>
    );

  // grouped by character: the ones on the roster first (by name), then the deleted ones
  const current = new Map(records.map((r) => [r.id, r.name]));
  const groups = new Map<string, BackupMeta[]>();
  for (const b of state.items) groups.set(b.characterId, [...(groups.get(b.characterId) ?? []), b]);
  const list = [...groups.entries()]
    .map(([id, items]) => ({ id, items: items.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : a.createdTime < b.createdTime ? 1 : -1)), name: current.get(id) ?? items[0].name, gone: !current.has(id) }))
    .sort((a, b) => Number(a.gone) - Number(b.gone) || a.name.localeCompare(b.name, "hu"));

  return (
    <Box display="flex" flexDirection="column" gap="14px" fontFamily="system-ui">
      <Text fontSize="13px" color="muted" lineHeight="1.5">
        A visszaállított változat új karakterként, dátummal a nevében kerül a karakterlista végére; a meglévőket nem írja felül.
      </Text>
      {list.map((g) => (
        <Box key={g.id}>
          <Text fontSize="14px" fontWeight={700} color="fg" mb="4px">
            {g.name}
            {g.gone && (
              <Box as="span" fontWeight={400} color="fgFaint">
                {" "}
                · törölve
              </Box>
            )}
          </Text>
          {g.items.map((b) => (
            <Box key={b.id} display="flex" alignItems="center" gap="10px" py="6px" borderTop="1px solid" borderColor="rule">
              <Box flex="1" fontSize="13.5px" color="fg">
                {dayLabel(b.day)}
                {b.reason === "deleted" && (
                  <Box as="span" color="fgFaint">
                    {" "}
                    · törlés előtti állapot
                  </Box>
                )}
                {restored[b.id] !== undefined && (
                  <Text fontSize="12.5px" color={restored[b.id] ? "accentTx" : "warn"}>
                    {restored[b.id] ? `Visszaállítva: ${restored[b.id]}` : "Nem sikerült visszaállítani."}
                  </Text>
                )}
              </Box>
              <Box as="button" type="button" onClick={() => restore(b)} disabled={busy !== null} opacity={busy === b.id ? 0.6 : 1} fontSize="13px" fontWeight={700} color="accentTx" px="10px" py="5px"
                border="1px solid" borderColor="accentBd" borderRadius="8px" bg="accentSoft">
                {busy === b.id ? "…" : "Visszaállítás"}
              </Box>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export const DriveSyncModal: React.FC<{ drive: DriveSyncApi; records: CharacterRecord[]; onClose: () => void }> = ({ drive, records, onClose }) => {
  const { prepare } = drive;
  useEffect(() => prepare(), [prepare]); // load Google's sign-in now, so the tap can open its popup
  const [now] = useState(() => Date.now());
  const [backupsChoice, setBackupsChoice] = useState(drive.backups);
  const [view, setView] = useState<"main" | "backups">("main");
  const busy = drive.status === "syncing";

  if (view === "backups")
    return (
      <ModalShell onClose={onClose} width="min(500px, 100%)" maxH="88vh">
        <Box p="22px 22px 8px" overflowY="auto">
          <Text fontFamily="system-ui" fontSize="11px" fontWeight={700} letterSpacing=".2em" textTransform="uppercase" color="accentTx" mb="6px">
            Google Drive
          </Text>
          <Heading fontSize={{ base: "20px", md: "22px" }} fontWeight={700} color="fg" mb="12px">
            Biztonsági másolatok
          </Heading>
          <BackupsView drive={drive} records={records} />
        </Box>
        <Box display="flex" justifyContent="flex-end" p="12px 22px 18px" borderTop="1px solid" borderColor="rule" mt="10px">
          <Box {...btn} onClick={() => setView("main")} border="1px solid" borderColor="hair" color="muted">
            Vissza
          </Box>
        </Box>
      </ModalShell>
    );

  return (
    <ModalShell onClose={onClose} width="min(460px, 100%)" maxH="88vh">
      <Box p="22px 22px 8px" overflowY="auto">
        <Text fontFamily="system-ui" fontSize="11px" fontWeight={700} letterSpacing=".2em" textTransform="uppercase" color="accentTx" mb="6px">
          Google Drive
        </Text>
        <Heading fontSize={{ base: "20px", md: "22px" }} fontWeight={700} color="fg" mb="10px">
          Szinkron a Google Drive-val
        </Heading>
        <Text fontSize={{ base: "14px", md: "15px" }} color="fg" lineHeight="1.55" mb="10px">
          A karaktereid a saját Google Drive-od egy rejtett mappájába kerülnek, amelyet csak ez az alkalmazás lát.
          Így minden eszközödön ugyanazok a karakterek lesznek, ahol bekapcsolod a szinkront.
        </Text>
        <Text fontSize={{ base: "13px", md: "14px" }} color="muted" lineHeight="1.55" mb="12px">
          Nincs külön fiók és nincs saját szerverünk: az adatok a te Google-fiókodban maradnak. A Google egyszer, egy
          felugró ablakban kér engedélyt. Utána az alkalmazás magától szinkronizál, és csak akkor kell újra
          belépned, ha közben kijelentkezel a Google-fiókodból.
          Részletek az{" "}
          <Box as="a" href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noopener noreferrer" color="accentTx" textDecoration="underline" textUnderlineOffset="3px">
            adatvédelmi tájékoztatóban
          </Box>
          .
        </Text>

        <BackupsChoice on={drive.enabled ? drive.backups : backupsChoice} onChange={drive.enabled ? drive.setBackups : setBackupsChoice} />

        {drive.enabled && (
          <Box borderTop="1px solid" borderBottom="1px solid" borderColor="rule" py="10px" mb="12px" fontFamily="system-ui" fontSize="13px" color="muted" display="flex" flexDirection="column" gap="4px">
            <Text>{driveStatusLine(drive, now, true)}</Text>
            {drive.pending.count > 0 && drive.status !== "syncing" && <Text color="accentTx">{drive.pending.count} módosítás vár szinkronra.</Text>}
            {drive.email && <Text color="fgFaint">Fiók: {drive.email}</Text>}
            <Box as="button" type="button" onClick={() => setView("backups")} alignSelf="flex-start" mt="4px" color="accentTx" fontWeight={600} textDecoration="underline" textUnderlineOffset="3px">
              Biztonsági másolatok megtekintése
            </Box>
          </Box>
        )}
        {drive.note && (
          <Text fontFamily="system-ui" fontSize="13px" color={drive.status === "error" || drive.status === "needsTap" ? "warn" : "muted"} lineHeight="1.5" mb="12px">
            {drive.note}
          </Text>
        )}
        {drive.enabled && (
          <Text fontFamily="system-ui" fontSize="12px" color="fgFaint" lineHeight="1.5" mb="6px">
            Kikapcsoláskor semmi sem törlődik: a karakterek ezen az eszközön és a Drive-on is megmaradnak, a biztonsági
            másolatokkal együtt. A Drive-on lévőket a Google Drive beállításaiban, az „Alkalmazások kezelése” résznél törölheted.
          </Text>
        )}
      </Box>

      <Box display="flex" alignItems="center" justifyContent="flex-end" flexWrap="wrap" gap="10px" p="12px 22px 18px" borderTop="1px solid" borderColor="rule">
        {drive.enabled ? (
          <>
            <Box {...btn} onClick={drive.disable} border="1px solid" borderColor="hair" color="muted" mr="auto">
              Kikapcsolás
            </Box>
            <Box {...btn} onClick={drive.syncNow} disabled={busy} opacity={busy ? 0.6 : 1} border="1px solid" borderColor="accent" bg="accentSoft" color="accentTx">
              {busy ? "Szinkronizálás…" : "Szinkronizálás most"}
            </Box>
          </>
        ) : (
          <>
            <Box {...btn} onClick={onClose} border="1px solid" borderColor="hair" color="muted">
              Mégse
            </Box>
            <Box {...btn} onClick={() => drive.enable(backupsChoice)} disabled={!drive.ready} opacity={drive.ready ? 1 : 0.6} border="1px solid" borderColor="accent" bg="accentSoft" color="accentTx">
              {drive.ready ? "Bekapcsolás" : "Betöltés…"}
            </Box>
          </>
        )}
      </Box>
    </ModalShell>
  );
};
