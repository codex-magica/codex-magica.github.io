import React, {useMemo, useState} from 'react';
import {FormLabel, HStack, Text, VStack} from '@chakra-ui/react';
import {useCharacter} from "@/CharacterContext";
import Panel from "@/components/character/sheet/util/Panel";
import {Skill, SkillInfo, SkillType, SkillValues} from "@/data/skills";
import SnappyModal from "@/components/ui/SnappyModal";
import {SkillDetails, SkillTitle} from "@/components/compendium/SkillDetails";
import {SkillLevel} from "@/data/character";

export const SkillsPanel = () => {
  const { character } = useCharacter();

  const [selectedItem, setSelectedItem] = useState<SkillLevel | undefined>();

  const skillLevels = useMemo(() => {
    //ordering them by the original skill order in SkillValues
    const unordered = [...character.skills]
    const allSkills = SkillValues.map((skill: SkillInfo) => skill.name);
    return unordered.sort((a, b) => allSkills.indexOf(a.skill) - allSkills.indexOf(b.skill));
  }, [character.skills]);

  const getSkillInfo = (skill: Skill) => SkillValues.find((s) => s.name === skill)!!

  const subPanel = (skillType: SkillType) => {
    const filteredSkillLevels = skillLevels.filter((sl) => getSkillInfo(sl.skill).skillType === skillType);

    if(filteredSkillLevels.length === 0){
      return null;
    }

    return (
    <Panel title={skillType} size="sm">
      <VStack w="100%" spacing={0}>
        {filteredSkillLevels.map((skillLevel, index) => (
            <HStack key={index} width="100%" justifyContent="space-between" cursor="pointer" onClick={() => setSelectedItem(skillLevel)}>
              <FormLabel cursor="pointer">{`${skillLevel.skill}${skillLevel.skillSubtype ? ` (${skillLevel.skillSubtype})` : ''}`}</FormLabel>
              <Text width="20px" textAlign="center" verticalAlign="middle" cursor="pointer">{skillLevel.level}</Text>
            </HStack>
          ))}
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
      <SnappyModal
        isOpen={selectedItem !== undefined}
        onClose={() => setSelectedItem(undefined)}
        data={skillLevels}
        selectedItem={selectedItem}
        titleFn={(skillLevel) => <SkillTitle skill={getSkillInfo(skillLevel.skill)} level={skillLevel.level} subType={skillLevel.skillSubtype}/>}
        bodyFn={(skillLevel) => <SkillDetails skill={getSkillInfo(skillLevel.skill)} level={skillLevel.level} subType={skillLevel.skillSubtype}/>}
      />
    </Panel>
  );
};
