import React, { useState } from "react";
import { Box, HStack, Select, Text } from "@chakra-ui/react";
import { CharacterRecord, getLevelRecord } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { CombatChannel, Pool, Resource } from "../model/effects";
import { STAT_KEYS, Stat } from "../model/attributes";
import { RACES } from "../model/races";
import { CLASSES } from "../model/classes";
import { ATTR_KAP_COST, KAP_RATE } from "../engine/constants";
import { Stepper } from "./Stepper";
import { DeleteButton, KapReadout, PanelHeading, SubHeader } from "./controls";
import { FIELD_SX, FS_NAME, ROW_PY } from "./tokens";
import { CombatInfoModal } from "./InfoModals";

interface Props {
  level: number;
  record: CharacterRecord;
  derived: DerivedCharacter;
  onHm: (level: number, channel: CombatChannel, amount: number) => void;
  onResource: (level: number, target: Resource, points: number) => void;
  onStat: (level: number, stat: Stat, amount: number) => void;
}

const CHANNELS: CombatChannel[] = ["KÉ", "TÉ", "VÉ", "CÉ"];
const PSEUDO: { pool: Pool; label: string }[] = [
  { pool: "Mana", label: "Mana (Mp)" },
  { pool: "Psi", label: "Pszi (Ψp)" },
  { pool: "Kegy", label: "Kegy" },
];

