import type { ElectrobunConfig } from "electrobun";

/**
 * Electrobun packaging config (macOS only, PRD §1/§9). The window is opened on http://localhost
 * from desktop/main.ts, so NO `views` entry is declared — the UI is served by the in-process
 * Bun.serve from the bundled dist/web, keeping /api and /ws same-origin.
 *
 * `copy` embeds the read-only resources under Resources/app (resolved at runtime via
 * PATHS.RESOURCES_FOLDER + "/app"):
 *  - dist/web        → built SPA served statically
 *  - dist/agents     → deps-inlined worker.js + hook .js spawned per slot (KANBAN_AGENT_DIST)
 *  - templates       → run_composer.sh driver
 *  - config.example.json → seeded into the writable dataRoot on first launch
 *
 * D3: no codesign / notarize in v1 (local personal use, right-click → Open). D4: WebKit, no CEF.
 * TODO(ali): drop an App.iconset / App.icon and wire `mac.icons`; validate L0.3 on a notarized build.
 */
export default {
  app: {
    name: "Kanban Agents",
    identifier: "dev.kanban-agents.desktop",
    version: "0.0.0",
  },
  build: {
    bun: {
      entrypoint: "desktop/main.ts",
    },
    copy: {
      "dist/web": "dist/web",
      "dist/agents": "dist/agents",
      "templates/run_composer.sh": "templates/run_composer.sh",
      "config.example.json": "config.example.json",
    },
    mac: {
      codesign: false,
      notarize: false,
      bundleCEF: false,
      createDmg: false,
    },
  },
} satisfies ElectrobunConfig;
