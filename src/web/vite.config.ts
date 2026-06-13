import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const BACKEND_PORT = process.env.PORT ?? "52817";
const DEV_PORT = 52818;
const HTTPS_PORT = 443;
const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..");

// Routes servies par le backend Bun : partagées par le serveur de dev et `vite preview` (mode real).
const backendProxy = {
  "/api": { target: `http://localhost:${BACKEND_PORT}`, changeOrigin: true },
  "/ws": { target: `ws://localhost:${BACKEND_PORT}`, ws: true },
  "/uploads": { target: `http://localhost:${BACKEND_PORT}`, changeOrigin: true },
};

export default defineConfig(({ mode }) => {
  // Domaine custom local servi derrière un reverse proxy HTTPS (ex: atelier.bixu.fr).
  // Lu depuis .env (racine projet) via loadEnv → indépendant du lanceur (bun/npx/IDE).
  // Non défini → dev localhost standard (allowedHosts/HMR par défaut).
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
    // Mode `real` : build figé servi par `vite preview` (pas de HMR), même topologie que le dev.
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
