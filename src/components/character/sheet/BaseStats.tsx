import React from 'react';
import {FormLabel, HStack, Text, VStack} from '@chakra-ui/react';
import {useCharacter} from "@/CharacterContext";
import Panel from "@/components/character/sheet/util/Panel";
import {StatValues} from "@/data/character";

export default () => {
  const { character } = useCharacter();

  return (
    <Panel title="Tulajdonságok">
      <VStack spacing={0}>
        {Object.entries(character.stats).map(([statName, statValue], index) => (
          <HStack key={index}>
            <FormLabel width="120px">{statName}</FormLabel>
            <Text width="20px" textAlign="center" verticalAlign="middle">{statValue}</Text>
          </HStack>
        ))}
      </VStack>
    </Panel>
  );
};
