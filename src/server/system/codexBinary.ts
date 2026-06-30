/**
 * Resolves the desktop build's override path for the Codex CLI binary.
 *
 * Unlike Claude's Agent SDK, `@openai/codex-sdk`'s `Codex` class resolves the native `codex` binary
 * itself when constructed with no `codexPathOverride` (it `require.resolve`s `@openai/codex`, then
 * the matching `@openai/codex-${platform}-${arch}` optional-dependency package, then the binary under
 * its `vendor/<target-triple>/bin/` — see `@openai/codex`'s `exec.ts`). So this module only needs to
 * surface the desktop build's override point (after extraction from $bunfs), mirroring the env half
 * of claudeBinary.ts without replicating its package-resolution half.
 */

/** Env override for the CLI path (set by the desktop build once it extracts the binary from $bunfs). */
const BINARY_PATH_ENV = "KANBAN_CODEX_BINARY";

/** Returns the desktop override path, or undefined to let the SDK's own resolution run. */
export function resolveCodexBinaryOverride(): string | undefined {
  const override = process.env[BINARY_PATH_ENV];
  return override && override.length > 0 ? override : undefined;
}
