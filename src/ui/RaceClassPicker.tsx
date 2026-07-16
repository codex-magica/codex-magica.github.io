import React, { useState } from "react";
import { Box, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { RACES, RACE_NAMES } from "../model/races";
import { CLASSES, CLASS_NAMES, ClassDef } from "../model/classes";
import { ChoiceDef, OptionDef } from "../model/choices";
import { GrantEntry } from "../model/effects";
import { STAT_KEYS, STAT_SHORT } from "../model/attributes";
import { ModalShell } from "./Modal";
import { AbilityChips } from "./AbilityChips";

// Bucket grant effects into readable groups for the detail pane.
const summarize = (entries: GrantEntry[]) => {
  const b = { backgrounds: [] as string[], skills: [] as string[], teaches: [] as { skill: string; level: number }[], allows: [] as string[], tags: [] as { name: string; atLevel?: number }[], combat: [] as string[], other: [] as string[], specials: [] as string[], forbidden: [] as string[] };
  // A skill/branch label: "minden képzettség" | "<Kategória> (kat.)" | "<Skill>" | "<Skill> (<altípus>)".
  const catName = (e: { skill?: string; subtype?: string; category?: string; allSkills?: boolean }) =>
    e.allSkills ? "minden képzettség" : e.category ? `${e.category} (kat.)` : `${e.skill ?? ""}${e.subtype ? ` (${e.subtype})` : ""}`;
  for (const { effect: e, atLevel } of entries) {
    switch (e.kind) {
      case "grantBackground": b.backgrounds.push(e.background); break;
      case "grantSkill": b.skills.push(`${e.skill}${e.subtype ? ` (${e.subtype})` : ""} ${e.level}. fok`); break;
      case "grantSkillPercent": b.skills.push(`${e.skill} ${e.percent}%`); break;
      case "grantSkillChoice": b.skills.push(`${e.skill} (${e.label}) ${e.level}. fok`); break; // választható fegyver stb.
      case "allowSkill": b.allows.push(`${e.skill}${e.subtype ? ` (${e.subtype})` : ""}`); break;
      case "teachingDiscount": {
        const nm = catName(e);
        if (!nm) break;
        if (atLevel != null && atLevel > 1) b.specials.push(`${atLevel}. szinttől: ${nm} (${e.uptoLevel}. fokig)`);
        else b.teaches.push({ skill: nm, level: e.uptoLevel });
        break;
      }
      case "skillCostMultiplier": b.specials.push(`${catName(e)} ×${e.factor} Kp`); break;
      case "forbidSkill": b.forbidden.push(catName(e)); break;
      case "maxSkillFok": b.specials.push(`${catName(e)} max ${e.fok}. fok`); break;
      case "classCostDelta": b.specials.push(`Iskolaköltség ${e.amount > 0 ? "+" : ""}${e.amount} KAP`); break;
      case "tag": b.tags.push({ name: e.tag, atLevel: atLevel != null && atLevel > 1 ? atLevel : undefined }); break;
      case "combatBonus": b.combat.push(`${e.channel} +${e.amount}`); break;
      case "statBonus": b.other.push(`${e.stat} +${e.amount}`); break;
      case "poolAccess": b.other.push(`${e.pool} elérés`); break;
      case "grantPoolFromStat": b.other.push(`${e.pool} = ${e.stat}`); break;
      case "grantEquipment": b.other.push(e.item); break;
      case "restriction": b.other.push(e.text); break;
      default: break;
    }
  }
  return b;
};

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box mb="12px">
    <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".09em" textTransform="uppercase" color="catTx" mb="3px">{label}</Text>
    {children}
  </Box>
);
const Chips: React.FC<{ items: string[] }> = ({ items }) => (
  <Text fontSize="13px" color="fg" lineHeight="1.55">{items.join("  ·  ")}</Text>
);

