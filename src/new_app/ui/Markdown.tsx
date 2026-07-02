// A lightweight Markdown renderer styled to the "Kódex" parchment system. Handles the formatting the
// rulebook uses: headings, paragraphs, **bold**/*italic*/`code`, blockquotes, lists, pipe tables, rules,
// and HTML comments (stripped). Not a full CommonMark implementation — just enough for the chapters.
import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";

// inline spans: **bold**, *italic*, `code`
const inline = (s: string): React.ReactNode[] => {
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1] != null) out.push(<Text as="strong" key={k++} fontWeight={700} color="fg">{m[1]}</Text>);
    else if (m[2] != null) out.push(<Text as="em" key={k++} fontStyle="italic">{m[2]}</Text>);
    else out.push(<Box as="code" key={k++} fontFamily="ui-monospace, monospace" fontSize="0.88em" bg="chipBg" px="4px" py="1px" borderRadius="4px">{m[3]}</Box>);
    last = re.lastIndex;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
};

const H_PROPS: Record<number, Record<string, unknown>> = {
  1: { fontSize: "23px", mt: "4px", mb: "16px", pb: "10px", borderBottom: "1px solid", borderColor: "rule" },
  2: { fontSize: "19px", mt: "30px", mb: "9px" },
  3: { fontSize: "16.5px", mt: "22px", mb: "6px" },
  4: { fontSize: "15.5px", mt: "16px", mb: "4px", color: "accentTx" },
};

const cells = (row: string): string[] => {
  let c = row.split("|").map((x) => x.trim());
  if (c[0] === "") c = c.slice(1);
  if (c.length && c[c.length - 1] === "") c = c.slice(0, -1);
  return c;
};

const MdTable: React.FC<{ rows: string[] }> = ({ rows }) => {
  const header = cells(rows[0]);
  const body = rows.slice(2).map(cells); // row 1 = header, row 2 = |---| separator
  const cols = Math.max(header.length, ...body.map((r) => r.length), 1);
  const grid = `repeat(${cols}, minmax(0, 1fr))`;
  return (
    <Box my="16px" border="1px solid" borderColor="hair" borderRadius="8px" overflow="hidden">
      <Box overflowX="auto">
        <Box minW={`${cols * 92}px`}>
          <Box display="grid" gridTemplateColumns={grid} bg="band" borderBottom="1px solid" borderColor="rule">
            {Array.from({ length: cols }).map((_, i) => (
              <Text key={i} px="10px" py="6px" fontFamily="system-ui" fontSize="11px" fontWeight={700} letterSpacing=".03em" textTransform="uppercase" color="catTx">{header[i] || ""}</Text>
            ))}
          </Box>
          {body.map((r, ri) => (
            <Box key={ri} display="grid" gridTemplateColumns={grid} borderTop={ri === 0 ? undefined : "1px solid"} borderColor="hairSoft">
              {Array.from({ length: cols }).map((_, ci) => (
                <Text key={ci} px="10px" py="6px" fontSize="13.5px" color="fg" lineHeight="1.4" whiteSpace="pre-line">{inline(r[ci] || "")}</Text>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

const isListLine = (l: string) => /^\s*([-*+]|\d+\.)\s+/.test(l);

export const Markdown: React.FC<{ source: string }> = ({ source }) => {
  const lines = source.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lvl = Math.min(4, h[1].length);
      blocks.push(
        <Heading as={`h${lvl}` as "h1"} key={key++} fontFamily="Warnock, serif" fontWeight={700} color="fg" lineHeight="1.2" {...H_PROPS[lvl]}>
          {inline(h[2])}
        </Heading>
      );
      i++;
      continue;
    }

    // horizontal rule
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) { blocks.push(<Box key={key++} h="1px" bg="hair" my="20px" />); i++; continue; }

    // pipe table (header row followed by a |---| separator)
    if (line.includes("|") && i + 1 < lines.length && lines[i + 1].includes("-") && /^[\s|:-]+$/.test(lines[i + 1].trim())) {
      const t: string[] = [];
      while (i < lines.length && lines[i].includes("|")) { t.push(lines[i]); i++; }
      blocks.push(<MdTable key={key++} rows={t} />);
      continue;
    }

    // blockquote
    if (line.trimStart().startsWith(">")) {
      const q: string[] = [];
      while (i < lines.length && lines[i].trim() && lines[i].trimStart().startsWith(">")) { q.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      blocks.push(
        <Box key={key++} borderLeft="3px solid" borderColor="accentBd" pl="14px" my="14px" color="muted">
          <Text fontSize="13px" lineHeight="1.65" fontStyle="italic">{inline(q.join(" "))}</Text>
        </Box>
      );
      continue;
    }

    // list (consecutive list lines)
    if (isListLine(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && isListLine(lines[i])) { items.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, "")); i++; }
      blocks.push(
        <Box as={ordered ? "ol" : "ul"} key={key++} pl="22px" my="12px" sx={{ listStyleType: ordered ? "decimal" : "disc" }}>
          {items.map((it, j) => (
            <Box as="li" key={j} mb="5px" fontSize="13.5px" lineHeight="1.6" color="fg">{inline(it)}</Box>
          ))}
        </Box>
      );
      continue;
    }

    // tight numbered block: consecutive lines each led by a bold roman-numeral/number marker
    // (e.g. "**I.** …", "**2.** …") — rendered as separate rows, no bullet, just the bold marker.
    const isMarkerLine = (l: string) => /^\*\*\s*([IVXLCDM]+|\d+)[.)]\s*\*\*/.test(l.trim());
    if (isMarkerLine(line)) {
      const rows: string[] = [];
      while (i < lines.length && isMarkerLine(lines[i])) { rows.push(lines[i].trim()); i++; }
      blocks.push(
        <Box key={key++} my="12px">
          {rows.map((r, j) => (
            <Text key={j} mb="7px" fontSize="13.5px" lineHeight="1.6" color="fg" textAlign="justify">{inline(r)}</Text>
          ))}
        </Box>
      );
      continue;
    }

    // paragraph (collect consecutive plain lines)
    const para: string[] = [];
    while (
      i < lines.length && lines[i].trim() &&
      !/^#{1,6}\s/.test(lines[i]) && !lines[i].trimStart().startsWith(">") && !isListLine(lines[i]) && !isMarkerLine(lines[i]) && !lines[i].includes("|")
    ) { para.push(lines[i].trim()); i++; }
    if (para.length) {
      blocks.push(<Text key={key++} mb="13px" fontSize="13.5px" lineHeight="1.72" color="fg" textAlign="justify">{inline(para.join(" "))}</Text>);
    } else { i++; }
  }
  return <Box>{blocks}</Box>;
};
