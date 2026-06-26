import React, { useState } from "react";
import { WelcomeScreen } from "./WelcomeScreen";
import { AppShell } from "./AppShell";
import { CreatorScreen, CreatorMode } from "./CreatorScreen";

// Top-level navigation: the roster is home; opening a character shows the sheet; create / edit /
// level-up open the shared full-screen creator as an overlay over whichever screen is behind.
// (Data/flow is still demo — the creator commit just navigates, it doesn't persist yet.)
export const RootApp: React.FC = () => {
  const [screen, setScreen] = useState<"roster" | "sheet">("roster");
  const [creator, setCreator] = useState<CreatorMode | null>(null);

  return (
    <>
      {screen === "roster" ? (
        <WelcomeScreen
          onOpenCharacter={() => setScreen("sheet")}
          onNew={() => setCreator("create")}
          onEdit={() => setCreator("edit")}
        />
      ) : (
        <AppShell
          onBack={() => setScreen("roster")}
          onEdit={() => setCreator("edit")}
          onLevelup={() => setCreator("levelup")}
        />
      )}

      {creator && (
        <CreatorScreen
          mode={creator}
          onClose={() => setCreator(null)}
          onCommit={() => {
            if (creator === "create") setScreen("sheet"); // new character → land on its sheet
            setCreator(null);
          }}
        />
      )}
    </>
  );
};

export default RootApp;
