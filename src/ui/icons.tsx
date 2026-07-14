import React from "react";

// Inline SVG icons that appear in more than one file. Single-use icons stay next to their component.

// The open-book glyph (learn / compendium / rules) — previously pasted in four files.
export const OpenBookIcon: React.FC<{ size?: number; strokeWidth?: number }> = ({ size = 15, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5.5h6.5a3 3 0 0 1 3 3V20a2.4 2.4 0 0 0-2.4-2.4H4z" />
    <path d="M20 5.5h-6.5a3 3 0 0 0-3 3V20a2.4 2.4 0 0 1 2.4-2.4H20z" />
  </svg>
);

// The tiny chevron that marks a chip/badge as a picker.
export const ChevronTinyIcon: React.FC<{ size?: number }> = ({ size = 8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const PlusIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
