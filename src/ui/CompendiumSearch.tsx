import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Flex, Input, Text } from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { ModalState } from "./DetailModal";
import { TABS, tabBlocks, skillModalBody, skillModalSub } from "./compendiumData";
import { SKILLS } from "../model/skills";
import { rulesHomebrew } from "../model/rulesVariants";

// ── Spotlight-style compendium search ──────────────────────────────────────────────────────────
// A centred palette (⌘K) over the compendium. Typing ≥3 characters live-searches every named
// entry — skills, spells, weapons, armor, items, poisons, combat situations — across all tabs.
// Picking a result navigates to the tab, scrolls to its table and opens its detail modal.

export interface SearchEntry {
  name: string;
  tab: number; // compendium tab index
  page: string; // tab display name
  block: string; // table (block) title within the tab — also the scroll anchor
  value?: string; // small right-aligned context (e.g. price)
  modal?: ModalState; // opened on pick when the entry has a description
}

// ── index ──
// Built lazily on first open, then cached for the session, per rules variant — only the skill
// entries differ between base and homebrew (the other tabs are variant-independent).
const INDEX: { base?: SearchEntry[]; hb?: SearchEntry[] } = {};

// build the index while the browser is idle so the first palette open doesn't pay for it
export function prewarmSearchIndex(homebrew = false): void {
  const idle = (window as any).requestIdleCallback as undefined | ((cb: () => void) => void);
  if (idle) idle(() => searchIndex(homebrew));
  else setTimeout(() => searchIndex(homebrew), 300);
}

export function searchIndex(homebrew = false): SearchEntry[] {
  const key = homebrew ? "hb" : "base";
  if (INDEX[key]) return INDEX[key]!;
  const out: SearchEntry[] = [];
  const skillDefs = homebrew ? Object.keys(rulesHomebrew().skills).map((n) => rulesHomebrew().skills[n]) : SKILLS;
  for (const s of skillDefs) {
    out.push({
      name: s.name, tab: 0, page: TABS[0].name, block: s.category,
      modal: { kind: "skill", name: s.name, sub: skillModalSub(s.name, homebrew), body: skillModalBody(s.name, homebrew) },
    });
  }
  for (let tab = 1; tab < TABS.length; tab++) {
    const def = TABS[tab];
    for (const block of tabBlocks(tab, homebrew)) {
      for (const r of block.rows) {
        // right-aligned context value from the tab registry (spell cost, item price, weapon damage…).
        // Long non-values ("Lásd a leírást!") are dropped.
        const value = def.searchValue?.(r, block.title);
        out.push({
          name: r.name, tab, page: def.name, block: block.title,
          value: value && value.length <= 16 ? value : undefined,
          modal: r.body?.length ? { kind: "spell", name: r.name, sub: r.modalSub, body: r.body } : undefined,
        });
      }
    }
  }
  INDEX[key] = out;
  return out;
}

// ── matching ──
// Case-insensitive; accent-insensitive one way only: an unaccented query letter matches its
// accented variants ("i" → i and í), but an accented query letter matches only itself.
const ACCENTS: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ö: "o", ő: "o", ú: "u", ü: "u", ű: "u" };

export function matchAt(name: string, query: string): number {
  const n = name.toLowerCase();
  const q = query.toLowerCase();
  outer: for (let i = 0; i + q.length <= n.length; i++) {
    for (let j = 0; j < q.length; j++) {
      const qc = q[j];
      const nc = n[i + j];
      if (qc === nc) continue;
      if (ACCENTS[qc] === undefined && ACCENTS[nc] === qc) continue; // unaccented query ↔ accented name
      continue outer;
    }
    return i;
  }
  return -1;
}

interface Hit { entry: SearchEntry; pos: number }

const isLetter = (c: string) => c.toLowerCase() !== c.toUpperCase();
// relevance: exact prefix < word start < anywhere inside
const rankOf = (h: Hit) => (h.pos === 0 ? 0 : !isLetter(h.entry.name[h.pos - 1]) ? 1 : 2);

export function runSearch(query: string, homebrew = false, limit = 60): Hit[] {
  const q = query.trim();
  if (!q) return [];
  const hits: Hit[] = [];
  for (const entry of searchIndex(homebrew)) {
    const pos = matchAt(entry.name, q);
    if (pos >= 0) hits.push({ entry, pos });
  }
  hits.sort((a, b) => {
    const ra = rankOf(a), rb = rankOf(b);
    if (ra !== rb) return ra - rb;
    if (a.entry.tab !== b.entry.tab) return a.entry.tab - b.entry.tab;
    return a.entry.name.localeCompare(b.entry.name, "hu");
  });
  return hits.slice(0, limit);
}

