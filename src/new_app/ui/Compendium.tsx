import React from "react";
import { Box, Flex, Heading, Input, Text } from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { ParchPanel } from "./ParchPanel";
import { ModalState } from "./DetailModal";
import { Markdown } from "./Markdown";
import { compNames } from "./sampleData";
import { tabBlocks, TableBlock, TableRow, skillModalBody } from "./compendiumData";
import { MAGIC_RULES, stripTitleHeading } from "../data/magicRules";
import { skillsRules } from "../data/skillsRules";
import { SKILLS } from "../model/skills";
import { SKILL_CATEGORIES } from "../model/common";
import introMd from "../../book/01-bevezeto.md";
import charMd from "../../book/02-karakteralkotas.md";

// rulebook chapters shown via the Markdown renderer; tab indices start at CHAPTER_BASE (after the data tabs)
const CHAPTER_BASE = 10;
const CHAPTERS = [
  { name: "Bevezető", md: introMd },
  { name: "Karakteralkotás", md: charMd },
];

interface Props {
  compTab: number;
  onSelectTab: (tab: number) => void;
  onOpenModal: (m: ModalState) => void;
}

// sidebar nav groups (indices into compNames): Képzettségek stands alone, then Mágia, then Felszerelés
const MAGIC_TABS = [1, 2, 3, 4, 5, 6, 7];
const GEAR_TABS = [8, 9];

const NavSection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box display="flex" alignItems="center" gap="10px" mt="20px" mb="6px">
    <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".13em" textTransform="uppercase" color="fgFaint" flexShrink={0}>{children}</Text>
    <Box flex="1 1 auto" h="1px" bg="hair" />
  </Box>
);
// full-bleed item: bg spans the whole sidebar width, text stays inset to align with the headers
const NavItem: React.FC<{ active: boolean; prominent?: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, prominent, onClick, children }) => (
  <Box as="button" type="button" onClick={onClick} position="relative" display="block" textAlign="left" mx="-14px" px="14px" py={prominent ? "9px" : "7px"}
    bg={active ? "accentSoft" : "transparent"} color={active ? "fg" : "muted"} fontWeight={active || prominent ? 700 : 500} fontSize={prominent ? "17px" : "15.5px"}
    transition="background .12s, color .12s" _hover={{ bg: active ? "accentSoft" : "band", color: "fg" }}>
    {active && <Box position="absolute" left="0" top="0" bottom="0" w="3px" bg="accent" />}
    {children}
  </Box>
);

const PAD = { base: "18px", md: "16px" };
const SKILL_GRID = "minmax(0,2.1fr) 50px minmax(0,1.4fr) minmax(0,1.3fr) minmax(0,2.2fr)";

const Th: React.FC<{ children: React.ReactNode; align?: string }> = ({ children, align }) => (
  <Box as="span" fontFamily="system-ui" fontSize="10.5px" fontWeight={700} letterSpacing=".06em" textTransform="uppercase" color="fgFaint" textAlign={align as any}>{children}</Box>
);
const GroupHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading as="h3" textAlign="center" fontSize={{ base: "19px", md: "17px" }} fontWeight={700} color="fg" mb="9px">{children}</Heading>
);

// quiet "Szabályok" chip placed next to a heading that has rules prose; opens the rules modal
const RulesChip: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Box as="button" type="button" onClick={onClick} display="inline-flex" alignItems="center" gap="4px" px="9px" py="3px" borderRadius="999px"
    border="1px solid" borderColor="accentBd" bg="accentSoft" color="accentTx" fontFamily="system-ui" fontSize="11px" fontWeight={700} whiteSpace="nowrap"
    flexShrink={0} _hover={{ borderColor: "accent" }}>
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5h6.5a3 3 0 0 1 3 3V20a2.4 2.4 0 0 0-2.4-2.4H4z" /><path d="M20 5.5h-6.5a3 3 0 0 0-3 3V20a2.4 2.4 0 0 1 2.4-2.4H20z" />
    </svg>
    Szabályok
  </Box>
);

// skill catalog from the new model (book-original)
const skillGroups = SKILL_CATEGORIES.map((cat) => ({
  group: cat,
  rows: SKILLS.filter((s) => s.category === cat).slice().sort((a, b) => a.name.localeCompare(b.name, "hu"))
    .map((s) => ({ name: s.name, diff: s.cost === "percentage" ? "%" : s.difficulty, strong: s.hardReq.map((r) => r.skill).join(", ") || "–", weak: s.softReq.map((r) => r.skill).join(", ") || "–", attr: s.attrs.join(", ") || "–" })),
})).filter((g) => g.rows.length > 0);

