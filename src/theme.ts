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
      // "Kódex" design system (Claude Design handoff) — OKLCH light/dark pairs.
      page: { default: 'oklch(0.95 0.006 250)', _dark: 'oklch(0.205 0.016 258)' },
      sheet: { default: 'oklch(0.995 0.003 250)', _dark: 'oklch(0.247 0.016 258)' },
      fg: { default: 'oklch(0.28 0.015 258)', _dark: 'oklch(0.92 0.008 250)' },
      // fg-mut is the app's existing "muted" label color.
      muted: { default: 'oklch(0.5 0.02 255)', _dark: 'oklch(0.66 0.022 250)' },
      fgFaint: { default: 'oklch(0.63 0.018 255)', _dark: 'oklch(0.52 0.02 252)' },
      hair: { default: 'oklch(0.9 0.008 250)', _dark: 'oklch(0.32 0.014 255)' },
      accent: { default: 'oklch(0.5 0.06 255)', _dark: 'oklch(0.7 0.05 250)' },
      accentTx: { default: 'oklch(0.46 0.07 258)', _dark: 'oklch(0.8 0.05 250)' },
      accentSoft: { default: 'oklch(0.93 0.025 250)', _dark: 'oklch(0.31 0.03 252)' },
      accentFg: { default: 'oklch(0.99 0.005 250)', _dark: 'oklch(0.16 0.012 255)' },
      good: { default: 'oklch(0.5 0.11 152)', _dark: 'oklch(0.76 0.12 155)' },
      bad: { default: 'oklch(0.52 0.19 27)', _dark: 'oklch(0.7 0.16 25)' },
      fieldBg: { default: 'oklch(0.99 0.004 250)', _dark: 'oklch(0.225 0.015 258)' },
      fieldBd: { default: 'oklch(0.87 0.01 252)', _dark: 'oklch(0.35 0.015 255)' },
      chipBg: { default: 'oklch(0.94 0.02 250)', _dark: 'oklch(0.29 0.03 250)' },
      chipBd: { default: 'oklch(0.87 0.03 252)', _dark: 'oklch(0.4 0.04 250)' },
      band: { default: 'oklch(0.96 0.008 250)', _dark: 'oklch(0.255 0.016 258)' },
      teacherBg: { default: 'oklch(0.92 0.03 280)', _dark: 'oklch(0.32 0.03 280)' },
      teacherTx: { default: 'oklch(0.45 0.09 280)', _dark: 'oklch(0.82 0.06 280)' },
      kapottBg: { default: 'oklch(0.9 0.06 152)', _dark: 'oklch(0.32 0.055 155)' },
      kapottTx: { default: 'oklch(0.4 0.11 152)', _dark: 'oklch(0.84 0.1 155)' },
      infoBg: { default: 'oklch(0.92 0.035 240)', _dark: 'oklch(0.32 0.04 240)' },
      infoTx: { default: 'oklch(0.42 0.09 240)', _dark: 'oklch(0.84 0.07 240)' },
      catTx: { default: 'oklch(0.5 0.025 255)', _dark: 'oklch(0.68 0.03 250)' },
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
