import React, { useState } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { CharacterRecord } from "../model/character";
import { DerivedCharacter, OwnedSkill } from "../engine/types";
import { percentRate } from "../engine/skillCost";
import { Stat } from "../model/attributes";
import { SkillCategory, SKILL_CATEGORIES, findInstanceChoice, sameInstance, skillKey } from "../model/common";
import { isHomebrew, rulesFor } from "../model/rulesVariants";
import { Stepper } from "./Stepper";
import { DetailModal, ModalState } from "./DetailModal";
import { skillModalContent } from "./compendiumData";
import { FS_NAME, ROW_PY } from "./tokens";
import { KapReadout, PanelHeading } from "./controls";
import { buildSkillPanelData, View } from "./skills/skillPanelData";
import { TeacherBadge, KapottBadge, Fok4Badge, PathBadge, AttrsBadge } from "./skills/badges";
import { SubtypeControl } from "./skills/SubtypeControl";
import { TanulButton, SpecializeMenu, RelearnMenu } from "./skills/SkillPickerMenu";

interface Props {
  level: number;
  record: CharacterRecord;
  derived: DerivedCharacter;
  onUpsert: (level: number, skill: string, subtype: string | undefined, to: number) => void;
  onRemove: (level: number, skill: string, subtype: string | undefined) => void;
  onAddVariant: (level: number, skill: string, parent?: string, startFok?: number, subtype?: string) => void;
  onPatchVariant: (level: number, id: string, patch: Partial<{ subtype: string; from: number; to: number; parent: string }>) => void;
  onRemoveVariant: (level: number, id: string) => void;
  onOverride: (originalKey: string, value: string) => void;
  onSetSubtype: (level: number, skill: string, oldSubtype: string | undefined, newSubtype: string | undefined) => void;
  onSetFok4Stat: (skill: string, subtype: string | undefined, variantId: string | undefined, stat: Stat | null) => void;
  onSetPathChoice: (skill: string, subtype: string | undefined, variantId: string | undefined, trigger: string, value: string | null) => void;
  onSetChosenAttrs: (level: number, skill: string, subtype: string | undefined, variantId: string | undefined, attrs: Stat[]) => void;
}