export const PointBuyPanel: React.FC<Props> = ({ level, record, derived, onHm, onResource, onStat }) => {
  const lvl = getLevelRecord(record, level);
  const kap = derived.pools.kapBalanceByLevel[level - 1] ?? 0;

  const hmOf = (c: CombatChannel) => lvl?.hmAssignments.find((h) => h.channel === c)?.amount ?? 0;
  const resOf = (t: Resource) => lvl?.allocations.find((a) => a.target === t)?.points ?? 0;
  const statBuyOf = (s: Stat) => lvl?.statIncreases.find((si) => si.stat === s && si.source === "kap")?.amount ?? 0;
  const caps = RACES[record.race]?.statLimits;
  const existingPools = PSEUDO.filter(({ pool }) => derived.pools.magic[pool]);

  const suggested = CLASSES[record.class]?.suggestedAllocation;
  const [adding, setAdding] = useState(false);
  // Clicked harcérték label → formula-with-values + definition modal.
  const [combatInfo, setCombatInfo] = useState<string | null>(null);
  const boughtStats = STAT_KEYS.filter((s) => statBuyOf(s) > 0);
  // Effective ceiling: racial cap RAISED by Adottság points (absolute 20) — matches the engine's cap check.
  const maxOf = (s: Stat) => (caps ? Math.min(20, caps[s] + (record.adottsag?.[s] ?? 0)) : 20);
  const availableForDraft = STAT_KEYS.filter((s) => statBuyOf(s) === 0 && derived.effectiveStats[s] < maxOf(s));

  const buyRow = (
    key: string,
    label: React.ReactNode,
    value: React.ReactNode,
    incLabel: string,
    onDec: () => void,
    onInc: () => void,
    decDisabled: boolean,
    incDisabled: boolean,
    trailing?: React.ReactNode
  ) => (
    <HStack key={key} py={ROW_PY} borderBottom="1px solid" borderColor="hair" align="center" spacing="9px">
      <Text fontSize={FS_NAME} color="fg" noOfLines={1}>{label}</Text>
      <Box flex="1" minW="8px" />
      <Stepper value={value} incLabel={incLabel} onDec={onDec} onInc={onInc} decDisabled={decDisabled} incDisabled={incDisabled} />
      {trailing}
    </HStack>
  );

  const selectStyle = { ...FIELD_SX, size: "sm" as const };

  return (
    <Box>
      <PanelHeading title="Pontvásárlás" level={level} trailing={<KapReadout kap={kap} />} />
      <Text fontFamily="system-ui" fontSize="12px" lineHeight="1.5" color="fgFaint" mb={suggested ? 1 : 2} maxW="62ch">
        Közös KAP-ból (Int + 50 − hátterek) a Képzettségek panellel.
      </Text>
      {suggested && (
        <Text fontFamily="system-ui" fontSize="12px" lineHeight="1.5" color="fgFaint" mb={2} maxW="62ch">
          A könyv ajánlott elosztása ({record.class}): {Object.entries(suggested).map(([k, v]) => `${k === "Psi" ? "Pszi" : k} ${v}`).join(" · ")}
        </Text>
      )}

      {/* Harcérték (HM) + Fp — extra HM bought with KAP. The FREE skill-granted HM is distributed in the
          Szintlépési nyereségek panel; the (= N) value below is the total combat value (granted + bought). */}
      <SubHeader>Harcérték (HM · {KAP_RATE.HM} KAP · extra)</SubHeader>
      {CHANNELS.map((c) => {
        const v = hmOf(c);
        return buyRow(
          c,
          <Box as="button" type="button" onClick={() => setCombatInfo(c)} title="Hogyan számolódik?" textAlign="left" _hover={{ color: "accentTx", textDecoration: "underline" }}>
            {c} <Text as="span" color="fgFaint">(= {derived.combat[c]})</Text>
          </Box>,
          v,
          String(KAP_RATE.HM),
          () => onHm(level, c, Math.max(0, v - 1)),
          () => onHm(level, c, v + 1),
          v <= 0,
          kap < KAP_RATE.HM
        );
      })}
      {buyRow(
        "Fp",
        <>Fp <Text as="span" color="fgFaint">(= {derived.derived.Fp})</Text></>,
        resOf("Fp"),
        String(KAP_RATE.Fp),
        () => onResource(level, "Fp", Math.max(0, resOf("Fp") - 1)),
        () => onResource(level, "Fp", resOf("Fp") + 1),
        resOf("Fp") <= 0,
        kap < KAP_RATE.Fp
      )}

      {/* Mágikus pontok — only pools the character has */}
      {existingPools.length > 0 && (
        <>
          <SubHeader>Mágikus pontok</SubHeader>
          {existingPools.map(({ pool, label }) =>
            buyRow(
              pool,
              label,
              resOf(pool),
              String(KAP_RATE[pool]),
              () => onResource(level, pool, Math.max(0, resOf(pool) - 1)),
              () => onResource(level, pool, resOf(pool) + 1),
              resOf(pool) <= 0,
              kap < KAP_RATE[pool]
            )
          )}
        </>
      )}

      {/* Tulajdonság (+1 · 20 KAP) — progressively disclosed list */}
      <SubHeader
        trailing={
          <Box
            as="button"
            type="button"
            w="34px"
            h="34px"
            border="1px solid"
            borderColor="accent"
            bg="accentSoft"
            color="accentTx"
            borderRadius="9px"
            fontWeight={700}
            fontSize="18px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            opacity={adding || availableForDraft.length === 0 || kap < ATTR_KAP_COST ? 0.45 : 1}
            onClick={() => !(adding || availableForDraft.length === 0 || kap < ATTR_KAP_COST) && setAdding(true)}
          >
            +
          </Box>
        }
      >
        Tulajdonság (+1 · {ATTR_KAP_COST} KAP)
      </SubHeader>
      {boughtStats.map((s) => {
        const amount = statBuyOf(s);
        const atCap = derived.effectiveStats[s] >= maxOf(s);
        return buyRow(
          s,
          <>{s} <Text as="span" color="fgFaint">(= {derived.effectiveStats[s]})</Text></>,
          `+${amount}`,
          String(ATTR_KAP_COST),
          () => onStat(level, s, amount - 1),
          () => onStat(level, s, amount + 1),
          amount <= 1,
          atCap || kap < ATTR_KAP_COST,
          <DeleteButton onClick={() => onStat(level, s, 0)} />
        );
      })}
      {adding && (
        <HStack py={ROW_PY} borderBottom="1px solid" borderColor="hair" align="center" spacing="9px">
          <Select
            {...selectStyle}
            placeholder="válassz tulajdonságot…"
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onStat(level, e.target.value as Stat, 1);
                setAdding(false);
              }
            }}
          >
            {availableForDraft.map((o) => (
              <option key={o} value={o}>{o} ({derived.effectiveStats[o]})</option>
            ))}
          </Select>
          <Box flex="1" minW="8px" />
          <DeleteButton onClick={() => setAdding(false)} />
        </HStack>
      )}

      {combatInfo && <CombatInfoModal statKey={combatInfo} derived={derived} onClose={() => setCombatInfo(null)} />}
    </Box>
  );
};
