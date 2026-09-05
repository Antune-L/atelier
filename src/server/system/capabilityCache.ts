import type { CodexRuntimeStatus } from "../../shared/codexCapabilities.ts";

const CAPABILITY_TTL_MS = 30_000;

/** Coalesce probes, including explicit refreshes, without caching authentication forever. */
export class CapabilityCache {
  private cached: CodexRuntimeStatus | null = null;
  private pending: Promise<CodexRuntimeStatus> | null = null;

  constructor(
    private readonly probe: () => Promise<CodexRuntimeStatus>,
    private readonly now: () => number = Date.now,
  ) {}

  read(refresh = false): Promise<CodexRuntimeStatus> {
    if (this.pending) return this.pending;
    if (!refresh && this.cached && this.now() - this.cached.checkedAt < CAPABILITY_TTL_MS) {
      return Promise.resolve(this.cached);
    }
    this.pending = this.probe().catch((): CodexRuntimeStatus => ({
      status: "temporarily_unavailable", models: [], checkedAt: this.now(), message: "Impossible de vérifier la connexion Codex.",
    })).then((status) => {
      this.cached = status;
      return status;
    }).finally(() => { this.pending = null; });
    return this.pending;
  }
}
