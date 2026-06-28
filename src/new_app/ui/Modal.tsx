import React from "react";
import { Box } from "@chakra-ui/react";
import { ParchPanel } from "./ParchPanel";

// Shared modal scaffolding. Every dialog in the app is a fixed dimmed overlay holding a centred
// ParchPanel; clicking the backdrop closes it, clicking the panel doesn't. Previously copy-pasted
// into DetailModal, WeaponModal, VitalModal and InventoryQtyModal.

export const ModalShell: React.FC<{
  onClose: () => void;
  width: string; // e.g. "min(360px, 100%)"
  maxH?: string;
  zIndex?: number;
  overlayPad?: string;
  children: React.ReactNode;
}> = ({ onClose, width, maxH = "92vh", zIndex = 45, overlayPad = "20px", children }) => (
  <Box position="fixed" inset={0} zIndex={zIndex} bg="rgba(16,14,24,.55)" display="flex" alignItems="center" justifyContent="center" p={overlayPad} onClick={onClose}>
    <ParchPanel onClick={(e: React.MouseEvent) => e.stopPropagation()} borderRadius="12px" p={0} w={width} maxH={maxH} display="flex" flexDirection="column" overflow="hidden" style={{ boxShadow: "0 24px 64px rgba(0,0,0,.42)" }}>
      {children}
    </ParchPanel>
  </Box>
);

const CLOSE = {
  sm: { box: "30px", top: "13px", right: "14px", fs: "14px" },
  md: { box: "32px", top: "14px", right: "16px", fs: "15px" },
};

// The absolute "✕" in a modal header. `size` is the only thing that varied between dialogs.
export const ModalCloseButton: React.FC<{ onClose: () => void; size?: "sm" | "md" }> = ({ onClose, size = "sm" }) => {
  const c = CLOSE[size];
  return (
    <Box as="button" type="button" onClick={onClose} position="absolute" top={c.top} right={c.right} w={c.box} h={c.box} borderRadius="8px" border="1px solid" borderColor="hair" bg="fieldBg" color="muted" fontSize={c.fs} display="inline-flex" alignItems="center" justifyContent="center">
      ✕
    </Box>
  );
};

// The centred, bottom-ruled header block with the close button. `children` is the title/subtitle.
export const ModalHeader: React.FC<{
  onClose: () => void;
  closeSize?: "sm" | "md";
  px?: string;
  pt?: string;
  pb?: string;
  children: React.ReactNode;
}> = ({ onClose, closeSize = "sm", px = "24px", pt = "18px", pb = "13px", children }) => (
  <Box position="relative" px={px} pt={pt} pb={pb} borderBottom="1px solid" borderColor="rule" textAlign="center">
    <ModalCloseButton onClose={onClose} size={closeSize} />
    {children}
  </Box>
);