export const SkillLevelPanel: React.FC<Props> = ({
  level,
  record,
  derived,
  onUpsert,
  onRemove,
  onAddVariant,
  onPatchVariant,
  onRemoveVariant,
  onOverride,
  onSetSubtype,
  onSetFok4Stat,
  onSetPathChoice,
  onSetChosenAttrs,
}) => {
  const [view, setView] = useState<View>("meglevo");
  // Optional-branch skills the user opted to specialize this session — their base row shows the subtype field.
  const [specializing, setSpecializing] = useState<Set<string>>(new Set());
  // Skill-details modal (same content as the compendium / sheet), opened by clicking a skill name.
  const [skillModal, setSkillModal] = useState<ModalState | null>(null);
  const openSkillModal = (name: string) => {
    const owned = derived.skills.filter((s) => s.skill === name);
    const isPct = owned.some((s) => s.percent != null);
    const percent = isPct ? Math.max(0, ...owned.map((s) => s.percent ?? 0)) : null;
    const fok = isPct ? 0 : Math.max(0, ...owned.map((s) => s.fok));
    setSkillModal(skillModalContent(name, { fok, percent }, isHomebrew(record)));
  };

  const data = buildSkillPanelData(record, derived, level);
  const { kap, variants, ownedInstances, teacherOf, stepCost } = data;

  // The player's stored per-instance choices (fok-4 +1, Pszi path).
  const fok4Stat = (skill: string, subtype?: string, variantId?: string): Stat | undefined =>
    findInstanceChoice(record.fok4Bonuses, { skill, subtype, variantId })?.stat as Stat | undefined;
  const pathChoiceFor = (skill: string, subtype?: string, variantId?: string) => (trigger: string): string | undefined =>
    record.pathChoices?.find((c) => sameInstance(c, { skill, subtype, variantId }) && c.trigger === trigger)?.value;

  const nameGroup = (name: string, teacher: number) => (
    <HStack spacing="7px" flex="0 1 auto" minW={0}>
      <Box as="button" type="button" onClick={() => openSkillModal(name)} title="Részletek" textAlign="left" fontSize={FS_NAME} fontWeight={600} color="fg" whiteSpace="nowrap" maxW="100%" overflow="hidden" textOverflow="ellipsis" _hover={{ color: "accentTx", textDecoration: "underline" }}>{name}</Box>
      {teacher > 0 && <TeacherBadge n={teacher} />}
    </HStack>
  );

  const rowShell = (
    key: string,
    left: React.ReactNode,
    subtype: React.ReactNode,
    kapott: React.ReactNode,
    stepper: React.ReactNode
  ) => (
    // md+: one line (name · subtype · badges · ~ · stepper). base: a fixed three-line rhythm —
    // name+badges, then the subtype control full-width, then the stepper line (badge left, stepper right).
    <Box key={key} display="flex" alignItems="center" columnGap="9px" rowGap={{ base: "8px", md: "0px" }}
      flexWrap={{ base: "wrap", md: "nowrap" }} py={ROW_PY} borderBottom="1px solid" borderColor="hair">
      {left}
      {subtype && (
        <Box order={{ base: 2, md: 0 }} flexBasis={{ base: "100%", md: "auto" }} flexShrink={0} display="flex">
          {subtype}
        </Box>
      )}
      {kapott}
      <Box flex="1 1 auto" minW="8px" display={{ base: "none", md: "block" }} />
      <Box order={{ base: 3, md: 0 }} flexBasis={{ base: "100%", md: "auto" }} minW={0} display="flex">
        {stepper}
      </Box>
    </Box>
  );

  // A granted or first-learned instance (no variant id) — an independent row. A branchable skill always
  // shows its subtype control; its subtype edits go through the origSubtype-keyed override (grants) or
  // the combined learned setter.
  const instRow = (inst: OwnedSkill, nth: number) => {
    const isPct = inst.percent != null;
    const cur = isPct ? inst.percent! : inst.fok;
    // Stable instance identity: purchases and per-instance choices address a granted instance by its
    // ORIGINAL subtype, so renaming/clearing the display name never orphans them.
    const idSub = inst.origSubtype ?? inst.subtype;
    const grantFloor = data.grantedFloor[skillKey(inst.skill, idSub)] || 0;
    const floor = data.inheritedFloor[skillKey(inst.skill, idSub)] || 0;
    const teacher = teacherOf(inst.skill, inst.subtype);
    // one step = what 1 Kp buys (the % rate depends on the teacher's fok); never past 100%
    const step = isPct ? percentRate(teacher) : 1;
    const atMax = isPct ? cur >= 100 : cur >= 5;
    const next = isPct ? Math.min(100, cur + step) : cur + 1;
    const cost = atMax ? 0 : stepCost(inst.skill, cur, next, inst.subtype, inst.attrs);
    const showFok4 = !isPct && cur >= 4;
    // Real branches always show the subtype control; an OPTIONAL branch (Futás …) shows it only once
    // specialized — it already has a subtype, or the user picked it in the Specializálás menu.
    const branchDef = rulesFor(record).skills[inst.skill]?.branch;
    const showSubtype = branchDef != null && (branchDef[0]?.optional !== true || !!inst.subtype || specializing.has(inst.skill));
    return rowShell(
      `${skillKey(inst.skill, inst.origSubtype)}:g${nth}`, // two grants of one skill (e.g. Vallásismeret) need distinct keys
      nameGroup(inst.skill, teacher),
      showSubtype ? (
        <SubtypeControl
          skill={inst.skill}
          def={rulesFor(record).skills[inst.skill]}
          value={inst.subtype || ""}
          onChange={(v) =>
            inst.origSubtype != null
              ? onOverride(skillKey(inst.skill, inst.origSubtype), v)
              : onSetSubtype(level, inst.skill, inst.subtype, v)}
          fok={cur}
          suggestions={data.subtypeSuggestions(inst.skill)}
        />
      ) : null,
      <>
        {grantFloor > 0 && <KapottBadge />}
        {inst.placeholder && <KapottBadge text="válassz" />}
        {showFok4 && <Fok4Badge attrs={inst.attrs ?? []} chosen={fok4Stat(inst.skill, idSub)} onPick={(a) => onSetFok4Stat(inst.skill, idSub, undefined, a)} />}
        <PathBadge skill={inst.skill} fok={cur} chosenFor={pathChoiceFor(inst.skill, idSub)} onPick={(trigger, value) => onSetPathChoice(inst.skill, idSub, undefined, trigger, value)} />
      </>,
      <HStack spacing="7px" flexShrink={0} w={{ base: "100%", md: "auto" }}>
        <AttrsBadge skill={inst.skill} current={inst.attrs ?? []} unmetAttrs={inst.unmetAttrs ?? []} anyMode={rulesFor(record).skills[inst.skill]?.attrsAny} onToggle={(attrs) => onSetChosenAttrs(level, inst.skill, idSub, undefined, attrs)} />
        <Box flex="1 1 auto" display={{ base: "block", md: "none" }} />
        <Stepper
          fixed
          value={isPct ? `${cur}%` : `${cur}.`}
          incLabel={atMax ? undefined : String(cost)}
          incWarn={(inst.unmetAttrs?.length ?? 0) > 0}
          decDisabled={cur <= floor}
          incDisabled={atMax || cost > kap}
          onDec={() => (cur - step <= floor ? onRemove(level, inst.skill, idSub) : onUpsert(level, inst.skill, idSub, cur - step))}
          onInc={() => onUpsert(level, inst.skill, idSub, next)}
        />
      </HStack>
    );
  };

  // A RE-learned instance (its own variant id): an independent extra row — subtype + fok + delete. Only
  // ever branchable skills, so never a percentage skill. `from` (start fok) marks the skipped-for-free
  // early levels: the floor it can't be lowered below.
  const varRow = (p: { id?: string; skill: string; subtype?: string; from?: number; to: number }) => {
    const atMax = p.to >= 5;
    const vFloor = Math.max(1, p.from ?? 1);
    const dv = derived.skills.find((s) => s.variantId === p.id);
    const vAttrs = dv?.attrs;
    const vUnmet = dv?.unmetAttrs ?? [];
    const cost = atMax ? 0 : stepCost(p.skill, p.to, p.to + 1, p.subtype, vAttrs);
    const showFok4 = p.to >= 4;
    return rowShell(
      p.id!,
      nameGroup(p.skill, teacherOf(p.skill, p.subtype)),
      <SubtypeControl skill={p.skill} def={rulesFor(record).skills[p.skill]} value={p.subtype || ""} onChange={(v) => onPatchVariant(level, p.id!, { subtype: v })} fok={p.to} suggestions={data.subtypeSuggestions(p.skill)} />,
      <>
        {(p.from ?? 1) > 1 && <KapottBadge text={`${p.from}. foktól`} />}
        {showFok4 && <Fok4Badge attrs={vAttrs ?? []} chosen={fok4Stat(p.skill, p.subtype, p.id)} onPick={(a) => onSetFok4Stat(p.skill, p.subtype, p.id, a)} />}
        <PathBadge skill={p.skill} fok={p.to} chosenFor={pathChoiceFor(p.skill, p.subtype, p.id)} onPick={(trigger, value) => onSetPathChoice(p.skill, p.subtype, p.id, trigger, value)} />
      </>,
      <HStack spacing="7px" flexShrink={0} w={{ base: "100%", md: "auto" }}>
        <AttrsBadge skill={p.skill} current={vAttrs ?? []} unmetAttrs={vUnmet} anyMode={rulesFor(record).skills[p.skill]?.attrsAny} onToggle={(attrs) => onSetChosenAttrs(level, p.skill, p.subtype, p.id, attrs)} />
        <Box flex="1 1 auto" display={{ base: "block", md: "none" }} />
        <Stepper
          fixed
          value={`${p.to}.`}
          incLabel={atMax ? undefined : String(cost)}
          incWarn={vUnmet.length > 0}
          decDelete={p.to <= vFloor}
          incDisabled={atMax || cost > kap}
          onDec={() => (p.to <= vFloor ? onRemoveVariant(level, p.id!) : onPatchVariant(level, p.id!, { to: p.to - 1 }))}
          onInc={() => onPatchVariant(level, p.id!, { to: p.to + 1 })}
        />
      </HStack>
    );
  };

  const filterSeg = (v: View, label: string) => (
    <Box
      as="button"
      type="button"
      key={v}
      px="12px"
      py="6px"
      borderRadius="8px"
      fontFamily="ui"
      fontSize="13px"
      fontWeight={600}
      whiteSpace="nowrap"
      bg={view === v ? "accentSoft" : "transparent"}
      color={view === v ? "accentTx" : "muted"}
      transition="background .12s, color .12s"
      onClick={() => setView(v)}
    >
      {label}
    </Box>
  );

  return (
    <Box>
      <PanelHeading title="Képzettségek" level={level} mb={2} trailing={<KapReadout kap={kap} />} />

      <HStack justify="space-between" align="center" mb={1} spacing="8px">
        <HStack spacing="2px" bg="band" border="1px solid" borderColor="hair" borderRadius="10px" p="3px" w="fit-content">
          {filterSeg("meglevo", "Meglévő")}
          {filterSeg("tanult", "Tanult")}
          {filterSeg("egyeb", "Egyéb")}
        </HStack>
        <HStack spacing="8px" flexShrink={0}>
          <SpecializeMenu options={data.specializable(specializing)} onPick={(name) => setSpecializing((prev) => new Set(prev).add(name))} />
          <RelearnMenu options={data.relearnable} onPick={(skill, startFok) => onAddVariant(level, skill, undefined, startFok)} />
        </HStack>
      </HStack>

      <Box sx={{
        // separators between items only — drop the trailing one (the deepest last leaf row, whether the
        // last category's last skill is a plain row or a trunk+branches group).
        "& > div:last-child > :last-child": { borderBottom: "none" },
        "& > div:last-child > :last-child > :last-child": { borderBottom: "none" },
      }}>
        {SKILL_CATEGORIES.map((cat) => {
          const entries = data.entriesInCat(cat as SkillCategory, view);
          if (entries.length === 0) return null;
          return (
            <Box key={cat}>
              <Text textStyle="overline" fontSize="11px" letterSpacing=".11em" color="catTx" mt="13px" mb="1px">
                {cat}
              </Text>
              {entries.map((e) => {
                // A branch-pinned entry (e.subtype) matches only that subtype's instances; a plain entry matches all.
                const match = <T extends { subtype?: string }>(x: T) => e.subtype == null || (x.subtype ?? "") === e.subtype;
                const insts = ownedInstances.filter((s) => s.skill === e.skill && match(s));
                const vars = variants.filter((p) => p.skill === e.skill && match(p));
                const key = `${e.skill}|${e.subtype ?? ""}`;
                if (insts.length === 0 && vars.length === 0) {
                  const label = e.subtype ? `${e.skill} (${e.subtype})` : e.skill;
                  return (
                    <HStack key={key} spacing="9px" py={ROW_PY} borderBottom="1px solid" borderColor="hair" align="center">
                      <Box as="button" type="button" onClick={() => openSkillModal(e.skill)} title="Részletek" textAlign="left" fontSize={FS_NAME} fontWeight={600} color="fg" whiteSpace="nowrap" minW={0} overflow="hidden" textOverflow="ellipsis" _hover={{ color: "accentTx", textDecoration: "underline" }}>{label}</Box>
                      {teacherOf(e.skill, e.subtype) > 0 && <TeacherBadge n={teacherOf(e.skill, e.subtype)} />}
                      <Box flex="1 1 auto" minW="8px" />
                      <TanulButton
                        relearn={data.skillHasContent(e.skill)}
                        onLearn={() => onUpsert(level, e.skill, e.subtype, rulesFor(record).skills[e.skill]?.cost === "percentage" ? percentRate(teacherOf(e.skill, e.subtype)) : 1)}
                        onRelearn={(n) => onAddVariant(level, e.skill, undefined, n, e.subtype)}
                      />
                    </HStack>
                  );
                }
                // Each learning is an independent row (grants + first-learn, then any re-learned instances).
                return (
                  <Box key={key}>
                    {insts.map((inst, i) => instRow(inst, i))}
                    {vars.map((p) => varRow(p))}
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>

      {derived.allowedSkills.length > 0 && (
        <Box mt="16px" pt="12px" borderTop="1px solid" borderColor="hair">
          <Text textStyle="overline" fontSize="11px" letterSpacing=".11em" color="catTx" mb="6px">
            Tanulható — KM engedélyével
          </Text>
          <HStack flexWrap="wrap" gap="7px">
            {derived.allowedSkills.map((a, i) => (
              <Box key={i} as="span" fontFamily="ui" fontSize="12.5px" fontWeight={600} px="9px" py="4px" borderRadius="7px" bg="fieldBg" border="1px dashed" borderColor="fieldBd" color="muted" whiteSpace="nowrap">
                {a.skill}{a.subtype ? ` (${a.subtype})` : ""}
              </Box>
            ))}
          </HStack>
        </Box>
      )}

      <DetailModal modal={skillModal} onClose={() => setSkillModal(null)} />
    </Box>
  );
};
