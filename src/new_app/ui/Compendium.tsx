import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { ParchPanel } from "./ParchPanel";
import { compNames, schools, compNote, weapons } from "./sampleData";
import { WeaponModalState } from "./WeaponModal";
import { SKILLS } from "../model/skills";
import { SkillCategory } from "../model/common";

// The real skill catalog, grouped by category for the compendium table.
const CATS: SkillCategory[] = ["Harci", "Alvilági", "Világi", "Tudományos", "Szociális", "Misztikus"];
const skillGroups = CATS.map((cat) => ({
  group: cat,
  rows: SKILLS.filter((s) => s.category === cat)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "hu"))
    .map((s) => ({
      name: s.name,
      diff: s.difficulty,
      strong: s.hardReq.map((r) => r.skill).join(", ") || "–",
      weak: s.softReq.map((r) => r.skill).join(", ") || "–",
      attr: s.attrs.join(", ") || "–",
    })),
})).filter((g) => g.rows.length > 0);

interface Props {
  compTab: number;
  onOpenSkill: (name: string, sub: string) => void;
  onOpenSpell: (name: string, school: string, time: string) => void;
  onOpenWeapon: (w: WeaponModalState) => void;
}

const GRID = "minmax(0,2.1fr) 50px minmax(0,1.4fr) minmax(0,1.3fr) minmax(0,2.2fr)";
const PAD = { base: "20px", md: "16px" };

const Th: React.FC<{ children: React.ReactNode; align?: string }> = ({ children, align }) => (
  <Box as="span" fontFamily="system-ui" fontSize="10.5px" fontWeight={700} letterSpacing=".08em" textTransform="uppercase" color="fgFaint" textAlign={align as any}>
    {children}
  </Box>
);
const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box fontFamily="system-ui" fontSize="11px" fontWeight={700} letterSpacing=".1em" textTransform="uppercase" color="fgFaint" px={PAD} pt="12px" pb="3px">
    {children}
  </Box>
);

