import React, { useState } from "react";
import { Box, Heading, HStack, Text } from "@chakra-ui/react";
import { ParchPanel } from "./ParchPanel";
import {
  identity, vitals, attrs, derivedValues, combat, skillCats, schools, equipment, charCombat,
} from "./sampleData";
import { WeaponModalState } from "./WeaponModal";

interface Props {
  onOpenSkill: (name: string, level: number) => void;
  onOpenSpell: (name: string, school: string, mana: number, time: string) => void;
  onOpenWeapon: (w: WeaponModalState) => void;
}

const FS = { base: "16px", md: "14.5px" };
const FS_NAME = { base: "17px", md: "15.5px" };
const FS_SEC = { base: "21px", md: "18px" };
const FS_SUB = { base: "14px", md: "12.5px" };
const ROWPY = { base: "5px", md: "3.5px" };
const GAP = { base: "16px", md: "14px" };

const VIT_TOKEN: Record<string, string> = { hp: "vitHp", fp: "vitFp", mana: "vitMana", kegy: "vitKegy", pszi: "vitPszi" };

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ParchPanel flex="0 0 auto">{children}</ParchPanel>
);
const SecHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading as="h2" fontSize={FS_SEC} fontWeight={700} color="fg" pb="6px" mb="6px" borderBottom="1px solid" borderColor="rule">
    {children}
  </Heading>
);
const SubHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em" pb="3px" mt="13px" mb="3px" borderBottom="1px solid" borderColor="hair">
    {children}
  </Box>
);
const ValNum: React.FC<{ children: React.ReactNode } & Record<string, unknown>> = ({ children, ...rest }) => (
  <Text fontWeight={600} color="fg" fontSize={FS_NAME} flexShrink={0} sx={{ fontVariantNumeric: "tabular-nums" }} {...rest}>
    {children}
  </Text>
);

const Col: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box flex="1 1 268px" minW="246px" maxW="392px" h="100%" overflowY="auto" display="flex" flexDirection="column" gap={GAP} pb="36px">
    {children}
  </Box>
);

const rowProps = { display: "flex", alignItems: "baseline", py: ROWPY } as const;

interface VitalRow { label: string; cur: number; max: number; kind: string }

// A vital bar (read-only display) — clickable to open the heal/damage editor.
const VitalBar: React.FC<{ v: VitalRow; onClick: () => void }> = ({ v, onClick }) => {
  const max = Math.max(0, v.max);
  const cur = Math.max(0, Math.min(v.cur, max || v.cur));
  const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  const empty = cur === 0;
  return (
    <Box as="button" type="button" onClick={onClick} w="100%" textAlign="left" display="block" mb="9px" px="5px" mx="-5px" py="2px" borderRadius="6px" _hover={{ bg: "accentSoft" }}>
      <HStack justify="space-between" align="baseline" mb="5px" gap="8px">
        <Text fontFamily="system-ui" fontSize="11px" letterSpacing=".05em" color="muted">{v.label}</Text>
        <Text fontSize="13.5px" fontWeight={600} color={empty ? "fgFaint" : "fg"} sx={{ fontVariantNumeric: "tabular-nums" }}>{cur} / {max}</Text>
      </HStack>
      <Box h={{ base: "11px", md: "8px" }} borderRadius="3px" bg="vitTrack" overflow="hidden">
        <Box h="100%" w={`${pct}%`} bg={VIT_TOKEN[v.kind]} borderRadius="3px" transition="width .3s" />
      </Box>
    </Box>
  );
};

const PadKey: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <Box as="button" type="button" onClick={onClick} h={{ base: "52px", md: "44px" }} borderRadius="9px" border="1px solid" borderColor="fieldBd" bg="fieldBg" color="fg" fontSize="20px" fontWeight={600} display="flex" alignItems="center" justifyContent="center" _hover={{ borderColor: "accent", bg: "accentSoft" }} _active={{ bg: "accentSoft" }} sx={{ fontVariantNumeric: "tabular-nums" }}>
    {children}
  </Box>
);

