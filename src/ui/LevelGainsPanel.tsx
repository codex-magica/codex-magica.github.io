import React from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { CharacterRecord, getLevelRecord } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { CombatChannel, Resource } from "../model/effects";
import { Stepper } from "./Stepper";
import { PanelHeading, SubHeader } from "./controls";
import { FS_NAME, ROW_PY } from "./tokens";

interface Props {
  level: number;
  record: CharacterRecord;
  derived: DerivedCharacter;
  onGrantedHm: (level: number, channel: CombatChannel, amount: number) => void;
}

const CHANNELS: CombatChannel[] = ["KÉ", "TÉ", "VÉ", "CÉ"];
const RES_LABEL: Record<Resource, string> = { Mana: "Mana", Psi: "Pszi", Kegy: "Kegy", HM: "HM", Fp: "Fp", Kp: "Kp" };

// The character's per-level gains from skill levels (and, in future, other level-up abilities). Resource
// grants (Mana/Pszi/Kegy/Fp) already fold into the pool totals on the Pontvásárlás panel; HM grants are
// FREE and distributed to KÉ/TÉ/VÉ/CÉ right here.
export const LevelGainsPanel: React.FC<Props> = ({ level, record, derived, onGrantedHm }) => {
  const lvl = getLevelRecord(record, level);
  const grants = derived.resourceGrantsByLevel[level - 1] ?? [];
  const hmGranted = derived.pools.hmGrantedByLevel[level - 1] ?? 0;
  const grantedHmOf = (c: CombatChannel) => lvl?.grantedHmAssignments?.find((h) => h.channel === c)?.amount ?? 0;
  const grantedAssigned = lvl?.grantedHmAssignments?.reduce((s, h) => s + h.amount, 0) ?? 0;
  const hmLeft = hmGranted - grantedAssigned;

  const nonHmGrants = grants.filter((g) => g.resource !== "HM");
  const hmGrants = grants.filter((g) => g.resource === "HM");
  const nothing = grants.length === 0 && hmGranted === 0;

  return (
    <Box>
      <PanelHeading title="Szintlépési bónuszok" level={level} />
      <Text fontFamily="system-ui" fontSize="12px" lineHeight="1.5" color="fgFaint" mb={2} maxW="62ch">
        Speciális képzettségek szintje és egyéb szintlépési bónuszok.
      </Text>

      {nothing && <Text fontFamily="system-ui" fontSize="12px" color="fgFaint" py="6px">Nincsenek szintlépési bónuszok ezen a szinten.</Text>}

      {/* Pool/Fp grants — informational; already counted in the pool totals on the Pontvásárlás panel. */}
      {(nonHmGrants.length > 0 || hmGrants.length > 0) && <SubHeader>Képzettségbónuszok (/ szint)</SubHeader>}
      {[...nonHmGrants, ...hmGrants].map((g, i) => (
        <HStack key={i} py={ROW_PY} borderBottom="1px solid" borderColor="hairSoft" align="center" spacing="9px">
          <Text fontSize={FS_NAME} color="fg" noOfLines={1}>{g.source}</Text>
          <Box flex="1" minW="8px" />
          <Text fontFamily="system-ui" fontSize="12.5px" fontWeight={700} color="accentTx" whiteSpace="nowrap" sx={{ fontVariantNumeric: "tabular-nums" }}>
            +{g.amount} {RES_LABEL[g.resource]}
          </Text>
        </HStack>
      ))}

      {/* HM distribution — the free granted HM, allocated to combat channels at no KAP cost. */}
      {hmGranted > 0 && (
        <>
          <SubHeader trailing={
            <Text fontFamily="system-ui" fontSize="11px" fontWeight={700} color={hmLeft < 0 ? "bad" : hmLeft === 0 ? "fgFaint" : "accentTx"} sx={{ fontVariantNumeric: "tabular-nums" }}>
              {hmLeft} / {hmGranted} szabad
            </Text>
          }>
            Kapott HM elosztása (ingyen)
          </SubHeader>
          {CHANNELS.map((c) => {
            const v = grantedHmOf(c);
            return (
              <HStack key={c} py={ROW_PY} borderBottom="1px solid" borderColor="hair" align="center" spacing="9px">
                <Text fontSize={FS_NAME} color="fg" noOfLines={1}>{c} <Text as="span" color="fgFaint">(= {derived.combat[c]})</Text></Text>
                <Box flex="1" minW="8px" />
                <Stepper value={v} incLabel="0" onDec={() => onGrantedHm(level, c, Math.max(0, v - 1))} onInc={() => onGrantedHm(level, c, v + 1)} decDisabled={v <= 0} incDisabled={hmLeft <= 0} />
              </HStack>
            );
          })}
        </>
      )}
    </Box>
  );
};

export default LevelGainsPanel;
