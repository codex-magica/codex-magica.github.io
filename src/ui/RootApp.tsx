import React, { useEffect, useRef, useState } from "react";
import { Box } from "@chakra-ui/react";
import { WelcomeScreen } from "./WelcomeScreen";
import { AppShell } from "./AppShell";
import { CompendiumScreen } from "./CompendiumScreen";
import { CreatorScreen, CreatorMode } from "./CreatorScreen";
import { UpdateBanner } from "./UpdateBanner";
import { DriveHopNotice } from "./DriveHopNotice";
import { captureScroll, restoreScroll } from "./scrollMemory";
import { CreditsModal } from "./CreditsModal";
import { creditsSeen, markCreditsSeen } from "../state/creditsNotice";
import { useRoster } from "../state/useRoster";
import { useDriveSync } from "../state/useDriveSync";
import { ReturnContext, consumeRedirectResult } from "../state/googleDrive";
import { TABS } from "./compendiumData";
import { createBlankRecord } from "../state/storage";
import { CharacterRecord } from "../model/character";

// Shown while saving to this device fails (storage full or blocked), so nobody loses edits unawares.
const SaveFailedBanner: React.FC = () => (
  <Box role="alert" position="fixed" top="max(10px, env(safe-area-inset-top))" left="50%" transform="translateX(-50%)" zIndex={62} w="min(520px, calc(100% - 32px))"
    px="16px" py="11px" borderRadius="12px" bg="sheet" border="1px solid" borderColor="warn" boxShadow="0 10px 30px rgba(0,0,0,.18)" fontFamily="system-ui" fontSize="13.5px" color="fg" lineHeight="1.45">
    <b>Nem sikerült menteni ezen az eszközön.</b> Lehet, hogy megtelt a böngésző tárhelye. Amíg ez az üzenet látszik, a módosítások csak
    addig maradnak meg, amíg az alkalmazás nyitva van: készíts biztonsági mentést a karakterlistán.
  </Box>
);

// Top-level navigation: the roster is home; opening a character shows the sheet; create / edit /
// level-up open the shared full-screen creator as an overlay. Characters persist to local storage
// via the roster; the creator commits a working copy on save.
export const RootApp: React.FC = () => {
  const roster = useRoster();
  // back from a Google Drive token renewal round trip: land on the screen, tab and scroll position the
  // user was on (read once; later screens open normally)
  const [back] = useState<ReturnContext | null>(() => {
    const o = consumeRedirectResult();
    if (o.kind === "none" || !o.ctx) return null;
    const compTab = o.ctx.compTab !== undefined && TABS[o.ctx.compTab] ? o.ctx.compTab : undefined; // a stale/odd value can't open an empty page
    return { ...o.ctx, compTab };
  });
  const restore = useRef(back);
  const [screen, setScreen] = useState<"roster" | "sheet" | "compendium">(() =>
    back && (back.screen !== "sheet" || (back.characterId && roster.get(back.characterId))) ? back.screen : "roster"
  );
  const [currentId, setCurrentId] = useState<string | null>(() => back?.characterId ?? null);
  useEffect(() => {
    restore.current = null;
    if (back?.scroll) restoreScroll(back.scroll);
  }, [back]);
  // where inside the current screen the user is (sheet or its compendium, compendium tab)
  const inner = useRef<{ view?: "sheet" | "compendium"; compTab?: number }>({});
  const [creator, setCreator] = useState<{ mode: CreatorMode; record: CharacterRecord } | null>(null);
  const creatorOpen = useRef(false);
  creatorOpen.current = creator !== null;
  const where = useRef({ screen, characterId: currentId });
  where.current = { screen, characterId: currentId };
  const go = (s: typeof screen) => {
    inner.current = {};
    setScreen(s);
  };
  // optional Google Drive sync (absent without a client ID); may renew its token by a quick round trip
  // through Google, but only when the creator (unsaved edits) is closed
  const drive = useDriveSync({
    safeToLeave: () => !creatorOpen.current,
    returnContext: () => ({ ...where.current, ...inner.current, scroll: captureScroll() }),
  });
  const { atRoster } = drive;
  const firstScreen = useRef(true);
  useEffect(() => {
    if (firstScreen.current) {
      firstScreen.current = false;
      return;
    }
    if (screen === "roster") atRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);
  // one-time "about & credits" notice on first launch; reopenable from the roster footer
  const [showCredits, setShowCredits] = useState(() => !creditsSeen());

  const current = currentId ? roster.get(currentId) : undefined;
  // the open character disappeared (deleted in another tab or on another device): back to the roster
  useEffect(() => {
    if (screen === "sheet" && !current) go("roster");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, current]);

  const editChar = (id: string) => {
    const r = roster.get(id);
    if (r) setCreator({ mode: "edit", record: r });
  };
  const commit = (rec: CharacterRecord) => {
    roster.upsert(rec);
    if (creator?.mode === "create") {
      setCurrentId(rec.id); // new character → land on its sheet
      go("sheet");
    }
    setCreator(null);
  };

  return (
    <>
      {screen === "sheet" && current ? (
        <AppShell
          record={current}
          restore={restore.current ?? undefined}
          onPlace={(view, compTab) => {
            inner.current = { view, compTab };
          }}
          onBack={() => go("roster")}
          onEdit={() => editChar(current.id)}
          onLevelup={() => setCreator({ mode: "levelup", record: current })}
          onPatchRecord={roster.upsert}
        />
      ) : screen === "compendium" ? (
        <CompendiumScreen
          initialTab={restore.current?.compTab}
          onTab={(compTab) => {
            inner.current = { compTab };
          }}
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
          onImport={(rs) => rs.forEach(roster.upsert)}
          onRename={(id, name) => {
            const r = roster.get(id);
            if (r) roster.upsert({ ...r, name });
          }}
          onOpenCompendium={() => go("compendium")}
          onOpenCredits={() => setShowCredits(true)}
          drive={drive}
        />
      )}

      {creator && (
        <CreatorScreen
          key={`${creator.mode}:${creator.record.id}`}
          mode={creator.mode}
          initialRecord={creator.record}
          onClose={() => setCreator(null)}
          onCommit={commit}
        />
      )}

      {showCredits && (
        <CreditsModal
          onClose={() => {
            markCreditsSeen();
            setShowCredits(false);
          }}
        />
      )}

      {roster.saveFailed && <SaveFailedBanner />}
      <DriveHopNotice hop={drive.hop} onCancel={drive.cancelHop} />
      <UpdateBanner paused={creator !== null || drive.hop !== null} />
    </>
  );
};

export default RootApp;
