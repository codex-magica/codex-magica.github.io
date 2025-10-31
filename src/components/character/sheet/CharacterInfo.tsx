import React from 'react';
import {FormLabel, HStack, Text, VStack} from '@chakra-ui/react';
import {useCharacter} from "@/CharacterContext";
import Panel from "@/components/character/sheet/util/Panel";

export default () => {
  const { character } = useCharacter();

  return (
    <Panel title="Yhendorn Ularis">
      <VStack w="100%">
        <HStack w="100%">
          <FormLabel width="120px">Faj</FormLabel>
          <Text textAlign="center">{character.race}</Text>
        </HStack>
        <HStack w="100%">
          <FormLabel width="120px">Kaszt</FormLabel>
          <Text textAlign="center">Bárd</Text>
        </HStack>
        <HStack w="100%">
          <FormLabel width="120px">Jellem</FormLabel>
          <Text textAlign="center">Élet,Káosz</Text>
        </HStack>
        <HStack w="100%">
          <FormLabel width="120px">Vallás</FormLabel>
          <Text textAlign="center">Eidhil K'Meakhan</Text>
        </HStack>
        <HStack w="100%">
          <FormLabel width="120px">Szülőföld</FormLabel>
          <Text textAlign="center">Erion</Text>
        </HStack>
      </VStack>
    </Panel>
  );
};
