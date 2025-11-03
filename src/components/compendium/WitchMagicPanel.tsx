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
import {WitchMagicInfo, WitchMagicType, WitchMagicValues} from '@/data/witchMagic';
import {WitchMagicTitle, WitchMagicDetails} from "@/components/compendium/WitchMagicDetails";
import SnappyModal from "@/components/ui/SnappyModal";

export default () => {
  const [selectedItem, setSelectedItem] = useState<WitchMagicInfo | undefined>();

  const isMobile = useBreakpoint() === "base";

  const spellsHeader = (caption: string) => {
    return (
      <Box alignSelf="center" mt={2}>
        <Text fontSize={["md","xl"]}  fontWeight="bold">{caption}</Text>
      </Box>
    );
  }

  const witchMagicTable = (type: WitchMagicType, spellsOverride?: WitchMagicInfo[]) => {

    const spells = spellsOverride ?? WitchMagicValues.filter((spell) => spell.type === type);

    return (
      <Box>
        <Table variant="simple" size="sm" layout={['fixed', 'auto']}>
          <Thead>
            <Tr>
              <Th>Varázslat</Th>
              {/*headers based on the following:*/}
              <Th w="100px" textAlign="center">Mana pont</Th>

              {!["Gyertyamágia", "Viaszbábok Mágiája", "Bájitalok"].includes(type)
                && <Th textAlign="center">Varázslás ideje</Th>}
              {["Gyertyamágia", "Viaszbábok Mágiája"].includes(type)
                && <Th textAlign="center">Készítés ideje</Th>}

              {!["Gyertyamágia", "Bájitalok"].includes(type)
                && <Th textAlign="center">Hatótáv</Th>}

              {!["Gyertyamágia"].includes(type)
                && <Th textAlign="center">Időtartam</Th>}
              {["Gyertyamágia"].includes(type)
                && <Th textAlign="center">Égés időtartam</Th>}

              {!["Alapvető varázslatok", "Misztikus képességek", "Tűzmágia", "Anyagi Mágia", "Térmágia", "Bájitalok"].includes(type) && !isMobile
                && <Th textAlign="center">Mágiaellenállás</Th>}

              {type === "Bájitalok" && <Th textAlign="center">Elkészítési ár</Th>}
              {type === "Bájitalok" && <Th textAlign="center">Eladási ár</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {spells.map((spell, index) => (
              <Tr key={index} bg={isHighlightedRow(index) ? '#E7E7E7' : 'inherit'} cursor="pointer" onClick={() => setSelectedItem(spell)}>
                <Td maxW="200px" textOverflow="ellipsis"><Text textDecoration="none">{spell.name}</Text></Td>
                <Td textAlign="center">{spell.cost}</Td>

                {spell.castingTime && <Td textAlign="center">{spell.castingTime}</Td>}

                {spell.range && spell.type !== "Gyertyamágia" && <Td textAlign="center">{spell.range}</Td>}

                {spell.duration && <Td textAlign="center">{spell.duration}</Td>}

                {!["Alapvető varázslatok", "Misztikus képességek", "Tűzmágia", "Anyagi Mágia", "Térmágia", "Bájitalok"].includes(type) && !isMobile
                  && <Td textAlign="center">{spell.save ?? '-'}</Td>}

                {spell.type === "Bájitalok" && <Td textAlign="center">{spell.ingredientsCost ?? '-'}</Td>}
                {spell.type === "Bájitalok" && <Td textAlign="center">{spell.sellPrice ?? '-'}</Td>}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    );
  }

  return (
    <VStack spacing={4} pb="120px">
      {spellsHeader("Alapvető varázslatok")}
      {witchMagicTable("Alapvető varázslatok")}

      {spellsHeader("Misztikus képességek")}
      {witchMagicTable("Misztikus képességek")}

      {spellsHeader("Tűzmágia")}
      {witchMagicTable("Tűzmágia")}

      {spellsHeader("Anyagi Mágia")}
      {witchMagicTable("Anyagi Mágia")}

      {spellsHeader("Asztrális praktikák")}
      {witchMagicTable("Asztrális praktikák")}

      {spellsHeader("Érzelemkioltó varázslatok")}
      {witchMagicTable("Érzelemkioltó varázslatok")}

      {spellsHeader("Érzelemkeltő varázslatok")}
      {witchMagicTable("Érzelemkeltő varázslatok")}

      {spellsHeader("Átkok")}
      {witchMagicTable("Átkok")}

      {spellsHeader("Jellemtorzító Átkok")}
      {witchMagicTable("Jellemtorzító Átkok")}

      {spellsHeader("Mentális praktikák")}
      {witchMagicTable("Mentális praktikák")}

      {spellsHeader("Lélekvarázs")}
      {witchMagicTable("Lélekvarázs")}

      {spellsHeader("Álommágia")}
      {witchMagicTable("Álommágia")}

      {spellsHeader("Csókmágia")}
      {witchMagicTable("Szexuálmágia", WitchMagicValues.filter((spell) => spell.type === "Szexuálmágia" && spell.range === "Csók"))}

      {spellsHeader("Az ölelés mágiája")}
      {witchMagicTable("Szexuálmágia", WitchMagicValues.filter((spell) => spell.type === "Szexuálmágia" && spell.range !== "Csók"))}

      {spellsHeader("Gyertyamágia")}
      {witchMagicTable("Gyertyamágia")}

      {spellsHeader("Szimpatikus Mágia")}
      {witchMagicTable("Szimpatikus Mágia")}

      {spellsHeader("Viaszbábok Mágiája")}
      {witchMagicTable("Viaszbábok Mágiája")}

      {spellsHeader("Térmágia")}
      {witchMagicTable("Térmágia")}

      {spellsHeader("Familiáris Mágia")}
      {witchMagicTable("Familiáris Mágia")}

      {spellsHeader("Bájitalok")}
      {witchMagicTable("Bájitalok")}
      <SnappyModal
        isOpen={selectedItem !== undefined}
        onClose={() => setSelectedItem(undefined)}
        data={WitchMagicValues}
        selectedItem={selectedItem}
        titleFn={(spell) => <WitchMagicTitle spell={spell}/>}
        bodyFn={(spell) => <WitchMagicDetails spell={spell}/>}
      />
    </VStack>
  );
};
