import React, { useState } from "react";
import { Box, Heading, HStack, Text } from "@chakra-ui/react";
import {
  CharacterRecord,
  LevelRecord,
  SkillPurchase,
  StatIncrease,
  ChosenBackground,
  Adjustment,
  Fok4Bonus,
} from "../model/character";
import { STAT_KEYS, STAT_SHORT, Stat } from "../model/attributes";
import { findInstanceChoice, sameInstance } from "../model/common";
import { rulesFor } from "../model/rulesVariants";
import { BACKGROUNDS } from "../model/backgrounds";
import { kmGrantSummary } from "../model/kmGrants";
import { DerivedCharacter, LedgerEntry } from "../engine/types";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// Read-only view of the build ledger — every decision that feeds derive(), in the exact order it's
// stored (the order matters: skill purchases within a level are processed top-to-bottom). Handy for
// debugging and for seeing the full picture. Play-state (vitals/inventory/conditions) is excluded.

// The fok change is shown in the before→after delta column, so the name line just identifies the skill.
const fmtPurchase = (p: SkillPurchase): string => {
  const name = p.subtype ? `${p.skill} (${p.subtype})` : p.skill;
  const bits = [name];
  if (p.id) bits.push(`ág·${p.id}`);
  if (p.teachingUpto != null) bits.push(`okt≤${p.teachingUpto}`);
  return bits.join("  ·  ");
};
const fmtStat = (s: StatIncrease): string => `${STAT_SHORT[s.stat as Stat]}  ·  ${s.source}`;
const bgCost = (b: ChosenBackground): number => (b.level != null ? b.level : BACKGROUNDS[b.background]?.cost ?? 0);
const fmtBg = (b: ChosenBackground): string =>
  `${b.background}  ·  ${b.source}${b.level != null ? `, ${b.level}` : ""}${b.option ? `, ${b.option}` : ""}  ·  @${b.acquiredAtLevel}. szint`;
const fmtAdj = (a: Adjustment): string => {
  const grants = a.effects.map(kmGrantSummary).join(", ") || "—";
  const lvl = a.atLevel != null ? ` @${a.atLevel}. szint` : "";
  return `${grants}${lvl}${a.reason ? `  ·  ${a.reason}` : ""}`;
};

const Cat: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".09em" textTransform="uppercase" color="catTx" mt="11px" mb="3px">
    {children}
  </Text>
);
// One monospaced ledger line; `n` = 1-based index (order matters), `tag` = short type label, `cost` =
// KAP charged by this line (shown right-aligned; omitted when undefined, e.g. free/context lines).
const Line: React.FC<{ n?: number; tag?: string; delta?: string; cost?: number; children: React.ReactNode }> = ({ n, tag, delta, cost, children }) => (
  <HStack align="baseline" spacing="8px" py="2px" borderBottom="1px solid" borderColor="hairSoft">
    {n != null && <Text fontFamily={MONO} fontSize="11px" color="fgFaint" w="18px" textAlign="right" flexShrink={0} sx={{ fontVariantNumeric: "tabular-nums" }}>{n}.</Text>}
    {tag != null && <Text fontFamily="system-ui" fontSize="9px" fontWeight={700} letterSpacing=".05em" textTransform="uppercase" color="catTx" w="40px" flexShrink={0}>{tag}</Text>}
    <Text flex="1 1 auto" minW={0} fontFamily={MONO} fontSize="12.5px" color="fg" sx={{ fontVariantNumeric: "tabular-nums" }} whiteSpace="pre-wrap" wordBreak="break-word">{children}</Text>
    {delta != null && <Text w="82px" flexShrink={0} textAlign="right" fontFamily={MONO} fontSize="11.5px" fontWeight={600} color="fg" sx={{ fontVariantNumeric: "tabular-nums" }}>{delta}</Text>}
    {cost != null && <Text w="58px" flexShrink={0} textAlign="right" fontFamily={MONO} fontSize="11.5px" color={cost > 0 ? "accentTx" : "fgFaint"} sx={{ fontVariantNumeric: "tabular-nums" }}>{cost} KAP</Text>}
  </HStack>
);
const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text fontFamily="system-ui" fontSize="11.5px" color="fgFaint" py="2px">{children}</Text>
);

