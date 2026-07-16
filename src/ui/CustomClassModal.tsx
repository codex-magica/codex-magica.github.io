import React, { useState } from "react";
import { Box, Button, Heading, HStack, Input, Select, Text } from "@chakra-ui/react";
import { ModalShell, ModalHeader } from "./Modal";
import { ClassDef } from "../model/classes/def";
import { CLASS_NAMES } from "../model/classes";
import { CLASS_GRANT_KINDS, ClassGrantKind, ClassGrantRow, blankClassRow, buildCustomClass, readClassRows } from "../model/customClass";
import { SkillFok, SKILL_CATEGORIES } from "../model/common";
import { SKILLS } from "../model/skills";
import { DeleteButton } from "./controls";
import { FS_SUB } from "./sheet/primitives";

const uid = () => Math.random().toString(36).slice(2, 10);
const FOKS: SkillFok[] = [1, 2, 3, 4, 5];
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const field = {
  size: "sm" as const, bg: "fieldBg", borderColor: "fieldBd", borderRadius: "7px", color: "fg",
  fontSize: "13px", focusBorderColor: "accent",
};

const SkillSelect: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <Select {...field} flex="1 1 150px" minW="120px" value={value} placeholder="Válassz képzettséget…" onChange={(e) => onChange(e.target.value)}>
    {SKILL_CATEGORIES.map((c) => (
      <optgroup key={c} label={c}>
        {SKILLS.filter((s) => s.category === c).map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
      </optgroup>
    ))}
  </Select>
);

// One grant row: kind + skill + fok (skill/teacher) + level-gate. A bordered card so wrapped rows read as
// one unit on a phone; the delete ✕ is pinned outside the wrapping content so it never orphans.
const RowEditor: React.FC<{ row: ClassGrantRow; onChange: (patch: Partial<ClassGrantRow>) => void; onRemove: () => void }> = ({ row, onChange, onRemove }) => (
  <Box border="1px solid" borderColor="hair" borderRadius="9px" bg="fieldBg" px="8px" py="8px" mb="7px">
    <HStack align="flex-start" gap="7px">
      <HStack flex="1 1 auto" minW={0} gap="7px" align="center" wrap="wrap">
        <Select {...field} w="150px" flexShrink={0} value={row.kind} onChange={(e) => onChange({ kind: e.target.value as ClassGrantKind })}>
          {CLASS_GRANT_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
        </Select>
        <SkillSelect value={row.skill} onChange={(v) => onChange({ skill: v })} />
        <Select {...field} w="86px" flexShrink={0} value={row.fok} onChange={(e) => onChange({ fok: Number(e.target.value) as SkillFok })}>
          {FOKS.map((f) => <option key={f} value={f}>{f}. {row.kind === "teacher" ? "fokig" : "fok"}</option>)}
        </Select>
        <Select {...field} w="112px" flexShrink={0} value={row.atLevel} onChange={(e) => onChange({ atLevel: Number(e.target.value) })}>
          {LEVELS.map((l) => <option key={l} value={l}>{l}. szinttől</option>)}
        </Select>
      </HStack>
      <DeleteButton onClick={onRemove} />
    </HStack>
  </Box>
);

// Build/edit a KM custom class: a name, a KAP cost, and a flat list of grant rows. Produces a ClassDef the
// derive engine treats like any built-in class.
export const CustomClassModal: React.FC<{ initial?: ClassDef; onSave: (def: ClassDef) => void; onClose: () => void }> = ({ initial, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [cost, setCost] = useState(String(initial?.cost ?? 5));
  const [rows, setRows] = useState<ClassGrantRow[]>(() => {
    const existing = initial ? readClassRows(initial, () => uid()) : [];
    return existing.length ? existing : [blankClassRow(uid())];
  });

  const patch = (id: string, p: Partial<ClassGrantRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const remove = (id: string) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : [blankClassRow(uid())]));
  const add = () => setRows((rs) => [...rs, blankClassRow(uid())]);

  const grantCount = rows.filter((r) => r.skill).length;
  // A custom class named exactly like a built-in would shadow it in the picker and derive — block it.
  const trimmed = name.trim();
  const nameCollision = CLASS_NAMES.some((n) => n.toLowerCase() === trimmed.toLowerCase());
  const canSave = !!trimmed && !nameCollision;
  const save = () => onSave(buildCustomClass(name, parseInt(cost, 10) || 0, rows));

  return (
    <ModalShell onClose={onClose} width="min(560px, 100%)" maxH="86vh">
      <ModalHeader onClose={onClose} pt="16px" pb="10px">
        <Heading as="h3" fontSize={{ base: "18px", md: "19px" }} fontWeight={700} color="fg">Egyedi kaszt</Heading>
      </ModalHeader>
      <Box flex="1 1 auto" overflowY="auto" overflowX="hidden" px="20px" py="14px">
        <HStack gap="12px" align="flex-start" mb="14px" wrap="wrap">
          <Box flex="1 1 220px" minW="160px">
            <Text fontFamily="ui" fontSize="12px" color="muted" mb="4px">Kaszt neve</Text>
            <Input {...field} value={name} onChange={(e) => setName(e.target.value)} placeholder="pl. Kósza, Szerzetes…" autoFocus w="100%"
              borderColor={nameCollision ? "bad" : "fieldBd"} />
            {nameCollision && <Text fontSize="11px" color="bad" mt="4px">Ez egy alapkaszt neve — válassz másikat.</Text>}
          </Box>
          <Box w="120px">
            <Text fontFamily="ui" fontSize="12px" color="muted" mb="4px">KAP költség</Text>
            <Input {...field} value={cost} onChange={(e) => setCost(e.target.value)} inputMode="numeric" w="100%" textAlign="right" sx={{ fontVariantNumeric: "tabular-nums" }} />
          </Box>
        </HStack>

        <Box fontSize={FS_SUB} fontWeight={700} color="muted" pb="3px" mb="9px" borderBottom="1px solid" borderColor="hair">
          Juttatások — kapott képzettségek, oktatás, szinthez kötött bónuszok
        </Box>
        {rows.map((r) => (
          <RowEditor key={r.id} row={r} onChange={(p) => patch(r.id, p)} onRemove={() => remove(r.id)} />
        ))}
        <Button variant="outline" size="sm" w="100%" borderColor="fieldBd" color="accentTx" mt="2px"
          _hover={{ borderColor: "accent", bg: "accentSoft" }} onClick={add}>
          + Új juttatás
        </Button>

        <HStack justify="space-between" align="center" mt="18px" gap="10px">
          <Text fontFamily="ui" fontSize="12px" color="fgFaint">{grantCount} juttatás · {parseInt(cost, 10) || 0} KAP</Text>
          <HStack gap="8px">
            <Button variant="outline" size="sm" borderColor="hair" color="muted" onClick={onClose}>Mégse</Button>
            <Button size="sm" bg="accent" color="onAccent" isDisabled={!canSave} _hover={{ opacity: 0.9 }} onClick={save}>Mentés</Button>
          </HStack>
        </HStack>
      </Box>
    </ModalShell>
  );
};

export default CustomClassModal;
