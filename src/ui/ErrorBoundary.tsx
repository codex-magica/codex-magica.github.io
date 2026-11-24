import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { exportBackupFile } from "../state/transfer";
import { rosterStore } from "../state/rosterStore";

// The last line of defence: if anything fails while rendering, show this instead of a blank page. The
// characters are saved on every change, so they're safe; the player can reload, or save them all to a
// file first.
export class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: (error: Error) => React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  // A fixed version of the app may already be waiting (installed by the service worker, but not active
  // while this page is open): switch to it, then reload.
  private reload = () => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.location.reload();
    };
    try {
      const sw = navigator.serviceWorker;
      if (!sw) return go();
      sw.getRegistration().then((r) => {
        const waiting = r?.waiting;
        if (!waiting) return go();
        sw.addEventListener("controllerchange", go);
        waiting.postMessage({ type: "SKIP_WAITING" });
        window.setTimeout(go, 3000);
      }, go);
    } catch {
      go();
    }
  };

  private saveAll = () => {
    try {
      void exportBackupFile(rosterStore().getState().records);
    } catch {
      // the store itself is unusable: hand over the raw saved data
      const raw = localStorage.getItem("magus.roster.v1") ?? "[]";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
      a.download = "codex-magica-karakterek.json";
      a.click();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.state.error);
    const btn = { as: "button" as const, type: "button" as const, px: "16px", py: "10px", borderRadius: "9px", fontWeight: 700, fontSize: "15px", border: "1px solid" };
    let unsaved = false; // saving to this device was failing: the latest edits exist only in memory
    try {
      unsaved = rosterStore().getState().saveFailed;
    } catch {
      /* the store itself is broken */
    }
    const primary = { borderColor: "accent", bg: "accentSoft", color: "accentTx" };
    const secondary = { borderColor: "hair", color: "fg" };
    return (
      <Box minH="100%" display="flex" alignItems="center" justifyContent="center" p="24px" bg="page" color="fg">
        <Box maxW="440px" fontFamily="system-ui">
          <Heading fontSize="22px" mb="10px">
            Hiba történt
          </Heading>
          {unsaved ? (
            <Text fontSize="15px" lineHeight="1.55" mb="16px">
              A legutóbbi módosításaidat nem sikerült elmenteni ezen az eszközön. Mielőtt újratöltöd az alkalmazást, exportáld a karaktereidet, különben ezek a módosítások elvesznek.
            </Text>
          ) : (
            <>
              <Text fontSize="15px" lineHeight="1.55" mb="8px">
                A karaktereid nem vesztek el: minden módosításodat azonnal elmenti az alkalmazás ezen az eszközön. Töltsd újra az alkalmazást.
              </Text>
              <Text fontSize="14px" color="muted" lineHeight="1.55" mb="16px">
                Ha a hiba ismét jelentkezik, mentsd el a karaktereidet egy fájlba, és jelezd a hibát a projekt GitHub-oldalán.
              </Text>
            </>
          )}
          <Box display="flex" gap="10px" flexWrap="wrap" mb="16px">
            {unsaved && (
              <Box {...btn} {...primary} onClick={this.saveAll}>
                Karakterek exportálása
              </Box>
            )}
            <Box {...btn} {...(unsaved ? secondary : primary)} onClick={this.reload}>
              Újratöltés
            </Box>
            {!unsaved && (
              <Box {...btn} {...secondary} onClick={this.saveAll}>
                Karakterek exportálása
              </Box>
            )}
          </Box>
          <Text fontSize="12px" color="fgFaint" wordBreak="break-word">
            {String(this.state.error.message || this.state.error).slice(0, 300)}
          </Text>
        </Box>
      </Box>
    );
  }
}

// One character the app can't show (say, after an engine bug): its screen says so and offers a way out,
// the rest of the app keeps working, and the character's data is untouched.
export const CharacterTrouble: React.FC<{ onBack: () => void; onExport: () => void; error: Error }> = ({ onBack, onExport, error }) => {
  const btn = { as: "button" as const, type: "button" as const, px: "16px", py: "10px", borderRadius: "9px", fontWeight: 700, fontSize: "15px", border: "1px solid" };
  return (
    <Box h="100%" display="flex" alignItems="center" justifyContent="center" p="24px" bg="page" color="fg">
      <Box maxW="440px" fontFamily="system-ui">
        <Heading fontSize="20px" mb="10px">
          Ezt a karaktert most nem sikerült megnyitni
        </Heading>
        <Text fontSize="15px" lineHeight="1.55" mb="8px">
          A karakter adatai megvannak, semmi sem veszett el; csak a megjelenítésénél történt hiba.
        </Text>
        <Text fontSize="14px" color="muted" lineHeight="1.55" mb="16px">
          Exportáld fájlba, és jelezd a hibát a projekt GitHub-oldalán. A javított verzióban újra megnyílik.
        </Text>
        <Box display="flex" gap="10px" flexWrap="wrap" mb="16px">
          <Box {...btn} onClick={onBack} borderColor="accent" bg="accentSoft" color="accentTx">
            Vissza a karakterekhez
          </Box>
          <Box {...btn} onClick={onExport} borderColor="hair" color="fg">
            Exportálás fájlba
          </Box>
        </Box>
        <Text fontSize="12px" color="fgFaint" wordBreak="break-word">
          {String(error.message || error).slice(0, 300)}
        </Text>
      </Box>
    </Box>
  );
};
