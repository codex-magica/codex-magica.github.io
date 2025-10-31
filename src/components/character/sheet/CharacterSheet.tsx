import React from 'react';
import {Box, FormLabel, HStack, SimpleGrid, Text, VStack} from '@chakra-ui/react';
import {useCharacter} from "@/CharacterContext";
import DerivedStats from "@/components/character/sheet/DerivedStats";
import Skills from "@/components/character/sheet/Skills";
import BaseStats from "@/components/character/sheet/BaseStats";
import CharacterInfo from "@/components/character/sheet/CharacterInfo";
import CombatValues from "@/components/character/sheet/CombatValues";
import BardSpells from "@/components/character/sheet/BardSpells";
import Panel from "@/components/character/sheet/util/Panel";

export default function CharacterSheet() {

  const { character } = useCharacter();

  return (
    <SimpleGrid columns={5} spacing={4} p={4} h="calc(100vh - 60px)">
      <VStack>
        <CharacterInfo />
        <BaseStats />
      </VStack>
      <VStack>
        <DerivedStats />
        <CombatValues />
      </VStack>
      <Box w="100%" overflowY="scroll" overflowX="hidden">
        <Skills />
      </Box>
      <Box w="100%" overflowY="scroll" overflowX="hidden">
        {character.class === 'Bárd' && <BardSpells/>}
      </Box>
      <Panel title="Felszerelés">
        <VStack w="100%" alignItems="flex-start" spacing={2}>
          <Text>harci kutya (hastin)</Text>
          <Text>utazo lo, huseges, parancsra megall</Text>
          <Text>egy okos hollo</Text>
          <Text>hosszu ij</Text>
          <Text>atlagos ruha, szep ruha</Text>
          <Text>sip</Text>
          <Text>kis sator</Text>
          <Text>10 papir</Text>
          <Text>2 adag tinta</Text>
          <Text>irotoll</Text>
          <Text>horog, cerna</Text>
        </VStack>
      </Panel>
    </SimpleGrid>
  );
};
