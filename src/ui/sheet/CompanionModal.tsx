import React, { useState, useEffect, useRef } from "react";
import { Box, Button, Flex, Heading, HStack, Input, Text } from "@chakra-ui/react";
import { ModalShell, ModalCloseButton } from "../Modal";
import { ConfirmModal } from "../ConfirmModal";
import { Companion, CompanionStats, companionIconKey } from "../../model/companions";
import { CompanionIcon } from "./animalIcons";
import { IconPicker } from "./IconPicker";
import { VIT_TOKEN } from "../../model/vitals";
import { VitalBar, VitalPad, clampVital } from "./companionVitals";
import { QuietPopover } from "../QuietPopover";
import { FS_SUB } from "./primitives";

const field = {
  size: "sm" as const, bg: "fieldBg", borderColor: "fieldBd", borderRadius: "7px", color: "fg",
  fontSize: "13.5px", focusBorderColor: "accent",
};

// ── view-mode building blocks ────────────────────────────────────────────────
// A prominent read-only combat value.
const ViewTile: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box bg="accentSoft" borderRadius="10px" py="9px" px="6px" textAlign="center">
    <Text fontFamily="ui" fontSize="10px" fontWeight={700} letterSpacing=".08em" textTransform="uppercase" color="accentTx" opacity={0.8}>{label}</Text>
    <Text fontSize="22px" fontWeight={700} color="accentTx" lineHeight="1.15" mt="2px" sx={{ fontVariantNumeric: "tabular-nums" }}>{value}</Text>
  </Box>
);
const SubHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em" mt="16px" mb="6px">{children}</Box>
);
// A compact row of label/value pairs shown side by side (the attack details).
const StatTrio: React.FC<{ items: { label: string; value: React.ReactNode }[] }> = ({ items }) => (
  <Box display="grid" gridTemplateColumns={`repeat(${items.length}, 1fr)`} gap="10px">
    {items.map((it) => (
      <Box key={it.label} minW={0}>
        <Text fontFamily="ui" fontSize="11px" color="muted" mb="2px" noOfLines={1}>{it.label}</Text>
        <Text fontSize="13.5px" color="fg" noOfLines={1} sx={{ fontVariantNumeric: "tabular-nums" }}>{it.value === "" || it.value == null ? "—" : it.value}</Text>
      </Box>
    ))}
  </Box>
);

// ── edit-mode building blocks ────────────────────────────────────────────────
const StatTile: React.FC<{ label: string; value: string; onChange: (v: string) => void; numeric?: boolean; tone?: "combat" | "vital" }> = ({ label, value, onChange, numeric, tone = "combat" }) => (
  <Box bg="accentSoft" borderRadius="10px" py="7px" px="6px" textAlign="center" border="1px solid" borderColor="transparent" _focusWithin={{ borderColor: "accent" }}>
    <Text fontFamily="ui" fontSize="10px" fontWeight={700} letterSpacing=".08em" textTransform="uppercase" color="accentTx" opacity={0.8}>{label}</Text>
    <Input value={value} onChange={(e) => onChange(e.target.value)} inputMode={numeric ? "numeric" : undefined}
      variant="unstyled" textAlign="center" fontWeight={700} color={tone === "vital" ? "fg" : "accentTx"}
      fontSize={numeric ? "20px" : "16px"} h="26px" mt="1px" sx={{ fontVariantNumeric: "tabular-nums" }} />
  </Box>
);
const MiniField: React.FC<{ label: string; value: string; onChange: (v: string) => void; numeric?: boolean }> = ({ label, value, onChange, numeric }) => (
  <Box>
    <Text fontFamily="ui" fontSize="11px" color="muted" mb="3px">{label}</Text>
    <Input {...field} w="100%" value={value} inputMode={numeric ? "numeric" : undefined}
      onChange={(e) => onChange(e.target.value)} sx={numeric ? { fontVariantNumeric: "tabular-nums" } : undefined} />
  </Box>
);