// The heal/damage calculator modal — number pad + Sebzés / Gyógyítás, plus a quick "Teljes" and an
// editable maximum. (Local state only.)
const VitalModal: React.FC<{ v: VitalRow; onChange: (field: "cur" | "max", value: number) => void; onClose: () => void }> = ({ v, onChange, onClose }) => {
  const [amount, setAmount] = useState("");
  const max = Math.max(0, v.max);
  const cur = Math.max(0, Math.min(v.cur, max || v.cur));
  const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  const amt = parseInt(amount, 10) || 0;
  // Ép / Fp take damage & heal; the magic pools (Mana/Kegy/Pszi) are used & regained.
  const healable = v.kind === "hp" || v.kind === "fp";
  const downLabel = healable ? "− Sebzés" : "− Felhasználás";
  const upLabel = healable ? "+ Gyógyítás" : "+ Visszanyerés";
  const press = (d: string) => setAmount((a) => (a === "0" ? d : (a + d).slice(0, 4)));
  const apply = (mode: "heal" | "damage") => {
    if (amt <= 0) return;
    onChange("cur", mode === "heal" ? cur + amt : cur - amt);
    setAmount("");
  };

  return (
    <Box position="fixed" inset={0} zIndex={45} bg="rgba(16,14,24,.55)" display="flex" alignItems="center" justifyContent="center" p="20px" onClick={onClose}>
      <ParchPanel onClick={(e: React.MouseEvent) => e.stopPropagation()} borderRadius="12px" p={0} w="min(360px, 100%)" maxH="92vh" display="flex" flexDirection="column" overflow="hidden" style={{ boxShadow: "0 24px 64px rgba(0,0,0,.42)" }}>
        <Box position="relative" px="24px" pt="18px" pb="13px" borderBottom="1px solid" borderColor="rule" textAlign="center">
          <Box as="button" type="button" onClick={onClose} position="absolute" top="13px" right="14px" w="30px" h="30px" borderRadius="8px" border="1px solid" borderColor="hair" bg="fieldBg" color="muted" fontSize="14px" display="inline-flex" alignItems="center" justifyContent="center">✕</Box>
          <Heading as="h3" fontSize="20px" fontWeight={700} color="fg">{v.label}</Heading>
          <Text mt="2px" fontSize="22px" fontWeight={700} color={cur === 0 ? "bad" : "accentTx"} sx={{ fontVariantNumeric: "tabular-nums" }}>{cur} / {max}</Text>
        </Box>

        <Box flex="1 1 auto" overflowY="auto" px="20px" pt="14px" pb="20px">
          <Box h="9px" borderRadius="3px" bg="vitTrack" overflow="hidden" mb="14px">
            <Box h="100%" w={`${pct}%`} bg={VIT_TOKEN[v.kind]} borderRadius="3px" transition="width .3s" />
          </Box>

          {/* entered amount */}
          <Box bg="fieldBg" border="1px solid" borderColor="fieldBd" borderRadius="9px" py="9px" px="14px" textAlign="center" mb="10px">
            <Text fontSize="26px" fontWeight={700} color={amt > 0 ? "fg" : "fgFaint"} sx={{ fontVariantNumeric: "tabular-nums" }}>{amount || "0"}</Text>
          </Box>

          {/* number pad */}
          <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap="7px">
            {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((d) => (
              <PadKey key={d} onClick={() => press(d)}>{d}</PadKey>
            ))}
            <PadKey onClick={() => setAmount("")}>C</PadKey>
            <PadKey onClick={() => press("0")}>0</PadKey>
            <PadKey onClick={() => setAmount((a) => a.slice(0, -1))}>⌫</PadKey>
          </Box>

          {/* damage / heal  ·  use / gain */}
          <HStack gap="9px" mt="12px">
            <Box as="button" type="button" onClick={() => apply("damage")} flex="1" py="11px" borderRadius="9px" border="1px solid" borderColor="bad" bg="transparent" color="bad" fontWeight={700} fontSize="15px" opacity={amt > 0 ? 1 : 0.45} _hover={amt > 0 ? { bg: "accentSoft" } : undefined}>
              {downLabel}
            </Box>
            <Box as="button" type="button" onClick={() => apply("heal")} flex="1" py="11px" borderRadius="9px" border="1px solid" borderColor="good" bg="transparent" color="good" fontWeight={700} fontSize="15px" opacity={amt > 0 ? 1 : 0.45} _hover={amt > 0 ? { bg: "accentSoft" } : undefined}>
              {upLabel}
            </Box>
          </HStack>

          {/* quick full restore */}
          <Box as="button" type="button" onClick={() => onChange("cur", max)} w="100%" mt="10px" py="9px" borderRadius="9px" border="1px solid" borderColor="fieldBd" bg="fieldBg" color="accentTx" fontWeight={600} fontSize="14px" _hover={{ borderColor: "accent" }}>
            Teljes feltöltés
          </Box>
        </Box>
      </ParchPanel>
    </Box>
  );
};

