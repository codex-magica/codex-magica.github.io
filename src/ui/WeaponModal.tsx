import React, { useState } from "react";
import { Box, Heading, HStack, Input, Select, Text } from "@chakra-ui/react";
import { ModalShell, ModalHeader } from "./Modal";
import { FIELD_SX } from "./tokens";

// ── the situational data (transcribed verbatim from the old combat modals) ──
type KeMod = number | "támadóé" | "nincs";
interface MeleeMod { id: string; label: string; ke: KeMod; te: number; ve: number }

const MELEE_MODS: MeleeMod[] = [
  { id: "surprise", label: "Meglepetésszerű támadás", ke: "támadóé", te: 30, ve: 0 },
  { id: "high", label: "Harc magasabbról", ke: 0, te: 5, ve: 5 },
  { id: "rooted", label: "Harc helyhez kötve", ke: -10, te: 0, ve: -10 },
  { id: "lying", label: "Harc fekve", ke: "nincs", te: -20, ve: -10 },
  { id: "horse", label: "Harc mozgó lóról", ke: 0, te: 20, ve: 10 },
  { id: "dark", label: "Vakon vagy vaksötétben", ke: "nincs", te: -60, ve: -60 },
  { id: "invis", label: "Láthatatlan ellenféllel", ke: "nincs", te: -40, ve: -40 },
  { id: "fear", label: "Félelem hatása alatt", ke: "támadóé", te: -20, ve: 10 },
  { id: "hatred", label: "Gyűlölettel eltelve", ke: 5, te: 5, ve: -10 },
  { id: "grapple", label: "Az ellenfél elfogásáért", ke: 0, te: -10, ve: 0 },
  { id: "charge", label: "Roham", ke: 0, te: 20, ve: -20 },
  { id: "stun", label: "Harc kábultan", ke: -10, te: -20, ve: -10 },
];

const TARGET_SIZE: [string, number][] = [
  ["Óriás", -50], ["Szekér", -30], ["Ló", -10], ["Ember", 0],
  ["Kutya", 10], ["Dinnye", 30], ["Alma", 50], ["Pénzérme", 70],
];
const BEHAVIOR: [string, number][] = [
  ["Mozdulatlan célpont", 0], ["Kiszámíthatóan mozgó", 10],
  ["Kiszámíthatatlanul mozgó", 30], ["Kitérésre összpontosító", 50],
];
const WEATHER: [string, number][] = [
  ["Napsütés, szélcsend", 0], ["Szemerkélő eső, szellő", 10], ["Gyenge eső, szél", 30],
  ["Ritkább köd, erős szél", 50], ["Sűrű köd, zivatar, vihar", 70],
];
const CALLED_SHOT: [string, number][] = [
  ["Nincs", 0], ["Kar, láb", 10], ["Fej", 30], ["Torok, kéz-/lábfej, lágyék", 50], ["Szem, ujjak, száj", 70],
];
const RANGED_TOGGLES: { id: string; label: string; mod: number }[] = [
  { id: "invis", label: "Láthatatlan ellenféllel", mod: -75 },
  { id: "dark", label: "Vakon vagy vaksötétben", mod: -150 },
  { id: "charge", label: "Roham", mod: -20 },
  { id: "stun", label: "Harc kábultan", mod: -30 },
];

export interface WeaponModalState {
  kind: "melee" | "ranged";
  name: string;
  dmg?: string;
  range?: string;
  baseKE?: number;
  baseTE?: number;
  baseVE?: number;
  baseCE?: number;
}

const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
const num = (v: number | string) => (typeof v === "number" ? `${v}`.replace("-", "−") : v);

// ── small building blocks ──
const NumField: React.FC<{ label: string; value: number; onChange: (n: number) => void }> = ({ label, value, onChange }) => (
  <Box flex="1" minW="64px">
    <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".1em" textTransform="uppercase" color="fgFaint" mb="3px">{label}</Text>
    <Input {...FIELD_SX} size="sm" type="number" value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)} sx={{ fontVariantNumeric: "tabular-nums" }} />
  </Box>
);

