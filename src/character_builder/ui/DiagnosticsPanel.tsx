import React from "react";
import { Badge, Box, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { Diagnostic } from "../engine/types";

const COLOR: Record<string, string> = { error: "red", warn: "orange", info: "blue" };

export const DiagnosticsPanel: React.FC<{ diagnostics: Diagnostic[] }> = ({ diagnostics }) => {
  if (diagnostics.length === 0) {
    return (
      <Box>
        <Heading size="sm" mb={2}>Ellenőrzés</Heading>
        <Text color="green.500" fontSize="sm">Nincs figyelmeztetés.</Text>
      </Box>
    );
  }
  return (
    <Box>
      <Heading size="sm" mb={2}>Ellenőrzés ({diagnostics.length})</Heading>
      <VStack align="stretch" spacing={1}>
        {diagnostics.map((d, i) => (
          <HStack key={i} align="start" spacing={2}>
            <Badge colorScheme={COLOR[d.severity]}>{d.severity}</Badge>
            <Text fontSize="sm">
              {d.atLevel != null ? `[${d.atLevel}. szint] ` : ""}
              {d.message}
            </Text>
          </HStack>
        ))}
      </VStack>
    </Box>
  );
};
