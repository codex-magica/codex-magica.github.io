import React, { useEffect, useRef, useState } from "react";
import { WelcomeScreen } from "./WelcomeScreen";
import { AppShell } from "./AppShell";
import { CompendiumScreen } from "./CompendiumScreen";
import { CreatorScreen, CreatorMode } from "./CreatorScreen";
import { UpdateBanner } from "./UpdateBanner";
import { CreditsModal } from "./CreditsModal";
import { creditsSeen, markCreditsSeen } from "../state/creditsNotice";
import { useRoster } from "../state/useRoster";
import { useDriveSync } from "../state/useDriveSync";
import { consumeRedirectResult } from "../state/googleDrive";
import { createBlankRecord } from "../state/storage";
import { CharacterRecord } from "../model/character";

// Top-level navigation: the roster is home; opening a character shows the sheet; create / edit /
// level-up open the shared full-screen creator as an overlay. Characters persist to local storage
// via the roster; the creator commits a working copy on save.
export const RootApp: React.FC = () => {
  const roster = useRoster();
  // back from a Google Drive token renewal round trip: land on the screen the user was on
  const [screen, setScreen] = useState<"roster" | "sheet" | "compendium">(() => {
    const o = consumeRedirectResult();
    return o.kind !== "none" && o.ctx && (o.ctx.screen !== "sheet" || o.ctx.characterId) ? o.ctx.screen : "roster";
  });
  const [currentId, setCurrentId] = useState<string | null>(() => {
    const o = consumeRedirectResult();
    return o.kind !== "none" && o.ctx ? o.ctx.characterId : null;
  });
  const [creator, setCreator] = useState<{ mode: CreatorMode; record: CharacterRecord } | null>(null);
  const creatorOpen = useRef(false);
  creatorOpen.current = creator !== null;
  const where = useRef({ screen, characterId: currentId });
  where.current = { screen, characterId: currentId };
  // optional Google Drive sync (absent without a client ID); may renew its token by a quick round trip
  // through Google, but only when the creator (unsaved edits) is closed
  const drive = useDriveSync(roster, {
    safeToLeave: () => !creatorOpen.current,
    returnContext: () => where.current,
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

  const editChar = (id: string) => {
    const r = roster.get(id);
    if (r) setCreator({ mode: "edit", record: r });
  };
  const commit = (rec: CharacterRecord) => {
    roster.upsert(rec);
    if (creator?.mode === "create") {
      setCurrentId(rec.id); // new character → land on its sheet
      setScreen("sheet");
    }
    setCreator(null);
  };

  return (
    <>
      {screen === "sheet" && current ? (
        <AppShell
          record={current}
          onBack={() => setScreen("roster")}
          onEdit={() => editChar(current.id)}
          onLevelup={() => setCreator({ mode: "levelup", record: current })}
          onPatchRecord={roster.upsert}
        />
      ) : screen === "compendium" ? (
        <CompendiumScreen onExit={() => setScreen("roster")} />
      ) : (
        <WelcomeScreen
          records={roster.records}
          onOpenCharacter={(id) => { setCurrentId(id); setScreen("sheet"); }}
          onNew={() => setCreator({ mode: "create", record: createBlankRecord() })}
          onEdit={editChar}
          onDuplicate={roster.duplicate}
          onDelete={roster.remove}
          onImport={(rs) => rs.forEach(roster.upsert)}
          onRename={(id, name) => {
            const r = roster.get(id);
            if (r) roster.upsert({ ...r, name });
          }}
          onOpenCompendium={() => setScreen("compendium")}
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

      <UpdateBanner />
    </>
  );
};

export default RootApp;
