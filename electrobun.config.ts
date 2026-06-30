import type { ElectrobunConfig } from "electrobun";

/**
 * Electrobun packaging config (macOS only, PRD §1/§9). The window is opened on http://localhost
 * from desktop/index.ts, so NO `views` entry is declared — the UI is served by the in-process
 * Bun.serve from the bundled dist/web, keeping /api and /ws same-origin.
 *
 * `copy` embeds the read-only resources under Resources/app (resolved at runtime via
 * PATHS.RESOURCES_FOLDER + "/app"):
 *  - dist/web        → built SPA served statically
 *  - claude-bin      → the Agent SDK's native `claude` binary (the agents run it in-process); the
 *                      desktop main points KANBAN_CLAUDE_BINARY at this path (see desktop/index.ts)
 *  - codex-bin       → the Codex SDK's native `codex` binary, same reasoning, pointed at via
 *                      KANBAN_CODEX_BINARY (codexBinary.ts's override — the SDK resolves the
 *                      binary itself otherwise, see codexBinary.ts's doc comment)
 *  - templates       → run_composer.sh driver
 *  - config.example.json → seeded into the writable dataRoot on first launch
 *
 * D3: no codesign / notarize in v1 (local personal use, right-click → Open). D4: WebKit, no CEF.
 * App icon: icon.iconset (generated from src/web/public/favicon.svg), converted to .icns by electrobun.
 * TODO(ali): validate L0.3 on a notarized build.
 * TODO(ali): single-arch (darwin-arm64) embed — generalize to the host arch + confirm electrobun's
 * copy preserves the +x bit on the ~212 MB claude-bin / codex-bin binaries before shipping a
 * packaged build. codex-bin's source path is predicted from @openai/codex's resolution logic
 * (confirmed for linux-x64 by `bun install`: node_modules/@openai/codex-linux-x64/vendor/
 * x86_64-unknown-linux-musl/bin/codex) — re-verify the darwin-arm64 path once built on macOS.
 */
export default {
  app: {
    name: "Atelier",
    identifier: "dev.kanban-agents.desktop",
    version: "0.0.0",
  },
  build: {
    bun: {
      entrypoint: "desktop/index.ts",
    },
    copy: {
      "dist/web": "dist/web",
      "node_modules/@anthropic-ai/claude-agent-sdk-darwin-arm64/claude": "claude-bin",
      "node_modules/@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/bin/codex": "codex-bin",
      "templates/run_composer.sh": "templates/run_composer.sh",
      "config.example.json": "config.example.json",
    },
    mac: {
      icons: "icon.iconset",
      codesign: false,
      notarize: false,
      bundleCEF: false,
      createDmg: false,
    },
  },
} satisfies ElectrobunConfig;