// ── result-type glyphs (one per tab family) ──
const glyphPath: Record<string, React.ReactNode> = {
  book: <><path d="M4 5.5h6.5a3 3 0 0 1 3 3V20a2.4 2.4 0 0 0-2.4-2.4H4z" /><path d="M20 5.5h-6.5a3 3 0 0 0-3 3V20a2.4 2.4 0 0 1 2.4-2.4H20z" /></>,
  spark: <><path d="M12 3l1.9 5.6L19.5 12l-5.6 1.9L12 19.5l-1.9-5.6L4.5 12l5.6-2.4z" /></>,
  sword: <><path d="M4 20l10.5-10.5" /><path d="M13 4l7 7-2.5 2.5-7-7z" /><path d="M3.5 16.5l4 4" /></>,
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" /></>,
  burst: <><path d="M12 5v3M12 16v3M5 12h3M16 12h3M7 7l2 2M15 15l2 2M17 7l-2 2M9 15l-2 2" /></>,
  coin: <><circle cx="12" cy="12" r="8" /><path d="M12 8.5v7M9.5 10.5c0-1 1-1.7 2.5-1.7s2.5.7 2.5 1.6c0 2.4-5 1.6-5 3.9 0 1 1 1.7 2.5 1.7s2.5-.7 2.5-1.6" /></>,
  drop: <><path d="M12 3.5s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z" /></>,
  person: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6" /></>,
};
const tabGlyph = (tab: number) => TABS[tab]?.glyph ?? "book";

const Glyph: React.FC<{ kind: string }> = ({ kind }) => (
  <Box w="30px" h="30px" flexShrink={0} borderRadius="8px" bg="chipBg" border="1px solid" borderColor="chipBd" color="accentTx" display="flex" alignItems="center" justifyContent="center">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {glyphPath[kind]}
    </svg>
  </Box>
);

// name with the matched span emphasised
const MatchedName: React.FC<{ name: string; pos: number; len: number }> = ({ name, pos, len }) => (
  <Text fontSize="15px" fontWeight={600} color="fg" lineHeight="1.25" noOfLines={1}>
    {name.slice(0, pos)}
    <Box as="span" color="accentTx" textDecoration="underline" textDecorationColor="accentBd" textUnderlineOffset="3px">{name.slice(pos, pos + len)}</Box>
    {name.slice(pos + len)}
  </Text>
);

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box as="kbd" display="inline-flex" alignItems="center" px="5px" py="1px" borderRadius="5px" border="1px solid" borderColor="hair" bg="band" fontFamily="system-ui" fontSize="10.5px" fontWeight={600} color="fgFaint" lineHeight="1.4">
    {children}
  </Box>
);

// one result row, memoised — typing/hover re-renders only the rows whose props changed
const ResultRow = React.memo<{
  hit: Hit;
  idx: number;
  selected: boolean;
  qlen: number;
  onHover: (i: number) => void;
  onPickHit: (h: Hit) => void;
}>(({ hit, idx, selected, qlen, onHover, onPickHit }) => (
  <Flex
    data-idx={idx} as="button" type="button" w="100%" textAlign="left" align="center" gap="12px" px="13px" py={{ base: "9px", md: "7px" }}
    bg={selected ? "accentSoft" : "transparent"} onMouseMove={() => !selected && onHover(idx)} onClick={() => onPickHit(hit)}
    position="relative"
  >
    {selected && <Box position="absolute" left="0" top="6px" bottom="6px" w="3px" borderRadius="0 2px 2px 0" bg="accent" />}
    <Glyph kind={tabGlyph(hit.entry.tab)} />
    <Box flex="1 1 auto" minW={0}>
      <MatchedName name={hit.entry.name} pos={hit.pos} len={qlen} />
      <Text fontFamily="system-ui" fontSize="11.5px" color="fgFaint" noOfLines={1}>
        {hit.entry.page}{hit.entry.block !== hit.entry.page ? ` · ${hit.entry.block}` : ""}
      </Text>
    </Box>
    {hit.entry.value && (
      <Text flexShrink={0} fontSize="13px" color="muted" sx={{ fontVariantNumeric: "tabular-nums" }}>{hit.entry.value}</Text>
    )}
  </Flex>
));

