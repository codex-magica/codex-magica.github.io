import React from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { Stat } from "../model/attributes";
import { DerivedCharacter } from "../engine/types";
import { COMBAT_INFO, combatBreakdown } from "../model/combatInfo";
import { ATTRIBUTE_INFO } from "../model/attributeInfo";
import { ModalShell } from "./Modal";

// Minimal inline-markdown: renders **bold** spans (the value-ladder range labels), leaves the rest as text.
const RichText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\*\*[^*]+\*\*)/g).map((seg, i) =>
      seg.startsWith("**") && seg.endsWith("**")
        ? <Text as="span" key={i} fontWeight={700} color="accentTx">{seg.slice(2, -2)}</Text>
        : <React.Fragment key={i}>{seg}</React.Fragment>
    )}
  </>
);

// A small "how it was calculated" card: named parts summing to the total.
const CalcCard: React.FC<{ parts: { label: string; value: number }[]; totalLabel: string; total: number }> = ({ parts, totalLabel, total }) => (
  <Box mt="12px" mb="14px" px="14px" py="11px" borderRadius="10px" bg="band" border="1px solid" borderColor="hair">
    {parts.map((p, i) => (
      <HStack key={i} justify="space-between" py="3px">
        <Text fontSize="13px" color="muted">{i > 0 ? "+ " : ""}{p.label}</Text>
        <Text fontSize="13.5px" fontWeight={600} color="fg" sx={{ fontVariantNumeric: "tabular-nums" }}>{p.value}</Text>
      </HStack>
    ))}
    <Box h="1px" bg="rule" my="6px" />
    <HStack justify="space-between" py="3px">
      <Text fontSize="13px" fontWeight={700} color="accentTx">{totalLabel}</Text>
      <Text fontSize="15px" fontWeight={700} color="accentTx" sx={{ fontVariantNumeric: "tabular-nums" }}>{total}</Text>
    </HStack>
  </Box>
);

// Harcérték (KÉ/TÉ/VÉ/CÉ/MME/AME/Sebzésbónusz) modal: formula with substituted values + book definition.
export const CombatInfoModal: React.FC<{ statKey: string; derived: DerivedCharacter; onClose: () => void }> = ({ statKey, derived, onClose }) => {
  const info = COMBAT_INFO[statKey];
  if (!info) return null;
  const total = (["KÉ", "TÉ", "VÉ", "CÉ"] as const).includes(statKey as any)
    ? derived.combat[statKey as "KÉ"]
    : ((derived.derived as any)[statKey] as number) ?? 0;
  const parts = combatBreakdown(info, derived.effectiveStats, total, derived.provenance[statKey] ?? []);
  return (
    <ModalShell onClose={onClose} width="min(480px, 100%)" maxH="76vh" zIndex={60} overlayPad="28px">
      <Box p="20px 22px">
        <Text fontSize="17px" fontWeight={700} color="fg">{info.label} <Text as="span" color="fgFaint" fontWeight={500}>({info.key})</Text></Text>
        <CalcCard parts={parts} totalLabel={info.key} total={total} />
        <Text fontSize="13.5px" color="fg" lineHeight="1.65">{info.def}</Text>
      </Box>
    </ModalShell>
  );
};

// Readable labels for the engine's stat-provenance sources.
const statSourceLabel = (source: string): string =>
  source === "alap" ? "Alap (pontelosztás)"
  : source.replace(/^kap L(\d+)$/, "KAP-vásárlás ($1. szint)")
      .replace(/^km L(\d+)$/, "KM módosítás ($1. szint)")
      .replace(/^age L(\d+)$/, "Életkor ($1. szint)")
      .replace(/^race L(\d+)$/, "Faji módosító ($1. szint)")
      .replace(/^skillFok4 \((.+)\) L(\d+)$/, "$1 4. fok (+1)");

// Tulajdonság modal: book description (+ value ladder). With `derived` it also shows the per-source
// breakdown (base point-buy, KAP buys, fok-4 skill bonuses, backgrounds…); without it, text only
// (the attribute editor in the creator).
export const StatInfoModal: React.FC<{ stat: Stat; derived?: DerivedCharacter; onClose: () => void }> = ({ stat, derived, onClose }) => {
  const text = ATTRIBUTE_INFO[stat];
  const contributions = derived?.provenance[stat] ?? [];
  const total = derived?.effectiveStats[stat];
  const parts = contributions.map((c) => ({ label: statSourceLabel(c.source), value: c.amount }));
  // Reconcile: anything untracked (shouldn't happen) shows as "Egyéb".
  if (derived != null && total != null) {
    const residual = total - parts.reduce((a, p) => a + p.value, 0);
    if (residual !== 0) parts.push({ label: "Egyéb", value: residual });
  }
  return (
    <ModalShell onClose={onClose} width="min(560px, 100%)" maxH="82vh" zIndex={60} overlayPad="28px">
      <Box p="20px 22px" overflowY="auto">
        <Text fontSize="17px" fontWeight={700} color="fg">{stat}</Text>
        {derived != null && total != null && <CalcCard parts={parts} totalLabel={stat} total={total} />}
        <Text fontSize="13.5px" color="fg" lineHeight="1.65" mt={derived ? 0 : "10px"} whiteSpace="pre-wrap"><RichText text={text} /></Text>
      </Box>
    </ModalShell>
  );
};
