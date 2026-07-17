import React, { useEffect } from "react";
import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { ModalShell, ModalHeader } from "./Modal";
import { Markdown } from "./Markdown";
import { InlineMd, Prose } from "./richText";
import { OpenBookIcon } from "./icons";

// Stepping through a table block's entries in book order — the caller (the compendium) embeds
// closures that reopen the modal on the neighbor.
export interface ModalNav {
  pos: string; // "Dalmágia · 7/14"
  onPrev?: () => void;
  onNext?: () => void;
}

export interface ModalState {
  kind: "skill" | "spell" | "rules";
  name: string;
  sub?: string;
  levelStrip?: string; // character-aware strip ("A te fokod: 3. fok" / "Mana: 2 Mp · …")
  currentFok?: number; // character's current fok — foks above it are greyed out
  body: string[];
  markdown?: string; // when set, the body is a Markdown document (rules text) rendered as-is
  nav?: ModalNav; // ‹ › stepping through the block (compendium table rows)
  onReader?: () => void; // "continue in reader view" — the caller scrolls the chapter to this entry
}

interface Props {
  modal: ModalState | null;
  onClose: () => void;
}

// Description paragraphs carry inline kind-tokens from the source data:
//   "table:H1\tH2…\n\nc1\tc2…"  → a table (cols = \t, rows = \n\n)
//   "small:…"                   → fine-print / footnote text
// A single BodyPart component owns this dispatch so the parsing lives in one place.
const isTable = (p: string) => /^table:/i.test(p);

