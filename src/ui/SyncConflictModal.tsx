import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { ModalShell } from "./Modal";
import { ConflictPair } from "../state/cloudSync";
import { ConflictChoice } from "../state/useRoster";
import { CharacterRecord } from "../model/character";

// Sync conflict resolver: the same character changed both on this device and in the cloud since
// they last agreed, so the merge can't pick a side safely. Shown one conflict at a time; closing
// means "decide later" (the conflict resurfaces on the next merge, local version stays on screen).

const fmtTime = (ts?: number): string =>
  ts ? new Date(ts).toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "ismeretlen";

const describe = (r: CharacterRecord): string => `${r.levels.length}. szint · módosítva: ${fmtTime(r.updatedAt)}`;

const ChoiceButton: React.FC<{ label: string; detail: string; onClick: () => void }> = ({ label, detail, onClick }) => (
  <Box
    as="button"
    type="button"
    onClick={onClick}
    display="block"
    w="100%"
    textAlign="left"
    px="15px"
    py="11px"
    mb="9px"
    borderRadius="10px"
    border="1px solid"
    borderColor="hair"
    bg="fieldBg"
    _hover={{ borderColor: "accent", bg: "accentSoft" }}
  >
    <Text fontSize="15px" fontWeight={700} color="fg">{label}</Text>
    <Text fontFamily="system-ui" fontSize="12px" color="muted" mt="2px">{detail}</Text>
  </Box>
);

export const SyncConflictModal: React.FC<{
  conflict: ConflictPair;
  remaining: number; // total pending conflicts including this one
  onResolve: (choice: ConflictChoice) => void;
  onClose: () => void;
}> = ({ conflict, remaining, onResolve, onClose }) => (
  <ModalShell onClose={onClose} width="min(440px, 100%)" zIndex={60}>
    <Box p="22px">
      <Heading fontSize="18px" fontWeight={700} color="fg" mb={2}>Szinkronütközés</Heading>
      <Text fontSize="14px" color="muted" lineHeight="1.55" mb={4}>
        <Text as="span" fontWeight={700} color="fg">{conflict.local.name}</Text> ezen az eszközön és egy másik eszközön is
        módosult azóta, hogy utoljára szinkronizálva volt. Melyik változat maradjon?
      </Text>

      <ChoiceButton label="Ezen az eszközön lévő" detail={describe(conflict.local)} onClick={() => onResolve("local")} />
      <ChoiceButton label="Felhőben lévő (másik eszköz)" detail={describe(conflict.cloud)} onClick={() => onResolve("cloud")} />
      <ChoiceButton
        label="Mindkettő megtartása"
        detail={`A felhőbeli változat külön karakterként jelenik meg: „${conflict.cloud.name} (felhő)”`}
        onClick={() => onResolve("both")}
      />

      <Text fontFamily="system-ui" fontSize="11.5px" color="fgFaint" mt="6px">
        {remaining > 1 ? `Még ${remaining - 1} további ütközés vár döntésre. ` : ""}
        A bezárás elhalasztja a döntést — addig az eszközön lévő változatot látod.
      </Text>
    </Box>
  </ModalShell>
);
