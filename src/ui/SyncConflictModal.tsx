import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { ModalShell } from "./Modal";
import { CharacterRecord, VitalKey } from "../model/character";
import { rulesFor } from "../model/rulesVariants";
import { derive } from "../engine/derive";
import { Conflict } from "../state/rosterStore";
import { conflictCopyName } from "../state/driveMerge";

// A character changed differently on two devices (see rosterStore's Conflict): which version stays?
// One conflict at a time; closing puts the decision off (the listed version stays meanwhile, and the
// question comes back the next time the app is opened).

const fmtTime = (ts?: number): string =>
  ts ? new Date(ts).toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "ismeretlen időpontban";

const VITALS: [string, VitalKey][] = [
  ["ÉP", "Ép"],
  ["FP", "Fp"],
  ["Mana", "Mana"],
  ["Kegy", "Kegy"],
  ["Pszi", "Psi"],
];

const COPY_SUFFIX = conflictCopyName("");

// what usually differs at the table: when it was edited, the level, the current vitals
const describe = (r: CharacterRecord, mainName: string): string => {
  const parts = [`módosítva: ${fmtTime(r.updatedAt)}`, `${r.levels.length}. szint`];
  try {
    const d = derive(rulesFor(r), r);
    for (const [k, key] of VITALS) if (d.vitals[key].max > 0) parts.push(`${k} ${d.vitals[key].current}/${d.vitals[key].max}`);
  } catch {
    /* a character the rules engine can't handle: the time and level still tell them apart */
  }
  const name = r.name.endsWith(COPY_SUFFIX) ? r.name.slice(0, -COPY_SUFFIX.length) : r.name;
  return [...(name !== mainName ? [`„${name}”`] : []), ...parts].join(" · ");
};

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
    <Text fontSize="15px" fontWeight={700} color="fg">
      {label}
    </Text>
    <Text fontFamily="system-ui" fontSize="12px" color="muted" mt="2px">
      {detail}
    </Text>
  </Box>
);

export const SyncConflictModal: React.FC<{
  conflict: Conflict;
  remaining: number; // conflicts waiting, this one included
  onResolve: (keep: string) => void; // the id of the version to keep, or "both"
  onClose: () => void;
}> = ({ conflict, remaining, onResolve, onClose }) => {
  const { main, alternatives } = conflict;
  const versions = [main, ...alternatives].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  const label = (r: CharacterRecord, i: number) =>
    `${versions.length === 2 ? (i === 0 ? "Az újabb változat" : "A régebbi változat") : `${i + 1}. változat`}${r === main ? " (most ez látható)" : ""}`;
  const several = alternatives.length > 1;
  return (
    <ModalShell onClose={onClose} width="min(440px, 100%)" zIndex={60}>
      <Box p="22px" overflowY="auto">
        <Heading fontSize="18px" fontWeight={700} color="fg" mb={2}>
          Szinkronütközés
        </Heading>
        <Text fontSize="14px" color="muted" lineHeight="1.55" mb={4}>
          <Text as="span" fontWeight={700} color="fg">
            „{main.name}”
          </Text>{" "}
          {several ? "több eszközön" : "két eszközön"} is módosult, mielőtt szinkronizálódott volna. Melyik változat maradjon?
        </Text>

        {versions.map((r, i) => (
          <ChoiceButton key={r.id} label={label(r, i)} detail={describe(r, main.name)} onClick={() => onResolve(r.id)} />
        ))}
        <ChoiceButton
          label={several ? "Mindegyik megtartása" : "Mindkettő megtartása"}
          detail={
            several
              ? "A többi változat külön karakterként jelenik meg, „(másik változat)” végződéssel."
              : `A másik változat külön karakterként jelenik meg: „${conflictCopyName(alternatives[0].name.endsWith(COPY_SUFFIX) ? alternatives[0].name.slice(0, -COPY_SUFFIX.length) : alternatives[0].name)}”.`
          }
          onClick={() => onResolve("both")}
        />

        <Text fontFamily="system-ui" fontSize="11.5px" color="fgFaint" mt="6px" lineHeight="1.5">
          {remaining > 1 ? `Még ${remaining - 1} további karakternél kell döntened. ` : ""}A bezárással elhalasztod a döntést: addig a most látható
          változat marad, és az alkalmazás következő megnyitásakor újra megkérdezi.
        </Text>
      </Box>
    </ModalShell>
  );
};
