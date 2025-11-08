import React from 'react';
import {Box, Center, FormLabel, HStack, SimpleGrid, Text, VStack} from '@chakra-ui/react';
import {useCharacter} from "@/CharacterContext";
import Panel from "@/components/character/sheet/util/Panel";
import {CharacterInfoPanel} from "@/components/character/sheet/CharacterInfoPanel";
import {BaseStatsPanel} from "@/components/character/sheet/BaseStatsPanel";
import {DerivedStatsPanel} from "@/components/character/sheet/DerivedStatsPanel";
import {CombatValuesPanel} from "@/components/character/sheet/CombatValuesPanel";
import {SkillsPanel} from "@/components/character/sheet/SkillsPanel";
import {BardSpellsPanel} from "@/components/character/sheet/BardSpellsPanel";
import {VitalsPanel} from "@/components/character/sheet/VitalsPanel";

export default function CharacterSheet() {

  const { character } = useCharacter();

  return (
    <Center h="calc(100vh - 60px)">
      <SimpleGrid columns={5} spacing={4} p={4} h="calc(100vh - 60px)" maxW="1500px" maxH="1024px">
        <VStack>
          <CharacterInfoPanel />
          <VitalsPanel />
          <BaseStatsPanel />
        </VStack>
        <VStack>
          <DerivedStatsPanel />
          <CombatValuesPanel />
        </VStack>
        <Box w="100%" overflowY="scroll" overflowX="hidden">
          <SkillsPanel />
        </Box>
        <Box w="100%" overflowY="scroll" overflowX="hidden">
          {character.class === 'Bárd' && <BardSpellsPanel/>}
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
    </Center>
  );
};
