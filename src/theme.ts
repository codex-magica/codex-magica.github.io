import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  config: {
    initialColorMode: 'light', // Default color mode
  },
  fonts: {
    body: 'Warnock, sans-serif',
  },
  semanticTokens: {
    colors: {
      // Adaptive muted/secondary text — readable in both light and dark mode.
      muted: { default: 'gray.600', _dark: 'gray.400' },
    },
  },
  breakpoints: {
    base: "0px",
    md: "1200px",    // tablet + desktop are treated the same
  },
  components: {
    Table: {
      baseStyle: {
        th: {
          fontFamily: 'Warnock, sans-serif',
          fontWeight: 'bold',
          textTransform: 'none',
        },
      },
      sizes: {
        sm: {
          th: {
            fontSize: { base: "2xs", md: "sm" },
          },
          td: {
            fontSize: { base: "2xs", md: "sm" },
          },
        },
      }
    },
  },
});

export default theme;
