import React, { useEffect, useState } from "react";
import { WelcomeScreen } from "./WelcomeScreen";
import { initAuthCookieRefresh } from "../state/authCookie";
import { AppShell } from "./AppShell";
import { CompendiumScreen } from "./CompendiumScreen";
import { CreatorScreen, CreatorMode } from "./CreatorScreen";
import { useRoster } from "../state/useRoster";
import { createBlankRecord } from "../state/storage";
import { CharacterRecord } from "../model/character";

// Top-level navigation: the roster is home; opening a character shows the sheet; create / edit /
// level-up open the shared full-screen creator as an overlay. Characters persist to local storage
// via the roster; the creator commits a working copy on save.
export const RootApp: React.FC = () => {
  const roster = useRoster();
  useEffect(() => initAuthCookieRefresh(), []);
  const [screen, setScreen] = useState<"roster" | "sheet" | "compendium">("roster");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [creator, setCreator] = useState<{ mode: CreatorMode; record: CharacterRecord } | null>(null);

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
          sync={roster.sync}
          onOpenCharacter={(id) => { setCurrentId(id); setScreen("sheet"); }}
          onNew={() => setCreator({ mode: "create", record: createBlankRecord() })}
          onEdit={editChar}
          onDuplicate={roster.duplicate}
          onDelete={roster.remove}
          onOpenCompendium={() => setScreen("compendium")}
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
    </>
  );
};

export default RootApp;
