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
} from '@chakra-ui/react';
import {isHighlightedRow} from "@/components/etc/utils";

export default ({tableString}: {tableString: string}) => {
  const rawTable = tableString.split("\n\n").map((row) => row.split("\t"));
  const headerRow = rawTable.shift() ?? [];
  const maxItems = Math.max(...rawTable.map((row) => row.length));
  const adjustedHeaderRow = headerRow.concat(Array(maxItems - headerRow.length).fill(""));

  return (
    <Box>
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            {adjustedHeaderRow.map((header) => (
              <Th key={header} textAlign="center">{header}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rawTable.map((row, index) => (
            <Tr key={index} bg={isHighlightedRow(index) ? "#E7E7E7" : undefined}>
              {row.map((cell, index) => (
                <Td key={index} textAlign="center">
                  {cell.split('\n').map((line, index) => (
                    <React.Fragment key={index}>
                      {line}
                      {index !== cell.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};
