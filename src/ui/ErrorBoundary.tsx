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
    return (
      <Box minH="100%" display="flex" alignItems="center" justifyContent="center" p="24px" bg="page" color="fg">
        <Box maxW="440px" fontFamily="system-ui">
          <Heading fontSize="22px" mb="10px">
            Valami hiba történt
          </Heading>
          <Text fontSize="15px" lineHeight="1.55" mb="8px">
            A karaktereid nem vesztek el: minden módosítás azonnal mentődik ezen az eszközön. Töltsd újra az alkalmazást.
          </Text>
          <Text fontSize="14px" color="muted" lineHeight="1.55" mb="16px">
            Ha a hiba újra előjön, mentsd el a karaktereidet egy fájlba, és jelezd a hibát a projekt GitHub-oldalán.
          </Text>
          <Box display="flex" gap="10px" flexWrap="wrap" mb="16px">
            <Box {...btn} onClick={() => window.location.reload()} borderColor="accent" bg="accentSoft" color="accentTx">
              Újratöltés
            </Box>
            <Box {...btn} onClick={this.saveAll} borderColor="hair" color="fg">
              Karakterek mentése fájlba
            </Box>
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
          A karakter adatai megvannak, semmi sem veszett el: csak a megjelenítése akadt el egy hibán.
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
