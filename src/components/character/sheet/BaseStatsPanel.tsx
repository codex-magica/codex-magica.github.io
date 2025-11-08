import React from 'react';
import {FormLabel, HStack, Spacer, Text, VStack} from '@chakra-ui/react';
import {useCharacter} from "@/CharacterContext";
import Panel from "@/components/character/sheet/util/Panel";
import {StatValues} from "@/data/character";

export const BaseStatsPanel = () => {
  const { character } = useCharacter();

  return (
    <Panel title="Tulajdonságok">
      <VStack spacing={0}>
        {Object.entries(character.stats).map(([statName, statValue], index) => (
          <HStack key={index} w="100%" px={2}>
            <Text>{statName}</Text>
            <Spacer />
            <Text w="30px" textAlign="center">{statValue}</Text>
          </HStack>
        ))}
      </VStack>
    </Panel>
  );
};
