import React from 'react';
import { RootApp } from "@/new_app";

// --- Existing app (temporarily disabled while building the new character builder) ---
// import SnappyTabs from "@/components/ui/SnappyTabs";
// import CharacterSheet from "@/components/character/sheet/CharacterSheet";
// import {SkillsScreen} from "@/components/compendium/SkillsScreen";
// import {BardMagicScreen} from "@/components/compendium/BardMagicScreen";
// import {PrayerScreen} from "@/components/compendium/PrayerScreen";
// import {WitchMagicScreen} from "@/components/compendium/WitchMagicScreen";
// import {WarlockMagicScreen} from "@/components/compendium/WarlockMagicScreen";
// import {FireMagicScreen} from "@/components/compendium/FireMagicScreen";
// import {PsiScreen} from "@/components/compendium/PsiScreen";
// import {WeaponsScreen} from "@/components/compendium/WeaponsScreen";
// import {ArmorScreen} from "@/components/compendium/ArmorScreen";


function MainContainer() {

  return <RootApp />;

  // return (
  //   <SnappyTabs tabs={['Karakter', 'Képzettségek', 'Bárdmágia', 'Szakrális Mágia', 'Boszorkánymágia', 'Boszorkánymesteri mágia', 'Tűzmágia', 'Pszi', 'Fegyverek', 'Páncélok']}>
  //     <CharacterSheet />
  //     <SkillsScreen />
  //     <BardMagicScreen />
  //     <PrayerScreen />
  //     <WitchMagicScreen />
  //     <WarlockMagicScreen />
  //     <FireMagicScreen />
  //     <PsiScreen/>
  //     <WeaponsScreen/>
  //     <ArmorScreen />
  //   </SnappyTabs>
  // );
}

export default MainContainer;