// Taught skills grouped by teacher level ("N. fokig: a, b, c"), instead of repeating the level per skill.
const TeachGroups: React.FC<{ teaches: { skill: string; level: number }[] }> = ({ teaches }) => {
  const byLevel = new Map<number, string[]>();
  for (const t of teaches) (byLevel.get(t.level) ?? byLevel.set(t.level, []).get(t.level)!).push(t.skill);
  const levels = Array.from(byLevel.keys()).sort((a, b) => b - a);
  return (
    <VStack align="stretch" spacing="4px">
      {levels.map((lvl) => (
        <Text key={lvl} fontSize="12.5px" color="muted" lineHeight="1.55">
          <Text as="span" fontWeight={700} color="accentTx">{lvl}. fokig</Text> — {byLevel.get(lvl)!.join(", ")}
        </Text>
      ))}
    </VStack>
  );
};

// The specialization tree: each choice lists its options; an option with its own sub-choices nests below it
// (e.g. Pap → Istenség/Rend → Arel-pap → Arel irányzat).
const ChoiceTree: React.FC<{ choices: ChoiceDef[] }> = ({ choices }) => (
  <VStack align="stretch" spacing="5px">
    {choices.map((ch, i) => (
      <Box key={i}>
        <Text fontSize="12.5px" lineHeight="1.5" color="fg">
          <Text as="span" fontWeight={700} color="muted">{ch.label}:</Text> {ch.options.map((o) => o.name).join("  ·  ")}
        </Text>
        {ch.options.filter((o) => o.choices && o.choices.length > 0).map((o, j) => (
          <Box key={j} pl="9px" mt="3px" ml="2px" borderLeft="2px solid" borderColor="hairSoft">
            <Text fontSize="11px" color="fgFaint" pl="8px" mb="2px">{o.name} ↴</Text>
            <Box pl="8px"><ChoiceTree choices={o.choices!} /></Box>
          </Box>
        ))}
      </Box>
    ))}
  </VStack>
);

const RaceDetail: React.FC<{ name: string }> = ({ name }) => {
  const r = RACES[name];
  if (!r) return null;
  const g = summarize(r.grants);
  const innate = [...g.combat, ...g.other];
  const allowedClasses = CLASS_NAMES.filter((cn) => CLASSES[cn].allowedRaces.includes(name));
  return (
    <Box>
      <Heading fontSize="17px" fontWeight={700} color="fg" mb="1px">{r.name} <Text as="span" fontSize="13px" fontWeight={500} color="fgFaint">· háttérköltség {r.cost}</Text></Heading>
      <Section label="Tulajdonság-maximumok">
        <HStack flexWrap="wrap" gap="3px 12px">
          {STAT_KEYS.map((s) => {
            const v = r.statLimits[s];
            const tone = v > 18 ? "accentTx" : v < 18 ? "muted" : "fgFaint";
            return <Text key={s} fontSize="12.5px" fontWeight={v !== 18 ? 700 : 400} color={tone} sx={{ fontVariantNumeric: "tabular-nums" }}>{STAT_SHORT[s]} {v}</Text>;
          })}
        </HStack>
      </Section>
      {g.skills.length > 0 && <Section label="Tanult képzettségek"><Chips items={g.skills} /></Section>}
      {g.teaches.length > 0 && <Section label="Kedvezményes oktatás"><TeachGroups teaches={g.teaches} /></Section>}
      {g.allows.length > 0 && <Section label="Tanulható — KM engedélyével"><Chips items={g.allows} /></Section>}
      {g.tags.length > 0 && <Section label="Faji képességek"><AbilityChips tags={g.tags} /></Section>}
      {innate.length > 0 && <Section label="Faji kedvezmények"><Chips items={innate} /></Section>}
      <Section label={`Választható kasztok · ${allowedClasses.length}`}>
        {allowedClasses.length > 0
          ? <Chips items={allowedClasses} />
          : <Text fontSize="12.5px" color="muted">Nincs (egyik kaszt sem engedi ezt a fajt).</Text>}
      </Section>
    </Box>
  );
};

