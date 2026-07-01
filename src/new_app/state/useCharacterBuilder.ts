import { useMemo } from "react";
import { CharacterRecord, LevelRecord, getLevelRecord } from "../model/character";
import { genId } from "./storage";
import { BACKGROUNDS } from "../model/backgrounds";
import { CombatChannel, Resource } from "../model/effects";
import { Stat } from "../model/attributes";
import { skillKey } from "../model/common";
import { RULES } from "../model/rulesDb";
import { derive } from "../engine/derive";
import { DerivedCharacter } from "../engine/types";

// Ephemeral match key for a skill instance (a branch by variantId, else skill+subtype). Used only for
// in-memory matching — never stored (fok4Bonuses keeps the structured fields).
const instanceKey = (variantId: string | undefined, skill: string, subtype: string | undefined): string =>
  variantId ? `v:${variantId}` : `s:${skillKey(skill, subtype)}`;

// A fok-4 choice is tied to a skill INSTANCE being at fok ≥ 4. If that instance drops below 4 (or is
// removed), the stored choice is stale — drop it so it stops counting and leaves the ledger.
const pruneStaleFok4 = (rec: CharacterRecord): CharacterRecord => {
  if (!rec.fok4Bonuses?.length) return rec;
  const derived = derive(RULES, rec);
  const valid = new Set<string>();
  for (const s of derived.skills) {
    if (s.percent == null && s.fok >= 4) valid.add(instanceKey(s.variantId, s.skill, s.subtype));
  }
  const filtered = rec.fok4Bonuses.filter((b) => valid.has(instanceKey(b.variantId, b.skill, b.subtype)));
  return filtered.length === rec.fok4Bonuses.length ? rec : { ...rec, fok4Bonuses: filtered };
};

// A skill purchase that no longer raises the fok (e.g. an earlier level now reaches it) is a phantom. Drop
// it so the record only ever holds purchases that do something. (Branches are never phantom — engine skips
// them.) Removing a no-op doesn't change any fok, so a single pass converges.
const pruneRedundantPurchases = (rec: CharacterRecord): CharacterRecord => {
  if (!rec.levels.some((l) => l.skillPurchases.length)) return rec;
  const { redundantPurchases } = derive(RULES, rec);
  if (!redundantPurchases.length) return rec;
  const dead = new Set(redundantPurchases.map((r) => `${r.level}:${r.skill}:${r.subtype ?? ""}`));
  let changed = false;
  const levels = rec.levels.map((l) => {
    const kept = l.skillPurchases.filter((p) => p.id != null || !dead.has(`${l.level}:${p.skill}:${p.subtype ?? ""}`));
    if (kept.length === l.skillPurchases.length) return l;
    changed = true;
    return { ...l, skillPurchases: kept };
  });
  return changed ? { ...rec, levels } : rec;
};

export interface CharacterBuilderApi {
  record: CharacterRecord;
  derived: DerivedCharacter;
  setRecord: (r: CharacterRecord) => void;
  update: (patch: Partial<CharacterRecord>) => void;
  patchPointBuy: (stat: keyof CharacterRecord["pointBuy"], value: number) => void;
  setAdottsag: (stat: Stat, value: number) => void;
  setSelection: (choiceId: string, option: string) => void;
  toggleBackground: (name: string) => void;
  setBackgroundLevel: (name: string, level: number) => void;
  setBackgroundOption: (name: string, option: string) => void;
  upsertSkillPurchase: (level: number, skill: string, subtype: string | undefined, to: number) => void;
  removeSkillPurchase: (level: number, skill: string, subtype: string | undefined) => void;
  addSkillVariant: (level: number, skill: string, parent?: string) => void;
  patchPurchaseById: (level: number, id: string, patch: Partial<{ subtype: string; from: number; to: number; parent: string }>) => void;
  removePurchaseById: (level: number, id: string) => void;
  setSubtypeOverride: (originalKey: string, value: string) => void;
  setLearnedSubtype: (level: number, skill: string, oldSubtype: string | undefined, newSubtype: string | undefined) => void;
  setResourceAllocation: (level: number, target: Resource, points: number) => void;
  setHmChannel: (level: number, channel: CombatChannel, amount: number) => void;
  setGrantedHmChannel: (level: number, channel: CombatChannel, amount: number) => void;
  setStatBuy: (level: number, stat: Stat, amount: number) => void;
  setSkillFok4Stat: (skill: string, subtype: string | undefined, variantId: string | undefined, stat: Stat | null) => void;
  setSkillPathChoice: (skill: string, subtype: string | undefined, variantId: string | undefined, trigger: string, value: string | null) => void;
  setSkillChosenAttrs: (level: number, skill: string, subtype: string | undefined, variantId: string | undefined, attrs: Stat[]) => void;
}

