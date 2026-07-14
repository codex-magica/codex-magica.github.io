import React, { useState } from "react";
import { Box } from "@chakra-ui/react";
import { Stat, STAT_SHORT, STAT_KEYS } from "../../model/attributes";
import { SKILL_BY_NAME } from "../../model/skills";
import { QuietPopover, OptionButtons } from "../QuietPopover";
import { ChevronTinyIcon } from "../icons";

// The skill row's small badges: teacher level, "kapott", and the per-instance choice chips
// (fok-4 +1 attribute, Pszi path, chooseAttrs). Each chip owns its popover-open state.

export const TeacherBadge: React.FC<{ n: number }> = ({ n }) => (
  <Box as="span" fontFamily="ui" fontSize="10px" fontWeight={700} px="5px" borderRadius="5px" bg="teacherBg" color="teacherTx" lineHeight="1.4" flexShrink={0}>
    T{n}
  </Box>
);

export const KapottBadge: React.FC<{ text?: string }> = ({ text = "kapott" }) => (
  <Box as="span" fontFamily="ui" fontSize="9px" fontWeight={700} letterSpacing=".08em" textTransform="uppercase" px="6px" py="2px" borderRadius="5px" bg="kapottBg" color="kapottTx" whiteSpace="nowrap" flexShrink={0}>
    {text}
  </Box>
);

// Shared chip styling for the choice badges — loud (red) while a forced choice is pending.
const chipSx = (state: "pending" | "chosen" | "info") =>
  ({
    display: "inline-flex", alignItems: "center", gap: "4px", px: "7px", py: "3px", borderRadius: "6px",
    border: "1px solid", fontFamily: "ui", fontSize: "9.5px", fontWeight: 700, letterSpacing: ".04em", whiteSpace: "nowrap",
    bg: state === "pending" ? "badSoft" : state === "chosen" ? "accentSoft" : "fieldBg",
    color: state === "pending" ? "bad" : state === "chosen" ? "accentTx" : "muted",
    borderColor: state === "pending" ? "bad" : state === "chosen" ? "accentBd" : "fieldBd",
  }) as const;

const POPOVER_W = { minW: { base: 0, md: "max-content" }, maxW: { base: "min(320px, 86vw)", md: "none" } };

// The "4. fok: +1 tulajdonság" badge for one fok-4 instance. Single-attr → a quiet info chip
// (auto-applied by the engine); multi-attr → a popover picker, loud until a choice is made.
export const Fok4Badge: React.FC<{
  attrs: Stat[];
  chosen?: Stat;
  onPick: (stat: Stat) => void;
}> = ({ attrs, chosen, onPick }) => {
  const [open, setOpen] = useState(false);
  const all = attrs.length ? attrs : [];
  if (all.length === 0) return null;
  if (all.length === 1) {
    return (
      <Box as="span" fontFamily="ui" fontSize="9px" fontWeight={700} letterSpacing=".04em" px="6px" py="2px" borderRadius="5px" bg="accentSoft" color="accentTx" whiteSpace="nowrap" flexShrink={0} title={`4. fok: +1 ${all[0]}`}>
        +1 {STAT_SHORT[all[0]]}
      </Box>
    );
  }
  return (
    <Box position="relative" flexShrink={0}>
      <Box as="button" type="button" title="4. fok: válassz +1 tulajdonságot" onClick={() => setOpen((o) => !o)} {...chipSx(chosen ? "chosen" : "pending")}>
        {chosen ? `+1 ${STAT_SHORT[chosen]}` : "+1 tul.?"}
        <ChevronTinyIcon />
      </Box>
      {open && (
        <QuietPopover onClose={() => setOpen(false)} title="+1 tulajdonság (4. fok)" {...POPOVER_W}>
          <OptionButtons options={all} selected={chosen} onPick={(a) => { onPick(a as Stat); setOpen(false); }} />
        </QuietPopover>
      )}
    </Box>
  );
};

