/**
 * Provider quota reads for the usage page: last known state reused while the last live read is recent,
 * otherwise a live adapter call shared per provider, bounded by a timeout, with session/persisted fallback.
 */

import { getErrorMessage } from "../../shared/errors.ts";
import { QUOTA_MIN_LIVE_AGE_MS, QUOTA_READ_TIMEOUT_MS } from "../../shared/providerQuota.ts";
import type { ProviderQuota, ProviderQuotaState, QuotaProvider, QuotaWindow } from "../../shared/providerQuota.ts";
import { createLogger } from "../logger.ts";
import { quotaWindowFromRateLimitEvent } from "../system/claudeQuota.ts";
import type { ClaudeRateLimitInfo } from "../system/claudeQuota.ts";
import type { SystemAdapter } from "../system/types.ts";

const log = createLogger("quota");

export interface ProviderQuotaPersistence {
  load(provider: QuotaProvider): ProviderQuota | null;
  save(provider: QuotaProvider, quota: ProviderQuota): void;
}

export interface ProviderQuotaServiceOptions {
  system: Pick<SystemAdapter, "readClaudeUsage" | "readCodexQuota">;
  persistence: ProviderQuotaPersistence;
  now?: () => number;
  timeoutMs?: number;
  minLiveAgeMs?: number;
}

const NO_DATA_MESSAGE = "Aucune donnée de quota reçue";
const TIMEOUT_MESSAGE = "Délai dépassé";

function emptyQuota(provider: QuotaProvider, state: ProviderQuotaState, observedAt: number, message: string | null): ProviderQuota {
  return { provider, state, source: null, observedAt, planType: null, windows: [], message };
}

export class ProviderQuotaService {
  private readonly system: ProviderQuotaServiceOptions["system"];
  private readonly persistence: ProviderQuotaPersistence;
  private readonly now: () => number;
  private readonly timeoutMs: number;
  /** Latest known state per provider (live read or merged session events), mirrored in persistence. */
  private readonly latest = new Map<QuotaProvider, ProviderQuota>();
  private readonly minLiveAgeMs: number;
  /** Time of the last successful ('ok') live read per provider; session events do not count. */
  private readonly lastLiveOkAt = new Map<QuotaProvider, number>();
  /** Underlying adapter call in progress per provider, shared by concurrent and timed-out reads. */
  private readonly inflight = new Map<QuotaProvider, Promise<ProviderQuota>>();

  constructor(options: ProviderQuotaServiceOptions) {
    this.system = options.system;
    this.persistence = options.persistence;
    this.now = options.now ?? Date.now;
    this.timeoutMs = options.timeoutMs ?? QUOTA_READ_TIMEOUT_MS;
    this.minLiveAgeMs = options.minLiveAgeMs ?? QUOTA_MIN_LIVE_AGE_MS;
  }

  /** Last known usable quota (source cache or session) without any live read; null when nothing usable is known. */
  last(provider: QuotaProvider): ProviderQuota | null {
    return this.lastKnown(provider);
  }

  /**
   * Live read bounded by the timeout, unless not forced and the last successful live read is recent enough:
   * then the last known quota is returned without calling the adapter. Never throws.
   */
  async read(provider: QuotaProvider, options?: { force?: boolean }): Promise<ProviderQuota> {
    if (!options?.force) {
      const liveOkAt = this.lastLiveOkAt.get(provider);
      if (liveOkAt !== undefined && this.now() - liveOkAt < this.minLiveAgeMs) {
        const known = this.lastKnown(provider);
        if (known) return known;
      }
    }
    const live = await this.readLive(provider);
    if (live.state === "ok") {
      this.lastLiveOkAt.set(provider, this.now());
      this.remember(provider, live);
      return live;
    }
    if (live.state === "not_applicable" || live.state === "unauthenticated") {
      const empty = { ...live, source: null, windows: [] };
      this.remember(provider, empty);
      return empty;
    }
    // token_without_limits, error, timeout, no_data: keep the last known windows with their source and age,
    // but expose the live state and message so the failure is never masked.
    const message = live.state === "no_data" ? (live.message ?? NO_DATA_MESSAGE) : live.message;
    const known = this.lastKnown(provider);
    if (live.accountEmail && (live.accountEmail !== known?.accountEmail || (live.accountOrganization ?? null) !== (known?.accountOrganization ?? null))) {
      const empty = { ...live, source: null, windows: [], message };
      this.remember(provider, empty);
      return empty;
    }
    if (known) return { ...known, state: live.state, message };
    return { ...live, source: null, windows: [], message };
  }

  /** Merge a Claude session rate-limit event into the latest known state (keeping its other windows) and persist it. */
  recordClaudeRateLimit(info: ClaudeRateLimitInfo, receivedAt: number): void {
    const window = quotaWindowFromRateLimitEvent(info);
    if (!window) return;
    const previous = this.latestKnown("claude");
    // Windows already reset since the previous snapshot no longer reflect current usage.
    const windows: QuotaWindow[] = (previous?.windows ?? []).filter(
      (entry) => entry.id !== window.id && (entry.resetsAt === null || entry.resetsAt > receivedAt),
    );
    windows.push(window);
    this.remember("claude", {
      provider: "claude",
      state: "ok",
      source: "session",
      observedAt: receivedAt,
      planType: previous?.planType ?? null,
      accountEmail: previous?.accountEmail ?? null,
      accountOrganization: previous?.accountOrganization ?? null,
      windows,
      message: null,
    });
  }

  private remember(provider: QuotaProvider, quota: ProviderQuota): void {
    this.latest.set(provider, quota);
    this.safeSave(provider, quota);
  }

  private latestKnown(provider: QuotaProvider): ProviderQuota | null {
    return this.latest.get(provider) ?? this.safeLoad(provider);
  }

  private lastKnown(provider: QuotaProvider): ProviderQuota | null {
    const known = this.latestKnown(provider);
    if (!known || known.windows.length === 0) return null;
    return { ...known, source: known.source === "session" ? "session" : "cache" };
  }

  private async readLive(provider: QuotaProvider): Promise<ProviderQuota> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<ProviderQuota>((resolve) => {
      timer = setTimeout(() => resolve(emptyQuota(provider, "timeout", this.now(), TIMEOUT_MESSAGE)), this.timeoutMs);
    });
    const call = this.inflight.get(provider) ?? this.startCall(provider);
    try {
      return await Promise.race([call, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  private startCall(provider: QuotaProvider): Promise<ProviderQuota> {
    const call = (async (): Promise<ProviderQuota> => {
      try {
        return provider === "claude" ? await this.system.readClaudeUsage() : await this.system.readCodexQuota();
      } catch (error) {
        return emptyQuota(provider, "error", this.now(), getErrorMessage(error));
      }
    })();
    this.inflight.set(provider, call);
    void call.finally(() => {
      if (this.inflight.get(provider) === call) this.inflight.delete(provider);
    });
    return call;
  }

  private safeLoad(provider: QuotaProvider): ProviderQuota | null {
    try {
      return this.persistence.load(provider);
    } catch (error) {
      log.warn("lecture du quota persisté impossible", { provider, reason: getErrorMessage(error) });
      return null;
    }
  }

  private safeSave(provider: QuotaProvider, quota: ProviderQuota): void {
    try {
      this.persistence.save(provider, quota);
    } catch (error) {
      log.warn("persistance du quota impossible", { provider, reason: getErrorMessage(error) });
    }
  }
}
