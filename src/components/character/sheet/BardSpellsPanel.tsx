import React, {useMemo, useState} from 'react';
import {
  VStack,
  Text, useBreakpoint, HStack, Spacer,
} from '@chakra-ui/react';
import {TimeIcon} from '@chakra-ui/icons';
import {BardMagicInfo, BardMagicType, BardMagicValues} from "@/data/bardMagic";
import Panel from "@/components/character/sheet/util/Panel";
import SnappyModal from "@/components/ui/SnappyModal";
import {BardMagicDetails, BardMagicTitle} from "@/components/compendium/BardMagicDetails";

export const BardSpellsPanel = () => {
  const [selectedItem, setSelectedItem] = useState<BardMagicInfo | undefined>();

  const isMobile = useBreakpoint() === "base";

  const isSpellAvailable = (spell: BardMagicInfo, maxMana: number) => {
    const numberPart = parseInt(spell.cost.toString().replace(/\D/g, ''));
    return numberPart <= maxMana;
  }
  const availableSpells = useMemo(()=> BardMagicValues.filter((spell) => isSpellAvailable(spell, 14)),[])

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
            {availableSpells.filter((spell) => spell.type === type).map((spell, index) => (
              <HStack key={index} w="100%" cursor="pointer" onClick={() => setSelectedItem(spell)}>
                <Text>{spell.name}</Text>
                <Spacer />
                <Text w="30px" textAlign="center">{spell.cost}</Text>
                <Text w="40px" textAlign="center">{shortenedCastingTime(spell.castingTime)}</Text>
              </HStack>
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
      <SnappyModal
        isOpen={selectedItem !== undefined}
        onClose={() => setSelectedItem(undefined)}
        data={availableSpells}
        selectedItem={selectedItem}
        titleFn={(spell) => <BardMagicTitle spell={spell}/>}
        bodyFn={(spell) => <BardMagicDetails spell={spell}/>}
      />
    </Panel>
  );
};