// Pszi-style committing path badge (tudat/test at fok 3). Loud until the player commits; forced.
// `chosenFor` resolves the stored choice for this instance + the trigger's label.
export const PathBadge: React.FC<{
  skill: string;
  fok: number;
  chosenFor: (trigger: string) => string | undefined;
  onPick: (trigger: string, value: string | null) => void;
}> = ({ skill, fok, chosenFor, onPick }) => {
  const [open, setOpen] = useState(false);
  const trig = SKILL_BY_NAME[skill]?.fokTriggers?.find((t) => t.kind === "path");
  if (!trig || trig.kind !== "path" || fok < trig.atFok) return null;
  const chosen = chosenFor(trig.label);
  return (
    <Box position="relative" flexShrink={0}>
      <Box as="button" type="button" title={`${trig.atFok}. fok: ${trig.label} választása`} onClick={() => setOpen((o) => !o)} {...chipSx(chosen ? "chosen" : "pending")}>
        {chosen ?? trig.label + "?"}
        <ChevronTinyIcon />
      </Box>
      {open && (
        <QuietPopover onClose={() => setOpen(false)} title={`${trig.label} (${trig.atFok}. fok)`} {...POPOVER_W}>
          <OptionButtons options={trig.options} selected={chosen} onPick={(o) => { onPick(trig.label, o === chosen ? null : o); setOpen(false); }} />
        </QuietPopover>
      )}
    </Box>
  );
};

// Attribute-requirement badge, shown on EVERY instance that has governing attributes. Lists the attrs
// as short names; any UNMET one (engine-computed) is yellow. For an open chooseAttrs skill (Művészetek)
// it's an editable multi-toggle picker (red until chosen); otherwise a read-only info pill.
// `anyMode` (attrsAny skills, homebrew Mászás): the attrs are ALTERNATIVES — separator becomes "/"
// and the tooltip says one qualifying attribute is enough.
export const AttrsBadge: React.FC<{
  skill: string;
  current: Stat[];
  unmetAttrs: Stat[];
  onToggle: (attrs: Stat[]) => void;
  anyMode?: boolean;
}> = ({ skill, current, unmetAttrs, onToggle, anyMode }) => {
  const [open, setOpen] = useState(false);
  const chooseAttrs = SKILL_BY_NAME[skill]?.branch?.some((b) => b.chooseAttrs) ?? false;
  if (!chooseAttrs && current.length === 0) return null; // fixed skill with no attribute requirements
  const unmet = (a: Stat) => unmetAttrs.includes(a);
  const empty = chooseAttrs && current.length === 0;
  const sx = chipSx(empty ? "pending" : chooseAttrs ? "chosen" : "info");
  const attrTitle = (a: Stat) =>
    unmet(a) ? `${a}: nem elég magas (a képzés drágább)` : anyMode ? `${a} — elég, ha az egyik tulajdonság megfelel` : a;
  const inner = current.length ? (
    <Box as="span" display="inline-flex" alignItems="center">
      {current.map((a, i) => (
        <React.Fragment key={a}>
          {i > 0 && <Box as="span" opacity={0.5} mx="1px">{anyMode ? "/" : "·"}</Box>}
          <Box as="span" color={unmet(a) ? "warn" : undefined} title={attrTitle(a)}>{STAT_SHORT[a]}</Box>
        </React.Fragment>
      ))}
    </Box>
  ) : "tul.?";

  if (!chooseAttrs)
    return <Box {...sx} flexShrink={0} title={anyMode ? "Tulajdonság-igény — a kettő közül az egyik elegendő" : "Tulajdonság-igény"}>{inner}</Box>;

  const toggle = (a: Stat) => onToggle(current.includes(a) ? current.filter((x) => x !== a) : current.concat([a]));
  return (
    <Box position="relative" flexShrink={0}>
      <Box as="button" type="button" title="Válaszd meg a tulajdonság-igényt" onClick={() => setOpen((o) => !o)} {...sx}>
        {inner}
        <ChevronTinyIcon />
      </Box>
      {open && (
        <QuietPopover onClose={() => setOpen(false)} title="Tulajdonság-igény" minW="max-content" maxW="280px">
          <OptionButtons options={STAT_KEYS} selected={current} onPick={(a) => toggle(a as Stat)} size="sm" wrap labelOf={(a) => STAT_SHORT[a as Stat]} />
        </QuietPopover>
      )}
    </Box>
  );
};
