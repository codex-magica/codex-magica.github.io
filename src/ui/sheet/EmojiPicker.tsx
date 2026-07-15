import React from "react";
import { Box, Flex, Input, Text } from "@chakra-ui/react";
import { ANIMAL_EMOJI, cleanEmoji } from "../../model/companions";

// Icon editor: a curated animal palette plus a free-text field for anything else. Empty = fall back to
// the species glyph (shown as the field's placeholder). Used by the add-custom step and the detail modal.
export const EmojiPicker: React.FC<{ value: string; fallback: string; onChange: (v: string) => void }> = ({ value, fallback, onChange }) => (
  <Box>
    <Text fontFamily="ui" fontSize="11px" color="muted" mb="5px">Ikon</Text>
    <Flex wrap="wrap" gap="5px" mb="8px">
      {ANIMAL_EMOJI.map((e) => {
        const on = value === e;
        return (
          <Box key={e} as="button" type="button" onClick={() => onChange(e)} aria-label={e}
            w="30px" h="30px" display="flex" alignItems="center" justifyContent="center" fontSize="17px" lineHeight={1}
            borderRadius="8px" border="1px solid" borderColor={on ? "accent" : "fieldBd"} bg={on ? "accentSoft" : "fieldBg"}
            _hover={{ borderColor: "accent" }}>{e}</Box>
        );
      })}
    </Flex>
    <Input size="sm" bg="fieldBg" borderColor="fieldBd" borderRadius="7px" color="fg" fontSize="15px" focusBorderColor="accent"
      w="90px" textAlign="center" value={value} placeholder={fallback}
      onChange={(e) => onChange(cleanEmoji(e.target.value))} />
  </Box>
);
