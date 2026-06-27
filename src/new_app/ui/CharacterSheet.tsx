import React, { useState } from "react";
import { Box, Heading, HStack, Text } from "@chakra-ui/react";
import { TimeIcon } from "@chakra-ui/icons";
import { ParchPanel } from "./ParchPanel";
import { WeaponModalState } from "./WeaponModal";
import { CharacterRecord, VitalKey } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { STAT_KEYS } from "../model/attributes";
import { SKILL_BY_NAME } from "../model/skills";
import { SkillCategory } from "../model/common";

interface Props {
  record: CharacterRecord;
  derived: DerivedCharacter;
  onSetVital: (key: VitalKey, value: number) => void;
  onOpenSkill: (name: string, fok: number, percent?: number | null) => void;
  onOpenSpell: (name: string) => void;
  onOpenWeapon: (w: WeaponModalState) => void;
}

const FS = { base: "16px", md: "14.5px" };
const FS_NAME = { base: "17px", md: "15.5px" };
const FS_SEC = { base: "21px", md: "18px" };
const FS_SUB = { base: "14px", md: "12.5px" };
const ROWPY = { base: "5px", md: "3.5px" };
const GAP = { base: "16px", md: "14px" };

const VIT_TOKEN: Record<string, string> = { hp: "vitHp", fp: "vitFp", mana: "vitMana", kegy: "vitKegy", pszi: "vitPszi" };
const VITAL_META: { key: VitalKey; label: string; kind: string }[] = [
  { key: "Ép", label: "Életpont", kind: "hp" },
  { key: "Fp", label: "Fájdalompont", kind: "fp" },
  { key: "Mana", label: "Mana", kind: "mana" },
  { key: "Kegy", label: "Kegypont", kind: "kegy" },
  { key: "Psi", label: "Pszi", kind: "pszi" },
];
const CATEGORIES: SkillCategory[] = ["Harci", "Alvilági", "Világi", "Tudományos", "Szociális", "Misztikus"];
const POOL_UNIT: Record<string, string> = { Mana: "Mp", Psi: "Ψp", Kegy: "Kp" };
// one sheet panel per spell list the character has unlocked, in this order
const SCHOOL_ORDER = ["Bárdmágia", "Tűzmágia", "Boszorkánymágia", "Boszorkánymesteri", "Magasmágia", "Pszi", "Szakrális"];

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => <ParchPanel flex="0 0 auto">{children}</ParchPanel>;
const SecHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading as="h2" fontSize={FS_SEC} fontWeight={700} color="fg" pb="6px" mb="6px" borderBottom="1px solid" borderColor="rule">{children}</Heading>
);
const SubHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em" pb="3px" mt="13px" mb="3px" borderBottom="1px solid" borderColor="hair">{children}</Box>
);
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
const ValNum: React.FC<{ children: React.ReactNode } & Record<string, unknown>> = ({ children, ...rest }) => (
  <Text fontWeight={600} color="fg" fontSize={FS_NAME} flexShrink={0} sx={{ fontVariantNumeric: "tabular-nums" }} {...rest}>{children}</Text>
);
const Col: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box flex="1 1 268px" minW="246px" maxW="392px" h="100%" overflowY="auto" display="flex" flexDirection="column" gap={GAP} pb="36px">{children}</Box>
);
const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text fontFamily="system-ui" fontSize="12.5px" color="fgFaint" py="6px">{children}</Text>
);
const rowProps = { display: "flex", alignItems: "baseline", py: ROWPY } as const;

interface VitalRow { key: VitalKey; label: string; kind: string; cur: number; max: number }

const PadKey: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <Box as="button" type="button" onClick={onClick} h={{ base: "52px", md: "44px" }} borderRadius="9px" border="1px solid" borderColor="fieldBd" bg="fieldBg" color="fg" fontSize="20px" fontWeight={600} display="flex" alignItems="center" justifyContent="center" _hover={{ borderColor: "accent", bg: "accentSoft" }} _active={{ bg: "accentSoft" }} sx={{ fontVariantNumeric: "tabular-nums" }}>{children}</Box>
);

