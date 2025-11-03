import React from 'react';
import {Box, HStack, Text, VStack} from "@chakra-ui/react";
import Details from "@/components/etc/Details";
import {WeaponInfo} from "@/data/weapons";

export const WeaponTitle = ({weapon}:{weapon: WeaponInfo}) => {
  return (
    <VStack>
      <Box alignSelf="center">
        <Text fontSize="xl" fontWeight="bold" textTransform="capitalize">{weapon.name}</Text>
      </Box>
    </VStack>
  );
};

export const WeaponDetails = ({weapon}:{weapon: WeaponInfo}) => {
  return (
    <VStack>
      <HStack w="100%">
        <Text w="100%"><strong>Időigény: </strong> {weapon.attackDuration}</Text>
        <Text w="100%"><strong>Sebzés: </strong> {weapon.damage}</Text>
        {weapon.range && <Text w="100%"><strong>Táv: </strong>{weapon.range}</Text>}
        {!weapon.range && <Text w="100%" />}
      </HStack>
      {(weapon.KÉ || weapon.TÉ || weapon.CÉ || weapon.VÉ) && <HStack w="100%">
        <Text w="100%"><strong>KÉ: </strong>{weapon.KÉ ?? '-'}</Text>
        {!weapon.CÉ && <Text w="100%"><strong>TÉ: </strong>{weapon.TÉ ?? '-'}</Text>}
        {weapon.CÉ && <Text w="100%"><strong>CÉ: </strong>{weapon.CÉ ?? '-'}</Text>}
        <Text w="100%"><strong>VÉ: </strong>{weapon.VÉ ?? '-'}</Text>
      </HStack>}
      <HStack w="100%">
        <Text w="100%"><strong>Súly: </strong>{weapon.weight}</Text>
        <Text w="100%"><strong>Ár: </strong>{weapon.cost}</Text>
        {weapon.STP > 0 && <Text w="100%"><strong>STP: </strong>{weapon.STP}</Text>}
        {weapon.STP === 0 && <Text w="100%" />}
      </HStack>
      {weapon.canDisarm && <Text w="100%"><strong>Lefegyverzés: </strong>igen</Text>}
      {weapon.canDestroyWeapons && <Text w="100%"><strong>Fegyvertörés: </strong>igen</Text>}
      {weapon.canPierce && <Text w="100%"><strong>Átütés: </strong>igen</Text>}
      {weapon.isMagical && <Text w="100%"><strong>Mágikus: </strong>igen</Text>}
      <Details>{weapon.description}</Details>
    </VStack>
  );
};