// Every item of a level as ONE flat, ordered list (no type grouping). The fok-4 +1 attribute is shown
// inline on the very skill purchase that reached fok 4. (Bonuses on GRANTED fok-4 instances — which have
// no purchase to inline onto, e.g. the wizard's Pszi — are listed in their own top-level section instead.)
const LevelBlock: React.FC<{ lvl: LevelRecord; ledger: LedgerEntry[]; fok4: Fok4Bonus[]; grants: { source: string; resource: string; amount: number }[]; isPct: (skill: string) => boolean }> = ({ lvl, ledger, fok4, grants, isPct }) => {
  const L = lvl.level;
  const fmtDelta = (en: LedgerEntry | undefined, pct = false): string | undefined => {
    if (!en) return undefined;
    const u = pct ? "%" : "";
    return `${en.before}${u} → ${en.after}${u}`;
  };
  // The engine emits one typed entry per operation — skill purchases join by their position within the
  // level, everything else by (kind, id). No key reconstruction on the UI side.
  const entryFor = (kind: LedgerEntry["kind"], id: string) => ledger.find((e) => e.level === L && e.kind === kind && e.id === id);
  const skillItems = lvl.skillPurchases.map((p, i) => {
    const en = ledger.find((e) => e.level === L && e.kind === "skill" && e.idx === i);
    const bonus = p.to >= 4 ? (findInstanceChoice(fok4, { skill: p.skill, subtype: p.subtype, variantId: p.id })?.stat as Stat | undefined) : undefined;
    const pct = isPct(p.skill);
    return { tag: "képz", text: fmtPurchase(p) + (bonus ? `  ·  +1 ${STAT_SHORT[bonus]} (4. fok)` : ""), cost: en?.cost ?? 0, delta: fmtDelta(en, pct) };
  });

  // Order: attribute buys → skills → HM → resource allocations (Fp/Mana/…). Attribute buys come BEFORE
  // skills because their +1 lowers the unmet-attribute penalty on this level's skills; resource buys don't
  // affect skill cost, so they sit last.
  const items: { tag: string; text: string; cost?: number; delta?: string }[] = [];
  for (const s of lvl.statIncreases) {
    const en = entryFor("stat", `${s.stat}:${s.source}`);
    items.push({ tag: "tul", text: fmtStat(s), cost: en?.cost ?? 0, delta: fmtDelta(en) });
  }
  items.push(...skillItems);
  for (const h of lvl.grantedHmAssignments ?? []) { const en = entryFor("ghm", h.channel); items.push({ tag: "hm", text: `${h.channel} (kapott)`, cost: en?.cost ?? 0, delta: fmtDelta(en) }); }
  for (const h of lvl.hmAssignments) { const en = entryFor("hm", h.channel); items.push({ tag: "hm", text: `${h.channel} (vett)`, cost: en?.cost ?? 0, delta: fmtDelta(en) }); }
  for (const a of lvl.allocations) { const en = entryFor("alloc", a.target); items.push({ tag: a.target, text: a.target, cost: en?.cost ?? 0, delta: fmtDelta(en) }); }
  if (lvl.notes) items.push({ tag: "jegyz", text: lvl.notes });

  return (
    <Box mt="14px">
      <Text fontFamily="system-ui" fontSize="12px" fontWeight={700} letterSpacing=".06em" textTransform="uppercase" color="muted" pb="3px" borderBottom="1px solid" borderColor="hair">
        {L}. szint
      </Text>
      {items.length === 0 && grants.length === 0 && <Empty>Nincs döntés ezen a szinten.</Empty>}
      {items.map((it, i) => <Line key={i} n={i + 1} tag={it.tag} delta={it.delta} cost={it.cost}>{it.text}</Line>)}
      {/* Passive per-level resource gains from skill foks (no KAP, no sequence number). */}
      {grants.map((g, i) => {
        const rl = g.resource === "Psi" ? "Pszi" : g.resource;
        return <Line key={`g${i}`} tag={rl}>{g.source}  ·  +{g.amount} {rl}/szint</Line>;
      })}
    </Box>
  );
};

