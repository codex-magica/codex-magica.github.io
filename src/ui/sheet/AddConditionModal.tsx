import React, { useState } from "react";
import { Box, Button, Flex, Heading, HStack, Input, Select, Text } from "@chakra-ui/react";
import { ModalShell, ModalHeader } from "../Modal";
import { CharacterCondition } from "../../model/character";
import { Effect } from "../../model/effects";
import {
  CONDITION_GROUPS, CONDITION_PRESETS, CONDITION_TARGETS, CONDITION_TARGET_GROUPS,
  ConditionPreset, ConditionTarget, buildCustomEffects, conditionSummary,
} from "../../model/conditions";
import { FS, FS_SUB } from "./primitives";

export const uid = () => Math.random().toString(36).slice(2, 10);

const field = {
  size: "sm" as const, bg: "fieldBg", borderColor: "fieldBd", borderRadius: "7px", color: "fg",
  fontSize: "13.5px", focusBorderColor: "accent",
};

// A connected [ − | input | + ] stepper like the character editor, but the middle stays a free-text
// field so any value can still be typed. `step` is 5 for the combat values (they move in fives) and 1
// for everything else. Empty = no modifier (not a zero), so a step that lands on 0 clears the field.
// Disabled (no target chosen yet) → inert and greyed.
// A signed integer as stored/shown in the field: "+5" for positives, "-5" for negatives, "" for zero.
// ASCII signs (not the − glyph) so parseInt keeps working on the stored value.
const fmtSigned = (n: number): string => (n === 0 ? "" : n > 0 ? `+${n}` : String(n));

const StepInput: React.FC<{ ariaLabel: string; value: string; step: number; disabled?: boolean; onChange: (v: string) => void }> = ({ ariaLabel, value, step, disabled, onChange }) => {
  const bump = (delta: number) => onChange(fmtSigned((parseInt(value, 10) || 0) + delta));
  // Free typing is left untouched keystroke-by-keystroke (so "-" mid-entry is fine); on blur the field's
  // own value is normalized to the signed form ("20" → "+20"). Reading the event target, not `value`,
  // avoids a stale closure if blur lands in the same tick as the last edit.
  const normalize = (raw: string) => { const n = parseInt(raw, 10); onChange(Number.isFinite(n) ? fmtSigned(n) : ""); };
  const btn = {
    as: "button" as const, type: "button" as const, w: "28px", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "16px", color: "muted", cursor: disabled ? "default" : "pointer",
    ...(disabled ? {} : { _hover: { bg: "accentSoft", color: "accentTx" } }),
  };
  return (
    <Flex align="stretch" h="32px" w="118px" flexShrink={0} border="1px solid" borderColor="fieldBd" borderRadius="8px"
      bg="fieldBg" overflow="hidden" opacity={disabled ? 0.5 : 1}
      _focusWithin={disabled ? undefined : { borderColor: "accent", boxShadow: "0 0 0 2px var(--chakra-colors-accentSoft)" }}>
      <Box {...btn} borderRight="1px solid" borderColor="fieldBd" onClick={disabled ? undefined : () => bump(-step)} aria-label={`${ariaLabel} −${step}`}>−</Box>
      <Input value={value} onChange={(e) => onChange(e.target.value)} onBlur={(e) => normalize(e.target.value)} placeholder="—" inputMode="numeric" isDisabled={disabled}
        flex="1 1 auto" minW={0} h="100%" border="none" borderRadius={0} bg="transparent" textAlign="center" px="2px"
        color="fg" fontSize="14px" _focusVisible={{ boxShadow: "none" }} sx={{ fontVariantNumeric: "tabular-nums" }} />
      <Box {...btn} borderLeft="1px solid" borderColor="fieldBd" bg={disabled ? "fieldBg" : "accentSoft"} color={disabled ? "muted" : "accentTx"} onClick={disabled ? undefined : () => bump(step)} aria-label={`${ariaLabel} +${step}`}>+</Box>
    </Flex>
  );
};