const TableBlock: React.FC<{ raw: string }> = ({ raw }) => {
  const rows = raw
    .replace(/^table:\s*/i, "")
    .split("\n\n")
    .map((r) => r.split("\t").map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ""));
  if (rows.length === 0) return null;
  const maxCols = Math.max(...rows.map((r) => r.length));
  if (maxCols <= 1) {
    // not really tabular — render as a plain paragraph
    return <Text mb="13px" fontSize="13.5px" lineHeight="1.65" color="fg" whiteSpace="pre-line">{rows.map((r) => r.join(" ")).join("\n")}</Text>;
  }
  // a single-cell first row is a caption, not a header
  let caption: string | null = null;
  let data = rows;
  if (rows[0].length === 1) {
    caption = rows[0][0];
    data = rows.slice(1);
  }
  const [head, ...bodyRows] = data;
  const cols = `repeat(${maxCols}, minmax(0, 1fr))`;
  const cell = (txt: string, key: number, header = false) => (
    <Text key={key} px="10px" py="6px" fontSize={header ? "11px" : "13.5px"} fontFamily={header ? "system-ui" : undefined} fontWeight={header ? 700 : 400} letterSpacing={header ? ".04em" : undefined} textTransform={header ? "uppercase" : undefined} color={header ? "catTx" : "fg"} whiteSpace="pre-line" lineHeight="1.35" sx={{ fontVariantNumeric: "tabular-nums" }}>
      {txt}
    </Text>
  );
  return (
    <Box my="14px" border="1px solid" borderColor="hair" borderRadius="8px" overflow="hidden">
      {caption && (
        <Box px="10px" py="6px" bg="band" fontFamily="system-ui" fontSize="11px" fontWeight={700} letterSpacing=".04em" textTransform="uppercase" color="catTx">{caption}</Box>
      )}
      <Box overflowX="auto">
        <Box minW={`${maxCols * 96}px`}>
          {head && (
            <Box display="grid" gridTemplateColumns={cols} bg="band" borderBottom="1px solid" borderColor="rule">
              {Array.from({ length: maxCols }).map((_, i) => cell(head[i] || "", i, true))}
            </Box>
          )}
          {bodyRows.map((row, r) => (
            <Box key={r} display="grid" gridTemplateColumns={cols} borderTop={r === 0 ? undefined : "1px solid"} borderColor="hairSoft">
              {Array.from({ length: maxCols }).map((_, i) => cell(row[i] || "", i))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

// The spell/weapon stat line ("stats:Időigény: 1 perc · Hatótáv: … · …") rendered as accentuated
// label/value chips instead of a plain paragraph.
const StatBlock: React.FC<{ raw: string }> = ({ raw }) => {
  const pairs = raw
    .replace(/^stats:\s*/i, "")
    .split(" · ")
    .map((p) => {
      const i = p.indexOf(": ");
      return i >= 0 ? [p.slice(0, i), p.slice(i + 2)] : ["", p];
    });
  return (
    <Box display="flex" flexWrap="wrap" gap="7px" mb="18px">
      {pairs.map(([k, v], i) => (
        <Box key={i} bg="chipBg" border="1px solid" borderColor="chipBd" borderRadius="9px" px="11px" py="6px">
          {k && (
            <Text fontFamily="system-ui" fontSize="9px" fontWeight={700} letterSpacing=".07em" textTransform="uppercase" color="accentTx" lineHeight="1.3">{k}</Text>
          )}
          <Text fontSize="13.5px" fontWeight={600} color="fg" lineHeight="1.3" sx={{ fontVariantNumeric: "tabular-nums" }}>{v}</Text>
        </Box>
      ))}
    </Box>
  );
};

// One description block — dispatches on the leading kind-token (stats / table / small) or renders prose.
// `currentFok`: when set, "N. fok" paragraphs above it are greyed (the character hasn't reached them).
// Exported: the sheet's weapon card renders its description through the same dispatch.
export const BodyPart: React.FC<{ text: string; currentFok?: number }> = ({ text, currentFok }) => {
  if (/^stats:/i.test(text)) return <StatBlock raw={text} />;
  if (isTable(text)) return <TableBlock raw={text} />;
  if (/^small:/i.test(text)) {
    // literal — the asterisks here are footnote markers, not markup
    return (
      <Text mb="11px" fontSize="12.5px" lineHeight="1.5" color="fgFaint" whiteSpace="pre-line">
        {text.replace(/^small:\s*/i, "")}
      </Text>
    );
  }
  // bold the "N. fok" lead in skill descriptions; grey foks the character hasn't reached
  const fok = text.match(/^(\d+)\.\s*fok\b([\s\S]*)$/);
  if (fok) {
    const reached = currentFok == null || parseInt(fok[1], 10) <= currentFok;
    return (
      <Text mb="13px" fontSize="13.5px" lineHeight="1.65" color={reached ? "fg" : "fgFaint"} opacity={reached ? 1 : 0.55} textAlign="justify">
        <Box as="span" fontWeight={700}>{fok[1]}. fok</Box>
        <InlineMd text={fok[2]} />
      </Text>
    );
  }
  return <Prose text={text} parProps={{ textAlign: "justify" }} />;
};

// a footer step button (‹ ›) — greyed placeholder keeps the layout stable at the block's ends
const StepBtn: React.FC<{ dir: "prev" | "next"; onClick?: () => void }> = ({ dir, onClick }) => (
  <Box as="button" type="button" onClick={onClick} disabled={!onClick}
    aria-label={dir === "prev" ? "Előző" : "Következő"} title={dir === "prev" ? "Előző (←)" : "Következő (→)"}
    w="34px" h="30px" flexShrink={0} borderRadius="8px" border="1px solid" borderColor={onClick ? "fieldBd" : "transparent"}
    bg={onClick ? "fieldBg" : "transparent"} color={onClick ? "accentTx" : "fgFaint"} opacity={onClick ? 1 : 0.35}
    display="inline-flex" alignItems="center" justifyContent="center" _hover={onClick ? { borderColor: "accent", bg: "accentSoft" } : undefined}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {dir === "prev" ? <polyline points="15 6 9 12 15 18" /> : <polyline points="9 6 15 12 9 18" />}
    </svg>
  </Box>
);

// A single reusable overlay that opens OVER the current screen and closes back to it — it never navigates.
export const DetailModal: React.FC<Props> = ({ modal, onClose }) => {
  // ← / → step through the block while the modal is open (skipped while typing in a field)
  useEffect(() => {
    const nav = modal?.nav;
    if (!nav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowLeft" && nav.onPrev) { e.preventDefault(); nav.onPrev(); }
      else if (e.key === "ArrowRight" && nav.onNext) { e.preventDefault(); nav.onNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  if (!modal) return null;
  return (
    <ModalShell onClose={onClose} width="min(660px, 100%)" maxH="86vh" zIndex={40} overlayPad="28px">
      <ModalHeader onClose={onClose} closeSize="md" px="28px" pt="22px" pb="15px">
        <Heading as="h3" fontSize="18px" fontWeight={700} color="fg">{modal.name}</Heading>
        {modal.sub && <Text mt="4px" fontSize="13px" fontWeight={600} color="muted">{modal.sub}</Text>}
        {modal.levelStrip && (
          <Box mt="9px" display="inline-flex" alignItems="center" gap="7px" px="12px" py="4px" borderRadius="8px" bg="accentSoft" color="accentTx" fontFamily="system-ui" fontSize="12px" fontWeight={700}>
            {modal.levelStrip}
          </Box>
        )}
      </ModalHeader>
      <Box flex="1 1 auto" overflowY="auto" px="28px" pt="20px" pb="26px">
        {modal.markdown != null ? (
          <Markdown source={modal.markdown} />
        ) : (
          modal.body.map((p, i) => <BodyPart key={i} text={p} currentFok={modal.currentFok} />)
        )}
      </Box>
      {(modal.nav || modal.onReader) && (
        <Flex align="center" gap="9px" px="16px" py="9px" borderTop="1px solid" borderColor="rule" flexShrink={0}>
          {modal.nav && <StepBtn dir="prev" onClick={modal.nav.onPrev} />}
          <Text flex="1 1 auto" textAlign="center" fontFamily="system-ui" fontSize="11.5px" color="fgFaint" noOfLines={1}>
            {modal.nav?.pos}
          </Text>
          {modal.onReader && (
            <Box as="button" type="button" onClick={() => { modal.onReader!(); onClose(); }}
              title="Olvasó nézet — folyamatos olvasás a fejezetben" aria-label="Olvasó nézet"
              h="30px" px="10px" flexShrink={0} borderRadius="8px" border="1px solid" borderColor="fieldBd" bg="fieldBg"
              color="accentTx" display="inline-flex" alignItems="center" gap="6px" fontFamily="system-ui" fontSize="12px" fontWeight={700}
              _hover={{ borderColor: "accent", bg: "accentSoft" }}>
              <OpenBookIcon size={12} />
              <Box as="span" display={{ base: "none", md: "inline" }}>Olvasó nézet</Box>
            </Box>
          )}
          {modal.nav && <StepBtn dir="next" onClick={modal.nav.onNext} />}
        </Flex>
      )}
    </ModalShell>
  );
};