const ClassDetail: React.FC<{ def?: ClassDef; custom?: boolean }> = ({ def: c, custom }) => {
  if (!c) return null;
  const g = summarize([...(c.grants || []), ...(c.baseSkills || [])]);
  return (
    <Box>
      <Heading fontSize="17px" fontWeight={700} color="fg" mb="1px">
        {c.name} <Text as="span" fontSize="13px" fontWeight={500} color="fgFaint">· {c.cost} KAP</Text>
        {custom && <Text as="span" fontSize="11px" fontWeight={700} color="accentTx" ml="8px" px="7px" py="1px" borderRadius="6px" bg="accentSoft">EGYEDI</Text>}
      </Heading>
      <Text fontSize="11.5px" color="fgFaint" mb="11px">{custom ? "Minden faj választhatja" : `Engedett fajok: ${c.allowedRaces.join(", ")}`}</Text>
      {g.tags.length > 0 && <Section label="Különleges képességek"><AbilityChips tags={g.tags} /></Section>}
      {g.backgrounds.length > 0 && <Section label="Kapott hátterek"><Chips items={g.backgrounds} /></Section>}
      {g.skills.length > 0 && <Section label="Kapott képzettségek"><Chips items={g.skills} /></Section>}
      {g.teaches.length > 0 && <Section label={`Tanított képzettségek · ${g.teaches.length}`}><TeachGroups teaches={g.teaches} /></Section>}
      {g.specials.length > 0 && <Section label="Szinthez kötött / speciális"><Chips items={g.specials} /></Section>}
      {g.forbidden.length > 0 && <Section label="Tiltott képzettségek"><Chips items={g.forbidden} /></Section>}
      {g.allows.length > 0 && <Section label="Tanulható — KM engedélyével"><Chips items={g.allows} /></Section>}
      {c.choices.length > 0 && <Section label="Specializációk"><ChoiceTree choices={c.choices} /></Section>}
      {g.other.length > 0 && <Section label="Megkötések / egyéb"><Text fontSize="12px" color="muted" lineHeight="1.55">{g.other.join("  ·  ")}</Text></Section>}
    </Box>
  );
};

// One class-specialization option (e.g. Barbár, Domvik-pap): its grants, the class's taught skills (passed
// in, since teaching is class-wide), and any nested sub-choices.
const OptionDetail: React.FC<{ option: OptionDef; classTeaches?: { skill: string; level: number }[] }> = ({ option, classTeaches }) => {
  const g = summarize(option.grants ?? []);
  const innate = [...g.combat];
  // Subclass with a resetTeaching marker OVERRIDES the class's taught skills; otherwise it extends them.
  const overrides = (option.grants ?? []).some((gr) => gr.effect.kind === "resetTeaching");
  const seen = new Set<string>();
  const teaches = [...g.teaches, ...(overrides ? [] : classTeaches ?? [])].filter((t) => (seen.has(t.skill) ? false : (seen.add(t.skill), true)));
  const empty = !g.skills.length && !g.backgrounds.length && !teaches.length && !g.allows.length && !innate.length && !g.tags.length && !g.other.length && !g.specials.length && !g.forbidden.length && !option.choices?.length;
  return (
    <Box>
      <Heading fontSize="17px" fontWeight={700} color="fg" mb="7px">{option.name}</Heading>
      {g.skills.length > 0 && <Section label="Kapott képzettségek"><Chips items={g.skills} /></Section>}
      {g.backgrounds.length > 0 && <Section label="Kapott hátterek"><Chips items={g.backgrounds} /></Section>}
      {g.tags.length > 0 && <Section label="Különleges képességek"><AbilityChips tags={g.tags} /></Section>}
      {innate.length > 0 && <Section label="Egyéb bónuszok"><Chips items={innate} /></Section>}
      {g.specials.length > 0 && <Section label="Speciális oktatási szabályok"><Chips items={g.specials} /></Section>}
      {g.forbidden.length > 0 && <Section label="Tiltott képzettségek"><Chips items={g.forbidden} /></Section>}
      {g.other.length > 0 && <Section label="Megkötések / felszerelés"><Text fontSize="12px" color="muted" lineHeight="1.55">{g.other.join("  ·  ")}</Text></Section>}
      {teaches.length > 0 && <Section label={`Tanított képzettségek${overrides ? " · saját lista" : ""} · ${teaches.length}`}><TeachGroups teaches={teaches} /></Section>}
      {g.allows.length > 0 && <Section label="Tanulható — KM engedélyével"><Chips items={g.allows} /></Section>}
      {option.choices && option.choices.length > 0 && <Section label="További választások"><ChoiceTree choices={option.choices} /></Section>}
      {empty && <Text fontSize="13px" color="fgFaint">Nincs külön nyereség ehhez a választáshoz.</Text>}
    </Box>
  );
};

