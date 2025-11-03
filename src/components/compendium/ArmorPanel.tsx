import React, {useState} from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  VStack,
  Text, useBreakpoint,
} from '@chakra-ui/react';
import {isHighlightedRow} from "@/components/etc/utils";
import SnappyModal from "@/components/ui/SnappyModal";
import {ArmorInfo, ArmorValues, ShieldInfo, ShieldValues} from "@/data/armor";
import {ArmorDetails, ArmorTitle, ShieldDetails, ShieldTitle} from "@/components/compendium/ArmorDetails";

export default () => {
  const [selectedShield, setSelectedShield] = useState<ShieldInfo | undefined>();
  const [selectedArmor, setSelectedArmor] = useState<ArmorInfo | undefined>();

  const isMobile = useBreakpoint() === "base";



  return (
    <VStack spacing={4} pb="120px">
      <Box alignSelf="center" mt={2}>
        <Text fontSize={["md","xl"]} fontWeight="bold">Pajzsok</Text>
      </Box>
      <Box>
        <Table variant="simple" size="sm" layout={['fixed', 'auto']}>
          <Thead>
            <Tr>
              <Th>Vértezet</Th>
              { !isMobile && <Th textAlign="center">Időigény</Th>}
              { !isMobile && <Th textAlign="center">Sebzés</Th>}
              { !isMobile && <Th textAlign="center">KÉ</Th>}
              { !isMobile && <Th textAlign="center">TÉ</Th>}
              <Th textAlign="center">VÉ</Th>
              { !isMobile && <Th textAlign="center">Súly</Th>}
              <Th textAlign="center">Ár</Th>
              <Th textAlign="center">MGT</Th>
            </Tr>
          </Thead>
          <Tbody>
            {ShieldValues.map((shield, index) => (
              <Tr key={index} bg={isHighlightedRow(index) ? '#E7E7E7' : 'inherit'} cursor="pointer" onClick={() => setSelectedShield(shield)}>
                <Td maxW="200px" textOverflow="ellipsis"><Text textDecoration="none">{shield.name}</Text></Td>
                { !isMobile && <Td textAlign="center">{shield.attackDuration ?? '-'}</Td>}
                { !isMobile && <Td textAlign="center">{shield.damage ?? '-'}</Td>}
                { !isMobile && <Td textAlign="center">{shield.KÉ}</Td>}
                { !isMobile && <Td textAlign="center">{shield.TÉ}</Td>}
                <Td textAlign="center">{shield.VÉ}</Td>
                { !isMobile && <Td textAlign="center">{shield.weight}</Td>}
                <Td textAlign="center">{shield.cost}</Td>
                <Td textAlign="center">{shield.MGT}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>



      <Box alignSelf="center" mt={2}>
        <Text fontSize={["md","xl"]} fontWeight="bold">Vértezetek</Text>
      </Box>
      <Box>
        <Table variant="simple" size="sm" layout={['fixed', 'auto']}>
          <Thead>
            <Tr>
              <Th>Vértezet</Th>
              <Th textAlign="center">MGT</Th>
              <Th textAlign="center">SFÉ</Th>
              { !isMobile && <Th textAlign="center">Súly</Th>}
              <Th textAlign="center">Ár</Th>
              { !isMobile && <Th textAlign="center">STP</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {ArmorValues.map((armor, index) => (
              <Tr key={index} bg={isHighlightedRow(index) ? '#E7E7E7' : 'inherit'} cursor="pointer" onClick={() => setSelectedArmor(armor)}>
                <Td maxW="200px" textOverflow="ellipsis"><Text textDecoration="none">{armor.name}</Text></Td>
                <Td textAlign="center">{armor.MGT}</Td>
                <Td textAlign="center">{armor.SFÉ}</Td>
                { !isMobile && <Td textAlign="center">{armor.weight}</Td>}
                <Td textAlign="center">{armor.cost ?? '-'}</Td>
                { !isMobile && <Td textAlign="center">{armor.STP}</Td>}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <SnappyModal
        isOpen={selectedShield!== undefined}
        onClose={() => setSelectedShield(undefined)}
        data={ShieldValues}
        selectedItem={selectedShield}
        titleFn={(shield) => <ShieldTitle shield={shield}/>}
        bodyFn={(shield) => <ShieldDetails shield={shield}/>}
      />
      <SnappyModal
        isOpen={selectedArmor !== undefined}
        onClose={() => setSelectedArmor(undefined)}
        data={ArmorValues}
        selectedItem={selectedArmor}
        titleFn={(armor) => <ArmorTitle armor={armor}/>}
        bodyFn={(armor) => <ArmorDetails armor={armor}/>}
      />
    </VStack>
  );
};
