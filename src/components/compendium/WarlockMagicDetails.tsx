import React from 'react';
import {Box, Text, VStack} from "@chakra-ui/react";
import Details from "@/components/etc/Details";
import {WarlockMagicInfo} from "@/data/warlockMagic";

export default ({spell}:{spell: WarlockMagicInfo}) => {
  return (
    <VStack>
      <Box alignSelf="center">
        <Text fontSize="xl" fontWeight="bold">{spell.name}</Text>
      </Box>
      <Text w="100%"><strong>Mana pont: </strong> {spell.cost}</Text>
      {spell.castingTime && <Text w="100%"><strong>Varázslás ideje: </strong> {spell.castingTime}</Text>}
      {spell.range && <Text w="100%"><strong>Hatótáv: </strong> {spell.range}</Text>}
      {spell.duration && <Text w="100%"><strong>Időtartam: </strong> {spell.duration}</Text>}
      {spell.incubationPeriod && <Text w="100%"><strong>Lappangás ideje: </strong> {spell.incubationPeriod}</Text>}
      {spell.save && <Text w="100%"><strong>Mágiaellenállás: </strong> {spell.save}</Text>}
      <Details>{spell.description}</Details>
    </VStack>
  );
};
