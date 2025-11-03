import React from 'react';
import {Box, Button, FormControl, FormLabel, HStack, Text, VStack} from '@chakra-ui/react';
import {RaceValues, Stat} from "@/data/character";
import {useCharacter} from "@/CharacterContext";

export default () => {
  const { character, setCharacter } = useCharacter();

  const totalStats = Object.values(character.stats).reduce((sum, value) => sum + value, 0);
  const remainingPoints = 135 - totalStats;

  const handleStatChange = (statName: Stat, newValue: number) => {
    if (totalStats - character.stats[statName] + newValue <= 135) {
      setCharacter({stats: { ...character.stats, [statName]: newValue }});
    }
  };

  return (
    <VStack spacing={4}>
      {Object.entries(character.stats).map(([statName, statValue], index) => (
        <FormControl key={index}>
          <HStack>
            <FormLabel width="120px">{statName}</FormLabel>
            <Button
              size="sm"
              onClick={() => handleStatChange(statName as Stat, statValue - 1)}
              isDisabled={statValue <= 1}
            >
              -
            </Button>
            <Text width="20px" textAlign="center" verticalAlign="middle">{statValue}</Text>
            <Button
              size="sm"
              onClick={() => handleStatChange(statName as Stat,statValue + 1)}
              isDisabled={statValue >= RaceValues[character.race].statLimits[statName as Stat] || totalStats >= 135}
            >
              +
            </Button>
          </HStack>
        </FormControl>
      ))}
      <Box alignSelf="flex-start">
        <Text fontSize="lg">Remaining Points: {remainingPoints}</Text>
      </Box>
    </VStack>
  );
};