// heal/damage (Ép, Fp) · use/gain (Mana, Kegy, Pszi) calculator
const VitalModal: React.FC<{ v: VitalRow; onSetCur: (n: number) => void; onClose: () => void }> = ({ v, onSetCur, onClose }) => {
  const [amount, setAmount] = useState("");
  const pct = v.max > 0 ? Math.max(0, Math.min(100, (v.cur / v.max) * 100)) : 0;
  const amt = parseInt(amount, 10) || 0;
  const healable = v.kind === "hp" || v.kind === "fp";
  const downLabel = healable ? "− Sebzés" : "− Felhasználás";
  const upLabel = healable ? "+ Gyógyítás" : "+ Visszanyerés";
  const set = (n: number) => onSetCur(Math.max(0, Math.min(n, v.max)));
  const press = (d: string) => setAmount((a) => (a === "0" ? d : (a + d).slice(0, 4)));
  const apply = (mode: "heal" | "damage") => { if (amt <= 0) return; set(mode === "heal" ? v.cur + amt : v.cur - amt); setAmount(""); };

  return (
    <Box position="fixed" inset={0} zIndex={45} bg="rgba(16,14,24,.55)" display="flex" alignItems="center" justifyContent="center" p="20px" onClick={onClose}>
      <ParchPanel onClick={(e: React.MouseEvent) => e.stopPropagation()} borderRadius="12px" p={0} w="min(360px, 100%)" maxH="92vh" display="flex" flexDirection="column" overflow="hidden" style={{ boxShadow: "0 24px 64px rgba(0,0,0,.42)" }}>
        <Box position="relative" px="24px" pt="18px" pb="13px" borderBottom="1px solid" borderColor="rule" textAlign="center">
          <Box as="button" type="button" onClick={onClose} position="absolute" top="13px" right="14px" w="30px" h="30px" borderRadius="8px" border="1px solid" borderColor="hair" bg="fieldBg" color="muted" fontSize="14px" display="inline-flex" alignItems="center" justifyContent="center">✕</Box>
          <Heading as="h3" fontSize="20px" fontWeight={700} color="fg">{v.label}</Heading>
          <Text mt="2px" fontSize="22px" fontWeight={700} color={v.cur === 0 ? "bad" : "accentTx"} sx={{ fontVariantNumeric: "tabular-nums" }}>{v.cur} / {v.max}</Text>
        </Box>
        <Box flex="1 1 auto" overflowY="auto" px="20px" pt="14px" pb="20px">
          <Box h="9px" borderRadius="3px" bg="vitTrack" overflow="hidden" mb="14px"><Box h="100%" w={`${pct}%`} bg={VIT_TOKEN[v.kind]} borderRadius="3px" transition="width .3s" /></Box>
          <Box bg="fieldBg" border="1px solid" borderColor="fieldBd" borderRadius="9px" py="9px" px="14px" textAlign="center" mb="10px">
            <Text fontSize="26px" fontWeight={700} color={amt > 0 ? "fg" : "fgFaint"} sx={{ fontVariantNumeric: "tabular-nums" }}>{amount || "0"}</Text>
          </Box>
          <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap="7px">
            {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((d) => <PadKey key={d} onClick={() => press(d)}>{d}</PadKey>)}
            <PadKey onClick={() => setAmount("")}>C</PadKey>
            <PadKey onClick={() => press("0")}>0</PadKey>
            <PadKey onClick={() => setAmount((a) => a.slice(0, -1))}>⌫</PadKey>
          </Box>
          <HStack gap="9px" mt="12px">
            <Box as="button" type="button" onClick={() => apply("damage")} flex="1" py="11px" borderRadius="9px" border="1px solid" borderColor="bad" bg="transparent" color="bad" fontWeight={700} fontSize="15px" opacity={amt > 0 ? 1 : 0.45} _hover={amt > 0 ? { bg: "accentSoft" } : undefined}>{downLabel}</Box>
            <Box as="button" type="button" onClick={() => apply("heal")} flex="1" py="11px" borderRadius="9px" border="1px solid" borderColor="good" bg="transparent" color="good" fontWeight={700} fontSize="15px" opacity={amt > 0 ? 1 : 0.45} _hover={amt > 0 ? { bg: "accentSoft" } : undefined}>{upLabel}</Box>
          </HStack>
          <Box as="button" type="button" onClick={() => set(v.max)} w="100%" mt="10px" py="9px" borderRadius="9px" border="1px solid" borderColor="fieldBd" bg="fieldBg" color="accentTx" fontWeight={600} fontSize="14px" _hover={{ borderColor: "accent" }}>Teljes feltöltés</Box>
        </Box>
      </ParchPanel>
    </Box>
  );
};

