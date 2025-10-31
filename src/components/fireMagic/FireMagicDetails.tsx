import React from 'react';
import {Box, Text, VStack} from "@chakra-ui/react";
import Details from "@/components/etc/Details";
import {FireMagicInfo} from "@/magus/fireMagic";

export default ({spell}:{spell: FireMagicInfo}) => {
  return (
    <VStack>
      <Box alignSelf="center">
        <Text fontSize="xl" fontWeight="bold">{spell.name}</Text>
      </Box>
      <Text w="100%"><strong>Mana pont: </strong> {spell.cost}</Text>
      <Text w="100%"><strong>Varázslás ideje: </strong> {spell.castingTime}</Text>
      <Text w="100%"><strong>Időtartam: </strong> {spell.duration}</Text>
      {spell.combatModifier && <Text w="100%"><strong>Harci módosító: </strong> {spell.combatModifier}</Text>}
      {spell.size && <Text w="100%"><strong>Méret: </strong> {spell.size}</Text>}
      <Details>{spell.description}</Details>
    </VStack>
  );
};