// Generic master-detail browser modal: scrollable name list on the left, live detail on the right, commit
// with "Kiválasztás". Shared by the race/class picker and the specialization picker.
const BrowserModal: React.FC<{
  title: string;
  options: string[];
  selected: string;
  renderDetail: (name: string) => React.ReactNode;
  onPick: (name: string) => void;
  onClose: () => void;
  onCustom?: () => void; // optional "build your own" entry prepended to the list
  customLabel?: string;
}> = ({ title, options, selected, renderDetail, onPick, onClose, onCustom, customLabel }) => {
  const [view, setView] = useState(selected || options[0]);
  return (
    <ModalShell onClose={onClose} width="min(680px, 100%)" maxH="88vh">
      <Box px="20px" pt="16px" pb="11px" borderBottom="1px solid" borderColor="rule">
        <Heading fontSize="16px" fontWeight={700} color="fg" textAlign="center">{title}</Heading>
      </Box>
      <Box display="flex" flexDirection={{ base: "column", md: "row" }} alignItems="stretch" flex="1 1 auto" minH={0}>
        {/* option list: side column on md+, horizontally scrollable pill strip on phones */}
        <Box display={{ base: "flex", md: "none" }} gap="7px" overflowX="auto" flexShrink={0} px="12px" py="10px"
          borderBottom="1px solid" borderColor="hair" sx={{ WebkitOverflowScrolling: "touch" }}>
          {options.map((n) => (
            <Box as="button" key={n} type="button"
              ref={(el: HTMLButtonElement | null) => { if (el && n === view) el.scrollIntoView({ inline: "nearest", block: "nearest" }); }}
              onClick={(e: React.MouseEvent) => { setView(n); (e.currentTarget as HTMLElement).scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }}
              flexShrink={0} px="13px" h="38px" borderRadius="999px" border="1px solid"
              borderColor={view === n ? "accent" : "fieldBd"} bg={view === n ? "accentSoft" : "fieldBg"}
              color={view === n ? "accentTx" : "fg"} fontWeight={view === n ? 700 : 500} fontSize="14px"
              fontFamily="system-ui" whiteSpace="nowrap" display="inline-flex" alignItems="center" gap="5px">
              {n}{n === selected ? <Text as="span" color="accentTx">●</Text> : null}
            </Box>
          ))}
          {onCustom && (
            <Box as="button" type="button" onClick={onCustom} flexShrink={0} px="13px" h="38px" borderRadius="999px"
              border="1px dashed" borderColor="accent" bg="accentSoft" color="accentTx" fontWeight={700} fontSize="14px"
              fontFamily="system-ui" whiteSpace="nowrap">{customLabel ?? "＋ Egyedi…"}</Box>
          )}
        </Box>
        <VStack display={{ base: "none", md: "flex" }} align="stretch" spacing={0} w="148px" flexShrink={0} borderRight="1px solid" borderColor="hair" overflowY="auto">
          {options.map((n) => (
            <Box as="button" key={n} type="button" onClick={() => setView(n)} textAlign="left" px="13px" py="9px"
              borderBottom="1px solid" borderColor="hairSoft" bg={view === n ? "accentSoft" : "transparent"}
              color={view === n ? "accentTx" : "fg"} fontWeight={view === n ? 700 : 500} fontSize="13.5px"
              fontFamily="system-ui" _hover={{ bg: view === n ? "accentSoft" : "fieldBg" }}>
              {n}{n === selected ? <Text as="span" color="accentTx" ml="5px">●</Text> : null}
            </Box>
          ))}
          {onCustom && (
            <Box as="button" type="button" onClick={onCustom} textAlign="left" px="13px" py="9px"
              borderBottom="1px solid" borderColor="hairSoft" bg="transparent" color="accentTx" fontWeight={700}
              fontSize="13.5px" fontFamily="system-ui" _hover={{ bg: "accentSoft" }}>{customLabel ?? "＋ Egyedi…"}</Box>
          )}
        </VStack>
        <Box flex="1 1 auto" minW={0} minH={0} overflowY="auto" p="16px">{renderDetail(view)}</Box>
      </Box>
      <HStack justify="space-between" gap="10px" px={{ base: "14px", md: "18px" }} py="12px" borderTop="1px solid" borderColor="rule" flexShrink={0}>
        <Box as="button" type="button" onClick={onClose} px="14px" py="8px" borderRadius="9px" border="1px solid" borderColor="hair" bg="transparent" color="muted" fontWeight={600} fontSize="14px" flexShrink={0} _hover={{ borderColor: "accent" }}>Mégse</Box>
        <Box as="button" type="button" onClick={() => { onPick(view); onClose(); }} px="18px" py="8px" borderRadius="9px" border="1px solid" borderColor="accent" bg="accent" color="white" fontWeight={700} fontSize="14px" minW={0}>
          <Text noOfLines={1}>Kiválasztás{view !== selected ? `: ${view}` : ""}</Text>
        </Box>
      </HStack>
    </ModalShell>
  );
};

