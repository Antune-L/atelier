import type { ElectrobunConfig } from "electrobun";

/**
 * Electrobun packaging config (macOS only, PRD §1/§9). The window is opened on http://localhost
 * from desktop/index.ts, so NO `views` entry is declared — the UI is served by the in-process
 * Bun.serve from the bundled dist/web, keeping /api and /ws same-origin.
 *
 * `copy` embeds the read-only resources under Resources/app (resolved at runtime via
 * PATHS.RESOURCES_FOLDER + "/app"):
 *  - dist/web        → built SPA served statically
 *  - codex-bin       → the Codex SDK's native `codex` binary (Apache-2.0, redistributable), pointed
 *                      at via KANBAN_CODEX_BINARY (codexBinary.ts's override — the SDK resolves the
 *                      binary itself otherwise, see codexBinary.ts's doc comment)
 *  - codex-code-mode-host → codex's companion binary for MCP tool execution ("code mode"); codex
 *                      resolves it as a sibling of its own executable, so it must land next to
 *                      codex-bin or every MCP tool call dies with "codex-code-mode-host not found"
 *  - templates       → run_composer.sh driver
 *  - config.example.json → seeded into the writable dataRoot on first launch
 *
 * The `claude` binary is deliberately NOT embedded: it is proprietary (no redistribution grant), so
 * the server provisions it at runtime instead — user-install detection, else a pinned npm download
 * (see src/server/system/claudeBinary.ts). This also keeps the DMG ~220 MB lighter.
 *
 * Release builds: scripts/release-desktop.ts sets ATELIER_VERSION (from the git tag) and
 * ATELIER_RELEASE=1 (turns on the DMG). Dev `build:desktop` keeps 0.0.0 and skips the DMG.
 *
 * D3: no codesign / notarize in v1 (unsigned: Settings → Privacy & Security → "Open Anyway", or
 * `xattr -dr com.apple.quarantine`). D4: WebKit, no CEF.
 * App icon: icon.iconset (generated from src/web/public/favicon.svg), converted to .icns by electrobun.
 * TODO(ali): validate L0.3 on a notarized build.
 * TODO(ali): single-arch (darwin-arm64) embed — generalize to the host arch when we target more.
 */
export default {
  app: {
    name: "Atelier",
    identifier: "com.antune.atelier",
    version: process.env.ATELIER_VERSION ?? "0.0.0",
  },
  scripts: {
    // Fails the build if the embedded codex binaries lost their +x bit — must run as a hook: the
    // stable pipeline re-packages the .app into a self-extracting bundle right after postBuild.
    postBuild: "scripts/verifyDesktopBundle.ts",
  },
  build: {
    bun: {
      entrypoint: "desktop/index.ts",
    },
    copy: {
      "dist/web": "dist/web",
      "node_modules/@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/bin/codex": "codex-bin",
      "node_modules/@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/bin/codex-code-mode-host": "codex-code-mode-host",
      "templates/run_composer.sh": "templates/run_composer.sh",
      "config.example.json": "config.example.json",
    },
    mac: {
      icons: "icon.iconset",
      codesign: false,
      notarize: false,
      bundleCEF: false,
      createDmg: process.env.ATELIER_RELEASE === "1",
    },
  },
} satisfies ElectrobunConfig;
