import {PrayerInfo} from "@/magus/prayers";
import {Modal, ModalBody, ModalCloseButton, ModalContent, ModalOverlay} from "@chakra-ui/react";
import PrayerDetails from "@/components/prayers/PrayerDetails";
import React from "react";
import {BardMagicInfo} from "@/magus/bardMagic";
import {FireMagicInfo} from "@/magus/fireMagic";
import {WitchMagicInfo} from "@/magus/witchMagic";
import {WeaponInfo} from "@/magus/weapons";
import {WarlockMagicInfo} from "@/magus/warlockMagic";
import {SkillInfo} from "@/magus/skills";
import {PsiInfo} from "@/magus/psi";
import BardMagicDetails from "@/components/bardMagic/BardMagicDetails";
import FireMagicDetails from "@/components/fireMagic/FireMagicDetails";
import PsiDetails from "@/components/psi/PsiDetails";
import SkillDetails from "@/components/skills/SkillDetails";
import WarlockMagicDetails from "@/components/warlockMagic/WarlockMagicDetails";
import WeaponDetails from "@/components/weapons/WeaponDetails";
import WitchMagicDetails from "@/components/witchMagic/WitchMagicDetails";

export type DetailsType = "BardMagicValues" | "FireMagicValues" | "PrayerValues" | "PsiValues" | "SkillValues" | "WarlockMagicValues" | "WeaponValues" | "WitchMagicValues";

export type DetailsInfoType = BardMagicInfo | PrayerInfo | FireMagicInfo | PsiInfo | SkillInfo | WarlockMagicInfo | WeaponInfo | WitchMagicInfo;

const getDetails = (type: DetailsType, item: DetailsInfoType, param1: any = undefined) => {
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