// Step 2 for a preset that takes a strength (a shield's E, extra opponents, Ψ-points spent).
const MagnitudeStep: React.FC<{ preset: ConditionPreset; onAdd: (c: CharacterCondition) => void; onBack: () => void }> = ({ preset, onAdd, onBack }) => {
  const [n, setN] = useState(String(preset.magnitude!.default));
  const parsed = Math.max(preset.magnitude!.min ?? 0, parseInt(n, 10) || 0);
  const effects = preset.effects(parsed);
  return (
    <Box px="20px" pb="18px">
      <Text color="muted" fontSize="12.5px" mb="12px">{preset.note}</Text>
      <Text fontFamily="ui" fontSize="12px" color="muted" mb="4px">{preset.magnitude!.label}</Text>
      <Input {...field} value={n} onChange={(e) => setN(e.target.value)} inputMode="numeric" autoFocus w="100%" mb="10px"
        sx={{ fontVariantNumeric: "tabular-nums" }} />
      <Text fontFamily="ui" fontSize="12.5px" color="accentTx" minH="18px" mb="14px">{conditionSummary(effects) || "—"}</Text>
      <HStack gap="8px">
        <Button variant="outline" size="sm" borderColor="hair" color="muted" onClick={onBack} flex="0 0 auto">Vissza</Button>
        <Button size="sm" bg="accent" color="onAccent" flex="1 1 auto" _hover={{ opacity: 0.9 }}
          onClick={() => onAdd({ id: uid(), name: preset.name, note: preset.note, effects, preset: preset.key, magnitude: parsed })}>
          Hozzáadás
        </Button>
      </HStack>
    </Box>
  );
};

const TARGET_BY_KEY: Record<string, ConditionTarget> = Object.fromEntries(CONDITION_TARGETS.map((t) => [t.key, t]));

// One "pick a value → set its bonus" row of the custom-condition editor. Shared between the add
// flow's CustomStep and the ConditionModal's edit mode.
export type ModRow = { id: string; key: string; value: string };
export const newModRow = (): ModRow => ({ id: uid(), key: "", value: "" });

export const rowsToEffects = (rows: ModRow[]): Effect[] => {
  const numeric: Record<string, number> = {};
  for (const r of rows) { const n = parseInt(r.value, 10); if (r.key && Number.isFinite(n) && n !== 0) numeric[r.key] = n; }
  return buildCustomEffects(numeric);
};

// The inverse, for editing a stored custom condition: each bonus effect maps back to a target row.
// (`note` effects only occur in book presets, which aren't editable — safe to skip.)
export const effectsToRows = (effects: Effect[]): ModRow[] => {
  const rows: ModRow[] = [];
  for (const e of effects) {
    if (e.kind === "combatBonus") rows.push({ id: uid(), key: e.channel, value: fmtSigned(e.amount) });
    else if (e.kind === "derivedBonus") rows.push({ id: uid(), key: e.target, value: fmtSigned(e.amount) });
    else if (e.kind === "statBonus") rows.push({ id: uid(), key: e.stat, value: fmtSigned(e.amount) });
  }
  return rows.length > 0 ? rows : [newModRow()];
};

