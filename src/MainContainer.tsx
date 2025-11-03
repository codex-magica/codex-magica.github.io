import React from 'react';
import SkillsPanel from "@/components/compendium/SkillsPanel";
import PrayerPanel from "@/components/compendium/PrayerPanel";
import BardMagicPanel from "@/components/compendium/BardMagicPanel";
import WitchMagicPanel from "@/components/compendium/WitchMagicPanel";
import WarlockMagicPanel from "@/components/compendium/WarlockMagicPanel";
import FireMagicPanel from "@/components/compendium/FireMagicPanel";
import PsiPanel from "@/components/compendium/PsiPanel";
import WeaponsPanel from "@/components/compendium/WeaponsPanel";
import SnappyTabs from "@/components/ui/SnappyTabs";
import CharacterSheet from "@/components/character/sheet/CharacterSheet";


function MainContainer() {

  return (
    <SnappyTabs tabs={['Karakter', 'Képzettségek', 'Bárdmágia', 'Szakrális Mágia', 'Boszorkánymágia', 'Boszorkánymesteri mágia', 'Tűzmágia', 'Pszi', 'Fegyverek']}>
      <CharacterSheet />
      <SkillsPanel />
      <BardMagicPanel />
      <PrayerPanel />
      <WitchMagicPanel />
      <WarlockMagicPanel />
      <FireMagicPanel />
      <PsiPanel />
      <WeaponsPanel />
    </SnappyTabs>
  );
}

export default MainContainer;
