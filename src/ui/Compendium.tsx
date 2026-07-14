import React, { useEffect, useRef, useState } from "react";
import { Box, Flex, Heading, Text, useBreakpointValue } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { SearchIcon } from "@chakra-ui/icons";
import { ParchPanel } from "./ParchPanel";
import { ModalState } from "./DetailModal";
import { Markdown } from "./Markdown";
import { TABS, tabBlocks, TableBlock, TableRow, skillModalBody } from "./compendiumData";
import { stripTitleHeading } from "../data/magicRules";
import { SearchPalette, SearchButton, SearchEntry, prewarmSearchIndex } from "./CompendiumSearch";
import { OpenBookIcon } from "./icons";
import { SKILLS, SkillDef } from "../model/skills";
import { rulesHomebrew } from "../model/rulesVariants";
import { SKILL_CATEGORIES } from "../model/common";
import introMd from "../book/01-bevezeto.md";
import charMd from "../book/02-karakteralkotas.md";

// rulebook chapters shown via the Markdown renderer; tab indices start right after the data tabs
const CHAPTER_BASE = TABS.length;
const CHAPTERS = [
  { name: "Bevezető", md: introMd },
  { name: "Karakteralkotás", md: charMd },
];

interface Props {
  compTab: number;
  onSelectTab: (tab: number) => void;
  onOpenModal: (m: ModalState) => void;
  // parent-provided content for the merged mobile top bar (zone switch / back / dark toggle) —
  // on phones the parent hides its own bar and the compendium hosts everything in one row
  mobileLeading?: React.ReactNode;
  mobileTrailing?: React.ReactNode;
  // which rules variant to render (skills tab, skill modals, search). Standalone: the app-level
  // preference, with `onSetHomebrew` showing the nav-footer switch. In-character: the character's
  // own flag, no setter — the footer then shows a read-only note instead of the switch.
  homebrew?: boolean;
  onSetHomebrew?: (on: boolean) => void;
}

// sidebar section order — the tabs themselves come from the TABS registry (standalone items first)
const NAV_GROUPS = ["Harc", "Mágia", "Felszerelés"] as const;

const NavSection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box display="flex" alignItems="center" gap="10px" mt="20px" mb="6px">
    <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".13em" textTransform="uppercase" color="fgFaint" flexShrink={0}>{children}</Text>
    <Box flex="1 1 auto" h="1px" bg="hair" />
  </Box>
);
// full-bleed item: bg spans the whole sidebar width, text stays inset to align with the headers
const NavItem: React.FC<{ active: boolean; prominent?: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, prominent, onClick, children }) => (
  <Box as="button" type="button" onClick={onClick} position="relative" display="block" w="calc(100% + 28px)" textAlign="left" mx="-14px" px="14px"
    py={{ base: prominent ? "12px" : "10px", md: prominent ? "9px" : "7px" }}
    bg={active ? "accentSoft" : "transparent"} color={active ? "fg" : "muted"} fontWeight={active || prominent ? 700 : 500} fontSize={{ base: prominent ? "18px" : "16.5px", md: prominent ? "17px" : "15.5px" }}
    transition="background .12s, color .12s" _hover={{ bg: active ? "accentSoft" : "band", color: "fg" }}>
    {active && <Box position="absolute" left="0" top="0" bottom="0" w="3px" bg="accent" />}
    {children}
  </Box>
);

// slide-in animation for the mobile nav drawer
const drawerIn = keyframes`from { transform: translateX(-100%); } to { transform: translateX(0); }`;
const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;

// square icon button for the mobile header (menu / search) — quiet ghost style, matching the
// roster bar's right-side icon buttons (logout / dark mode)
const HeaderIconBtn: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
  <Box as="button" type="button" aria-label={label} onClick={onClick} w="40px" h="40px" flexShrink={0} borderRadius="10px"
    bg="transparent" color="muted" display="inline-flex" alignItems="center" justifyContent="center" _active={{ bg: "accentSoft" }}>
    {children}
  </Box>
);

