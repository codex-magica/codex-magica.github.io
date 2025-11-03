import React from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  VStack,
  Text, Modal, ModalOverlay, ModalContent, ModalCloseButton, ModalBody, useBreakpoint,
} from '@chakra-ui/react';
import {isHighlightedRow} from "@/components/etc/utils";
import Triggerable from "@/components/etc/Triggerable";
import {WeaponInfo, WeaponType, WeaponValues} from "@/data/weapons";
import WeaponDetails from "@/components/compendium/WeaponDetails";

export default () => {
  const isMobile = useBreakpoint() === "base";

  const weaponsHeader = (caption: string) => {
    return (
      <Box alignSelf="center" mt={2}>
        <Text fontSize={["md","xl"]} fontWeight="bold">{caption}</Text>
      </Box>
    );
  }
  const weaponsSubHeader = (subCaption: string) => {
    return (
      <Box alignSelf="center" mt={2}>
        <Text fontSize={["sm","lg"]} fontWeight="bold">{subCaption}</Text>
      </Box>
    );
  }

  const weaponsModal = (weapon: WeaponInfo) => {
    return (
      <Modal isOpen={false}  onClose={()=>{}} size="xl" scrollBehavior="inside" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody>
            <WeaponDetails weapon={weapon} />
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  const weaponsTable = (type: WeaponType, subType: string) => {
    return (
      <Box>
        <Table variant="simple" size="sm" layout={['fixed', 'auto']}>
          <Thead>
            <Tr>
              <Th>Fegyver</Th>
              <Th textAlign="center">Időigény</Th>
              <Th textAlign="center">Sebzés</Th>
              {!isMobile && <Th textAlign="center">KÉ</Th>}
              {!isMobile && type !== "ranged" && <Th textAlign="center">TÉ</Th>}
              {!isMobile && type === "ranged" && <Th textAlign="center">CÉ</Th>}
              {!isMobile && <Th textAlign="center">VÉ</Th>}
              {!isMobile && type === "ranged" && <Th textAlign="center">Táv</Th>}
              {!isMobile && <Th textAlign="center">Súly</Th>}
              {!isMobile && <Th textAlign="center">Ár</Th>}
              {!isMobile && <Th textAlign="center">Lefegyverzés</Th>}
              {!isMobile && <Th textAlign="center">Fegyvertörés</Th>}
              <Th textAlign="center">Átütés</Th>
              {!isMobile && <Th textAlign="center">STP</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {WeaponValues.filter((weapon) => weapon.type === type && weapon.subType === subType)
              .map((weapon, index) => (
                <Triggerable trigger={
                  <Tr key={weapon.name} bg={isHighlightedRow(index) ? '#E7E7E7' : 'inherit'} cursor="pointer">
                    <Td maxW="200px" textOverflow="ellipsis"><Text textDecoration="none">{weapon.name}</Text></Td>
                    <Td textAlign="center">{weapon.attackDuration}</Td>
                    <Td textAlign="center">{weapon.damage}</Td>
                    {!isMobile && <Td textAlign="center">{weapon.KÉ}</Td>}
                    {!isMobile && type !== "ranged" && <Td textAlign="center">{weapon.TÉ}</Td>}
                    {!isMobile && type === "ranged" && <Td textAlign="center">{weapon.CÉ}</Td>}
                    {!isMobile && <Td textAlign="center">{weapon.VÉ}</Td>}
                    {!isMobile && type === "ranged" && <Td textAlign="center">{weapon.range}</Td>}
                    {!isMobile && <Td textAlign="center">{weapon.weight}</Td>}
                    {!isMobile && <Td textAlign="center">{weapon.cost}</Td>}
                    {!isMobile && <Td textAlign="center">{weapon.canDisarm ? 'igen' : 'nem'}</Td>}
                    {!isMobile && <Td textAlign="center">{weapon.canDestroyWeapons ? 'igen' : 'nem'}</Td>}
                    <Td textAlign="center">{weapon.canPierce ? 'igen' : 'nem'}</Td>
                    {!isMobile && <Td textAlign="center">{weapon.STP}</Td>}
                  </Tr>
                }>
                  {weaponsModal(weapon)}
                </Triggerable>
            ))}
          </Tbody>
        </Table>
      </Box>
    );
  }


  return (
    <VStack spacing={4} pb="120px">
      {weaponsHeader("1. Méretkategória")}
      {weaponsSubHeader("Ököltávolságban alkalmazott fegyverek")}
      {weaponsTable(1, "Ököltávolságban alkalmazott fegyverek")}

      {weaponsHeader("2. Méretkategória")}
      {weaponsSubHeader("Tőr jellegű fegyverek")}
      {weaponsTable(2, "Tőr jellegű fegyverek")}

      {weaponsHeader("3. Méretkategória")}
      {weaponsSubHeader("Egykezes kardok")}
      {weaponsTable(3, "Egykezes kardok")}
      {weaponsSubHeader("Csatabárdok")}
      {weaponsTable(3, "Csatabárdok")}
      {weaponsSubHeader("Buzogányok")}
      {weaponsTable(3, "Buzogányok")}
      {weaponsSubHeader("Botok")}
      {weaponsTable(3, "Botok")}

      {weaponsHeader("4. Méretkategória")}
      {weaponsSubHeader("Nehézkardok")}
      {weaponsTable(4, "Nehézkardok")}
      {weaponsSubHeader("Nehéz csatabárdok")}
      {weaponsTable(4, "Nehéz csatabárdok")}
      {weaponsSubHeader("Buzogányok")}
      {weaponsTable(4, "Buzogányok")}
      {weaponsSubHeader("Botok")}
      {weaponsTable(4, "Botok")}

      {weaponsHeader("5. Méretkategória")}
      {weaponsSubHeader("Nyeles fegyverek")}

      {weaponsHeader("Hajítófegyverek")}
      {weaponsTable("ranged", "Hajítófegyverek")}

      {weaponsHeader("Íjak")}
      {weaponsTable("ranged", "Íjak")}

      {weaponsHeader("Nyílpuskák")}
      {weaponsTable("ranged", "Nyílpuskák")}

      {weaponsHeader("Egyéb célzófegyverek")}
      {weaponsTable("ranged", "Egyéb célzófegyverek")}
    </VStack>
  );
};
