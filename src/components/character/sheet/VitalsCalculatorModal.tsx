import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalCloseButton, Button, SimpleGrid, Text, VStack, HStack, Box
} from "@chakra-ui/react";
import { useState } from "react";
import { useCharacter } from "@/CharacterContext";
import { VitalKey } from "@/data/character";

interface VitalsCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vitalKey: VitalKey;
  vitalLabel: string;
  vitalColor: string;
}

export function VitalsCalculatorModal({
  isOpen,
  onClose,
  vitalKey,
  vitalLabel,
  vitalColor
}: VitalsCalculatorModalProps) {
  const { character, setCharacter } = useCharacter();
  const [value, setValue] = useState("");

  const vital = character.vitals[vitalKey];

  const appendDigit = (digit: string) => {
    setValue(prev => prev + digit);
  };

  const handleClear = () => {
    setValue("");
  };

  const handleBackspace = () => {
    setValue(prev => prev.slice(0, -1));
  };

  const applyChange = (mode: 'heal' | 'damage') => {
    const amount = parseInt(value, 10);
    if (isNaN(amount) || amount <= 0) return;

    let newCurrent: number;
    if (mode === 'heal') {
      newCurrent = Math.min(vital.current + amount, vital.max);
    } else {
      newCurrent = Math.max(vital.current - amount, 0);
    }

    setCharacter({
      vitals: {
        ...character.vitals,
        [vitalKey]: {
          ...vital,
          current: newCurrent
        }
      }
    });

    setValue("");
    onClose();
  };

  const numericValue = parseInt(value, 10);
  const isValidValue = !isNaN(numericValue) && numericValue > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xs" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md" pb={2}>
          <Text color={vitalColor} fontWeight="bold">{vitalLabel}</Text>
          <Text fontSize="xs" color="gray.500">
            Current: {vital.current}/{vital.max}
          </Text>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody pb={4}>
          <VStack spacing={3}>
            {/* Value display */}
            <Box
              w="100%"
              bg="gray.100"
              borderRadius="md"
              p={3}
              minH="50px"
              display="flex"
              alignItems="center"
              justifyContent="flex-end"
            >
              <Text fontSize="2xl" fontFamily="mono">
                {value || '0'}
              </Text>
            </Box>

            {/* Number pad */}
            <SimpleGrid columns={3} spacing={2} w="100%">
              {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(digit => (
                <Button
                  key={digit}
                  size="lg"
                  variant="outline"
                  onClick={() => appendDigit(digit)}
                >
                  {digit}
                </Button>
              ))}
              <Button size="lg" variant="outline" onClick={handleClear}>C</Button>
              <Button size="lg" variant="outline" onClick={() => appendDigit('0')}>0</Button>
              <Button size="lg" variant="outline" onClick={handleBackspace}>←</Button>
            </SimpleGrid>

            {/* Action buttons */}
            <HStack w="100%" spacing={2} pt={2}>
              <Button
                flex={1}
                size="lg"
                colorScheme="green"
                onClick={() => applyChange('heal')}
                isDisabled={!isValidValue}
              >
                HEAL
              </Button>
              <Button
                flex={1}
                size="lg"
                colorScheme="red"
                onClick={() => applyChange('damage')}
                isDisabled={!isValidValue}
              >
                DAMAGE
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
