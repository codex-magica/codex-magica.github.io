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
import {BardMagicInfo, BardMagicType, BardMagicValues} from "@/data/bardMagic";
import SnappyModal from "@/components/ui/SnappyModal";
import {BardMagicDetails, BardMagicTitle} from "@/components/compendium/BardMagicDetails";

export default () => {
  const [selectedItem, setSelectedItem] = useState<BardMagicInfo | undefined>();

  const isMobile = useBreakpoint() === "base";

  const spellsHeader = (caption: string) => {
    return (
      <Box alignSelf="center" mt={2}>
        <Text fontSize={["md","xl"]} fontWeight="bold">{caption}</Text>
      </Box>
    );
  }

  const bardMagicTable = (type: BardMagicType) => {
    return (
      <Box>
        <Table variant="simple" size="sm" layout={['fixed', 'auto']}>
          <Thead>
            <Tr>
              <Th>Varázslat</Th>
              <Th textAlign="center">Mana-pont</Th>
              <Th textAlign="center">Varázslás ideje</Th>
              {!(type === "Dalmágia" && isMobile) && <Th textAlign="center">Hatótáv</Th>}
              <Th textAlign="center">Időtartam</Th>
              {type === "Dalmágia" && !isMobile && <Th textAlign="center">Mágiaellenállás</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {BardMagicValues.filter((spell) => spell.type === type).map((spell, index) => (
              <Tr key={spell.name} bg={isHighlightedRow(index) ? '#E7E7E7' : 'inherit'} cursor="pointer" onClick={() => setSelectedItem(spell)}>
                <Td maxW="200px" textOverflow="ellipsis"><Text textDecoration="none">{spell.name}</Text></Td>
                <Td textAlign="center">{spell.cost}</Td>
                <Td textAlign="center">{spell.castingTime}</Td>
                {!(type === "Dalmágia" && isMobile) && <Td textAlign="center">{spell.range}</Td>}
                <Td textAlign="center">{spell.duration}</Td>
                {type === "Dalmágia" && !isMobile && <Td textAlign="center">{spell.save?.join("/") ?? '-'}</Td>}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    );
  }


  return (
    <VStack spacing={4} pb="120px">
      {spellsHeader("Dalmágia")}
      {bardMagicTable("Dalmágia")}
      {spellsHeader("Hangmágia")}
      {bardMagicTable("Hangmágia")}
      {spellsHeader("Fénymágia")}
      {bardMagicTable("Fénymágia")}
      {spellsHeader("Egyéb bárdmágiák")}
      {bardMagicTable("Egyéb bárdmágia")}
      <SnappyModal
        isOpen={selectedItem !== undefined}
        onClose={() => setSelectedItem(undefined)}
        data={BardMagicValues}
        selectedItem={selectedItem}
        titleFn={(spell) => <BardMagicTitle spell={spell}/>}
        bodyFn={(spell) => <BardMagicDetails spell={spell}/>}
      />
    </VStack>
  );
};
