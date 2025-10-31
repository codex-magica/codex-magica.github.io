import React from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  VStack,
  Text, Modal, ModalOverlay, ModalContent, ModalCloseButton, ModalBody, useBreakpoint,
} from '@chakra-ui/react';
import {isHighlightedRow} from "@/components/etc/utils";
import Triggerable from "@/components/etc/Triggerable";
import {PsiInfo, PsiType, PsiValues} from "@/magus/psi";
import PsiDetails from "@/components/psi/PsiDetails";


export default () => {
  const isMobile = useBreakpoint() === "base";

  const psiHeader = (caption: string) => {
    return (
      <Box alignSelf="center" mt={2}>
        <Text fontSize={["md","xl"]} fontWeight="bold">{caption}</Text>
      </Box>
    );
  }

  const spellModal = (spell: PsiInfo) => {
    return (
      <Modal isOpen={false}  onClose={()=>{}} size="xl" scrollBehavior="inside" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody>
            <PsiDetails spell={spell} />
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  const psiTable = (type: PsiType) => {
    return (
      <Box>
        <Table variant="simple" size="sm" layout={['fixed', 'auto']}>
          <Thead>
            <Tr>
              <Th>Diszciplína</Th>
              {!isMobile && <Th textAlign="center">Szint</Th>}
              {!isMobile && <Th textAlign="center">Típus</Th>}
              <Th textAlign="center">Pszi pont</Th>
              <Th textAlign="center">A meditáció ideje</Th>
              <Th textAlign="center">Időtartam</Th>
              {!isMobile && <Th textAlign="center">Mágiaellenállás</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {PsiValues.filter((spell) => spell.type === type).map((spell, index) => (
              <Triggerable trigger={
                <Tr key={spell.name} bg={isHighlightedRow(index) ? '#E7E7E7' : 'inherit'} cursor="pointer">
                  <Td maxW="200px" textOverflow="ellipsis"><Text textDecoration="none">{spell.name}</Text></Td>
                  {!isMobile && <Td textAlign="center">{spell.level}</Td>}
                  {!isMobile && <Td textAlign="center">{spell.domain}</Td>}
                  <Td textAlign="center">{spell.cost}</Td>
                  <Td textAlign="center">{spell.castingTime}</Td>
                  <Td textAlign="center">{spell.duration}</Td>
                  {!isMobile && <Td textAlign="center">{spell.save ?? '-'}</Td>}
                </Tr>
              }>
                {spellModal(spell)}
              </Triggerable>
            ))}
          </Tbody>
        </Table>
      </Box>
    );
  }

  return (
    <VStack spacing={4} pb="120px">
      {psiHeader("Pyarroni módszer")}
      {psiTable("Pyarroni módszer")}
      {psiHeader("Kyr Metódus")}
      {psiTable("Kyr Metódus")}
      {psiHeader("Godoni örökség")}
      {psiTable("Godoni örökség")}
      {psiHeader("Slan útja")}
      {psiTable("Slan útja")}
    </VStack>
  );
};
