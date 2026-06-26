import React from "react";
import { Box, BoxProps, useColorModeValue } from "@chakra-ui/react";

// The "Sima pergamen + Halk" surface: a faint SVG grain + a soft warm radial glow over a base
// gradient, blended into the panel, with a warm border and a top inset highlight. One reusable
// surface for every card / panel / modal.
//
// Applied via a plain inline `style` (like the prototype) rather than Chakra style props: the
// multi-layer `background-image` (with the SVG-grain data URI) must reach the DOM verbatim — routing
// it through emotion drops the whole comma-separated declaration.
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.5'/%3E%3C/svg%3E\")";

const DARK_BG =
  NOISE +
  ", radial-gradient(125% 95% at 50% -12%, oklch(0.55 0.0176 72 / 0.072), transparent 60%), linear-gradient(158deg, oklch(0.273 0.012 250), oklch(0.233 0.012 256))";
const LIGHT_BG =
  NOISE +
  ", radial-gradient(125% 95% at 50% -12%, oklch(0.86 0.009 82 / 0.09), transparent 66%), linear-gradient(158deg, oklch(0.993 0.0035 86), oklch(0.982 0.0055 84))";

const PARCH_DARK: React.CSSProperties = {
  backgroundImage: DARK_BG,
  backgroundBlendMode: "soft-light, normal, normal",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "oklch(0.36 0.016 90)",
  boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.04), 0 1px 2px oklch(0 0 0 / 0.34)",
};
const PARCH_LIGHT: React.CSSProperties = {
  backgroundImage: LIGHT_BG,
  backgroundBlendMode: "multiply, normal, normal",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "oklch(0.89 0.009 84)",
  boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.5), 0 1px 3px oklch(0.5 0.02 70 / 0.14)",
};

export const ParchPanel: React.FC<BoxProps & { style?: React.CSSProperties }> = ({ children, style, ...rest }) => {
  const parch = useColorModeValue(PARCH_LIGHT, PARCH_DARK);
  return (
    <Box borderRadius="9px" p={{ base: "20px", md: "16px" }} color="fg" style={{ ...parch, ...style }} {...rest}>
      {children}
    </Box>
  );
};
