import React, {useState} from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  VStack,
  Text, Tooltip, useBreakpoint,
} from '@chakra-ui/react';
import {SkillInfo, SkillType, SkillValues} from "@/data/skills";
import {isHighlightedRow} from "@/components/etc/utils";
import {StatValues} from "@/data/character";
import SnappyModal from "@/components/ui/SnappyModal";
import {SkillDetails, SkillTitle} from "@/components/compendium/SkillDetails";

export default () => {
  const [selectedItem, setSelectedItem] = useState<SkillInfo | undefined>();

  const isMobile = useBreakpoint() === "base";


  const skillHeader = (type: SkillType) => {
    return (
      <Box alignSelf="center" mt={2}>
        <Text fontSize={["md","xl"]} fontWeight="bold">{type} képzettségek</Text>
      </Box>
    );
  }

  const skillDifficultyTooltip = {
    "I": "1 3 8 15 25",
    "II": "1 5 10 20 30",
    "III": "2 8 15 30 45",
    "IV": "3 10 20 35 55",
    // "%": "1 -> 3%",
  };

  const skillTable = (type: SkillType) => {
    return (
      <Box>
        <Table variant="simple" size="sm" layout={['fixed', 'auto']}>
          <Thead>
            <Tr>
              <Th>Képzettség</Th>
              <Th w="50px" textAlign="center">Nehéz.</Th>
              <Th textAlign="center">Erős</Th>
              <Th textAlign="center">Gyenge</Th>
              <Th textAlign="center">Tulajdonság</Th>
            </Tr>
          </Thead>
          <Tbody>
            {SkillValues.filter((skill) => skill.skillType === type).map((skill, index) => (
              <Tr key={index} bg={isHighlightedRow(index) ? '#E7E7E7' : 'inherit'} cursor="pointer" onClick={() => setSelectedItem(skill)}>
                <Td textOverflow="ellipsis"><Text textDecoration="none">{skill.name}</Text></Td>
                <Td textAlign="center" w="50px">
                  <Tooltip label={skillDifficultyTooltip[skill.skillDifficulty]} aria-label="A tooltip">
                    <Text>{skill.skillDifficulty}</Text>
                  </Tooltip>
                </Td>
                <Td textAlign="center">{skill.hardReq.length === 0 ? "-" : skill.hardReq.map(s => s).join(', ')}</Td>
                <Td textAlign="center">{skill.softReq.length === 0 ? "-" : skill.softReq.map(s => s).join(', ')}</Td>
                <Td textAlign="center">{skill.stats.length === 0 ? "-" :skill.stats.map(s => isMobile ? StatValues[s].short : s).join(', ')}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    );
  }

  return (
    <VStack spacing={4} pb="120px">
      {skillHeader("Harci")}
      {skillTable("Harci")}

      {skillHeader("Alvilági")}
      {skillTable("Alvilági")}

      {skillHeader("Világi")}
      {skillTable("Világi")}

      {skillHeader("Tudományos")}
      {skillTable("Tudományos")}

      {skillHeader("Szociális")}
      {skillTable("Szociális")}

      {skillHeader("Misztikus")}
      {skillTable("Misztikus")}
      <SnappyModal
        isOpen={selectedItem !== undefined}
        onClose={() => setSelectedItem(undefined)}
        data={SkillValues}
        selectedItem={selectedItem}
        titleFn={(skill) => <SkillTitle skill={skill}/>}
        bodyFn={(skill) => <SkillDetails skill={skill}/>}
      />
    </VStack>
  );
};
