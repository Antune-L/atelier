import { mergeProviderUsage, summarizeProviderUsage, usagePeriodStart } from "../../shared/providerUsage.ts";
import type { MacUsageSnapshot, MacUsageSource, ProviderUsagePair, UsagePeriod, UsageScope, UsageSummary } from "../../shared/providerUsage.ts";
import { MAC_USAGE_STALE_AFTER_MS } from "../../shared/vpsBridge.ts";

import type { Store } from "../db/store.ts";
import { isCloudHost } from "../hostRole.ts";
import type { SystemAdapter } from "../system/types.ts";
import type { LocalUsageReadResult } from "./localHistory.ts";

interface LocalUsageDeps {
  store: Pick<Store, "listUsageSources" | "listUsageCountedSessionIds">;
  system: Pick<SystemAdapter, "readUsageHistory">;
}

/** This machine's usage over a period: board executions plus its local Claude and Codex histories. */
function summarizeLocal(store: LocalUsageDeps["store"], history: LocalUsageReadResult, period: UsagePeriod, now: number): UsageSummary {
  return {
    ...summarizeProviderUsage(store.listUsageSources(), usagePeriodStart(period, now), period, now, {
      entries: history.entries,
      countedSessionIds: store.listUsageCountedSessionIds(),
    }),
    historyCoverage: { files: history.files, failedFiles: history.failedFiles, failedRoots: history.failedRoots },
  };
}

/** Every period of this machine's usage, read from one history scan; the payload the Mac publishes to the VPS. */
export async function computeMacUsageSnapshot(deps: LocalUsageDeps, now: number): Promise<MacUsageSnapshot> {
  const history = await deps.system.readUsageHistory();
  const providersOf = (period: UsagePeriod): ProviderUsagePair => summarizeLocal(deps.store, history, period, now).providers;
  return {
    generatedAt: now,
    summaries: { "24h": providersOf("24h"), "7d": providersOf("7d"), "30d": providersOf("30d"), "90d": providersOf("90d") },
  };
}

export function publishMacUsage(store: Pick<Store, "publishMacUsage">, snapshot: MacUsageSnapshot): { publishedAt: number } {
  const publishedAt = Date.now();
  store.publishMacUsage(snapshot, publishedAt);
  return { publishedAt };
}

function readMacUsage(store: Pick<Store, "getMacUsage">, period: UsagePeriod, now: number): MacUsageSource | null {
  const stored = store.getMacUsage();
  if (stored === null) return null;
  return { publishedAt: stored.publishedAt, stale: now - stored.publishedAt > MAC_USAGE_STALE_AFTER_MS, providers: stored.summaries[period] };
}

/** The usage page summary; on the cloud host it also carries the Mac's last published figures, summed in when `scope` is "all". */
export async function computeUsageSummary(
  deps: LocalUsageDeps & { store: Pick<Store, "getMacUsage"> },
  period: UsagePeriod,
  scope: UsageScope,
  now: number,
): Promise<UsageSummary> {
  const local = summarizeLocal(deps.store, await deps.system.readUsageHistory(), period, now);
  if (!isCloudHost()) return local;
  const server = local.providers;
  const mac = readMacUsage(deps.store, period, now);
  const providers = scope === "all" && mac !== null
    ? { claude: mergeProviderUsage(server.claude, mac.providers.claude), codex: mergeProviderUsage(server.codex, mac.providers.codex) }
    : server;
  return { ...local, providers, scope, machines: { server, mac } };
}
