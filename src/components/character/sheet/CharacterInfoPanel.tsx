import React from 'react';
import {FormLabel, HStack, Spacer, Text, VStack} from '@chakra-ui/react';
import {useCharacter} from "@/CharacterContext";
import Panel from "@/components/character/sheet/util/Panel";

export const CharacterInfoPanel = () => {
  const { character } = useCharacter();

  return (
    <Panel title="Yhendorn Ularis">
      <VStack w="100%">
        <HStack w="100%">
          <Text>Faj</Text>
          <Spacer />
          <Text w="140px">{character.race}</Text>
        </HStack>
        <HStack w="100%">
          <Text>Kaszt</Text>
          <Spacer />
          <Text w="140px">Bárd</Text>
        </HStack>
        <HStack w="100%">
          <Text>Jellem</Text>
          <Spacer />
          <Text w="140px">Élet,Káosz</Text>
        </HStack>
        <HStack w="100%">
          <Text>Vallás</Text>
          <Spacer />
          <Text w="140px">Eidhil K'Meakhan</Text>
        </HStack>
        <HStack w="100%">
          <Text>Szülőföld</Text>
          <Spacer />
          <Text w="140px">Erion</Text>
        </HStack>
      </VStack>
    </Panel>
  );
};
