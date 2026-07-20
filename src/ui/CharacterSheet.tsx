import React, { useState } from "react";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { TimeIcon } from "@chakra-ui/icons";
import { WeaponModalState } from "./WeaponModal";
import { CharacterCondition, CharacterRecord, VitalKey } from "../model/character";
import { Companion } from "../model/companions";
import { DerivedCharacter } from "../engine/types";
import { STAT_KEYS, Stat } from "../model/attributes";
import { rulesFor } from "../model/rulesVariants";
import { SKILL_CATEGORIES } from "../model/common";
import { VITALS, POOL_UNIT } from "../model/vitals";
import { FIST, buildWeaponRows, weaponExtraFor } from "../model/weaponUse";
import { FS, FS_SUB, ROWPY, GAP, Card, SecHead, SubHead, ValNum, Col, Empty, rowProps } from "./sheet/primitives";
import { VitalsCard, VitalRow } from "./sheet/VitalsCard";
import { EquipmentCard } from "./sheet/EquipmentCard";
import { CompanionsCard } from "./sheet/CompanionsCard";
import { CombatCard, INFO_UL } from "./sheet/CombatCard";
import { usePager } from "./sheet/usePager";
import { AbilityRows } from "./AbilityRows";
import { CombatInfoModal, StatInfoModal } from "./InfoModals";

interface Props {
  record: CharacterRecord;
  derived: DerivedCharacter;
  onSetVital: (key: VitalKey, value: number) => void;
  onSetInventory: (text: string) => void;
  onSetConditions: (conditions: CharacterCondition[]) => void;
  onSetCompanions: (companions: Companion[]) => void;
  onSetWeapons: (weapons: string[]) => void;
  onSetActiveWeapon: (name: string | null) => void;
  onSetArmor: (name: string | null) => void;
  onSetShield: (name: string | null) => void;
  onToggleArmorWorn: () => void;
  onToggleShieldWorn: () => void;
  onOpenSkill: (name: string, fok: number, percent?: number | null) => void;
  onOpenSpell: (name: string, school: string) => void;
  onOpenWeapon: (w: WeaponModalState) => void;
}

// one sheet panel per spell list the character has unlocked, in this order
const SCHOOL_ORDER = ["Bárdmágia", "Tűzmágia", "Boszorkánymágia", "Boszorkánymesteri", "Magasmágia", "Pszi", "Szakrális"];
// Display captions for school panels whose data key omits "mágia". The keys stay as-is for
// filtering/lookups (the prayer/spell `school`); only the visible header reads the fuller name.
const SCHOOL_CAPTIONS: Record<string, string> = {
  "Szakrális": "Szakrális mágia",
  "Boszorkánymesteri": "Boszorkánymesteri mágia",
};
const schoolCaption = (school: string) => SCHOOL_CAPTIONS[school] ?? school;

// spell table: name (takes the slack) | Mana(/Ψp/Kp) | Időigény (clock) — the two value columns are
// narrow, fixed-width and tucked tightly together at the right, with their headers + values centred.
const SPELL_COLS = "minmax(0,1fr) 32px 46px";
const SPELL_GAP = "5px";
// Prayers only: the spheres a fohász belongs to, as initials after its name (ÉHLT). A prayer open to
// all four spheres is the unremarkable case — show nothing there, so the marks flag the restrictions.
const SPHERE_INITIAL: Record<string, string> = { "Élet": "É", "Halál": "H", "Lélek": "L", "Természet": "T" };
const SPHERE_ORDER = ["Élet", "Halál", "Lélek", "Természet"]; // canonical order for the panel caption
const spheres = (domains?: string[]): string | undefined =>
  domains && domains.length > 0 && domains.length < 4 ? domains.map((d) => SPHERE_INITIAL[d] ?? d[0].toUpperCase()).join("") : undefined;

// Compact the Időigény for the narrow clock column: szegmens → sz, perc → p, and collapse anything
// still long (e.g. "Lásd a leírást!", ranges) to "…" — full text stays in the modal.
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