// The Életerő card — slim color-coded meters; click a bar to heal/damage.
const VitalsCard: React.FC = () => {
  const [rows, setRows] = useState<VitalRow[]>(vitals.map((v) => ({ ...v })));
  const [editing, setEditing] = useState<number | null>(null);
  const setVal = (i: number, field: "cur" | "max", value: number) =>
    setRows((rs) =>
      rs.map((r, idx) => {
        if (idx !== i) return r;
        if (field === "max") {
          const m = Math.max(0, value);
          return { ...r, max: m, cur: Math.min(r.cur, m) };
        }
        return { ...r, cur: Math.max(0, Math.min(value, r.max)) };
      })
    );
  return (
    <>
      <Card>
        <SecHead>Életerő</SecHead>
        {rows.map((v, i) => (
          <VitalBar key={v.label} v={v} onClick={() => setEditing(i)} />
        ))}
      </Card>
      {editing !== null && (
        <VitalModal v={rows[editing]} onChange={(field, value) => setVal(editing, field, value)} onClose={() => setEditing(null)} />
      )}
    </>
  );
};

export const CharacterSheet: React.FC<Props> = ({ onOpenSkill, onOpenSpell, onOpenWeapon }) => (
  <Box flex="1 1 auto" minH={0} display="flex" gap={GAP} overflowX="auto" bg="page" px={{ base: "20px", md: "16px" }} py={GAP}>
    {/* Column 1 — Identity, Életerő, Tulajdonságok */}
    <Col>
      <Card>
        <Text fontSize={{ base: "26px", md: "22px" }} fontWeight={700} color="fg" lineHeight="1.1">{identity.name}</Text>
        <Box h="1px" bg="rule" my="9px" />
        {identity.fields.map((f) => (
          <HStack key={f.k} align="baseline" gap="12px" py={ROWPY}>
            <Text flex="0 0 84px" color="muted" fontSize={FS}>{f.k}</Text>
            <Text color="fg" fontSize={FS}>{f.v}</Text>
          </HStack>
        ))}
      </Card>

      <VitalsCard />

      <Card>
        <SecHead>Tulajdonságok</SecHead>
        {attrs.map((a) => (
          <Box key={a.k} {...rowProps} justifyContent="space-between" gap="14px">
            <Text color="fg" fontSize={FS}>{a.k}</Text>
            <ValNum>{a.v}</ValNum>
          </Box>
        ))}
      </Card>
    </Col>

    {/* Column 2 — Származtatott, Harcértékek */}
    <Col>
      <Card>
        <SecHead>Származtatott értékek</SecHead>
        {derivedValues.map((d) => (
          <Box key={d.k} {...rowProps} justifyContent="space-between" gap="14px">
            <Text color="muted" fontSize={FS}>{d.k}</Text>
            <ValNum>{d.v}</ValNum>
          </Box>
        ))}
      </Card>
      <Card>
        <SecHead>Harcértékek</SecHead>
        {combat.map((g) => {
          const melee = g.name === "Közelharc";
          return (
            <Box key={g.name}>
              <SubHead>{g.name}</SubHead>
              {g.rows.map((w) => (
                <Box
                  as="button"
                  type="button"
                  key={w.name}
                  onClick={() =>
                    onOpenWeapon(
                      melee
                        ? { kind: "melee", name: w.name, dmg: w.dmg, baseKE: charCombat.KE, baseTE: w.val, baseVE: charCombat.VE }
                        : { kind: "ranged", name: w.name, dmg: w.dmg, baseCE: w.val }
                    )
                  }
                  display="flex"
                  alignItems="baseline"
                  w="100%"
                  textAlign="left"
                  gap="10px"
                  py={ROWPY}
                  px="5px"
                  mx="-5px"
                  borderRadius="5px"
                  _hover={{ bg: "accentSoft" }}
                >
                  <Text flex="1 1 auto" color="fg" fontSize={FS}>{w.name}</Text>
                  {w.dmg && <Text flexShrink={0} color="muted" fontSize="13px" sx={{ fontVariantNumeric: "tabular-nums" }}>{w.dmg}</Text>}
                  <ValNum w="38px" textAlign="right">{w.val}</ValNum>
                </Box>
              ))}
            </Box>
          );
        })}
      </Card>
    </Col>

    {/* Column 3 — Képzettségek */}
    <Col>
      <Card>
        <SecHead>Képzettségek</SecHead>
        {skillCats.map((c) => (
          <Box key={c.name}>
            <SubHead>{c.name}</SubHead>
            {c.items.map((s) => (
              <Box
                as="button"
                type="button"
                key={s.name}
                onClick={() => onOpenSkill(s.name, s.val)}
                display="flex"
                alignItems="baseline"
                justifyContent="space-between"
                w="100%"
                textAlign="left"
                gap="14px"
                py={ROWPY}
                px="5px"
                mx="-5px"
                borderRadius="5px"
                _hover={{ bg: "accentSoft" }}
              >
                <Text color="fg" fontSize={FS}>{s.name}</Text>
                <ValNum>{s.val}</ValNum>
              </Box>
            ))}
          </Box>
        ))}
      </Card>
    </Col>

    {/* Column 4 — Bárdmágia */}
    <Col>
      <Card>
        <SecHead>Bárdmágia</SecHead>
        {schools.map((sc) => (
          <Box key={sc.name}>
            <HStack align="flex-end" justify="space-between" gap="10px" fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em" pb="3px" mt="13px" mb="3px" borderBottom="1px solid" borderColor="hair">
              <Box as="span">{sc.name}</Box>
              <HStack as="span" gap="10px" fontFamily="system-ui" fontWeight={600} fontSize="9.5px" letterSpacing=".07em" textTransform="uppercase" color="fgFaint">
                <Box as="span" w="34px" textAlign="right">Mana</Box>
                <Box as="span" w="48px" textAlign="right">Idő</Box>
              </HStack>
            </HStack>
            {sc.spells.map((sp) => (
              <Box
                as="button"
                type="button"
                key={sp.name}
                onClick={() => onOpenSpell(sp.name, sc.name, sp.mana, sp.time)}
                display="flex"
                alignItems="baseline"
                w="100%"
                textAlign="left"
                gap="10px"
                py={ROWPY}
                px="5px"
                mx="-5px"
                borderRadius="5px"
                _hover={{ bg: "accentSoft" }}
              >
                <Text flex="1 1 auto" color="fg" fontSize={FS} lineHeight="1.25">{sp.name}</Text>
                <Text flexShrink={0} w="34px" textAlign="right" fontWeight={600} color="accentTx" fontSize={FS_NAME} sx={{ fontVariantNumeric: "tabular-nums" }}>{sp.mana}</Text>
                <Text flexShrink={0} w="48px" textAlign="right" color="muted" fontSize="13.5px">{sp.time}</Text>
              </Box>
            ))}
          </Box>
        ))}
      </Card>
    </Col>

    {/* Column 5 — Felszerelés */}
    <Col>
      <Card>
        <SecHead>Felszerelés</SecHead>
        {equipment.map((e, i) => (
          <Text key={i} py={ROWPY} color="fg" fontSize={FS} lineHeight="1.35" borderBottom={i === equipment.length - 1 ? undefined : "1px solid"} borderColor="hairSoft">
            {e}
          </Text>
        ))}
      </Card>
    </Col>
  </Box>
);
