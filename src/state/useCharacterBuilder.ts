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

// Per-instance choice stores are tied to a skill INSTANCE existing (at the required fok). If the instance
// drops below the threshold or is removed, the stored choice is stale — drop it so it can't silently
// resurrect when the skill is learned again later (fok-4 +1, Pszi path, chosen attrs).
const pruneStaleInstanceChoices = (rec: CharacterRecord): CharacterRecord => {
  if (!rec.fok4Bonuses?.length && !rec.pathChoices?.length && !rec.skillAttrChoices?.length) return rec;
  const derived = derive(RULES, rec);
  const fok4Valid = new Set<string>();
  const pathValid = new Set<string>();
  const existValid = new Set<string>();
  for (const s of derived.skills) {
    const key = instanceKey(s.variantId, s.skill, s.origSubtype ?? s.subtype);
    existValid.add(key);
    if (s.percent == null && s.fok >= 4) fok4Valid.add(key);
    const trig = RULES.skills[s.skill]?.fokTriggers?.find((t) => t.kind === "path");
    if (trig && trig.kind === "path" && s.fok >= trig.atFok) pathValid.add(key);
  }
  const out = { ...rec };
  let changed = false;
  if (rec.fok4Bonuses?.length) {
    const kept = rec.fok4Bonuses.filter((b) => fok4Valid.has(instanceKey(b.variantId, b.skill, b.subtype)));
    if (kept.length !== rec.fok4Bonuses.length) { out.fok4Bonuses = kept; changed = true; }
  }
  if (rec.pathChoices?.length) {
    const kept = rec.pathChoices.filter((c) => pathValid.has(instanceKey(c.variantId, c.skill, c.subtype)));
    if (kept.length !== rec.pathChoices.length) { out.pathChoices = kept; changed = true; }
  }
  if (rec.skillAttrChoices?.length) {
    const kept = rec.skillAttrChoices.filter((c) => existValid.has(instanceKey(c.variantId, c.skill, c.subtype)));
    if (kept.length !== rec.skillAttrChoices.length) { out.skillAttrChoices = kept; changed = true; }
  }
  return changed ? out : rec;
};

// A skill purchase that no longer raises the fok (e.g. an earlier level now reaches it) is a phantom. Drop
// it so the record only ever holds purchases that do something. (Branches are never phantom — engine skips
// them.) Removing a no-op doesn't change any fok, so a single pass converges.
const pruneRedundantPurchases = (rec: CharacterRecord): CharacterRecord => {
  if (!rec.levels.some((l) => l.skillPurchases.length)) return rec;
  const { redundantPurchases } = derive(RULES, rec);
  if (!redundantPurchases.length) return rec;
  const dead = new Set(redundantPurchases.map((r) => `${r.level}:${r.idx}`));
  let changed = false;
  const levels = rec.levels.map((l) => {
    const kept = l.skillPurchases.filter((p, i) => p.id != null || !dead.has(`${l.level}:${i}`));
    if (kept.length === l.skillPurchases.length) return l;
    changed = true;
    return { ...l, skillPurchases: kept };
  });
  return changed ? { ...rec, levels } : rec;
};

