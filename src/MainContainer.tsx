import React from 'react';
import SkillsPanel from "@/components/skills/SkillsPanel";
import PrayerPanel from "@/components/prayers/PrayerPanel";
import BardMagicPanel from "@/components/bardMagic/BardMagicPanel";
import WitchMagicPanel from "@/components/witchMagic/WitchMagicPanel";
import WarlockMagicPanel from "@/components/warlockMagic/WarlockMagicPanel";
import FireMagicPanel from "@/components/fireMagic/FireMagicPanel";
import PsiPanel from "@/components/psi/PsiPanel";
import WeaponsPanel from "@/components/weapons/WeaponsPanel";
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
