import React from "react";
import { Box, Input, Select } from "@chakra-ui/react";
import { SKILL_BY_NAME, SkillDef, fixedSubtypesOf } from "../../model/skills";

// phones: the subtype control gets its own full-width line in the row; md+: a compact inline field
export const SUBW = { base: "100%", md: "128px" };

export const SubtypeInput: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  list?: string;
}> = ({ value, onChange, placeholder, list }) => (
  <Input
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    list={list}
    w={SUBW}
    flexShrink={0}
    size="sm"
    bg="fieldBg"
    borderColor="fieldBd"
    borderRadius="7px"
    color="fg"
    fontStyle="italic"
    fontSize="13.5px"
    focusBorderColor="accent"
    _focus={{ borderColor: "accent", boxShadow: "0 0 0 2px var(--chakra-colors-accentSoft)" }}
  />
);

// Subtype editor: a closed dropdown when the skill declares a fixed subtype set, else free text.
// For enumerated skills the subtype is MANDATORY — an empty one is flagged invalid (red).
// For a two-tier skill (Fegyverhasználat) at a fok ABOVE the category cap, the instance is a specific
// weapon — offer a datalist of all weapons rather than the category dropdown.
export const SubtypeControl: React.FC<{
  skill: string;
  value: string;
  onChange: (v: string) => void;
  fok?: number;
  suggestions: string[]; // datalist for the free-text branch (learned subtypes + taught branches)
  def?: SkillDef; // the record's rules-variant def; defaults to the base catalog
}> = ({ skill, value, onChange, fok, suggestions, def }) => {
  const skillDef = def ?? SKILL_BY_NAME[skill];
  const lvl0 = skillDef?.branch?.[0];
  if (lvl0?.branchAbove != null && fok != null && fok > lvl0.branchAbove) {
    const all = lvl0.options?.flatMap((o) => o.children ?? []) ?? [];
    const listId = `wl-all-${skill}`.replace(/[^a-zA-Z0-9]+/g, "-");
    return (
      <Box flexShrink={0} w={SUBW}>
        <SubtypeInput value={value} onChange={(e) => onChange(e.target.value)} placeholder="konkrét fegyver…" list={all.length ? listId : undefined} />
        {all.length > 0 && <datalist id={listId}>{Array.from(new Set(all)).map((c) => <option key={c} value={c} />)}</datalist>}
      </Box>
    );
  }
  const opts = fixedSubtypesOf(skillDef);
  if (opts && opts.length) {
    const invalid = !value;
    return (
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="altípus kötelező…"
        isInvalid={invalid}
        errorBorderColor="bad"
        w={SUBW}
        flexShrink={0}
        size="sm"
        bg="fieldBg"
        borderColor={invalid ? "bad" : "fieldBd"}
        borderRadius="7px"
        color="fg"
        fontSize="13.5px"
        focusBorderColor="accent"
      >
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </Select>
    );
  }
  const listId = `sub-${skill}`.replace(/[^a-zA-Z0-9]+/g, "-");
  return (
    <Box flexShrink={0} w={SUBW}>
      <SubtypeInput value={value} onChange={(e) => onChange(e.target.value)} placeholder="altípus" list={suggestions.length ? listId : undefined} />
      {suggestions.length > 0 && <datalist id={listId}>{suggestions.map((c) => <option key={c} value={c} />)}</datalist>}
    </Box>
  );
};
