import React from 'react';
import {Box, Text, VStack} from "@chakra-ui/react";
import {PrayerInfo} from "@/magus/prayers";
import Details from "@/components/etc/Details";

export default ({prayer}:{prayer: PrayerInfo}) => {

  return (
    <VStack>
      <Box alignSelf="center">
        <Text fontSize="xl" fontWeight="bold">{prayer.name}</Text>
      </Box>
      <Text w="100%"><strong>Szféra: </strong> {prayer.domains.join(", ")}</Text>
      <Text w="100%"><strong>Kegy pont: </strong> {prayer.cost}</Text>
      <Text w="100%"><strong>Fohász hossza: </strong> {prayer.castingTime}</Text>
      <Text w="100%"><strong>Hatótáv: </strong> {prayer.range}</Text>
      <Text w="100%"><strong>Időtartam: </strong> {prayer.duration}</Text>
      {prayer.save && <Text w="100%"><strong>Mágiaellenállás: </strong> {prayer.save?.join("/")}</Text>}
      {/*<Text w="100%" textAlign="justify">{prayer.description}</Text>*/}
      <Details>{prayer.description}</Details>
    </VStack>
  );
};
