import React from 'react';
import {Box, Text, VStack} from "@chakra-ui/react";
import Details from "@/components/etc/Details";
import {BardMagicInfo} from "@/magus/bardMagic";

export default ({spell}:{spell: BardMagicInfo}) => {
  return (
    <VStack>
      <Box alignSelf="center">
        <Text fontSize="xl" fontWeight="bold">{spell.name}</Text>
      </Box>
      <Text w="100%"><strong>Mana pont: </strong> {spell.cost}</Text>
      <Text w="100%"><strong>Varázslás ideje: </strong> {spell.castingTime}</Text>
      <Text w="100%"><strong>Hatótáv: </strong> {spell.range}</Text>
      <Text w="100%"><strong>Időtartam: </strong> {spell.duration}</Text>
      {spell.save && <Text w="100%"><strong>Mágiaellenállás: </strong> {spell.save?.join("/")}</Text>}
      <Details>{spell.description}</Details>
    </VStack>
  );
};
