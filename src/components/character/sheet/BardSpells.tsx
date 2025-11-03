import React from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  VStack,
  Text, useBreakpoint, FormLabel, HStack, Tooltip, Spacer,
} from '@chakra-ui/react';
import {TimeIcon} from '@chakra-ui/icons';
import {isHighlightedRow} from "@/components/etc/utils";
import Triggerable from "@/components/etc/Triggerable";
import {BardMagicInfo, BardMagicType, BardMagicValues} from "@/data/bardMagic";
import {detailsModal} from "@/components/ui/DetailsModal";
import Panel from "@/components/character/sheet/util/Panel";
import {SkillValues} from "@/data/skills";
import {StatValues} from "@/data/character";

export default () => {

  const isMobile = useBreakpoint() === "base";

  const isSpellAvailable = (spell: BardMagicInfo, maxMana: number) => {
    const numberPart = parseInt(spell.cost.toString().replace(/\D/g, ''));
    return numberPart <= maxMana;
  }

  const shortenedCastingTime = (castingTime: string) => {
    const shortnededSz = castingTime.replace("szegmens", "sz").replace("perc", "p");
    return shortnededSz.length > 6 ? "..." : shortnededSz;
  }

  const bardMagicList = (type: BardMagicType) => {
    return (
      <Panel title={type} size="sm" utility={
        <HStack h="8px" pr={2}>
          <Text w="30px" fontSize="2xs" textAlign="center" h="10px">Mana</Text>
          <TimeIcon w="40px" h="10px" pt="2px"/>
        </HStack>
      }>
        <VStack w="100%" align="start" spacing={1}>
            {BardMagicValues.filter((spell) => spell.type === type && isSpellAvailable(spell, 10)).map((spell, index) => (
              <Triggerable trigger={
                <HStack key={spell.name} w="100%">
                  <Text>{spell.name}</Text>
                  <Spacer />
                  <Text w="30px" textAlign="center">{spell.cost}</Text>
                  <Text w="40px" textAlign="center">{shortenedCastingTime(spell.castingTime)}</Text>
                </HStack>
              }>
                {detailsModal("BardMagicValues", spell)}
              </Triggerable>
            ))}
        </VStack>
      </Panel>
    );
  }

  return (
    <Panel title={"Bárdmágia"}>
      {bardMagicList("Dalmágia")}
      {bardMagicList("Hangmágia")}
      {bardMagicList("Fénymágia")}
      {bardMagicList("Egyéb bárdmágia")}
    </Panel>
  );
};
