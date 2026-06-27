/**
 * Resolves the Agent SDK's bundled native `claude` binary path.
 *
 * The SDK can auto-resolve it, but we pass it explicitly: a bare command name isn't PATH-resolved
 * (anthropics/claude-agent-sdk#205), and an explicit path gives the desktop build an override point
 * (after `extractFromBunfs`, the binary lives in a temp dir, set via KANBAN_CLAUDE_BINARY).
 */

import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/** Env override for the CLI path (set by the desktop build once it extracts the binary from $bunfs). */
const BINARY_PATH_ENV = "KANBAN_CLAUDE_BINARY";

let cached: string | null = null;

export function resolveClaudeBinary(): string {
  const override = process.env[BINARY_PATH_ENV];
  if (override && override.length > 0) return override;
  if (cached) return cached;

  const binName = process.platform === "win32" ? "claude.exe" : "claude";
  // TODO(ali): musl Linux ships a `-musl`-suffixed platform package; detect libc when we target it.
  const platformPkg = `@anthropic-ai/claude-agent-sdk-${process.platform}-${process.arch}`;
  const require = createRequire(import.meta.url);

  try {
    // Resolve the per-platform package's real install dir (handles hoisting), then the binary next to it.
    cached = join(dirname(require.resolve(`${platformPkg}/package.json`)), binName);
  } catch {
    // Fallback: the platform package sits next to the SDK package under node_modules/@anthropic-ai/.
    const sdkPkgDir = dirname(require.resolve("@anthropic-ai/claude-agent-sdk/package.json"));
    cached = join(sdkPkgDir, "..", `claude-agent-sdk-${process.platform}-${process.arch}`, binName);
  }
  return cached;
}
