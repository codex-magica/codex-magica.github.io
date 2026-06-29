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
import { skillKey } from "../model/common";
import { SKILL_BY_NAME } from "../model/skills";
import { BACKGROUNDS } from "../model/backgrounds";
import { DerivedCharacter } from "../engine/types";

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
const fmtAdj = (a: Adjustment): string =>
  `${a.reason || "(km)"}${a.atLevel != null ? ` @${a.atLevel}. szint` : ""}  ·  ${a.effects.length} effekt`;

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

// The fok-4 +1 attribute chosen for a skill instance (a branch by variantId, else skill+subtype), or undefined.
const bonusFor = (bonuses: Fok4Bonus[], skill: string, subtype?: string, variantId?: string): Stat | undefined =>
  bonuses.find((b) => (variantId != null ? b.variantId === variantId : b.variantId == null && b.skill === skill && (b.subtype ?? "") === (subtype ?? "")))?.stat as Stat | undefined;

// Every item of a level as ONE flat, ordered list (no type grouping). The fok-4 +1 attribute is shown
// inline on the very skill purchase that reached fok 4. (Bonuses on GRANTED fok-4 instances — which have
// no purchase to inline onto, e.g. the wizard's Pszi — are listed in their own top-level section instead.)
const LevelBlock: React.FC<{ lvl: LevelRecord; costs: Record<string, number>; deltas: Record<string, { before: number; after: number }>; fok4: Fok4Bonus[] }> = ({ lvl, costs, deltas, fok4 }) => {
  const L = lvl.level;
  const fmtDelta = (key: string, pct = false): string | undefined => {
    const d = deltas[key];
    if (!d) return undefined;
    const u = pct ? "%" : "";
    return `${d.before}${u} → ${d.after}${u}`;
  };
  const skillItems = lvl.skillPurchases.map((p) => {
    const refKey = p.id ? `var:${p.id}` : skillKey(p.skill, p.subtype);
    const bonus = p.to >= 4 ? bonusFor(fok4, p.skill, p.subtype, p.id) : undefined;
    const pct = SKILL_BY_NAME[p.skill]?.cost === "percentage";
    return { tag: "képz", text: fmtPurchase(p) + (bonus ? `  ·  +1 ${STAT_SHORT[bonus]} (4. fok)` : ""), cost: costs[`${L}:skill:${refKey}`] ?? 0, delta: fmtDelta(`${L}:skill:${refKey}`, pct) };
  });

  // Order: attribute buys → skills → HM → resource allocations (Fp/Mana/…). Attribute buys come BEFORE
  // skills because their +1 lowers the unmet-attribute penalty on this level's skills; resource buys don't
  // affect skill cost, so they sit last.
  const items: { tag: string; text: string; cost?: number; delta?: string }[] = [];
  for (const s of lvl.statIncreases) {
    items.push({ tag: "tul", text: fmtStat(s), cost: s.source === "kap" ? (costs[`${L}:stat:${s.stat}:${s.source}`] ?? 0) : 0, delta: fmtDelta(`${L}:stat:${s.stat}:${s.source}`) });
  }
  items.push(...skillItems);
  for (const h of lvl.grantedHmAssignments ?? []) items.push({ tag: "hm", text: `${h.channel} (kapott)`, cost: costs[`${L}:ghm:${h.channel}`] ?? 0, delta: fmtDelta(`${L}:ghm:${h.channel}`) });
  for (const h of lvl.hmAssignments) items.push({ tag: "hm", text: `${h.channel} (vett)`, cost: costs[`${L}:hm:${h.channel}`] ?? 0, delta: fmtDelta(`${L}:hm:${h.channel}`) });
  for (const a of lvl.allocations) items.push({ tag: a.target, text: a.target, cost: costs[`${L}:alloc:${a.target}`] ?? 0, delta: fmtDelta(`${L}:alloc:${a.target}`) });
  if (lvl.notes) items.push({ tag: "jegyz", text: lvl.notes });

  return (
    <Box mt="14px">
      <Text fontFamily="system-ui" fontSize="12px" fontWeight={700} letterSpacing=".06em" textTransform="uppercase" color="muted" pb="3px" borderBottom="1px solid" borderColor="hair">
        {L}. szint
      </Text>
      {items.length === 0 && <Empty>Nincs döntés ezen a szinten.</Empty>}
      {items.map((it, i) => <Line key={i} n={i + 1} tag={it.tag} delta={it.delta} cost={it.cost}>{it.text}</Line>)}
    </Box>
  );
};

export const LedgerPanel: React.FC<{ record: CharacterRecord; derived: DerivedCharacter }> = ({ record, derived }) => {
  const [raw, setRaw] = useState(false);
  const costs = derived.ledgerCosts;
  const pointBuy = STAT_KEYS.map((s) => `${STAT_SHORT[s]} ${record.pointBuy[s]}`).join("  ·  ");
  const adottsag = Object.entries(record.adottsag ?? {}).filter(([, v]) => v).map(([k, v]) => `${STAT_SHORT[k as Stat]} +${v}`);
  const adottsagCost = Object.values(record.adottsag ?? {}).reduce((s, v) => s + (v || 0), 0); // 1 KAP / point
  const overrides = Object.entries(record.subtypeOverrides ?? {});
  const selections = Object.entries(record.selections ?? {}).filter(([, v]) => v);
  const fok4 = record.fok4Bonuses ?? [];
  // fok-4 bonuses on instances that have NO fok-4 purchase (i.e. granted at fok 4) — they have no skill
  // line to inline onto, so they get their own section.
  const grantedFok4 = fok4.filter((b) =>
    !record.levels.some((l) => l.skillPurchases.some((p) => p.to >= 4 && (b.variantId != null ? b.variantId === p.id : b.variantId == null && b.skill === p.skill && (b.subtype ?? "") === (p.subtype ?? ""))))
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
        A teljes nyilvántartás (build ledger), tárolási sorrendben — a sorrend számít.
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
          <Cat>Alappont (pointBuy)</Cat>
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
              <Cat>Fok-4 bónuszok (kapott)</Cat>
              {grantedFok4.map((b, i) => (
                <Line key={i} n={i + 1} tag={STAT_SHORT[b.stat as Stat]}>
                  {b.skill}{b.subtype ? ` (${b.subtype})` : ""}  ·  +1 {STAT_SHORT[b.stat as Stat]}
                </Line>
              ))}
            </>
          )}

          {/* Per-level resource grants from skill levels (read-only; folded into the pool/Fp totals and,
              for HM, distributed in the Szintlépési nyereségek panel). Shown only when the character has any. */}
          {derived.resourceGrants.length > 0 && (
            <>
              <Cat>Szintlépési nyereségek (/ szint)</Cat>
              {derived.resourceGrants.map((g, i) => {
                const rl = g.resource === "Psi" ? "Pszi" : g.resource;
                return <Line key={i} n={i + 1} tag={rl}>{g.source}  ·  +{g.amount} {rl}</Line>;
              })}
            </>
          )}

          {record.levels.map((lvl) => <LevelBlock key={lvl.level} lvl={lvl} costs={costs} deltas={derived.ledgerDelta} fok4={fok4} />)}

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
