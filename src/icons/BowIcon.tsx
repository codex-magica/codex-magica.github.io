import { Icon, IconProps } from "@chakra-ui/react";

export const BowIcon = (props: IconProps) => (
  <Icon
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <g transform="rotate(-35 12 12)">
      {/* Bow limbs */}
      <path d="M6 4c5 3 9 7 12 12" />
      <path d="M6 20c5-3 9-7 12-12" />
      {/* Grip detail */}
      <path d="M6 11.5h1.5M6 12.5h1.5" />
      {/* String */}
      <line x1="6" y1="4" x2="6" y2="20" />
      {/* Arrow shaft */}
      <line x1="6" y1="12" x2="20" y2="12" />
      {/* Smaller simpler arrowhead */}
      <polyline points="18.5 11 20 12 18.5 13" />
      {/* Arrow fletching */}
      <polyline points="8 11 9.5 12 8 13" />
    </g>
  </Icon>
);
