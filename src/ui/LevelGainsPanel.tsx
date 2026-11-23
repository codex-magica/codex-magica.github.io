import React, { useEffect, useRef, useState } from "react";
import { Box, Button, HStack, Input, Select, Text, Textarea } from "@chakra-ui/react";
import { Adjustment, CharacterRecord, getLevelRecord } from "../model/character";
import { DerivedCharacter } from "../engine/types";
import { CombatChannel, Resource } from "../model/effects";
import { SkillFok, SKILL_CATEGORIES } from "../model/common";
import { SKILLS } from "../model/skills";
import { KM_GRANT_KINDS, KmGrantKind, KmRow, blankKmRow, buildKmEffect, isEditableKmAdjustment, readKmRow } from "../model/kmGrants";
import { genId } from "../state/storage";
import { Stepper } from "./Stepper";
import { PanelHeading, SubHeader, DeleteButton } from "./controls";
import { FS_NAME, ROW_PY } from "./tokens";

interface Props {
  level: number;
  record: CharacterRecord;
  derived: DerivedCharacter;
  onGrantedHm: (level: number, channel: CombatChannel, amount: number) => void;
  onKmChange: (adjustments: Adjustment[]) => void;
}

const CHANNELS: CombatChannel[] = ["KÉ", "TÉ", "VÉ", "CÉ"];
const RES_LABEL: Record<Resource, string> = { Mana: "Mana", Psi: "Pszi", Kegy: "Kegy", HM: "HM", Fp: "Fp", Kp: "Kp" };
const FOKS: SkillFok[] = [1, 2, 3, 4, 5];

const field = {
  size: "sm" as const, bg: "fieldBg", borderColor: "fieldBd", borderRadius: "7px", color: "fg",
  fontSize: "13px", focusBorderColor: "accent",
};

// A signed integer field that tolerates mid-entry "-" while focused (KAP grants can be negative to dock
// points). External value only re-syncs when the field isn't being edited.
const AmountField: React.FC<{ value: number; onChange: (n: number) => void }> = ({ value, onChange }) => {
  const [text, setText] = useState(value === 0 ? "" : String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setText(value === 0 ? "" : String(value)); }, [value]);
  return (
    <Input {...field} w="86px" flexShrink={0} textAlign="right" inputMode="numeric" placeholder="0"
      value={text}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; setText(value === 0 ? "" : String(value)); }}
      onChange={(e) => { setText(e.target.value); const n = parseInt(e.target.value, 10); onChange(Number.isFinite(n) ? n : 0); }}
      sx={{ fontVariantNumeric: "tabular-nums" }} />
  );
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