// The modifier-row list editor: select a target, set its bonus, one row per target. A given target
// can be chosen only once (already-used ones drop out of the other rows' menus).
export const CustomModsEditor: React.FC<{ rows: ModRow[]; onRows: (rows: ModRow[]) => void }> = ({ rows, onRows }) => {
  const setRow = (id: string, patch: Partial<ModRow>) => onRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const used = new Set(rows.map((r) => r.key).filter(Boolean));
  return (
    <>
      <Box fontSize={FS_SUB} fontWeight={700} color="muted" pb="3px" mb="9px" borderBottom="1px solid" borderColor="hair">Módosítók</Box>
      {rows.map((r) => {
        const target = TARGET_BY_KEY[r.key];
        return (
          <HStack key={r.id} gap="8px" mb="9px" align="center">
            <Select {...field} flex="1 1 auto" minW={0} value={r.key} placeholder="Válassz értéket…"
              onChange={(e) => setRow(r.id, { key: e.target.value })}>
              {CONDITION_TARGET_GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {CONDITION_TARGETS.filter((t) => t.group === g && (t.key === r.key || !used.has(t.key))).map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <StepInput ariaLabel={target?.label ?? "érték"} value={r.value} step={target?.step ?? 1} disabled={!r.key}
              onChange={(v) => setRow(r.id, { value: v })} />
            <Box as="button" type="button" aria-label="Sor törlése" title="Sor törlése"
              onClick={() => onRows(rows.length > 1 ? rows.filter((x) => x.id !== r.id) : [newModRow()])}
              color="fgFaint" fontSize="14px" lineHeight="1" px="3px" flexShrink={0} _hover={{ color: "bad" }}>✕</Box>
          </HStack>
        );
      })}
      {used.size < CONDITION_TARGETS.length && (
        <Button variant="outline" size="sm" w="100%" borderColor="fieldBd" color="accentTx" mt="2px" mb="12px"
          _hover={{ borderColor: "accent", bg: "accentSoft" }}
          onClick={() => onRows([...rows, newModRow()])}>
          + Módosító
        </Button>
      )}
    </>
  );
};

// Step 2 for a fully custom condition: a name plus the modifier-row editor.
const CustomStep: React.FC<{ onAdd: (c: CharacterCondition) => void; onBack: () => void }> = ({ onAdd, onBack }) => {
  const [name, setName] = useState("");
  const [rows, setRows] = useState<ModRow[]>([newModRow()]);
  const effects = rowsToEffects(rows);

  return (
    <Box px="20px" pb="18px">
      <Text fontFamily="ui" fontSize="12px" color="muted" mb="4px">Név</Text>
      <Input {...field} value={name} onChange={(e) => setName(e.target.value)} placeholder="pl. Áldás, Sebláz…" autoFocus w="100%" mb="14px" />

      <CustomModsEditor rows={rows} onRows={setRows} />

      <Text fontFamily="ui" fontSize="12.5px" color="accentTx" minH="18px" mb="12px" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {conditionSummary(effects) || "Nincs módosító — csak emlékeztető."}
      </Text>
      <HStack gap="8px">
        <Button variant="outline" size="sm" borderColor="hair" color="muted" onClick={onBack} flex="0 0 auto">Vissza</Button>
        <Button size="sm" bg="accent" color="onAccent" flex="1 1 auto" isDisabled={!name.trim()} _hover={{ opacity: 0.9 }}
          onClick={() => onAdd({ id: uid(), name: name.trim(), effects })}>
          Hozzáadás
        </Button>
      </HStack>
    </Box>
  );
};

// Add-condition picker: the book's states grouped by kind (tap adds; a preset with a strength asks for
// it first), plus a custom builder for anything the book doesn't cover.
export const AddConditionModal: React.FC<{ onAdd: (c: CharacterCondition) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
  const [step, setStep] = useState<{ kind: "list" } | { kind: "magnitude"; preset: ConditionPreset } | { kind: "custom" }>({ kind: "list" });
  const add = (c: CharacterCondition) => { onAdd(c); onClose(); };
  const title = step.kind === "custom" ? "Egyedi állapot" : step.kind === "magnitude" ? step.preset.name : "Állapot hozzáadása";

  return (
    <ModalShell onClose={onClose} width="min(420px, 100%)" maxH="82vh">
      <ModalHeader onClose={onClose} pt="16px" pb="10px">
        <Heading as="h3" fontSize={{ base: "18px", md: "19px" }} fontWeight={700} color="fg">{title}</Heading>
      </ModalHeader>
      <Box flex="1 1 auto" overflowY="auto" overflowX="hidden">
        {step.kind === "magnitude" && <MagnitudeStep preset={step.preset} onAdd={add} onBack={() => setStep({ kind: "list" })} />}
        {step.kind === "custom" && <CustomStep onAdd={add} onBack={() => setStep({ kind: "list" })} />}
        {step.kind === "list" && (
          <Box px="20px" pb="18px">
            {CONDITION_GROUPS.filter((g) => g !== "Egyéb").map((g) => (
              <Box key={g}>
                <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em" pb="3px" mt="11px" mb="3px" borderBottom="1px solid" borderColor="hair">{g}</Box>
                {CONDITION_PRESETS.filter((p) => p.group === g).map((p) => (
                  // name on its own line (nothing competes with it for width), modifiers underneath —
                  // a long list like Kábultság's truncates instead of pushing the row off the panel.
                  <Box key={p.key} as="button" type="button" w="100%" maxW="100%" textAlign="left" title={p.note}
                    onClick={() => (p.magnitude ? setStep({ kind: "magnitude", preset: p }) : add({ id: uid(), name: p.name, note: p.note, effects: p.effects(0), preset: p.key }))}
                    display="block" overflow="hidden" py="7px" px="7px" mx="-7px" borderRadius="6px" _hover={{ bg: "accentSoft" }}>
                    <Flex align="baseline" justify="space-between" gap="10px" minW={0}>
                      <Text color="fg" fontSize={FS} isTruncated minW={0}>{p.name}</Text>
                      {p.magnitude && (
                        <Text color="fgFaint" fontFamily="ui" fontSize="11px" flexShrink={0}>erősség…</Text>
                      )}
                    </Flex>
                    <Text color="accentTx" fontFamily="ui" fontSize="11.5px" isTruncated mt="1px"
                      sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {p.magnitude ? p.note : conditionSummary(p.effects(0))}
                    </Text>
                  </Box>
                ))}
              </Box>
            ))}
            <Button mt="16px" w="100%" size="sm" variant="outline" borderColor="fieldBd" color="accentTx"
              _hover={{ borderColor: "accent", bg: "accentSoft" }} onClick={() => setStep({ kind: "custom" })}>
              + Egyedi állapot…
            </Button>
          </Box>
        )}
      </Box>
    </ModalShell>
  );
};
