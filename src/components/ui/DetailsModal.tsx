import {PrayerInfo} from "@/data/prayers";
import {Modal, ModalBody, ModalCloseButton, ModalContent, ModalOverlay} from "@chakra-ui/react";
import PrayerDetails from "@/components/compendium/PrayerDetails";
import React from "react";
import {BardMagicInfo} from "@/data/bardMagic";
import {FireMagicInfo} from "@/data/fireMagic";
import {WitchMagicInfo} from "@/data/witchMagic";
import {WeaponInfo} from "@/data/weapons";
import {WarlockMagicInfo} from "@/data/warlockMagic";
import {SkillInfo} from "@/data/skills";
import {PsiInfo} from "@/data/psi";
import BardMagicDetails from "@/components/compendium/BardMagicDetails";
import FireMagicDetails from "@/components/compendium/FireMagicDetails";
import PsiDetails from "@/components/compendium/PsiDetails";
import SkillDetails from "@/components/compendium/SkillDetails";
import WarlockMagicDetails from "@/components/compendium/WarlockMagicDetails";
import WeaponDetails from "@/components/compendium/WeaponDetails";
import WitchMagicDetails from "@/components/compendium/WitchMagicDetails";

export type DetailsType = "BardMagicValues" | "FireMagicValues" | "PrayerValues" | "PsiValues" | "SkillValues" | "WarlockMagicValues" | "WeaponValues" | "WitchMagicValues";

export type DetailsInfoType = BardMagicInfo | PrayerInfo | FireMagicInfo | PsiInfo | SkillInfo | WarlockMagicInfo | WeaponInfo | WitchMagicInfo;

export const getDetails = (type: DetailsType, item?: DetailsInfoType, param1?: any) => {
  switch (type) {
    case "BardMagicValues":
      return <BardMagicDetails spell={item as BardMagicInfo} />;
    case "FireMagicValues":
      return <FireMagicDetails spell={item as FireMagicInfo} />;
    case "PrayerValues":
      return <PrayerDetails prayer={item as PrayerInfo} />;
    case "PsiValues":
      return <PsiDetails spell={item as PsiInfo} />;
    case "SkillValues":
      return <SkillDetails skill={item as SkillInfo} level={param1}/>;
    case "WarlockMagicValues":
      return <WarlockMagicDetails spell={item as WarlockMagicInfo} />;
    case "WeaponValues":
      return <WeaponDetails weapon={item as WeaponInfo} />;
    case "WitchMagicValues":
      return <WitchMagicDetails spell={item as WitchMagicInfo} />;
  }
}

export const detailsModal = (type: DetailsType, item: DetailsInfoType, param1: any = undefined) => {
  // return null;
  return (
    <Modal isOpen={false}  onClose={()=>{}} size="xl" scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalBody>
          {getDetails(type, item, param1)}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
