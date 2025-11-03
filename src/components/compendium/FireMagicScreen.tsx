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
import {FireMagicInfo, FireMagicType, FireMagicValues} from "@/data/fireMagic";
import SnappyModal from "@/components/ui/SnappyModal";
import {FireMagicDetails, FireMagicTitle} from "@/components/compendium/FireMagicDetails";

export const FireMagicScreen = () => {
  const [selectedItem, setSelectedItem] = useState<FireMagicInfo | undefined>();

  const isMobile = useBreakpoint() === "base";

  const spellsHeader = (caption: string) => {
    return (
      <Box alignSelf="center" mt={2}>
        <Text fontSize={["md","xl"]} fontWeight="bold">{caption}</Text>
      </Box>
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
              <Tr key={index} bg={isHighlightedRow(index) ? '#E7E7E7' : 'inherit'} cursor="pointer" onClick={() => setSelectedItem(spell)}>
                <Td maxW="200px" textOverflow="ellipsis"><Text textDecoration="none">{spell.name}</Text></Td>
                <Td textAlign="center">{spell.cost}</Td>
                <Td textAlign="center">{spell.castingTime}</Td>
                <Td textAlign="center">{spell.duration}</Td>
                {type === "Tűzlények idézése" && <Td textAlign="center">{spell.combatModifier}</Td>}
              </Tr>
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
      <SnappyModal
        isOpen={selectedItem !== undefined}
        onClose={() => setSelectedItem(undefined)}
        data={FireMagicValues}
        selectedItem={selectedItem}
        titleFn={(spell) => <FireMagicTitle spell={spell}/>}
        bodyFn={(spell) => <FireMagicDetails spell={spell}/>}
      />
    </VStack>
  );
};
