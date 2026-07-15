import React from "react";
import { Box, Flex } from "@chakra-ui/react";
import { COMPANION_ICON_KEYS } from "../../model/companions";
import { CompanionIcon } from "./animalIcons";

// Icon palette for a companion — the animal line-icons (see animalIcons). Picking sets the icon key;
// there's no free text since the set is fixed. Used by the add-custom step and the detail modal popover.
export const IconPicker: React.FC<{ value: string; onChange: (key: string) => void }> = ({ value, onChange }) => (
  <Flex wrap="wrap" gap="6px">
    {COMPANION_ICON_KEYS.map((k) => {
      const on = value === k;
      return (
        <Box key={k} as="button" type="button" onClick={() => onChange(k)} aria-label={k}
          w="34px" h="34px" display="flex" alignItems="center" justifyContent="center"
          borderRadius="9px" border="1px solid" borderColor={on ? "accent" : "fieldBd"}
          bg={on ? "accentSoft" : "fieldBg"} color={on ? "accentTx" : "muted"} _hover={{ borderColor: "accent", color: "accentTx" }}>
          <CompanionIcon iconKey={k} size={21} />
        </Box>
      );
    })}
  </Flex>
);
