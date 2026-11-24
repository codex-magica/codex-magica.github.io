import React from "react";
import { Box, BoxProps, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";

const calloutIn = keyframes`from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; }`;

const WarnIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const InfoIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export interface CalloutAction {
  label: string;
  onClick: () => void;
}

// A boxed message: a warning (something needs the player, or failed) or a notice. Fades in when it
// appears; give it a new `key` to show that a repeated attempt ended the same way.
export const Callout: React.FC<{ kind: "warn" | "info"; actions?: CalloutAction[]; children: React.ReactNode } & Omit<BoxProps, "children">> = ({ kind, actions, children, ...box }) => (
  <Box role={kind === "warn" ? "alert" : "status"} display="flex" gap="10px" alignItems="flex-start" p="10px 12px" borderRadius="10px" border="1px solid"
    borderColor={kind === "warn" ? "warn" : "accentBd"} bg={kind === "warn" ? "warnSoft" : "accentSoft"} fontFamily="system-ui" fontSize="13.5px" color="fg"
    lineHeight="1.5" textAlign="left" animation={`${calloutIn} .2s ease`} {...box}>
    <Box as="span" aria-hidden="true" flexShrink={0} mt="1px" color={kind === "warn" ? "warn" : "accentTx"} lineHeight={0}>
      {kind === "warn" ? WarnIcon : InfoIcon}
    </Box>
    <Box flex="1" minW={0}>
      <Text>{children}</Text>
      {actions && actions.length > 0 && (
        <Box display="flex" flexWrap="wrap" gap="8px" mt="8px">
          {actions.map((a) => (
            <Box key={a.label} as="button" type="button" onClick={a.onClick} px="11px" py="5px" borderRadius="8px" border="1px solid" borderColor={kind === "warn" ? "warn" : "accentBd"}
              bg="sheet" color="fg" fontSize="13px" fontWeight={700}>
              {a.label}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  </Box>
);
