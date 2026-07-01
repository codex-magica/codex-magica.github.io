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
      // "Sima pergamen + Halk" design system (handover) — warm parchment, OKLCH light/dark pairs.
      page: { default: 'oklch(0.95 0.006 250)', _dark: 'oklch(0.205 0.016 258)' },
      sheet: { default: 'oklch(0.995 0.003 250)', _dark: 'oklch(0.247 0.016 258)' },
      fg: { default: 'oklch(0.28 0.015 258)', _dark: 'oklch(0.92 0.008 250)' },
      // fg-mut is the app's existing "muted" label color.
      muted: { default: 'oklch(0.5 0.02 255)', _dark: 'oklch(0.66 0.022 250)' },
      fgFaint: { default: 'oklch(0.63 0.018 255)', _dark: 'oklch(0.52 0.02 252)' },
      accent: { default: 'oklch(0.5 0.06 255)', _dark: 'oklch(0.7 0.05 250)' },
      accentTx: { default: 'oklch(0.46 0.07 258)', _dark: 'oklch(0.82 0.06 250)' },
      accentSoft: { default: 'oklch(0.93 0.025 250)', _dark: 'oklch(0.31 0.03 252)' },
      accentBd: { default: 'oklch(0.83 0.035 252)', _dark: 'oklch(0.42 0.04 250)' },
      accentFg: { default: 'oklch(0.99 0.005 250)', _dark: 'oklch(0.16 0.012 255)' },
      good: { default: 'oklch(0.5 0.11 152)', _dark: 'oklch(0.76 0.12 155)' },
      bad: { default: 'oklch(0.52 0.19 27)', _dark: 'oklch(0.7 0.16 25)' },
      badSoft: { default: 'oklch(0.95 0.04 27)', _dark: 'oklch(0.32 0.06 25)' },
      warn: { default: 'oklch(0.62 0.14 75)', _dark: 'oklch(0.82 0.14 85)' }, // unmet attribute requirement (yellow/amber)
      warnSoft: { default: 'oklch(0.94 0.05 80)', _dark: 'oklch(0.34 0.06 80)' }, // soft amber fill (penalised + button)
      // Warm-neutral chrome (borders, fields, steppers, tracks) — sits on the parchment.
      hair: { default: 'oklch(0.89 0.009 84)', _dark: 'oklch(0.34 0.011 95)' },
      hairSoft: { default: 'oklch(0.93 0.006 252)', _dark: 'oklch(0.29 0.013 257)' },
      rule: { default: 'oklch(0.8 0.012 252)', _dark: 'oklch(0.42 0.016 255)' },
      fieldBg: { default: 'oklch(0.987 0.005 86)', _dark: 'oklch(0.232 0.007 95)' },
      fieldBd: { default: 'oklch(0.87 0.011 84)', _dark: 'oklch(0.37 0.012 95)' },
      stepOut: { default: 'oklch(0.82 0.012 84)', _dark: 'oklch(0.46 0.013 95)' },
      band: { default: 'oklch(0.965 0.008 84)', _dark: 'oklch(0.255 0.009 95)' },
      catTx: { default: 'oklch(0.5 0.018 84)', _dark: 'oklch(0.67 0.016 95)' },
      chipBg: { default: 'oklch(0.94 0.02 250)', _dark: 'oklch(0.29 0.03 250)' },
      chipBd: { default: 'oklch(0.87 0.03 252)', _dark: 'oklch(0.4 0.04 250)' },
      // T4 teacher badge — neutral warm-grey (deliberately neutralized from violet).
      teacherBg: { default: 'oklch(0.92 0.012 84)', _dark: 'oklch(0.31 0.008 95)' },
      teacherTx: { default: 'oklch(0.5 0.02 84)', _dark: 'oklch(0.74 0.014 95)' },
      kapottBg: { default: 'oklch(0.9 0.06 152)', _dark: 'oklch(0.32 0.055 155)' },
      kapottTx: { default: 'oklch(0.4 0.11 152)', _dark: 'oklch(0.84 0.1 155)' },
      infoBg: { default: 'oklch(0.92 0.03 240)', _dark: 'oklch(0.32 0.035 240)' },
      infoTx: { default: 'oklch(0.42 0.08 240)', _dark: 'oklch(0.84 0.06 240)' },
      // Vitals (Életerő bars).
      vitHp: { default: 'oklch(0.62 0.17 25)', _dark: 'oklch(0.64 0.16 24)' },
      vitFp: { default: 'oklch(0.62 0.13 150)', _dark: 'oklch(0.66 0.13 152)' },
      vitMana: { default: 'oklch(0.6 0.12 245)', _dark: 'oklch(0.66 0.11 245)' },
      vitKegy: { default: 'oklch(0.68 0.12 80)', _dark: 'oklch(0.74 0.12 85)' },
      vitPszi: { default: 'oklch(0.54 0.16 300)', _dark: 'oklch(0.62 0.15 300)' },
      vitTrack: { default: 'oklch(0.91 0.007 84)', _dark: 'oklch(0.31 0.011 90)' },
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
