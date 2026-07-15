import React, { useState } from "react";
import { Box, Flex, Heading, HStack, Text } from "@chakra-ui/react";
import { Companion, companionIconKey } from "../../model/companions";
import { CompanionIcon } from "./animalIcons";
import { VIT_TOKEN } from "../../model/vitals";
import { NumPadDialog } from "./NumPadDialog";
import { AddCompanionModal } from "./AddCompanionModal";
import { CompanionModal } from "./CompanionModal";
import { Card, FS, FS_SEC, ROWPY } from "./primitives";

const pct = (cur: number, max: number) => (max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0);
const clamp = (n: number, max: number) => Math.max(0, Math.min(n, max));

// A live Ép/Fp bar on a companion row — same look as the character's vitals, its own heal/damage pad.
const VitalBar: React.FC<{ label: string; cur: number; max: number; token: string; onOpen: () => void }> = ({ label, cur, max, token, onOpen }) => (
  <Box as="button" type="button" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onOpen(); }} w="100%" textAlign="left" display="block">
    <HStack justify="space-between" align="baseline" mb="3px" gap="8px">
      <Text fontFamily="system-ui" fontSize="10.5px" letterSpacing=".05em" color="muted">{label}</Text>
      <Text fontSize="12px" fontWeight={600} color={cur === 0 ? "fgFaint" : "fg"} sx={{ fontVariantNumeric: "tabular-nums" }}>{cur} / {max}</Text>
    </HStack>
    <Box h="7px" borderRadius="3px" bg="vitTrack" overflow="hidden"><Box h="100%" w={`${pct(cur, max)}%`} bg={token} borderRadius="3px" transition="width .3s" /></Box>
  </Box>
);

// Heal/damage pad for one of a companion's pools (reuses the vitals numpad).
const VitalPad: React.FC<{ title: string; cur: number; max: number; token: string; onSet: (n: number) => void; onClose: () => void }> = ({ title, cur, max, token, onSet, onClose }) => {
  const set = (n: number) => onSet(clamp(n, max));
  return (
    <NumPadDialog
      title={title}
      readout={<Text as="span" color={cur === 0 ? "bad" : "accentTx"}>{cur} / {max}</Text>}
      topContent={
        <Box h={{ base: "8px", md: "9px" }} borderRadius="3px" bg="vitTrack" overflow="hidden" mb={{ base: "10px", md: "14px" }}>
          <Box h="100%" w={`${pct(cur, max)}%`} bg={token} borderRadius="3px" transition="width .3s" />
        </Box>
      }
      upLabel="+ Gyógyítás" downLabel="− Sebzés"
      onUp={(a) => set(cur + a)} onDown={(a) => set(cur - a)}
      tertiaryLabel={() => "Teljes feltöltés"} onTertiary={() => set(max)}
      onClose={onClose}
    />
  );
};

// Társak — companion creatures. Collapses to a single "+" line when empty (like Állapotok), so it
// costs no space until used. Each row: name + type, live Ép/Fp bars, a one-line combat summary; tap
// the body for the full editable stat block, tap a bar to heal/damage. Deleting lives in that modal
// (a rare action), not on the row.
export const CompanionsCard: React.FC<{ companions: Companion[]; onSet: (companions: Companion[]) => void }> = ({ companions, onSet }) => {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Companion | null>(null);
  const [pad, setPad] = useState<{ id: string; pool: "ep" | "fp" } | null>(null);

  const patch = (id: string, p: Partial<Companion>) => onSet(companions.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const padCompanion = pad ? companions.find((c) => c.id === pad.id) : undefined;

  return (
    <>
      <Card>
        {/* one header row with a single rule — the heading carries no border of its own (SecHead would double it) */}
        <Flex align="center" justify="space-between" gap="10px" pb="6px" mb="6px" borderBottom="1px solid" borderColor="rule">
          <Heading as="h2" fontSize={FS_SEC} fontWeight={700} color="fg">Társak</Heading>
          <Box as="button" type="button" onClick={() => setAdding(true)} title="Társ hozzáadása" aria-label="Társ hozzáadása"
            display="inline-flex" alignItems="center" justifyContent="center" w="26px" h="22px" flexShrink={0}
            borderRadius="6px" border="1px solid" borderColor="fieldBd" color="accentTx" _hover={{ borderColor: "accent", bg: "accentSoft" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </Box>
        </Flex>

        {companions.length === 0 ? (
          <Text fontFamily="ui" fontSize="11.5px" color="fgFaint" py="3px">Nincs társ állat.</Text>
        ) : (
          companions.map((c) => (
            <Box key={c.id} role="button" tabIndex={0} cursor="pointer" onClick={() => setEditing(c)}
              py={ROWPY} px="7px" mx="-7px" mb="4px" borderRadius="8px" border="1px solid" borderColor="hair" _hover={{ bg: "accentSoft" }}>
              <HStack gap="9px" minW={0} align="center">
                <Flex align="center" justify="center" w="30px" h="30px" flexShrink={0} borderRadius="9px" bg="accentSoft" color="accentTx">
                  <CompanionIcon iconKey={companionIconKey(c)} size={19} />
                </Flex>
                <Box minW={0}>
                  <Text color="fg" fontSize={FS} fontWeight={600} noOfLines={1}>{c.name}</Text>
                  <Text fontFamily="ui" fontSize="11.5px" color="muted" noOfLines={1}>{c.species}</Text>
                </Box>
              </HStack>
              <HStack gap="12px" mt="7px" align="flex-end">
                <Box flex="1 1 0"><VitalBar label="ÉP" cur={c.ep} max={c.stats.epMax} token={VIT_TOKEN.hp} onOpen={() => setPad({ id: c.id, pool: "ep" })} /></Box>
                <Box flex="1 1 0"><VitalBar label="FP" cur={c.fp} max={c.stats.fpMax} token={VIT_TOKEN.fp} onOpen={() => setPad({ id: c.id, pool: "fp" })} /></Box>
              </HStack>
              <Text fontFamily="ui" fontSize="11.5px" color="accentTx" mt="6px" noOfLines={1} sx={{ fontVariantNumeric: "tabular-nums" }}>
                KÉ {c.stats.ke} · TÉ {c.stats.te} · VÉ {c.stats.ve}{c.stats.sebzes ? ` · ${c.stats.sebzes}` : ""}
              </Text>
            </Box>
          ))
        )}
      </Card>

      {adding && <AddCompanionModal onAdd={(c) => onSet([...companions, c])} onClose={() => setAdding(false)} />}
      {editing && (
        <CompanionModal companion={editing} onSave={(c) => patch(c.id, c)}
          onDelete={() => onSet(companions.filter((x) => x.id !== editing.id))} onClose={() => setEditing(null)} />
      )}
      {padCompanion && pad && (
        <VitalPad
          title={`${padCompanion.name} — ${pad.pool === "ep" ? "Életerő" : "Fájdalomtűrés"}`}
          cur={pad.pool === "ep" ? padCompanion.ep : padCompanion.fp}
          max={pad.pool === "ep" ? padCompanion.stats.epMax : padCompanion.stats.fpMax}
          token={pad.pool === "ep" ? VIT_TOKEN.hp : VIT_TOKEN.fp}
          onSet={(n) => patch(padCompanion.id, pad.pool === "ep" ? { ep: n } : { fp: n })}
          onClose={() => setPad(null)}
        />
      )}
    </>
  );
};
