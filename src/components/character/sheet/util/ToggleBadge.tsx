import { Button, ButtonProps } from "@chakra-ui/react";
import React from "react";

interface ToggleBadgeProps extends Omit<ButtonProps, "onClick"> {
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function ToggleBadge({ active, onToggle, children, ...rest }: ToggleBadgeProps) {
  return (
    <Button
      size="sm"
      variant={active ? "solid" : "outline"}
      colorScheme="blackAlpha"
      onClick={onToggle}
      {...rest}
    >
      {children}
    </Button>
  );
}
