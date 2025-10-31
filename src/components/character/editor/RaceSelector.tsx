import React from 'react';
import { Select } from '@chakra-ui/react';
import {Race, RaceValues, Stat} from "@/magus/character";
import _ from "lodash";
import {useCharacter} from "@/CharacterContext";

export default () => {
  const { character, setCharacter } = useCharacter();
  const handleRaceChange = (newRace: Race) => {
    const oldStats = character.stats;
    // apply new race limits for existing stats by removing the ones that are too high using lodash
    const newStats = _.mapValues(oldStats, (value, statName) => Math.min(value, RaceValues[newRace].statLimits[statName as Stat]));

    setCharacter({stats: newStats, race: newRace});
  }

  return (
    <Select value={character.race} onChange={(e) => handleRaceChange(e.target.value as Race)}>
      {Object.keys(RaceValues).map(race => (
        <option key={race} value={race}>{race}</option>
      ))}
    </Select>
  );
};
