import { fileURLToPath, URL } from "node:url";
import { readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig } from "vitest/config";
import type { Plugin, ResolvedConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA, type ManifestOptions } from "vite-plugin-pwa";

// Hosting under a subpath (GitHub Pages serves project sites at /<repo>/): set BASE_PATH=/<repo>/.
const base = process.env.BASE_PATH || "/";

// Oldest browsers the build supports. The floor is set by the CSS: the theme's oklch() colors need
// Safari / iOS / iPadOS 15.4, Chrome and Edge 111, Firefox 113 (older ones show transparent backgrounds),
// and Drive sync's Web Locks need Safari 15.4 too. iOS 15 still runs on the iPad Air 2 and iPad mini 4.
const BROWSER_TARGET = ["es2022", "safari15.4", "ios15.4", "chrome111", "firefox113", "edge111"];

const manifest: Partial<ManifestOptions> = {
  name: "Codex Magica",
  short_name: "Codex Magica",
  description: "M.A.G.U.S. kompendium és karakterlap",
  lang: "hu",
  start_url: ".",
  scope: ".",
  display: "standalone",
  theme_color: "#13171f",
  background_color: "#13171f", // launch/splash screen: the app's dark page colour (the `page` token)
  icons: [
    { src: "logo192.png", sizes: "192x192", type: "image/png" },
    { src: "logo512.png", sizes: "512x512", type: "image/png" },
    { src: "logo512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

// The DEV-badged icons (public/*-dev.*) are only for the local dev server; Vite copies all of public/
// into the build, so they're removed from the output afterwards.
const dropDevIcons = (): Plugin => {
  let outDir = "";
  return {
    name: "codex-magica-drop-dev-icons",
    apply: "build",
    configResolved(config: ResolvedConfig) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      for (const f of readdirSync(outDir)) if (/-dev\./.test(f)) rmSync(join(outDir, f));
    },
  };
};

export default defineConfig({
  base,
  plugins: [
    react(),
    dropDevIcons(),
    // Installable, offline-capable app: the service worker precaches the whole build, so the app
    // opens with no connection at the table. New versions are announced in-app (UpdateBanner),
    // never applied mid-session behind the user's back.
    VitePWA({
      registerType: "prompt",
      manifest,
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,png,ico,svg}"],
        globIgnores: ["**/*-dev.*", "**/social-preview.png"], // the link-preview image isn't needed offline
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
    target: BROWSER_TARGET,
    cssTarget: BROWSER_TARGET,
    outDir: "dist",
    // the licenses of the bundled libraries, shipped next to the app (third-party-licenses.md)
    license: { fileName: "third-party-licenses.md" },
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
