import { useMemo } from "react";
import { CharacterRecord, LevelRecord } from "../model/character";
import { BACKGROUNDS } from "../model/backgrounds";
import { CombatChannel, Resource } from "../model/effects";
import { Stat } from "../model/attributes";
import { RULES } from "../model/rulesDb";
import { derive } from "../engine/derive";
import { DerivedCharacter } from "../engine/types";

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
  addSkillVariant: (level: number, skill: string) => void;
  patchPurchaseById: (level: number, id: string, patch: Partial<{ subtype: string; from: number; to: number }>) => void;
  removePurchaseById: (level: number, id: string) => void;
  setSubtypeOverride: (originalKey: string, value: string) => void;
  setResourceAllocation: (level: number, target: Resource, points: number) => void;
  setHmChannel: (level: number, channel: CombatChannel, amount: number) => void;
  setStatBuy: (level: number, stat: Stat, amount: number) => void;
}

// Controlled: the caller owns the record (so each character edits its own, persisted via the roster).
// Re-derives the sheet on every change.
export function useCharacterBuilder(record: CharacterRecord, setRecord: (r: CharacterRecord) => void): CharacterBuilderApi {
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
    const lvl = record.levels.find((l) => l.level === level);
    if (!lvl) return;
    const exists = lvl.skillPurchases.some((p) => sameSkill(p, skill, subtype));
    const skillPurchases = exists
      ? lvl.skillPurchases.map((p) => (sameSkill(p, skill, subtype) ? { ...p, to } : p))
      : lvl.skillPurchases.concat([{ skill, subtype, to }]);
    patchLevel(level, { skillPurchases });
  };

  const removeSkillPurchase = (level: number, skill: string, subtype: string | undefined) => {
    const lvl = record.levels.find((l) => l.level === level);
    if (!lvl) return;
    patchLevel(level, { skillPurchases: lvl.skillPurchases.filter((p) => !sameSkill(p, skill, subtype)) });
  };

  // A user-added variant (its own subtype + a branch fok). Stored with a stable id so the subtype
  // can be edited freely without losing identity.
  const genId = () => Math.random().toString(36).slice(2, 9);
  const addSkillVariant = (level: number, skill: string) => {
    const lvl = record.levels.find((l) => l.level === level);
    if (!lvl) return;
    patchLevel(level, { skillPurchases: lvl.skillPurchases.concat([{ id: genId(), skill, subtype: "", from: 0, to: 1 }]) });
  };
  const patchPurchaseById = (level: number, id: string, patch: Partial<{ subtype: string; from: number; to: number }>) => {
    const lvl = record.levels.find((l) => l.level === level);
    if (!lvl) return;
    patchLevel(level, { skillPurchases: lvl.skillPurchases.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  };
  const removePurchaseById = (level: number, id: string) => {
    const lvl = record.levels.find((l) => l.level === level);
    if (!lvl) return;
    patchLevel(level, { skillPurchases: lvl.skillPurchases.filter((p) => p.id !== id) });
  };
  const setSubtypeOverride = (originalKey: string, value: string) =>
    setRecord({ ...record, subtypeOverrides: { ...record.subtypeOverrides, [originalKey]: value } });

  // Generic KAP allocation (Mana / Psi / Kegy / Fp …). HM and Kp have their own dedicated setters.
  const setResourceAllocation = (level: number, target: Resource, points: number) => {
    const lvl = record.levels.find((l) => l.level === level);
    if (!lvl) return;
    const allocations = lvl.allocations.filter((a) => a.target !== target);
    if (points > 0) allocations.push({ target, points });
    patchLevel(level, { allocations });
  };

  // Assign HM to a channel. The engine derives the KAP cost (assigned − free granted HM), so we
  // only store the channel distribution here.
  const setHmChannel = (level: number, channel: CombatChannel, amount: number) => {
    const lvl = record.levels.find((l) => l.level === level);
    if (!lvl) return;
    const hmAssignments = lvl.hmAssignments.filter((h) => h.channel !== channel);
    if (amount > 0) hmAssignments.push({ channel, amount });
    patchLevel(level, { hmAssignments });
  };

  // Buy +N to an attribute with KAP (20 KAP each) — separate from the 135 base point-buy.
  const setStatBuy = (level: number, stat: Stat, amount: number) => {
    const lvl = record.levels.find((l) => l.level === level);
    if (!lvl) return;
    const statIncreases = lvl.statIncreases.filter((si) => !(si.stat === stat && si.source === "kap"));
    if (amount > 0) statIncreases.push({ stat, amount, source: "kap" });
    patchLevel(level, { statIncreases });
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
    setResourceAllocation,
    setHmChannel,
    setStatBuy,
  };
}