// ── the palette ──
// The query is palette-local state (so typing re-renders only the palette, never the compendium
// behind it) mirrored into the parent through `onQueryChange`, which mutates a ref: it survives
// picking a result (reopen resumes the search) and the parent clears it on dismissal (Esc /
// backdrop / ⌘K).
export const SearchPalette: React.FC<{
  initialQuery: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  onPick: (e: SearchEntry) => void;
  homebrew?: boolean; // which rules variant the skill entries reflect
}> = ({ initialQuery, onQueryChange, onClose, onPick, homebrew = false }) => {
  const [query, setQuery] = useState(initialQuery);
  const [sel, setSel] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => runSearch(query, homebrew), [query, homebrew]);
  const short = query.trim().length < 1;

  useEffect(() => setSel(0), [query]);

  // a resumed search opens with the query selected — typing restarts, arrows/Enter continue
  useEffect(() => { inputRef.current?.select(); }, []);

  const setQueryBoth = (q: string) => {
    setQuery(q);
    onQueryChange(q);
  };
  const onHover = React.useCallback((i: number) => setSel(i), []);
  const onPickHit = React.useCallback((h: Hit) => onPick(h.entry), [onPick]);

  // keep the keyboard-selected row in view
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    // stopPropagation: keep the Esc from also reaching the window-level esc-stack listener
    // (Modal.tsx), which would close the layer underneath in the same keypress.
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && hits[sel]) { e.preventDefault(); onPick(hits[sel].entry); }
  };

  return (
    <Box position="fixed" inset={0} zIndex={46} bg="rgba(16,14,24,.55)" onClick={onClose}>
      <Box
        position="absolute" top={{ base: "max(12px, env(safe-area-inset-top))", md: "calc(14vh / var(--app-zoom, 1))" }} left="50%" transform="translateX(-50%)" w="min(620px, calc(100vw / var(--app-zoom, 1) - 24px))"
        bg="page" border="1px solid" borderColor="hair" borderRadius="14px" overflow="hidden"
        boxShadow="0 24px 64px rgba(0,0,0,.42)" onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}
      >
        <Flex align="center" gap="11px" px="16px" borderBottom="1px solid" borderColor="rule">
          <SearchIcon boxSize="15px" color="fgFaint" flexShrink={0} />
          <Input
            ref={inputRef} value={query} onChange={(e) => setQueryBoth(e.target.value)} autoFocus variant="unstyled"
            placeholder="Keresés a kompendiumban…" fontSize="17px" color="fg" py="15px"
            _placeholder={{ color: "fgFaint" }}
          />
          <Kbd>Esc</Kbd>
        </Flex>

        {short ? (
          <Text px="18px" py="16px" fontFamily="system-ui" fontSize="13px" color="fgFaint">
            Kezdj el gépelni — képzettségek, varázslatok, fegyverek, tárgyak, mérgek…
          </Text>
        ) : hits.length === 0 ? (
          <Text px="18px" py="16px" fontFamily="system-ui" fontSize="13px" color="fgFaint">
            Nincs találat a(z) „{query.trim()}” kifejezésre.
          </Text>
        ) : (
          <Box ref={listRef} maxH={{ base: "42vh", md: "min(calc(54vh / var(--app-zoom, 1)), 480px)" }} overflowY="auto" py="7px" sx={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
            {hits.map((h, i) => (
              <ResultRow
                key={`${h.entry.tab}:${h.entry.block}:${h.entry.name}`}
                hit={h} idx={i} selected={i === sel} qlen={query.trim().length}
                onHover={onHover} onPickHit={onPickHit}
              />
            ))}
          </Box>
        )}

        <Flex align="center" gap="14px" px="16px" py="8px" borderTop="1px solid" borderColor="rule" bg="band">
          <Flex display={{ base: "none", md: "flex" }} align="center" gap="5px"><Kbd>↑</Kbd><Kbd>↓</Kbd><Text fontFamily="system-ui" fontSize="11px" color="fgFaint">lépkedés</Text></Flex>
          <Flex display={{ base: "none", md: "flex" }} align="center" gap="5px"><Kbd>↵</Kbd><Text fontFamily="system-ui" fontSize="11px" color="fgFaint">megnyitás</Text></Flex>
          <Text display={{ base: "block", md: "none" }} fontFamily="system-ui" fontSize="11px" color="fgFaint">Kompendium-kereső</Text>
          {!short && hits.length > 0 && (
            <Text ml="auto" fontFamily="system-ui" fontSize="11px" color="fgFaint">{hits.length >= 60 ? "Az első 60 találat" : `${hits.length} találat`}</Text>
          )}
        </Flex>
      </Box>
    </Box>
  );
};

// ── the sidebar trigger, styled like a quiet search field ──
export const SearchButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
  return (
    <Flex
      as="button" type="button" onClick={onClick} w="100%" align="center" gap="8px" px="11px" h="34px"
      bg="fieldBg" border="1px solid" borderColor="fieldBd" borderRadius="9px" color="fgFaint"
      transition="border-color .12s, color .12s" _hover={{ borderColor: "accent", color: "muted" }}
    >
      <SearchIcon boxSize="13px" flexShrink={0} />
      <Text fontSize="13.5px" noOfLines={1}>Keresés…</Text>
      <Box ml="auto" display={{ base: "none", md: "flex" }} alignItems="center"><Kbd>{isMac ? "⌘K" : "Ctrl K"}</Kbd></Box>
    </Flex>
  );
};