const Dropdown: React.FC<{ label: string; options: [string, number][]; value: number; onChange: (n: number) => void }> = ({ label, options, value, onChange }) => (
  <Box>
    <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".1em" textTransform="uppercase" color="fgFaint" mb="3px">{label}</Text>
    <Select {...FIELD_SX} size="sm" value={value} onChange={(e) => onChange(parseInt(e.target.value, 10))}>
      {options.map(([name, mod]) => (
        <option key={name} value={mod}>{name}{mod !== 0 ? ` (${sign(mod)})` : ""}</option>
      ))}
    </Select>
  </Box>
);

const Toggle: React.FC<{ active: boolean; onClick: () => void; label: string; effect: string }> = ({ active, onClick, label, effect }) => (
  <Box
    as="button"
    type="button"
    onClick={onClick}
    w="100%"
    textAlign="left"
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    gap="10px"
    px="12px"
    py="9px"
    borderRadius="8px"
    border="1px solid"
    borderColor={active ? "accent" : "fieldBd"}
    bg={active ? "accentSoft" : "fieldBg"}
    transition="background .12s, border-color .12s"
  >
    <Text fontSize="14.5px" fontWeight={active ? 600 : 400} color={active ? "accentTx" : "fg"}>{label}</Text>
    <Text fontFamily="system-ui" fontSize="11px" color={active ? "accentTx" : "fgFaint"} whiteSpace="nowrap" sx={{ fontVariantNumeric: "tabular-nums" }}>{effect}</Text>
  </Box>
);

const ResultCard: React.FC<{ label: string; value: React.ReactNode; bad?: boolean }> = ({ label, value, bad }) => (
  <Box flex="1" textAlign="center" bg="accentSoft" borderRadius="9px" py="10px" px="6px">
    <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".1em" textTransform="uppercase" color="accentTx" opacity={0.8}>{label}</Text>
    <Text fontSize="24px" fontWeight={700} color={bad ? "bad" : "accentTx"} lineHeight="1.15" sx={{ fontVariantNumeric: "tabular-nums" }}>{value}</Text>
  </Box>
);

const SubHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text fontFamily="system-ui" fontSize="11px" fontWeight={700} letterSpacing=".11em" textTransform="uppercase" color="catTx" mt="16px" mb="7px">{children}</Text>
);