export const Compendium: React.FC<Props> = ({ compTab, onOpenSkill, onOpenSpell, onOpenWeapon }) => {
  const title = compNames[compTab];
  const isSkills = compTab === 0;
  const isSpells = compTab === 1;
  const isWeapons = compTab === 7; // Fegyverek

  return (
    <Box flex="1 1 auto" minH={0} overflowY="auto" bg="page">
      <Box maxW="760px" mx="auto" px={{ base: "20px", md: "16px" }} pt={{ base: "26px", md: "24px" }} pb="90px">
        <Heading as="h2" fontSize={{ base: "24px", md: "21px" }} fontWeight={700} color="fg" textAlign="center" mb="4px">{title}</Heading>
        <Text fontFamily="system-ui" fontSize="12.5px" color="fgFaint" textAlign="center" mb="20px">
          Kompendium · szabálykönyvi referencia — válassz egy elemet a részletekért
        </Text>

        {isSkills && (
          <Box display="flex" flexDirection="column" gap="22px">
            {skillGroups.map((g) => (
              <Box key={g.group}>
                <Heading as="h3" textAlign="center" fontSize={{ base: "19px", md: "17px" }} fontWeight={700} color="fg" mb="9px">{g.group}</Heading>
                <ParchPanel p={0} overflow="hidden">
                  <Box display="grid" gridTemplateColumns={GRID} alignItems="center" gap="10px" px={PAD} py="11px" borderBottom="1px solid" borderColor="rule">
                    <Th>Képzettség</Th>
                    <Th align="center">Nehéz.</Th>
                    <Th>Erős</Th>
                    <Th>Gyenge</Th>
                    <Th align="right">Tulajdonság</Th>
                  </Box>
                  {g.rows.map((r, i) => (
                  <Box
                    as="button"
                    type="button"
                    key={r.name}
                    onClick={() => onOpenSkill(r.name, `(${r.diff} – ${r.attr})`)}
                    display="grid"
                    gridTemplateColumns={GRID}
                    alignItems="center"
                    gap="10px"
                    w="100%"
                    textAlign="left"
                    px={PAD}
                    py="8px"
                    borderTop={i === 0 ? undefined : "1px solid"}
                    borderColor="hairSoft"
                    _hover={{ bg: "accentSoft" }}
                  >
                    <Text fontSize={{ base: "17px", md: "15.5px" }} fontWeight={600} color="fg">{r.name}</Text>
                    <Text textAlign="center" color="muted" fontSize={{ base: "16px", md: "14.5px" }} sx={{ fontVariantNumeric: "tabular-nums" }}>{r.diff}</Text>
                    <Text color="muted" fontSize="14px">{r.strong}</Text>
                    <Text color="muted" fontSize="14px">{r.weak}</Text>
                    <Text textAlign="right" color="accentTx" fontSize="14px">{r.attr}</Text>
                    </Box>
                  ))}
                </ParchPanel>
              </Box>
            ))}
          </Box>
        )}

        {isSpells && (
          <ParchPanel p={0} overflow="hidden">
            {schools.map((sc) => (
              <Box key={sc.name}>
                <GroupLabel>{sc.name}</GroupLabel>
                {sc.spells.map((sp) => (
                  <Box
                    as="button"
                    type="button"
                    key={sp.name}
                    onClick={() => onOpenSpell(sp.name, sc.name, sp.time)}
                    display="flex"
                    alignItems="baseline"
                    justifyContent="space-between"
                    gap="14px"
                    w="100%"
                    textAlign="left"
                    px={PAD}
                    py="9px"
                    borderTop="1px solid"
                    borderColor="hairSoft"
                    _hover={{ bg: "accentSoft" }}
                  >
                    <Text fontSize={{ base: "17px", md: "15.5px" }} fontWeight={600} color="fg">{sp.name}</Text>
                    <Text fontFamily="system-ui" fontSize="12px" color="muted" whiteSpace="nowrap">{sp.mana} Mp · {sp.time}</Text>
                  </Box>
                ))}
              </Box>
            ))}
          </ParchPanel>
        )}

        {isWeapons && (
          <Box display="flex" flexDirection="column" gap="22px">
            {[
              { title: "Közelharci fegyverek", list: weapons.filter((w) => w.kind === "melee") },
              { title: "Távolsági fegyverek", list: weapons.filter((w) => w.kind === "ranged") },
            ].map((grp) => (
              <Box key={grp.title}>
                <Heading as="h3" textAlign="center" fontSize={{ base: "19px", md: "17px" }} fontWeight={700} color="fg" mb="9px">{grp.title}</Heading>
                <ParchPanel p={0} overflow="hidden">
                  {grp.list.map((w, i) => (
                    <Box
                      as="button"
                      type="button"
                      key={w.name}
                      onClick={() =>
                        onOpenWeapon(
                          w.kind === "melee"
                            ? { kind: "melee", name: w.name, dmg: w.dmg, baseKE: w.ke, baseTE: w.te, baseVE: w.ve }
                            : { kind: "ranged", name: w.name, dmg: w.dmg, baseCE: w.ce, range: w.range }
                        )
                      }
                      display="flex"
                      alignItems="baseline"
                      justifyContent="space-between"
                      gap="14px"
                      w="100%"
                      textAlign="left"
                      px={PAD}
                      py="9px"
                      borderTop={i === 0 ? undefined : "1px solid"}
                      borderColor="hairSoft"
                      _hover={{ bg: "accentSoft" }}
                    >
                      <Box minW={0}>
                        <Text fontSize={{ base: "17px", md: "15.5px" }} fontWeight={600} color="fg">{w.name}</Text>
                        <Text fontFamily="system-ui" fontSize="11.5px" color="fgFaint">{w.cat}</Text>
                      </Box>
                      <Text fontFamily="system-ui" fontSize="12px" color="muted" whiteSpace="nowrap" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {w.dmg}{w.range ? ` · ${w.range}` : ""}
                      </Text>
                    </Box>
                  ))}
                </ParchPanel>
              </Box>
            ))}
          </Box>
        )}

        {!isSkills && !isSpells && !isWeapons && (
          <ParchPanel p={{ base: "32px", md: "32px" }} textAlign="center">
            <Text fontFamily="system-ui" fontSize="13.5px" lineHeight="1.6" color="muted">{compNote(title)}</Text>
          </ParchPanel>
        )}
      </Box>
    </Box>
  );
};
