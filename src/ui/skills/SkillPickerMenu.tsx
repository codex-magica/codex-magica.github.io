import React, { useState } from "react";
import { Box, HStack } from "@chakra-ui/react";
import { SkillDef } from "../../model/skills";
import { QuietPopover } from "../QuietPopover";
import { OpenBookIcon } from "../icons";

// The suggested start fok for re-learning (branching): most second branches start at 3 (e.g. a new
// weapon in a known category).
const RELEARN_DEFAULT_FOK = 3;

// The start-fok chooser shared by the relearn flows: fok buttons 1–5, 3 highlighted as the default.
export const StartFokButtons: React.FC<{ onPick: (n: number) => void }> = ({ onPick }) => (
  <HStack gap="6px" px="8px" pb="8px">
    {[1, 2, 3, 4, 5].map((n) => (
      <Box as="button" key={n} type="button"
        w={{ base: "44px", md: "38px" }} h={{ base: "44px", md: "38px" }} borderRadius="9px" border="1px solid"
        borderColor={n === RELEARN_DEFAULT_FOK ? "accent" : "fieldBd"} bg={n === RELEARN_DEFAULT_FOK ? "accentSoft" : "fieldBg"}
        color={n === RELEARN_DEFAULT_FOK ? "accentTx" : "fg"} fontWeight={700} fontSize="15px"
        display="flex" alignItems="center" justifyContent="center" sx={{ fontVariantNumeric: "tabular-nums" }}
        _hover={{ borderColor: "accent", bg: "accentSoft", color: "accentTx" }}
        onClick={() => onPick(n)}>
        {n}.
      </Box>
    ))}
  </HStack>
);

// Learn a skill — a quiet outline button with the open-book icon. A `subtype` pre-specialises the
// learn (e.g. a taught branch: Vadonjárás(erdő)). When the skill is ALREADY owned (a RE-learn), a
// popover asks which fok the new instance starts from (levels below = free).
export const TanulButton: React.FC<{
  relearn: boolean;
  onLearn: () => void;
  onRelearn: (startFok: number) => void;
}> = ({ relearn, onLearn, onRelearn }) => {
  const [open, setOpen] = useState(false);
  return (
    <Box position="relative" flexShrink={0}>
      <Box
        as="button"
        type="button"
        title={relearn ? "Újratanulás — melyik fokról induljon?" : "Képzettség tanulása"}
        border="1px solid"
        borderColor="fieldBd"
        bg="transparent"
        color="accentTx"
        px="13px"
        py="7px"
        borderRadius="9px"
        fontWeight={600}
        fontSize={{ base: "16.5px", md: "15px" }}
        whiteSpace="nowrap"
        display="inline-flex"
        alignItems="center"
        gap="7px"
        _hover={{ borderColor: "accent", bg: "accentSoft" }}
        onClick={() => (relearn ? setOpen((o) => !o) : onLearn())}
      >
        <OpenBookIcon />
        Tanul
      </Box>
      {open && (
        <QuietPopover onClose={() => setOpen(false)} p="8px" title="Hányadik fokról indul?"
          hint="1 fölött a korábbi fokok ingyenesek, de az új ág nem csökkenthető alájuk.">
          <StartFokButtons onPick={(n) => { onRelearn(n); setOpen(false); }} />
        </QuietPopover>
      )}
    </Box>
  );
};

// The quiet outlined header button both pickers share.
const HeaderPickerBtn: React.FC<{ title: string; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }> = ({ title, onClick, icon, children }) => (
  <Box as="button" type="button" title={title} onClick={onClick}
    display="inline-flex" alignItems="center" gap="5px" px="11px" py="7px" borderRadius="9px"
    border="1px solid" borderColor="fieldBd" bg="transparent" color="accentTx" fontWeight={600}
    fontFamily="ui" fontSize="13px" whiteSpace="nowrap" _hover={{ borderColor: "accent", bg: "accentSoft" }}>
    {icon}{children}
  </Box>
);

const MenuOption: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <Box as="button" type="button" w="100%" textAlign="left" px="8px" py="8px" borderRadius="8px"
    fontFamily="ui" fontSize="14px" fontWeight={600} color="fg" _hover={{ bg: "accentSoft", color: "accentTx" }}
    onClick={onClick}>
    {children}
  </Box>
);

// "Specializálás" — reveal the subtype field on an optional-branch row (Futás — hosszútáv).
export const SpecializeMenu: React.FC<{ options: SkillDef[]; onPick: (skill: string) => void }> = ({ options, onPick }) => {
  const [open, setOpen] = useState(false);
  if (options.length === 0) return null;
  return (
    <Box position="relative" flexShrink={0}>
      <HeaderPickerBtn title="Egy képzettség egyedi altípusának megadása (pl. Futás — hosszútáv)" onClick={() => setOpen((o) => !o)}
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>}>
        Specializálás
      </HeaderPickerBtn>
      {open && (
        <QuietPopover onClose={() => setOpen(false)} p="8px" minW="220px" maxH="320px" title="Melyiket specializálod?"
          hint="Egyedi altípust adhatsz a képzettségnek (pl. Futás — hosszútáv); a mező csak ekkor jelenik meg.">
          {options.map((d) => (
            <MenuOption key={d.name} onClick={() => { onPick(d.name); setOpen(false); }}>{d.name}</MenuOption>
          ))}
        </QuietPopover>
      )}
    </Box>
  );
};

// "Újratanulás" — add another independent instance of an already-learned branchable skill.
// Two steps: pick the skill, then the starting fok.
export const RelearnMenu: React.FC<{ options: SkillDef[]; onPick: (skill: string, startFok: number) => void }> = ({ options, onPick }) => {
  const [open, setOpen] = useState(false);
  const [skill, setSkill] = useState<string | null>(null);
  const close = () => { setOpen(false); setSkill(null); };
  if (options.length === 0) return null;
  return (
    <Box position="relative" flexShrink={0}>
      <HeaderPickerBtn title="Egy már tanult, ágazható képzettség újratanulása" onClick={() => { setOpen((o) => !o); setSkill(null); }}
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>}>
        Újratanulás
      </HeaderPickerBtn>
      {open && (
        <QuietPopover onClose={close} p="8px" minW="220px" maxH="320px"
          title={skill == null ? "Melyiket tanulod újra?" : `${skill} — hányadik fokról indul?`}
          hint={skill == null ? undefined : "1 fölött a korábbi fokokat máshol már megtanulta — azok ingyenesek, és az új ág nem csökkenthető alájuk."}>
          {skill == null
            ? options.map((d) => <MenuOption key={d.name} onClick={() => setSkill(d.name)}>{d.name}</MenuOption>)
            : <StartFokButtons onPick={(n) => { onPick(skill, n); close(); }} />}
        </QuietPopover>
      )}
    </Box>
  );
};
