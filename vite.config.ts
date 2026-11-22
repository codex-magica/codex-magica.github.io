import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
