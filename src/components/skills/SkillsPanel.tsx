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
import {Skill, SkillInfo, SkillType, SkillValues} from "@/magus/skills";
import {isHighlightedRow} from "@/components/etc/utils";
import {StatValues} from "@/magus/character";
import Details from "@/components/etc/Details";

export default () => {

  const modalOuterRef = useRef<HTMLDivElement>(null);
  const [childRefs, setChildRefs] = useState<React.RefObject<HTMLDivElement>[]>(SkillValues.map(() => React.createRef()));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // const [selectedSkillInfo, setSelectedSkillInfo] = React.useState<SkillInfo | undefined>();

  const isMobile = useBreakpoint() === "base";

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setCurrentIndex(index);
  };

  const changeSelectedSkillIndex = useCallback((index: number, delay: boolean) => {
    console.log('changeSelectedSkillIndex', index);
    if(delay){
      setTimeout(() => childRefs[index]?.current?.scrollIntoView({ behavior: 'auto' }), 10);
    } else {
      childRefs[index]?.current?.scrollIntoView({ behavior: 'auto' })
    }
  },[childRefs]);

  const changeSelectedSkill = (skill: SkillInfo, delay: boolean) => {
    changeSelectedSkillIndex(SkillValues.indexOf(skill), delay);
  }


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
              <Tr key={skill.name} bg={isHighlightedRow(index) ? '#E7E7E7' : 'inherit'} cursor="pointer" onClick={() => {setIsModalOpen(true); changeSelectedSkill(skill, true);}}>
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

  const skillTitle = (skillInfo?: SkillInfo) => (
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

  const skillDetails = (skillInfo?: SkillInfo) => (
    <VStack spacing={4}>
      <Details>{skillInfo?.description ?? ""}</Details>
      {skillInfo?.lvl_1 && <Details prefix="1. fok">{skillInfo?.lvl_1}</Details>}
      {skillInfo?.lvl_2 && <Details prefix="2. fok">{skillInfo?.lvl_2}</Details>}
      {skillInfo?.lvl_3 && <Details prefix="3. fok">{skillInfo?.lvl_3}</Details>}
      {skillInfo?.lvl_4 && <Details prefix="4. fok">{skillInfo?.lvl_4}</Details>}
      {skillInfo?.lvl_5 && <Details prefix="5. fok">{skillInfo?.lvl_5}</Details>}
    </VStack>
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.stopPropagation(); // prevents event from reaching window/global listeners
      const direction = e.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = currentIndex + direction;
      if(nextIndex >= 0 && nextIndex < SkillValues.length) {
        changeSelectedSkillIndex(nextIndex, false);
      }
    }
  }, [changeSelectedSkillIndex, currentIndex]);

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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl" scrollBehavior="inside" isCentered>
        <ModalOverlay />
        <ModalContent onKeyDown={handleKeyDown}>
          <ModalHeader>
            {skillTitle(SkillValues[currentIndex])}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflow="hidden" px={0}>
            <Box w="100%" h="100%" display="flex" overflowX="auto" overflowY="hidden" scrollSnapType="x mandatory" position="relative" sx={{'&::-webkit-scrollbar': {display: 'none'}}} onScroll={handleScroll} ref={modalOuterRef}>
              {SkillValues.map((skill, index) => (
                  <Box key={index} flex="0 0 100%" scrollSnapAlign="start" overflowX="hidden" overflowY="auto" maxH="60vh" ref={childRefs[index]}>
                    <Box px={4}>
                      {Math.abs(index - currentIndex) > 3 ? null : skillDetails(skill)}
                    </Box>
                  </Box>
                )
              )}
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
};
