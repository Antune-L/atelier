import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const BACKEND_PORT = process.env.PORT ?? "52817";
const DEV_PORT = 52818;
const HTTPS_PORT = 443;
const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..");

// Routes served by the Bun backend: shared by the dev server and `vite preview` (real mode).
const backendProxy = {
  "/api": { target: `http://localhost:${BACKEND_PORT}`, changeOrigin: true },
  "/ws": { target: `ws://localhost:${BACKEND_PORT}`, ws: true },
  "/uploads": { target: `http://localhost:${BACKEND_PORT}`, changeOrigin: true },
};

export default defineConfig(({ mode }) => {
  // Local custom domain served behind an HTTPS reverse proxy (e.g. atelier.bixu.fr).
  // Read from .env (project root) via loadEnv → independent of the launcher (bun/npx/IDE).
  // Undefined → standard localhost dev (default allowedHosts/HMR).
  const devHost = loadEnv(mode, PROJECT_ROOT, "").DEV_HOST;

  return {
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
      ...(devHost && {
        allowedHosts: [devHost],
        hmr: { host: devHost, clientPort: HTTPS_PORT, protocol: "wss" },
      }),
      proxy: backendProxy,
    },
    // `real` mode: frozen build served by `vite preview` (no HMR), same topology as dev.
    preview: {
      port: DEV_PORT,
      ...(devHost && { allowedHosts: [devHost] }),
      proxy: backendProxy,
    },
    build: {
      outDir: resolve(import.meta.dirname, "..", "..", "dist", "web"),
      emptyOutDir: true,
    },
  };
});