export const Compendium: React.FC<Props> = ({ compTab, onSelectTab, onOpenModal }) => {
  const chapter = compTab >= CHAPTER_BASE ? CHAPTERS[compTab - CHAPTER_BASE] : null;
  const title = compNames[compTab];
  const isSkills = compTab === 0;
  const blocks: TableBlock[] = isSkills || chapter ? [] : tabBlocks(compTab);

  const openRow = (r: TableRow) => onOpenModal({ kind: "spell", name: r.name, sub: r.modalSub, body: r.body || [] });

  // rules prose for the current school (if any), plus a helper to open it in the markdown modal
  const schoolRules = MAGIC_RULES[title];
  // chapter-level rules for the main heading: skills have their own; magic schools use schoolRules
  const headingRules = isSkills ? skillsRules : schoolRules?.rules;
  const openRules = (name: string, sub: string, md: string) =>
    onOpenModal({ kind: "rules", name, sub, body: [], markdown: stripTitleHeading(md, name) });

  // dense = cram all columns to fit the container (no horizontal scroll) — used for the wide
  // weapons table; value columns shrink to share the width.
  const renderBlock = (block: TableBlock, dense = false) => {
    const grid = dense
      ? `minmax(82px, 1.3fr) ${block.columns.map(() => "minmax(0, 1fr)").join(" ")}`
      : `minmax(140px, 1.6fr) ${block.columns.map(() => "minmax(58px, 1fr)").join(" ")}`;
    const gap = dense ? "4px" : "8px";
    const px = dense ? { base: "8px", md: "10px" } : PAD;
    const hSize = dense ? "9px" : "10.5px";
    const cellFs = dense ? "11.5px" : "13px";
    const nameFs = dense ? { base: "13px", md: "12.5px" } : { base: "16px", md: "15px" };

    const inner = (
      <Box minW={dense ? undefined : `${170 + block.columns.length * 86}px`}>
        <Box display="grid" gridTemplateColumns={grid} gap={gap} px={px} py={dense ? "9px" : "11px"} borderBottom="1px solid" borderColor="rule" alignItems="end">
          <Box as="span" fontFamily="system-ui" fontSize={hSize} fontWeight={700} letterSpacing=".04em" textTransform="uppercase" color="fgFaint">{block.nameLabel}</Box>
          {block.columns.map((c, i) => (
            <Box key={i} as="span" fontFamily="system-ui" fontSize={hSize} fontWeight={700} letterSpacing=".02em" textTransform="uppercase" color="fgFaint" textAlign={(c.align as any) || "center"}>{c.label}</Box>
          ))}
        </Box>
        {block.rows.map((r, i) => (
          <Box as="button" type="button" key={r.name + i} onClick={() => openRow(r)} display="grid" gridTemplateColumns={grid} gap={gap} w="100%" textAlign="left" px={px} py={dense ? "7px" : "8px"} borderTop={i === 0 ? undefined : "1px solid"} borderColor="hairSoft" alignItems="baseline" _hover={{ bg: "accentSoft" }}>
            <Text fontSize={nameFs} fontWeight={600} color="fg" lineHeight="1.2">{r.name}</Text>
            {r.cells.map((cell, j) => (
              <Text key={j} textAlign={(block.columns[j].align as any) || "center"} fontSize={cellFs} color="muted" lineHeight="1.25" sx={{ fontVariantNumeric: "tabular-nums" }}>{cell}</Text>
            ))}
          </Box>
        ))}
      </Box>
    );

    const subRules = schoolRules?.sub?.[block.title];
    return (
      <Box key={block.title}>
        <Box display="flex" alignItems="center" justifyContent="center" gap="10px" mb="9px">
          <Heading as="h3" textAlign="center" fontSize={{ base: "19px", md: "17px" }} fontWeight={700} color="fg">{block.title}</Heading>
          {subRules && <RulesChip onClick={() => openRules(block.title, "Szabályok", subRules)} />}
        </Box>
        <ParchPanel p={0} overflow="hidden">
          {dense ? inner : <Box overflowX="auto">{inner}</Box>}
        </ParchPanel>
      </Box>
    );
  };

  return (
    <Flex flex="1 1 auto" minH={0} bg="page" overflow="hidden">
      {/* Left sidebar navigation — grouped (Képzettségek · Mágia · Felszerelés) */}
      <Box as="nav" w={{ base: "180px", md: "248px" }} flexShrink={0} h="100%" overflowY="auto" borderRight="1px solid" borderColor="hair" px="14px" py={{ base: "16px", md: "20px" }}>
        <Box position="relative">
          <SearchIcon position="absolute" left="11px" top="50%" transform="translateY(-50%)" boxSize="13px" color="fgFaint" pointerEvents="none" />
          <Input placeholder="Keresés…" size="sm" pl="32px" bg="fieldBg" borderColor="fieldBd" borderRadius="9px" color="fg" fontSize="13.5px" _placeholder={{ color: "fgFaint" }} focusBorderColor="accent" />
        </Box>
        <Box mt="18px" mb="12px">
          <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".16em" textTransform="uppercase" color="fgFaint">Kompendium</Text>
          <Heading as="p" fontSize="21px" fontStyle="italic" fontWeight={600} color="fg" lineHeight="1.1">Tartalom</Heading>
        </Box>
        {CHAPTERS.map((c, i) => (
          <NavItem key={i} active={compTab === CHAPTER_BASE + i} onClick={() => onSelectTab(CHAPTER_BASE + i)}>{c.name}</NavItem>
        ))}
        <NavItem active={compTab === 0} onClick={() => onSelectTab(0)}>{compNames[0]}</NavItem>
        <NavSection>Mágia</NavSection>
        {MAGIC_TABS.map((i) => <NavItem key={i} active={compTab === i} onClick={() => onSelectTab(i)}>{compNames[i]}</NavItem>)}
        <NavSection>Felszerelés</NavSection>
        {GEAR_TABS.map((i) => <NavItem key={i} active={compTab === i} onClick={() => onSelectTab(i)}>{compNames[i]}</NavItem>)}
      </Box>

      {/* Content */}
      <Box flex="1 1 auto" minH={0} overflowY="auto">
      <Box maxW={{ base: "100%", md: "1040px" }} mx="auto" px={{ base: "16px", md: "20px" }} pt={{ base: "26px", md: "24px" }} pb="90px">
        {chapter ? (
        <Box maxW="780px" mx="auto"><Markdown source={chapter.md} /></Box>
        ) : (
        <>
        <Box display="flex" alignItems="center" justifyContent="center" gap="12px" mb="4px">
          <Heading as="h2" fontSize={{ base: "24px", md: "21px" }} fontWeight={700} color="fg" textAlign="center">{title}</Heading>
          {headingRules && <RulesChip onClick={() => openRules(title, "A fejezet szabályai", headingRules)} />}
        </Box>
        <Text fontFamily="system-ui" fontSize="12.5px" color="fgFaint" textAlign="center" mb="20px">
          Kompendium · szabálykönyvi referencia — válassz egy elemet a részletekért
        </Text>

        {isSkills ? (
          <Box display="flex" flexDirection="column" gap="22px" maxW="760px" mx="auto">
            {skillGroups.map((g) => (
              <Box key={g.group}>
                <GroupHead>{g.group}</GroupHead>
                <ParchPanel p={0} overflow="hidden">
                  <Box overflowX="auto"><Box minW="560px">
                    <Box display="grid" gridTemplateColumns={SKILL_GRID} alignItems="center" gap="10px" px={PAD} py="11px" borderBottom="1px solid" borderColor="rule">
                      <Th>Képzettség</Th><Th align="center">Nehéz.</Th><Th>Erős</Th><Th>Gyenge</Th><Th align="right">Tulajdonság</Th>
                    </Box>
                    {g.rows.map((r, i) => (
                      <Box as="button" type="button" key={r.name} onClick={() => onOpenModal({ kind: "skill", name: r.name, sub: `(${r.diff} – ${r.attr})`, body: skillModalBody(r.name) })} display="grid" gridTemplateColumns={SKILL_GRID} alignItems="center" gap="10px" w="100%" textAlign="left" px={PAD} py="8px" borderTop={i === 0 ? undefined : "1px solid"} borderColor="hairSoft" _hover={{ bg: "accentSoft" }}>
                        <Text fontSize={{ base: "16px", md: "15px" }} fontWeight={600} color="fg">{r.name}</Text>
                        <Text textAlign="center" color="muted" fontSize="14.5px" sx={{ fontVariantNumeric: "tabular-nums" }}>{r.diff}</Text>
                        <Text color="muted" fontSize="13.5px">{r.strong}</Text>
                        <Text color="muted" fontSize="13.5px">{r.weak}</Text>
                        <Text textAlign="right" color="accentTx" fontSize="13.5px">{r.attr}</Text>
                      </Box>
                    ))}
                  </Box></Box>
                </ParchPanel>
              </Box>
            ))}
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap="22px">
            {blocks.map((b) => renderBlock(b, compTab === 8))}
          </Box>
        )}
        </>
        )}
      </Box>
      </Box>
    </Flex>
  );
};