const VitalsCard: React.FC<{ rows: VitalRow[]; onSetVital: (key: VitalKey, value: number) => void }> = ({ rows, onSetVital }) => {
  const [editing, setEditing] = useState<number | null>(null);
  return (
    <>
      <Card>
        <SecHead>Életerő</SecHead>
        {rows.map((v, i) => {
          const pct = v.max > 0 ? Math.max(0, Math.min(100, (v.cur / v.max) * 100)) : 0;
          const empty = v.cur === 0;
          return (
            <Box as="button" type="button" key={v.key} onClick={() => setEditing(i)} w="100%" textAlign="left" display="block" mb="9px" px="5px" mx="-5px" py="2px" borderRadius="6px" _hover={{ bg: "accentSoft" }}>
              <HStack justify="space-between" align="baseline" mb="5px" gap="8px">
                <Text fontFamily="system-ui" fontSize="11px" letterSpacing=".05em" color="muted">{v.label}</Text>
                <Text fontSize="13.5px" fontWeight={600} color={empty ? "fgFaint" : "fg"} sx={{ fontVariantNumeric: "tabular-nums" }}>{v.cur} / {v.max}</Text>
              </HStack>
              <Box h={{ base: "11px", md: "8px" }} borderRadius="3px" bg="vitTrack" overflow="hidden"><Box h="100%" w={`${pct}%`} bg={VIT_TOKEN[v.kind]} borderRadius="3px" transition="width .3s" /></Box>
            </Box>
          );
        })}
        {rows.length === 0 && <Empty>Nincs életerő-tároló.</Empty>}
      </Card>
      {editing !== null && rows[editing] && (
        <VitalModal v={rows[editing]} onSetCur={(n) => onSetVital(rows[editing].key, n)} onClose={() => setEditing(null)} />
      )}
    </>
  );
};

export const CharacterSheet: React.FC<Props> = ({ record, derived, onSetVital, onOpenSkill, onOpenSpell, onOpenWeapon }) => {
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

  const vitalRows: VitalRow[] = VITAL_META.filter((m) => derived.vitals[m.key].max > 0).map((m) => ({
    key: m.key, label: m.label, kind: m.kind, cur: derived.vitals[m.key].current, max: derived.vitals[m.key].max,
  }));

  const combatRows: { k: string; v: React.ReactNode }[] = [
    ...(["KÉ", "TÉ", "VÉ", "CÉ"] as const).map((c) => ({ k: c as string, v: derived.combat[c] as React.ReactNode })),
    { k: "MME", v: derived.derived.MME },
    { k: "AME", v: derived.derived.AME },
    ...(derived.derived.Sebzésbónusz > 0 ? [{ k: "Sebzésbónusz", v: `+${derived.derived.Sebzésbónusz}` }] : []),
  ];

  const skillGroups = CATEGORIES.map((cat) => ({
    name: cat,
    items: derived.skills
      .filter((s) => SKILL_BY_NAME[s.skill]?.category === cat)
      .map((s) => ({ key: s.skill + (s.subtype || ""), name: s.subtype ? `${s.skill} (${s.subtype})` : s.skill, val: s.percent != null ? `${s.percent}%` : `${s.fok}`, open: () => onOpenSkill(s.skill, s.fok, s.percent) })),
  })).filter((g) => g.items.length > 0);

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
            <Box key={c.k} {...rowProps} justifyContent="space-between" gap="14px">
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

      {/* Column 5 — Inventory */}
      <Col>
        <Card>
          <SecHead>Felszerelés</SecHead>
          {record.inventory.length === 0 && <Empty>Üres a felszereléslista.</Empty>}
          {record.inventory.map((e, i) => (
            <Text key={i} py={ROWPY} color="fg" fontSize={FS} lineHeight="1.35" borderBottom={i === record.inventory.length - 1 ? undefined : "1px solid"} borderColor="hairSoft">
              {e.name}{e.qty && e.qty > 1 ? ` ×${e.qty}` : ""}
            </Text>
          ))}
        </Card>
      </Col>
    </Box>
  );
};
