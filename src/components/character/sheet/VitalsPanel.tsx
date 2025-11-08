import React from 'react';
import {Box, FormLabel, HStack, Progress, Spacer, Text, useColorModeValue, VStack} from '@chakra-ui/react';
import {useCharacter} from "@/CharacterContext";
import Panel from "@/components/character/sheet/util/Panel";

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  bg: string;
}

const StatBar = ({ label, value, max, color, bg }: StatBarProps) => {
  const textColor = useColorModeValue("gray.700", "gray.200");
  const overlayColor = useColorModeValue("black", "gray.800");

  return (
    <VStack w="100%" spacing={1} align="stretch">
      <Text fontSize="xs" color={textColor} w="100%" textAlign="center">{label}</Text>
      <Box position="relative" w="100%">
        <Progress
          value={(value / max) * 100}
          size="lg"
          sx={{
            "& > div:first-of-type": {
              backgroundColor: bg, // background for the "off" area
            },
            "& > div:last-of-type": {
              backgroundColor: color, // filled area color
            },
          }}
          borderRadius="sm"
        />
        <Text
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          fontSize="xs"
          color={overlayColor}
        >
          {value}/{max}
        </Text>
      </Box>
    </VStack>
  );
};

export const VitalsPanel = () => {
  const { character } = useCharacter();

  const colors = {
    fajdalom: useColorModeValue("#9ae6b4", "#2f855a"),       // Életpont — fresh green (life)
    elet: useColorModeValue("#fc8181", "#c53030"),   // Fájdalompont — soft red/coral (pain)
    mana: useColorModeValue("#90cdf4", "#2b6cb0"),       // Mana — calm blue (magic)
    kegy: useColorModeValue("#fce588", "#b7791f"),       // Kegypont — divine golden yellow
    pszi: useColorModeValue("#d6bcfa", "#553c9a"),       // Pszi — mystical purple
  };

  const bg = useColorModeValue("gray.100", "gray.700"); // subtle neutral background

  return (
    <Panel title="Életerő">
      <VStack w="100%">
        <StatBar label="Életpont" value={13} max={13} color={colors.elet} bg={bg} />
        <StatBar label="Fájdalompont" value={29} max={29} color={colors.fajdalom} bg={bg} />
        <StatBar label="Mana" value={8} max={14} color={colors.mana} bg={bg} />
        <StatBar label="Kegypont" value={3} max={20} color={colors.kegy} bg={bg} />
        <StatBar label="Pszi" value={20} max={25} color={colors.pszi} bg={bg} />
      </VStack>
    </Panel>
  );
};
