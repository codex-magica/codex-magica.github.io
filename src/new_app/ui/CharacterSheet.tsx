import React, { useState } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { TimeIcon } from "@chakra-ui/icons";
import { WeaponModalState } from "./WeaponModal";
import { CharacterRecord, VitalKey } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { STAT_KEYS } from "../model/attributes";
import { SKILL_BY_NAME } from "../model/skills";
import { SKILL_CATEGORIES } from "../model/common";
import { VITALS, POOL_UNIT } from "../model/vitals";
import { FS, FS_NAME, FS_SUB, ROWPY, GAP, Card, SecHead, SubHead, ValNum, Col, Empty, rowProps } from "./sheet/primitives";
import { VitalsCard, VitalRow } from "./sheet/VitalsCard";
import { EquipmentCard } from "./sheet/EquipmentCard";
import { AbilityChips } from "./AbilityChips";
import { ModalShell } from "./Modal";
import { COMBAT_INFO, combatBreakdown } from "../model/combatInfo";

interface Props {
  record: CharacterRecord;
  derived: DerivedCharacter;
  onSetVital: (key: VitalKey, value: number) => void;
  onSetInventory: (text: string) => void;
  onOpenSkill: (name: string, fok: number, percent?: number | null) => void;
  onOpenSpell: (name: string) => void;
  onOpenWeapon: (w: WeaponModalState) => void;
}

// one sheet panel per spell list the character has unlocked, in this order
const SCHOOL_ORDER = ["Bárdmágia", "Tűzmágia", "Boszorkánymágia", "Boszorkánymesteri", "Magasmágia", "Pszi", "Szakrális"];

// spell table: name (takes the slack) | Mana(/Ψp/Kp) | Időigény (clock) — the two value columns are
// narrow, fixed-width and tucked tightly together at the right, with their headers + values centred.
const SPELL_COLS = "minmax(0,1fr) 32px 46px";
const SPELL_GAP = "5px";
// Compact the Időigény for the narrow clock column: szegmens → sz, perc → p, and collapse anything
// still long (e.g. "Lásd a leírást!", "Rajzolás hossza", ranges) to "…" — full text stays in the modal.
const shortTime = (raw: string): string => {
  const t = (raw || "").trim();
  if (!t || t === "—") return "—";
  const c = t
    .replace(/szegmens/gi, "sz")
    .replace(/perc/gi, "p")
    .replace(/(\d)\s*sz\b/gi, "$1 sz")
    .replace(/\s+/g, " ")
    .trim();
  return c.length > 7 ? "…" : c;
};

