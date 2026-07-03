import React, { useRef, useState } from "react";
import { Box, Flex, Heading, HStack, Text } from "@chakra-ui/react";
import { TimeIcon } from "@chakra-ui/icons";
import { WeaponModalState } from "./WeaponModal";
import { CharacterRecord, VitalKey } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { STAT_KEYS, Stat } from "../model/attributes";
import { SKILL_BY_NAME } from "../model/skills";
import { SKILL_CATEGORIES } from "../model/common";
import { VITALS, POOL_UNIT } from "../model/vitals";
import { WeaponValues } from "../data/weapons";
import { resolveWeaponUse, weaponByName } from "../model/weaponUse";
import { ModalShell, ModalHeader } from "./Modal";
import { FS, FS_SUB, ROWPY, GAP, Card, SecHead, SubHead, ValNum, Col, Empty, rowProps } from "./sheet/primitives";
import { VitalsCard, VitalRow } from "./sheet/VitalsCard";
import { EquipmentCard } from "./sheet/EquipmentCard";
import { AbilityChips } from "./AbilityChips";
import { CombatInfoModal, StatInfoModal } from "./InfoModals";

interface Props {
  record: CharacterRecord;
  derived: DerivedCharacter;
  onSetVital: (key: VitalKey, value: number) => void;
  onSetInventory: (text: string) => void;
  onSetWeapons: (weapons: string[]) => void;
  onSetActiveWeapon: (name: string | null) => void;
  onOpenSkill: (name: string, fok: number, percent?: number | null) => void;
  onOpenSpell: (name: string) => void;
  onOpenWeapon: (w: WeaponModalState) => void;
}

// one sheet panel per spell list the character has unlocked, in this order
const SCHOOL_ORDER = ["Bárdmágia", "Tűzmágia", "Boszorkánymágia", "Boszorkánymesteri", "Magasmágia", "Pszi", "Szakrális"];

// The built-in, non-removable first weapon row: bare hands (Pusztakezes harc governs it).
const FIST = "pusztakezes harc";

// Calculator-button icons — crossed swords (közelharc) / crosshair (célzás, távolsági).
const SwordsIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
    <line x1="13" y1="19" x2="19" y2="13" /><line x1="16" y1="16" x2="20" y2="20" /><line x1="19" y1="21" x2="21" y2="19" />
    <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 10" />
    <line x1="5" y1="14" x2="9" y2="18" /><line x1="7" y1="17" x2="4" y2="20" /><line x1="3" y1="19" x2="5" y2="21" />
  </svg>
);
const CrosshairIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="1.5" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22.5" />
    <line x1="1.5" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22.5" y2="12" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