export const CharacterSheet: React.FC<Props> = ({ record, derived, onSetVital, onSetInventory, onSetConditions, onSetCompanions, onSetWeapons, onSetActiveWeapon, onSetArmor, onSetShield, onToggleArmorWorn, onToggleShieldWorn, onOpenSkill, onOpenSpell, onOpenWeapon }) => {
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

  // Clicked harcérték / tulajdonság → formula-with-values + book definition modal.
  const [combatInfo, setCombatInfo] = useState<string | null>(null);
  const [statInfo, setStatInfo] = useState<Stat | null>(null);

  // Weapons pinned to the Harcértékek panel — the weapon math (training resolution, adjusted values,
  // calculator payloads) lives in model/weaponUse. The fist row is built-in and non-removable.
  const pinnedWeapons = (record.weapons ?? []).filter((n) => n !== FIST);
  const weaponRows = buildWeaponRows(pinnedWeapons, derived.skills, derived.combat, derived.derived.Sebzésbónusz);
  // The weapon "in hand": the combat tiles show ITS adjusted values (the fist row is the default).
  const activeRow = weaponRows.find((r) => r.w.name === record.activeWeapon) ?? weaponRows[0];

  const skillGroups = SKILL_CATEGORIES.map((cat) => ({
    name: cat,
    items: derived.skills
      .filter((s) => rulesFor(record).skills[s.skill]?.category === cat)
      // key by the STABLE identity (variant id / original subtype) — two instances may share the display text
      .map((s) => ({ key: s.skill + "|" + (s.variantId ?? s.origSubtype ?? s.subtype ?? ""), name: s.subtype ? `${s.skill} (${s.subtype})` : s.skill, val: s.percent != null ? `${s.percent}%` : `${s.fok}`, open: () => onOpenSkill(s.skill, s.fok, s.percent) })),
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

  // phone pager: the columns are full-width snap pages; the dots track/drive the scroll position
  const pageCount = 4 + spellSchools.length; // 3 fixed cols + spell schools + inventory
  const { scrollRef, onScroll, page, goPage } = usePager(pageCount);

  return (
    <Box position="relative" flex="1 1 auto" minH={0}>
    {/* md+: side-by-side columns, each with its own vertical scroll (the container pans freely).
        base (phones): the same columns as full-width pages with mandatory x-snap. */}
    <Box ref={scrollRef} onScroll={onScroll} h="100%" display="flex" gap={GAP} overflowX="auto"
      bg="page" px="16px" py={GAP}
      sx={{
        scrollSnapType: { base: "x mandatory", md: "none" },
        scrollPaddingLeft: "16px",
        scrollPaddingRight: "16px",
        WebkitOverflowScrolling: "touch",
      }}>
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

        <VitalsCard rows={vitalRows} onSetVital={onSetVital} conditions={record.conditions ?? []} onSetConditions={onSetConditions} />

        {derived.tags.length > 0 && (
          <Card>
            <SecHead>Képességek</SecHead>
            <AbilityRows tags={derived.tags} />
          </Card>
        )}
      </Col>

      {/* Column 2 */}
      <Col>
        <Card>
          <SecHead>Tulajdonságok</SecHead>
          {STAT_KEYS.map((s) => (
            <Box key={s} as="button" type="button" w="100%" textAlign="left" onClick={() => setStatInfo(s)} title="Miből áll össze?"
              {...rowProps} display="flex" justifyContent="space-between" gap="14px" _hover={{ bg: "accentSoft", borderRadius: "7px" }}>
              <Text color="fg" fontSize={FS}>{s}</Text>
              <ValNum sx={{ fontVariantNumeric: "tabular-nums", ...INFO_UL }}>{derived.effectiveStats[s]}</ValNum>
            </Box>
          ))}
        </Card>
        <CombatCard
          derived={derived}
          weaponRows={weaponRows}
          activeRow={activeRow}
          pinnedWeapons={pinnedWeapons}
          onSetWeapons={onSetWeapons}
          onSetActiveWeapon={onSetActiveWeapon}
          onSetArmor={onSetArmor}
          onSetShield={onSetShield}
          onToggleArmorWorn={onToggleArmorWorn}
          onToggleShieldWorn={onToggleShieldWorn}
          onOpenWeapon={(row) => onOpenWeapon(row.modal)}
          onCombatInfo={setCombatInfo}
        />
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
              <SecHead>{schoolCaption(g.school)}</SecHead>
              {/* Szakrális: the kegyelt's spheres — the fohászok below are filtered to these, and a
                  Kegyelt + Vallásismeret 3 character may edit them (priesthood only sets the defaults). */}
              {/* read-only here — the szférák are edited in the character builder, not on the sheet */}
              {g.school === "Szakrális" && derived.spheres.length > 0 && (
                <Text mt="-4px" mb="2px" fontFamily="ui" fontSize="11px" fontWeight={600} color="muted" letterSpacing=".01em">
                  Szférák: {SPHERE_ORDER.filter((s) => derived.spheres.includes(s)).join(" · ")}
                </Text>
              )}
              {cats.map((cat) => (
                <Box key={cat}>
                  {/* subcategory header — column indicators (clock = Időigény, unit = pool) sit inline on the right */}
                  <Box display="grid" gridTemplateColumns={SPELL_COLS} gap={SPELL_GAP} alignItems="center" pb="3px" mt="13px" mb="3px" borderBottom="1px solid" borderColor="hair">
                    <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em">{cat}</Box>
                    <Box as="span" justifySelf="center" fontFamily="ui" fontSize="11px" fontWeight={700} color="fgFaint" sx={{ fontVariantNumeric: "tabular-nums" }}>{unit}</Box>
                    <TimeIcon justifySelf="center" boxSize="11px" color="fgFaint" />
                  </Box>
                  {g.items.filter((s) => s.category === cat).map((sp, i) => (
                    <Box as="button" type="button" key={sp.name + i} onClick={() => onOpenSpell(sp.name, g.school)} display="grid" gridTemplateColumns={SPELL_COLS} gap={SPELL_GAP} w="100%" textAlign="left" alignItems="baseline" py={ROWPY} borderRadius="5px" _hover={{ bg: "accentSoft" }}>
                      <Text color="fg" fontSize={FS} lineHeight="1.2" noOfLines={2}>
                        {sp.name}
                        {spheres(sp.domains) && (
                          <Box as="span" ml="5px" fontFamily="ui" fontSize="9px" fontWeight={700} color="fgFaint" letterSpacing=".08em" verticalAlign="1px" title={sp.domains!.join(", ")}>{spheres(sp.domains)}</Box>
                        )}
                      </Text>
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

      {/* Inventory — free-text, editable; numbered lines open a quantity calculator. Társak (companion
          animals) share the column, right after the equipment. */}
      <Col>
        <EquipmentCard text={invText} onSet={onSetInventory} />
        <CompanionsCard companions={record.companions ?? []} onSet={onSetCompanions} />
      </Col>

    </Box>

      {/* pager dots — phones only, floating bottom-centre over the pages */}
      <Flex display={{ base: "flex", md: "none" }} position="absolute" bottom="max(10px, env(safe-area-inset-bottom))" left="50%" transform="translateX(-50%)"
        align="center" px="7px" py="3px" borderRadius="999px" bg="band" border="1px solid" borderColor="hair" boxShadow="0 4px 18px rgba(0,0,0,.18)">
        {Array.from({ length: pageCount }).map((_, i) => {
          const active = i === page;
          return (
            <Box key={i} as="button" type="button" aria-label={`${i + 1}. oldal`} onClick={() => goPage(i)} p="5px" display="flex" alignItems="center" justifyContent="center">
              {/* transform-only animation — width transitions leave half-painted artifacts on iOS
                  when interrupted mid-flight by the snap scroll stepping through pages */}
              <Box w="7px" h="7px" borderRadius="full" bg={active ? "accent" : "fgFaint"} opacity={active ? 1 : 0.55}
                transform={active ? "scale(1.45)" : "scale(1)"} transition="transform .15s ease, background-color .15s, opacity .15s" />
            </Box>
          );
        })}
      </Flex>

      {combatInfo && <CombatInfoModal statKey={combatInfo} derived={derived} extra={weaponExtraFor(activeRow, combatInfo)} onClose={() => setCombatInfo(null)} />}
      {statInfo && <StatInfoModal stat={statInfo} derived={derived} onClose={() => setStatInfo(null)} />}
    </Box>
  );
};
