import React, { useState } from "react";
import { useDraftWhile } from "./draftContext";
import { Box, Flex, Heading, HStack, Text } from "@chakra-ui/react";
import { Companion, companionIconKey } from "../../model/companions";
import { CompanionIcon } from "./animalIcons";
import { VIT_TOKEN } from "../../model/vitals";
import { VitalBar, VitalPad } from "./companionVitals";
import { AddCompanionModal } from "./AddCompanionModal";
import { CompanionModal } from "./CompanionModal";
import { ReorderList } from "./ReorderList";
import { ConfirmModal } from "../ConfirmModal";
import { Card, EditRow, PanelAddButton, PanelEditButton, FS, FS_SEC, ROWPY } from "./primitives";

// Társak — companion creatures. Collapses to a single "+" line when empty (like Állapotok), so it
// costs no space until used. Each row: name + type, live Ép/Fp bars, a one-line combat summary; tap
// the body for the full editable stat block, tap a bar to heal/damage. Deleting lives in that modal
// (a rare action), not on the row.
export const CompanionsCard: React.FC<{ companions: Companion[]; onSet: (companions: Companion[]) => void }> = ({ companions, onSet }) => {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Companion | null>(null);
  const [pad, setPad] = useState<{ id: string; pool: "ep" | "fp" } | null>(null);
  // The header pencil flips the list into edit mode: add / delete / drag-reorder appear only there.
  const [editMode, setEditMode] = useState(false);
  const [removing, setRemoving] = useState<Companion | null>(null);
  
  const patch = (id: string, p: Partial<Companion>) => onSet(companions.map((c) => (c.id === id ? { ...c, ...p } : c)));
  // the open window saves the whole companion; if a sync removed it meanwhile (deleted on another
  // device), the edits bring it back instead of going nowhere
  const saveEdited = (c: Companion) => onSet(companions.some((x) => x.id === c.id) ? companions.map((x) => (x.id === c.id ? c : x)) : [...companions, c]);
  // (a companion deleted on another device while its pad was open: the pad closes, and the draft below
  // follows the shown pad, not the `pad` state, so the sheet doesn't think an editor is still open)
  const padCompanion = pad ? companions.find((c) => c.id === pad.id) : undefined;
  useDraftWhile(adding || editing !== null || padCompanion !== undefined);

  return (
    <>
      <Card>
        {/* one header row with a single rule — the heading carries no border of its own (SecHead would double it) */}
        <Flex align="center" justify="space-between" gap="10px" pb="6px" mb="6px" borderBottom="1px solid" borderColor="rule">
          <Heading as="h2" fontSize={FS_SEC} fontWeight={700} color="fg">Társak</Heading>
          <PanelEditButton editing={editMode} onToggle={() => setEditMode(!editMode)} label="Társak szerkesztése" />
        </Flex>

        {companions.length === 0 && !editMode && (
          <Text fontFamily="ui" fontSize="11.5px" color="fgFaint" py="3px">Nincs társállat.</Text>
        )}
        {!editMode && companions.map((c) => (
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
              <Box flex="1 1 0"><VitalBar label="ÉP" cur={c.ep} max={c.stats.epMax} token={VIT_TOKEN.hp} stop onOpen={() => setPad({ id: c.id, pool: "ep" })} /></Box>
              <Box flex="1 1 0"><VitalBar label="FP" cur={c.fp} max={c.stats.fpMax} token={VIT_TOKEN.fp} stop onOpen={() => setPad({ id: c.id, pool: "fp" })} /></Box>
            </HStack>
            <Text fontFamily="ui" fontSize="11.5px" color="accentTx" mt="6px" noOfLines={1} sx={{ fontVariantNumeric: "tabular-nums" }}>
              KÉ {c.stats.ke} · TÉ {c.stats.te} · VÉ {c.stats.ve}{c.stats.sebzes ? ` · ${c.stats.sebzes}` : ""}
            </Text>
          </Box>
        ))}
        {editMode && (
          <>
            <ReorderList
              items={companions}
              keyOf={(c) => c.id}
              onReorder={onSet}
              row={(c, grip) => (
                <EditRow onDelete={() => setRemoving(c)} deleteLabel={`${c.name} törlése`} grip={grip}>
                  <HStack gap="8px" minW={0} align="center">
                    <Flex align="center" justify="center" w="22px" h="22px" flexShrink={0} borderRadius="7px" bg="accentSoft" color="accentTx">
                      <CompanionIcon iconKey={companionIconKey(c)} size={14} />
                    </Flex>
                    {/* the given name wins the space — the species truncates first */}
                    <Text color="fg" fontSize={FS} noOfLines={1} flexShrink={0} maxW="65%">{c.name}</Text>
                    <Text fontFamily="ui" fontSize="11.5px" color="muted" noOfLines={1} flex="1 1 auto" minW={0}>{c.species}</Text>
                  </HStack>
                </EditRow>
              )}
            />
            <PanelAddButton onClick={() => setAdding(true)}>+ Társ hozzáadása</PanelAddButton>
          </>
        )}
      </Card>

      {adding && <AddCompanionModal onAdd={(c) => onSet([...companions, c])} onClose={() => setAdding(false)} />}
      {removing && (
        <ConfirmModal title="Társ törlése" confirmLabel="Törlés"
          onConfirm={() => { onSet(companions.filter((x) => x.id !== removing.id)); setRemoving(null); }}
          onClose={() => setRemoving(null)}>
          Biztosan törlöd a(z) <b>{removing.name}</b> nevű társat? Ez nem visszavonható.
        </ConfirmModal>
      )}
      {editing && (
        <CompanionModal companion={editing} onSave={saveEdited}
          onDelete={() => onSet(companions.filter((x) => x.id !== editing.id))} onClose={() => setEditing(null)} />
      )}
      {padCompanion && pad && (
        <VitalPad
          title={`${padCompanion.name} — ${pad.pool === "ep" ? "Életpont" : "Fájdalompont"}`}
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
