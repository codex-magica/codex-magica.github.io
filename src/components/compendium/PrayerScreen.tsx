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
import {PrayerInfo, PrayerSource, PrayerType, PrayerValues} from "@/data/prayers";
import SnappyModal from "@/components/ui/SnappyModal";
import {PrayerDetails, PrayerTitle} from "@/components/compendium/PrayerDetails";

export const PrayerScreen = () => {
  const [selectedItem, setSelectedItem] = useState<PrayerInfo | undefined>();

  const isMobile = useBreakpoint() === "base";

  const prayersHeader = (caption: string) => {
    return (
      <Box alignSelf="center" mt={2}>
        <Text fontSize={["md","xl"]} fontWeight="bold">{caption}</Text>
      </Box>
    );
  }

  const prayerTable = (source: PrayerSource, type?: PrayerType) => {
    return (
      <Box>
        <Table variant="simple" size="sm" layout={['fixed', 'auto']}>
          <Thead>
            <Tr>
              <Th>Fohász neve</Th>
              {!isMobile && <Th textAlign="center">Szféra</Th>}
              <Th textAlign="center">Kegy pont</Th>
              <Th textAlign="center">Fohász hossza</Th>
              <Th textAlign="center">Hatótáv</Th>
              <Th textAlign="center">Időtartam</Th>
              {!isMobile && <Th textAlign="center">Mágiaellenállás</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {PrayerValues.filter((prayer) => prayer.source === source && (!type || prayer.type === type)).map((prayer, index) => (
              <Tr key={index} bg={isHighlightedRow(index) ? '#E7E7E7' : 'inherit'} cursor="pointer" onClick={() => setSelectedItem(prayer)}>
                <Td maxW="200px" textOverflow="ellipsis"><Text textDecoration="none">{prayer.name}</Text></Td>
                {!isMobile && <Td textAlign="center">{prayer.domains.map((d) => d[0]).join(",")}</Td>}
                <Td textAlign="center">{prayer.cost}</Td>
                <Td textAlign="center">{prayer.castingTime}</Td>
                <Td textAlign="center">{prayer.range}</Td>
                <Td textAlign="center">{prayer.duration}</Td>
                {!isMobile && <Td textAlign="center">{prayer.save?.join("/") ?? '-'}</Td>}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    );
  }

  return (
    <VStack spacing={4} pb="120px">
      {prayersHeader("Általános litániák")}
      {prayerTable("Általános", "Litánia")}
      {prayersHeader("Általános rituálék")}
      {prayerTable("Általános", "Rituálé")}
      {prayersHeader("A Kis Arkánum litániái")}
      {prayerTable("Kis Arkánum", "Litánia")}
      {prayersHeader("A Kis Arkánum rituáléi")}
      {prayerTable("Kis Arkánum", "Rituálé")}
      {/*{prayersHeader("A Nagy Arkánum litániái")}*/}
      {/*{prayerTable("Nagy Arkánum", "Litánia")}*/}
      {prayersHeader("A Nagy Arkánum rituáléi")}
      {prayerTable("Nagy Arkánum", "Rituálé")}
      {/*custom god types : "Arel" | "Darton" | "Domvik" | "Dreina" | "Krad" | "Kyel" | "Ranagol" | "Sogron" | "Tharr" | "Uwel"*/}
      {prayersHeader("Arel fohászai")}
      {prayerTable("Arel")}
      {prayersHeader("Darton fohászai")}
      {prayerTable("Darton")}
      {prayersHeader("Domvik fohászai")}
      {prayerTable("Domvik")}
      {prayersHeader("Dreina fohászai")}
      {prayerTable("Dreina")}
      {prayersHeader("Krad fohászai")}
      {prayerTable("Krad")}
      {prayersHeader("Kyel fohászai")}
      {prayerTable("Kyel")}
      {prayersHeader("Ranagol fohászai")}
      {prayerTable("Ranagol")}
      {prayersHeader("Sogron fohászai")}
      {prayerTable("Sogron")}
      {prayersHeader("Tharr fohászai")}
      {prayerTable("Tharr")}
      {prayersHeader("Uwel fohászai")}
      {prayerTable("Uwel")}
      <SnappyModal
        isOpen={selectedItem !== undefined}
        onClose={() => setSelectedItem(undefined)}
        data={PrayerValues}
        selectedItem={selectedItem}
        titleFn={(spell) => <PrayerTitle spell={spell}/>}
        bodyFn={(spell) => <PrayerDetails spell={spell}/>}
      />
    </VStack>
  );
};
