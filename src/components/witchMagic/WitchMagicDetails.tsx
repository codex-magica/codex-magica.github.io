import React from 'react';
import {Box, Text, VStack} from "@chakra-ui/react";
import Details from "@/components/etc/Details";
import {WitchMagicInfo} from "@/magus/witchMagic";

export default ({spell}:{spell: WitchMagicInfo}) => {
  return (
    <VStack>
      <Box alignSelf="center">
        <Text fontSize="xl" fontWeight="bold">{spell.name}</Text>
      </Box>
      <Text w="100%"><strong>Mana pont: </strong> {spell.cost}</Text>

      {spell.castingTime && !["Gyertyamágia", "Viaszbábok Mágiája"].includes(spell.type)
        && <Text w="100%"><strong>Varázslás ideje: </strong> {spell.castingTime}</Text>}
      {spell.castingTime && ["Gyertyamágia", "Viaszbábok Mágiája"].includes(spell.type)
        && <Text w="100%"><strong>Készítés ideje: </strong> {spell.castingTime}</Text>}

      {spell.range && <Text w="100%"><strong>Hatótáv: </strong> {spell.range}</Text>}

      {spell.duration && !["Gyertyamágia"].includes(spell.type)
        && <Text w="100%"><strong>Időtartam: </strong> {spell.duration}</Text>}
      {spell.duration && ["Gyertyamágia"].includes(spell.type)
        && <Text w="100%"><strong>Égés időtartam: </strong> {spell.duration}</Text>}

      {spell.save && <Text w="100%"><strong>Mágiaellenállás: </strong> {spell.save}</Text>}
      {spell.ingredientsCost && <Text w="100%"><strong>Elkészítési ár: </strong> {spell.ingredientsCost}</Text>}
      {spell.sellPrice && <Text w="100%"><strong>Eladási ár: </strong> {spell.sellPrice}</Text>}

      <Details>{spell.description}</Details>
    </VStack>
  );
};
