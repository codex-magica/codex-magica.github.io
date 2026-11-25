import React, { useEffect, useRef, useState } from "react";
import { Box, Text, useColorMode } from "@chakra-ui/react";
import { WelcomeScreen } from "./WelcomeScreen";
import { AppShell } from "./AppShell";
import { CompendiumScreen } from "./CompendiumScreen";
import { CreatorScreen, CreatorMode } from "./CreatorScreen";
import { UpdateBanner } from "./UpdateBanner";
import { DriveHopNotice } from "./DriveHopNotice";
import { SyncConflictModal } from "./SyncConflictModal";
import { CharacterTrouble, ErrorBoundary } from "./ErrorBoundary";
import { exportBackupFile, exportRecordFile } from "../state/transfer";
import { CreditsModal } from "./CreditsModal";
import { creditsSeen, markCreditsSeen } from "../state/creditsNotice";
import { useRoster } from "../state/useRoster";
import { Conflict, rosterStore } from "../state/rosterStore";
import { useDriveSync } from "../state/useDriveSync";
import { createBlankRecord } from "../state/storage";
import { refreshStatusTint } from "./statusTint";
import { CharacterRecord } from "../model/character";

// Shown while saving to this device fails (storage full or blocked): edits aren't kept then, so the
// player must know, and can take everything saved so far to a file. Below
// the screens' top bar (never over their back button), with the way out right in it.
const SaveFailedBanner: React.FC<{ onExport: () => void }> = ({ onExport }) => (
  <Box role="alert" position="fixed" top="calc(max(10px, env(safe-area-inset-top)) + 58px)" left="50%" transform="translateX(-50%)" zIndex={62} w="min(520px, calc(100% - 32px))"
    display="flex" alignItems="center" gap="12px" px="14px" py="10px" borderRadius="12px" bg="sheet" border="1px solid" borderColor="warn" boxShadow="0 10px 30px rgba(0,0,0,.18)"
    fontFamily="system-ui" fontSize="13px" color="fg" lineHeight="1.4">
    <Text flex="1">
      <b>Nem sikerül menteni ezen az eszközön</b> (valószínűleg megtelt vagy le van tiltva a böngésző tárhelye), ezért a módosításaid most nem maradnak meg. Exportáld a karaktereidet, hogy biztonságban legyenek.
    </Text>
    <Box as="button" type="button" onClick={onExport} flexShrink={0} px="11px" py="5px" borderRadius="8px" border="1px solid" borderColor="warn" bg="warnSoft" color="fg" fontSize="13px" fontWeight={700}>
      Exportálás
    </Box>
  </Box>
);

const conflictKey = (cs: Conflict[]): string => cs.flatMap((c) => c.alternatives.map((a) => a.id)).join(",");

// Top-level navigation: the roster is home; opening a character shows the sheet; create / edit /
// level-up open the shared full-screen creator as an overlay. Characters persist to local storage
// via the roster; the creator commits a working copy on save.