// One editable KM-override row: kind + kind-specific control(s) + a reason + delete. Each edit rebuilds
// the adjustment's single effect and pushes it up; the record stays canonical (live-persist).
// The full row lives in LOCAL state (seeded from the stored effect): the effect only carries the active
// kind's fields, so a round-trip through a kind switch would otherwise wipe the inactive ones — an
// accidental kind flip must not destroy a typed multi-line rules text (or a picked skill).
const KmRowEditor: React.FC<{ adj: Adjustment; onChange: (patch: Partial<Adjustment>) => void; onRemove: () => void }> = ({ adj, onChange, onRemove }) => {
  const [row, setRowState] = useState<KmRow>(() => readKmRow(adj.effects[0] ?? buildKmEffect(blankKmRow())));
  const setRow = (patch: Partial<KmRow>) => {
    const next = { ...row, ...patch };
    setRowState(next);
    onChange({ effects: [buildKmEffect(next)] });
  };
  const isAmount = row.kind === "kap" || row.kind === "kegy" || row.kind === "mana" || row.kind === "pszi";

  // Each override is a bordered card so a row that wraps onto several lines on a phone still reads as one
  // unit; the delete ✕ is pinned outside the wrapping content so it never orphans onto its own line.
  return (
    <Box border="1px solid" borderColor="hair" borderRadius="9px" bg="fieldBg" px="8px" py="8px" mb="7px">
      <HStack align="flex-start" gap="7px">
        <HStack flex="1 1 auto" minW={0} gap="7px" align="center" wrap="wrap">
          <Select {...field} w="122px" flexShrink={0} value={row.kind} onChange={(e) => setRow({ kind: e.target.value as KmGrantKind })}>
            {KM_GRANT_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </Select>

          {isAmount && <AmountField value={row.amount} onChange={(n) => setRow({ amount: n })} />}

          {row.kind === "skill" && (
            <>
              <SkillSelect value={row.skill} onChange={(v) => setRow({ skill: v })} />
              <Select {...field} w="82px" flexShrink={0} value={row.fok} onChange={(e) => setRow({ fok: Number(e.target.value) as SkillFok })}>
                {FOKS.map((f) => <option key={f} value={f}>{f}. fok</option>)}
              </Select>
            </>
          )}

          {row.kind === "teacher" && (
            <>
              <SkillSelect value={row.skill} onChange={(v) => setRow({ skill: v })} />
              <Select {...field} w="98px" flexShrink={0} value={row.uptoLevel} onChange={(e) => setRow({ uptoLevel: Number(e.target.value) as SkillFok })}>
                {FOKS.map((f) => <option key={f} value={f}>{f}. fokig</option>)}
              </Select>
            </>
          )}

          {row.kind === "tag" && (
            <Input {...field} flex="2 1 200px" minW="140px" value={row.text} placeholder="képesség neve…" onChange={(e) => setRow({ text: e.target.value })} />
          )}

          <Input {...field} flex="1 1 110px" minW="90px" value={adj.reason} placeholder={row.kind === "tag" ? "forrás…" : "indok…"} onChange={(e) => onChange({ reason: e.target.value })} />
        </HStack>
        <DeleteButton onClick={onRemove} />
      </HStack>
      {row.kind === "tag" && (
        <Textarea {...field} mt="7px" rows={3} resize="vertical" value={row.rulesText} placeholder="leírás / szabályszöveg… (ha kitöltöd, a lapon megnyitható lesz)"
          onChange={(e) => setRow({ rulesText: e.target.value })} />
      )}
    </Box>
  );
};

// The character's per-level gains from skill levels (and, in future, other level-up abilities). Resource
// grants (Mana/Pszi/Kegy/Fp) already fold into the pool totals on the Pontvásárlás panel; HM grants are
// FREE and distributed to KÉ/TÉ/VÉ/CÉ right here. The header's "＋ KM" button adds KM custom overrides
// (bonus KAP/pools, granted skills, teachers) scoped to this level.
export const LevelGainsPanel: React.FC<Props> = ({ level, record, derived, onGrantedHm, onKmChange }) => {
  const lvl = getLevelRecord(record, level);
  const grants = derived.resourceGrantsByLevel[level - 1] ?? [];
  const hmGranted = derived.pools.hmGrantedByLevel[level - 1] ?? 0;
  const grantedHmOf = (c: CombatChannel) => lvl?.grantedHmAssignments?.find((h) => h.channel === c)?.amount ?? 0;
  const grantedAssigned = lvl?.grantedHmAssignments?.reduce((s, h) => s + h.amount, 0) ?? 0;
  const hmLeft = hmGranted - grantedAssigned;

  const nonHmGrants = grants.filter((g) => g.resource !== "HM");
  const hmGrants = grants.filter((g) => g.resource === "HM");

  const allKm = record.kmAdjustments ?? [];
  // Only surface adjustments this panel authored (one KM-grant effect) — a foreign/multi-effect
  // adjustment must not render as a bogus "KAP 0" row that an edit would overwrite. It stays in the ledger.
  const kmRows = allKm.filter((a) => (a.atLevel ?? 1) === level && isEditableKmAdjustment(a));
  const nothing = grants.length === 0 && hmGranted === 0 && kmRows.length === 0;

  const addKm = () => onKmChange([...allKm, { id: genId("km"), atLevel: level, reason: "", effects: [buildKmEffect(blankKmRow())] }]);
  // Match by object identity, not id: an id-less (imported/legacy) adjustment must not collide with its
  // siblings (a.id === undefined would match them all and rewrite/delete every one at once).
  const patchKm = (target: Adjustment, patch: Partial<Adjustment>) => onKmChange(allKm.map((a) => (a === target ? { ...a, ...patch } : a)));
  const removeKm = (target: Adjustment) => onKmChange(allKm.filter((a) => a !== target));

  return (
    <Box>
      <PanelHeading title="Szintlépési bónuszok" level={level} trailing={
        <Button size="xs" variant="outline" borderColor="fieldBd" color="accentTx" fontWeight={700}
          _hover={{ borderColor: "accent", bg: "accentSoft" }} onClick={addKm} title="KM-kiigazítás hozzáadása">
          ＋ KM
        </Button>
      } />
      <Text fontFamily="system-ui" fontSize="12px" lineHeight="1.5" color="fgFaint" mb={2} maxW="62ch">
        Speciális képzettségek szintje és egyéb szintlépési bónuszok.
      </Text>

      {nothing && <Text fontFamily="system-ui" fontSize="12px" color="fgFaint" py="6px">Nincsenek szintlépési bónuszok ezen a szinten.</Text>}

      {/* Pool/Fp grants — informational; already counted in the pool totals on the Pontvásárlás panel. */}
      {(nonHmGrants.length > 0 || hmGrants.length > 0) && <SubHeader>Képzettségbónuszok (szintenként)</SubHeader>}
      {[...nonHmGrants, ...hmGrants].map((g, i) => (
        <HStack key={i} py={ROW_PY} borderBottom="1px solid" borderColor="hairSoft" align="center" spacing="9px">
          <Text fontSize={FS_NAME} color="fg" noOfLines={1}>{g.source}</Text>
          <Box flex="1" minW="8px" />
          <Text fontFamily="system-ui" fontSize="12.5px" fontWeight={700} color="accentTx" whiteSpace="nowrap" sx={{ fontVariantNumeric: "tabular-nums" }}>
            +{g.amount} {RES_LABEL[g.resource]}
          </Text>
        </HStack>
      ))}

      {/* HM distribution — the free granted HM, allocated to combat channels at no KAP cost. */}
      {hmGranted > 0 && (
        <>
          <SubHeader trailing={
            <Text fontFamily="system-ui" fontSize="11px" fontWeight={700} color={hmLeft < 0 ? "bad" : hmLeft === 0 ? "fgFaint" : "accentTx"} sx={{ fontVariantNumeric: "tabular-nums" }}>
              {hmLeft} / {hmGranted} szabad
            </Text>
          }>
            Kapott HM elosztása (ingyen)
          </SubHeader>
          {CHANNELS.map((c) => {
            const v = grantedHmOf(c);
            return (
              <HStack key={c} py={ROW_PY} borderBottom="1px solid" borderColor="hair" align="center" spacing="9px">
                <Text fontSize={FS_NAME} color="fg" noOfLines={1}>{c} <Text as="span" color="fgFaint">(= {derived.combat[c]})</Text></Text>
                <Box flex="1" minW="8px" />
                <Stepper value={v} incLabel="0" onDec={() => onGrantedHm(level, c, Math.max(0, v - 1))} onInc={() => onGrantedHm(level, c, v + 1)} decDisabled={v <= 0} incDisabled={hmLeft <= 0} />
              </HStack>
            );
          })}
        </>
      )}

      {/* KM custom overrides — game-master grants outside the KAP economy, scoped to this level. */}
      {kmRows.length > 0 && (
        <>
          <SubHeader>KM-kiigazítások</SubHeader>
          {kmRows.map((adj, i) => (
            <KmRowEditor key={adj.id ?? `km-${i}`} adj={adj} onChange={(p) => patchKm(adj, p)} onRemove={() => removeKm(adj)} />
          ))}
        </>
      )}
    </Box>
  );
};

export default LevelGainsPanel;