export const CharacterSheet: React.FC<Props> = ({ record, derived, onSetVital, onSetInventory, onOpenSkill, onOpenSpell, onOpenWeapon }) => {
  const id = record.identity;
  const specs = Object.values(record.selections).filter(Boolean).join(" · ");
  const idFields: { k: string; v: string }[] = [
    { k: "Faj", v: record.race },
    { k: "Kaszt", v: record.class },
    ...(specs ? [{ k: "Iskola", v: specs }] : []),
    ...(id.alignment ? [{ k: "Jellem", v: id.alignment }] : []),
    ...(id.religion ? [{ k: "Vallás", v: id.religion }] : []),
    ...(id.homeland ? [{ k: "Szülőföld", v: id.homeland }] : []),
  ];

  const vitalRows: VitalRow[] = VITALS.filter((m) => derived.vitals[m.key].max > 0).map((m) => ({
    key: m.key, label: m.label, kind: m.kind, cur: derived.vitals[m.key].current, max: derived.vitals[m.key].max,
  }));

  const combatRows: { k: string; v: React.ReactNode }[] = [
    ...(["KÉ", "TÉ", "VÉ", "CÉ"] as const).map((c) => ({ k: c as string, v: derived.combat[c] as React.ReactNode })),
    { k: "MME", v: derived.derived.MME },
    { k: "AME", v: derived.derived.AME },
    ...(derived.derived.Sebzésbónusz > 0 ? [{ k: "Sebzésbónusz", v: `+${derived.derived.Sebzésbónusz}` }] : []),
  ];
  // Clicked harcérték → formula-with-values + book definition modal.
  const [combatInfo, setCombatInfo] = useState<string | null>(null);
  const combatTotalOf = (k: string): number =>
    (["KÉ", "TÉ", "VÉ", "CÉ"] as const).includes(k as any) ? derived.combat[k as "KÉ"] : (derived.derived as any)[k] ?? 0;

  const skillGroups = SKILL_CATEGORIES.map((cat) => ({
    name: cat,
    items: derived.skills
      .filter((s) => SKILL_BY_NAME[s.skill]?.category === cat)
      .map((s) => ({ key: s.skill + (s.subtype || ""), name: s.subtype ? `${s.skill} (${s.subtype})` : s.skill, val: s.percent != null ? `${s.percent}%` : `${s.fok}`, open: () => onOpenSkill(s.skill, s.fok, s.percent) })),
  })).filter((g) => g.items.length > 0);

  // Free-text equipment: the user's text once set, otherwise seeded from the derived inventory
  // (record items + class-granted gear) so there's something to start editing from.
  const invText = record.inventoryText ?? derived.inventory.map((e) => (e.qty && e.qty > 1 ? `${e.qty} ${e.name}` : e.name)).join("\n");

  // always drop spells whose cost exceeds the character's MAX pool (never affordable).
  // cost 0 = variable/"Lásd a leírást!" → always kept.
  const known = derived.spells.filter((sp) => sp.known && (sp.cost === 0 || sp.cost <= derived.vitals[sp.pool].max));
  const spellSchools = SCHOOL_ORDER
    .map((school) => ({ school, items: known.filter((sp) => sp.school === school) }))
    .filter((g) => g.items.length > 0);

  return (
    <Box flex="1 1 auto" minH={0} display="flex" gap={GAP} overflowX="auto" bg="page" px={{ base: "20px", md: "16px" }} py={GAP}>
      {/* Column 1 */}
      <Col>
        <Card>
          <Text fontSize={{ base: "26px", md: "22px" }} fontWeight={700} color="fg" lineHeight="1.1">{record.name || "Névtelen"}</Text>
          <Box h="1px" bg="rule" my="9px" />
          {idFields.map((f) => (
            <HStack key={f.k} align="baseline" gap="12px" py={ROWPY}>
              <Text flex="0 0 84px" color="muted" fontSize={FS}>{f.k}</Text>
              <Text color="fg" fontSize={FS}>{f.v}</Text>
            </HStack>
          ))}
        </Card>

        <VitalsCard rows={vitalRows} onSetVital={onSetVital} />

        {derived.tags.length > 0 && (
          <Card>
            <SecHead>Képességek</SecHead>
            <Box mt="8px">
              <AbilityChips tags={derived.tags.map((t) => ({ name: t }))} />
            </Box>
          </Card>
        )}
      </Col>

      {/* Column 2 */}
      <Col>
        <Card>
          <SecHead>Tulajdonságok</SecHead>
          {STAT_KEYS.map((s) => (
            <Box key={s} {...rowProps} justifyContent="space-between" gap="14px">
              <Text color="fg" fontSize={FS}>{s}</Text>
              <ValNum>{derived.effectiveStats[s]}</ValNum>
            </Box>
          ))}
        </Card>
        <Card>
          <SecHead>Harcértékek</SecHead>
          {combatRows.map((c) => (
            <Box key={c.k} as="button" type="button" w="100%" textAlign="left" onClick={() => setCombatInfo(c.k)} title="Hogyan számolódik?"
              {...rowProps} display="flex" justifyContent="space-between" gap="14px" _hover={{ bg: "accentSoft", borderRadius: "7px" }}>
              <Text color="fg" fontSize={FS}>{c.k}</Text>
              <ValNum>{c.v}</ValNum>
            </Box>
          ))}
          <SubHead>Kalkulátor</SubHead>
          {[
            { label: "Közelharci kalkulátor", open: () => onOpenWeapon({ kind: "melee", name: "Közelharc", baseKE: derived.combat.KÉ, baseTE: derived.combat.TÉ, baseVE: derived.combat.VÉ }) },
            { label: "Távolsági kalkulátor", open: () => onOpenWeapon({ kind: "ranged", name: "Távolság", baseCE: derived.combat.CÉ }) },
          ].map((c) => (
            <Box as="button" type="button" key={c.label} onClick={c.open} display="flex" alignItems="center" justifyContent="space-between" w="100%" textAlign="left" gap="14px" py={ROWPY} px="5px" mx="-5px" borderRadius="5px" _hover={{ bg: "accentSoft" }}>
              <Text color="fg" fontSize={FS}>{c.label}</Text>
              <Text color="accentTx" fontSize={FS_NAME} fontWeight={600}>→</Text>
            </Box>
          ))}
        </Card>
      </Col>

      {/* Column 3 — Skills */}
      <Col>
        <Card>
          <SecHead>Képzettségek</SecHead>
          {skillGroups.length === 0 && <Empty>Még nincs tanult képzettség.</Empty>}
          {skillGroups.map((c) => (
            <Box key={c.name}>
              <SubHead>{c.name}</SubHead>
              {c.items.map((s) => (
                <Box as="button" type="button" key={s.key} onClick={s.open} display="flex" alignItems="baseline" justifyContent="space-between" w="100%" textAlign="left" gap="14px" py={ROWPY} px="5px" mx="-5px" borderRadius="5px" _hover={{ bg: "accentSoft" }}>
                  <Text color="fg" fontSize={FS}>{s.name}</Text>
                  <ValNum>{s.val}</ValNum>
                </Box>
              ))}
            </Box>
          ))}
        </Card>
      </Col>

      {/* Spell lists — one panel per unlocked school, grouped into subcategories, side by side */}
      {spellSchools.map((g) => {
        const unit = POOL_UNIT[g.items[0].pool];
        const cats = Array.from(new Set(g.items.map((s) => s.category))); // subcategories, in book order
        return (
          <Col key={g.school}>
            <Card>
              <SecHead>{g.school}</SecHead>
              {cats.map((cat) => (
                <Box key={cat}>
                  {/* subcategory header — column indicators (clock = Időigény, unit = pool) sit inline on the right */}
                  <Box display="grid" gridTemplateColumns={SPELL_COLS} gap={SPELL_GAP} alignItems="center" pb="3px" mt="13px" mb="3px" borderBottom="1px solid" borderColor="hair">
                    <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em">{cat}</Box>
                    <Box as="span" justifySelf="center" fontFamily="system-ui" fontSize="11px" fontWeight={700} color="fgFaint" sx={{ fontVariantNumeric: "tabular-nums" }}>{unit}</Box>
                    <TimeIcon justifySelf="center" boxSize="11px" color="fgFaint" />
                  </Box>
                  {g.items.filter((s) => s.category === cat).map((sp, i) => (
                    <Box as="button" type="button" key={sp.name + i} onClick={() => onOpenSpell(sp.name)} display="grid" gridTemplateColumns={SPELL_COLS} gap={SPELL_GAP} w="100%" textAlign="left" alignItems="baseline" py={ROWPY} borderRadius="5px" _hover={{ bg: "accentSoft" }}>
                      <Text color="fg" fontSize={FS} lineHeight="1.2" noOfLines={2}>{sp.name}</Text>
                      <Text textAlign="center" fontWeight={600} color="accentTx" fontSize={FS} sx={{ fontVariantNumeric: "tabular-nums" }}>{sp.cost > 0 ? sp.cost : "—"}</Text>
                      <Text textAlign="center" color="muted" fontSize="12px" isTruncated title={sp.castingTime} sx={{ fontVariantNumeric: "tabular-nums" }}>{shortTime(sp.castingTime)}</Text>
                    </Box>
                  ))}
                </Box>
              ))}
            </Card>
          </Col>
        );
      })}

      {/* Inventory — free-text, editable; numbered lines open a quantity calculator */}
      <Col>
        <EquipmentCard text={invText} onSet={onSetInventory} />
      </Col>

      {combatInfo && COMBAT_INFO[combatInfo] && (() => {
        const info = COMBAT_INFO[combatInfo];
        const total = combatTotalOf(combatInfo);
        const parts = combatBreakdown(info, derived.effectiveStats, total, derived.provenance[combatInfo] ?? []);
        return (
          <ModalShell onClose={() => setCombatInfo(null)} width="min(480px, 100%)" maxH="76vh" zIndex={60} overlayPad="28px">
            <Box p="20px 22px">
              <Text fontSize="17px" fontWeight={700} color="fg">{info.label} <Text as="span" color="fgFaint" fontWeight={500}>({info.key})</Text></Text>
              <Box mt="12px" mb="14px" px="14px" py="11px" borderRadius="10px" bg="band" border="1px solid" borderColor="hair">
                {parts.map((p, i) => (
                  <HStack key={i} justify="space-between" py="3px">
                    <Text fontSize="13px" color="muted">{i > 0 ? "+ " : ""}{p.label}</Text>
                    <Text fontSize="13.5px" fontWeight={600} color="fg" sx={{ fontVariantNumeric: "tabular-nums" }}>{p.value}</Text>
                  </HStack>
                ))}
                <Box h="1px" bg="rule" my="6px" />
                <HStack justify="space-between" py="3px">
                  <Text fontSize="13px" fontWeight={700} color="accentTx">{info.key}</Text>
                  <Text fontSize="15px" fontWeight={700} color="accentTx" sx={{ fontVariantNumeric: "tabular-nums" }}>{total}</Text>
                </HStack>
              </Box>
              <Text fontSize="13.5px" color="fg" lineHeight="1.65">{info.def}</Text>
            </Box>
          </ModalShell>
        );
      })()}
    </Box>
  );
};
