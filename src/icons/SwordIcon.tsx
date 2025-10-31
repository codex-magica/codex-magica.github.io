import { Icon, IconProps } from "@chakra-ui/react";

export const SwordIcon = (props: IconProps) => (
  <Icon
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <g transform="rotate(45 12 12)">
      {/* Blade */}
      <path d="M12 3l0 11" />
      {/* Point */}
      <path d="M12 3l2 2-2-5-2 5 2-2z" />
      {/* Crossguard */}
      <path d="M9 11h6" />
      {/* Handle */}
      <path d="M12 14l0 5" />
      {/* Pommel */}
      <circle cx="12" cy="20" r="1" />
    </g>
  </Icon>
);
