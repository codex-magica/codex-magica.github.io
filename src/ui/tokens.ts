// Shared style tokens for the UI layer (the Chakra theme lives at src/theme.ts).
// These were previously copy-pasted per file.

// Field/select chrome shared by every text input and dropdown. Spread onto a Chakra Input/Select.
// (Selects additionally pass `size="sm"`: `{ ...FIELD_SX, size: "sm" }`.)
export const FIELD_SX = {
  bg: "fieldBg",
  borderColor: "fieldBd",
  borderRadius: "9px",
  color: "fg",
  focusBorderColor: "accent",
} as const;

// Responsive scales shared by the creator panels (skills, point-buy, attributes, backgrounds).
// Note: CharacterSheet intentionally uses a tighter scale of its own — don't fold it in here.
export const FS_NAME = { base: "19px", md: "16px" };
export const ROW_PY = { base: "11px", md: "8px" };
export const BTN_H = { base: "44px", md: "34px" };
