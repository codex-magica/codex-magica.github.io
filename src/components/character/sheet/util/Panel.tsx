import { ReactNode } from "react";
import { Box, Flex, Text, Divider } from "@chakra-ui/react";

interface CharacterSheetPanelProps {
  title: string;
  utility?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md";
}

export default function Panel({ title, utility, size = "md", children }: CharacterSheetPanelProps) {

  const isSmall = size === "sm";

  return (
    <Box w="100%">
      {/* Top bar */}
      <Flex align="center" justify="space-between">
        <Text fontSize={isSmall ? "sm" : "lg"} fontWeight={isSmall ? 600 : 600}>{title}</Text>
        {utility && <Box>{utility}</Box>}
      </Flex>

      <Divider borderWidth={isSmall ? "0.5px" : "1px"} borderColor="blackAlpha.700"/>

      {/* Body */}
      <Box p={2}>{children}</Box>
    </Box>
  );
}
