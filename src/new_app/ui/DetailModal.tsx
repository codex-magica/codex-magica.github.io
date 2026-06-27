import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { ParchPanel } from "./ParchPanel";

export interface ModalState {
  kind: "skill" | "spell";
  name: string;
  sub?: string;
  levelStrip?: string; // character-aware strip ("A te fokod: 3. fok" / "Mana: 2 Mp · …")
  currentFok?: number; // character's current fok — foks above it are greyed out
  body: string[];
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
    return <Text mb="13px" fontSize={{ base: "17px", md: "15.5px" }} lineHeight="1.6" color="fg" whiteSpace="pre-line">{rows.map((r) => r.join(" ")).join("\n")}</Text>;
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
          <Text fontSize="14.5px" fontWeight={600} color="fg" lineHeight="1.3" sx={{ fontVariantNumeric: "tabular-nums" }}>{v}</Text>
        </Box>
      ))}
    </Box>
  );
};

// One description block — dispatches on the leading kind-token (stats / table / small) or renders prose.
// `currentFok`: when set, "N. fok" paragraphs above it are greyed (the character hasn't reached them).
const BodyPart: React.FC<{ text: string; currentFok?: number }> = ({ text, currentFok }) => {
  if (/^stats:/i.test(text)) return <StatBlock raw={text} />;
  if (isTable(text)) return <TableBlock raw={text} />;
  if (/^small:/i.test(text)) {
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
      <Text mb="13px" fontSize={{ base: "17px", md: "15.5px" }} lineHeight="1.6" color={reached ? "fg" : "fgFaint"} opacity={reached ? 1 : 0.55} textAlign="justify">
        <Box as="span" fontWeight={700}>{fok[1]}. fok</Box>
        {fok[2]}
      </Text>
    );
  }
  return (
    <Text mb="13px" fontSize={{ base: "17px", md: "15.5px" }} lineHeight="1.6" color="fg" textAlign="justify">
      {text}
    </Text>
  );
};

// A single reusable overlay that opens OVER the current screen and closes back to it — it never navigates.
export const DetailModal: React.FC<Props> = ({ modal, onClose }) => {
  if (!modal) return null;
  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={40}
      bg="rgba(16,14,24,.55)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p="28px"
      onClick={onClose}
    >
      <ParchPanel
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        borderRadius="12px"
        p={0}
        w="min(660px, 100%)"
        maxH="86vh"
        display="flex"
        flexDirection="column"
        overflow="hidden"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,.42)" }}
      >
        <Box position="relative" px="28px" pt="22px" pb="15px" borderBottom="1px solid" borderColor="rule" textAlign="center">
          <Box
            as="button"
            type="button"
            onClick={onClose}
            position="absolute"
            top="14px"
            right="16px"
            w="32px"
            h="32px"
            borderRadius="8px"
            border="1px solid"
            borderColor="hair"
            bg="fieldBg"
            color="muted"
            fontSize="15px"
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
          >
            ✕
          </Box>
          <Heading as="h3" fontSize={{ base: "23px", md: "20px" }} fontWeight={700} color="fg">{modal.name}</Heading>
          {modal.sub && <Text mt="4px" fontSize="14.5px" fontWeight={600} color="muted">{modal.sub}</Text>}
          {modal.levelStrip && (
            <Box mt="9px" display="inline-flex" alignItems="center" gap="7px" px="12px" py="4px" borderRadius="8px" bg="accentSoft" color="accentTx" fontFamily="system-ui" fontSize="12px" fontWeight={700}>
              {modal.levelStrip}
            </Box>
          )}
        </Box>
        <Box flex="1 1 auto" overflowY="auto" px="28px" pt="20px" pb="26px">
          {modal.body.map((p, i) => (
            <BodyPart key={i} text={p} currentFok={modal.currentFok} />
          ))}
        </Box>
      </ParchPanel>
    </Box>
  );
};