export const LedgerPanel: React.FC<{ record: CharacterRecord; derived: DerivedCharacter }> = ({ record, derived }) => {
  const [raw, setRaw] = useState(false);
  const pointBuy = STAT_KEYS.map((s) => `${STAT_SHORT[s]} ${record.pointBuy[s]}`).join("  ·  ");
  const adottsag = Object.entries(record.adottsag ?? {}).filter(([, v]) => v).map(([k, v]) => `${STAT_SHORT[k as Stat]} +${v}`);
  const adottsagCost = Object.values(record.adottsag ?? {}).reduce((s, v) => s + (v || 0), 0); // 1 KAP / point
  const overrides = Object.entries(record.subtypeOverrides ?? {});
  const selections = Object.entries(record.selections ?? {}).filter(([, v]) => v);
  const fok4 = record.fok4Bonuses ?? [];
  // fok-4 bonuses on instances that have NO fok-4 purchase (i.e. granted at fok 4) — they have no skill
  // line to inline onto, so they get their own section.
  const grantedFok4 = fok4.filter((b) =>
    !record.levels.some((l) => l.skillPurchases.some((p) => p.to >= 4 && sameInstance(b, { skill: p.skill, subtype: p.subtype, variantId: p.id })))
  );

  return (
    <Box>
      <HStack justify="space-between" align="center" mb={1}>
        <Heading fontSize={{ base: "23px", md: "20px" }} fontWeight={700} color="fg">Napló</Heading>
        <Box as="button" type="button" onClick={() => setRaw((r) => !r)}
          fontFamily="system-ui" fontSize="11px" fontWeight={700} letterSpacing=".04em" px="10px" py="5px" borderRadius="7px"
          border="1px solid" borderColor={raw ? "accent" : "fieldBd"} bg={raw ? "accentSoft" : "fieldBg"} color={raw ? "accentTx" : "muted"}>
          JSON
        </Box>
      </HStack>
      <Text fontFamily="system-ui" fontSize="11.5px" color="fgFaint" mb={2} lineHeight="1.5">
        Minden döntés a rögzítés sorrendjében. A sorrend számít: befolyásolja az eredményt.
      </Text>

      {raw ? (
        <Box as="pre" fontFamily={MONO} fontSize="11.5px" color="fg" bg="fieldBg" border="1px solid" borderColor="fieldBd" borderRadius="9px" p="12px" overflowX="auto" whiteSpace="pre" lineHeight="1.45" maxH="520px" overflowY="auto">
          {JSON.stringify(record, null, 2)}
        </Box>
      ) : (
        <Box>
          <Cat>Alap</Cat>
          <Line>Faj: {record.race}  ·  Kaszt: {record.class}</Line>
          {selections.length > 0 && <Line>Választások: {selections.map(([k, v]) => `${k}=${v}`).join("  ·  ")}</Line>}
          <Cat>Alappontok</Cat>
          <Line>{pointBuy}</Line>
          {adottsag.length > 0 && <><Cat>Adottság</Cat><Line cost={adottsagCost}>{adottsag.join("  ·  ")}</Line></>}
          {overrides.length > 0 && <><Cat>Altípus-átnevezések</Cat>{overrides.map(([k, v], i) => <Line key={i}>{k} → {v}</Line>)}</>}

          <Cat>Hátterek</Cat>
          {record.backgrounds.length === 0 && <Empty>Nincs.</Empty>}
          {record.backgrounds.map((b, i) => <Line key={i} n={i + 1} cost={bgCost(b)}>{fmtBg(b)}</Line>)}

          {/* Grant-driven (no purchase) fok-4 bonuses — a rare case (e.g. wizard's Pszi 4). Grouped here with
              the other starting/grant info; omitted entirely when there are none. */}
          {grantedFok4.length > 0 && (
            <>
              <Cat>4. fok bónuszai (kapott)</Cat>
              {grantedFok4.map((b, i) => (
                <Line key={i} n={i + 1} tag={STAT_SHORT[b.stat as Stat]}>
                  {b.skill}{b.subtype ? ` (${b.subtype})` : ""}  ·  +1 {STAT_SHORT[b.stat as Stat]}
                </Line>
              ))}
            </>
          )}

          {record.levels.map((lvl) => <LevelBlock key={lvl.level} lvl={lvl} ledger={derived.ledger} fok4={fok4} grants={derived.resourceGrantsByLevel[lvl.level - 1] ?? []} isPct={(skill) => rulesFor(record).skills[skill]?.cost === "percentage"} />)}

          {record.kmAdjustments.length > 0 && (
            <Box mt="14px">
              <Text fontFamily="system-ui" fontSize="12px" fontWeight={700} letterSpacing=".06em" textTransform="uppercase" color="muted" pb="3px" borderBottom="1px solid" borderColor="hair">KM-kiigazítások</Text>
              {record.kmAdjustments.map((a, i) => <Line key={i} n={i + 1}>{fmtAdj(a)}</Line>)}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default LedgerPanel;
