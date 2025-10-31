import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, Button, NumberInput,
  NumberInputField, Select, Stack, Checkbox, Text, FormControl,
  FormLabel, HStack, useBoolean, SimpleGrid, Spacer, Divider, Box
} from "@chakra-ui/react";
import { useState, useMemo } from "react";
import {ToggleBadge} from "@/components/character/sheet/util/ToggleBadge";

interface RangedAttackModalProps {
  baseAttack: number;
  isOpen: boolean;
  onClose: () => void;
}

export function RangedAttackModal({ baseAttack, isOpen, onClose }: RangedAttackModalProps) {
  const [attack, setAttack] = useState(baseAttack);
  const [range, setRange] = useState(0);
  const [targetSizeMod, setTargetSizeMod] = useState(0);
  const [behaviorMod, setBehaviorMod] = useState(0);
  const [weatherMod, setWeatherMod] = useState(0);
  const [targetedAttackMod, setTargetedAttackMod] = useState(0);

  const [invisible, setInvisible] = useBoolean();
  const [darkness, setDarkness] = useBoolean();
  const [roham, setRoham] = useBoolean();
  const [kabulat, setKabulat] = useBoolean();

  const targetVE = useMemo(() => {
    let m = 50 + range;
    m += targetSizeMod;
    m += behaviorMod;
    m += weatherMod;
    m += targetedAttackMod;
    return m;
  }, [range, targetSizeMod, behaviorMod, weatherMod, targetedAttackMod]);

  const finalAttackCÉ = useMemo(() => {
    let m = attack;
    if (invisible) m -= 75;
    if (darkness) m -= 150;
    if (roham) m -= 20;
    if (kabulat) m -= 30;
    return m;
  }, [attack, invisible, darkness, roham, kabulat]);

  const modifiersBadge = (VÉ: number, toggled: boolean) => {
    const bgValue   = toggled ? "blackAlpha" : "transparent";
    const colorValue = toggled ? "white" : "blackAlpha";
    const labelWidth = "20px";
    const valueWidth = "25px";

    return (
      <HStack spacing={0} borderWidth="1px" borderRadius="3px" overflow="hidden" fontSize="2xs">
        <Box px={0.5} pt={1} pb={0.5} bg={bgValue} color={colorValue} width={labelWidth}>VÉ</Box>
        <Box px={0.5} pt={1} pb={0.5} bg={bgValue} color={colorValue} width={valueWidth}>{VÉ}</Box>
      </HStack>
    );
  }

  const parseIntSafe = (v: string, min: number, max: number) => {
    const val = parseInt(v);
    if (isNaN(val)) return min;
    if (val < min) return min;
    if (val > max) return max;
    return val;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="lg" textAlign="center">Távolsági támadás</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <Stack spacing={2}>

            <HStack w="100%" justify="space-between">
              <Text fontWeight={600} fontSize="sm" textAlign="center">
                Célpont VÉ: {targetVE}
              </Text>
              <Text fontWeight={600} fontSize="sm" textAlign="center">
                Minimum dobás: {Math.max(Math.min(targetVE - finalAttackCÉ, 100), 2)}
              </Text>
            </HStack>

            <Divider />


            <SimpleGrid  columns={2} spacing={2}>
              <FormControl>
                <FormLabel fontSize="sm">Célzóérték</FormLabel>
                <NumberInput value={attack} onChange={(v) => setAttack(parseIntSafe(v,0,999))} size="sm">
                  <NumberInputField />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Távolság</FormLabel>
                <NumberInput value={range} onChange={(v) => setRange(parseIntSafe(v,0,999))} size="sm">
                  <NumberInputField />
                </NumberInput>
              </FormControl>
            </SimpleGrid>

            <FormControl>
              <FormLabel fontSize="sm">Célpont mérete</FormLabel>
              <Select size="sm" value={targetSizeMod} onChange={(e) => setTargetSizeMod(Number(e.target.value))}>
                <option value={-50}>Óriás (-50)</option>
                <option value={-30}>Szekér (-30)</option>
                <option value={-10}>Ló (-10)</option>
                <option value={0}>Ember (0)</option>
                <option value={10}>Kutya (+10)</option>
                <option value={30}>Dinnye (+30)</option>
                <option value={50}>Alma (+50)</option>
                <option value={70}>Pénzérme (+70)</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Viselkedés</FormLabel>
              <Select size="sm" value={behaviorMod} onChange={(e) => setBehaviorMod(Number(e.target.value))}>
                <option value={0}>Mozdulatlan célpont (0)</option>
                <option value={10}>Kiszámíthatóan mozgó célpont (+10)</option>
                <option value={30}>Kiszámíthatatlanul mozgó célpont (+30)</option>
                <option value={50}>Kitérésre összpontosító célpont (+50)</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Időjárás</FormLabel>
              <Select size="sm" value={weatherMod} onChange={(e) => setWeatherMod(Number(e.target.value))}>
                <option value={0}>Napsütés, szélcsend (0)</option>
                <option value={10}>Szemerkélő eső, szellő (+10)</option>
                <option value={30}>Gyenge eső, gyenge szél (+30)</option>
                <option value={50}>Ritkább köd, eső , erős szél (+50)</option>
                <option value={70}>Sűrű köd, zivatar, viharos szél (+70)</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Célzott támadás</FormLabel>
              <Select size="sm" value={targetedAttackMod} onChange={(e) => setTargetedAttackMod(Number(e.target.value))}>
                <option value={0}>Nincs (0)</option>
                <option value={10}>Kar, láb (+10)</option>
                <option value={30}>Fej (+30)</option>
                <option value={50}>Torok, kéz-, lábfej, lágyék (+50)</option>
                <option value={70}>Szem, ujjak, száj (+70)</option>
              </Select>
            </FormControl>

            <Divider />

            <ToggleBadge active={invisible} onToggle={setInvisible.toggle}>
              Harc láthatatlan ellenféllel
              <Spacer />
              {modifiersBadge(-75, invisible)}
            </ToggleBadge>

            <ToggleBadge active={darkness} onToggle={setDarkness.toggle}>
              Harc vakon vagy vaksötétben
              <Spacer />
              {modifiersBadge(-150, darkness)}
            </ToggleBadge>

            <SimpleGrid  columns={2} spacing={2} pb={2}>
              <ToggleBadge active={roham} onToggle={setRoham.toggle}>
                Roham
                <Spacer />
                {modifiersBadge(-20, roham)}
              </ToggleBadge>

              <ToggleBadge active={kabulat} onToggle={setKabulat.toggle}>
                Harc kábultan
                <Spacer />
                {modifiersBadge(-30, kabulat)}
              </ToggleBadge>
            </SimpleGrid>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
