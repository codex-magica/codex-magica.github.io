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
  Text, useBreakpoint,
} from '@chakra-ui/react';
import {isHighlightedRow} from "@/components/etc/utils";
import {PsiInfo, PsiType, PsiValues} from "@/data/psi";
import SnappyModal from "@/components/ui/SnappyModal";
import {PsiDetails, PsiTitle} from "@/components/compendium/PsiDetails";


export default () => {
  const [selectedItem, setSelectedItem] = useState<PsiInfo | undefined>();

  const isMobile = useBreakpoint() === "base";

  const psiHeader = (caption: string) => {
    return (
      <Box alignSelf="center" mt={2}>
        <Text fontSize={["md","xl"]} fontWeight="bold">{caption}</Text>
      </Box>
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
              <Tr key={spell.name} bg={isHighlightedRow(index) ? '#E7E7E7' : 'inherit'} cursor="pointer" onClick={() => setSelectedItem(spell)}>
                <Td maxW="200px" textOverflow="ellipsis"><Text textDecoration="none">{spell.name}</Text></Td>
                {!isMobile && <Td textAlign="center">{spell.level}</Td>}
                {!isMobile && <Td textAlign="center">{spell.domain}</Td>}
                <Td textAlign="center">{spell.cost}</Td>
                <Td textAlign="center">{spell.castingTime}</Td>
                <Td textAlign="center">{spell.duration}</Td>
                {!isMobile && <Td textAlign="center">{spell.save ?? '-'}</Td>}
              </Tr>
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
      <SnappyModal
        isOpen={selectedItem !== undefined}
        onClose={() => setSelectedItem(undefined)}
        data={PsiValues}
        selectedItem={selectedItem}
        titleFn={(spell) => <PsiTitle spell={spell}/>}
        bodyFn={(spell) => <PsiDetails spell={spell}/>}
      />
    </VStack>
  );
};