const PAD = { base: "18px", md: "16px" };
const SKILL_GRID = "minmax(0,2.1fr) 50px minmax(0,1.4fr) minmax(0,1.3fr) minmax(0,2.2fr)";

const Th: React.FC<{ children: React.ReactNode; align?: string }> = ({ children, align }) => (
  <Box as="span" fontFamily="system-ui" fontSize="10.5px" fontWeight={700} letterSpacing=".06em" textTransform="uppercase" color="fgFaint" textAlign={align as any}>{children}</Box>
);
const GroupHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading as="h3" textAlign="center" fontSize="16px" fontWeight={700} color="fg" mb="9px">{children}</Heading>
);

// quiet "Szabályok" chip placed next to a heading that has rules prose; opens the rules modal
const RulesChip: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Box as="button" type="button" onClick={onClick} display="inline-flex" alignItems="center" gap="4px" px="9px" py="3px" borderRadius="999px"
    border="1px solid" borderColor="accentBd" bg="accentSoft" color="accentTx" fontFamily="system-ui" fontSize="11px" fontWeight={700} whiteSpace="nowrap"
    flexShrink={0} _hover={{ borderColor: "accent" }}>
    <OpenBookIcon size={11} />
    Szabályok
  </Box>
);

// skill catalog for the Képzettségek tab — built per rules variant (base or homebrew), cached
const buildSkillGroups = (defs: SkillDef[]) =>
  SKILL_CATEGORIES.map((cat) => ({
    group: cat,
    rows: defs.filter((s) => s.category === cat).slice().sort((a, b) => a.name.localeCompare(b.name, "hu"))
      .map((s) => ({ name: s.name, diff: s.cost === "percentage" ? "%" : s.difficulty, strong: s.hardReq.map((r) => r.skill).join(", ") || "–", weak: s.softReq.map((r) => r.skill).join(", ") || "–", attr: s.attrs.join(s.attrsAny ? " vagy " : ", ") || "–" })),
  })).filter((g) => g.rows.length > 0);
type SkillGroups = ReturnType<typeof buildSkillGroups>;
const skillGroupsCache: { base?: SkillGroups; hb?: SkillGroups } = {};
const skillGroupsFor = (homebrew: boolean): SkillGroups => {
  const key = homebrew ? "hb" : "base";
  if (!skillGroupsCache[key]) {
    const defs = homebrew ? Object.keys(rulesHomebrew().skills).map((n) => rulesHomebrew().skills[n]) : SKILLS;
    skillGroupsCache[key] = buildSkillGroups(defs);
  }
  return skillGroupsCache[key]!;
};

