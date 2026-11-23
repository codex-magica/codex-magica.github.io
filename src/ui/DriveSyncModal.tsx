import React, { useEffect, useState } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { ModalShell } from "./Modal";
import { DriveSyncApi } from "../state/useDriveSync";

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

// One-line status for the roster footer (null while sync is off).
export const driveStatusLine = (drive: DriveSyncApi, now: number): string | null => {
  if (!drive.enabled) return null;
  if (drive.status === "syncing") return "Szinkronizálás a Google Drive-val…";
  if (drive.status === "needsTap") return "Google Drive: a következő szinkronhoz koppints a Google Drive gombra.";
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

export const DriveSyncModal: React.FC<{ drive: DriveSyncApi; onClose: () => void }> = ({ drive, onClose }) => {
  const { prepare } = drive;
  useEffect(() => prepare(), [prepare]); // load Google's sign-in now, so the tap can open its popup
  const [now] = useState(() => Date.now());
  const busy = drive.status === "syncing";

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
          Nincs külön fiók és nincs saját szerverünk: az adatok a te Google-fiókodban maradnak. A Google egy felugró
          ablakban kér engedélyt; a hozzáférés egy óráig érvényes, utána a szinkronhoz elég egy koppintás.
          Részletek az{" "}
          <Box as="a" href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noopener noreferrer" color="accentTx" textDecoration="underline" textUnderlineOffset="3px">
            adatvédelmi tájékoztatóban
          </Box>
          .
        </Text>

        {drive.enabled && (
          <Box borderTop="1px solid" borderBottom="1px solid" borderColor="rule" py="10px" mb="12px" fontFamily="system-ui" fontSize="13px" color="muted">
            {driveStatusLine(drive, now)}
          </Box>
        )}
        {drive.note && (
          <Text fontFamily="system-ui" fontSize="13px" color={drive.status === "error" || drive.status === "needsTap" ? "warn" : "muted"} lineHeight="1.5" mb="12px">
            {drive.note}
          </Text>
        )}
        {drive.enabled && (
          <Text fontFamily="system-ui" fontSize="12px" color="fgFaint" lineHeight="1.5" mb="6px">
            Kikapcsoláskor a karakterek ezen az eszközön megmaradnak. A Drive-on tárolt példányt a Google Drive
            beállításaiban, az „Alkalmazások kezelése” résznél törölheted.
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
            <Box {...btn} onClick={drive.enable} disabled={!drive.ready} opacity={drive.ready ? 1 : 0.6} border="1px solid" borderColor="accent" bg="accentSoft" color="accentTx">
              {drive.ready ? "Bekapcsolás" : "Betöltés…"}
            </Box>
          </>
        )}
      </Box>
    </ModalShell>
  );
};
