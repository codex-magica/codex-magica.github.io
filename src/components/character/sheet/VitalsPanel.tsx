import React, { useState } from 'react';
import { Box, Progress, Text, useColorModeValue, useDisclosure, VStack } from '@chakra-ui/react';
import { useCharacter } from "@/CharacterContext";
import Panel from "@/components/character/sheet/util/Panel";
import { VitalKey } from "@/data/character";
import { VitalsCalculatorModal } from "./VitalsCalculatorModal";

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  bg: string;
  onClick?: () => void;
}

const StatBar = ({ label, value, max, color, bg, onClick }: StatBarProps) => {
  const textColor = useColorModeValue("gray.700", "gray.200");
  const overlayColor = useColorModeValue("black", "gray.800");

  return (
    <VStack
      w="100%"
      spacing={1}
      align="stretch"
      cursor={onClick ? "pointer" : "default"}
      onClick={onClick}
      _hover={onClick ? { opacity: 0.8 } : undefined}
      transition="opacity 0.2s"
    >
      <Text fontSize="xs" color={textColor} w="100%" textAlign="center">{label}</Text>
      <Box position="relative" w="100%">
        <Progress
          value={(value / max) * 100}
          size="lg"
          sx={{
            "& > div:first-of-type": {
              backgroundColor: bg,
            },
            "& > div:last-of-type": {
              backgroundColor: color,
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

interface VitalConfig {
  key: VitalKey;
  label: string;
  colorKey: 'elet' | 'fajdalom' | 'mana' | 'kegy' | 'pszi';
}

const vitalsConfig: VitalConfig[] = [
  { key: 'eletpont', label: 'Életpont', colorKey: 'elet' },
  { key: 'fajdalompont', label: 'Fájdalompont', colorKey: 'fajdalom' },
  { key: 'mana', label: 'Mana', colorKey: 'mana' },
  { key: 'kegypont', label: 'Kegypont', colorKey: 'kegy' },
  { key: 'pszi', label: 'Pszi', colorKey: 'pszi' },
];

export const VitalsPanel = () => {
  const { character } = useCharacter();
  const calculatorModal = useDisclosure();
  const [selectedVital, setSelectedVital] = useState<{
    key: VitalKey;
    label: string;
    color: string;
  } | null>(null);

  const colors = {
    fajdalom: useColorModeValue("#9ae6b4", "#2f855a"),
    elet: useColorModeValue("#fc8181", "#c53030"),
    mana: useColorModeValue("#90cdf4", "#2b6cb0"),
    kegy: useColorModeValue("#fce588", "#b7791f"),
    pszi: useColorModeValue("#d6bcfa", "#553c9a"),
  };

  const bg = useColorModeValue("gray.100", "gray.700");

  const handleStatBarClick = (key: VitalKey, label: string, color: string) => {
    setSelectedVital({ key, label, color });
    calculatorModal.onOpen();
  };

  const handleModalClose = () => {
    calculatorModal.onClose();
    setSelectedVital(null);
  };

  return (
    <Panel title="Életerő">
      <VStack w="100%">
        {vitalsConfig.map(({ key, label, colorKey }) => (
          <StatBar
            key={key}
            label={label}
            value={character.vitals[key].current}
            max={character.vitals[key].max}
            color={colors[colorKey]}
            bg={bg}
            onClick={() => handleStatBarClick(key, label, colors[colorKey])}
          />
        ))}
      </VStack>

      {selectedVital && (
        <VitalsCalculatorModal
          isOpen={calculatorModal.isOpen}
          onClose={handleModalClose}
          vitalKey={selectedVital.key}
          vitalLabel={selectedVital.label}
          vitalColor={selectedVital.color}
        />
      )}
    </Panel>
  );
};
