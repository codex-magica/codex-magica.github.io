import React from 'react';
import {Box, Text, VStack} from "@chakra-ui/react";
import {SkillInfo} from "@/magus/skills";
import Details from "@/components/etc/Details";

export default ({skill, level = 5}:{skill: SkillInfo, level?: number}) => {

  return (
    <VStack spacing={4}>
      <Box alignSelf="center">
        <Text fontSize="xl" fontWeight="bold">{skill.name}</Text>
      </Box>
      <Box alignSelf="center">
        <Text fontWeight="bold">{'(' + skill.skillDifficulty + ' - ' + skill.stats.join(', ') + ')'}</Text>
      </Box>
      <Details>{skill.description}</Details>
      {skill.lvl_1 && level >= 1 && <Details prefix="1. fok">{skill.lvl_1}</Details>}
      {skill.lvl_2 && level >= 2 && <Details prefix="2. fok">{skill.lvl_2}</Details>}
      {skill.lvl_3 && level >= 3 && <Details prefix="3. fok">{skill.lvl_3}</Details>}
      {skill.lvl_4 && level >= 4 && <Details prefix="4. fok">{skill.lvl_4}</Details>}
      {skill.lvl_5 && level >= 5 && <Details prefix="5. fok">{skill.lvl_5}</Details>}
    </VStack>
  );
};