// Browser for picking a race or class. For class, onPick routes through the caller's class-change confirm.
export const RaceClassPicker: React.FC<{
  kind: "race" | "class";
  selected: string;
  onPick: (name: string) => void;
  onClose: () => void;
  onCustom?: () => void; // class kind only: open the custom-class builder
  customLabel?: string;
  customClass?: ClassDef; // the record's custom class (if any) — shown as a browsable entry
}> = ({ kind, selected, onPick, onClose, onCustom, customLabel, customClass }) => {
  // Append the custom class as its own entry — unless it shadows a built-in name (avoid a duplicate key).
  const classOptions = customClass && !CLASS_NAMES.includes(customClass.name) ? [...CLASS_NAMES, customClass.name] : CLASS_NAMES;
  return (
    <BrowserModal
      title={kind === "race" ? "Faj választása" : "Kaszt választása"}
      options={kind === "race" ? RACE_NAMES : classOptions}
      selected={selected}
      renderDetail={(n) =>
        kind === "race"
          ? <RaceDetail name={n} />
          : n === customClass?.name
            ? <ClassDetail def={customClass} custom />
            : <ClassDetail def={CLASSES[n]} />}
      onPick={onPick}
      onClose={onClose}
      onCustom={kind === "class" ? onCustom : undefined}
      customLabel={customLabel}
    />
  );
};

// Browser for picking a class specialization (iskola / rend / klán / …) — the options of one ChoiceDef.
// `className` supplies the class's taught skills (teaching is class-wide, not per-option).
export const SpecPicker: React.FC<{
  choice: ChoiceDef;
  className: string;
  selected: string;
  onPick: (optionName: string) => void;
  onClose: () => void;
  classDef?: ClassDef; // the record's rules-variant class (house rules); defaults to the base catalog
}> = ({ choice, className, selected, onPick, onClose, classDef }) => {
  const classTeaches = summarize((classDef ?? CLASSES[className])?.grants ?? []).teaches;
  return (
    <BrowserModal
      title={`${choice.label} választása`}
      options={choice.options.map((o) => o.name)}
      selected={selected}
      renderDetail={(n) => { const o = choice.options.find((x) => x.name === n); return o ? <OptionDetail option={o} classTeaches={classTeaches} /> : null; }}
      onPick={onPick}
      onClose={onClose}
    />
  );
};

export default RaceClassPicker;
