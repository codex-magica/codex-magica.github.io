import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { ParchPanel } from "./ParchPanel";
import { ModalState } from "./DetailModal";
import { compNames } from "./sampleData";
import { tabBlocks, TableBlock, TableRow, skillModalBody } from "./compendiumData";
import { SKILLS } from "../model/skills";
import { SkillCategory } from "../model/common";

interface Props {
  compTab: number;
  onOpenModal: (m: ModalState) => void;
}

const PAD = { base: "18px", md: "16px" };
const SKILL_GRID = "minmax(0,2.1fr) 50px minmax(0,1.4fr) minmax(0,1.3fr) minmax(0,2.2fr)";

const Th: React.FC<{ children: React.ReactNode; align?: string }> = ({ children, align }) => (
  <Box as="span" fontFamily="system-ui" fontSize="10.5px" fontWeight={700} letterSpacing=".06em" textTransform="uppercase" color="fgFaint" textAlign={align as any}>{children}</Box>
);
const GroupHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading as="h3" textAlign="center" fontSize={{ base: "19px", md: "17px" }} fontWeight={700} color="fg" mb="9px">{children}</Heading>
);

// skill catalog from the new model (book-original)
const CATS: SkillCategory[] = ["Harci", "Alvilági", "Világi", "Tudományos", "Szociális", "Misztikus"];
const skillGroups = CATS.map((cat) => ({
  group: cat,
  rows: SKILLS.filter((s) => s.category === cat).slice().sort((a, b) => a.name.localeCompare(b.name, "hu"))
    .map((s) => ({ name: s.name, diff: s.difficulty, strong: s.hardReq.map((r) => r.skill).join(", ") || "–", weak: s.softReq.map((r) => r.skill).join(", ") || "–", attr: s.attrs.join(", ") || "–" })),
})).filter((g) => g.rows.length > 0);

export const Compendium: React.FC<Props> = ({ compTab, onOpenModal }) => {
  const title = compNames[compTab];
  const isSkills = compTab === 0;
  const blocks: TableBlock[] = isSkills ? [] : tabBlocks(compTab);

  const openRow = (r: TableRow) => onOpenModal({ kind: "spell", name: r.name, sub: r.modalSub, body: r.body || [] });

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

    return (
      <Box key={block.title}>
        <GroupHead>{block.title}</GroupHead>
        <ParchPanel p={0} overflow="hidden">
          {dense ? inner : <Box overflowX="auto">{inner}</Box>}
        </ParchPanel>
      </Box>
    );
  };

  return (
    <Box flex="1 1 auto" minH={0} overflowY="auto" bg="page">
      <Box maxW={{ base: "100%", md: "1040px" }} mx="auto" px={{ base: "16px", md: "20px" }} pt={{ base: "26px", md: "24px" }} pb="90px">
        <Heading as="h2" fontSize={{ base: "24px", md: "21px" }} fontWeight={700} color="fg" textAlign="center" mb="4px">{title}</Heading>
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
      </Box>
    </Box>
  );
};
