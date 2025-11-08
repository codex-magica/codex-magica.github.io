import React from 'react';
import {FormLabel, HStack, Spacer, Text, VStack} from '@chakra-ui/react';
import {useCharacter} from "@/CharacterContext";
import Panel from "@/components/character/sheet/util/Panel";

export const DerivedStatsPanel = () => {
  const { character } = useCharacter();

  return (
    <Panel title="Derived Stats">
      <VStack spacing={0}>
        {Object.entries(character.derivedStats).map(([statName, statValue], index) => (
          <HStack w="100%" key={index} px={2}>
            <Text>{statName}</Text>
            <Spacer />
            <Text textAlign="center">{statValue.calc(character)}</Text>
          </HStack>
        ))}
      </VStack>
    </Panel>
  );
};
