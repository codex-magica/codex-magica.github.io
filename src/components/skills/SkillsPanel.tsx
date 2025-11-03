import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  VStack,
  Text, Tooltip, useBreakpoint, Modal, ModalOverlay, ModalContent, ModalCloseButton, ModalBody, ModalHeader, Button,
  HStack,
} from '@chakra-ui/react';
import {SkillInfo, SkillType, SkillValues} from "@/magus/skills";
import {isHighlightedRow} from "@/components/etc/utils";
import {StatValues} from "@/magus/character";
import Details from "@/components/etc/Details";
import SnappyModal from "@/components/ui/SnappyModal";

export default () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSkillInfo, setSelectedSkillInfo] = React.useState<SkillInfo | undefined>();

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
              <Tr key={skill.name} bg={isHighlightedRow(index) ? '#E7E7E7' : 'inherit'} cursor="pointer" onClick={() => {setSelectedSkillInfo(skill);setIsModalOpen(true);}}>
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

  const skillTitle = (skillInfo: SkillInfo) => (
    <VStack>
      <HStack alignSelf="center">
        {/*<Button onClick={() => setSelectedSkillInfo(nextSkillInfo(-1))} isDisabled={!nextSkillInfo(-1)}>{'<'}</Button>*/}
        <Text fontSize="xl" fontWeight="bold">{skillInfo?.name}</Text>
        {/*<Button onClick={() => setSelectedSkillInfo(nextSkillInfo(1))} isDisabled={!nextSkillInfo(1)}>{'>'}</Button>*/}
      </HStack>
      <Box alignSelf="center">
        <Text fontSize="md" fontWeight="bold" textOverflow="ellipsis" whiteSpace="nowrap">{'(' + skillInfo?.skillDifficulty + ' - ' + skillInfo?.stats?.join(', ') + ')'}</Text>
      </Box>
    </VStack>
  );

  const skillDetails = (skillInfo: SkillInfo) => (
    <VStack spacing={4}>
      <Details>{skillInfo.description ?? ""}</Details>
      {skillInfo.lvl_1 && <Details prefix="1. fok">{skillInfo.lvl_1}</Details>}
      {skillInfo.lvl_2 && <Details prefix="2. fok">{skillInfo.lvl_2}</Details>}
      {skillInfo.lvl_3 && <Details prefix="3. fok">{skillInfo.lvl_3}</Details>}
      {skillInfo.lvl_4 && <Details prefix="4. fok">{skillInfo.lvl_4}</Details>}
      {skillInfo.lvl_5 && <Details prefix="5. fok">{skillInfo.lvl_5}</Details>}
    </VStack>
  );

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
      <SnappyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={SkillValues} selectedItem={selectedSkillInfo} titleFn={skillTitle} bodyFn={skillDetails} />
    </VStack>
  );
};