export const RootApp: React.FC = () => {
  const roster = useRoster();
  // keep the browser/OS chrome colour (theme-color) in step with the app's light/dark mode
  const { colorMode } = useColorMode();
  useEffect(() => {
    const c = colorMode === "dark" ? "#13171f" : "#ebeff2";
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.setAttribute("content", c);
    });
    refreshStatusTint(); // the status bar strip's colour changed with the mode: make iOS look again
  }, [colorMode]);
  // back through the back/forward cache, iOS may still show an old status bar colour
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => e.persisted && refreshStatusTint();
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);
  // The app starts on the roster, also when coming back from Google's consent page: the sync window,
  // where that trip starts, is there.
  const [screen, setScreen] = useState<"roster" | "sheet" | "compendium">("roster");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [creator, setCreator] = useState<{ mode: CreatorMode; record: CharacterRecord } | null>(null);
  // the conflicts the player put off (closed the popup): asked again when the app is next opened, or when
  // another one arrives
  const [conflictsLater, setConflictsLater] = useState<string | null>(null);
  const go = (s: typeof screen) => setScreen(s);
  // optional Google Drive sync (absent without a client ID and a token service)
  const drive = useDriveSync();
  // "sync stopped" card: for the other screens; the roster says it at the top already (and seeing that
  // counts as having seen it)
  const hop = drive.hop === "lost" && screen === "roster" ? null : drive.hop;
  const { hop: rawHop, dismissHop } = drive;
  useEffect(() => {
    if (rawHop === "lost" && screen === "roster") dismissHop();
  }, [rawHop, screen, dismissHop]);
  // one-time "about & credits" notice on first launch; reopenable from the roster footer
  const [showCredits, setShowCredits] = useState(() => !creditsSeen());

  const current = currentId ? roster.get(currentId) : undefined;
  // the open character disappeared (deleted on another device): back to the roster,
  // which says why
  const lastName = useRef<string | null>(null);
  if (current) lastName.current = current.name;
  const [rosterNotice, setRosterNotice] = useState<string | null>(null);
  useEffect(() => {
    if (screen === "sheet" && !current) {
      if (currentId && lastName.current)
        setRosterNotice(
          `„${lastName.current}” karakterlapja bezárult, mert a karaktert közben törölték egy másik eszközön.` +
            (drive.enabled && drive.backups ? " Ha tévedés volt, a Google Drive ablakban, a biztonsági másolatok közül visszaállíthatod." : "")
        );
      go("roster");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, current]);

  const editChar = (id: string) => {
    const r = roster.get(id);
    if (r) setCreator({ mode: "edit", record: r });
  };
  const commit = (rec: CharacterRecord) => {
    roster.upsert(rec, creator?.record); // saved against what the creator opened with
    if (creator?.mode === "create") {
      setCurrentId(rec.id); // new character → land on its sheet
      go("sheet");
    }
    setCreator(null);
  };

  return (
    <>
      {screen === "sheet" && current ? (
        <ErrorBoundary key={current.id} fallback={(error) => <CharacterTrouble error={error} onBack={() => go("roster")} onExport={() => void exportRecordFile(current)} />}>
          <AppShell
            record={current}
            onBack={() => go("roster")}
            onEdit={() => editChar(current.id)}
            onLevelup={() => setCreator({ mode: "levelup", record: current })}
            onPatchRecord={(next, base) => roster.upsert(next, base)}
          />
        </ErrorBoundary>
      ) : screen === "compendium" ? (
        <CompendiumScreen
          onExit={() => go("roster")}
        />
      ) : (
        <WelcomeScreen
          records={roster.records}
          onOpenCharacter={(id) => { setCurrentId(id); go("sheet"); }}
          onNew={() => setCreator({ mode: "create", record: createBlankRecord() })}
          onEdit={editChar}
          onDuplicate={roster.duplicate}
          onDelete={roster.remove}
          onImport={roster.importRecords}
          onRename={(id, name) => {
            const r = roster.get(id);
            if (r) roster.upsert({ ...r, name }, r);
          }}
          onOpenCompendium={() => go("compendium")}
          onOpenCredits={() => setShowCredits(true)}
          drive={drive}
          notice={rosterNotice}
          onDismissNotice={() => setRosterNotice(null)}
        />
      )}

      {creator && (
        <ErrorBoundary key={`${creator.mode}:${creator.record.id}:creator`} fallback={(error) => (
          <Box position="fixed" inset={0} zIndex={40}>
            <CharacterTrouble error={error} onBack={() => setCreator(null)} onExport={() => void exportRecordFile(creator.record)} />
          </Box>
        )}>
          <CreatorScreen
            key={`${creator.mode}:${creator.record.id}`}
            mode={creator.mode}
            initialRecord={creator.record}
            onClose={() => setCreator(null)}
            onCommit={commit}
          />
        </ErrorBoundary>
      )}

      {showCredits && (
        <CreditsModal
          onClose={() => {
            markCreditsSeen();
            setShowCredits(false);
          }}
        />
      )}

      {/* a sync can find one on any screen; not over the creator (it would hide the work in progress) */}
      {roster.conflicts.length > 0 && !creator && conflictsLater !== conflictKey(roster.conflicts) && (
        <SyncConflictModal
          conflict={roster.conflicts[0]}
          remaining={roster.conflicts.length}
          onResolve={(keep) => roster.resolveConflict(roster.conflicts[0].main.id, keep)}
          onClose={() => setConflictsLater(conflictKey(roster.conflicts))}
        />
      )}
      {roster.saveFailed && <SaveFailedBanner onExport={() => void exportBackupFile(rosterStore().getState().records)} />}
      <DriveHopNotice hop={hop} onDismiss={drive.dismissHop} />
      <UpdateBanner paused={creator !== null || drive.hop !== null} required={drive.needsUpdate} />
    </>
  );
};

export default RootApp;