// A background that becomes GRANTED (via a class/spec change) while the player had also CHOSEN it would be
// double-charged and its checkbox locked — drop the redundant chosen entry so only the free grant remains.
const pruneGrantedChosenBg = (rec: CharacterRecord): CharacterRecord => {
  if (!rec.backgrounds.some((b) => b.source === "chosen")) return rec;
  const granted = new Set(derive(RULES, rec).grantedBackgrounds);
  const kept = rec.backgrounds.filter((b) => !(b.source === "chosen" && granted.has(b.background)));
  return kept.length === rec.backgrounds.length ? rec : { ...rec, backgrounds: kept };
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
  addSkillVariant: (level: number, skill: string, parent?: string, startFok?: number, subtype?: string) => void;
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
  const setRecord = (r: CharacterRecord) => rawSetRecord(pruneGrantedChosenBg(pruneStaleInstanceChoices(pruneRedundantPurchases(r))));
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

  const setBackgroundLevel = (name: string, level: number) => {
    // A chosen background stores its level on the record entry; a GRANTED one (no chosen entry) stores it
    // in grantedBgLevels (free, player-chosen level — e.g. Barbár's Mágiatagadás).
    const isChosen = record.backgrounds.some((b) => b.background === name && b.source === "chosen");
    if (isChosen)
      setRecord({ ...record, backgrounds: record.backgrounds.map((b) => (b.background === name && b.source === "chosen" ? { ...b, level } : b)) });
    else setRecord({ ...record, grantedBgLevels: { ...record.grantedBgLevels, [name]: level } });
  };

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
  // Trunk (non-variant) matcher: a re-learned variant may carry the SAME subtype text as the trunk —
  // it must never be caught by the trunk's upsert/remove (variants are addressed by id only).
  const sameTrunk = (p: { id?: string; skill: string; subtype?: string }, skill: string, subtype?: string) =>
    p.id == null && sameSkill(p, skill, subtype);

  const upsertSkillPurchase = (level: number, skill: string, subtype: string | undefined, to: number) => {
    const lvl = getLevelRecord(record, level);
    if (!lvl) return;
    const exists = lvl.skillPurchases.some((p) => sameTrunk(p, skill, subtype));
    const skillPurchases = exists
      ? lvl.skillPurchases.map((p) => (sameTrunk(p, skill, subtype) ? { ...p, to } : p))
      : lvl.skillPurchases.concat([{ skill, subtype, to }]);
    patchLevel(level, { skillPurchases });
  };

  const removeSkillPurchase = (level: number, skill: string, subtype: string | undefined) => {
    const lvl = getLevelRecord(record, level);
    if (!lvl) return;
    patchLevel(level, { skillPurchases: lvl.skillPurchases.filter((p) => !sameTrunk(p, skill, subtype)) });
  };

  // A user-added variant (its own subtype + a branch fok). Stored with a stable id so the subtype
  // can be edited freely without losing identity.
  const addSkillVariant = (level: number, skill: string, parent?: string, startFok?: number, subtype?: string) => {
    const lvl = getLevelRecord(record, level);
    if (!lvl) return;
    // Relearning a skill adds an INDEPENDENT new instance (its own subtype + fok). `startFok` skips the
    // early levels for free (learned elsewhere / shared weapon-category basics): the instance starts at
    // that fok and — like a granted skill — can't be lowered below it (but CAN be deleted whole).
    // `subtype` pre-fills the branch (e.g. learning a taught branch like Vadonjárás(erdő) as a 2nd instance).
    const sub = subtype ?? "";
    const seed = parent
      ? { id: genId("v"), skill, subtype: sub, parent, from: 2, to: 3 }
      : startFok != null && startFok > 1
      ? { id: genId("v"), skill, subtype: sub, from: startFok, to: startFok }
      : { id: genId("v"), skill, subtype: sub, to: 1 };
    patchLevel(level, { skillPurchases: lvl.skillPurchases.concat([seed]) });
  };
  // Variant ids are globally unique, so patch/remove find the id on WHATEVER level holds it — a variant can
  // be viewed and edited from a later level too (the `level` arg is ignored; kept for signature stability).
  const patchPurchaseById = (_level: number, id: string, patch: Partial<{ subtype: string; from: number; to: number; parent: string }>) =>
    setRecord({ ...record, levels: record.levels.map((l) => ({ ...l, skillPurchases: l.skillPurchases.map((p) => (p.id === id ? { ...p, ...patch } : p)) })) });
  const removePurchaseById = (_level: number, id: string) =>
    setRecord({ ...record, levels: record.levels.map((l) => ({ ...l, skillPurchases: l.skillPurchases.filter((p) => p.id !== id) })) });
  const setSubtypeOverride = (originalKey: string, value: string) =>
    setRecord({ ...record, subtypeOverrides: { ...record.subtypeOverrides, [originalKey]: value } });
  // Specialise a GENERAL (origSubtype-undefined) primary in place, in ONE atomic update:
  //  • rename the instance's purchases on EVERY level (a multi-level instance must not split),
  //  • set the bare-skill grant override ONLY when a general grant of this skill exists (else a stray
  //    override would poison a later general instance),
  //  • migrate the per-instance choice stores (fok-4 +1, path, chosen attrs) to the new identity so the
  //    player's choices survive the rename instead of being pruned.
  const setLearnedSubtype = (_level: number, skill: string, oldSubtype: string | undefined, newSubtype: string | undefined) => {
    const levels = record.levels.map((l) => ({
      ...l,
      skillPurchases: l.skillPurchases.map((p) => (!p.id && sameSkill(p, skill, oldSubtype) ? { ...p, subtype: newSubtype || undefined } : p)),
    }));
    const subtypeOverrides = { ...record.subtypeOverrides };
    // A bare/general grant is identified by its STABLE origSubtype (undefined), NOT by `subtype` — `subtype`
    // reflects the very override we're setting here, so after the first character it would look specialised
    // and (wrongly) flip this to false, dropping the override and resetting the field on every later keystroke.
    const hasGeneralGrant = derived.grantedSkills.some((g) => g.skill === skill && !g.origSubtype);
    if (hasGeneralGrant && newSubtype) subtypeOverrides[skill] = newSubtype;
    else delete subtypeOverrides[skill]; // unspecialise / no grant → drop the override so nothing strays
    const migrate = <T extends { skill: string; subtype?: string; variantId?: string }>(list: T[] | undefined): T[] | undefined =>
      list?.map((c) => (c.variantId == null && c.skill === skill && (c.subtype ?? "") === (oldSubtype ?? "") ? { ...c, subtype: newSubtype || undefined } : c));
    setRecord({
      ...record,
      subtypeOverrides,
      levels,
      fok4Bonuses: migrate(record.fok4Bonuses),
      pathChoices: migrate(record.pathChoices),
      skillAttrChoices: migrate(record.skillAttrChoices),
    });
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