export const Compendium: React.FC<Props> = ({ compTab, onSelectTab, onOpenModal, mobileLeading, mobileTrailing, homebrew = false, onSetHomebrew }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  // mobile (< md): the sidebar becomes a slide-in drawer behind a header menu button
  const [navOpen, setNavOpen] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;
  const contentRef = useRef<HTMLDivElement>(null);
  // the query outlives a pick (reopening resumes the search) but a dismissal clears it; held in a
  // ref so typing in the palette never re-renders the compendium behind it
  const searchQueryRef = useRef("");
  // navigation target picked in the search palette; consumed once the target tab has rendered
  const pendingRef = useRef<{ tab: number; block: string; name: string } | null>(null);
  const [pendingTick, setPendingTick] = useState(0);

  // build the search index while idle so the first palette open is instant (per rules variant)
  useEffect(() => prewarmSearchIndex(homebrew), [homebrew]);

  // a fresh page starts at its top (the scroll container survives tab switches); the search-pick
  // effect below runs after this and wins when there is a row to scroll to
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [compTab]);

  const dismissSearch = () => {
    searchQueryRef.current = "";
    setSearchOpen(false);
  };

  // ⌘K / Ctrl+K toggles the search palette (closing this way counts as a dismissal)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => {
          if (o) searchQueryRef.current = "";
          return !o;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pickResult = (entry: SearchEntry) => {
    setSearchOpen(false); // keep the query — the user may want to resume the search
    if (entry.modal) onOpenModal(entry.modal);
    pendingRef.current = { tab: entry.tab, block: entry.block, name: entry.name };
    onSelectTab(entry.tab);
    setPendingTick((t) => t + 1);
  };

  // once the picked entry's tab is on screen, scroll its row into view and flash it
  useEffect(() => {
    const p = pendingRef.current;
    if (!p || compTab !== p.tab) return;
    pendingRef.current = null;
    requestAnimationFrame(() => {
      const blockEl = document.querySelector(`[data-block="${CSS.escape(p.block)}"]`);
      const rowEl = (blockEl?.querySelector(`[data-row="${CSS.escape(p.name)}"]`) ?? blockEl) as HTMLElement | null;
      if (!rowEl) return;
      rowEl.scrollIntoView({ block: "center", behavior: "smooth" });
      rowEl.style.backgroundColor = "var(--chakra-colors-accentSoft)";
      setTimeout(() => {
        rowEl.style.transition = "background-color 1.2s ease";
        rowEl.style.backgroundColor = "";
        setTimeout(() => { rowEl.style.transition = ""; }, 1300);
      }, 900);
    });
  }, [compTab, pendingTick]);

  const chapter = compTab >= CHAPTER_BASE ? CHAPTERS[compTab - CHAPTER_BASE] : null;
  const tab = chapter ? undefined : TABS[compTab];
  const title = tab?.name ?? "";
  const isSkills = tab?.special === "skills";
  const blocks: TableBlock[] = isSkills || !tab ? [] : tabBlocks(compTab);

  const openRow = (r: TableRow) => onOpenModal({ kind: "spell", name: r.name, sub: r.modalSub, body: r.body || [] });

  // rules prose for the current tab, plus a helper to open it in the markdown modal
  const schoolRules = tab?.rules;
  // chapter-level rules for the main heading: the tab's own (skills, poisons) or the school's
  const headingRules = tab?.headingRules ?? schoolRules?.rules;
  const openRules = (name: string, sub: string, md: string) =>
    onOpenModal({ kind: "rules", name, sub, body: [], markdown: stripTitleHeading(md, name) });

  // dense = cram all columns to fit the container (no horizontal scroll) — used for the wide
  // weapons table; value columns shrink to share the width.
  const renderBlock = (block: TableBlock, dense = false) => {
    const showTitle = block.title !== title; // a lone block titled like the page heading needs no repeat
    const grid = dense
      ? `minmax(82px, 1.3fr) ${block.columns.map(() => "minmax(0, 1fr)").join(" ")}`
      : `minmax(140px, 1.6fr) ${block.columns.map(() => "minmax(58px, 1fr)").join(" ")}`;
    const gap = dense ? "4px" : "8px";
    const px = dense ? { base: "8px", md: "10px" } : PAD;
    const hSize = dense ? "9px" : "10.5px";
    const cellFs = dense ? "11.5px" : "12.5px";
    const nameFs = dense ? { base: "13px", md: "12.5px" } : "13.5px";

    const inner = (
      <Box minW={dense ? undefined : `${170 + block.columns.length * 86}px`}>
        <Box display="grid" gridTemplateColumns={grid} gap={gap} px={px} py={dense ? "9px" : "11px"} borderBottom="1px solid" borderColor="rule" alignItems="end">
          <Box as="span" fontFamily="system-ui" fontSize={hSize} fontWeight={700} letterSpacing=".04em" textTransform="uppercase" color="fgFaint">{block.nameLabel}</Box>
          {block.columns.map((c, i) => (
            <Box key={i} as="span" fontFamily="system-ui" fontSize={hSize} fontWeight={700} letterSpacing=".02em" textTransform="uppercase" color="fgFaint" textAlign={(c.align as any) || "center"}>{c.label}</Box>
          ))}
        </Box>
        {block.rows.map((r, i) => {
          // rows without a description (pure price lists) render as plain rows, not buttons
          const clickable = !!r.body?.length;
          return (
          <Box key={r.name + i} data-row={r.name} {...(clickable ? { as: "button" as const, type: "button", onClick: () => openRow(r) } : {})} display="grid" gridTemplateColumns={grid} gap={gap} w="100%" textAlign="left" px={px} py={dense ? "7px" : { base: "10px", md: "8px" }} borderTop={i === 0 ? undefined : "1px solid"} borderColor="hairSoft" alignItems="baseline" _hover={clickable ? { bg: "accentSoft" } : undefined}>
            <Text fontSize={nameFs} fontWeight={600} color="fg" lineHeight="1.2">{r.name}</Text>
            {r.note ? (
              <Text gridColumn="2 / -1" textAlign="center" fontSize={cellFs} fontStyle="italic" color="fgFaint" lineHeight="1.25">{r.note}</Text>
            ) : r.cells.map((cell, j) => (
              <Text key={j} textAlign={(block.columns[j].align as any) || "center"} fontSize={cellFs} color="muted" lineHeight="1.25" sx={{ fontVariantNumeric: "tabular-nums" }}>{cell}</Text>
            ))}
          </Box>
          );
        })}
      </Box>
    );

    const subRules = schoolRules?.sub?.[block.title];
    return (
      <Box key={block.title} data-block={block.title}>
        {showTitle && (
        <Box display="flex" alignItems="center" justifyContent="center" gap="10px" mb="9px">
          <Heading as="h3" textAlign="center" fontSize="16px" fontWeight={700} color="fg">{block.title}</Heading>
          {subRules && <RulesChip onClick={() => openRules(block.title, "Szabályok", subRules)} />}
        </Box>
        )}
        <ParchPanel p={0} overflow="hidden">
          {dense ? inner : <Box overflowX="auto">{inner}</Box>}
        </ParchPanel>
        {block.footer && (
          <Text mt="7px" fontSize="12px" lineHeight="1.5" color="fgFaint">{block.footer}</Text>
        )}
      </Box>
    );
  };

  // shared nav content: the desktop sidebar and the mobile drawer render the same list
  const go = (tab: number) => {
    onSelectTab(tab);
    setNavOpen(false);
  };
  const navContent = (
    <>
      <SearchButton onClick={() => { setNavOpen(false); setSearchOpen(true); }} />
      <Box mt="18px" mb="12px">
        <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".16em" textTransform="uppercase" color="fgFaint">Kompendium</Text>
        <Heading as="p" fontSize="21px" fontStyle="italic" fontWeight={600} color="fg" lineHeight="1.1">Tartalom</Heading>
      </Box>
      {CHAPTERS.map((c, i) => (
        <NavItem key={i} active={compTab === CHAPTER_BASE + i} onClick={() => go(CHAPTER_BASE + i)}>{c.name}</NavItem>
      ))}
      {TABS.map((t, i) => (t.group == null ? <NavItem key={t.name} active={compTab === i} onClick={() => go(i)}>{t.name}</NavItem> : null))}
      {NAV_GROUPS.map((g) => (
        <React.Fragment key={g}>
          <NavSection>{g}</NavSection>
          {TABS.map((t, i) => (t.group === g ? <NavItem key={t.name} active={compTab === i} onClick={() => go(i)}>{t.name}</NavItem> : null))}
        </React.Fragment>
      ))}
      {/* Rules-variant footer — shared by the sidebar and the mobile drawer. Standalone compendium:
          a segmented switch bound to the app preference; in-character: a read-only note (the shown
          variant is the character's, fixed at creation). */}
      <NavSection>Szabályváltozat</NavSection>
      {onSetHomebrew ? (
        <Flex mt="4px" borderRadius="9px" border="1px solid" borderColor="fieldBd" bg="fieldBg" p="3px" gap="3px">
          {([["Alap", false], ["Házi", true]] as const).map(([label, val]) => {
            const active = homebrew === val;
            return (
              <Box key={label} as="button" type="button" onClick={() => onSetHomebrew(val)} flex="1 1 0" py={{ base: "8px", md: "5px" }} borderRadius="7px"
                bg={active ? "accentSoft" : "transparent"} border="1px solid" borderColor={active ? "accentBd" : "transparent"}
                color={active ? "accentTx" : "muted"} fontFamily="system-ui" fontSize="12.5px" fontWeight={700}
                transition="background .12s, color .12s" _hover={active ? undefined : { color: "fg" }}>
                {label}
              </Box>
            );
          })}
        </Flex>
      ) : (
        <Text mt="4px" fontFamily="system-ui" fontSize="11.5px" color="fgFaint" lineHeight="1.5">
          {homebrew ? "Házi szabályok — a megnyitott karakter szerint." : "Alapszabályok — a megnyitott karakter szerint."}
        </Text>
      )}
      {onSetHomebrew && homebrew && (
        <Text mt="6px" fontFamily="system-ui" fontSize="10.5px" color="fgFaint" lineHeight="1.5">
          Képzettség-átdolgozás: százalékos képzettségek fokban, Éberség összevonás. Új karakterek alapból ezt kapják.
        </Text>
      )}
    </>
  );

  return (
    <Flex direction={{ base: "column", md: "row" }} flex="1 1 auto" minH={0} bg="page" overflow="hidden">
      {/* Merged mobile top bar — parent slots (back / zone switch … dark toggle) + menu + search.
          No title: the page heading sits right below in the content. */}
      {/* 55px = 54px content + the 1px bottom border (border-box) — the other bars put the border on a
          wrapper, so this keeps the pill at the exact same y across zone switches */}
      <Flex display={{ base: "flex", md: "none" }} align="center" gap="9px" px="12px" h="55px" flexShrink={0} borderBottom="1px solid" borderColor="hair" bg="page">
        {mobileLeading}
        <Box flex="1 1 auto" />
        <HeaderIconBtn label="Tartalomjegyzék" onClick={() => setNavOpen(true)}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <line x1="4" y1="6.5" x2="20" y2="6.5" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17.5" x2="20" y2="17.5" />
          </svg>
        </HeaderIconBtn>
        <HeaderIconBtn label="Keresés" onClick={() => setSearchOpen(true)}>
          <SearchIcon boxSize="15px" />
        </HeaderIconBtn>
        {mobileTrailing}
      </Flex>

      {/* Left sidebar navigation (md+) — grouped (Képzettségek · Harc · Mágia · Felszerelés) */}
      <Box as="nav" display={{ base: "none", md: "block" }} w="248px" flexShrink={0} h="100%" overflowY="auto" borderRight="1px solid" borderColor="hair" px="14px" py="20px">
        {navContent}
      </Box>

      {/* Mobile nav drawer */}
      {navOpen && (
        <Box display={{ base: "block", md: "none" }} position="fixed" inset={0} zIndex={44} bg="overlayBg" animation={`${fadeIn} .18s ease`} onClick={() => setNavOpen(false)}>
          <Box
            as="nav" position="absolute" top={0} bottom={0} left={0} w="min(320px, 86vw)" bg="page" borderRight="1px solid" borderColor="hair"
            px="14px" py="16px" pb="max(16px, env(safe-area-inset-bottom))" overflowY="auto" boxShadow="12px 0 40px rgba(0,0,0,.3)"
            animation={`${drawerIn} .22s ease`} onClick={(e) => e.stopPropagation()}
          >
            {navContent}
          </Box>
        </Box>
      )}

      {/* Content */}
      <Box ref={contentRef} flex="1 1 auto" minH={0} overflowY="auto">
      <Box maxW={{ base: "100%", md: "1040px" }} mx="auto" px={{ base: "16px", md: "20px" }} pt={{ base: "26px", md: "24px" }} pb="90px">
        {chapter ? (
        <Box maxW="780px" mx="auto"><Markdown source={chapter.md} /></Box>
        ) : (
        <>
        <Box display="flex" alignItems="center" justifyContent="center" gap="12px" mb={{ base: "18px", md: "4px" }}>
          <Heading as="h2" fontSize="19px" fontWeight={700} color="fg" textAlign="center">{title}</Heading>
          {headingRules && <RulesChip onClick={() => openRules(title, "A fejezet szabályai", headingRules)} />}
        </Box>
        <Text display={{ base: "none", md: "block" }} fontFamily="system-ui" fontSize="12.5px" color="fgFaint" textAlign="center" mb="20px">
          Kompendium · szabálykönyvi referencia — válassz egy elemet a részletekért
        </Text>
        {tab?.intro && (
          <Text fontSize="13.5px" lineHeight="1.65" color="muted" textAlign="center" maxW="680px" mx="auto" mb="24px">
            {tab.intro}
          </Text>
        )}

        {isSkills ? (
          <Box display="flex" flexDirection="column" gap="22px" maxW="760px" mx="auto">
            {skillGroupsFor(homebrew).map((g) => (
              <Box key={g.group} data-block={g.group}>
                <GroupHead>{g.group}</GroupHead>
                <ParchPanel p={0} overflow="hidden">
                  <Box overflowX="auto"><Box minW="560px">
                    <Box display="grid" gridTemplateColumns={SKILL_GRID} alignItems="center" gap="10px" px={PAD} py="11px" borderBottom="1px solid" borderColor="rule">
                      <Th>Képzettség</Th><Th align="center">Nehéz.</Th><Th>Erős</Th><Th>Gyenge</Th><Th align="right">Tulajdonság</Th>
                    </Box>
                    {g.rows.map((r, i) => (
                      <Box as="button" type="button" key={r.name} data-row={r.name} onClick={() => onOpenModal({ kind: "skill", name: r.name, sub: `(${r.diff} – ${r.attr})`, body: skillModalBody(r.name, homebrew) })} display="grid" gridTemplateColumns={SKILL_GRID} alignItems="center" gap="10px" w="100%" textAlign="left" px={PAD} py={{ base: "11px", md: "8px" }} borderTop={i === 0 ? undefined : "1px solid"} borderColor="hairSoft" _hover={{ bg: "accentSoft" }}>
                        <Text fontSize="13.5px" fontWeight={600} color="fg">{r.name}</Text>
                        <Text textAlign="center" color="muted" fontSize="13px" sx={{ fontVariantNumeric: "tabular-nums" }}>{r.diff}</Text>
                        <Text color="muted" fontSize="12.5px">{r.strong}</Text>
                        <Text color="muted" fontSize="12.5px">{r.weak}</Text>
                        <Text textAlign="right" color="accentTx" fontSize="12.5px">{r.attr}</Text>
                      </Box>
                    ))}
                  </Box></Box>
                </ParchPanel>
              </Box>
            ))}
          </Box>
        ) : tab?.layout === "masonry" ? (
          // price lists flow into two masonry columns so the short tables don't stack into one long strip
          <Box maxW="900px" mx="auto" sx={{ columnCount: { base: 1, md: 2 }, columnGap: "22px" }}>
            {blocks.map((b) => (
              <Box key={b.title} mb="22px" sx={{ breakInside: "avoid" }}>{renderBlock(b)}</Box>
            ))}
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap="22px" maxW={tab?.layout === "narrow" ? "760px" : undefined} mx="auto" w="100%">
            {/* the dense (crammed no-scroll) weapons mode only works with desktop widths — on
                mobile it falls back to the normal horizontally scrollable layout */}
            {blocks.map((b) => renderBlock(b, tab?.layout === "dense" && !isMobile))}
          </Box>
        )}
        </>
        )}
      </Box>
      </Box>
      {searchOpen && (
        <SearchPalette
          initialQuery={searchQueryRef.current}
          onQueryChange={(q) => { searchQueryRef.current = q; }}
          onClose={dismissSearch}
          onPick={pickResult}
          homebrew={homebrew}
        />
      )}
    </Flex>
  );
};
