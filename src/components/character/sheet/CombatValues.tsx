import React from 'react';
import {FormLabel, HStack, IconButton, Text, useDisclosure, VStack} from '@chakra-ui/react';
import {useCharacter} from "@/CharacterContext";
import Panel from "@/components/character/sheet/util/Panel";
import {BowIcon} from "@/icons/BowIcon";
import {RangedAttackModal} from "@/components/character/sheet/RangedAttackModal";
import {MeleeAttackModal} from "@/components/character/sheet/MeleeAttackModal";
import {SwordIcon} from "@/icons/SwordIcon";

export default () => {
  const { character } = useCharacter();

  const rangedAttackModal = useDisclosure();
  const meleeAttackModal = useDisclosure();

  return (
    <Panel title="Harcértékek">
      <Panel title="Közelharci" size="sm">
        <HStack onClick={meleeAttackModal.onOpen} cursor="pointer">
          <FormLabel width="120px">Tőr</FormLabel>
          <Text textAlign="center" verticalAlign="middle">2k10-1</Text>
          <Text textAlign="center" verticalAlign="middle">43</Text>
        </HStack>
      </Panel>
      <Panel title="Távolsági" size="sm">
        <HStack onClick={rangedAttackModal.onOpen} cursor="pointer">
          <FormLabel width="120px">Hosszú íj</FormLabel>
          <Text textAlign="center" verticalAlign="middle">2k6+1</Text>
          <Text textAlign="center" verticalAlign="middle">49</Text>
        </HStack>
      </Panel>
      <Panel title="Ammo" size="sm">
        <HStack>
          <FormLabel width="120px">Nyíl</FormLabel>
          <Text textAlign="center" verticalAlign="middle">25</Text>
        </HStack>
      </Panel>
      <RangedAttackModal baseAttack={49} isOpen={rangedAttackModal.isOpen} onClose={rangedAttackModal.onClose} />
      <MeleeAttackModal alapKÉ={34} alapTÉ={43} alapVÉ={93} isOpen={meleeAttackModal.isOpen} onClose={meleeAttackModal.onClose} />
    </Panel>
  );
};
