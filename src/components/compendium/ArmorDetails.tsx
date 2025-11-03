import React from 'react';
import {Box, HStack, Text, VStack} from "@chakra-ui/react";
import Details from "@/components/etc/Details";
import {ArmorInfo, ShieldInfo} from "@/data/armor";

export const ArmorTitle = ({armor}:{armor: ArmorInfo}) => {
  return (
    <VStack>
      <Box alignSelf="center">
        <Text fontSize="xl" fontWeight="bold" textTransform="capitalize">{armor.name}</Text>
      </Box>
    </VStack>
  );
};

export const ArmorDetails = ({armor}:{armor: ArmorInfo}) => {
  return (
    <VStack>
      <HStack w="100%">
        <Text w="100%"><strong>SFÉ: </strong> {armor.SFÉ}</Text>
        <Text w="100%"><strong>MGT: </strong> {armor.MGT}</Text>
        <Text w="100%"></Text>
      </HStack>
      <HStack w="100%">
        <Text w="100%"><strong>Súly: </strong>{armor.weight}</Text>
        <Text w="100%"><strong>Ár: </strong>{armor.cost}</Text>
        <Text w="100%"><strong>STP: </strong>{armor.STP}</Text>
      </HStack>
      <Details>{armor.description}</Details>
    </VStack>
  );
};

export const ShieldTitle = ({shield}:{shield: ShieldInfo}) => {
  return (
    <VStack>
      <Box alignSelf="center">
        <Text fontSize="xl" fontWeight="bold" textTransform="capitalize">{shield.name}</Text>
      </Box>
    </VStack>
  );
};

export const ShieldDetails = ({shield}:{shield: ShieldInfo}) => {
  return (
    <VStack>
      <HStack w="100%">
        <Text w="100%"><strong>Időigény: </strong> {shield.attackDuration}</Text>
        <Text w="100%"><strong>Sebzés: </strong> {shield.damage}</Text>
        <Text w="100%"></Text>
      </HStack>
      <HStack w="100%">
        <Text w="100%"><strong>KÉ: </strong>{shield.KÉ ?? '-'}</Text>
        <Text w="100%"><strong>TÉ: </strong>{shield.TÉ ?? '-'}</Text>
        <Text w="100%"><strong>VÉ: </strong>{shield.VÉ ?? '-'}</Text>
      </HStack>
      <HStack w="100%">
        <Text w="100%"><strong>Súly: </strong>{shield.weight}</Text>
        <Text w="100%"><strong>Ár: </strong>{shield.cost}</Text>
        <Text w="100%"><strong>MGT: </strong>{shield.MGT}</Text>
      </HStack>
      <Details>{shield.description}</Details>
    </VStack>
  );
};
