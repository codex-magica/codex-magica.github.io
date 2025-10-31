import React from 'react';
import {FormLabel, HStack, Text, VStack} from '@chakra-ui/react';
import {useCharacter} from "@/CharacterContext";
import Panel from "@/components/character/sheet/util/Panel";

export default () => {
  const { character } = useCharacter();

  return (
    <Panel title="Derived Stats">
      <VStack spacing={0}>
        {Object.entries(character.derivedStats).map(([statName, statValue]) => (
          <HStack key={statName}>
            <FormLabel width="120px">{statName}</FormLabel>
            <Text width="20px" textAlign="center" verticalAlign="middle">{statValue.calc(character)}</Text>
          </HStack>
        ))}
      </VStack>
    </Panel>
  );
};
