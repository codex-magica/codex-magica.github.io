import React from "react";
import { Box, Heading, HStack, Text, useColorModeValue } from "@chakra-ui/react";
import { Diagnostic } from "../engine/types";

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const warnBg = useColorModeValue("orange.100", "orange.900");
  const warnTx = useColorModeValue("orange.700", "orange.200");
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    info: { bg: "infoBg", color: "infoTx", label: "Info" },
    warn: { bg: warnBg, color: warnTx, label: "Figyelem" },
    error: { bg: "bad", color: "accentFg", label: "Hiba" },
  };
  const s = styles[severity] || styles.info;
  const isError = severity === "error";
  return (
    <Box
      as="span"
      flexShrink={0}
      mt="1px"
      fontFamily="system-ui"
      fontSize="10px"
      fontWeight={700}
      letterSpacing=".06em"
      textTransform="uppercase"
      px="8px"
      py="3px"
      borderRadius="6px"
      bg={isError ? "bad" : s.bg}
      color={isError ? "accentFg" : s.color}
    >
      {s.label}
    </Box>
  );
};

export const DiagnosticsPanel: React.FC<{ diagnostics: Diagnostic[] }> = ({ diagnostics }) => {
  return (
    <Box>
      <Heading fontSize={{ base: "23px", md: "20px" }} fontWeight={700} mb={2} color="fg">
        Ellenőrzés{diagnostics.length > 0 ? ` (${diagnostics.length})` : ""}
      </Heading>
      {diagnostics.length === 0 ? (
        <Text color="good" fontFamily="system-ui" fontSize="13px">Nincs figyelmeztetés.</Text>
      ) : (
        <Box>
          {diagnostics.map((d, i) => (
            <HStack key={i} align="start" spacing="9px" py={{ base: "10px", md: "7px" }} borderBottom={i === diagnostics.length - 1 ? undefined : "1px solid"} borderColor="hair">
              <SeverityBadge severity={d.severity} />
              <Text fontFamily="system-ui" fontSize="13px" color="muted" lineHeight="1.5">
                {d.atLevel != null ? `[${d.atLevel}. szint] ` : ""}
                {d.message}
              </Text>
            </HStack>
          ))}
        </Box>
      )}
    </Box>
  );
};
