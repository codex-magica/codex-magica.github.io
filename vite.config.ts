import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Hosting under a subpath (GitHub Pages serves project sites at /<repo>/): set BASE_PATH=/<repo>/.
const base = process.env.BASE_PATH || "/";
// DISABLE_PWA=true builds without the service worker, for hosting behind a per-request auth gate
// (see examples/aws-infra): a cached app would never reach the gate again.
const disablePwa = process.env.DISABLE_PWA === "true";

export default defineConfig({
  base,
  plugins: [
    react(),
    // Installable, offline-capable app: the service worker precaches the whole build, so the app
    // opens with no connection at the table. New versions are announced in-app (UpdateBanner),
    // never applied mid-session behind the user's back.
    VitePWA({
      disable: disablePwa,
      registerType: "prompt",
      manifest: {
        name: "Codex Magica",
        short_name: "Codex Magica",
        description: "M.A.G.U.S. kompendium és karakterlap",
        lang: "hu",
        start_url: ".",
        scope: ".",
        display: "standalone",
        theme_color: "#000000",
        background_color: "#1c2129", // splash screen matches the icon tile (the app's card colour)
        icons: [
          { src: "logo192.png", sizes: "192x192", type: "image/png" },
          { src: "logo512.png", sizes: "512x512", type: "image/png" },
          { src: "logo512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,png,ico,svg}"],
        globIgnores: ["**/*-dev.*"],
        // the main chunk (~2.4 MB, mostly rules data) is above Workbox's 2 MiB default
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // index.html versions its icon URLs (?v=N) to bust Safari's favicon cache; serve them from the
        // precache anyway, so they still load offline
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
      },
    }),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { port: 3000 },
  preview: { port: 3000 },
  build: {
    outDir: "dist",
    // One ~760 kB (gzip) chunk, mostly the rules data every screen needs at startup; splitting it
    // wouldn't make the first paint faster, so only warn well above that.
    chunkSizeWarningLimit: 3000,
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    // The golden snapshots were recorded under Jest 27; keep its serializer settings so they stay
    // byte-identical (a snapshot change must mean the rules changed, not the test runner).
    snapshotFormat: { escapeString: true, printBasicPrototype: true },
  },
});