// Dotted underline on a number = "tap for the breakdown" — the affordance for the info modals.
const INFO_UL = {
  textDecoration: "underline dotted",
  textDecorationColor: "var(--chakra-colors-fgFaint)",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

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

export const CharacterSheet: React.FC<Props> = ({ record, derived, onSetVital, onSetInventory, onSetWeapons, onSetActiveWeapon, onOpenSkill, onOpenSpell, onOpenWeapon }) => {
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

  // Weapons pinned to the Harcértékek panel: each resolves the character's training (Fegyverhasználat /
  // Pusztakezes harc) and opens the melee/ranged calculator with the weapon-adjusted base values.
  // The fist row is built-in and non-removable (filter any legacy pin of it).
  const pinnedWeapons = (record.weapons ?? []).filter((n) => n !== FIST);
  const weaponRows = [FIST, ...pinnedWeapons]
    .map((name) => weaponByName(name))
    .filter((w): w is NonNullable<typeof w> => w != null)
    .map((w) => {
      const use = resolveWeaponUse(w, derived.skills);
      const melee = use.kind === "melee";
      const dmgPlus = use.dmgBonus + (melee ? derived.derived.Sebzésbónusz : 0);
      const dmg = `${use.baseDmg}${dmgPlus > 0 ? ` +${dmgPlus}` : ""}`;
      return {
        w,
        use,
        dmg,
        open: () =>
          onOpenWeapon(
            melee
              ? { kind: "melee", name: w.name, dmg, baseKE: derived.combat.KÉ + use.ke, baseTE: derived.combat.TÉ + use.te, baseVE: derived.combat.VÉ + use.ve }
              : { kind: "ranged", name: w.name, dmg, range: w.range, baseCE: derived.combat.CÉ + use.ce }
          ),
      };
    });
  // grouped add-picker options; already-pinned weapons and the built-in fist row removed
  const weaponGroups = Array.from(new Set(WeaponValues.map((w) => w.subType))).map((g) => ({
    group: g,
    items: WeaponValues.filter((w) => w.subType === g && w.name !== FIST && !pinnedWeapons.includes(w.name)),
  })).filter((g) => g.items.length > 0);

  // The weapon "in hand": the combat tiles show ITS adjusted values (tap a row to select; the fist row
  // is the always-available default, so something is always in hand).
  const activeRow = weaponRows.find((r) => r.w.name === record.activeWeapon) ?? weaponRows[0];
  // Add-weapon modal (the picker is used rarely — no reason to keep a select in the panel).
  const [addWeaponOpen, setAddWeaponOpen] = useState(false);
  const USE_KEY = { KÉ: "ke", TÉ: "te", VÉ: "ve", CÉ: "ce" } as const;
  type CombatKey = keyof typeof USE_KEY;
  // Breakdown lines the info modal appends in weapon mode (weapon value + mastery bonus, itemized).
  const weaponExtra = (k: string): { label: string; amount: number }[] | undefined => {
    if (!activeRow || !(k in USE_KEY)) return undefined;
    const uk = USE_KEY[k as CombatKey];
    return [
      { label: activeRow.w.name, amount: activeRow.use.weaponVals[uk] },
      { label: `${activeRow.use.skillLabel} ${activeRow.use.fok}. fok`, amount: activeRow.use.masteryVals[uk] },
    ];
  };
  type Tile = { label: string; value: React.ReactNode; small?: boolean; onClick?: () => void };
  const combatTile = (k: CombatKey): Tile => ({
    label: k,
    value: derived.combat[k] + (activeRow ? activeRow.use[USE_KEY[k]] : 0),
    onClick: () => setCombatInfo(k),
  });
  const tiles: Tile[] = !activeRow
    ? (["KÉ", "TÉ", "VÉ", "CÉ"] as CombatKey[]).map(combatTile)
    : activeRow.use.kind === "melee"
      ? [combatTile("KÉ"), combatTile("TÉ"), combatTile("VÉ"), { label: "Sebzés", value: activeRow.dmg, small: true }]
      // ranged: CÉ replaces TÉ, but VÉ stays — being shot at doesn't stop you being attacked in melee
      // (lőtáv is demoted to the row subtext and the calculator header)
      : [combatTile("KÉ"), combatTile("CÉ"), combatTile("VÉ"), { label: "Sebzés", value: activeRow.dmg, small: true }];
  // "Pusztakezes harc 2. fok" would repeat the fist row's name — collapse to "2. fok" there.
  const masteryLabel = (r: NonNullable<typeof activeRow>) =>
    r.use.fok === 0 ? "képzetlen" : r.use.skillLabel.toLowerCase() === r.w.name.toLowerCase() ? `${r.use.fok}. fok` : `${r.use.skillLabel} ${r.use.fok}. fok`;
  const tilesCaption = activeRow ? `${activeRow.w.name} · ${masteryLabel(activeRow)}` : "Alapértékek";

  const skillGroups = SKILL_CATEGORIES.map((cat) => ({
    name: cat,
    items: derived.skills
      .filter((s) => SKILL_BY_NAME[s.skill]?.category === cat)
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef(0);
  const [page, setPage] = useState(0);
  const pageStep = (el: HTMLElement) =>
    el.children.length > 1 ? (el.children[1] as HTMLElement).offsetLeft - (el.children[0] as HTMLElement).offsetLeft : el.clientWidth;
  const clampPage = (i: number) => Math.max(0, Math.min(pageCount - 1, i));
  const onScroll = () => {
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      const step = pageStep(el);
      if (step <= 0) return;
      const idx = el.scrollLeft / step;
      // hysteresis: flip only once clearly past the midpoint, so momentum/snap settling around the
      // boundary can't flap the active dot back and forth
      setPage((p) => (Math.abs(idx - p) > 0.55 ? clampPage(Math.round(idx)) : p));
    });
  };
  // once scrolling fully settles, snap the indicator to the exact page (browsers with scrollend)
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const settle = () => {
      const step = pageStep(el);
      if (step > 0) setPage(clampPage(Math.round(el.scrollLeft / step)));
    };
    el.addEventListener("scrollend", settle);
    return () => el.removeEventListener("scrollend", settle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount]);
  const goPage = (i: number) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: i * pageStep(el), behavior: "smooth" });
  };

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
            <Box key={s} as="button" type="button" w="100%" textAlign="left" onClick={() => setStatInfo(s)} title="Miből áll össze?"
              {...rowProps} display="flex" justifyContent="space-between" gap="14px" _hover={{ bg: "accentSoft", borderRadius: "7px" }}>
              <Text color="fg" fontSize={FS}>{s}</Text>
              <ValNum sx={{ fontVariantNumeric: "tabular-nums", ...INFO_UL }}>{derived.effectiveStats[s]}</ValNum>
            </Box>
          ))}
        </Card>
        <Card>
          {/* section head + the calculator launcher for the in-hand weapon (icon = melee/ranged) */}
          <Flex align="center" justify="space-between" gap="10px" pb="6px" mb="6px" borderBottom="1px solid" borderColor="rule">
            <Heading as="h2" fontSize={{ base: "21px", md: "18px" }} fontWeight={700} color="fg">Harcértékek</Heading>
            {activeRow && (
              <Box as="button" type="button" onClick={activeRow.open}
                title={activeRow.use.kind === "melee" ? "Közelharci kalkulátor" : "Távolsági kalkulátor"}
                aria-label={activeRow.use.kind === "melee" ? "Közelharci kalkulátor" : "Távolsági kalkulátor"}
                display="inline-flex" alignItems="center" justifyContent="center" w="36px" h="30px" flexShrink={0}
                borderRadius="8px" border="1px solid" borderColor="fieldBd" color="accentTx"
                _hover={{ borderColor: "accent", bg: "accentSoft" }}>
                {activeRow.use.kind === "melee" ? SwordsIcon : CrosshairIcon}
              </Box>
            )}
          </Flex>
          {/* the four combat tiles: the in-hand weapon's ADJUSTED values
              (melee: KÉ/TÉ/VÉ + damage; ranged: KÉ/CÉ + damage/range) — the caption names the mode */}
          <Text fontFamily="system-ui" fontSize="11px" color="fgFaint" mt="2px" mb="7px">{tilesCaption}</Text>
          <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap="8px">
            {tiles.map((t) => (
              <Box key={t.label}
                {...(t.onClick ? { as: "button" as const, type: "button", onClick: t.onClick, title: "Hogyan számolódik?", _hover: { borderColor: "accent" } } : {})}
                bg="accentSoft" borderRadius="9px" py="8px" px="6px" textAlign="center"
                border="1px solid" borderColor="transparent">
                <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".1em" textTransform="uppercase" color="accentTx" opacity={0.8}>{t.label}</Text>
                <Text fontSize={t.small ? "16.5px" : "24px"} fontWeight={700} color="accentTx" lineHeight={t.small ? "1.8" : "1.25"} isTruncated
                  title={t.small && typeof t.value === "string" ? t.value : undefined}
                  sx={{ fontVariantNumeric: "tabular-nums", ...(t.onClick ? INFO_UL : {}) }}>{t.value}</Text>
              </Box>
            ))}
          </Box>
          <Box {...rowProps} justifyContent="space-between" gap="14px" mt="7px">
            <Text color="fg" fontSize={FS}>Mágiaellenállás</Text>
            <HStack gap="12px" flexShrink={0}>
              {(["MME", "AME"] as const).map((k) => (
                <Box key={k} as="button" type="button" onClick={() => setCombatInfo(k)} title="Hogyan számolódik?"
                  display="flex" alignItems="baseline" gap="5px" px="4px" mx="-4px" borderRadius="5px" _hover={{ bg: "accentSoft" }}>
                  <Text fontFamily="system-ui" fontSize="10.5px" fontWeight={700} letterSpacing=".04em" color="muted">{k}</Text>
                  <ValNum sx={{ fontVariantNumeric: "tabular-nums", ...INFO_UL }}>{derived.derived[k]}</ValNum>
                </Box>
              ))}
            </HStack>
          </Box>
          {derived.derived.Sebzésbónusz > 0 && (
            <Box as="button" type="button" w="100%" textAlign="left" onClick={() => setCombatInfo("Sebzésbónusz")} title="Hogyan számolódik?"
              {...rowProps} display="flex" justifyContent="space-between" gap="14px" _hover={{ bg: "accentSoft", borderRadius: "7px" }}>
              <Text color="fg" fontSize={FS}>Sebzésbónusz</Text>
              <ValNum sx={{ fontVariantNumeric: "tabular-nums", ...INFO_UL }}>{`+${derived.derived.Sebzésbónusz}`}</ValNum>
            </Box>
          )}
          {/* subhead with the add-weapon launcher at its right end (the picker itself is a modal) */}
          <Flex align="center" justify="space-between" gap="10px" mt="13px" mb="3px" pb="3px" borderBottom="1px solid" borderColor="hair">
            <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em">Fegyverek</Box>
            <Box as="button" type="button" onClick={() => setAddWeaponOpen(true)}
              title="Fegyver hozzáadása" aria-label="Fegyver hozzáadása"
              display="inline-flex" alignItems="center" justifyContent="center" w="26px" h="22px" flexShrink={0}
              borderRadius="6px" border="1px solid" borderColor="fieldBd" color="accentTx"
              _hover={{ borderColor: "accent", bg: "accentSoft" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </Box>
          </Flex>
          {weaponRows.map((row) => {
            const { w, use, dmg } = row;
            const fixed = w.name === FIST; // the built-in default — not removable, selecting it = bare hands
            const selected = activeRow?.w.name === w.name;
            return (
              // tap = take in hand: the tiles above and the header calculator switch to this weapon
              <Box key={w.name} onClick={() => onSetActiveWeapon(fixed || selected ? null : w.name)} role="button" tabIndex={0} cursor="pointer"
                title={fixed ? "Puszta kéz — alapértelmezett" : selected ? "Letétel (puszta kéz)" : "Kézbevétel — a fenti értékek erre váltanak"}
                py={ROWPY} px="5px" mx="-5px" borderRadius="7px" bg={selected ? "accentSoft" : undefined}
                border="1px solid" borderColor={selected ? "accentBd" : "transparent"} _hover={{ bg: "accentSoft" }}>
                <HStack justify="space-between" align="baseline" gap="10px">
                  <Text color={selected ? "accentTx" : "fg"} fontSize={FS} fontWeight={selected ? 600 : 400} noOfLines={1}>{w.name}</Text>
                  <HStack gap="7px" flexShrink={0} align="baseline">
                    <Text color="accentTx" fontSize={FS} fontWeight={600} maxW="110px" isTruncated title={dmg} sx={{ fontVariantNumeric: "tabular-nums" }}>{dmg}</Text>
                    {!fixed && (
                      <Box as="button" type="button" aria-label={`${w.name} eltávolítása`} title="Eltávolítás"
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onSetWeapons(pinnedWeapons.filter((n) => n !== w.name)); }}
                        color="fgFaint" fontSize="13px" lineHeight="1" px="3px" _hover={{ color: "bad" }}>✕</Box>
                    )}
                  </HStack>
                </HStack>
                {/* skill state only — the accumulated modifiers show up in the tiles on selection */}
                <Text fontFamily="system-ui" fontSize="11.5px" mt="1px" color="muted">
                  {use.fok === 0 ? "képzetlen (kockánként −1 Sp)" : masteryLabel(row)}
                </Text>
              </Box>
            );
          })}
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

    </Box>

      {/* pager dots — phones only, floating bottom-centre over the pages */}
      <Flex display={{ base: "flex", md: "none" }} position="absolute" bottom="max(10px, env(safe-area-inset-bottom))" left="50%" transform="translateX(-50%)"
        align="center" px="7px" py="3px" borderRadius="999px" bg="band" border="1px solid" borderColor="hair" boxShadow="0 4px 18px rgba(0,0,0,.18)">
        {Array.from({ length: pageCount }).map((_, i) => {
          const active = i === clampPage(page);
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

      {/* add-weapon picker: grouped by weapon family, filterable; tap adds and closes */}
      {addWeaponOpen && (
        <ModalShell onClose={() => setAddWeaponOpen(false)} width="min(420px, 100%)" maxH="82vh">
          <ModalHeader onClose={() => setAddWeaponOpen(false)} pt="16px" pb="10px">
            <Heading as="h3" fontSize={{ base: "18px", md: "19px" }} fontWeight={700} color="fg">Fegyver hozzáadása</Heading>
          </ModalHeader>
          <Box flex="1 1 auto" overflowY="auto" px="20px" pb="18px">
            {weaponGroups.map((g) => (
              <Box key={g.group}>
                <Box fontSize={FS_SUB} fontWeight={700} color="muted" letterSpacing=".02em" pb="3px" mt="11px" mb="3px" borderBottom="1px solid" borderColor="hair">{g.group}</Box>
                {g.items.map((w) => (
                  <Box key={w.name} as="button" type="button" w="100%" textAlign="left"
                    onClick={() => { onSetWeapons([...pinnedWeapons, w.name]); setAddWeaponOpen(false); }}
                    display="flex" alignItems="baseline" justifyContent="space-between" gap="12px"
                    py="6px" px="7px" mx="-7px" borderRadius="6px" _hover={{ bg: "accentSoft" }}>
                    <Text color="fg" fontSize={FS} noOfLines={1}>{w.name}</Text>
                    <Text color="muted" fontFamily="system-ui" fontSize="12px" flexShrink={0} maxW="120px" isTruncated title={w.damage} sx={{ fontVariantNumeric: "tabular-nums" }}>{w.damage}</Text>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </ModalShell>
      )}

      {combatInfo && <CombatInfoModal statKey={combatInfo} derived={derived} extra={weaponExtra(combatInfo)} onClose={() => setCombatInfo(null)} />}
      {statInfo && <StatInfoModal stat={statInfo} derived={derived} onClose={() => setStatInfo(null)} />}
    </Box>
  );
};
