import React from "react";
import { Box, BoxProps, useColorModeValue } from "@chakra-ui/react";

// The "Sima pergamen + Halk" surface: a faint SVG grain + a soft warm radial glow over a base
// gradient, blended into the panel, with a warm border and a top inset highlight. One reusable
// surface for every card / panel / modal.
//
// The multi-layer `background-image` (with the SVG-grain data URI) is applied via inline `style` —
// routing it through emotion drops the whole comma-separated declaration. Border + shadow go through
// Chakra props so callers can still override them on `_hover` (e.g. the roster cards lift on hover).
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.5'/%3E%3C/svg%3E\")";

const DARK_BG =
  NOISE +
  ", radial-gradient(125% 95% at 50% -12%, oklch(0.55 0.0176 72 / 0.072), transparent 60%), linear-gradient(158deg, oklch(0.273 0.012 250), oklch(0.233 0.012 256))";
const LIGHT_BG =
  NOISE +
  ", radial-gradient(125% 95% at 50% -12%, oklch(0.86 0.009 82 / 0.09), transparent 66%), linear-gradient(158deg, oklch(0.993 0.0035 86), oklch(0.982 0.0055 84))";

export const useParchmentHoverShadow = () =>
  useColorModeValue(
    "inset 0 1px 0 oklch(1 0 0 / 0.6), 0 12px 30px oklch(0.5 0.04 70 / 0.2)",
    "inset 0 1px 0 oklch(1 0 0 / 0.05), 0 10px 28px oklch(0 0 0 / 0.4)"
  );

export const ParchPanel: React.FC<BoxProps & { style?: React.CSSProperties }> = ({ children, style, ...rest }) => {
  const backgroundImage = useColorModeValue(LIGHT_BG, DARK_BG);
  const backgroundBlendMode = useColorModeValue("multiply, normal, normal", "soft-light, normal, normal");
  const borderColor = useColorModeValue("oklch(0.89 0.009 84)", "oklch(0.36 0.016 90)");
  const boxShadow = useColorModeValue(
    "inset 0 1px 0 oklch(1 0 0 / 0.5), 0 1px 3px oklch(0.5 0.02 70 / 0.14)",
    "inset 0 1px 0 oklch(1 0 0 / 0.04), 0 1px 2px oklch(0 0 0 / 0.34)"
  );
  return (
    <Box
      borderRadius="9px"
      p={{ base: "20px", md: "16px" }}
      color="fg"
      border="1px solid"
      borderColor={borderColor}
      boxShadow={boxShadow}
      style={{ backgroundImage, backgroundBlendMode, ...style }}
      {...rest}
    >
      {children}
    </Box>
  );
};
