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
import {FireMagicInfo, FireMagicType, FireMagicValues} from "@/data/fireMagic";
import FireMagicDetails from "@/components/compendium/FireMagicDetails";

export default () => {
  const isMobile = useBreakpoint() === "base";

  const spellsHeader = (caption: string) => {
    return (
      <Box alignSelf="center" mt={2}>
        <Text fontSize={["md","xl"]} fontWeight="bold">{caption}</Text>
      </Box>
    );
  }

  const spellModal = (spell: FireMagicInfo) => {
    return (
      <Modal isOpen={false}  onClose={()=>{}} size="xl" scrollBehavior="inside" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody>
            <FireMagicDetails spell={spell} />
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  const spellModalLink = (spell: FireMagicInfo) => {
    return (
      <Triggerable trigger={<Text cursor="pointer" textDecoration="none">{spell.name}</Text>}>
        {spellModal(spell)}
      </Triggerable>
    );
  }
  const fireMagicTable = (type: FireMagicType) => {
    return (
      <Box>
        <Table variant="simple" size="sm" layout={['fixed', 'auto']}>
          <Thead>
            <Tr>
              <Th>Varázslat</Th>
              <Th textAlign="center">Mana pont</Th>
              <Th textAlign="center">Varázslás ideje</Th>
              <Th textAlign="center">Időtartam</Th>
              {type === "Tűzlények idézése" && <Th textAlign="center">Harci módosító</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {FireMagicValues.filter((spell) => spell.type === type).map((spell, index) => (
              <Triggerable trigger={
                <Tr key={spell.name} bg={isHighlightedRow(index) ? '#E7E7E7' : 'inherit'} cursor="pointer">
                  <Td maxW="200px" textOverflow="ellipsis"><Text textDecoration="none">{spell.name}</Text></Td>
                  <Td textAlign="center">{spell.cost}</Td>
                  <Td textAlign="center">{spell.castingTime}</Td>
                  <Td textAlign="center">{spell.duration}</Td>
                  {type === "Tűzlények idézése" && <Td textAlign="center">{spell.combatModifier}</Td>}
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
      {spellsHeader("Alapvető tűzmágiák")}
      {fireMagicTable("Alapvető tűzmágiák")}
      {spellsHeader("Védőmágiák")}
      {fireMagicTable("Védőmágiák")}
      {spellsHeader("Iskolaformák")}
      {fireMagicTable("Iskolaformák")}
      {spellsHeader("Szabad elemi formák")}
      {fireMagicTable("Szabad elemi formák")}
      {spellsHeader("Tűzmágia magasiskolája")}
      {fireMagicTable("Tűzmágia magasiskolája")}
      {spellsHeader("Közönséges tüzek befolyásolása")}
      {fireMagicTable("Közönséges tüzek befolyásolása")}
      {spellsHeader("Őstüzek befolyásolása")}
      {fireMagicTable("Őstüzek befolyásolása")}
      {spellsHeader("Tűzlények megidézése")}
      {fireMagicTable("Tűzlények idézése")}
    </VStack>
  );
};
