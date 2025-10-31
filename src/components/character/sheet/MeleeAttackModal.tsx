import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, Button, NumberInput,
  NumberInputField, Select, Stack, Checkbox, Text, FormControl,
  FormLabel, HStack, useBoolean, SimpleGrid, Spacer, Divider, Badge, Box
} from "@chakra-ui/react";
import { useState, useMemo } from "react";
import {ToggleBadge} from "@/components/character/sheet/util/ToggleBadge";

interface MeleeAttackModalProps {
  alapKÉ: number;
  alapTÉ: number;
  alapVÉ: number;
  isOpen: boolean;
  onClose: () => void;
}

export function MeleeAttackModal({ alapKÉ, alapTÉ, alapVÉ, isOpen, onClose }: MeleeAttackModalProps) {

  const [surpriseAttack, setSurpriseAttack] = useBoolean();
  const [highGround, setHighGround] = useBoolean();
  const [rooted, setRooted] = useBoolean();
  const [lyingDown, setLyingDown] = useBoolean();
  const [horseback, setHorseback] = useBoolean();
  const [darkness, setDarkness] = useBoolean();
  const [invisible, setInvisible] = useBoolean();
  const [fear, setFear] = useBoolean();
  const [hatred, setHatred] = useBoolean();
  const [roham, setRoham] = useBoolean();
  const [grappling, setGrappling] = useBoolean();
  const [kabulat, setKabulat] = useBoolean();

  const finalKÉ = useMemo(() => {
    let ret = alapKÉ;
    if (surpriseAttack) return "támadóé";
    if (highGround) ret += 0;
    if (rooted) ret -= 10;
    if (lyingDown) return "nincs"
    if (horseback) ret += 0;
    if (darkness) return "nincs"
    if (invisible) return "nincs"
    if (fear) return "támadóé";
    if (hatred) ret += 5;
    if (roham) ret += 0;
    if (grappling) ret -= 0;
    if (kabulat) ret -= 10;
    return ret;
  }, [alapKÉ, darkness, fear, grappling, hatred, highGround, horseback, invisible, kabulat, lyingDown, roham, rooted, surpriseAttack]);

  const finalTÉ = useMemo(() => {
    let ret = alapTÉ;
    if (surpriseAttack) ret += 30;
    if (highGround) ret += 5;
    if (rooted) ret += 0;
    if (lyingDown) ret -= 20;
    if (horseback) ret += 20;
    if (darkness) ret -= 60;
    if (invisible) ret -= 40;
    if (fear) ret -= 20;
    if (hatred) ret += 5;
    if (roham) ret += 20;
    if (grappling) ret -= 10;
    if (kabulat) ret -= 20;
    return ret;
  }, [alapTÉ, darkness, fear, grappling, hatred, highGround, horseback, invisible, kabulat, lyingDown, roham, rooted, surpriseAttack]);

  const finalVÉ = useMemo(() => {
    let ret = alapVÉ;
    if (surpriseAttack) ret += 0;
    if (highGround) ret += 5;
    if (rooted) ret -= 10;
    if (lyingDown) ret -= 10;
    if (horseback) ret += 10;
    if (darkness) ret -= 60;
    if (invisible) ret -= 40;
    if (fear) ret += 10;
    if (hatred) ret -= 10;
    if (roham) ret -= 20;
    if (grappling) ret += 0;
    if (kabulat) ret -= 10;
    return ret;
  }, [alapVÉ, darkness, fear, grappling, hatred, highGround, horseback, invisible, kabulat, lyingDown, roham, rooted, surpriseAttack]);

  const modifiersBadge = (KÉ: number | string, TÉ: number | string, VÉ: number | string, toggled: boolean) => {
    const bgLabel   = toggled ? "transparent" : "blackAlpha";
    const colorLabel = toggled ? "black" : "white";
    const bgValue   = toggled ? "blackAlpha" : "transparent";
    const colorValue = toggled ? "white" : "blackAlpha";
    const labelWidth = "20px";
    const valueWidth = "22px";

    return (
      <HStack spacing={0} borderWidth="1px" borderRadius="3px" overflow="hidden" fontSize="2xs">
        <Box px={0.5} pt={1} pb={0.5} bg={bgValue} color={colorValue} width={labelWidth}>KÉ</Box>
        <Box px={0.5} pt={1} pb={0.5} bg={bgValue} color={colorValue} width={valueWidth} borderRightColor={colorValue} borderRightWidth="0.5px">{KÉ}</Box>
        <Box px={0.5} pt={1} pb={0.5} bg={bgValue} color={colorValue} width={labelWidth}>TÉ</Box>
        <Box px={0.5} pt={1} pb={0.5} bg={bgValue} color={colorValue} width={valueWidth} borderRightColor={colorValue} borderRightWidth="0.5px">{TÉ}</Box>
        <Box px={0.5} pt={1} pb={0.5} bg={bgValue} color={colorValue} width={labelWidth}>VÉ</Box>
        <Box px={0.5} pt={1} pb={0.5} bg={bgValue} color={colorValue} width={valueWidth}>{VÉ}</Box>
      </HStack>
  );

  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="lg" textAlign="center">Közelharci támadás</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <Stack spacing={2}>

            <HStack w="100%" justify="space-between">
              <Text fontWeight={600} fontSize="sm" textAlign="center">
                KÉ: {finalKÉ}
              </Text>
              <Text fontWeight={600} fontSize="sm" textAlign="center">
                TÉ: {finalTÉ}
              </Text>
              <Text fontWeight={600} fontSize="sm" textAlign="center">
                VÉ: {finalVÉ}
              </Text>
            </HStack>

            <Divider />

            <ToggleBadge active={surpriseAttack} onToggle={setSurpriseAttack.toggle}>
              Meglepetésszerű támadás
              <Spacer />
              {modifiersBadge("t.é", "+30", "-", surpriseAttack)}
            </ToggleBadge>

            <ToggleBadge active={highGround} onToggle={setHighGround.toggle}>
              Harc magasabbról
              <Spacer />
              {modifiersBadge("-", "+5", "+5", highGround)}
            </ToggleBadge>

            <ToggleBadge active={rooted} onToggle={setRooted.toggle}>
              Harc helyhez kötve
              <Spacer />
              {modifiersBadge("-10", "-", "-10", rooted)}
            </ToggleBadge>

            <ToggleBadge active={lyingDown} onToggle={setLyingDown.toggle}>
              Harc fekve
              <Spacer />
              {modifiersBadge("⊘", "-20", "-10", lyingDown)}
            </ToggleBadge>

            <ToggleBadge active={horseback} onToggle={setHorseback.toggle}>
              Harc mozgó lóról
              <Spacer />
              {modifiersBadge("-", "+20", "+10", horseback)}
            </ToggleBadge>

            <ToggleBadge active={darkness} onToggle={setDarkness.toggle}>
              Vakon vagy vaksötétben
              <Spacer />
              {modifiersBadge("⊘", "-60", "-60", darkness)}
            </ToggleBadge>

            <ToggleBadge active={invisible} onToggle={setInvisible.toggle}>
              Láthatatlan ellenféllel
              <Spacer />
              {modifiersBadge("⊘", "-40", "-40", invisible)}
            </ToggleBadge>

            <ToggleBadge active={fear} onToggle={setFear.toggle}>
              Félelem hatása alatt
              <Spacer />
              {modifiersBadge("t.é", "-20", "+10", fear)}
            </ToggleBadge>

            <ToggleBadge active={hatred} onToggle={setHatred.toggle}>
              Gyűlölettel eltelve
              <Spacer />
              {modifiersBadge("+5", "+5", "-10", hatred)}
            </ToggleBadge>

            <ToggleBadge active={grappling} onToggle={setGrappling.toggle}>
              Az ellenfél elfogásáért
              <Spacer />
              {modifiersBadge("-", "-10", "-", grappling)}
            </ToggleBadge>

            <ToggleBadge active={roham} onToggle={setRoham.toggle}>
              Roham
              <Spacer />
              {modifiersBadge("-", "+20", "-20", roham)}
            </ToggleBadge>

            <ToggleBadge active={kabulat} onToggle={setKabulat.toggle}>
              Harc kábultan
              <Spacer />
              {modifiersBadge("-10", "-20", "-10", kabulat)}
            </ToggleBadge>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