// The companion sheet. Opens as a read-only creature card (glanceable stat block, live Ép/Fp bars);
// the pencil switches to an editable form. Edits persist live (like the rest of the app); Ép/Fp are
// clamped to their maxes for display and on save, but the stored current is kept raw so a later
// max increase restores it.
export const CompanionModal: React.FC<{ companion: Companion; onSave: (c: Companion) => void; onDelete: () => void; onClose: () => void }> = ({ companion, onSave, onDelete, onClose }) => {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [name, setName] = useState(companion.name);
  const [note, setNote] = useState(companion.note ?? "");
  const [icon, setIcon] = useState(companionIconKey(companion));
  const [stats, setStats] = useState<CompanionStats>(companion.stats);
  const [epMax, setEpMax] = useState(String(companion.stats.epMax));
  const [fpMax, setFpMax] = useState(String(companion.stats.fpMax));
  const [ep, setEp] = useState(companion.ep);
  const [fp, setFp] = useState(companion.fp);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pad, setPad] = useState<"ep" | "fp" | null>(null);

  const n = (s: string) => parseInt(s, 10) || 0;
  const num = (k: keyof CompanionStats) => (v: string) => setStats((s) => ({ ...s, [k]: parseInt(v, 10) || 0 }));
  const txt = (k: keyof CompanionStats) => (v: string) => setStats((s) => ({ ...s, [k]: v }));
  const epMaxN = n(epMax), fpMaxN = n(fpMax);
  const epCur = clampVital(ep, epMaxN), fpCur = clampVital(fp, fpMaxN);
  const displayName = name.trim() || companion.name;
  // Read-only view shows only the media the creature can actually use (0 = can't move that way).
  const speeds = [
    { label: "Szárazföld", value: stats.sebSzaraz },
    { label: "Víz", value: stats.sebViz },
    { label: "Levegő", value: stats.sebLevego },
  ].filter((s) => (s.value || 0) > 0);

  const assemble = (): Companion => ({
    ...companion, name: displayName, note: note.trim() || undefined, icon,
    ep: clampVital(ep, epMaxN), fp: clampVital(fp, fpMaxN),
    stats: { ...stats, epMax: epMaxN, fpMax: fpMaxN },
  });

  // Persist live on any change (matches the rest of the app). A ref keeps the effect from re-firing
  // just because the parent re-created onSave, and the first render is skipped (nothing changed yet).
  const saveRef = useRef(onSave); saveRef.current = onSave;
  const first = useRef(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (first.current) { first.current = false; return; } saveRef.current(assemble()); }, [name, note, icon, stats, epMax, fpMax, ep, fp]);

  return (
    <ModalShell onClose={onClose} width="min(430px, 100%)" maxH="86vh">
      {/* hero — the icon is a picker button only while editing */}
      <Box position="relative" px="20px" pt="18px" pb="13px" borderBottom="1px solid" borderColor="rule">
        <ModalCloseButton onClose={onClose} />
        <HStack gap="12px" align="center">
          <Box position="relative" flexShrink={0}>
            {mode === "edit" ? (
              <Flex as="button" type="button" onClick={() => setPickerOpen((o) => !o)} title="Ikon módosítása" aria-label="Ikon módosítása"
                align="center" justify="center" w="46px" h="46px" borderRadius="13px" bg="accentSoft" color="accentTx"
                border="1px solid" borderColor="transparent" _hover={{ borderColor: "accent" }}>
                <CompanionIcon iconKey={icon} size={28} />
              </Flex>
            ) : (
              <Flex align="center" justify="center" w="46px" h="46px" borderRadius="13px" bg="accentSoft" color="accentTx">
                <CompanionIcon iconKey={icon} size={28} />
              </Flex>
            )}
            {pickerOpen && (
              <QuietPopover align="left" title="Ikon" minW="272px" maxW="272px" onClose={() => setPickerOpen(false)}>
                <IconPicker value={icon} onChange={(k) => { setIcon(k); setPickerOpen(false); }} />
              </QuietPopover>
            )}
          </Box>
          <Box minW={0}>
            <Heading as="h3" fontSize={{ base: "19px", md: "20px" }} fontWeight={700} color="fg" noOfLines={1}>{displayName}</Heading>
            <Text fontFamily="ui" fontSize="12px" color="muted" noOfLines={1}>{companion.species}</Text>
          </Box>
        </HStack>
      </Box>

      <Box flex="1 1 auto" overflowY="auto" overflowX="hidden" px="20px" py="16px">
        {mode === "view" ? (
          <>
            {/* live vitals */}
            <HStack gap="16px" align="flex-end" mb="16px">
              <Box flex="1 1 0"><VitalBar label="Életerő" cur={epCur} max={epMaxN} token={VIT_TOKEN.hp} onOpen={() => setPad("ep")} /></Box>
              <Box flex="1 1 0"><VitalBar label="Fájdalom" cur={fpCur} max={fpMaxN} token={VIT_TOKEN.fp} onOpen={() => setPad("fp")} /></Box>
            </HStack>

            {/* the combat trio */}
            <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap="8px">
              <ViewTile label="KÉ" value={stats.ke} />
              <ViewTile label="TÉ" value={stats.te} />
              <ViewTile label="VÉ" value={stats.ve} />
            </Box>

            <SubHead>Támadás</SubHead>
            <StatTrio items={[
              { label: "Sebzés", value: stats.sebzes },
              { label: "Időigény", value: stats.idoigeny },
              { label: "Méretkategória", value: stats.meret },
            ]} />

            {speeds.length > 0 && (
              <>
                <SubHead>Sebesség</SubHead>
                <StatTrio items={speeds.map((s) => ({ label: s.label, value: String(s.value) }))} />
              </>
            )}

            <SubHead>Ellenállások</SubHead>
            <StatTrio items={[
              { label: "Mentál ME", value: String(stats.mentalME) },
              { label: "Asztrál ME", value: String(stats.asztralME) },
              { label: "Méreg", value: String(stats.meregEllenallas) },
            ]} />

            {note.trim() && (
              <Box mt="15px" bg="accentSoft" borderRadius="8px" px="12px" py="9px">
                <Text fontFamily="ui" fontSize="12.5px" color="fg" fontStyle="italic">{note.trim()}</Text>
              </Box>
            )}

            <Flex justify="flex-end" mt="18px">
              <Button size="sm" bg="accent" color="onAccent" _hover={{ opacity: 0.9 }} onClick={() => setMode("edit")} leftIcon={<PencilIcon />}>
                Szerkesztés
              </Button>
            </Flex>
          </>
        ) : (
          <>
            <Text fontFamily="ui" fontSize="12px" color="muted" mb="4px">Név</Text>
            <Input {...field} value={name} onChange={(e) => setName(e.target.value)} w="100%" mb="16px" />

            <Box fontSize={FS_SUB} fontWeight={700} color="muted" pb="3px" mb="9px" borderBottom="1px solid" borderColor="hair">Életerő</Box>
            <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap="8px" mb="16px">
              <StatTile label="Ép" value={epMax} onChange={setEpMax} numeric tone="vital" />
              <StatTile label="Fp" value={fpMax} onChange={setFpMax} numeric tone="vital" />
            </Box>

            <Box fontSize={FS_SUB} fontWeight={700} color="muted" pb="3px" mb="9px" borderBottom="1px solid" borderColor="hair">Sebesség</Box>
            <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap="10px 8px" mb="16px">
              <MiniField label="Szárazföld" value={String(stats.sebSzaraz)} onChange={num("sebSzaraz")} numeric />
              <MiniField label="Víz" value={String(stats.sebViz)} onChange={num("sebViz")} numeric />
              <MiniField label="Levegő" value={String(stats.sebLevego)} onChange={num("sebLevego")} numeric />
            </Box>

            <Box fontSize={FS_SUB} fontWeight={700} color="muted" pb="3px" mb="9px" borderBottom="1px solid" borderColor="hair">Ellenállások</Box>
            <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap="10px 8px" mb="16px">
              <MiniField label="Mentál ME" value={String(stats.mentalME)} onChange={num("mentalME")} numeric />
              <MiniField label="Asztrál ME" value={String(stats.asztralME)} onChange={num("asztralME")} numeric />
              <MiniField label="Méreg" value={String(stats.meregEllenallas)} onChange={num("meregEllenallas")} numeric />
            </Box>

            <Box fontSize={FS_SUB} fontWeight={700} color="muted" pb="3px" mb="9px" borderBottom="1px solid" borderColor="hair">Támadás</Box>
            <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap="8px" mb="10px">
              <StatTile label="KÉ" value={String(stats.ke)} onChange={num("ke")} numeric />
              <StatTile label="TÉ" value={String(stats.te)} onChange={num("te")} numeric />
              <StatTile label="VÉ" value={String(stats.ve)} onChange={num("ve")} numeric />
            </Box>
            <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap="10px 8px" mb="16px">
              <MiniField label="Sebzés" value={stats.sebzes} onChange={txt("sebzes")} />
              <MiniField label="Időigény" value={stats.idoigeny} onChange={txt("idoigeny")} />
              <MiniField label="Méretkategória" value={stats.meret} onChange={txt("meret")} />
            </Box>

            <Text fontFamily="ui" fontSize="12px" color="muted" mb="4px">Jegyzet</Text>
            <Input {...field} value={note} onChange={(e) => setNote(e.target.value)} placeholder="pl. sánta a bal hátsó lábára…" w="100%" mb="18px" />

            <Flex justify="space-between" align="center" gap="9px">
              <Button variant="ghost" size="sm" color="bad" px="8px" _hover={{ bg: "accentSoft" }} onClick={() => setConfirmDelete(true)}>Törlés</Button>
              <Button size="sm" bg="accent" color="onAccent" _hover={{ opacity: 0.9 }} onClick={() => setMode("view")}>Kész</Button>
            </Flex>
          </>
        )}
      </Box>

      {pad && (
        <VitalPad
          title={`${displayName} — ${pad === "ep" ? "Életpont" : "Fájdalompont"}`}
          cur={pad === "ep" ? epCur : fpCur} max={pad === "ep" ? epMaxN : fpMaxN}
          token={pad === "ep" ? VIT_TOKEN.hp : VIT_TOKEN.fp}
          onSet={(v) => (pad === "ep" ? setEp(v) : setFp(v))}
          onClose={() => setPad(null)}
        />
      )}
      {confirmDelete && (
        <ConfirmModal title="Társ törlése" confirmLabel="Törlés"
          onConfirm={() => { onDelete(); onClose(); }} onClose={() => setConfirmDelete(false)}>
          Biztosan törlöd a(z) <b>{displayName}</b> nevű társat? Ez nem visszavonható.
        </ConfirmModal>
      )}
    </ModalShell>
  );
};

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