// ── the modal ──
export const WeaponModal: React.FC<{ weapon: WeaponModalState; onClose: () => void }> = ({ weapon, onClose }) => {
  const isMelee = weapon.kind === "melee";

  // melee state
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [ke, setKe] = useState(weapon.baseKE ?? 0);
  const [te, setTe] = useState(weapon.baseTE ?? 0);
  const [ve, setVe] = useState(weapon.baseVE ?? 0);
  // ranged state
  const [ce, setCe] = useState(weapon.baseCE ?? 0);
  const [range, setRange] = useState(0);
  const [size, setSize] = useState(0);
  const [behavior, setBehavior] = useState(0);
  const [weather, setWeather] = useState(0);
  const [calledShot, setCalledShot] = useState(0);

  const toggle = (id: string) => setActive((a) => ({ ...a, [id]: !a[id] }));
  const activeMelee = MELEE_MODS.filter((m) => active[m.id]);

  // melee result
  const finalKE: KeMod = activeMelee.some((m) => m.ke === "nincs")
    ? "nincs"
    : activeMelee.some((m) => m.ke === "támadóé")
    ? "támadóé"
    : ke + activeMelee.reduce((s, m) => s + (typeof m.ke === "number" ? m.ke : 0), 0);
  const finalTE = te + activeMelee.reduce((s, m) => s + m.te, 0);
  const finalVE = ve + activeMelee.reduce((s, m) => s + m.ve, 0);

  // ranged result
  const targetVE = 50 + range + size + behavior + weather + calledShot;
  const finalCE = ce + RANGED_TOGGLES.reduce((s, t) => s + (active[t.id] ? t.mod : 0), 0);
  const minRoll = Math.max(Math.min(targetVE - finalCE, 100), 2);

  return (
    <ModalShell onClose={onClose} width="min(560px, 100%)" maxH="90vh">
      <ModalHeader onClose={onClose} closeSize="md" px="26px" pt="20px" pb="14px">
        <Heading as="h3" fontSize={{ base: "23px", md: "20px" }} fontWeight={700} color="fg">{weapon.name}</Heading>
        <Text mt="3px" fontFamily="system-ui" fontSize="12px" color="fgFaint">
          {isMelee ? "Közelharci kalkulátor" : "Távolsági harc kalkulátor"}
          {weapon.dmg ? ` · Sebzés: ${weapon.dmg}` : ""}
          {weapon.range ? ` · Lőtáv: ${weapon.range}` : ""}
        </Text>
      </ModalHeader>

      <Box flex="1 1 auto" overflowY="auto" px="26px" pt="16px" pb="24px">
          {/* results */}
          {isMelee ? (
            <HStack gap="10px" align="stretch">
              <ResultCard label="KÉ" value={num(finalKE)} />
              <ResultCard label="TÉ" value={finalTE} bad={finalTE < 0} />
              <ResultCard label="VÉ" value={finalVE} bad={finalVE < 0} />
            </HStack>
          ) : (
            <HStack gap="10px" align="stretch">
              <ResultCard label="Célpont VÉ" value={targetVE} />
              <ResultCard label="Módosított CÉ" value={finalCE} bad={finalCE < 0} />
              <ResultCard label="Min. dobás" value={minRoll} />
            </HStack>
          )}
          {!isMelee && (
            <Text fontFamily="system-ui" fontSize="11.5px" color="fgFaint" textAlign="center" mt="7px">
              A találathoz d100 ≥ {minRoll} dobás kell (CÉ + dobás ≥ célpont VÉ).
            </Text>
          )}

          {/* base values */}
          <SubHead>Alapértékek</SubHead>
          {isMelee ? (
            <HStack gap="10px">
              <NumField label="KÉ" value={ke} onChange={setKe} />
              <NumField label="TÉ" value={te} onChange={setTe} />
              <NumField label="VÉ" value={ve} onChange={setVe} />
            </HStack>
          ) : (
            <HStack gap="10px">
              <NumField label="Célzóérték (CÉ)" value={ce} onChange={setCe} />
              <NumField label="Távolság mód." value={range} onChange={setRange} />
            </HStack>
          )}

          {/* situational */}
          <SubHead>Körülmények</SubHead>
          {isMelee ? (
            <Box display="flex" flexDirection="column" gap="6px">
              {MELEE_MODS.map((m) => (
                <Toggle
                  key={m.id}
                  active={!!active[m.id]}
                  onClick={() => toggle(m.id)}
                  label={m.label}
                  effect={`KÉ ${num(m.ke)} · TÉ ${sign(m.te)} · VÉ ${sign(m.ve)}`}
                />
              ))}
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap="11px">
              <Dropdown label="Célpont mérete" options={TARGET_SIZE} value={size} onChange={setSize} />
              <Dropdown label="Viselkedés" options={BEHAVIOR} value={behavior} onChange={setBehavior} />
              <Dropdown label="Időjárás" options={WEATHER} value={weather} onChange={setWeather} />
              <Dropdown label="Célzott támadás" options={CALLED_SHOT} value={calledShot} onChange={setCalledShot} />
              <Box display="flex" flexDirection="column" gap="6px" mt="2px">
                {RANGED_TOGGLES.map((t) => (
                  <Toggle key={t.id} active={!!active[t.id]} onClick={() => toggle(t.id)} label={t.label} effect={`CÉ ${sign(t.mod)}`} />
                ))}
              </Box>
            </Box>
          )}
      </Box>
    </ModalShell>
  );
};
