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
import {WarlockMagicInfo, WarlockMagicType, WarlockMagicValues} from "@/data/warlockMagic";
import SnappyModal from "@/components/ui/SnappyModal";
import {WarlockMagicDetails, WarlockMagicTitle} from "@/components/compendium/WarlockMagicDetails";

export default () => {
  const [selectedItem, setSelectedItem] = useState<WarlockMagicInfo | undefined>();

  const isMobile = useBreakpoint() === "base";

  const spellsHeader = (caption: string) => {
    return (
      <Box alignSelf="center" mt={2}>
        <Text fontSize={["md","xl"]} fontWeight="bold">{caption}</Text>
      </Box>
    );
  }

  const warlockMagicTable = (type: WarlockMagicType) => {
    return (
      <Box>
        <Table variant="simple" size="sm" layout={['fixed', 'auto']}>
          <Thead>
            <Tr>
              <Th>Varázslat</Th>
              <Th textAlign="center">Mana pont</Th>
              <Th textAlign="center">Varázslás ideje</Th>
              <Th textAlign="center">Hatótáv</Th>
              {type === "Átok" && <Th textAlign="center">Lappangás ideje</Th>}
              {type !== "Átok" && <Th textAlign="center">Időtartam</Th>}
              {!isMobile && <Th textAlign="center">Mágiaellenállás</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {WarlockMagicValues.filter((spell) => spell.type === type).map((spell, index) => (
              <Tr key={index} bg={isHighlightedRow(index) ? '#E7E7E7' : 'inherit'} cursor="pointer" onClick={() => setSelectedItem(spell)}>
                <Td maxW="200px" textOverflow="ellipsis"><Text textDecoration="none">{spell.name}</Text></Td>
                <Td textAlign="center">{spell.cost}</Td>
                <Td textAlign="center">{spell.castingTime ?? '-'}</Td>
                <Td textAlign="center">{spell.range ?? '-'}</Td>
                <Td textAlign="center">{(type !== "Átok" ? spell.duration : spell.incubationPeriod) ?? '-'}</Td>
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
      {spellsHeader("Alapvarázslatok")}
      {warlockMagicTable("Alap varázslat")}
      {spellsHeader("Villámmágia")}
      {warlockMagicTable("Villámmágia")}
      {spellsHeader("Anyagmágia")}
      {warlockMagicTable("Anyagmágia")}
      {spellsHeader("Nekromancia")}
      {warlockMagicTable("Nekromancia")}
      {spellsHeader("Necrográfia")}
      {warlockMagicTable("Necrográfia")}
      {spellsHeader("Életerő manipulálás")}
      {warlockMagicTable("Életerő manipulálás")}
      {spellsHeader("Rontások")}
      {warlockMagicTable("Átok")}
      {spellsHeader("Betegségmágia")}
      {warlockMagicTable("Betegségmágia")}
      {spellsHeader("Méregmágia")}
      {warlockMagicTable("Méregmágia")}
      {spellsHeader("Természeti mágia")}
      {warlockMagicTable("Természeti mágia")}
      {spellsHeader("Asztrál- és Mentálmágia")}
      {warlockMagicTable("Asztrál- és Mentálmágia")}
      <SnappyModal
        isOpen={selectedItem !== undefined}
        onClose={() => setSelectedItem(undefined)}
        data={WarlockMagicValues}
        selectedItem={selectedItem}
        titleFn={(spell) => <WarlockMagicTitle spell={spell}/>}
        bodyFn={(spell) => <WarlockMagicDetails spell={spell}/>}
      />
    </VStack>
  );
};
