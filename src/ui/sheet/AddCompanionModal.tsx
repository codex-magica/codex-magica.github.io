import React, { useState } from "react";
import { Box, Button, Flex, Heading, HStack, Input, Text } from "@chakra-ui/react";
import { ModalShell, ModalHeader } from "../Modal";
import { Companion } from "../../model/companions";
import {
  COMPANION_GROUPS, COMPANION_PRESETS, COMPANION_FIELDS, CompanionPreset, CompanionStats,
  applyBreed, blankStats, breedsForBase, speciesLabel,
} from "../../model/companions";
import { IconPicker } from "./IconPicker";
import { FS, FS_SUB } from "./primitives";

const uid = () => Math.random().toString(36).slice(2, 10);

const field = {
  size: "sm" as const, bg: "fieldBg", borderColor: "fieldBd", borderRadius: "7px", color: "fg",
  fontSize: "13.5px", focusBorderColor: "accent",
};

// Step 2 for a preset: name the animal, and (for dogs) optionally pick a breed whose ± modifiers fold
// into the seeded numbers. The stats stay fully editable later from the detail modal.
const PresetStep: React.FC<{ preset: CompanionPreset; onAdd: (c: Companion) => void; onBack: () => void }> = ({ preset, onAdd, onBack }) => {
  const breeds = breedsForBase(preset.key);
  const [breedKey, setBreedKey] = useState("");
  const [name, setName] = useState("");
  const breed = breeds.find((b) => b.key === breedKey);
  const stats: CompanionStats = breed ? applyBreed(preset.stats, breed) : preset.stats;
  return (
    <Box px="20px" pb="18px">
      <Text fontFamily="ui" fontSize="12px" color="muted" mb="4px">Név</Text>
      <Input {...field} value={name} onChange={(e) => setName(e.target.value)} placeholder="pl. Bársony, Rex…" autoFocus w="100%" mb="14px" />

      {breeds.length > 0 && (
        <>
          <Box fontSize={FS_SUB} fontWeight={700} color="muted" pb="3px" mb="8px" borderBottom="1px solid" borderColor="hair">Fajta (opcionális)</Box>
          <Flex wrap="wrap" gap="7px" mb="14px">
            <BreedChip label="Nincs" on={!breedKey} onClick={() => setBreedKey("")} />
            {breeds.map((b) => <BreedChip key={b.key} label={b.name} on={breedKey === b.key} onClick={() => setBreedKey(b.key)} />)}
          </Flex>
        </>
      )}

      <StatPreview stats={stats} />

      <HStack gap="8px" mt="14px">
        <Button variant="outline" size="sm" borderColor="hair" color="muted" onClick={onBack} flex="0 0 auto">Vissza</Button>
        <Button size="sm" bg="accent" color="onAccent" flex="1 1 auto" isDisabled={!name.trim()} _hover={{ opacity: 0.9 }}
          onClick={() => onAdd({ id: uid(), name: name.trim(), species: speciesLabel(preset, breed), preset: preset.key, breed: breed?.key, stats, ep: stats.epMax, fp: stats.fpMax })}>
          Hozzáadás
        </Button>
      </HStack>
    </Box>
  );
};

const BreedChip: React.FC<{ label: string; on: boolean; onClick: () => void }> = ({ label, on, onClick }) => (
  <Box as="button" type="button" onClick={onClick} px="11px" py="5px" borderRadius="999px" fontSize="12.5px" fontWeight={600}
    border="1px solid" borderColor={on ? "accent" : "fieldBd"} bg={on ? "accentSoft" : "fieldBg"} color={on ? "accentTx" : "muted"}
    _hover={{ borderColor: "accent" }}>{label}</Box>
);

// A read-only glimpse of the seeded block so the breed choice is visible before committing.
const StatPreview: React.FC<{ stats: CompanionStats }> = ({ stats }) => (
  <Box bg="accentSoft" borderRadius="8px" px="12px" py="10px">
    <HStack gap="14px" mb="4px">
      <Text fontFamily="ui" fontSize="12px" color="accentTx" sx={{ fontVariantNumeric: "tabular-nums" }}>
        KÉ {stats.ke} · TÉ {stats.te} · VÉ {stats.ve} · {stats.sebzes || "—"}
      </Text>
    </HStack>
    <Text fontFamily="ui" fontSize="12px" color="muted" sx={{ fontVariantNumeric: "tabular-nums" }}>Ép {stats.epMax} · Fp {stats.fpMax}</Text>
  </Box>
);

