import React from 'react';
import {Box, FormLabel, HStack, Text, VStack} from '@chakra-ui/react';
import {useCharacter} from "@/CharacterContext";
import Panel from "@/components/character/sheet/util/Panel";
import {Skill, SkillType, SkillValues} from "@/magus/skills";
import Triggerable from "@/components/etc/Triggerable";
import {detailsModal} from "@/components/ui/DetailsModal";

export default () => {
  const { character } = useCharacter();

  const skillLevels = character.skills;

  const getSkillType = (skill: Skill) => SkillValues.find((s) => s.name === skill)?.skillType;

  const subPanel = (skillType: SkillType) => {

    const filteredSkillLevels = skillLevels.filter((sl) => getSkillType(sl.skill) === skillType);

    if(filteredSkillLevels.length === 0){
      return null;
    }

    return (
    <Panel title={skillType} size="sm">
      <VStack w="100%" spacing={0}>
        {filteredSkillLevels.map(({skill, skillSubtype, level}) => {
          const fullSkillName = `${skill}${skillSubtype ? ` (${skillSubtype})` : ''}`;
          const skillValue = SkillValues.find((s) => s.name === skill)!!;
          return (
            <Triggerable trigger={
                <HStack key={fullSkillName} width="100%" justifyContent="space-between" cursor="pointer">
                  <FormLabel>{fullSkillName}</FormLabel>
                  <Text width="20px" textAlign="center" verticalAlign="middle">{level}</Text>
                </HStack>
            }>
              {detailsModal("SkillValues", skillValue, level)}
            </Triggerable>
          );
        })}
      </VStack>
    </Panel>
  );
  }

  return (
    <Panel title="Képzettségek">
      <VStack spacing={1}>
        {subPanel("Harci")}
        {subPanel("Alvilági")}
        {subPanel("Világi")}
        {subPanel("Tudományos")}
        {subPanel("Szociális")}
        {subPanel("Misztikus")}
      </VStack>
    </Panel>
  );
};
