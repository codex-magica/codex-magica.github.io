import React from 'react';
import {Box, Text, VStack} from "@chakra-ui/react";
import {PrayerInfo} from "@/data/prayers";
import Details from "@/components/etc/Details";

export const PrayerTitle = ({spell}:{spell: PrayerInfo}) => {
  return (
    <VStack>
      <Box alignSelf="center">
        <Text fontSize="xl" fontWeight="bold">{spell.name}</Text>
      </Box>
    </VStack>
  );
};

export const PrayerDetails = ({spell}:{spell: PrayerInfo}) => {
  return (
    <VStack>
      <Text w="100%"><strong>Szféra: </strong> {spell.domains.join(", ")}</Text>
      <Text w="100%"><strong>Kegy pont: </strong> {spell.cost}</Text>
      <Text w="100%"><strong>Fohász hossza: </strong> {spell.castingTime}</Text>
      <Text w="100%"><strong>Hatótáv: </strong> {spell.range}</Text>
      <Text w="100%"><strong>Időtartam: </strong> {spell.duration}</Text>
      {spell.save && <Text w="100%"><strong>Mágiaellenállás: </strong> {spell.save?.join("/")}</Text>}
      {/*<Text w="100%" textAlign="justify">{prayer.description}</Text>*/}
      <Details>{spell.description}</Details>
    </VStack>
  );
};
