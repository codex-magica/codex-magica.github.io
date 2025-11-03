import React from 'react';
import {Box, Text, VStack} from "@chakra-ui/react";
import Details from "@/components/etc/Details";
import {PsiInfo} from "@/data/psi";

export default ({spell}:{spell: PsiInfo}) => {
  return (
    <VStack>
      <Box alignSelf="center">
        <Text fontSize="xl" fontWeight="bold">{spell.name}</Text>
      </Box>
      <Text w="100%"><strong>Típus: </strong> {spell.domain}</Text>
      <Text w="100%"><strong>Szint: </strong> {spell.level}</Text>
      <Text w="100%"><strong>Pszi pont: </strong> {spell.cost}</Text>
      <Text w="100%"><strong>A meditáció ideje: </strong> {spell.castingTime}</Text>
      <Text w="100%"><strong>Időtartam: </strong> {spell.duration}</Text>
      {spell.save && <Text w="100%"><strong>Mágiaellenállás: </strong> {spell.save}</Text>}
      <Details>{spell.description}</Details>
    </VStack>
  );
};
