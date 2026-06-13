import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const BACKEND_PORT = process.env.PORT ?? "52817";
const DEV_PORT = 52818;

export default defineConfig({
  root: resolve(import.meta.dirname, "."),
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src"),
      "@shared": resolve(import.meta.dirname, "..", "shared"),
    },
  },
  server: {
    port: DEV_PORT,
    proxy: {
      "/api": { target: `http://localhost:${BACKEND_PORT}`, changeOrigin: true },
      "/ws": { target: `ws://localhost:${BACKEND_PORT}`, ws: true },
    },
  },
  build: {
    outDir: resolve(import.meta.dirname, "..", "..", "dist", "web"),
    emptyOutDir: true,
  },
});
