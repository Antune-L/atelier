import { createRequire } from "node:module";
import { join } from "node:path";

import { z } from "zod";

import { providerVersionSchema, lockedProviderVersions } from "../../shared/providerUpdates.ts";
import type { AppUpdateTarget, ProviderUpdates } from "../../shared/providerUpdates.ts";

import { claudeBinaryOrigin, resolveClaudeBinary } from "./claudeBinary.ts";
import { resolveCodexBinary } from "./codexBinary.ts";
import { runBoundedCommand } from "./boundedCommand.ts";

const CACHE_MS = 300_000;
const TIMEOUT_MS = 8_000;
const MAX_BODY_BYTES = 4_000_000;
const PACKAGES = [
  { provider: "claude", name: "@anthropic-ai/claude-agent-sdk", resolve: resolveClaudeBinary },
  { provider: "codex", name: "@openai/codex-sdk", resolve: resolveCodexBinary },
] satisfies { provider: "claude" | "codex"; name: string; resolve: () => string }[];
const require = createRequire(import.meta.url);
const versionDocument = z.object({ version: providerVersionSchema });
const commitDocument = z.object({ sha: z.string().regex(/^[a-f0-9]{40}$/) });

export async function readBoundedPublicText(url: string, maxBytes = MAX_BODY_BYTES): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error", headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Public metadata unavailable (HTTP ${response.status}).`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty metadata response.");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > maxBytes) throw new Error("Metadata response is too large.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function readSourceUpdateTarget(): Promise<AppUpdateTarget> {
  const commit = commitDocument.parse(JSON.parse(await readBoundedPublicText("https://api.github.com/repos/Antune-L/atelier/commits/main")));
  const lock = await readBoundedPublicText(`https://raw.githubusercontent.com/Antune-L/atelier/${commit.sha}/bun.lock`);
  return { id: commit.sha, version: commit.sha.slice(0, 7), providers: lockedProviderVersions(lock) };
}

export class ProviderUpdateService {
  private cached: ProviderUpdates["rows"] | null = null;
  private pending: Promise<ProviderUpdates["rows"]> | null = null;
  private checkedAt = 0;

  get lastCheckedAt(): number { return this.checkedAt; }

  snapshot(): ProviderUpdates["rows"] {
    return this.cached ?? PACKAGES.map((pkg) => ({ provider: pkg.provider, installed: null, nativeVersion: null, nativeOrigin: "unknown", nativeError: null, latest: null, latestAt: null, state: "unknown", message: "Vérification suspendue pendant la maintenance." }));
  }

  read(simulated: boolean, resourcesRoot: string, refresh = false): Promise<ProviderUpdates["rows"]> {
    if (this.pending) return this.pending;
    if (!refresh && this.cached && Date.now() - this.checkedAt < CACHE_MS) return Promise.resolve(this.cached);
    this.pending = this.probe(simulated, resourcesRoot).then((rows) => {
      this.cached = rows;
      this.checkedAt = Date.now();
      return rows;
    }).finally(() => { this.pending = null; });
    return this.pending;
  }

  private async probe(simulated: boolean, resourcesRoot: string): Promise<ProviderUpdates["rows"]> {
    return Promise.all(PACKAGES.map(async (pkg) => {
      let installed: string | null = null;
      try {
        installed = versionDocument.parse(await Bun.file(require.resolve(`${pkg.name}/package.json`)).json()).version;
      } catch {
        try {
          installed = versionDocument.parse(await Bun.file(join(resourcesRoot, "provider-packages", `${pkg.provider}.json`)).json()).version;
        } catch { installed = null; }
      }
      if (simulated) return { provider: pkg.provider, installed, nativeVersion: null, nativeOrigin: "simulated", nativeError: null, latest: null, latestAt: Date.now(), state: "simulated", message: "Simulation : aucun registre ni programme fournisseur contacté." } satisfies ProviderUpdates["rows"][number];
      let nativeVersion: string | null = null;
      let nativeError: string | null = null;
      let nativeOrigin: ProviderUpdates["rows"][number]["nativeOrigin"] = "unknown";
      try {
        const binary = pkg.resolve();
        if (pkg.provider === "claude") nativeOrigin = claudeBinaryOrigin();
        else if (binary === join(resourcesRoot, "codex-bin")) nativeOrigin = "bundled";
        else nativeOrigin = process.env.KANBAN_CODEX_BINARY ? "configured" : "package";
        const result = await runBoundedCommand([binary, "--version"], process.cwd(), { timeoutMs: TIMEOUT_MS, maxStdoutChars: 1024, maxStderrChars: 1024 });
        if (result.exitCode !== 0 || result.timedOut || result.truncated) throw new Error("Native version probe failed.");
        nativeVersion = result.stdout.match(/\b\d+\.\d+\.\d+(?:-[\w.-]+)?\b/)?.[0] ?? null;
        if (!nativeVersion) throw new Error("Native version response is invalid.");
      } catch { nativeError = "Version du programme natif non mesurée."; }
      const previous = this.cached?.find((row) => row.provider === pkg.provider);
      try {
        const document = versionDocument.parse(JSON.parse(await readBoundedPublicText(`https://registry.npmjs.org/${encodeURIComponent(pkg.name)}/latest`)));
        return { provider: pkg.provider, installed, nativeVersion, nativeOrigin, nativeError, latest: document.version, latestAt: Date.now(), state: "ready", message: null } satisfies ProviderUpdates["rows"][number];
      } catch (error) {
        const stale = previous?.latest !== null && previous?.latest !== undefined;
        let state: ProviderUpdates["rows"][number]["state"] = "offline";
        if (stale) state = "stale";
        else if (error instanceof z.ZodError) state = "error";
        return { provider: pkg.provider, installed, nativeVersion, nativeOrigin, nativeError, latest: previous?.latest ?? null, latestAt: previous?.latestAt ?? null, state, message: "Registre indisponible ou réponse invalide. Relancez la vérification." } satisfies ProviderUpdates["rows"][number];
      }
    }));
  }
}