// Controlled: the caller owns the record (so each character edits its own, persisted via the roster).
// Re-derives the sheet on every change.
export function useCharacterBuilder(record: CharacterRecord, rawSetRecord: (r: CharacterRecord) => void): CharacterBuilderApi {
  // Every write is cleaned: phantom (no-op) skill purchases are dropped, then stale fok-4 choices. Keeps the
  // record canonical so editing an earlier level can't leave orphaned/redundant entries on later ones.
  const setRecord = (r: CharacterRecord) => rawSetRecord(pruneStaleFok4(pruneRedundantPurchases(r)));
  const derived = useMemo(() => derive(RULES, record), [record]);

  const update = (patch: Partial<CharacterRecord>) => setRecord({ ...record, ...patch });

  const patchPointBuy = (stat: keyof CharacterRecord["pointBuy"], value: number) =>
    setRecord({ ...record, pointBuy: { ...record.pointBuy, [stat]: value } });

  const setAdottsag = (stat: Stat, value: number) =>
    setRecord({ ...record, adottsag: { ...record.adottsag, [stat]: Math.max(0, value) } });

  const setSelection = (choiceId: string, option: string) =>
    setRecord({ ...record, selections: { ...record.selections, [choiceId]: option } });

  const toggleBackground = (name: string) => {
    const exists = record.backgrounds.some((b) => b.background === name && b.source === "chosen");
    if (exists) {
      setRecord({
        ...record,
        backgrounds: record.backgrounds.filter((b) => !(b.background === name && b.source === "chosen")),
      });
      return;
    }
    const range = BACKGROUNDS[name]?.costRange;
    setRecord({
      ...record,
      backgrounds: record.backgrounds.concat([
        { background: name, source: "chosen", acquiredAtLevel: 1, level: range ? range[0] : undefined },
      ]),
    });
  };

  const setBackgroundLevel = (name: string, level: number) =>
    setRecord({
      ...record,
      backgrounds: record.backgrounds.map((b) =>
        b.background === name && b.source === "chosen" ? { ...b, level } : b
      ),
    });

  const setBackgroundOption = (name: string, option: string) =>
    setRecord({
      ...record,
      backgrounds: record.backgrounds.map((b) =>
        b.background === name && b.source === "chosen" ? { ...b, option } : b
      ),
    });

  const patchLevel = (level: number, patch: Partial<LevelRecord>) => {
    const levels = record.levels.map((l) => (l.level === level ? { ...l, ...patch } : l));
    setRecord({ ...record, levels });
  };
  const sameSkill = (a: { skill: string; subtype?: string }, skill: string, subtype?: string) =>
    a.skill === skill && (a.subtype || "") === (subtype || "");

  const upsertSkillPurchase = (level: number, skill: string, subtype: string | undefined, to: number) => {
    const lvl = getLevelRecord(record, level);
    if (!lvl) return;
    const exists = lvl.skillPurchases.some((p) => sameSkill(p, skill, subtype));
    const skillPurchases = exists
      ? lvl.skillPurchases.map((p) => (sameSkill(p, skill, subtype) ? { ...p, to } : p))
      : lvl.skillPurchases.concat([{ skill, subtype, to }]);
    patchLevel(level, { skillPurchases });
  };

  const removeSkillPurchase = (level: number, skill: string, subtype: string | undefined) => {
    const lvl = getLevelRecord(record, level);
    if (!lvl) return;
    patchLevel(level, { skillPurchases: lvl.skillPurchases.filter((p) => !sameSkill(p, skill, subtype)) });
  };

  // A user-added variant (its own subtype + a branch fok). Stored with a stable id so the subtype
  // can be edited freely without losing identity.
  const addSkillVariant = (level: number, skill: string, parent?: string) => {
    const lvl = getLevelRecord(record, level);
    if (!lvl) return;
    // Relearning a skill adds an INDEPENDENT new instance (its own subtype + fok, starting fresh) — no
    // branch-fok inheritance. (The `parent` param is retained for the two-tier engine but unused by the UI.)
    const seed = parent ? { id: genId("v"), skill, subtype: "", parent, from: 2, to: 3 } : { id: genId("v"), skill, subtype: "", to: 1 };
    patchLevel(level, { skillPurchases: lvl.skillPurchases.concat([seed]) });
  };
  const patchPurchaseById = (level: number, id: string, patch: Partial<{ subtype: string; from: number; to: number; parent: string }>) => {
    const lvl = getLevelRecord(record, level);
    if (!lvl) return;
    patchLevel(level, { skillPurchases: lvl.skillPurchases.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  };
  const removePurchaseById = (level: number, id: string) => {
    const lvl = getLevelRecord(record, level);
    if (!lvl) return;
    patchLevel(level, { skillPurchases: lvl.skillPurchases.filter((p) => p.id !== id) });
  };
  const setSubtypeOverride = (originalKey: string, value: string) =>
    setRecord({ ...record, subtypeOverrides: { ...record.subtypeOverrides, [originalKey]: value } });
  // Specialise a GENERAL (origSubtype-undefined) primary in place: set both the grant override (keyed by
  // the bare skill name, where a general grant looks it up) AND any matching learned primary purchase, in
  // ONE update — so a granted + leveled-up skill collapses to a single key instead of splitting in two.
  const setLearnedSubtype = (level: number, skill: string, oldSubtype: string | undefined, newSubtype: string | undefined) => {
    const levels = record.levels.map((l) =>
      l.level !== level
        ? l
        : { ...l, skillPurchases: l.skillPurchases.map((p) => (!p.id && sameSkill(p, skill, oldSubtype) ? { ...p, subtype: newSubtype || undefined } : p)) }
    );
    const subtypeOverrides = { ...record.subtypeOverrides };
    if (newSubtype) subtypeOverrides[skill] = newSubtype;
    else delete subtypeOverrides[skill]; // unspecialise → drop the override so a general grant reverts cleanly
    setRecord({ ...record, subtypeOverrides, levels });
  };

  // Generic KAP allocation (Mana / Psi / Kegy / Fp …). HM and Kp have their own dedicated setters.
  const setResourceAllocation = (level: number, target: Resource, points: number) => {
    const lvl = getLevelRecord(record, level);
    if (!lvl) return;
    const allocations = lvl.allocations.filter((a) => a.target !== target);
    if (points > 0) allocations.push({ target, points });
    patchLevel(level, { allocations });
  };

  // Assign KAP-BOUGHT HM to a channel (Pontvásárlás). Each point is paid; the engine charges KAP_RATE.HM.
  const setHmChannel = (level: number, channel: CombatChannel, amount: number) => {
    const lvl = getLevelRecord(record, level);
    if (!lvl) return;
    const hmAssignments = lvl.hmAssignments.filter((h) => h.channel !== channel);
    if (amount > 0) hmAssignments.push({ channel, amount });
    patchLevel(level, { hmAssignments });
  };

  // Distribute the FREE skill-granted HM to a channel (Szintlépési nyereségek panel). No KAP cost.
  const setGrantedHmChannel = (level: number, channel: CombatChannel, amount: number) => {
    const lvl = getLevelRecord(record, level);
    if (!lvl) return;
    const grantedHmAssignments = (lvl.grantedHmAssignments ?? []).filter((h) => h.channel !== channel);
    if (amount > 0) grantedHmAssignments.push({ channel, amount });
    patchLevel(level, { grantedHmAssignments });
  };

  // Buy +N to an attribute with KAP (20 KAP each) — separate from the 135 base point-buy.
  const setStatBuy = (level: number, stat: Stat, amount: number) => {
    const lvl = getLevelRecord(record, level);
    if (!lvl) return;
    const statIncreases = lvl.statIncreases.filter((si) => !(si.stat === stat && si.source === "kap"));
    if (amount > 0) statIncreases.push({ stat, amount, source: "kap" });
    patchLevel(level, { statIncreases });
  };

  // The +1 attribute a fok-4 skill instance grants (multi-attr skills; single-attr auto-apply in the
  // engine). Stored structurally in record.fok4Bonuses, keyed by the instance; null clears it.
  const setSkillFok4Stat = (skill: string, subtype: string | undefined, variantId: string | undefined, stat: Stat | null) => {
    const key = instanceKey(variantId, skill, subtype);
    const list = (record.fok4Bonuses ?? []).filter((b) => instanceKey(b.variantId, b.skill, b.subtype) !== key);
    if (stat) list.push({ skill, subtype, variantId, stat });
    setRecord({ ...record, fok4Bonuses: list });
  };

  // A committing path choice (Pszi tudat/test at fok 3), stored per instance + trigger; null clears it.
  const setSkillPathChoice = (skill: string, subtype: string | undefined, variantId: string | undefined, trigger: string, value: string | null) => {
    const key = instanceKey(variantId, skill, subtype) + "|" + trigger;
    const list = (record.pathChoices ?? []).filter((c) => instanceKey(c.variantId, c.skill, c.subtype) + "|" + c.trigger !== key);
    if (value) list.push({ skill, subtype, variantId, trigger, value });
    setRecord({ ...record, pathChoices: list });
  };

  // Player-set attribute requirements for an open chooseAttrs branch (Művészetek). Stored per INSTANCE in
  // record.skillAttrChoices (like fok4Bonuses) — not on a purchase — so it saves for granted or
  // earlier-level instances too. `level` is unused (kept for call-site symmetry).
  const setSkillChosenAttrs = (_level: number, skill: string, subtype: string | undefined, variantId: string | undefined, attrs: Stat[]) => {
    const key = instanceKey(variantId, skill, subtype);
    const list = (record.skillAttrChoices ?? []).filter((c) => instanceKey(c.variantId, c.skill, c.subtype) !== key);
    if (attrs.length) list.push({ skill, subtype, variantId, attrs });
    setRecord({ ...record, skillAttrChoices: list });
  };

  return {
    record,
    derived,
    setRecord,
    update,
    patchPointBuy,
    setAdottsag,
    setSelection,
    toggleBackground,
    setBackgroundLevel,
    setBackgroundOption,
    upsertSkillPurchase,
    removeSkillPurchase,
    addSkillVariant,
    patchPurchaseById,
    removePurchaseById,
    setSubtypeOverride,
    setLearnedSubtype,
    setResourceAllocation,
    setHmChannel,
    setGrantedHmChannel,
    setStatBuy,
    setSkillFok4Stat,
    setSkillPathChoice,
    setSkillChosenAttrs,
  };
}