// Step 2 for a custom animal: name + an editable stat block (starts blank).
const CustomStep: React.FC<{ onAdd: (c: Companion) => void; onBack: () => void }> = ({ onAdd, onBack }) => {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("paw");
  const [stats, setStats] = useState<CompanionStats>(blankStats());
  const [ep, setEp] = useState("0");
  const [fp, setFp] = useState("0");
  const setField = (k: keyof CompanionStats, v: string, num: boolean) =>
    setStats((s) => ({ ...s, [k]: num ? (parseInt(v, 10) || 0) : v }));
  return (
    <Box px="20px" pb="18px">
      <Text fontFamily="ui" fontSize="12px" color="muted" mb="4px">Név</Text>
      <Input {...field} value={name} onChange={(e) => setName(e.target.value)} placeholder="pl. Manó, Villám…" autoFocus w="100%" mb="14px" />

      <Text fontFamily="ui" fontSize="11px" color="muted" mb="5px">Ikon</Text>
      <Box mb="14px"><IconPicker value={icon} onChange={setIcon} /></Box>

      <Box fontSize={FS_SUB} fontWeight={700} color="muted" pb="3px" mb="8px" borderBottom="1px solid" borderColor="hair">Életerő</Box>
      <HStack gap="12px" mb="14px">
        <LabeledNum label="Ép" value={ep} onChange={setEp} />
        <LabeledNum label="Fp" value={fp} onChange={setFp} />
      </HStack>

      {COMPANION_FIELDS.map((g) => (
        <Box key={g.group}>
          <Box fontSize={FS_SUB} fontWeight={700} color="muted" pb="3px" mb="8px" borderBottom="1px solid" borderColor="hair">{g.group}</Box>
          <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap="9px 12px" mb="14px">
            {g.fields.map((f) => (
              <Box key={f.key}>
                <Text fontFamily="ui" fontSize="11px" color="muted" mb="3px">{f.label}</Text>
                <Input {...field} w="100%" value={String(stats[f.key] ?? "")} inputMode={f.kind === "num" ? "numeric" : undefined}
                  onChange={(e) => setField(f.key, e.target.value, f.kind === "num")} sx={f.kind === "num" ? { fontVariantNumeric: "tabular-nums" } : undefined} />
              </Box>
            ))}
          </Box>
        </Box>
      ))}

      <HStack gap="8px">
        <Button variant="outline" size="sm" borderColor="hair" color="muted" onClick={onBack} flex="0 0 auto">Vissza</Button>
        <Button size="sm" bg="accent" color="onAccent" flex="1 1 auto" isDisabled={!name.trim()} _hover={{ opacity: 0.9 }}
          onClick={() => { const s = { ...stats, epMax: parseInt(ep, 10) || 0, fpMax: parseInt(fp, 10) || 0 };
            onAdd({ id: uid(), name: name.trim(), species: "Egyedi állat", icon, stats: s, ep: s.epMax, fp: s.fpMax }); }}>
          Hozzáadás
        </Button>
      </HStack>
    </Box>
  );
};

const LabeledNum: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <Box flex="1 1 0">
    <Text fontFamily="ui" fontSize="11px" color="muted" mb="3px">{label}</Text>
    <Input size="sm" bg="fieldBg" borderColor="fieldBd" borderRadius="7px" color="fg" fontSize="13.5px" focusBorderColor="accent"
      w="100%" value={value} inputMode="numeric" onChange={(e) => onChange(e.target.value)} sx={{ fontVariantNumeric: "tabular-nums" }} />
  </Box>
);

// Add-companion picker: the bestiary animals grouped by species (tap a preset → name/breed step), plus
// a custom animal builder.
export const AddCompanionModal: React.FC<{ onAdd: (c: Companion) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
  const [step, setStep] = useState<{ kind: "list" } | { kind: "preset"; preset: CompanionPreset } | { kind: "custom" }>({ kind: "list" });
  const add = (c: Companion) => { onAdd(c); onClose(); };
  const title = step.kind === "custom" ? "Egyedi állat" : step.kind === "preset" ? step.preset.group : "Társ hozzáadása";

  return (
    <ModalShell onClose={onClose} width="min(420px, 100%)" maxH="82vh">
      <ModalHeader onClose={onClose} pt="16px" pb="10px">
        <Heading as="h3" fontSize={{ base: "18px", md: "19px" }} fontWeight={700} color="fg">{title}</Heading>
      </ModalHeader>
      <Box flex="1 1 auto" overflowY="auto" overflowX="hidden">
        {step.kind === "preset" && <PresetStep preset={step.preset} onAdd={add} onBack={() => setStep({ kind: "list" })} />}
        {step.kind === "custom" && <CustomStep onAdd={add} onBack={() => setStep({ kind: "list" })} />}
        {step.kind === "list" && (
          <Box px="20px" pb="18px">
            {COMPANION_GROUPS.map((g) => (
              <Box key={g}>
                <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em" pb="3px" mt="11px" mb="3px" borderBottom="1px solid" borderColor="hair">{g}</Box>
                {COMPANION_PRESETS.filter((p) => p.group === g).map((p) => (
                  <Box key={p.key} as="button" type="button" w="100%" textAlign="left"
                    onClick={() => setStep({ kind: "preset", preset: p })}
                    py="7px" px="7px" mx="-7px" borderRadius="6px" _hover={{ bg: "accentSoft" }}>
                    <Flex align="baseline" justify="space-between" gap="12px">
                      <Text color="fg" fontSize={FS} noOfLines={1}>{p.name}</Text>
                      <Text color="accentTx" fontFamily="ui" fontSize="12px" flexShrink={0} sx={{ fontVariantNumeric: "tabular-nums" }}>
                        TÉ {p.stats.te} · VÉ {p.stats.ve}
                      </Text>
                    </Flex>
                  </Box>
                ))}
              </Box>
            ))}
            <Button mt="16px" w="100%" size="sm" variant="outline" borderColor="fieldBd" color="accentTx"
              _hover={{ borderColor: "accent", bg: "accentSoft" }} onClick={() => setStep({ kind: "custom" })}>
              + Egyedi állat…
            </Button>
          </Box>
        )}
      </Box>
    </ModalShell>
  );
};
