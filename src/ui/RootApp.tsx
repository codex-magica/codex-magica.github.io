import React, { useState } from "react";
import { WelcomeScreen } from "./WelcomeScreen";
import { AppShell } from "./AppShell";
import { CompendiumScreen } from "./CompendiumScreen";
import { CreatorScreen, CreatorMode } from "./CreatorScreen";
import { UpdateBanner } from "./UpdateBanner";
import { CreditsModal } from "./CreditsModal";
import { creditsSeen, markCreditsSeen } from "../state/creditsNotice";
import { useRoster } from "../state/useRoster";
import { useDriveSync } from "../state/useDriveSync";
import { createBlankRecord } from "../state/storage";
import { CharacterRecord } from "../model/character";

// Top-level navigation: the roster is home; opening a character shows the sheet; create / edit /
// level-up open the shared full-screen creator as an overlay. Characters persist to local storage
// via the roster; the creator commits a working copy on save.
export const RootApp: React.FC = () => {
  const roster = useRoster();
  const drive = useDriveSync(roster); // optional Google Drive sync (absent without a client ID)
  const [screen, setScreen] = useState<"roster" | "sheet" | "compendium">("roster");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [creator, setCreator] = useState<{ mode: CreatorMode; record: CharacterRecord } | null>(null);
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
